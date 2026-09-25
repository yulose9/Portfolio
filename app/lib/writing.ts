import fs from "node:fs";
import path from "node:path";

import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { parseEmbed } from "../../cms/embeds";
import { fluentUrl, splitEmoji } from "../../cms/emoji";
import { CONTENT_DIR, parsePost, readingMinutes, type Post } from "../../cms/format";

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

/* ── Markdown → hast ─────────────────────────────────────────────────── */

const el = (tagName: string, properties: Element["properties"], children: ElementContent[] = []): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});
const isEl = (n: RootContent | ElementContent | undefined, tag?: string): n is Element =>
  n?.type === "element" && (!tag || n.tagName === tag);
const textOf = (n: ElementContent): string =>
  n.type === "text" ? n.value : n.type === "element" ? n.children.map(textOf).join("") : "";

/*
 * Callouts: GitHub's five alert types, plus Obsidian's, with Obsidian's
 * extras — a title after the type, and "-" / "+" to make it foldable
 * (closed / open):  > [!question]- Why not just retry?
 */
const CALLOUT = /^\s*\[!([a-z]+)\]([+-]?)[ \t]*([^\n]*)\n?/i;
export const CALLOUT_EMOJI: Record<string, string> = {
  note: "💡",
  tip: "✅",
  important: "📌",
  warning: "⚠️",
  caution: "🛑",
  info: "ℹ️",
  question: "❓",
  success: "✅",
  danger: "⛔",
  bug: "🐛",
  example: "📋",
  quote: "💬",
  abstract: "📝",
  todo: "☑️",
  failure: "❌",
};
const CALLOUT_ALIAS: Record<string, string> = {
  hint: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  attention: "warning",
  error: "danger",
  fail: "failure",
  missing: "failure",
  summary: "abstract",
  tldr: "abstract",
  cite: "quote",
};
/** Colour family for each kind, so the page needs five tints, not fifteen. */
const CALLOUT_TONE: Record<string, string> = {
  note: "note",
  info: "important",
  important: "important",
  abstract: "important",
  todo: "important",
  tip: "tip",
  success: "tip",
  question: "warning",
  warning: "warning",
  caution: "caution",
  danger: "caution",
  failure: "caution",
  bug: "caution",
  example: "note",
  quote: "note",
};

/* ── Links between posts ─────────────────────────────────────────────── */

/**
 * Obsidian's [[wikilinks]]: [[Post title]] or [[Post title|shown text]]
 * links to that post, matched by title or slug. A link to something not
 * (yet) published stays plain text, marked so it can be styled as pending.
 */
function resolveWiki(name: string): Listed | undefined {
  const key = name.trim().toLowerCase();
  return pagedPosts().find((p) => p.title.trim().toLowerCase() === key || p.slug === key);
}

/** Inside these, text is left exactly as written: no emoji art, no ==marks==. */
const LITERAL = new Set(["code", "pre", "kbd", "samp", "script", "style", "title"]);

/** Plain text → text, wikilinks, <mark>, <u> and Fluent emoji spans. */
function decorateText(value: string): ElementContent[] {
  const out: ElementContent[] = [];
  // [[wikilinks]], ==highlight== and ++underline++ first; each piece then gets its emoji.
  const pieces = value.split(/(\[\[[^\]\n]+\]\]|==[^=\n]+==|\+\+[^+\n]+\+\+)/g);
  for (const piece of pieces) {
    if (!piece) continue;
    const wiki = /^\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]$/.exec(piece);
    if (wiki) {
      const target = resolveWiki(wiki[1]);
      const label = (wiki[2] ?? wiki[1]).trim();
      out.push(
        target
          ? el("a", { href: `/writing/${target.slug}`, className: ["wikilink"] }, [{ type: "text", value: label }])
          : el("span", { className: ["wikilink", "wikilink-missing"], title: "Not published yet" }, [{ type: "text", value: label }])
      );
      continue;
    }
    const marked = /^==([^=\n]+)==$/.exec(piece) ?? /^\+\+([^+\n]+)\+\+$/.exec(piece);
    const target = marked ? el(piece.startsWith("==") ? "mark" : "u", {}, []) : null;
    for (const run of splitEmoji(marked ? marked[1] : piece)) {
      const node: ElementContent = run.emoji
        ? el("span", { className: ["fe"], style: `--fe:url(${fluentUrl(run.text)})` }, [{ type: "text", value: run.text }])
        : ({ type: "text", value: run.text } as Text);
      (target ? target.children : out).push(node);
    }
    if (target) out.push(target);
  }
  return out;
}

/**
 * The editorial pass: figures, callouts, embeds, emoji, highlights, tables,
 * links. One walk, top-down.
 */
function rehypeEditorial() {
  return (tree: Root) => {
    const walk = (parent: Root | Element, literal: boolean) => {
      const kids = parent.children as (RootContent | ElementContent)[];
      for (let i = 0; i < kids.length; i++) {
        const node = kids[i];

        if (node.type === "text" && !literal && parent.type === "element") {
          const decorated = decorateText(node.value);
          if (decorated.length !== 1 || decorated[0].type !== "text") {
            kids.splice(i, 1, ...decorated);
            i += decorated.length - 1;
          }
          continue;
        }
        if (!isEl(node)) continue;

        // A paragraph that is only an image → a figure, its title the caption.
        if (node.tagName === "p") {
          const content = node.children.filter((k) => !(k.type === "text" && !k.value.trim()));
          const only = content.length === 1 ? content[0] : undefined;
          if (isEl(only, "img")) {
            const caption = only.properties?.title as string | undefined;
            if (only.properties) delete only.properties.title;
            kids[i] = el("figure", { className: ["article-figure"] }, [
              only,
              ...(caption ? [el("figcaption", {}, [{ type: "text", value: caption }])] : []),
            ]);
            continue;
          }
          // A paragraph that is only a link to an embeddable post → the embed.
          const link = only as ElementContent | undefined;
          if (link?.type === "element" && link.tagName === "a") {
            const href = String(link.properties?.href ?? "");
            const embed = parseEmbed(href);
            if (embed && textOf(link).trim() === href) {
              kids[i] = el("x-embed", { dataEmbed: JSON.stringify(embed) }, []);
              continue;
            }
          }
        }

        // > [!NOTE] … → a callout (GitHub's and Obsidian's syntax both).
        if (node.tagName === "blockquote") {
          const firstP = node.children.find((k): k is Element => isEl(k, "p"));
          const firstText = firstP?.children[0];
          const match = firstText?.type === "text" ? CALLOUT.exec(firstText.value) : null;
          const raw = match?.[1].toLowerCase() ?? "";
          const kind = CALLOUT_ALIAS[raw] ?? raw;
          if (firstP && firstText?.type === "text" && match && CALLOUT_EMOJI[kind]) {
            const fold = match[2];
            const title = match[3].trim();
            firstText.value = firstText.value.slice(match[0].length);
            if (!firstP.children.some((k) => textOf(k).trim())) node.children = node.children.filter((k) => k !== firstP);
            const icon = el("span", { className: ["callout-icon"], ariaHidden: "true" }, [
              el("span", { className: ["fe"], style: `--fe:url(${fluentUrl(CALLOUT_EMOJI[kind])})` }, [{ type: "text", value: CALLOUT_EMOJI[kind] }]),
            ]);
            const heading = title ? [el("p", { className: ["callout-title"] }, decorateText(title))] : [];
            const tone = CALLOUT_TONE[kind] ?? "note";
            kids[i] = fold
              ? el("details", { className: ["callout", "callout-fold"], dataType: tone, dataKind: kind, open: fold === "+" }, [
                  el("summary", { className: ["callout-summary"] }, [icon, ...(title ? decorateText(title) : [{ type: "text", value: kind[0].toUpperCase() + kind.slice(1) } as Text])]),
                  el("div", { className: ["callout-body"] }, node.children),
                ])
              : el("aside", { className: ["callout"], dataType: tone, dataKind: kind }, [icon, el("div", { className: ["callout-body"] }, [...heading, ...node.children])]);
            walk(kids[i] as Element, literal);
            continue;
          }
        }

        // Headings get a link to themselves, the way Notion and Obsidian do.
        if ((node.tagName === "h2" || node.tagName === "h3" || node.tagName === "h4") && node.properties?.id) {
          walk(node, literal);
          node.children.push(
            el("a", { href: `#${node.properties.id}`, className: ["heading-anchor"], ariaLabel: "Link to this section" }, [{ type: "text", value: "#" }])
          );
          continue;
        }

        // Tables scroll sideways on a phone instead of breaking the page.
        if (node.tagName === "table" && !(isEl(parent as Element) && (parent as Element).tagName === "div")) {
          kids[i] = el("div", { className: ["table-wrap"] }, [node]);
          walk(node, literal);
          continue;
        }

        if (node.tagName === "img") {
          node.properties = { ...node.properties, loading: "lazy", decoding: "async" };
        }
        if (node.tagName === "a") {
          const href = String(node.properties?.href ?? "");
          if (/^https?:\/\//.test(href) && !/^https:\/\/(www\.)?nazarene\.dev/.test(href)) {
            node.properties = { ...node.properties, target: "_blank", rel: ["noreferrer"] };
          }
        }

        walk(node, literal || LITERAL.has(node.tagName));
      }
    };
    walk(tree, false);
  };
}

const pipeline = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Raw HTML is allowed through: posts are written only by me, and it's how
  // toggles (<details>) and underline survive the trip.
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeEditorial)
  .use(rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" }, keepBackground: false });

/** The article body as a hast tree, for the page to render as React. */
export async function markdownTree(markdown: string): Promise<Root> {
  return (await pipeline.run(pipeline.parse(markdown))) as Root;
}

/* ── Outline, backlinks, related ─────────────────────────────────────── */

export type OutlineItem = { id: string; text: string; depth: 2 | 3 };

/** The h2s and h3s, for the table of contents. */
export function outline(tree: Root): OutlineItem[] {
  const out: OutlineItem[] = [];
  const walk = (n: Root | Element) => {
    for (const k of n.children) {
      if (!isEl(k)) continue;
      if ((k.tagName === "h2" || k.tagName === "h3") && k.properties?.id) {
        const text = k.children
          .filter((c) => !(isEl(c) && (c.properties?.className as string[] | undefined)?.includes("heading-anchor")))
          .map(textOf)
          .join("")
          .trim();
        out.push({ id: String(k.properties.id), text, depth: k.tagName === "h2" ? 2 : 3 });
      } else walk(k);
    }
  };
  walk(tree);
  return out;
}

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
