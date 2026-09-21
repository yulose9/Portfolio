"use client";

import type { ImageLoaderProps } from "next/image";
import manifest from "./image-manifest.json";

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  const variants = (manifest as Record<string, { width: number; src: string }[]>)[src];
  if (!variants) return src;
  return (variants.find(variant => variant.width >= width) ?? variants[variants.length - 1]).src;
}
