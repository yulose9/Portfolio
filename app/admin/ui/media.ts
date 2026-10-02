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

type UploadOptions = { signal?: AbortSignal; year?: number };
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

/** Inline assets are decoded as images, then rasterized; no authored SVG markup is served. */
export async function uploadInlineLogo(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new ApiError("Choose an image smaller than 20 MB.", 413);
  let source: ImageBitmap | HTMLImageElement;
  let objectUrl: string | undefined;
  try {
    try { source = await decodePhoto(file); }
    catch {
      const blob = /\.svg$/i.test(file.name) ? new Blob([file], {type:"image/svg+xml"}) : file;
      objectUrl = URL.createObjectURL(blob);
      const image = new Image(); image.src = objectUrl;
      await image.decode(); source = image;
    }
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) throw new Error("Empty image");
    const scale = Math.min(1, 256 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if ("close" in source) source.close();
    const blob = await canvasBlob(canvas, "image/webp", 0.95);
    return (await api.upload(blob, canvas.width, canvas.height)).src;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("This browser couldn't read that image. Try PNG, JPG, SVG, WebP, or HEIF.", 415);
  } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

async function uploadPhoto(file: File, progress: Progress, id = newMediaId(), options: UploadOptions = {}): Promise<Uploaded> {
  progress(0.05, "Reading photo");
  const bitmap = await decodePhoto(file);
  const top = Math.min(bitmap.width, WIDTHS[WIDTHS.length - 1]);
  const widths = [top, ...WIDTHS.filter((w) => w < top)];
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
    const largest = width === top;
    progress(0.15 + (0.8 * (i + 1)) / widths.length, `Uploading ${width}px`);
    const name = mediaName(id, largest ? { width, height } : { variant: width });
    const res = await api.uploadNamed(blob, name, options.signal, options.year);
    if (largest) {
      main = { src: res.src, width, height };
      const canonical = /^\/media\/(\d{4})\/([a-z0-9]+)-/.exec(res.src);
      if (canonical) { options = { ...options, year: Number(canonical[1]) }; id = canonical[2]; }
    }
  }
  bitmap.close();
  if (!main) throw new ApiError("The upload came back empty. Try again.", 0);
  return { kind: "image", ...main };
}

/* ── GIF → looping video ─────────────────────────────────────────────── */

async function gifToVideo(file: File, progress: Progress, id = newMediaId(), options: UploadOptions = {}): Promise<Uploaded | null> {
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

  const ext = codec === "avc" ? "mp4" : "webm";
  progress(0.85, "Uploading");
  const video = await api.uploadNamed(new Blob([target.buffer!], { type: `video/${ext}` }), mediaName(id, { width, height }, ext), options.signal, options.year);
  const poster = posterBlob ? (await api.uploadNamed(posterBlob, mediaName(id, "poster"), options.signal, options.year)).src : null;
  return { kind: "video", src: video.src, poster, width, height, loop: true };
}

/* ── Video and audio ─────────────────────────────────────────────────── */

/*
 * Video goes through a ladder of encoder plans rather than one fixed
 * configuration, because what a browser's WebCodecs will encode varies by
 * device: a 4K source asked for at 1280px H.264 can still be refused
 * ("Unsupported configuration parameters.") by an encoder that only takes
 * certain sizes, profiles, levels or bitrates. Each plan is probed with
 * VideoEncoder.isConfigSupported before anything runs:
 *
 *   sizes      long edge 1280 → 960 → 640 (never upscaled; even dimensions)
 *   codecs     H.264 in MP4 → VP9 → VP8 in WebM
 *   H.264      the library's own profile/level, then High 4.0, Main 3.1 and
 *              Baseline 3.1 written out explicitly
 *   bitrates   about 0.08 then 0.045 bits per pixel per frame, skipped when
 *              the result would be over the upload limit
 *   hardware   no preference, then software
 *
 * If no plan works (or the source can't even be decoded), the original file
 * goes up untouched when it is an MP4 or WebM under the 32 MB limit, rather
 * than the upload failing.
 */

/** The server's limit for one upload (functions/api/admin/uploads.ts). */
const MAX_UPLOAD = 32 * 1024 * 1024;
const LONG_EDGES = [1280, 960, 640];
const AVC_LEVELS = ["avc1.640028", "avc1.4d401f", "avc1.42e01f"];

type VideoPlan = { codec: "avc" | "vp9" | "vp8"; full?: string; hw: HardwareAcceleration };
type Fit = { width: number; height: number };
type Mediabunny = typeof import("mediabunny");
type AudioPlan = { codec: "aac" | "opus" | "vorbis"; channels: number; sampleRate: number };

/** Long edge ≤ edge, aspect kept, both sides even (H.264 needs that), never upscaled. */
function fitVideo(srcW: number, srcH: number, edge: number): Fit {
  const scale = Math.min(1, edge / Math.max(srcW, srcH));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(srcW), height: even(srcH) };
}

function videoPlans(): VideoPlan[] {
  const plans: VideoPlan[] = [];
  for (const hw of ["no-preference", "prefer-software"] as const) {
    plans.push({ codec: "avc", hw });
    for (const full of AVC_LEVELS) plans.push({ codec: "avc", full, hw });
  }
  for (const hw of ["no-preference", "prefer-software"] as const) plans.push({ codec: "vp9", hw }, { codec: "vp8", hw });
  return plans;
}

async function encoderSupports(mb: Mediabunny, plan: VideoPlan, size: Fit, bitrate: number, frameRate: number): Promise<boolean> {
  // The browser's own answer first, for the exact string we'll ask for.
  if (plan.full && typeof VideoEncoder !== "undefined") {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec: plan.full, ...size, bitrate, framerate: frameRate, hardwareAcceleration: plan.hw });
      if (!r.supported) return false;
    } catch {
      return false;
    }
  }
  return mb
    .canEncodeVideo(plan.codec, { ...size, bitrate, frameRate, hardwareAcceleration: plan.hw, ...(plan.full ? { fullCodecString: plan.full } : {}) })
    .catch(() => false);
}

async function audioCodecFor(mb: Mediabunny, mp4: boolean, channels: number, sampleRate: number): Promise<AudioPlan["codec"] | null> {
  for (const codec of mp4 ? (["aac", "opus"] as const) : (["opus", "vorbis"] as const)) {
    if (await mb.canEncodeAudio(codec, { numberOfChannels: channels, sampleRate, bitrate: 128_000 }).catch(() => false)) return codec;
  }
  return null;
}

/** One encode with one plan. Throws if the encoder refuses partway. */
async function encodeWith(mb: Mediabunny, file: File, plan: VideoPlan, size: Fit, bitrate: number, audio: AudioPlan | null, onProgress: (p: number) => void): Promise<Blob> {
  const mp4 = plan.codec === "avc";
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: mp4 ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(), target });
  try {
    if (!plan.full) {
      // The library picks the profile and level; resizing and audio included.
      const conversion = await mb.Conversion.init({
        input,
        output,
        video: { ...size, fit: "fill", codec: plan.codec, bitrate, hardwareAcceleration: plan.hw, forceTranscode: true },
        audio: audio ? { codec: audio.codec, numberOfChannels: audio.channels, sampleRate: audio.sampleRate, bitrate: 128_000, forceTranscode: true } : { discard: true },
        // No location, device or title tags carried over.
        tags: {},
      });
      if (!conversion.isValid) throw new Error("This plan can't convert that file.");
      conversion.onProgress = onProgress;
      await conversion.execute();
    } else {
      // An explicit H.264 profile and level: frames are resized through a
      // canvas and handed to an encoder configured with exactly that string.
      const video = await input.getPrimaryVideoTrack();
      if (!video) throw new Error("No video track");
      const length = (await video.computeDuration()) || 1;
      const vSource = new mb.VideoSampleSource({ codec: "avc", fullCodecString: plan.full, bitrate, hardwareAcceleration: plan.hw, keyFrameInterval: 2 });
      output.addVideoTrack(vSource);
      const sound = audio ? await input.getPrimaryAudioTrack() : null;
      const aSource = sound && audio ? new mb.AudioSampleSource({ codec: audio.codec, bitrate: 128_000 }) : null;
      if (aSource) output.addAudioTrack(aSource);
      await output.start();
      const frames = (async () => {
        for await (const { canvas, timestamp, duration } of new mb.CanvasSink(video, { ...size, fit: "fill", poolSize: 2 }).canvases()) {
          const sample = new mb.VideoSample(canvas, { timestamp, duration });
          await vSource.add(sample);
          sample.close();
          onProgress(Math.min(1, timestamp / length));
        }
        vSource.close();
      })();
      const samples = (async () => {
        if (!sound || !aSource) return;
        for await (const sample of new mb.AudioSampleSink(sound).samples()) {
          await aSource.add(sample);
          sample.close();
        }
        aSource.close();
      })();
      await Promise.all([frames, samples]);
      await output.finalize();
    }
    return new Blob([target.buffer!], { type: mp4 ? "video/mp4" : "video/webm" });
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  } finally {
    input.dispose();
  }
}

async function posterFrame(mb: Mediabunny, file: File, width: number): Promise<Blob | null> {
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const sink = new mb.CanvasSink(track, { width: Math.min(width, 1280) });
    const shot = await sink.getCanvas(Math.min(0.5, (await track.computeDuration()) / 2));
    return shot ? await canvasBlob(shot.canvas, "image/webp", 0.8) : null;
  } catch {
    return null; // no poster, no harm
  } finally {
    input.dispose();
  }
}

async function uploadVideo(file: File, progress: Progress, id = newMediaId(), options: UploadOptions = {}): Promise<Uploaded> {
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
  const duration = (await track.computeDuration().catch(() => 0)) || 0;
  const frameRate = await track.computePacketStats(60).then((s) => Math.min(60, Math.max(1, Math.round(s.averagePacketRate))), () => 30);
  const decodable = await track.canDecode().catch(() => false);
  const sound = await input.getPrimaryAudioTrack().catch(() => null);
  const channels = sound ? Math.min(2, Math.max(1, await sound.getNumberOfChannels())) : 0;
  const rate = sound ? await sound.getSampleRate() : 0;
  const sampleRate = rate === 44100 || rate === 48000 ? rate : 48000;
  input.dispose();

  let encoded: { blob: Blob; size: Fit } | null = null;
  let lastError: unknown = null;
  if (decodable) {
    const audioCodecs = new Map<boolean, AudioPlan["codec"] | null>();
    search: for (const edge of LONG_EDGES) {
      const size = fitVideo(srcW, srcH, edge);
      for (const plan of videoPlans()) {
        const mp4 = plan.codec === "avc";
        if (sound && !audioCodecs.has(mp4)) audioCodecs.set(mp4, await audioCodecFor(mb, mp4, channels, sampleRate));
        const audioCodec = sound ? audioCodecs.get(mp4) ?? null : null;
        // Sound this container can't carry here: skip it; the next one may.
        if (sound && !audioCodec) continue;
        for (const bpp of [0.08, 0.045]) {
          const bitrate = Math.round(Math.max(400_000, Math.min(6_000_000, size.width * size.height * frameRate * bpp)));
          if (duration && ((bitrate + (sound ? 128_000 : 0)) * duration) / 8 > MAX_UPLOAD * 0.92) continue;
          if (!(await encoderSupports(mb, plan, size, bitrate, frameRate))) continue;
          try {
            progress(0.05, "Compressing video");
            const blob = await encodeWith(mb, file, plan, size, bitrate, audioCodec ? { codec: audioCodec, channels, sampleRate } : null, (p) => progress(0.05 + p * 0.75, "Compressing video"));
            if (blob.size > MAX_UPLOAD) continue;
            encoded = { blob, size };
            break search;
          } catch (error) {
            lastError = error;
            console.warn(`Video encode failed (${plan.codec}${plan.full ? ` ${plan.full}` : ""}, ${size.width}×${size.height}, ${plan.hw}); trying the next plan.`, error);
          }
        }
      }
    }
  }

  const poster = await posterFrame(mb, file, srcW);
  let blob: Blob;
  let size: Fit;
  if (encoded) {
    ({ blob, size } = encoded);
  } else {
    // Nothing here could re-encode it: send the original, untouched.
    const type = /webm/i.test(file.type) || /\.webm$/i.test(file.name) ? "video/webm" : /mp4|m4v/i.test(file.type) || /\.(mp4|m4v)$/i.test(file.name) ? "video/mp4" : "";
    if (!type || file.size > MAX_UPLOAD) {
      throw new ApiError(
        lastError || !decodable
          ? "This browser couldn't compress that video, and the original is too large (or not MP4/WebM) to upload as it is. Export it at 1080p or smaller and try again."
          : "That video is too long to upload. Trim it or export it smaller and try again.",
        415,
      );
    }
    blob = type === file.type ? file : new Blob([file], { type });
    size = { width: srcW, height: srcH };
  }

  const ext = blob.type === "video/webm" ? "webm" : "mp4";
  progress(0.85, "Uploading video");
  const video = await api.uploadNamed(blob, mediaName(id, size, ext), options.signal, options.year);
  const posterSrc = poster ? (await api.uploadNamed(poster, mediaName(id, "poster"), options.signal, options.year)).src : null;
  return { kind: "video", src: video.src, poster: posterSrc, ...size, loop: false };
}

export async function uploadAudio(file: Blob, progress: Progress, voice = true, id = newMediaId(), options: UploadOptions = {}): Promise<Uploaded> {
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
    const res = await api.uploadNamed(new Blob([target.buffer!], { type: codec === "aac" ? "audio/mp4" : "audio/webm" }), name(ext), options.signal, options.year);
    return { kind: "audio", src: res.src, duration };
  }

  // Nothing here can re-encode it: a recording is already compressed
  // (Opus or AAC) and carries no location, so it goes up as recorded.
  const type = /mp4|m4a|aac/.test(file.type) ? "audio/mp4" : /mpeg|mp3/.test(file.type) ? "audio/mpeg" : /ogg/.test(file.type) ? "audio/ogg" : "audio/webm";
  const ext = { "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/webm": "webm" }[type]!;
  progress(0.9, "Uploading audio");
  const res = await api.uploadNamed(new Blob([file], { type }), name(ext), options.signal, options.year);
  return { kind: "audio", src: res.src, duration };
}

/** Any file → compressed, stripped, uploaded. */
/** What any picker in the admin accepts: images (HEIC included, converted on the way), video, audio. */
export const ACCEPT = "image/*,video/*,audio/*,.heic,.heif";

export async function uploadMedia(file: File, progress: Progress = () => {}, id = newMediaId(), options: UploadOptions = {}): Promise<Uploaded> {
  const kind = kindOf(file);
  if (!kind) throw new ApiError("That file type can't be added. Try a photo, GIF, video or audio file.", 415);
  if (file.type === "image/svg+xml") throw new ApiError("SVGs can't be uploaded; export it as PNG or WebP.", 415);
  if (file.size > 1024 * 1024 * 1024) throw new ApiError("That file is over 1 GB.", 413);
  if (kind === "video") return uploadVideo(file, progress, id, options);
  if (kind === "audio") return uploadAudio(file, progress, true, id, options);
  if (file.type === "image/gif") {
    const asVideo = await gifToVideo(file, progress, id, options).catch(e => {if(e instanceof ApiError)throw e;return null;});
    if (asVideo) return asVideo;
    if (file.size > 12 * 1024 * 1024) throw new ApiError("That GIF is too big to upload as it is, and this browser can't convert it.", 413);
    const res = await api.uploadNamed(file, mediaName(id, { width: 0, height: 0 }, "gif"), options.signal, options.year);
    return { kind: "image", src: res.src, width: 0, height: 0 };
  }
  return uploadPhoto(file, progress, id, options);
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
