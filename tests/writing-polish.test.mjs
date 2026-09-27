import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { HeadingIcon } from "../app/admin/ui/extensions/heading-icon.tsx";
import { TextColor } from "../app/admin/ui/extensions/text-color.ts";
import { markdownToTree, outline } from "../cms/render.ts";
import { fontVars, inlineFontLinks } from "../cms/fonts.ts";
import { tagPage, validTagSlug } from "../cms/tag-pages.ts";
import { plainText } from "../functions/api/admin/search.ts";
import { onRequestPut } from "../functions/api/admin/tags/[slug].ts";
import { commit, GitHubConflictError } from "../cms/server/github.ts";
import { intersectsBlock } from "../app/admin/ui/BlockMarquee.tsx";
import { searchEmoji } from "../app/admin/ui/extensions/emoji.tsx";
const manager=new MarkdownManager({extensions:[StarterKit,HeadingIcon,TextColor]});
const nodes=tree=>tree.children.flatMap(n=>[n,...(n.children?nodes(n):[])]);

test("heading icons survive Markdown and appear in the outline without changing its label",async()=>{
  for(const icon of ["✨","/media/heading.png"]){
    const doc={type:"doc",content:[{type:"heading",attrs:{level:2},content:[{type:"headingIcon",attrs:{icon}},{type:"text",text:"A clear heading"}]}]};
    const md=manager.serialize(doc);
    const restored=manager.parse(md);
    assert.equal(restored.content[0].content[0].attrs.icon,icon);
    const tree=await markdownToTree(md);
    const toc=outline(tree);
    assert.equal(toc[0].text,"A clear heading");
    assert.equal(toc[0].icon,icon);
    assert.equal(nodes(tree).some(n=>n.tagName==="figure"),false);
  }
});
test("font, color and opacity persist together with nested emphasis",async()=>{
  const md='<span data-text-color="#1d4ed8" data-text-font="Newsreader" data-text-opacity="65">**Blue** words</span>';
  const doc=manager.parse(md);
  assert.deepEqual(manager.parse(manager.serialize(doc)),doc);
  const tree=await markdownToTree(md);
  const span=nodes(tree).find(n=>n.properties?.dataTextFont==="Newsreader");
  assert.match(span.properties.style,/opacity:0.65/);
  assert.match(span.properties.style,/font-family:.*Newsreader/);
  assert.equal(inlineFontLinks(md).length,1);
  const bad=await markdownToTree('<span data-text-color="inherit" data-text-font="evil;position:fixed" data-text-opacity="900">Safe</span>');
  assert.ok(!JSON.stringify(bad).includes("position:fixed"));
  assert.ok(JSON.stringify(bad).includes("opacity:1"));
});
test("ligatures are on by default and may be disabled independently of font choices",()=>{
  assert.equal(fontVars(null)["--article-ligatures"],"normal");
  assert.equal(fontVars({ligatures:false})["--article-ligatures"],"none");
});
test("search phrases cross inline formatting and soft line breaks",()=>{
  assert.equal(plainText('A <span data-text-color="#1d4ed8">hard</span> part\nwith **bold** words &amp; ideas'),"A hard part with bold words & ideas");
  assert.equal(plainText("First<p>second</p>third"),"First second third");
});
test("tag metadata rejects path traversal and bounds user-controlled strings",async()=>{
  for(const slug of ["../posts/test","x/y","%2e%2e","UPPER",""])assert.equal(validTagSlug(slug),false);
  assert.equal(validTagSlug("design-notes"),true);
  assert.equal(tagPage({title:"x".repeat(200),description:"x".repeat(3000),updatedAt:"bad"}).title.length,100);
  const res=await onRequestPut({params:{slug:"../posts/private"},env:{},request:new Request("https://example.com",{method:"PUT"})});
  assert.equal(res.status,400);
});

test("rectangle selection uses intersection, including partially touched blocks",()=>{
  const box={left:10,top:10,right:50,bottom:50};
  assert.equal(intersectsBlock(box,{left:40,top:40,right:300,bottom:100}),true);
  assert.equal(intersectsBlock(box,{left:0,top:0,right:15,bottom:15}),true);
  assert.equal(intersectsBlock(box,{left:0,top:51,right:300,bottom:80}),false);
});
test("a bare colon offers emoji choices without requiring two letters",()=>{
  const rows=[["✨","sparkles","stars sparkles",0],["😀","grinning","smile",0]];
  assert.deepEqual(searchEmoji(rows,"",12),rows);
  assert.deepEqual(searchEmoji(rows,"sp",12),[rows[0]]);
});
test("tag publication refuses a concurrent change before creating a commit",async()=>{
  const original=globalThis.fetch;let writes=0;let pinned=false;
  globalThis.fetch=async(url,init={})=>{
    if(init.method && init.method!=="GET")writes++;
    if(String(url).includes("/git/ref/"))return Response.json({object:{sha:"head123"}});
    if(String(url).includes("/contents/")){pinned=String(url).endsWith("ref=head123");return Response.json({content:btoa("newer edit")});}
    throw new Error("Unexpected write");
  };
  try{await assert.rejects(commit({GITHUB_REPO:"owner/repo",GITHUB_BRANCH:"master",GITHUB_TOKEN:"test"},"Tag",[{path:"content/tags/test.json",content:"mine"}],[{path:"content/tags/test.json",content:"older edit"}]),GitHubConflictError);assert.equal(writes,0);assert.equal(pinned,true);}finally{globalThis.fetch=original;}
});
