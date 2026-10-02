import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { MarkdownManager } from "@tiptap/markdown";
import { getSchema } from "@tiptap/core";
import {
  ChartBase, CitationBase, CodeBlockPlus, CodeTabsBase, PollBase, TableCellColors, TableStyleMarkdown, TableStyled,
} from "../app/admin/ui/extensions/blocks-schema.ts";
import { MediaCaptionsSchema } from "../app/admin/ui/extensions/media-schema.ts";
import { markdownToTree } from "../cms/render.ts";
import { parseCsv, toCsv, parseCodeInfo, codeInfo, isNumeric, tableColorAt, tableColorList } from "../cms/blocks.ts";
import { cleanEditorDocument } from "../cms/editor-document.ts";

const EXTENSIONS = [StarterKit.configure({ codeBlock: false }), CodeBlockPlus, CodeTabsBase, ChartBase, PollBase, CitationBase, TableStyled, TableRow, TableHeader, TableCell, TableStyleMarkdown, TableCellColors, MediaCaptionsSchema];
const manager = new MarkdownManager({ extensions: EXTENSIONS });
const all = (tree) => (tree.children ?? []).flatMap((n) => [n, ...all(n)]);
const find = (tree, tag) => all(tree).find((n) => n.tagName === tag);
const roundTrip = (md) => {
  const doc = manager.parse(md);
  const again = manager.serialize(doc);
  assert.deepEqual(manager.parse(again), doc, "parse(serialize(doc)) is stable");
  return { doc, md: again };
};

test("code blocks keep filename, line numbers and highlighted lines", async () => {
  const { doc, md } = roundTrip('```ts title="app/page.tsx" showLineNumbers {2,4-5}\nconst a = 1;\nconst b = 2;\n```');
  const block = doc.content[0];
  assert.equal(block.type, "codeBlock");
  assert.deepEqual([block.attrs.language, block.attrs.title, block.attrs.lineNumbers, block.attrs.highlight], ["ts", "app/page.tsx", true, "2,4-5"]);
  assert.match(md, /^```ts title="app\/page.tsx" showLineNumbers \{2,4-5\}\n/);
  const tree = await markdownToTree(md);
  const frame = find(tree, "x-code");
  assert.equal(frame.properties.dataTitle, "app/page.tsx");
  assert.equal(frame.properties.dataLanguage, "ts");
  assert.equal(frame.properties.dataLineNumbers, "");
  const lines = all(frame).filter((n) => n.properties?.dataLine !== undefined);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].properties.dataHighlightedLine, "");
  assert.equal(find(tree, "code").properties.dataMeta, undefined, "the transport property never reaches the page");
});

test("a fence holding ``` gets a longer fence", () => {
  const doc = { type: "doc", content: [{ type: "codeBlock", attrs: { language: "md" }, content: [{ type: "text", text: "```js\nx\n```" }] }] };
  const md = manager.serialize(doc);
  assert.match(md, /^````md\n/);
  assert.equal(manager.parse(md).content[0].content[0].text, "```js\nx\n```");
  assert.deepEqual(parseCodeInfo(codeInfo("ts", { title: 'a"b', highlight: "1, x, 3-4" })).meta, { title: "a'b", lineNumbers: false, highlight: "1,3-4" });
});

test("code tabs round-trip and render as tabs of code frames", async () => {
  const tabs = [{ label: "npm", language: "bash", code: "npm i motion" }, { label: "pnpm", language: "bash", code: "pnpm add motion" }];
  const md = manager.serialize({ type: "doc", content: [{ type: "codeTabs", attrs: { tabs } }] });
  const { doc } = roundTrip(md);
  assert.deepEqual(doc.content[0].attrs.tabs, tabs);
  const tree = await markdownToTree(md);
  const el = find(tree, "x-code-tabs");
  assert.deepEqual(JSON.parse(el.properties.dataTabs).map((t) => t.label), ["npm", "pnpm"]);
  assert.equal(el.children.filter((n) => n.tagName === "x-code").length, 2);
});

test("table styles and column alignment survive Markdown and sanitizing", async () => {
  for (const style of ["minimal", "striped", "bordered", "data"]) {
    const md = `<div data-table="${style}">\n\n| Name | Count |\n| :--- | ----: |\n| A | 1 |\n| B | 22 |\n\n</div>`;
    const { doc, md: again } = roundTrip(md);
    assert.equal(doc.content[0].type, "table");
    assert.equal(doc.content[0].attrs.tableStyle, style);
    assert.equal(doc.content[0].content[0].content[1].attrs.align, "right");
    const tree = await markdownToTree(again);
    if (style === "data") assert.equal(find(tree, "x-data-table").properties.dataTableStyle, "data");
    else assert.equal(all(tree).find((n) => n.properties?.dataTableStyle)?.properties.dataTableStyle, style);
    assert.equal(find(tree, "th").properties.align, "left");
  }
  const plain = manager.serialize(manager.parse("| a | b |\n| --- | --- |\n| 1 | 2 |"));
  assert.doesNotMatch(plain, /data-table/);
  const evil = await markdownToTree('<div data-table="evil">\n\n| a |\n| --- |\n| 1 |\n\n</div>');
  assert.equal(all(evil).some((n) => n.properties?.dataTable || n.properties?.dataTableStyle), false);
});

test("header row and column, and the table's width, survive Markdown and render with scopes", async () => {
  const cellTypes = (table) => table.content.map((r) => r.content.map((c) => (c.type === "tableHeader" ? "H" : "c")).join(""));
  const md = (open) => `${open}\n\n| Plan | Seats | Price |\n| --- | --- | --: |\n| Free | 1 | $0 |\n| Team | 10 | $99 |\n\n</div>`;

  // Both: the first row and the first column are headers.
  const both = roundTrip(md('<div data-table="striped" data-header="both" data-width="wide">'));
  const t = both.doc.content[0];
  assert.deepEqual([t.attrs.tableStyle, t.attrs.tableWidth], ["striped", "wide"]);
  assert.deepEqual(cellTypes(t), ["HHH", "Hcc", "Hcc"]);
  assert.match(both.md, /^<div data-table="striped" data-header="both" data-width="wide">\n/);
  let tree = await markdownToTree(both.md);
  const frame = all(tree).find((n) => n.properties?.className?.includes?.("table-wrap"));
  assert.equal(frame.properties.dataTableWidth, "wide");
  assert.ok(find(frame, "div").properties.className.includes("table-scroll"), "the table scrolls inside its frame");
  const ths = all(tree).filter((n) => n.tagName === "th");
  assert.deepEqual(ths.map((n) => n.properties.scope), ["col", "col", "col", "row", "row"]);

  // Column only: the GFM header line is ordinary data on the page.
  const col = roundTrip(md('<div data-table="default" data-header="col">'));
  assert.deepEqual(cellTypes(col.doc.content[0]), ["Hcc", "Hcc", "Hcc"]);
  assert.match(col.md, /^<div data-table="default" data-header="col">\n/);
  tree = await markdownToTree(col.md);
  assert.equal(find(tree, "thead"), undefined);
  assert.equal(find(tree, "tbody").children.filter((n) => n.tagName === "tr").length, 3);
  assert.deepEqual(all(tree).filter((n) => n.tagName === "th").map((n) => n.properties.scope), ["row", "row", "row"]);

  // Neither: no header cells at all, and no empty header line is invented.
  const none = roundTrip(md('<div data-table="minimal" data-header="none">'));
  assert.deepEqual(cellTypes(none.doc.content[0]), ["ccc", "ccc", "ccc"]);
  assert.match(none.md, /\| Plan +\| Seats +\| Price +\|/);
  tree = await markdownToTree(none.md);
  assert.equal(find(tree, "th"), undefined);

  // Width alone puts a default table in a wrapper; the defaults need none.
  const wide = roundTrip("<div data-table=\"default\" data-width=\"wide\">\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n</div>");
  assert.equal(wide.doc.content[0].attrs.tableWidth, "wide");
  assert.match(wide.md, /^<div data-table="default" data-width="wide">\n/);
  const plain = roundTrip("| a | b |\n| --- | --- |\n| 1 | 2 |");
  assert.equal(plain.doc.content[0].attrs?.tableWidth ?? "fit", "fit");
  assert.doesNotMatch(plain.md, /<div/);
  tree = await markdownToTree(plain.md);
  assert.deepEqual(all(tree).filter((n) => n.tagName === "th").map((n) => n.properties.scope), ["col", "col"]);

  // A data table always keeps its header row (it sorts by it).
  tree = await markdownToTree(md('<div data-table="data" data-header="col" data-width="wide">'));
  const data = find(tree, "x-data-table");
  assert.equal(data.properties.dataTableWidth, "wide");
  assert.ok(find(data, "thead"));
  assert.equal(find(find(data, "tbody"), "th").properties.scope, "row");

  // Unknown values fall back to the defaults and never reach the page.
  tree = await markdownToTree('<div data-table="bordered" data-header="sideways" data-width="huge">\n\n| a |\n| --- |\n| 1 |\n\n</div>');
  assert.equal(all(tree).some((n) => n.properties?.dataTableWidth || n.properties?.dataHeader || n.properties?.dataWidth), false);
  assert.equal(find(tree, "th").properties.scope, "col");
  const odd = manager.parse('<div data-table="bordered" data-header="sideways">\n\n| a |\n| --- |\n| 1 |\n\n</div>');
  assert.deepEqual(cellTypes(odd.content[0]), ["H", "c"]);
});

test("cell colours survive Markdown, the editor's HTML and the page's sanitizer", async () => {
  const colors = (table, attr) => table.content.map((r) => r.content.map((c) => c.attrs?.[attr] ?? null));
  const src = { type: "doc", content: [{ type: "table", attrs: { tableStyle: "striped" }, content: [
    ["blue", "blue", "blue"], [null, "red", "gray"], [null, "red", null], [null, "red", "green"],
  ].map((row, r) => ({ type: "tableRow", content: row.map((background, c) => ({
    type: r === 0 ? "tableHeader" : "tableCell",
    attrs: { background, textColor: r === 2 && c === 0 ? "purple" : null },
    content: [{ type: "paragraph", content: [{ type: "text", text: `${r}.${c}` }] }],
  })) })) }] };

  // The editor's table → Markdown: a whole row, a whole column and single cells, compactly.
  const md = manager.serialize(src);
  assert.match(md, /^<div data-table="striped" data-bg="r0:blue,c1:red,r1c2:gray,r3c2:green" data-fg="r2c0:purple">\n/);
  const { doc } = roundTrip(md);
  assert.deepEqual(colors(doc.content[0], "background"), colors(src.content[0], "background"));
  assert.deepEqual(colors(doc.content[0], "textColor"), colors(src.content[0], "textColor"));

  // Colours alone put a default table in a wrapper; none leave it plain GFM.
  const plain = { ...src.content[0], attrs: {} };
  const alone = manager.serialize({ type: "doc", content: [{ ...plain, content: [plain.content[0], ...plain.content.slice(1).map((r) => ({ ...r, content: r.content.map((c) => ({ ...c, attrs: {} })) }))] }] });
  assert.match(alone, /^<div data-table="default" data-bg="r0:blue">\n/);
  assert.doesNotMatch(manager.serialize(manager.parse("| a | b |\n| --- | --- |\n| 1 | 2 |")), /data-bg|<div/);

  // The page: each cell carries its own colour, header row included.
  const tree = await markdownToTree(md);
  const cells = all(tree).filter((n) => n.tagName === "th" || n.tagName === "td");
  assert.deepEqual(cells.map((n) => n.properties.dataBg ?? null), ["blue", "blue", "blue", null, "red", "gray", null, "red", null, null, "red", "green"]);
  assert.equal(cells[6].properties.dataFg, "purple");
  assert.equal(all(tree).some((n) => n.properties?.dataBg !== undefined && n.tagName === "div"), false, "the list stays off the frame");
  const data = await markdownToTree('<div data-table="data" data-bg="c0:yellow">\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n</div>');
  assert.deepEqual(all(find(data, "x-data-table")).filter((n) => n.tagName === "th" || n.tagName === "td").map((n) => n.properties.dataBg ?? null), ["yellow", null, "yellow", null]);

  // Unknown colours and anything else in the list never reach the page or the editor.
  const evil = '<div data-table="default" data-bg="r0:blue;x:url(javascript:1)">\n\n| a |\n| --- |\n| 1 |\n\n</div>';
  assert.equal(all(await markdownToTree(evil)).some((n) => n.properties?.dataBg), false);
  assert.equal(tableColorAt("r0:teal,r1:blue")(0, 0), null);
  assert.equal(tableColorAt("r0:teal,r1:blue")(1, 3), "blue");
  assert.equal(tableColorList([[null, "chartreuse"]]), "");

  // The editor's HTML (its clipboard): data-bg and data-fg on the cell itself.
  const cellType = getSchema(EXTENSIONS).nodes.tableCell;
  const [, attrs] = cellType.spec.toDOM(cellType.create({ background: "pink", textColor: "brown" }, cellType.schema.nodes.paragraph.create()));
  assert.equal(attrs["data-bg"], "pink");
  assert.equal(attrs["data-fg"], "brown");
  const el = (a) => ({ getAttribute: (k) => a[k] ?? null, hasAttribute: (k) => k in a, style: {}, children: [], childNodes: [], textContent: "x", closest: () => null, parentElement: null });
  const parsed = cellType.spec.parseDOM.map((r) => r.getAttrs?.(el({ "data-bg": "orange", "data-fg": "nope" }))).find(Boolean);
  assert.equal(parsed.background, "orange");
  assert.equal(parsed.textColor ?? null, null, "an unknown colour falls back to none");
});

test("charts keep type, title and data, and render with a data table fallback", async () => {
  const csv = "Month,Desktop,Mobile\nJan,186,80\n\"Feb, late\",305,200";
  const md = manager.serialize({ type: "doc", content: [{ type: "chart", attrs: { chartType: "area", title: 'Visits "weekly"', data: csv } }] });
  assert.match(md, /^<div data-chart="area" data-title="Visits &quot;weekly&quot;">/);
  const { doc } = roundTrip(md);
  assert.deepEqual(doc.content[0].attrs, { chartType: "area", title: 'Visits "weekly"', data: csv });
  const tree = await markdownToTree(md);
  const chart = find(tree, "x-chart");
  assert.equal(chart.properties.dataChart, "area");
  assert.equal(chart.properties.dataTitle, 'Visits "weekly"');
  assert.deepEqual(JSON.parse(chart.properties.dataChartData), parseCsv(csv));
  assert.ok(find(chart, "table"), "the data stays readable as a table");
  assert.deepEqual(parseCsv(toCsv([["a,b", 'c"d']])), [["a,b", 'c"d']]);
  assert.equal(isNumeric("1,234.5"), true);
  assert.equal(isNumeric("Jan"), false);
});

test("polls keep id, question and options", async () => {
  const node = { type: "poll", attrs: { pollId: "abc123def4", question: "Tabs *or* spaces?", options: ["Tabs", "Spaces", "Both"] } };
  const md = manager.serialize({ type: "doc", content: [node] });
  const { doc } = roundTrip(md);
  assert.deepEqual(doc.content[0].attrs, node.attrs);
  const poll = find(await markdownToTree(md), "x-poll");
  assert.equal(poll.properties.dataPoll, "abc123def4");
  assert.equal(poll.properties.dataQuestion, "Tabs *or* spaces?");
  assert.deepEqual(JSON.parse(poll.properties.dataOptions), ["Tabs", "Spaces", "Both"]);
  const bad = await markdownToTree('<div data-poll="../../x">\n\n**Q**\n\n- a\n- b\n\n</div>');
  assert.equal(find(bad, "x-poll"), undefined);
});

test("citations round-trip, number in order and list their sources", async () => {
  const cite = (href, title, site) => ({ type: "citation", attrs: { href, title, site, snippet: `About ${site} & <more>` } });
  const doc = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "Ash fell" }, cite("https://en.wikipedia.org/wiki/Montserrat", "Montserrat", "Wikipedia"),
    { type: "text", text: " and again" }, cite("https://www.bbc.com/news", "BBC News", "BBC"),
    cite("https://en.wikipedia.org/wiki/Montserrat", "Montserrat", "Wikipedia"),
  ] }] };
  const md = manager.serialize(doc);
  const { doc: parsed } = roundTrip(md);
  assert.deepEqual(parsed.content[0].content[1].attrs, doc.content[0].content[1].attrs);
  const tree = await markdownToTree(md);
  const pills = all(tree).filter((n) => n.tagName === "x-cite");
  assert.deepEqual(pills.map((p) => p.properties.dataIndex), ["1", "2", "1"]);
  assert.equal(pills[0].properties.dataSnippet, "About Wikipedia & <more>");
  const sources = all(tree).find((n) => n.properties?.className?.includes?.("article-sources"));
  assert.equal(all(sources).filter((n) => n.tagName === "li").length, 2);
  const unsafe = await markdownToTree('<a href="javascript:alert(1)" data-cite="" data-title="x" data-snippet="y">x</a>');
  assert.equal(find(unsafe, "x-cite"), undefined);
});

test("video captions are kept only when they are a .vtt file", async () => {
  const md = '<video src="/media/2026/abcdefghij-1280x720.mp4" controls playsinline preload="metadata" data-captions="/media/2026/subs.vtt"></video>';
  const { doc, md: again } = roundTrip(md);
  assert.equal(doc.content[0].attrs.captions, "/media/2026/subs.vtt");
  assert.equal(find(await markdownToTree(again), "video").properties.dataCaptions, "/media/2026/subs.vtt");
  const bad = await markdownToTree('<video src="/a.mp4" controls data-captions="javascript:alert(1)//.vtt"></video>');
  assert.equal(find(bad, "video").properties.dataCaptions, undefined);
});

test("the private editor document accepts the new blocks", () => {
  const markdown = "x";
  const doc = { type: "doc", content: [
    { type: "codeTabs", attrs: { tabs: [] } }, { type: "chart", attrs: {} }, { type: "poll", attrs: {} },
    { type: "paragraph", content: [{ type: "citation", attrs: { href: "https://a.b" } }] },
  ] };
  assert.ok(cleanEditorDocument({ version: 1, markdown, doc }, markdown));
});
