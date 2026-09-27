import test from "node:test";
import assert from "node:assert/strict";
import {getSchema} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {EditorState} from "@tiptap/pm/state";
import {history,undo} from "@tiptap/pm/history";
import {replaceLink} from "../app/admin/ui/replace-link.ts";

const schema=getSchema([StarterKit]);
function setup() {
  const doc=schema.node("doc",null,[schema.node("paragraph",null,[schema.text("Before "),schema.text("old link",[schema.marks.bold.create(),schema.marks.link.create({href:"https://old.example"})]),schema.text(" after")])]);
  let state=EditorState.create({doc,plugins:[history()]});
  return {get state(){return state;},view:{dispatch(tr){state=state.apply(tr);}}};
}
test("link text and URL change together, preserve formatting, and undo together",()=>{
  const editor=setup();const before=editor.state.doc.toJSON();
  assert.equal(replaceLink(editor,{from:8,to:16},"https://new.example","New label"),true);
  assert.equal(editor.state.doc.textContent,"Before New label after");
  const node=editor.state.doc.nodeAt(8);
  assert.equal(node.marks.find(m=>m.type.name==="link").attrs.href,"https://new.example");
  assert.ok(node.marks.some(m=>m.type.name==="bold"));
  undo(editor.state,tr=>editor.view.dispatch(tr));
  assert.deepEqual(editor.state.doc.toJSON(),before);
});
test("link edits reject unsafe addresses and empty labels without changing content",()=>{
  const editor=setup();const before=editor.state.doc.toJSON();
  assert.equal(replaceLink(editor,{from:8,to:16},"javascript:alert(1)","New"),false);
  assert.equal(replaceLink(editor,{from:8,to:16},"https://safe.example",""),false);
  assert.deepEqual(editor.state.doc.toJSON(),before);
});
