import fs from "node:fs";
import path from "node:path";

import type { Element, Root } from "hast";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import { CONTENT_DIR, parsePost, readingMinutes, type Post } from "../../cms/format";
import { el, isEl, markdownToTree, setWikiResolver } from "../../cms/render";

export { outline, type OutlineItem } from "../../cms/render";

/*
 * Published writing, read from content/writing at build time.
 *
 * Everything here runs during `next build` only. The Markdown becomes a hast
 * tree once; the article page turns that into React (so an embedded post on X
 * can be a real component, rendered at build), and the feed turns it into
 * plain HTML. Either way the page ships no JavaScript for its words.
 */

export type Listed = Post & { minutes: number };

const dir = path.join(process.cwd(), CONTENT_DIR);

let cache: Listed[] | null = null;

/** Newest first. A file dated in the future is held back until a build after that date. */
export function publishedPosts(): Listed[] {
  if (cache) return cache;
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
  const now = Date.now();
  cache = files
    .map((file) => {
      const post = parsePost(fs.readFileSync(path.join(dir, file), "utf8"));
      if (`${post.slug}.md` !== file) throw new Error(`${file}: slug "${post.slug}" doesn't match its file name`);
      return { ...post, minutes: readingMinutes(post.body) };
    })
    .filter((p) => Date.parse(p.publishedAt) <= now)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  return cache;
}

/** Posts with a page of their own: what gets a URL, the sitemap and the feed. */
export function pagedPosts(): Listed[] {
  return publishedPosts().filter((p) => p.page);
}

export function postBySlug(slug: string): Listed | undefined {
  return pagedPosts().find((p) => p.slug === slug);
}

/* ── Markdown ────────────────────────────────────────────────────────── */

/** The article body as a hast tree, for the page to render as React. */
export async function markdownTree(markdown: string): Promise<Root> {
  setWikiResolver((name) => {
    const key = name.trim().toLowerCase();
    return pagedPosts().find((p) => p.title.trim().toLowerCase() === key || p.slug === key);
  });
  return markdownToTree(markdown, [[rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" }, keepBackground: false }]]);
}

/* ── Backlinks, related ──────────────────────────────────────────────── */

/** Posts that link here, by URL or by [[title]]: Obsidian's backlinks. */
export function backlinks(post: Post): Listed[] {
  const title = post.title.trim().toLowerCase();
  return pagedPosts().filter(
    (p) =>
      p.id !== post.id &&
      (p.body.includes(`/writing/${post.slug}`) || p.body.toLowerCase().includes(`[[${title}`) || p.body.includes(`[[${post.slug}`))
  );
}

/** Other posts, most shared tags first, then newest. */
export function related(post: Post, limit = 3): Listed[] {
  const tags = new Set(post.tags.map((t) => t.toLowerCase()));
  return pagedPosts()
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, shared: p.tags.filter((t) => tags.has(t.toLowerCase())).length }))
    .sort((a, b) => b.shared - a.shared || (a.p.publishedAt < b.p.publishedAt ? 1 : -1))
    .slice(0, limit)
    .map(({ p }) => p);
}

export const wordCount = (markdown: string) => markdown.match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;

/** For the feed: embeds fall back to their links. */
export async function renderMarkdown(markdown: string): Promise<string> {
  const tree = await markdownTree(markdown);
  const fallback = (parent: Root | Element) => {
    parent.children.forEach((node, i) => {
      if (!isEl(node)) return;
      if (node.tagName === "x-embed") {
        const url = (JSON.parse(String(node.properties?.dataEmbed)) as { url: string }).url;
        parent.children[i] = el("p", {}, [el("a", { href: url }, [{ type: "text", value: url }])]);
      } else fallback(node);
    });
  };
  fallback(tree);
  return String(unified().use(rehypeStringify).stringify(tree));
}

/* ── Dates ───────────────────────────────────────────────────────────── */

const longDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const formatLongDate = (iso: string) => longDate.format(new Date(iso));

/** Updated only counts when it's a different day from publishing. */
export function wasUpdated(post: Post): boolean {
  return formatLongDate(post.updatedAt) !== formatLongDate(post.publishedAt);
}
