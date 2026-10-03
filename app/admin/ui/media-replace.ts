"use client";

import { ApiError } from "./api";
import { mediaApi, type ReplaceResult } from "./media-api";
import { mediaParts, replacementProblem, type MediaPart } from "../../../cms/media-details";

/*
 * Replacing a file in place, from the browser side.
 *
 * A media name records the file's shape (cms/media.ts): an image's
 * `-2048x1365` is what every page uses to reserve its box. So a new photo is
 * drawn into exactly that size (centre-cropped when its proportions differ)
 * and its smaller widths are redrawn beside it, all through a canvas, which
 * also drops EXIF and location like a normal upload. Video and audio are
 * sent as chosen; a video must have the same proportions, since its player
 * box and poster are sized from the name.
 */

const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
/** What the file picker should offer for an asset of this type. */
export const replaceAccept = (type: string) =>
  type.startsWith("image/") ? "image/*,.heic,.heif" : type.startsWith("video/") ? type : type.startsWith("audio/") ? type : "";

const fileType = (f: File) => (isHeic(f) ? "image/webp" : f.type === "image/jpg" ? "image/jpeg" : f.type);

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    if (!isHeic(file)) throw error;
    const { heicTo } = await import("heic-to");
    return createImageBitmap(await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 }), { imageOrientation: "from-image" });
  }
}

async function encode(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ApiError("This browser can't process images.", 0);
  ctx.imageSmoothingQuality = "high";
  // Cover: fill the recorded box, cropping the longer side evenly.
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
  const blob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  const webp = await blob("image/webp", quality);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await blob("image/jpeg", 0.86);
  if (!jpeg) throw new ApiError("This browser couldn't encode the image.", 0);
  return jpeg;
}

/** How far a new file's proportions are from the recorded ones (0 = identical). */
const drift = (a: { width: number; height: number }, b: { width: number; height: number }) =>
  Math.abs(a.width / a.height - b.width / b.height) / (b.width / b.height);

/** A heads-up shown before replacing, or null when the new file fits as it is. */
export async function replaceNotice(asset: { src: string; type: string }, file: File): Promise<string | null> {
  const main = mediaParts(asset.src, asset.type).find((p) => p.role === "main");
  if (!asset.type.startsWith("image/") || !main?.width || !main.height || !fileType(file).startsWith("image/")) return null;
  const bitmap = await decode(file).catch(() => null);
  if (!bitmap) return null;
  const off = drift(bitmap, { width: main.width, height: main.height });
  bitmap.close();
  return off > 0.01 ? `Its proportions differ, so it will be centre-cropped to ${main.width}×${main.height} to keep every page's layout.` : null;
}

function videoSize(file: File): Promise<{ width: number; height: number; video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApiError("This browser can't read that video.", 415));
    };
    video.src = url;
  });
}

async function posterOf(video: HTMLVideoElement, part: MediaPart): Promise<Blob | null> {
  try {
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("seek"));
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    });
    const width = Math.min(part.width ?? video.videoWidth, video.videoWidth);
    const height = Math.round((video.videoHeight * width) / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    return await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8));
  } catch {
    return null; // keep the old poster rather than fail the replacement
  }
}

/**
 * Replace the asset's file with `file`, keeping its URL. Resolves with the
 * new version (for `?v=`), size, type and the details now in force.
 */
export async function replaceMedia(
  asset: { src: string; type: string },
  file: File,
  progress: (label: string) => void = () => {},
): Promise<ReplaceResult> {
  const parts = mediaParts(asset.src, asset.type);
  const main = parts.find((p) => p.role === "main")!;
  const finish = (r: ReplaceResult, blob: Blob): ReplaceResult => ({ ...r, size: r.size ?? blob.size, type: r.type ?? blob.type });

  if (asset.type.startsWith("image/")) {
    // Any picture the browser can decode works: it is redrawn as WebP below.
    const problem = replacementProblem(asset.type, fileType(file).startsWith("image/") ? "image/webp" : fileType(file) || "application/octet-stream");
    if (problem) throw new ApiError(problem, 415);
    // A GIF stays a GIF when one replaces it: a canvas would keep one frame.
    if (file.type === "image/gif" && !main.width) {
      progress("Uploading");
      return finish(await mediaApi.replace(asset.src, file), file);
    }
    progress("Reading image");
    const bitmap = await decode(file).catch(() => {
      throw new ApiError("This browser can't read that image. Try JPG, PNG or WebP.", 415);
    });
    const quality = file.type === "image/png" ? 0.9 : 0.82;
    try {
      let last: Blob | null = null;
      let result: ReplaceResult = { src: asset.src };
      for (const part of parts) {
        // Shapeless files (older uploads) keep the new image's own size, at most 2400px on the long edge.
        const fit = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
        const width = part.width ?? Math.round(bitmap.width * fit);
        const height = part.height ?? Math.round(bitmap.height * fit);
        progress(part.role === "main" ? `Uploading ${width}px` : `Uploading ${width}px width`);
        last = await encode(bitmap, width, height, quality);
        const r = await mediaApi.replace(asset.src, last, part.role === "main" ? undefined : part.name);
        if (part.role === "main") result = r;
      }
      return finish(result, last!);
    } finally {
      bitmap.close();
    }
  }

  const problem = replacementProblem(asset.type, file.type);
  if (problem) throw new ApiError(problem, 415);
  if (file.size > 32 * 1024 * 1024) throw new ApiError("That file is over 32 MB. Export it smaller and try again.", 413);

  if (asset.type.startsWith("video/")) {
    progress("Reading video");
    const { width, height, video, url } = await videoSize(file);
    try {
      if (main.width && main.height && drift({ width, height }, { width: main.width, height: main.height }) > 0.02)
        throw new ApiError(
          `This video is ${width}×${height}. Choose one with the same proportions as the original (${main.width}×${main.height}) so pages keep their layout.`,
          415,
        );
      const posterPart = parts.find((p) => p.role === "poster");
      const poster = posterPart ? await posterOf(video, posterPart) : null;
      if (posterPart && poster) {
        progress("Uploading poster");
        await mediaApi.replace(asset.src, poster, posterPart.name);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  progress("Uploading");
  return finish(await mediaApi.replace(asset.src, file), file);
}
