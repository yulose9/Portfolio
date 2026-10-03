import { SITE_INFO } from "../constants/seo";
import type { Listed } from "./writing";

/*
 * The per-post SEO facts that several outputs need (the page's tags, its
 * JSON-LD, the feed, llms.txt, the sitemap), derived from the post itself so
 * a new post gets them with nothing to fill in.
 */

/** Markdown → readable prose: no syntax, no HTML, no images, no code. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<details[\s\S]*?<\/summary>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page, label) => label ?? page)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>\s*\[![^\]]+\]|>|[-*+]|\d+\.)\s*/gm, "")
    .replace(/^\s*(?:https?:\/\/\S+)\s*$/gm, " ")
    .replace(/[*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cut at a word boundary, with an ellipsis when anything was cut. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * The meta description: the dek, which the author wrote for this purpose,
 * topped up from the opening of the post when it's too short for a search
 * snippet (~150–160 characters). Never invented: every word is the post's.
 */
export function postDescription(post: Pick<Listed, "dek" | "body" | "title">, max = 160): string {
  const dek = post.dek.trim();
  if (dek.length >= 120) return clip(dek, max);
  const opening = plainText(post.body);
  if (!dek) return clip(opening || post.title, max);
  const joined = /[.!?…]$/.test(dek) ? `${dek} ${opening}` : `${dek}. ${opening}`;
  return clip(joined, max);
}

const isRaster = (src: string) => !/\.svg(?:[?#].*)?$/i.test(src);

/** The post's generated share card, drawn at build (app/og/writing/[file]/route.tsx). */
export const cardPath = (slug: string) => `/og/writing/${slug}.png`;

/**
 * The share image: the one picked in the admin, else the cover when picked
 * and raster, else the card drawn for the post. SVG covers never qualify:
 * X, LinkedIn, Facebook and Slack all refuse SVG previews.
 */
export function shareImage(post: Listed): { url: string; width?: number; height?: number; alt: string; type?: string } {
  const abs = (src: string) => new URL(src, SITE_INFO.url).toString();
  if (post.ogImage && post.ogImage !== "cover" && isRaster(post.ogImage)) return { url: abs(post.ogImage), width: 1200, height: 630, alt: post.title };
  if (post.ogImage === "cover" && post.cover && isRaster(post.cover.src))
    return { url: abs(post.cover.src), width: post.cover.width || undefined, height: post.cover.height || undefined, alt: post.cover.alt || post.title };
  return { url: abs(cardPath(post.slug)), width: 1200, height: 630, alt: post.title, type: "image/png" };
}

/** Every image that represents the post, best first, for JSON-LD and the image sitemap. */
export function postImages(post: Listed): string[] {
  const list = [shareImage(post).url];
  if (post.cover && isRaster(post.cover.src)) list.push(new URL(post.cover.src, SITE_INFO.url).toString());
  return [...new Set(list)];
}
