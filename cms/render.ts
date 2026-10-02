import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type PluggableList } from "unified";

import { parseEmbed } from "./embeds";
import { fluentUrl, splitEmoji } from "./emoji";
import { imageInfo, videoInfo } from "./media";
import { dateHref, fullMentionDate, pageMentionId, parseDateHref } from "./mentions";
import { textColor, textOpacity, safeInlineUrl, decodeLogoLabel } from "./inline";
import { FONT_CATALOG, findFont, fontStack } from "./fonts";
import { CHART_TYPES, POLL_ID, TABLE_STYLES, isChartType, isTableStyle, parseCodeMeta, rangeLines, siteOf } from "./blocks";

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
type PageResolver = (id: string) => { slug: string; title: string } | undefined;
function rehypeEditorial(options: { resolvePage?: PageResolver } = {}) {
  return (tree: Root) => {
    const citations: Source[] = [];
    const walk = (parent: Root | Element, literal: boolean, inLink = false) => {
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

        // Code: a framed block (header, copy, wrap), its fence meta kept.
        if (node.tagName === "pre" && node.children.some((k) => isEl(k, "code"))) {
          kids[i] = codeFrame(node);
          continue;
        }
        if (node.tagName === "div" && node.properties.dataCodeTabs !== undefined) {
          const panes = node.children.filter((k): k is Element => isEl(k, "pre"));
          if (panes.length) {
            const frames = panes.map((pre) => codeFrame(pre, true));
            const tabs = frames.map((f, n) => ({ label: String(f.properties.dataTitle || `Tab ${n + 1}`), language: String(f.properties.dataLanguage ?? "") }));
            kids[i] = el("x-code-tabs", { dataTabs: JSON.stringify(tabs) }, frames);
            continue;
          }
        }
        if (node.tagName === "div" && isTableStyle(node.properties.dataTable)) {
          const table = node.children.find((k): k is Element => isEl(k, "table"));
          if (table) {
            walk(table, literal);
            const style = node.properties.dataTable;
            kids[i] = style === "data"
              ? el("x-data-table", { dataTableStyle: "data" }, [table])
              : el("div", { className: ["table-wrap"], dataTableStyle: style }, [table]);
            continue;
          }
        }
        if (node.tagName === "div" && isChartType(node.properties.dataChart)) {
          const table = node.children.find((k): k is Element => isEl(k, "table"));
          if (table) {
            walk(table, literal);
            kids[i] = el("x-chart", {
              dataChart: node.properties.dataChart,
              dataTitle: String(node.properties.dataTitle ?? ""),
              dataChartData: JSON.stringify(tableRows(table)),
            }, [el("div", { className: ["table-wrap"] }, [table])]);
            continue;
          }
        }
        if (node.tagName === "div" && typeof node.properties.dataPoll === "string" && POLL_ID.test(node.properties.dataPoll)) {
          const question = node.children.find((k): k is Element => isEl(k, "p"));
          const list = node.children.find((k): k is Element => isEl(k, "ul") || isEl(k, "ol"));
          const options = (list?.children ?? []).filter((k): k is Element => isEl(k, "li")).map((li) => textOf(li).trim()).filter(Boolean).slice(0, 12);
          if (question && options.length >= 2) {
            walk(node, literal);
            kids[i] = el("x-poll", { dataPoll: node.properties.dataPoll, dataQuestion: textOf(question).trim(), dataOptions: JSON.stringify(options) }, node.children);
            continue;
          }
        }
        // A citation: a numbered pill here, its source listed at the end.
        if (node.tagName === "a" && node.properties.dataCite !== undefined) {
          const href = safeInlineUrl(node.properties.href);
          if (!inLink && href && /^https?:\/\//.test(href)) {
            let index = citations.findIndex((c) => c.href === href) + 1;
            const first = index === 0;
            if (first) {
              citations.push({ href, title: String(node.properties.dataTitle ?? ""), site: textOf(node).trim() || siteOf(href), snippet: String(node.properties.dataSnippet ?? "") });
              index = citations.length;
            }
            const source = citations[index - 1];
            kids[i] = el("x-cite", {
              ...(first ? { id: `cite-ref-${index}` } : {}),
              dataIndex: String(index), dataHref: href, dataTitle: source.title, dataSite: source.site, dataSnippet: source.snippet,
            }, [{ type: "text", value: String(index) }]);
            continue;
          }
          delete node.properties.dataCite;
        }

        if (node.tagName === "img" && typeof node.properties.dataHeadingIcon === "string") {
          const icon=decodeLogoLabel(node.properties.dataHeadingIcon);
          const src=safeInlineUrl(icon,true);
          kids[i]=el("span",{className:["heading-icon"],dataHeadingIcon:encodeURIComponent(icon),ariaHidden:"true"},src?[el("img",{src,alt:"",className:["heading-icon-image"]})]:[{type:"text",value:icon}]);
          continue;
        }
        if (node.tagName === "span" && node.properties.dataTextColor !== undefined) {
          const font=findFont(node.properties.dataTextFont);
          node.properties.style = `color:${textColor(node.properties.dataTextColor)??"inherit"}${node.properties.dataTextOpacity!==undefined?`;opacity:${textOpacity(node.properties.dataTextOpacity)/100}`:""}${font?`;font-family:${fontStack(font)}`:""}`;
        }
        if (node.tagName === "img" && typeof node.properties.dataInlineLogo === "string") {
          const label = decodeLogoLabel(node.properties.dataInlineLogo);
          const src = safeInlineUrl(node.properties.src, true);
          const href = inLink ? "" : safeInlineUrl(node.properties.dataLogoHref);
          kids[i] = el(href ? "a" : "span", {className:["inline-logo"], ...(href ? {href,rel:["noopener", "noreferrer"]} : {})}, [
            ...(src ? [el("img", {src, alt:"", className:["inline-logo-image"], loading:"lazy", decoding:"async"})] : []),
            el("span", {}, [{type:"text",value:label}]),
          ]);
          continue;
        }

        // A paragraph that is only an image → a figure, its title the caption.
        if (node.tagName === "p") {
          const content = node.children.filter((k) => !(k.type === "text" && !k.value.trim()));
          const only = content.length === 1 ? content[0] : undefined;
          if (isEl(only, "img") && only.properties.dataInlineLogo === undefined && only.properties.dataHeadingIcon === undefined) {
            const caption = only.properties?.title as string | undefined;
            if (only.properties) delete only.properties.title;
            kids[i] = el("figure", { className: ["article-figure"] }, [
              only,
              ...(caption ? [el("figcaption", {}, [{ type: "text", value: caption }])] : []),
            ]);
            walk(kids[i] as Element, literal);
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
        // The text is wrapped and named as the heading's label, so a screen
        // reader hears "Results", not "Results, Link to this section": the #
        // link stays its own, separately focusable control.
        if ((node.tagName === "h2" || node.tagName === "h3" || node.tagName === "h4") && node.properties?.id) {
          walk(node, literal);
          const textId = `${node.properties.id}-text`;
          node.children = [
            el("span", { id: textId, className: ["heading-text"] }, node.children),
            el("a", { href: `#${node.properties.id}`, className: ["heading-anchor"], ariaLabel: "Link to this section" }, [{ type: "text", value: "#" }]),
          ];
          node.properties.ariaLabelledBy = [textId];
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
          const requestedWidth = Number(node.properties?.width);
          const displayWidth = Number.isFinite(requestedWidth) && requestedWidth > 0
            ? Math.min(2400, Math.round(requestedWidth)) : null;
          const requestedHeight = Number(node.properties?.height);
          // Its size and smaller widths come from the file name: no layout
          // shift while it loads, and a phone downloads the 640px one.
          const info = imageInfo(String(node.properties?.src ?? ""));
          node.properties = {
            ...node.properties,
            loading: "lazy",
            decoding: "async",
            ...(info ? { width: info.width, height: info.height, srcSet: info.srcSet, sizes: info.sizes } : {}),
            ...(displayWidth ? {
              width: displayWidth,
              sizes: `(max-width: ${displayWidth + 32}px) calc(100vw - 2rem), ${displayWidth}px`,
              height: info ? Math.round(displayWidth * info.height / info.width)
                : Number.isFinite(requestedHeight) && requestedHeight > 0 ? Math.round(requestedHeight) : undefined,
              style: `width: ${displayWidth}px; max-width: 100%; height: auto; margin-inline: auto`,
            } : {}),
          };
          // Sized Markdown images are HTML blocks, not paragraph children.
          const caption = node.properties.title;
          if (caption && !(parent.type === "element" && parent.tagName === "figure")) {
            delete node.properties.title;
            kids[i] = el("figure", { className: ["article-figure"] }, [
              node, el("figcaption", {}, [{ type: "text", value: String(caption) }]),
            ]);
          }
        }
        if (node.tagName === "a") {
          const href = String(node.properties?.href ?? "");
          const date = parseDateHref(href);
          const pageId = pageMentionId(href);
          if (date) {
            kids[i] = el("span", { dataDateMention: dateHref(date), className: ["date-mention"] }, [{type:"text",value:`@${fullMentionDate(date)}`}]);
            continue;
          }
          if (pageId) {
            const page = options.resolvePage?.(pageId);
            kids[i] = page ? el("a", {href:`/writing/${page.slug}`,className:["page-mention"]}, [{type:"text",value:`↗ ${page.title}`}])
              : el("span", {className:["page-mention","page-mention-unpublished"]}, node.children);
            continue;
          }
          if (/^https?:\/\//.test(href) && !/^https:\/\/(www\.)?nazarene\.dev/.test(href)) {
            node.properties = { ...node.properties, target: "_blank", rel: ["noreferrer"] };
          }
        }

        walk(node, literal || LITERAL.has(node.tagName), inLink || node.tagName === "a");
      }
    };
    walk(tree, false);
    if (citations.length) tree.children.push(sourcesList(citations));
  };
}

/* ── Code, chart data and citations: helpers for the pass above ──────── */

type Source = { href: string; title: string; site: string; snippet: string };

/** pre > code → <x-code> (the site's code frame), lines split and marked. */
function codeFrame(pre: Element, bare = false): Element {
  const code = pre.children.find((k): k is Element => isEl(k, "code"))!;
  const raw = typeof code.properties.dataMeta === "string" ? code.properties.dataMeta : "";
  delete code.properties.dataMeta;
  const meta = parseCodeMeta(raw);
  const language = ((code.properties.className as string[] | undefined) ?? []).map(String).find((c) => c.startsWith("language-"))?.slice(9) ?? "";
  // Shiki (rehype-pretty-code, on the site) reads these from the meta; the
  // frame draws the title itself rather than Shiki's figcaption.
  const prettyMeta = [meta.lineNumbers ? "showLineNumbers" : "", meta.highlight ? `{${meta.highlight}}` : ""].filter(Boolean).join(" ");
  code.data = { ...(code.data ?? {}), meta: prettyMeta } as Element["data"];
  if (meta.highlight) code.properties.dataHighlight = meta.highlight;
  if (meta.lineNumbers) code.properties.dataLineNumbers = "";
  return el("x-code", {
    dataLanguage: language,
    dataTitle: meta.title,
    ...(meta.lineNumbers ? { dataLineNumbers: "" } : {}),
    ...(bare ? { dataBare: "" } : {}),
  }, [pre]);
}

/** A table's cells as text, header row first. */
function tableRows(table: Element): string[][] {
  const rows: string[][] = [];
  const visit = (n: Element) => {
    for (const k of n.children) {
      if (!isEl(k)) continue;
      if (k.tagName === "tr") rows.push(k.children.filter((c): c is Element => isEl(c, "th") || isEl(c, "td")).map((c) => textOf(c).trim()));
      else visit(k);
    }
  };
  visit(table);
  return rows.slice(0, 201);
}

/** The citations, numbered as they first appear, after the article's text. */
function sourcesList(citations: Source[]): Element {
  return el("section", { className: ["article-sources"], ariaLabelledBy: ["article-sources-title"] }, [
    el("h2", { className: ["article-sources-title"], id: "article-sources-title" }, [{ type: "text", value: "Sources" }]),
    el("ol", {}, citations.map((c, n) =>
      el("li", { id: `source-${n + 1}` }, [
        el("a", { href: c.href, target: "_blank", rel: ["noreferrer"], className: ["article-source-link"] }, [{ type: "text", value: c.title || c.site }]),
        el("span", { className: ["article-source-site"] }, [{ type: "text", value: c.site }]),
        ...(c.snippet ? [el("p", { className: ["article-source-snippet"] }, [{ type: "text", value: c.snippet }])] : []),
        el("a", { href: `#cite-ref-${n + 1}`, className: ["article-source-back"], ariaLabel: `Back to citation ${n + 1}` }, [{ type: "text", value: "↩" }]),
      ])
    )),
  ]);
}

/**
 * Where nothing highlighted the code (the admin's preview), the same line
 * spans Shiki makes, so line numbers and highlighted lines show there too.
 * Shiki needs the code as one text node, so this runs after it.
 */
function rehypeCodeLines() {
  return (tree: Root) => {
    const visit = (n: Root | Element) => {
      for (const k of n.children) {
        if (!isEl(k)) continue;
        if (k.tagName !== "code") {
          visit(k);
          continue;
        }
        const marked = rangeLines(String(k.properties.dataHighlight ?? ""));
        delete k.properties.dataHighlight;
        const only = k.children.length === 1 ? k.children[0] : undefined;
        if ((marked.size || k.properties.dataLineNumbers !== undefined) && only?.type === "text") {
          const lines = only.value.replace(/\n$/, "").split("\n");
          k.children = lines.flatMap((line, i): ElementContent[] => [
            ...(i ? [{ type: "text", value: "\n" } as Text] : []),
            el("span", { dataLine: "", ...(marked.has(i + 1) ? { dataHighlightedLine: "" } : {}) }, line ? [{ type: "text", value: line }] : []),
          ]);
        }
      }
    };
    visit(tree);
  };
}

/** A fence's meta (title, line numbers, highlighted lines) lives on the
 *  code's data, which the sanitizer drops; carry it across as a property. */
function rehypeKeepMeta() {
  return (tree: Root) => {
    const visit = (n: Root | Element) => {
      for (const k of n.children) {
        if (!isEl(k)) continue;
        const meta = (k.data as { meta?: unknown } | undefined)?.meta;
        if (k.tagName === "code" && typeof meta === "string" && meta) k.properties.dataMeta = meta.slice(0, 400);
        visit(k);
      }
    };
    visit(tree);
  };
}

/** Markdown → hast, with every editorial touch. `extra` adds plugins at the end (the site adds Shiki). */
export async function markdownToTree(markdown: string, extra: PluggableList = [], resolvePage?: PageResolver): Promise<Root> {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // Parse HTML for media/toggles, then remove active content before any
    // trusted plugin generates custom components or syntax-highlight styles.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKeepMeta)
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeSanitize, {
      ...defaultSchema,
      tagNames: [...(defaultSchema.tagNames ?? []), "video", "audio", "mark", "u"],
      // Prefix authored and generated IDs to prevent DOM clobbering.
      // The editorial pass below builds TOC links from these sanitized IDs.
      attributes: {
        ...defaultSchema.attributes,
        span: [...(defaultSchema.attributes?.span ?? []), ["dataTextColor", /^(#[0-9a-f]{6}|inherit)$/i], ["dataTextFont",...FONT_CATALOG.map(f=>f.family)], ["dataTextOpacity",/^\d{1,3}$/]],
        img: [...(defaultSchema.attributes?.img ?? []), "dataInlineLogo", "dataLogoHref", "dataHeadingIcon"],
        code: [...(defaultSchema.attributes?.code ?? []), "dataMeta"],
        div: [...(defaultSchema.attributes?.div ?? []), ["dataTable", ...TABLE_STYLES], ["dataChart", ...CHART_TYPES], "dataTitle", ["dataPoll", POLL_ID], "dataCodeTabs"],
        a: [...(defaultSchema.attributes?.a ?? []), "dataCite", "dataTitle", "dataSnippet"],
        video: ["src", "poster", "controls", "muted", "loop", "autoPlay", "playsInline", "preload", "width", "height", "title", ["dataCaptions", /^(?:\/(?!\/)|https:\/\/)[^\s"<>]+\.vtt$/i]],
        audio: ["src", "controls", "preload", "title"],
        source: ["src", "type"],
      },
      protocols: { ...defaultSchema.protocols, src: ["https", "http"], poster: ["https", "http"] },
    })
    .use(rehypeEditorial, { resolvePage })
    .use(extra)
    .use(rehypeCodeLines);
  return (await pipeline.run(pipeline.parse(markdown))) as Root;
}


export type OutlineItem = { id: string; text: string; depth: 2 | 3; icon?: string };

/** The h2s and h3s, for the table of contents. */
export function outline(tree: Root): OutlineItem[] {
  const out: OutlineItem[] = [];
  const walk = (n: Root | Element) => {
    for (const k of n.children) {
      if (!isEl(k)) continue;
      if ((k.tagName === "h2" || k.tagName === "h3") && k.properties?.id) {
        // The heading's own words live in .heading-text once decorated.
        const wrapped = k.children.find((c) => isEl(c) && (c.properties?.className as string[] | undefined)?.includes("heading-text")) as Element | undefined;
        const parts = wrapped ? wrapped.children : k.children;
        const text = parts
          .filter((c) => !(isEl(c) && (c.properties?.className as string[] | undefined)?.some(c => c === "heading-anchor" || c === "heading-icon")))
          .map(textOf)
          .join("")
          .trim();
        const glyph=parts.find(c=>isEl(c)&&typeof c.properties.dataHeadingIcon==="string") as Element|undefined;
        out.push({ icon:glyph?decodeLogoLabel(String(glyph.properties.dataHeadingIcon)):undefined, id: String(k.properties.id), text, depth: k.tagName === "h2" ? 2 : 3 });
      } else walk(k);
    }
  };
  walk(tree);
  return out;
}
