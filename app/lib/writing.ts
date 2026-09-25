import fs from "node:fs";
import path from "node:path";

import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { CONTENT_DIR, parsePost, readingMinutes, type Post } from "../../cms/format";

/*
 * Published writing, read from content/writing at build time.
 *
 * Everything here runs during `next build` only: the Markdown becomes static
 * HTML (code highlighted by Shiki, at build), so an article page ships no
 * JavaScript for its content at all.
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

export function postBySlug(slug: string): Listed | undefined {
  return publishedPosts().find((p) => p.slug === slug);
}

/* ── Markdown → HTML ─────────────────────────────────────────────────── */

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

/**
 * Editorial touches the Markdown can't say on its own:
 *  - an image alone in its paragraph becomes a <figure>, its title the caption
 *    (`![alt](src "caption")` — what the editor writes);
 *  - images load lazily and decode off the main thread;
 *  - links off the site open in a new tab.
 */
function rehypeEditorial() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      node.children?.forEach((child, i) => {
        if (child.tagName === "p") {
          const kids = (child.children ?? []).filter((k) => !(k.type === "text" && !k.value?.trim()));
          if (kids.length === 1 && kids[0].tagName === "img") {
            const img = kids[0];
            const caption = img.properties?.title as string | undefined;
            if (img.properties) delete img.properties.title;
            node.children![i] = {
              type: "element",
              tagName: "figure",
              properties: { className: ["article-figure"] },
              children: [
                img,
                ...(caption
                  ? [{ type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: caption }] }]
                  : []),
              ],
            };
          }
        }
        if (child.tagName === "img") {
          child.properties = { ...child.properties, loading: "lazy", decoding: "async" };
        }
        if (child.tagName === "a") {
          const href = String(child.properties?.href ?? "");
          if (/^https?:\/\//.test(href) && !href.startsWith("https://nazarene.dev")) {
            child.properties = { ...child.properties, target: "_blank", rel: "noreferrer" };
          }
        }
        walk(node.children![i]);
      });
    };
    walk(tree);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeEditorial)
  .use(rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" }, keepBackground: false })
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<string> {
  return String(await processor.process(markdown));
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
