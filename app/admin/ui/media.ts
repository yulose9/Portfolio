"use client";

/*
 * Everything that happens to a file between choosing it and it going up.
 *
 * All of it runs in the browser, before upload, so what reaches R2 is
 * already the small file readers will download:
 *
 *  - Photos (JPEG, PNG, WebP, AVIF, and iPhone HEIC/HEIF via libheif):
 *    turned upright, re-encoded as WebP at 640, 1280 and up to 2048px wide.
 *    Re-encoding through a canvas also drops every byte of metadata: EXIF,
 *    GPS, camera serials, embedded thumbnails.
 *  - Animated GIFs: re-encoded as a looping, silent H.264 MP4, the way X and
 *    Slack do it. A 12 MB GIF is typically a few hundred KB of video.
 *  - Video: re-encoded to H.264/AAC MP4, at most 1280px wide, with a poster
 *    frame. Container metadata (location, device) is not carried over.
 *  - Audio and voice notes: AAC in an .m4a (Opus/WebM where the browser has
 *    no AAC encoder), mono for voice.
 *
 * The file names carry what the page needs to lay a file out before it
 * loads: an image's intrinsic size and its variants (see cms/media.ts).
 */

import { mediaName, newMediaId, type MediaKind } from "../../../cms/media";
import { api, ApiError } from "./api";

export type Progress = (fraction: number, label: string) => void;

export type Uploaded =
  | { kind: "image"; src: string; width: number; height: number }
  | { kind: "video"; src: string; poster: string | null; width: number; height: number; loop: boolean }
  | { kind: "audio"; src: string; duration: number };

const WIDTHS = [640, 1280, 2048];

const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
export const kindOf = (f: File): MediaKind | null =>
  f.type.startsWith("video/")
    ? "video"
    : f.type.startsWith("audio/")
      ? "audio"
      : f.type.startsWith("image/") || isHeic(f)
        ? "image"
        : null;

async function canvasBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  if (!blob) throw new ApiError("This browser couldn't encode the image.", 0);
  return blob;
}

/* ── Photos ──────────────────────────────────────────────────────────── */

async function decodePhoto(file: File): Promise<ImageBitmap> {
  let blob: Blob = file;
  if (isHeic(file)) {
    // Safari decodes HEIC itself; everyone else gets libheif (loaded only now).
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      const { heicTo } = await import("heic-to");
      blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
    }
  }
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

async function uploadPhoto(file: File, progress: Progress): Promise<Uploaded> {
  progress(0.05, "Reading photo");
  const bitmap = await decodePhoto(file);
  const top = Math.min(bitmap.width, WIDTHS[WIDTHS.length - 1]);
  const widths = [...WIDTHS.filter((w) => w < top), top];
  const id = newMediaId();
  // Screenshots and graphics keep more quality so text stays crisp.
  const quality = file.type === "image/png" ? 0.9 : 0.82;
  let main: { src: string; width: number; height: number } | null = null;

  for (const [i, width] of widths.entries()) {
    const height = Math.round((bitmap.height * width) / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ApiError("This browser can't process images.", 0);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    let blob = await canvasBlob(canvas, "image/webp", quality);
    if (blob.type !== "image/webp") blob = await canvasBlob(canvas, "image/jpeg", 0.86);
    const largest = i === widths.length - 1;
    progress(0.15 + (0.8 * (i + 1)) / widths.length, `Uploading ${width}px`);
    const name = mediaName(id, largest ? { width, height } : { variant: width });
    const res = await api.uploadNamed(blob, name);
    if (largest) main = { src: res.src, width, height };
  }
  bitmap.close();
  if (!main) throw new ApiError("Nothing was uploaded.", 0);
  return { kind: "image", ...main };
}

/* ── GIF → looping video ─────────────────────────────────────────────── */

async function gifToVideo(file: File, progress: Progress): Promise<Uploaded | null> {
  if (typeof ImageDecoder === "undefined" || typeof VideoEncoder === "undefined") return null;
  const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: "image/gif" });
  await decoder.tracks.ready;
  const frames = decoder.tracks.selectedTrack?.frameCount ?? 1;
  if (frames < 2) {
    decoder.close();
    return null; // a still GIF is just a picture
  }
  const first = (await decoder.decode({ frameIndex: 0 })).image;
  const scale = Math.min(1, 960 / first.displayWidth);
  // H.264 wants even dimensions.
  const width = Math.max(2, Math.round((first.displayWidth * scale) / 2) * 2);
  const height = Math.max(2, Math.round((first.displayHeight * scale) / 2) * 2);
  first.close();

  const mb = await import("mediabunny");
  const codec = (await mb.canEncodeVideo("avc", { width, height })) ? "avc" : "vp9";
  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: codec === "avc" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(), target });
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  const source = new mb.CanvasSource(canvas, { codec, bitrate: mb.QUALITY_MEDIUM });
  output.addVideoTrack(source);
  await output.start();
  let t = 0;
  let posterBlob: Blob | null = null;
  for (let i = 0; i < frames; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const duration = Math.max(0.02, (image.duration ?? 100_000) / 1_000_000);
    await source.add(t, duration, { keyFrame: i % 60 === 0 });
    if (i === 0) posterBlob = await canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
    t += duration;
    image.close();
    progress(0.1 + (0.7 * (i + 1)) / frames, "Converting GIF to video");
  }
  source.close();
  await output.finalize();
  decoder.close();

  const id = newMediaId();
  const ext = codec === "avc" ? "mp4" : "webm";
  progress(0.85, "Uploading");
  const video = await api.uploadNamed(new Blob([target.buffer!], { type: `video/${ext}` }), mediaName(id, { width, height }, ext));
  const poster = posterBlob ? (await api.uploadNamed(posterBlob, mediaName(id, "poster"))).src : null;
  return { kind: "video", src: video.src, poster, width, height, loop: true };
}

/* ── Video and audio ─────────────────────────────────────────────────── */

async function uploadVideo(file: File, progress: Progress): Promise<Uploaded> {
  const mb = await import("mediabunny");
  progress(0.02, "Reading video");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  // A voice memo in a video container (.webm, .mp4 from a phone) is audio.
  if (!track) {
    input.dispose();
    return uploadAudio(file, progress, true);
  }
  const srcW = await track.getDisplayWidth();
  const srcH = await track.getDisplayHeight();
  const width = Math.round(Math.min(srcW, 1280) / 2) * 2;
  const height = Math.round(((srcH * width) / srcW) / 2) * 2;
  const avc = await mb.canEncodeVideo("avc", { width, height });

  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: avc ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(), target });
  const conversion = await mb.Conversion.init({
    input,
    output,
    video: { width, height, fit: "fill", codec: avc ? "avc" : "vp9", bitrate: mb.QUALITY_MEDIUM, forceTranscode: true },
    audio: { codec: avc ? "aac" : "opus", bitrate: mb.QUALITY_MEDIUM, forceTranscode: true },
    // No location, device or title tags carried over.
    tags: {},
  });
  if (!conversion.isValid) throw new ApiError("This browser can't convert that video.", 415);
  conversion.onProgress = (p) => progress(0.05 + p * 0.75, "Compressing video");
  await conversion.execute();

  // A poster frame, so the page shows a picture before anything plays.
  let posterBlob: Blob | null = null;
  try {
    const sink = new mb.CanvasSink(track, { width: Math.min(width, 1280) });
    const shot = await sink.getCanvas(Math.min(0.5, (await track.computeDuration()) / 2));
    if (shot) posterBlob = await canvasBlob(shot.canvas, "image/webp", 0.8);
  } catch {
    /* no poster, no harm */
  }
  input.dispose();

  const id = newMediaId();
  const ext = avc ? "mp4" : "webm";
  progress(0.85, "Uploading video");
  const video = await api.uploadNamed(new Blob([target.buffer!], { type: `video/${ext}` }), mediaName(id, { width, height }, ext));
  const poster = posterBlob ? (await api.uploadNamed(posterBlob, mediaName(id, "poster"))).src : null;
  return { kind: "video", src: video.src, poster, width, height, loop: false };
}

export async function uploadAudio(file: Blob, progress: Progress, voice = true): Promise<Uploaded> {
  const mb = await import("mediabunny");
  progress(0.05, "Reading audio");
  const duration = await (async () => {
    const probe = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    try {
      return await probe.computeDuration();
    } finally {
      probe.dispose();
    }
  })().catch(() => 0);
  const id = newMediaId();
  const name = (ext: string) => mediaName(id, { seconds: Math.round(duration) }, ext);

  // AAC in .m4a plays everywhere; Opus in WebM where there's no AAC encoder.
  for (const codec of ["aac", "opus"] as const) {
    if (!(await mb.canEncodeAudio(codec))) continue;
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const target = new mb.BufferTarget();
    const output = new mb.Output({ format: codec === "aac" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(), target });
    const conversion = await mb.Conversion.init({
      input,
      output,
      video: { discard: true },
      // Voice is mono and needs far less than music.
      audio: { codec, ...(voice ? { numberOfChannels: 1 } : {}), bitrate: voice ? 64_000 : 160_000, forceTranscode: true },
      tags: {},
    });
    if (!conversion.isValid) {
      input.dispose();
      continue;
    }
    conversion.onProgress = (p) => progress(0.05 + p * 0.8, "Compressing audio");
    await conversion.execute();
    input.dispose();
    progress(0.9, "Uploading audio");
    const ext = codec === "aac" ? "m4a" : "webm";
    const res = await api.uploadNamed(new Blob([target.buffer!], { type: codec === "aac" ? "audio/mp4" : "audio/webm" }), name(ext));
    return { kind: "audio", src: res.src, duration };
  }

  // Nothing here can re-encode it: a recording is already compressed
  // (Opus or AAC) and carries no location, so it goes up as recorded.
  const type = /mp4|m4a|aac/.test(file.type) ? "audio/mp4" : /mpeg|mp3/.test(file.type) ? "audio/mpeg" : /ogg/.test(file.type) ? "audio/ogg" : "audio/webm";
  const ext = { "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/webm": "webm" }[type]!;
  progress(0.9, "Uploading audio");
  const res = await api.uploadNamed(new Blob([file], { type }), name(ext));
  return { kind: "audio", src: res.src, duration };
}

/** Any file → compressed, stripped, uploaded. */
export async function uploadMedia(file: File, progress: Progress = () => {}): Promise<Uploaded> {
  const kind = kindOf(file);
  if (!kind) throw new ApiError("That file type can't be added. Try a photo, GIF, video or audio file.", 415);
  if (file.type === "image/svg+xml") throw new ApiError("SVGs can't be uploaded; export it as PNG or WebP.", 415);
  if (file.size > 1024 * 1024 * 1024) throw new ApiError("That file is over 1 GB.", 413);
  if (kind === "video") return uploadVideo(file, progress);
  if (kind === "audio") return uploadAudio(file, progress, true);
  if (file.type === "image/gif") {
    const asVideo = await gifToVideo(file, progress).catch(() => null);
    if (asVideo) return asVideo;
    if (file.size > 12 * 1024 * 1024) throw new ApiError("That GIF is too big to upload as it is, and this browser can't convert it.", 413);
    const res = await api.uploadNamed(file, mediaName(newMediaId(), { width: 0, height: 0 }, "gif"));
    return { kind: "image", src: res.src, width: 0, height: 0 };
  }
  return uploadPhoto(file, progress);
}

/** Square-crop and resize, for avatars. */
export async function squareImage(file: File, size = 256): Promise<Blob> {
  const bitmap = await decodePhoto(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvasBlob(canvas, "image/webp", 0.9);
}

/** Cover-crop to 1200×630, for a custom share image. */
export async function shareImage(file: File): Promise<Blob> {
  const bitmap = await decodePhoto(file);
  const W = 1200;
  const H = 630;
  const scale = Math.max(W / bitmap.width, H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (W - w) / 2, (H - h) / 2, w, h);
  bitmap.close();
  // JPEG: every platform's link-preview crawler reads it.
  return canvasBlob(canvas, "image/jpeg", 0.88);
}
