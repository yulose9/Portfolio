import test from "node:test";
import assert from "node:assert/strict";
import {changeFolders} from "../cms/folders.ts";
import {SHORTCUTS,validateBindings,shortcutKey} from "../cms/shortcuts.ts";
import {findFont,inlineFontLinks} from "../cms/fonts.ts";
import {markdownToTree} from "../cms/render.ts";
test("folder rename retains assignments and deletion unfiles rather than deletes pages",()=>{
  const start={folders:[],assignments:{}};
  const created=changeFolders(start,{type:"create",id:"folder-one",name:"Research"});
  const moved=changeFolders(created,{type:"move",pageId:"abcdefghijkl",folderId:"folder-one"});
  const renamed=changeFolders(moved,{type:"rename",id:"folder-one",name:"Reading"});
  assert.equal(renamed.assignments.abcdefghijkl,"folder-one");
  assert.deepEqual(changeFolders(renamed,{type:"remove",id:"folder-one"}),start);
  assert.throws(()=>changeFolders(created,{type:"create",id:"folder-two",name:"research"}),/already/);
  assert.throws(()=>changeFolders(created,{type:"move",pageId:"abcdefghijkl",folderId:"unknown"}),/no longer/);
});
test("shortcut bindings reject conflicts and reserved keys and normalize shifted digits",()=>{
  assert.equal(Object.keys(validateBindings({})).length,SHORTCUTS.length);
  assert.throws(()=>validateBindings({find:"Mod+s"}),/already/);
  assert.throws(()=>validateBindings({find:"Mod+w"}),/reserved/);
  assert.equal(validateBindings({find:"Mod+Shift+f"}).find,"Mod+Shift+f");
  assert.equal(shortcutKey({key:"&",code:"Digit7",ctrlKey:true,metaKey:false,altKey:false,shiftKey:true}),"Mod+Shift+7");
});
test("catalog fonts beyond the curated shelf survive public rendering",async()=>{
  assert.ok(findFont("Crimson Pro"));
  const body='<span data-text-color="inherit" data-text-font="Crimson Pro" data-text-opacity="80">Reading</span>';
  assert.match(inlineFontLinks(body)[0],/Crimson\+Pro/);
  const tree=await markdownToTree(body);
  assert.match(JSON.stringify(tree),/Crimson Pro/);
  assert.equal(findFont('bad" onload="alert(1)'),undefined);
});
