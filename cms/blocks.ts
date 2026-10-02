/*
 * The Markdown forms of the editor's newer blocks, shared by the editor's
 * tokenizers (app/admin/ui/extensions/*) and the site's renderer
 * (cms/render.ts), so both read exactly one syntax. Each one is plain
 * Markdown inside a <div data-…> wrapper, so GitHub (and any other reader)
 * still shows the content: code as code, chart data and polls as a table
 * and a list.
 *
 *   code      ```ts title="app/page.tsx" showLineNumbers {2,4-5}
 *   tabs      <div data-code-tabs>  + one fence per tab, title="npm" …
 *   table     <div data-table="striped" data-header="both" data-width="wide">  + a GFM table
 *   chart     <div data-chart="bar" data-title="…">  + a GFM table
 *   poll      <div data-poll="id">  + **question** + a bullet list
 *   citation  <a href="…" data-cite="" data-title="…" data-snippet="…">Site</a>
 *
 * No DOM, no Node APIs: this runs in the browser, the build and Workers.
 */

export const TABLE_STYLES = ["default", "minimal", "striped", "bordered", "data"] as const;
export type TableStyle = (typeof TABLE_STYLES)[number];
export const isTableStyle = (v: unknown): v is TableStyle => typeof v === "string" && (TABLE_STYLES as readonly string[]).includes(v);

export const CHART_TYPES = ["bar", "line", "area", "pie", "donut"] as const;
export type ChartType = (typeof CHART_TYPES)[number];
export const isChartType = (v: unknown): v is ChartType => typeof v === "string" && (CHART_TYPES as readonly string[]).includes(v);

export const POLL_ID = /^[a-z0-9]{6,32}$/;
export const newPollId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("");

const escAttr = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescAttr = (s: string) => s.replace(/&(amp|quot|lt|gt|#39);/g, (_, n: string) => ({ amp: "&", quot: '"', lt: "<", gt: ">", "#39": "'" })[n]!);

/* ── Code fences ─────────────────────────────────────────────────────── */

export type CodeMeta = { title: string; lineNumbers: boolean; highlight: string };

/** "1, 3-5,x" → "1,3-5": only line numbers and ranges survive. */
export function normalizeRanges(value: unknown): string {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^\d{1,5}(?:-\d{1,5})?$/.test(part))
    .slice(0, 50)
    .join(",");
}

/** The set of lines a "{1,3-5}" range names. */
export function rangeLines(ranges: string): Set<number> {
  const out = new Set<number>();
  for (const part of normalizeRanges(ranges).split(",")) {
    if (!part) continue;
    const [a, b = a] = part.split("-").map(Number);
    for (let n = Math.min(a, b); n <= Math.min(Math.max(a, b), Math.min(a, b) + 2000); n++) out.add(n);
  }
  return out;
}

/** A fence's meta (everything after the language) → what the blocks use. */
export function parseCodeMeta(meta: string): CodeMeta {
  const title = /(?:^|\s)title=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta);
  const lines = /\{([\d,\s-]+)\}/.exec(meta);
  return {
    title: (title?.[1] ?? title?.[2] ?? title?.[3] ?? "").slice(0, 200),
    lineNumbers: /(?:^|\s)showLineNumbers(?:\s|$|\{)/.test(meta),
    highlight: normalizeRanges(lines?.[1] ?? ""),
  };
}

/** A fence's whole info string → language and meta. */
export function parseCodeInfo(info: string): { language: string; meta: CodeMeta } {
  const trimmed = String(info ?? "").trim();
  const space = trimmed.search(/\s/);
  const language = space === -1 ? trimmed : trimmed.slice(0, space);
  // A bare "{1,3}" or title=… with no language is still meta.
  if (/[={]/.test(language)) return { language: "", meta: parseCodeMeta(trimmed) };
  return { language, meta: parseCodeMeta(space === -1 ? "" : trimmed.slice(space)) };
}

/** Language and meta → a fence's info string, in one fixed order. */
export function codeInfo(language: string | null | undefined, meta: Partial<CodeMeta> = {}): string {
  const parts = [String(language ?? "").trim().split(/\s/)[0] ?? ""];
  const title = String(meta.title ?? "").replace(/["\n\r]/g, "'").trim();
  if (title) parts.push(`title="${title}"`);
  if (meta.lineNumbers) parts.push("showLineNumbers");
  const hl = normalizeRanges(meta.highlight);
  if (hl) parts.push(`{${hl}}`);
  return parts.join(" ").trim();
}

/** A fence long enough that the code can't close it. */
export function fence(code: string, info: string): string {
  const longest = Math.max(2, ...Array.from(code.matchAll(/`{3,}/g), (m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${info}\n${code.replace(/\n$/, "")}\n${ticks}`;
}

type Fence = { info: string; code: string; end: number };
/** Reads one fenced block starting at `lines[i]`. */
function readFence(lines: string[], i: number): Fence | null {
  const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i] ?? "");
  if (!open) return null;
  const marker = open[1];
  const body: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    const close = new RegExp(`^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}\\s*$`);
    if (close.test(lines[j])) return { info: open[2].trim(), code: body.join("\n"), end: j };
    body.push(lines[j]);
  }
  return null;
}

/* ── Code tabs ───────────────────────────────────────────────────────── */

export type CodeTab = { label: string; language: string; code: string };

export function codeTabsMarkdown(tabs: CodeTab[]): string {
  const blocks = tabs.map((t, i) => fence(t.code ?? "", codeInfo(t.language, { title: t.label || `Tab ${i + 1}` })));
  return `<div data-code-tabs>\n\n${blocks.join("\n\n")}\n\n</div>`;
}

/** `<div data-code-tabs>` … `</div>` at the start of src, or null. */
export function parseCodeTabsBlock(src: string): { raw: string; tabs: CodeTab[] } | null {
  if (!/^<div data-code-tabs(?:="")?>[ \t]*\n/.test(src)) return null;
  const lines = src.split("\n");
  const tabs: CodeTab[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (/^<\/div>\s*$/.test(line)) {
      if (!tabs.length) return null;
      const raw = lines.slice(0, i + 1).join("\n") + (i + 1 < lines.length ? "\n" : "");
      return { raw, tabs };
    }
    const f = readFence(lines, i);
    if (!f) return null;
    const { language, meta } = parseCodeInfo(f.info);
    tabs.push({ label: meta.title || `Tab ${tabs.length + 1}`, language, code: f.code });
    i = f.end;
  }
  return null;
}

/* ── GFM tables (for chart data) ─────────────────────────────────────── */

const cell = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

/** Rows (first is the header) → a GFM table; numeric columns align right. */
export function gfmTable(rows: string[][]): string {
  const width = Math.max(1, ...rows.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => cell(r[i] ?? ""));
  const [head = [], ...body] = rows;
  const numeric = Array.from({ length: width }, (_, i) => body.length > 0 && body.every((r) => isNumeric(r[i] ?? "")));
  const lines = [
    `| ${pad(head).join(" | ")} |`,
    `| ${numeric.map((n) => (n ? "--:" : "---")).join(" | ")} |`,
    ...body.map((r) => `| ${pad(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) { cur += s[i + 1]; i++; continue; }
    if (s[i] === "|") { out.push(cur.trim()); cur = ""; continue; }
    cur += s[i];
  }
  out.push(cur.trim());
  return out;
}

/** GFM table lines → rows (header first), or null if it isn't one. */
export function parseGfmTable(text: string): string[][] | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2 || !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(lines[1])) return null;
  return [splitRow(lines[0]), ...lines.slice(2).map(splitRow)];
}

export const isNumeric = (s: string) => /^[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?%?$/.test(String(s).trim().replace(/^[$€£¥₱]/, "")) && /\d/.test(s);
export const toNumber = (s: string) => Number(String(s).trim().replace(/^[$€£¥₱]/, "").replace(/[,%]/g, ""));

/* ── CSV (how the chart's data is edited) ────────────────────────────── */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  const src = String(text ?? "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
      continue;
    }
    if (c === '"' && !cur.trim()) { quoted = true; cur = ""; continue; }
    if (c === "," || c === "\t") { row.push(cur.trim()); cur = ""; continue; }
    if (c === "\n") { row.push(cur.trim()); rows.push(row); row = []; cur = ""; continue; }
    cur += c;
  }
  row.push(cur.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c !== "")).slice(0, 200).map((r) => r.slice(0, 12));
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}

/* ── Chart ───────────────────────────────────────────────────────────── */

export type ChartBlock = { type: ChartType; title: string; csv: string };
export const DEFAULT_CHART_CSV = "Month,Desktop,Mobile\nJan,186,80\nFeb,305,200\nMar,237,120\nApr,73,190\nMay,209,130\nJun,214,140";

export function chartMarkdown(c: ChartBlock): string {
  const title = c.title ? ` data-title="${escAttr(c.title)}"` : "";
  const rows = parseCsv(c.csv);
  return `<div data-chart="${isChartType(c.type) ? c.type : "bar"}"${title}>\n\n${gfmTable(rows.length ? rows : [["Label", "Value"]])}\n\n</div>`;
}

export function parseChartBlock(src: string): (ChartBlock & { raw: string }) | null {
  const m = /^<div data-chart="([a-z]+)"(?: data-title="([^"]*)")?>[ \t]*\n\s*\n([\s\S]*?)\n\s*\n?<\/div>[ \t]*(?:\n|$)/.exec(src);
  if (!m || !isChartType(m[1])) return null;
  const rows = parseGfmTable(m[3]);
  if (!rows) return null;
  return { raw: m[0], type: m[1], title: unescAttr(m[2] ?? ""), csv: toCsv(rows) };
}

/* ── Styled table wrapper ────────────────────────────────────────────── */

/*
 * A table's wrapper carries what GFM can't say:
 *
 *   <div data-table="striped" data-header="both" data-width="wide">
 *
 * data-header — which cells are headers. GFM always writes the first row
 *   as its header line, so "none" and "col" mean that line is really data.
 *   "row" (the default) is left out.
 * data-width — "fit" (the default, the text column, left out) or "wide"
 *   (breaks out of the column, centred).
 *
 * A table with the default style, a header row and the text's width needs
 * no wrapper at all: it stays plain GFM, as before.
 */
export const TABLE_HEADERS = ["row", "col", "both", "none"] as const;
export type TableHeader = (typeof TABLE_HEADERS)[number];
export const isTableHeader = (v: unknown): v is TableHeader => typeof v === "string" && (TABLE_HEADERS as readonly string[]).includes(v);

export const TABLE_WIDTHS = ["fit", "wide"] as const;
export type TableWidth = (typeof TABLE_WIDTHS)[number];
export const isTableWidth = (v: unknown): v is TableWidth => typeof v === "string" && (TABLE_WIDTHS as readonly string[]).includes(v);

export type TableOptions = { style: TableStyle; header: TableHeader; width: TableWidth };

/** Header row and column on/off → the data-header value. */
export const tableHeader = (row: boolean, col: boolean): TableHeader => (row && col ? "both" : row ? "row" : col ? "col" : "none");
export const hasHeaderRow = (h: TableHeader) => h === "row" || h === "both";
export const hasHeaderCol = (h: TableHeader) => h === "col" || h === "both";

/** The wrapper's opening tag, or "" when the table needs none. */
export function tableOpenTag(o: Partial<TableOptions>): string {
  const style = isTableStyle(o.style) ? o.style : "default";
  const header = isTableHeader(o.header) ? o.header : "row";
  const width = isTableWidth(o.width) ? o.width : "fit";
  if (style === "default" && header === "row" && width === "fit") return "";
  return `<div data-table="${style}"${header !== "row" ? ` data-header="${header}"` : ""}${width !== "fit" ? ` data-width="${width}"` : ""}>`;
}

export function parseStyledTableStart(src: string): ({ open: string } & TableOptions) | null {
  const m = /^<div data-table="([a-z]+)"((?:[ \t]+data-[a-z]+="[a-z]*")*)[ \t]*>[ \t]*\n/.exec(src);
  if (!m || !isTableStyle(m[1])) return null;
  const attr = (name: string) => new RegExp(`data-${name}="([a-z]*)"`).exec(m[2])?.[1];
  const header = attr("header");
  const width = attr("width");
  return { open: m[0], style: m[1], header: isTableHeader(header) ? header : "row", width: isTableWidth(width) ? width : "fit" };
}

/* ── Poll ────────────────────────────────────────────────────────────── */

export type PollBlock = { id: string; question: string; options: string[] };

const listText = (s: string) => String(s ?? "").replace(/\s*\n\s*/g, " ").trim();

export function pollMarkdown(p: PollBlock): string {
  const question = listText(p.question).replace(/\*/g, "\\*") || "Your answer?";
  const options = (p.options.length ? p.options : ["Option 1", "Option 2"]).map((o) => `- ${listText(o) || "Option"}`);
  return `<div data-poll="${POLL_ID.test(p.id) ? p.id : newPollId()}">\n\n**${question}**\n\n${options.join("\n")}\n\n</div>`;
}

export function parsePollBlock(src: string): (PollBlock & { raw: string }) | null {
  const m = /^<div data-poll="([a-z0-9]{6,32})">[ \t]*\n\s*\n\*\*((?:\\\*|[^*\n])+)\*\*[ \t]*\n\s*\n((?:[-*+] [^\n]*\n?)+)\s*\n?<\/div>[ \t]*(?:\n|$)/.exec(src);
  if (!m) return null;
  const options = m[3].split("\n").map((l) => l.replace(/^[-*+] /, "").trim()).filter(Boolean).slice(0, 12);
  if (options.length < 2) return null;
  return { raw: m[0], id: m[1], question: m[2].replace(/\\\*/g, "*").trim(), options };
}

/* ── Citation ────────────────────────────────────────────────────────── */

export type Citation = { href: string; title: string; site: string; snippet: string };

export function siteOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function citationMarkdown(c: Citation): string {
  const label = (c.site || siteOf(c.href) || "Source").replace(/[<>]/g, "");
  return `<a href="${escAttr(c.href)}" data-cite="" data-title="${escAttr(c.title)}" data-snippet="${escAttr(c.snippet)}">${escAttr(label)}</a>`;
}

export function parseCitation(src: string): (Citation & { raw: string }) | null {
  const m = /^<a href="([^"]*)" data-cite="" data-title="([^"]*)" data-snippet="([^"]*)">([^<]*)<\/a>/.exec(src);
  if (!m) return null;
  return { raw: m[0], href: unescAttr(m[1]), title: unescAttr(m[2]), snippet: unescAttr(m[3]), site: unescAttr(m[4]) };
}
