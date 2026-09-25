/**
 * The article format, shared by the site build, the admin API and the
 * scheduler, so there is exactly one idea of what a post file looks like.
 *
 * A published post is one Markdown file, content/writing/<slug>.md:
 *
 *   ---
 *   id: "k3v9x2m1q8ab"
 *   title: "Retrieval was never the hard part"
 *   ...
 *   ---
 *   Body in Markdown.
 *
 * Every front-matter value is written as JSON. JSON is a subset of YAML, so the
 * file still reads as ordinary front matter on GitHub, but parsing it needs no
 * YAML library and can't be surprised by YAML's type guessing (`no` → false,
 * `1.10` → 1.1, a colon in a title).
 */

export type Cover = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

/** What a published file carries. */
export type PostMeta = {
  /** Stable forever. Slugs can change; the id is how a post is recognised. */
  id: string;
  title: string;
  slug: string;
  /** The standfirst: one or two sentences under the headline. */
  dek: string;
  tags: string[];
  cover: Cover | null;
  /** First went live. Never moves after that, even when the post is edited. */
  publishedAt: string;
  /** Last published edit. */
  updatedAt: string;
  /** Slugs this post used to live at; each becomes a 301 to the current one. */
  redirectFrom: string[];
};

export type Post = PostMeta & { body: string };

export type DraftStatus = "draft" | "scheduled" | "published";

/**
 * The working copy the editor saves to R2. Every post has one once it has been
 * opened in the admin, published or not; the git file is only ever the
 * published snapshot of it.
 */
export type Draft = {
  id: string;
  title: string;
  slug: string;
  dek: string;
  tags: string[];
  cover: Cover | null;
  body: string;
  status: DraftStatus;
  /** ISO. For a scheduled post, when it goes live. */
  publishAt: string | null;
  /** ISO. Set on first publish and then kept. */
  publishedAt: string | null;
  /** The slug that is live in git right now, or null if nothing is. */
  liveSlug: string | null;
  redirectFrom: string[];
  /** True when the working copy differs from what is live. */
  dirty: boolean;
  createdAt: string;
  updatedAt: string;
};

const FENCE = "---";
const KEY_ORDER: (keyof PostMeta)[] = [
  "id",
  "title",
  "slug",
  "dek",
  "tags",
  "cover",
  "publishedAt",
  "updatedAt",
  "redirectFrom",
];

export function serializePost(post: Post): string {
  const lines = KEY_ORDER.map((key) => `${key}: ${JSON.stringify(post[key])}`);
  return `${FENCE}\n${lines.join("\n")}\n${FENCE}\n\n${post.body.trim()}\n`;
}

export function parsePost(source: string): Post {
  const text = source.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith(`${FENCE}\n`)) throw new Error("Missing front matter");
  const end = text.indexOf(`\n${FENCE}\n`, FENCE.length);
  if (end === -1) throw new Error("Unterminated front matter");

  const meta: Record<string, unknown> = {};
  for (const line of text.slice(FENCE.length + 1, end).split("\n")) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) throw new Error(`Bad front matter line: ${line}`);
    meta[line.slice(0, colon).trim()] = JSON.parse(line.slice(colon + 1).trim());
  }

  const post: Post = {
    id: String(meta.id ?? ""),
    title: String(meta.title ?? ""),
    slug: String(meta.slug ?? ""),
    dek: String(meta.dek ?? ""),
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    cover: (meta.cover as Cover | null) ?? null,
    publishedAt: String(meta.publishedAt ?? ""),
    updatedAt: String(meta.updatedAt ?? meta.publishedAt ?? ""),
    redirectFrom: Array.isArray(meta.redirectFrom) ? meta.redirectFrom.map(String) : [],
    body: text.slice(end + FENCE.length + 2).trim(),
  };
  if (!post.id || !isValidSlug(post.slug)) throw new Error("Post needs an id and a valid slug");
  return post;
}

/* ── Slugs ──────────────────────────────────────────────────────────────── */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

/** Words a post can't be called, because the site already uses the path. */
const RESERVED = new Set(["admin", "api", "media", "feed", "rss", "index", "new"]);

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX && SLUG.test(slug) && !RESERVED.has(slug);
}

/** "Retrieval was never the hard part!" → "retrieval-was-never-the-hard-part". */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // é → e
    .toLowerCase()
    .replace(/['’]/g, "") // don't → dont, not don-t
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
  return RESERVED.has(slug) ? `${slug}-post` : slug;
}

export const CONTENT_DIR = "content/writing";
export const postPath = (slug: string) => `${CONTENT_DIR}/${slug}.md`;

/** A short, URL-safe, time-ordered id: 12 characters. */
export function newId(): string {
  const time = Date.now().toString(36).padStart(9, "0").slice(-9);
  const rand = crypto.getRandomValues(new Uint8Array(3));
  return time + Array.from(rand, (b) => (b % 36).toString(36)).join("");
}

export function draftToPost(draft: Draft, now: string): Post {
  return {
    id: draft.id,
    title: draft.title.trim(),
    slug: draft.slug,
    dek: draft.dek.trim(),
    tags: draft.tags,
    cover: draft.cover,
    publishedAt: draft.publishedAt ?? now,
    updatedAt: now,
    redirectFrom: draft.redirectFrom.filter((s) => s !== draft.slug),
    body: draft.body,
  };
}

export function postToDraft(post: Post): Draft {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    dek: post.dek,
    tags: post.tags,
    cover: post.cover,
    body: post.body,
    status: "published",
    publishAt: null,
    publishedAt: post.publishedAt,
    liveSlug: post.slug,
    redirectFrom: post.redirectFrom,
    dirty: false,
    createdAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

/** Words ÷ 230 per minute, rounded up, never zero. */
export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, " ").match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 230));
}
