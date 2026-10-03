import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import UniqueID from "@tiptap/extension-unique-id";
import { NodeRangeSelection, isNodeRangeSelection } from "@tiptap/extension-node-range";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import { ResizableImage } from "../app/admin/ui/extensions/resizable-image.ts";
import { InteractionHighlight, blockFlash } from "../app/admin/ui/extensions/interaction-highlight.ts";
import { duplicateBlock, duplicateSelection } from "../app/admin/ui/commands.tsx";

const schema = getSchema([StarterKit, ResizableImage, UniqueID.configure({ attributeName: "blockId", types: ["paragraph", "image"] })]);
const p = (text, id) => schema.node("paragraph", { blockId: id }, schema.text(text));
const image = schema.node("image", { src: "/image.png", blockId: "img" });
const doc = schema.node("doc", null, [p("One", "a"), image, p("Three", "c")]);

/** Just enough of an Editor for the commands: state, dispatch, focus. */
function harness(selection) {
  let state = EditorState.create({ doc, plugins: [history(), ...InteractionHighlight.config.addProseMirrorPlugins()] });
  state = state.apply(state.tr.setSelection(selection(state.doc)));
  const view = { get state() { return state; }, dispatch(tr) { state = state.apply(tr); }, isDestroyed: false };
  const editor = { get state() { return state; }, view, commands: { focus() {} } };
  return { editor, get state() { return state; }, undo: () => undo(state, (tr) => { state = state.apply(tr); }) };
}
const texts = (d) => { const out = []; d.forEach((n) => out.push(n.type.name === "image" ? "[img]" : n.textContent)); return out; };
const ids = (d) => { const out = []; d.forEach((n) => out.push(n.attrs.blockId)); return out; };

test("⌘D with the caret in a block copies that block and keeps the caret's offset in the copy", () => {
  const h = harness((d) => TextSelection.create(d, 3)); // "On|e"
  assert.equal(duplicateSelection(h.editor), true);
  assert.deepEqual(texts(h.state.doc), ["One", "One", "[img]", "Three"]);
  const copyStart = doc.child(0).nodeSize;
  assert.ok(h.state.selection instanceof TextSelection);
  assert.equal(h.state.selection.from, copyStart + 3);
  assert.equal(h.state.selection.empty, true);
});

test("copies drop their block ids so UniqueID gives them new ones", () => {
  const h = harness((d) => NodeRangeSelection.create(d, 0, d.child(0).nodeSize + d.child(1).nodeSize, 0));
  duplicateSelection(h.editor);
  assert.deepEqual(ids(h.state.doc), ["a", "img", null, null, "c"]);
});

test("a block range copies every block as a group after the last, in order, and selects the copies", () => {
  const h = harness((d) => NodeRangeSelection.create(d, 0, d.child(0).nodeSize + d.child(1).nodeSize, 0));
  duplicateSelection(h.editor);
  assert.deepEqual(texts(h.state.doc), ["One", "[img]", "One", "[img]", "Three"]);
  const size = doc.child(0).nodeSize + doc.child(1).nodeSize;
  assert.ok(isNodeRangeSelection(h.state.selection));
  assert.equal(h.state.selection.from, size);
  assert.equal(h.state.selection.to, size * 2);
  assert.equal(h.state.selection.ranges.length, 2);
});

test("a text range across blocks copies all of them and shifts the range into the copy", () => {
  const end = doc.child(0).nodeSize + doc.child(1).nodeSize + 3;
  const h = harness((d) => TextSelection.create(d, 2, end)); // "O|ne … Th|ree"
  duplicateSelection(h.editor);
  assert.deepEqual(texts(h.state.doc), ["One", "[img]", "Three", "One", "[img]", "Three"]);
  assert.equal(h.state.selection.from, 2 + doc.content.size);
  assert.equal(h.state.selection.to, end + doc.content.size);
});

test("a selected image stays a node selection, on the copy", () => {
  const at = doc.child(0).nodeSize;
  const h = harness((d) => NodeSelection.create(d, at));
  duplicateSelection(h.editor);
  assert.ok(h.state.selection instanceof NodeSelection);
  assert.equal(h.state.selection.from, at + image.nodeSize);
  assert.equal(h.state.selection.node.type.name, "image");
});

test("the copies are washed briefly, and one undo takes them away", async () => {
  const h = harness((d) => TextSelection.create(d, 1));
  duplicateSelection(h.editor);
  const start = doc.child(0).nodeSize;
  assert.deepEqual(blockFlash.getState(h.state), [{ from: start, to: start * 2, className: "block-flash" }]);
  assert.equal(h.undo(), true);
  assert.deepEqual(h.state.doc.toJSON(), doc.toJSON());
  await new Promise((r) => setTimeout(r, 650));
  assert.deepEqual(blockFlash.getState(h.state), []);
});

test("the handle's Duplicate copies its block even when the caret is elsewhere", () => {
  const h = harness((d) => TextSelection.create(d, 1));
  const last = doc.child(0).nodeSize + doc.child(1).nodeSize;
  duplicateBlock(h.editor, last);
  assert.deepEqual(texts(h.state.doc), ["One", "[img]", "Three", "Three"]);
  assert.equal(h.state.selection.from, doc.content.size + 1);
});
