import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { NodeRangeSelection } from "@tiptap/extension-node-range";
import { EditorState } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import { ResizableImage } from "../app/admin/ui/extensions/resizable-image.ts";
import { markdownToTree } from "../cms/render.ts";
import { moveBlock } from "../app/admin/ui/commands.tsx";

const schema = getSchema([StarterKit, ResizableImage]);
const paragraph = (text) => schema.node("paragraph", null, schema.text(text));
const image = schema.node("image", { src: "/image.png", width: 240, height: 120 });
const doc = schema.node("doc", null, [paragraph("First"), image, paragraph("Third")]);

test("mixed text and image block selection deletes together and undo restores it", () => {
  let state = EditorState.create({ doc, plugins: [history()] });
  state = state.apply(state.tr.setSelection(NodeRangeSelection.create(doc, 1, doc.child(0).nodeSize + 1, 0)));
  assert.equal(state.selection.ranges.length, 2);
  assert.equal(state.selection.content().content.childCount, 2);
  state = state.apply(state.tr.deleteSelection());
  assert.equal(state.doc.textContent, "Third");
  assert.equal(state.doc.childCount, 1);
  assert.equal(undo(state, tr => { state = state.apply(tr); }), true);
  assert.deepEqual(state.doc.toJSON(), doc.toJSON());
});

const renderImage = (attrs) => ResizableImage.config.renderMarkdown({ type: "image", attrs });
const images = (tree) => (tree.children ?? []).flatMap(n => n.tagName === "img" ? [n] : images(n));

test("resized images retain dimensions and captions in public rendering", async () => {
  const md = renderImage({ src: "/image.png", alt: 'A "quote"', title: "Caption", width: 240, height: 120 });
  const tree = await markdownToTree(md);
  const [img] = images(tree);
  assert.equal(Number(img.properties.width), 240);
  assert.equal(Number(img.properties.height), 120);
  assert.equal(img.properties.alt, 'A "quote"');
  assert.match(img.properties.style, /max-width: 100%/);
  assert.equal(tree.children[0].tagName, "figure");
  assert.equal(tree.children[0].children[1].children[0].value, "Caption");
});

test("image metadata cannot introduce HTML attributes or active markup", async () => {
  const md = renderImage({ src: '/image.png" onerror="alert(1)', alt: '<script>bad</script>', width: 240 });
  const [img] = images(await markdownToTree(md));
  assert.equal(img.properties.onError, undefined);
  assert.equal(img.properties.alt, '<script>bad</script>');
});

test("unsized images keep ordinary Markdown syntax", () => {
  assert.equal(renderImage({src:"/image.png",alt:"Photo"}), "![Photo](/image.png)");
});

test("moving selected text and image blocks keeps their order and selection", () => {
  let state = EditorState.create({ doc, plugins: [history()] });
  state = state.apply(state.tr.setSelection(NodeRangeSelection.create(doc, 0, doc.child(0).nodeSize + 1, 0)));
  const editor = {
    get state() { return state; },
    view: { dispatch(tr) { state = state.apply(tr); } },
    commands: { focus() {} },
  };
  moveBlock(editor, 0, 1);
  assert.equal(state.doc.firstChild.textContent, "Third");
  assert.equal(state.doc.child(1).textContent, "First");
  assert.equal(state.doc.child(2).type.name, "image");
  assert.equal(state.selection.ranges.length, 2);
  moveBlock(editor, state.selection.from, -1);
  assert.deepEqual(state.doc.toJSON(), doc.toJSON());
});

test("numeric size edits, reset and undo synchronize the image node view", () => {
  const img = {style:{width:"240px",height:"120px"},setAttribute(){},removeAttribute(){}};
  const create = ResizableImage.config.addNodeView.call({
    parent: () => () => ({dom:{querySelector:()=>img},update:()=>true}),
  });
  const view = create({node:{attrs:{width:240,height:120}}});
  view.update({attrs:{width:320,height:160}});
  assert.equal(img.style.width,"320px");
  view.update({attrs:{width:null,height:null}});
  assert.equal(img.style.width,"");
  assert.equal(img.style.height,"");
  view.update({attrs:{width:240,height:120}});
  assert.equal(img.style.width,"240px");
});

test("resized images survive repeated save/reopen and render at the saved width", async () => {
  const manager = new MarkdownManager({extensions:[StarterKit,ResizableImage]});
  let document = {type:"doc",content:[{type:"image",attrs:{src:"/media/2026/example-1254x1254.webp",alt:'A "quote" & more',title:"Caption",width:280,height:280}}]};
  for (let i=0;i<3;i++) {
    const markdown = manager.serialize(document);
    document = manager.parse(markdown);
    assert.equal(document.content[0].type,"image");
    assert.equal(document.content[0].attrs.width,280);
    assert.equal(document.content[0].attrs.alt,'A "quote" & more');
    const [img] = images(await markdownToTree(markdown));
    assert.equal(img.properties.width,280);
    assert.match(img.properties.style,/width: 280px/);
  }
  assert.equal(manager.parse("![Original](/photo.png)").content[0].type,"image");
});

test("selection-only updates do not erase a resize gesture before it commits", () => {
  const img = {style:{width:"180px",height:"90px"},setAttribute(){},removeAttribute(){}};
  const create = ResizableImage.config.addNodeView.call({parent:()=>()=>({dom:{querySelector:()=>img},update:()=>true})});
  const view = create({node:{attrs:{width:null,height:null}}});
  view.update({attrs:{width:null,height:null}});
  assert.equal(img.style.width,"180px");
  view.update({attrs:{width:180,height:90}});
  assert.equal(img.style.width,"180px");
});

test("toggle headings keep their level through Markdown and render as headings on the page", async () => {
  const { Toggle, DetailsSummary, DetailsContent } = await import("../app/admin/ui/extensions/blocks.ts");
  const manager = new MarkdownManager({ extensions: [StarterKit, Toggle, DetailsSummary, DetailsContent] });
  const doc = { type: "doc", content: [{ type: "details", content: [
    { type: "detailsSummary", attrs: { level: 3 }, content: [{ type: "text", text: "Folded section" }] },
    { type: "detailsContent", content: [{ type: "paragraph", content: [{ type: "text", text: "Inside." }] }] },
  ] }] };
  const md = manager.serialize(doc);
  assert.match(md, /<summary><h3>Folded section<\/h3><\/summary>/);
  const back = manager.parse(md).content[0];
  assert.equal(back.type, "details");
  assert.equal(back.content[0].attrs.level, 3);
  assert.equal(back.content[0].content[0].text, "Folded section");
  const plain = manager.serialize({ type: "doc", content: [{ ...doc.content[0], content: [{ ...doc.content[0].content[0], attrs: { level: 0 } }, doc.content[0].content[1]] }] });
  assert.match(plain, /<summary>Folded section<\/summary>/);
  const find = (n, tag) => n.tagName === tag ? n : (n.children ?? []).map((k) => find(k, tag)).find(Boolean);
  const summary = find(await markdownToTree(md), "summary");
  assert.ok(summary && find(summary, "h3"), "the summary holds a real h3");
});
