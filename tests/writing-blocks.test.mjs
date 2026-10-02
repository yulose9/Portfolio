import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { MarkdownManager } from "@tiptap/markdown";
import {
  ChartBase, CitationBase, CodeBlockPlus, CodeTabsBase, PollBase, TableStyleMarkdown, TableStyled,
} from "../app/admin/ui/extensions/blocks-schema.ts";
import { MediaCaptionsSchema } from "../app/admin/ui/extensions/media-schema.ts";
import { markdownToTree } from "../cms/render.ts";
import { parseCsv, toCsv, parseCodeInfo, codeInfo, isNumeric } from "../cms/blocks.ts";
import { cleanEditorDocument } from "../cms/editor-document.ts";

const manager = new MarkdownManager({
  extensions: [StarterKit.configure({ codeBlock: false }), CodeBlockPlus, CodeTabsBase, ChartBase, PollBase, CitationBase, TableStyled, TableRow, TableHeader, TableCell, TableStyleMarkdown, MediaCaptionsSchema],
});
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
