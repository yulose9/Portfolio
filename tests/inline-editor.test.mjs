import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import {MarkdownManager} from "@tiptap/markdown";
import {InlineLogo} from "../app/admin/ui/extensions/inline-logo.tsx";
import {TextColor} from "../app/admin/ui/extensions/text-color.ts";
import {markdownToTree} from "../cms/render.ts";
import {safeInlineUrl} from "../cms/inline.ts";
const manager = new MarkdownManager({extensions:[StarterKit,InlineLogo,TextColor]});
const nodes = tree => tree.children.flatMap(n => [n, ...(n.children ? nodes(n) : [])]);

test("inline logo label, source and link survive saving and reopening", async () => {
  const doc = {type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Meet "},{type:"inlineLogo",attrs:{src:"/media/logo.png",label:'Hello & "friends"',href:"https://example.com/?a=1&b=2"}},{type:"text",text:" today."}]}]};
  const md = manager.serialize(doc);
  const restored = manager.parse(md).content[0].content[1];
  assert.equal(restored.type,"inlineLogo"); assert.deepEqual(restored.attrs,doc.content[0].content[1].attrs);
  const tree = await markdownToTree(md);
  const logo = nodes(tree).find(n => n.properties?.className?.includes("inline-logo"));
  assert.equal(logo.tagName,"a"); assert.equal(logo.properties.href,restored.attrs.href);
  assert.equal(logo.children[1].children[0].value,restored.attrs.label);
  assert.equal(nodes(tree).some(n=>n.tagName==="figure"),false);
});
test("colored bold text persists and public output only grants validated color", async () => {
  const source = '<span data-text-color="#1d4ed8">**Hello** world</span>';
  const first = manager.parse(source);
  assert.ok(first.content[0].content[0].marks.some(m=>m.type==="textColor" && m.attrs.color==="#1d4ed8"));
  const again = manager.parse(manager.serialize(first));
  assert.deepEqual(again,first);
  const tree = await markdownToTree(source+' <span data-text-color="red;position:fixed" style="position:fixed">bad</span>');
  assert.ok(nodes(tree).some(n=>n.properties?.style==="color:#1d4ed8"));
  assert.ok(!JSON.stringify(tree).includes("position:fixed"));
});
test("inline URLs reject script, data, protocol-relative and control-character schemes", async () => {
  for (const bad of ["javascript:alert(1)","data:text/html,test","//evil.example","java\nscript:alert(1)","/\\evil.example"]) assert.equal(safeInlineUrl(bad),"");
  const tree = await markdownToTree('<img data-inline-logo="Hello" src="javascript:alert(1)" data-logo-href="javascript:alert(1)" onerror="alert(1)" />');
  assert.ok(!JSON.stringify(tree).includes("javascript:"));
  assert.ok(!JSON.stringify(tree).includes("onError"));
});
test("logos inside formatted links do not create nested anchors or figures", async () => {
  const tree=await markdownToTree('<a href="https://outer.example"><strong><img data-inline-logo="Logo" src="/media/logo.png" data-logo-href="https://inner.example" /></strong></a>');
  assert.equal(nodes(tree).filter(n=>n.tagName==="a").length,1);
  assert.equal(nodes(tree).filter(n=>n.tagName==="figure").length,0);
});
