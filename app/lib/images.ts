import { imageInfo } from "../../cms/media";
import manifest from "../image-manifest.json";

/*
 * One image src, turned into what a responsive <img> or <picture> needs.
 *
 *  - Images in public/ that scripts/optimize-images.mjs processed get AVIF
 *    and WebP srcsets. The manifest records each one's widths.
 *  - Uploaded media (/media/<year>/<id>-WxH.webp) get the WebP widths that
 *    were uploaded beside them (cms/media.ts).
 *  - Anything else (SVG, remote URLs, an image the build couldn't process)
 *    comes back unchanged, so the original still loads.
 */

type Entry = { width: number; height: number; hash: string; widths: number[] };

export type ResponsiveImage = {
  src: string;
  width?: number;
  height?: number;
  /** WebP (or the original format) candidates, for <img srcSet>. */
  srcSet?: string;
  /** AVIF candidates, for a <source type="image/avif">. */
  avifSrcSet?: string;
};

const entries = manifest as Record<string, Entry>;

export function responsiveImage(src: string | undefined): ResponsiveImage | null {
  if (!src) return null;
  const entry = entries[src];
  if (entry) {
    const set = (ext: string) => entry.widths.map((w) => `/optimized/${entry.hash}-${w}.${ext} ${w}w`).join(", ");
    const top = entry.widths[entry.widths.length - 1];
    return {
      src: `/optimized/${entry.hash}-${top}.webp`,
      width: entry.width,
      height: entry.height,
      srcSet: set("webp"),
      avifSrcSet: set("avif"),
    };
  }
  const media = imageInfo(src);
  if (media) return { src, width: media.width, height: media.height, srcSet: media.srcSet };
  return { src };
}
