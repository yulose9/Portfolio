import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import UniqueID from "@tiptap/extension-unique-id";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import { ResizableImage } from "../app/admin/ui/extensions/resizable-image.ts";
import { serializePost } from "../cms/format.ts";
import {
  DOCUMENT_IMPORT_MAX_BYTES, DOCUMENT_IMPORT_EVENT, prepareDocumentImport, readDocumentImportFile,
  splitImportFrontmatter, insertDocumentImport, pasteDocumentText,
} from "../app/admin/ui/document-import.ts";

const extensions = [StarterKit, TableKit, TaskList, TaskItem.configure({ nested: true }), ResizableImage,
  UniqueID.configure({ attributeName: "blockId", types: ["paragraph", "heading"] })];
const schema = getSchema(extensions);
const manager = new MarkdownManager({ extensions });
const prepare = (text, format = "auto") => prepareDocumentImport(text, format, source => manager.parse(source));
const paragraph = text => ({ type: "paragraph", content: [{ type: "text", text }] });
const inlineText = node => node.text ?? node.content?.map(inlineText).join("") ?? "";
const textOf = nodes => nodes.map(inlineText).join(" ");
const nodesOf = nodes => nodes.flatMap(n => [n, ...nodesOf(n.content ?? [])]);
const envelope = content => JSON.stringify({ version: 1, content, openStart: 0, openEnd: 0 });
const file = (name, source) => {
  const bytes = new TextEncoder().encode(source);
  return { name, size: bytes.length, arrayBuffer: async () => bytes.buffer };
};

test("Markdown headings, lists, tasks, tables, quotes, code and standalone thematic breaks survive", () => {
  const source = "## Heading\n\n**bold** and *italic* and `code`\n\n- One\n- Two\n\n1. First\n2. Second\n\n- [x] Done\n- [ ] Todo\n\n> Quote\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nconst html = '<img onerror=bad>';\n```\n\n---";
  const result = prepare(source);
  const nodes = nodesOf(result.content);
  for (const type of ["heading", "bulletList", "orderedList", "taskList", "blockquote", "table", "codeBlock", "horizontalRule"])
    assert.ok(nodes.some(n => n.type === type), type);
  for (const type of ["bold", "italic", "code"]) assert.ok(nodes.some(n => n.marks?.some(m => m.type === type)), type);
  assert.equal(nodes.find(n => n.type === "codeBlock").content[0].text, "const html = '<img onerror=bad>';");
  assert.equal(prepare("---").content[0].type, "horizontalRule");
  schema.nodeFromJSON({ type: "doc", content: result.content }).check();
});

test("plain text and .txt imports never treat HTML or Markdown as markup", () => {
  const source = '<img src="https://example.com/pixel" onerror="alert(1)">';
  assert.deepEqual(prepare(source).content, [paragraph(source)]);
  const literal = prepare("## Literal\n\n<script>alert(1)</script>", "text");
  assert.equal(literal.content.length, 2);
  assert.equal(literal.content[0].type, "paragraph");
  assert.equal(textOf(literal.content), "## Literal <script>alert(1)</script>");
});

test("Markdown raw HTML stays literal while actual code and safe autolinks retain semantics", () => {
  const source = '## Heading\n\n<b>bold &amp; text</b>\n\n<img src="https://example.com/pixel" onerror="bad()">\n\n<script>alert(1)</script>\n\n`<em>code</em>`\n\n<https://example.com>\n\n![Photo](https://example.com/photo.png)';
  const result = prepare(source, "markdown");
  const all = nodesOf(result.content);
  assert.equal(all.filter(n => n.type === "image").length, 1);
  assert.ok(textOf(result.content).includes('<img src="https://example.com/pixel" onerror="bad()">'));
  assert.ok(textOf(result.content).includes("<b>bold & text</b>"));
  assert.ok(textOf(result.content).includes("<script>alert(1)</script>"));
  assert.ok(all.some(n => n.marks?.some(m => m.type === "code") && n.text === "<em>code</em>"));
  assert.ok(all.some(n => n.marks?.some(m => m.type === "link" && m.attrs.href === "https://example.com")));
  assert.ok(!all.some(n => n.marks?.some(m => m.type === "bold")));
});

test("paragraph splitting and short line-based prose preserve existing paste semantics", () => {
  const result = prepare("A wrapped\nparagraph.\n\nOne\nTwo\nThree");
  assert.equal(result.content[0].content[0].text, "A wrapped paragraph.");
  assert.equal(result.content[1].content[0].text, "One\nTwo\nThree");
});

test("exported Markdown frontmatter is hidden and only bounded safe metadata is proposed", () => {
  const source = serializePost({ id: "abcdefghijkl", title: "Imported", slug: "imported", dek: "A subtitle", tags: ["safe"], body: "## Body\n\nKeep this content", kind: "project", project: { arbitrary: "never applied" } });
  const result = prepare("\uFEFF" + source.replace(/\n/g, "\r\n"));
  assert.equal(result.frontmatter, true);
  assert.deepEqual(result.metadata, { title: "Imported", dek: "A subtitle", tags: ["safe"] });
  assert.equal(result.content[0].type, "heading");
  assert.ok(!textOf(result.content).includes("abcdefghijkl"));
  assert.ok(textOf(result.content).includes("Keep this content"));
});

test("simple YAML metadata is optional; incomplete fences and thematic prose are retained", () => {
  assert.deepEqual(prepare("---\ntitle: Simple title\ntags: [\"one\"]\n---\n\nBody").metadata, { title: "Simple title", tags: ["one"] });
  for (const source of ["---\nA paragraph\n---\nBody", "---\ntitle: Unterminated\nBody", "---"]) {
    assert.equal(splitImportFrontmatter(source).frontmatter, false);
    assert.equal(splitImportFrontmatter(source).body, source);
  }
  const source = '---\ntitle: "' + "x".repeat(301) + '"\ndek: ["wrong"]\ntags: [1, "tag"]\nproject: {"url":"javascript:bad"}\n---\nBody';
  assert.deepEqual(prepare(source).metadata, {});
});

test("Tiptap JSON, internal clipboard slices and stored editor envelopes use the clipboard validator", () => {
  const content = [{ ...paragraph("Kept"), attrs: { blockId: "original-block", privateSecret: "drop", onclick: "bad()" } }];
  for (const source of [JSON.stringify({ type: "doc", content }), envelope(content), JSON.stringify({ version: 1, markdown: "Kept", doc: { type: "doc", content } })]) {
    const result = prepare(source);
    assert.equal(result.format, "blocks");
    assert.equal(textOf(result.content), "Kept");
    assert.notEqual(result.content[0].attrs.blockId, "original-block");
    assert.equal(result.content[0].attrs.privateSecret, undefined);
    assert.equal(result.content[0].attrs.onclick, undefined);
  }
  const slice = prepare(JSON.stringify({ version: 1, content, openStart: 1, openEnd: 1 }));
  assert.equal(slice.openStart, 1);
});

test("ordinary JSON is formatted code, including arrays, scalars and HTML strings", () => {
  for (const value of [{ html: '<img src=x onerror="bad()">' }, [1, { nested: true }], null, "<b>text</b>", false, 123]) {
    const result = prepare(JSON.stringify(value), "json");
    assert.equal(result.format, "json");
    assert.equal(result.content[0].type, "codeBlock");
    assert.equal(result.content[0].attrs.language, "json");
    assert.equal(result.content[0].content[0].text, JSON.stringify(value, null, 2));
  }
  assert.equal(prepare('{"hello":"world"}').format, "json");
  assert.equal(prepare("{unfinished").format, "text");
  assert.throws(() => prepare("{unfinished", "json"), /not valid JSON/);
});

test("unsafe node and mark URLs and unsupported document shapes are rejected without HTML fallback", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,bad", "//evil.example/x", "https://example.com/\\evil", "https://example.com/\npath"]) {
    assert.throws(() => prepare(envelope([{ type: "image", attrs: { src: url } }])), /unsafe links/);
    assert.throws(() => prepare(envelope([{ type: "paragraph", content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href: url } }] }] }])), /unsafe links/);
  }
  for (const content of [[{ type: "script", content: [] }], [{ type: "paragraph", attrs: [] }], [{ type: "text", text: 42 }], [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: "bad" }] }] }]])
    assert.throws(() => prepare(envelope(content)));
  assert.throws(() => prepare('{"version":2,"doc":{"type":"doc","content":[]}}'), /Unsupported/);
  assert.throws(() => prepare('{"version":1,"content":[],"openStart":99,"openEnd":0}'));
  assert.throws(() => prepare('{"__proto__":{"polluted":true}}'), /unsafe attributes/);
  assert.equal({}.polluted, undefined);
});

test("unsafe Markdown links are rejected after parsing", () => {
  assert.throws(() => prepare("[Click](javascript:alert%281%29)", "markdown"), /unsafe links/);
  assert.throws(() => prepare("![Bad](data:image/svg+xml,bad)", "markdown"), /unsafe links/);
});

test("input, UTF-8 byte, binary, node-count, nesting and expanded JSON limits are enforced", () => {
  assert.throws(() => prepare("x".repeat(DOCUMENT_IMPORT_MAX_BYTES + 1)), /1 MB/);
  assert.throws(() => prepare("😀".repeat(250001)), /1 MB/);
  assert.throws(() => prepare("hello\0binary"), /binary/);
  assert.throws(() => prepare(" \n "), /empty/);
  let nested = paragraph("Deep");
  for (let i = 0; i < 42; i++) nested = { type: "blockquote", content: [nested] };
  assert.throws(() => prepare(envelope([nested])));
  assert.throws(() => prepare(envelope(Array.from({ length: 30001 }, () => ({ type: "paragraph" })))));
  assert.throws(() => prepare("[".repeat(102) + "0" + "]".repeat(102)), /complex/);
  assert.throws(() => prepare("[" + Array(45000).fill('"abcdefghijklmnopqr"').join(",") + "]", "json"), /1 MB/);
});

test("file extensions, size before read, binary and malformed UTF-8 are checked", async () => {
  const parse = source => manager.parse(source);
  for (const name of ["note.md", "note.MARKDOWN", "note.txt", "note.JSON"]) {
    const result = await readDocumentImportFile(file(name, name.endsWith("JSON") ? '{"data":1}' : "## Title"), parse);
    assert.ok(result.content.length);
    if (name.endsWith("txt")) assert.equal(result.content[0].type, "paragraph");
  }
  let reads = 0;
  const unread = { name: "large.md", size: DOCUMENT_IMPORT_MAX_BYTES + 1, arrayBuffer: async () => { reads++; return new ArrayBuffer(0); } };
  await assert.rejects(readDocumentImportFile(unread, parse), /1 MB/);
  await assert.rejects(readDocumentImportFile({ ...unread, name: "unsafe.html", size: 0 }, parse), /Choose a/);
  assert.equal(reads, 0);
  await assert.rejects(readDocumentImportFile({ name: "bad.txt", size: 2, arrayBuffer: async () => Uint8Array.of(0xff, 0xfe).buffer }, parse), /UTF-8/);
  await assert.rejects(readDocumentImportFile(file("bad.txt", "a\0b"), parse), /binary/);
});

function harness() {
  let state = EditorState.create({ schema, doc: schema.nodeFromJSON({ type: "doc", content: [paragraph("Existing"), paragraph("Last")] }), plugins: [history()] });
  const events = [];
  const editor = {
    get state() { return state; }, markdown: manager, isActive: () => false,
    view: { dispatch(tr) { state = state.apply(tr); }, dom: { dispatchEvent(event) { events.push(event); } } },
  };
  return { editor, events, get state() { return state; }, select(from, to) { state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to))); }, undo() { return undo(state, tr => { state = state.apply(tr); }); } };
}

test("file append keeps selected content and one undo restores the exact original document", () => {
  const h = harness();
  h.select(1, 8);
  const original = h.state.doc.toJSON();
  insertDocumentImport(h.editor, prepare("## Imported\n\nNew body"), true);
  assert.equal(h.state.doc.child(0).textContent, "Existing");
  assert.equal(h.state.doc.child(1).textContent, "Last");
  assert.equal(h.state.doc.child(2).type.name, "heading");
  assert.equal(h.state.doc.lastChild.textContent, "New body");
  assert.equal(h.undo(), true);
  assert.deepEqual(h.state.doc.toJSON(), original);
});

test("schema-invalid JSON cannot partially change the editor", () => {
  const h = harness();
  const original = h.state.doc.toJSON();
  const malformed = prepare(envelope([{ type: "paragraph", content: [{ type: "heading", content: [{ type: "text", text: "invalid child" }] }] }]));
  assert.throws(() => insertDocumentImport(h.editor, malformed, true));
  assert.deepEqual(h.state.doc.toJSON(), original);
});

test("pasted JSON uses normal selection replacement; file append supports open clipboard slices", () => {
  const h = harness();
  h.select(1, 9);
  pasteDocumentText(h.editor, '{"safe":"<b>literal</b>"}');
  assert.equal(h.state.doc.firstChild.type.name, "codeBlock");
  assert.ok(h.state.doc.firstChild.textContent.includes("<b>literal</b>"));
  const open = prepare(JSON.stringify({ version: 1, content: [paragraph("Open slice")], openStart: 1, openEnd: 1 }));
  insertDocumentImport(h.editor, open, true);
  assert.equal(h.state.doc.lastChild.textContent, "Open slice");
});

test("large pastes and frontmatter open review without changing the body", () => {
  for (const source of [Array.from({ length: 13 }, (_, i) => `Paragraph ${i}`).join("\n\n"), '---\ntitle: "Review me"\n---\nBody']) {
    const h = harness();
    const original = h.state.doc.toJSON();
    pasteDocumentText(h.editor, source);
    assert.equal(h.events[0].type, DOCUMENT_IMPORT_EVENT);
    assert.deepEqual(h.state.doc.toJSON(), original);
  }
});

test("context-menu pastes into code stay literal regardless of requested Markdown", () => {
  const h = harness();
  h.editor.isActive = () => true;
  h.select(1, 1);
  pasteDocumentText(h.editor, "**literal**\n<img src=x>", "markdown");
  assert.ok(h.state.doc.firstChild.textContent.startsWith("**literal**\n<img src=x>"));
  assert.equal(h.events.length, 0);
});
