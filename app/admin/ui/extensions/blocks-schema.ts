import {
  Extension,
  Node,
  type JSONContent,
  type MarkdownLexerConfiguration,
  type MarkdownParseHelpers,
  type MarkdownRendererHelpers,
  type MarkdownToken,
} from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import { Table } from "@tiptap/extension-table";

import {
  chartMarkdown,
  citationMarkdown,
  codeInfo,
  codeTabsMarkdown,
  DEFAULT_CHART_CSV,
  fence,
  isChartType,
  hasHeaderCol,
  hasHeaderRow,
  isTableColor,
  isTableStyle,
  isTableWidth,
  normalizeRanges,
  parseChartBlock,
  parseCitation,
  parseCodeInfo,
  parseCodeTabsBlock,
  parsePollBlock,
  parseStyledTableStart,
  pollMarkdown,
  siteOf,
  tableColorAt,
  tableColorList,
  tableHeader,
  tableOpenTag,
  type CodeTab,
  type TableHeader,
} from "../../../../cms/blocks";
import { safeInlineUrl } from "../../../../cms/inline";

/*
 * The schema and Markdown of the newer blocks, kept free of React so the
 * tests can load them; each block's editing view is attached in its own
 * .tsx file. The syntax itself lives in cms/blocks.ts, shared with the site.
 */

type Lexer = MarkdownLexerConfiguration & {
  blockTokens: (src: string) => MarkdownToken[];
  inlineTokens: (src: string) => MarkdownToken[];
};

const json = <T,>(value: string | null, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

/* ── Code block: filename, line numbers, highlighted lines ───────────── */

export const CodeBlockPlus = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") ?? "",
        renderHTML: (attrs) => (attrs.title ? { "data-title": attrs.title } : {}),
      },
      lineNumbers: {
        default: false,
        parseHTML: (el) => el.hasAttribute("data-line-numbers"),
        renderHTML: (attrs) => (attrs.lineNumbers ? { "data-line-numbers": "" } : {}),
      },
      highlight: {
        default: "",
        parseHTML: (el) => normalizeRanges(el.getAttribute("data-highlight")),
        renderHTML: (attrs) => (attrs.highlight ? { "data-highlight": attrs.highlight } : {}),
      },
    };
  },
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => {
    if (token.raw?.startsWith("```") === false && token.raw?.startsWith("~~~") === false && token.codeBlockStyle !== "indented") return [];
    const { language, meta } = parseCodeInfo(String(token.lang ?? ""));
    return helpers.createNode(
      "codeBlock",
      { language: language || null, title: meta.title, lineNumbers: meta.lineNumbers, highlight: meta.highlight },
      token.text ? [helpers.createTextNode(token.text)] : []
    );
  },
  renderMarkdown: (node: JSONContent) => {
    const code = (node.content ?? []).map((c) => c.text ?? "").join("");
    return fence(code, codeInfo(node.attrs?.language as string, {
      title: node.attrs?.title as string,
      lineNumbers: Boolean(node.attrs?.lineNumbers),
      highlight: node.attrs?.highlight as string,
    }));
  },
});

/* ── Code tabs ───────────────────────────────────────────────────────── */

export const DEFAULT_TABS: CodeTab[] = [
  { label: "npm", language: "bash", code: "npm install motion" },
  { label: "pnpm", language: "bash", code: "pnpm add motion" },
  { label: "yarn", language: "bash", code: "yarn add motion" },
  { label: "bun", language: "bash", code: "bun add motion" },
];

export const CodeTabsBase = Node.create({
  name: "codeTabs",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { tabs: { default: DEFAULT_TABS, parseHTML: (el) => json(el.getAttribute("data-tabs"), DEFAULT_TABS), renderHTML: (a) => ({ "data-tabs": JSON.stringify(a.tabs) }) } };
  },
  parseHTML: () => [{ tag: "div[data-code-tabs]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", { ...HTMLAttributes, "data-code-tabs": "" }],
  markdownTokenizer: {
    name: "codeTabs",
    level: "block",
    start: (src: string) => src.indexOf("<div data-code-tabs"),
    tokenize: (src: string) => {
      const block = parseCodeTabsBlock(src);
      return block ? { type: "codeTabs", raw: block.raw, tabs: block.tabs } : undefined;
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({ type: "codeTabs", attrs: { tabs: token.tabs } }),
  renderMarkdown: (node: JSONContent) => codeTabsMarkdown((node.attrs?.tabs as CodeTab[]) ?? DEFAULT_TABS),
});

/* ── Chart ───────────────────────────────────────────────────────────── */

export const ChartBase = Node.create({
  name: "chart",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      chartType: { default: "bar", parseHTML: (el) => (isChartType(el.getAttribute("data-chart")) ? el.getAttribute("data-chart") : "bar"), renderHTML: (a) => ({ "data-chart": a.chartType }) },
      title: { default: "", parseHTML: (el) => el.getAttribute("data-title") ?? "", renderHTML: (a) => ({ "data-title": a.title }) },
      data: { default: DEFAULT_CHART_CSV, parseHTML: (el) => el.getAttribute("data-csv") ?? DEFAULT_CHART_CSV, renderHTML: (a) => ({ "data-csv": a.data }) },
    };
  },
  parseHTML: () => [{ tag: "div[data-chart][data-csv]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes],
  markdownTokenizer: {
    name: "chart",
    level: "block",
    start: (src: string) => src.indexOf("<div data-chart="),
    tokenize: (src: string) => {
      const block = parseChartBlock(src);
      return block ? { type: "chart", raw: block.raw, chartType: block.type, title: block.title, csv: block.csv } : undefined;
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({ type: "chart", attrs: { chartType: token.chartType, title: token.title ?? "", data: token.csv } }),
  renderMarkdown: (node: JSONContent) =>
    chartMarkdown({ type: node.attrs?.chartType ?? "bar", title: String(node.attrs?.title ?? ""), csv: String(node.attrs?.data ?? "") }),
});

/* ── Poll ────────────────────────────────────────────────────────────── */

export const PollBase = Node.create({
  name: "poll",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      pollId: { default: "", parseHTML: (el) => el.getAttribute("data-poll") ?? "", renderHTML: (a) => ({ "data-poll": a.pollId }) },
      question: { default: "", parseHTML: (el) => el.getAttribute("data-question") ?? "", renderHTML: (a) => ({ "data-question": a.question }) },
      options: { default: ["", ""], parseHTML: (el) => json(el.getAttribute("data-options"), ["", ""]), renderHTML: (a) => ({ "data-options": JSON.stringify(a.options) }) },
    };
  },
  parseHTML: () => [{ tag: "div[data-poll][data-options]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes],
  markdownTokenizer: {
    name: "poll",
    level: "block",
    start: (src: string) => src.indexOf("<div data-poll="),
    tokenize: (src: string) => {
      const block = parsePollBlock(src);
      return block ? { type: "poll", raw: block.raw, pollId: block.id, question: block.question, options: block.options } : undefined;
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({ type: "poll", attrs: { pollId: token.pollId, question: token.question, options: token.options } }),
  renderMarkdown: (node: JSONContent) =>
    pollMarkdown({
      id: String(node.attrs?.pollId ?? ""),
      question: String(node.attrs?.question ?? ""),
      options: ((node.attrs?.options as string[]) ?? []).map(String).filter((o) => o.trim()),
    }),
});

/* ── Citation (inline) ───────────────────────────────────────────────── */

export const CitationBase = Node.create({
  name: "citation",
  priority: 1100,
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  marks: "",
  addAttributes() {
    return {
      href: { default: "" },
      title: { default: "" },
      site: { default: "" },
      snippet: { default: "" },
    };
  },
  parseHTML: () => [{
    tag: "a[data-cite]",
    getAttrs: (el) => ({
      href: safeInlineUrl(el.getAttribute("href")),
      title: el.getAttribute("data-title") ?? "",
      snippet: el.getAttribute("data-snippet") ?? "",
      site: el.textContent?.trim() ?? "",
    }),
  }],
  renderHTML: ({ node }) => [
    "a",
    { href: safeInlineUrl(node.attrs.href), "data-cite": "", "data-title": node.attrs.title, "data-snippet": node.attrs.snippet },
    node.attrs.site || siteOf(node.attrs.href) || "Source",
  ],
  markdownTokenizer: {
    name: "citation",
    level: "inline",
    start: (src: string) => src.search(/<a href="[^"]*" data-cite=""/),
    tokenize: (src: string) => {
      const c = parseCitation(src);
      return c ? { type: "citation", raw: c.raw, href: safeInlineUrl(c.href), title: c.title, site: c.site, snippet: c.snippet } : undefined;
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({ type: "citation", attrs: { href: token.href, title: token.title, site: token.site, snippet: token.snippet } }),
  renderMarkdown: (node: JSONContent) =>
    citationMarkdown({
      href: safeInlineUrl(node.attrs?.href),
      title: String(node.attrs?.title ?? ""),
      site: String(node.attrs?.site ?? ""),
      snippet: String(node.attrs?.snippet ?? ""),
    }),
});

/* ── Table: style, headers and width, kept in a <div data-table> around the GFM table ─── */

type RenderTable = (node: JSONContent, h: MarkdownRendererHelpers) => string;
const renderPlainTable = Table.config.renderMarkdown as unknown as RenderTable;

const isHead = (c: JSONContent | undefined) => c?.type === "tableHeader";

/** Which of a table's cells are headers: its first row, its first column, both or neither. */
export function headerOf(table: JSONContent): TableHeader {
  const rows = table.content ?? [];
  const first = rows[0]?.content ?? [];
  const row = first.length > 0 && first.every(isHead);
  // A one-row table whose row is all headers has a header row, not a column.
  const col = rows.length > 0 && rows.every((r) => isHead(r.content?.[0])) && !(row && rows.length === 1);
  return tableHeader(row, col);
}

/** Makes the cells headers or not to match `header` (in place). */
export function setHeaders(table: JSONContent, header: TableHeader) {
  (table.content ?? []).forEach((r, ri) =>
    (r.content ?? []).forEach((c, ci) => {
      if (c.type !== "tableCell" && c.type !== "tableHeader") return;
      c.type = (ri === 0 && hasHeaderRow(header)) || (ci === 0 && hasHeaderCol(header)) ? "tableHeader" : "tableCell";
    }),
  );
}

export const TableStyled = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableStyle: {
        default: "default",
        parseHTML: (el) => {
          const value = el.closest("[data-table-style]")?.getAttribute("data-table-style") ?? el.getAttribute("data-table-style");
          return isTableStyle(value) ? value : "default";
        },
        renderHTML: (a) => (a.tableStyle && a.tableStyle !== "default" ? { "data-table-style": a.tableStyle } : {}),
      },
      tableWidth: {
        default: "fit",
        parseHTML: (el) => {
          const value = el.closest("[data-table-width]")?.getAttribute("data-table-width") ?? el.getAttribute("data-table-width");
          return isTableWidth(value) ? value : "fit";
        },
        renderHTML: (a) => (a.tableWidth && a.tableWidth !== "fit" ? { "data-table-width": a.tableWidth } : {}),
      },
    };
  },
  renderMarkdown: (node: JSONContent, h: MarkdownRendererHelpers) => {
    const header = headerOf(node);
    // GFM always reads its first line as the header, so the first row is
    // written there whatever it is; data-header says what it really is.
    const rows = node.content ?? [];
    const asGfm = hasHeaderRow(header) || !rows.length
      ? node
      : { ...node, content: [{ ...rows[0], content: (rows[0].content ?? []).map((c) => ({ ...c, type: "tableHeader" })) }, ...rows.slice(1)] };
    const table = renderPlainTable(asGfm, h);
    const colors = (attr: string) => tableColorList(rows.map((r) => (r.content ?? []).map((c) => c.attrs?.[attr] as string | null | undefined)));
    const open = tableOpenTag({ style: node.attrs?.tableStyle, header, width: node.attrs?.tableWidth, bg: colors("background"), fg: colors("textColor") });
    return open ? `${open}\n\n${table.trim()}\n\n</div>` : table;
  },
});

/** Reads the <div data-table="…"> wrapper; the table inside is Tiptap's own. */
export const TableStyleMarkdown = Extension.create({
  name: "styledTable",
  markdownTokenName: "styledTable",
  markdownTokenizer: {
    name: "styledTable",
    level: "block",
    start: (src: string) => src.indexOf('<div data-table="'),
    tokenize: (src: string, _tokens: MarkdownToken[], config: MarkdownLexerConfiguration) => {
      const open = parseStyledTableStart(src);
      if (!open) return undefined;
      const rest = src.slice(open.open.length);
      const close = /\n[ \t]*<\/div>[ \t]*(?:\n|$)/.exec(rest);
      if (!close) return undefined;
      const inner = rest.slice(0, close.index).trim();
      const tokens = (config as Lexer).blockTokens(inner);
      if (tokens.filter((t) => t.type !== "space").length !== 1 || !tokens.some((t) => t.type === "table")) return undefined;
      return {
        type: "styledTable",
        raw: open.open + rest.slice(0, close.index + close[0].length),
        style: open.style,
        header: open.header,
        width: open.width,
        bg: open.bg,
        fg: open.fg,
        tokens,
      };
    },
  },
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => {
    const nodes = helpers.parseChildren(token.tokens ?? []);
    const bg = tableColorAt(token.bg);
    const fg = tableColorAt(token.fg);
    for (const n of nodes) {
      if (n.type !== "table") continue;
      n.attrs = { ...(n.attrs ?? {}), tableStyle: token.style, tableWidth: token.width };
      setHeaders(n, token.header);
      (n.content ?? []).forEach((r, ri) =>
        (r.content ?? []).forEach((c, ci) => {
          const background = bg(ri, ci);
          const textColor = fg(ri, ci);
          if (background || textColor) c.attrs = { ...(c.attrs ?? {}), ...(background ? { background } : {}), ...(textColor ? { textColor } : {}) };
        }),
      );
    }
    return nodes;
  },
});

/*
 * A cell's colours: a background and a text colour from Notion's light
 * palette (TABLE_COLORS), set from the row and column handles' menu
 * (table-handles.tsx). In HTML each cell carries its own (data-bg,
 * data-fg); in Markdown the table's wrapper lists them (cms/blocks.ts).
 */
const cellColor = (dataAttr: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => {
    const value = el.getAttribute(dataAttr);
    return isTableColor(value) ? value : null;
  },
  renderHTML: (attrs: Record<string, unknown>) => {
    const value = attrs[dataAttr === "data-bg" ? "background" : "textColor"];
    return isTableColor(value) ? { [dataAttr]: value } : {};
  },
});

export const TableCellColors = Extension.create({
  name: "tableCellColors",
  addGlobalAttributes() {
    return [{ types: ["tableCell", "tableHeader"], attributes: { background: cellColor("data-bg"), textColor: cellColor("data-fg") } }];
  },
});
