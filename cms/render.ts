import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type PluggableList } from "unified";

import { parseEmbed } from "./embeds";
import { fluentUrl, splitEmoji } from "./emoji";
import { imageInfo, videoInfo } from "./media";

/*
 * Markdown → hast, the way the site renders a post: figures, callouts,
 * embeds, Fluent emoji, highlights, wikilinks, sized images, video and audio.
 *
 * Shared by the site build (app/lib/writing.ts, which adds code
 * highlighting) and the admin's preview, so what the preview shows is the
 * published page and not an approximation of it. No Node APIs here.
 */

export const el = (tagName: string, properties: Element["properties"], children: ElementContent[] = []): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});
export const isEl = (n: RootContent | ElementContent | undefined, tag?: string): n is Element =>
  n?.type === "element" && (!tag || n.tagName === tag);
export const textOf = (n: ElementContent): string =>
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
let wikiTarget: (name: string) => { slug: string } | undefined = () => undefined;
/** Who a [[wikilink]] points to: the site uses published posts, the admin its post list. */
export function setWikiResolver(fn: (name: string) => { slug: string } | undefined) {
  wikiTarget = fn;
}
function resolveWiki(name: string) {
  return wikiTarget(name);
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

        // Video: a figure, sized before it loads, its title the caption.
        if (node.tagName === "video" && !(parent.type === "element" && parent.tagName === "figure")) {
          const src = String(node.properties?.src ?? "");
          const info = videoInfo(src);
          const caption = node.properties?.title as string | undefined;
          if (node.properties) delete node.properties.title;
          node.properties = {
            ...node.properties,
            ...(info ? { width: info.width, height: info.height, poster: node.properties?.poster ?? info.poster } : {}),
            playsInline: true,
            preload: node.properties?.autoPlay ? "auto" : "metadata",
          };
          kids[i] = el("figure", { className: ["article-figure", "article-video"] }, [
            node,
            ...(caption ? [el("figcaption", {}, [{ type: "text", value: caption }])] : []),
          ]);
          continue;
        }
        // Audio: the voice-note player (a client component), captioned.
        if (node.tagName === "audio") {
          kids[i] = el("x-audio", { dataSrc: String(node.properties?.src ?? ""), dataTitle: String(node.properties?.title ?? "") }, []);
          continue;
        }

        if (node.tagName === "img") {
          // Its size and smaller widths come from the file name: no layout
          // shift while it loads, and a phone downloads the 640px one.
          const info = imageInfo(String(node.properties?.src ?? ""));
          node.properties = {
            ...node.properties,
            loading: "lazy",
            decoding: "async",
            ...(info ? { width: info.width, height: info.height, srcSet: info.srcSet, sizes: info.sizes } : {}),
          };
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

/** Markdown → hast, with every editorial touch. `extra` adds plugins at the end (the site adds Shiki). */
export async function markdownToTree(markdown: string, extra: PluggableList = []): Promise<Root> {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // Raw HTML is allowed through: posts are written only by me, and it's how
    // toggles (<details>), video and audio survive the trip.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeEditorial)
    .use(extra);
  return (await pipeline.run(pipeline.parse(markdown))) as Root;
}


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

