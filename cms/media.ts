/*
 * Media file names, shared by the uploader, the upload API and the site's
 * renderer.
 *
 * A name says what the page needs before the file loads, so the Markdown
 * stays a plain src and nothing else has to be stored:
 *
 *   <id>-2048x1365.webp   the largest image; its intrinsic size
 *   <id>-640.webp         a smaller width of the same image (srcset)
 *   <id>-1280x720.mp4     a video and its size
 *   <id>-poster.webp      that video's poster frame
 *   <id>-37s.m4a          audio and its length
 */

export type MediaKind = "image" | "video" | "audio";

export const MEDIA_ID = /^[a-z0-9]{10,24}$/;
export const MEDIA_NAME = /^[a-z0-9]{10,24}-(?:\d{1,5}x\d{1,5}|\d{2,5}|poster|\d{1,6}s)$/;

export function newMediaId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Date.now().toString(36).slice(-6) + Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

type Shape = { width: number; height: number } | { variant: number } | { seconds: number } | "poster";

export function mediaName(id: string, shape: Shape, ext = "webp"): string {
  const tail =
    shape === "poster"
      ? "poster"
      : "variant" in shape
        ? String(shape.variant)
        : "seconds" in shape
          ? `${shape.seconds}s`
          : `${shape.width}x${shape.height}`;
  return `${id}-${tail}.${ext}`;
}

const IMAGE_LADDER = [640, 1280];

/** From an image src, its size and the smaller widths uploaded beside it. */
export function imageInfo(src: string): { width: number; height: number; srcSet: string; sizes: string } | null {
  const m = /^(\/media\/\d{4}\/([a-z0-9]{10,24}))-(\d+)x(\d+)\.webp$/.exec(src);
  if (!m) return null;
  const [, base, , w, h] = m;
  const width = Number(w);
  const height = Number(h);
  if (!width || !height) return null;
  const smaller = IMAGE_LADDER.filter((x) => x < width).map((x) => `${base}-${x}.webp ${x}w`);
  return {
    width,
    height,
    srcSet: [...smaller, `${src} ${width}w`].join(", "),
    // Figures break out to ~880px; on a phone they're the screen's width.
    sizes: "(min-width: 920px) 880px, calc(100vw - 2rem)",
  };
}

/** From a video src, its size and poster. */
export function videoInfo(src: string): { width: number; height: number; poster: string } | null {
  const m = /^(\/media\/\d{4}\/[a-z0-9]{10,24})-(\d+)x(\d+)\.(mp4|webm)$/.exec(src);
  if (!m) return null;
  return { width: Number(m[2]), height: Number(m[3]), poster: `${m[1]}-poster.webp` };
}

export function audioSeconds(src: string): number | null {
  const m = /-(\d+)s\.(m4a|webm|mp3|ogg)$/.exec(src);
  return m ? Number(m[1]) : null;
}

export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
