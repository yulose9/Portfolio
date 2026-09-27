import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorState } from "@tiptap/pm/state";
import { DragHandlePlugin, normalizeNestedOptions } from "@tiptap/extension-drag-handle";
import { setDragHandleLocked } from "../app/admin/ui/drag-handle-lock.ts";

test("React plugin locks and unlocks without extension commands, including teardown", () => {
  const previousDocument = globalThis.document;
  const element = () => ({style:{},dataset:{},appendChild(){},addEventListener(){},removeEventListener(){}});
  globalThis.document = {createElement:element,addEventListener(){},removeEventListener(){}};
  let binding;
  try {
    const schema=getSchema([StarterKit]);
    const doc=schema.node("doc",null,[schema.node("paragraph",null,schema.text("Draft"))]);
    const editor={isDestroyed:false,isEditable:true,commands:{},state:null,view:null};
    const handle=element();
    binding=DragHandlePlugin({editor,element:handle,nestedOptions:normalizeNestedOptions(false)});
    let state=EditorState.create({doc,plugins:[binding.plugin]});
    editor.state=state;
    let pluginView;
    let writes=0;
    editor.view={state,dom:{parentElement:element()},dispatch(tr){
      writes++;
      assert.equal(tr.docChanged,false);
      assert.equal(tr.getMeta("addToHistory"),false);
      const previous=state;
      state=state.apply(tr);
      editor.state=editor.view.state=state;
      pluginView.update(editor.view,previous);
    }};
    pluginView=binding.plugin.spec.view(editor.view);
    assert.equal(editor.commands.unlockDragHandle,undefined);
    setDragHandleLocked(editor,false); // initial mount
    assert.equal(handle.draggable,true);
    setDragHandleLocked(editor,true); // open block menu
    assert.equal(handle.draggable,false);
    setDragHandleLocked(editor,false); // close/cleanup
    assert.equal(handle.draggable,true);
    assert.equal(state.doc.textContent,"Draft");
    editor.isDestroyed=true;
    setDragHandleLocked(editor,false);
    assert.equal(writes,3);
  } finally {
    binding?.unbind();
    globalThis.document=previousDocument;
  }
});
