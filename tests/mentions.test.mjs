import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { Mentions } from "../app/admin/ui/extensions/mentions.tsx";
import { mentionDateLabel, parseDateQuery, parseDateHref, fullMentionDate } from "../cms/mentions.ts";
import { markdownToTree } from "../cms/render.ts";
import { draftToPost, parsePost, serializePost, postToDraft } from "../cms/format.ts";
import { onRequestPost } from "../functions/api/admin/posts/index.ts";

const now = Date.parse("2026-09-27T04:00:00Z");
test("date mentions anchor once and roll over at midnight in Manila", () => {
  const date = parseDateQuery("Today", now);
  assert.deepEqual(date, {date:"2026-09-27",time:null});
  assert.equal(mentionDateLabel(date, now),"Today");
  assert.equal(mentionDateLabel(date, Date.parse("2026-09-27T15:59:59Z")),"Today");
  assert.equal(mentionDateLabel(date, Date.parse("2026-09-27T16:00:00Z")),"Yesterday");
  assert.equal(mentionDateLabel(date, Date.parse("2026-09-30T04:00:00Z")),"3 days ago");
  assert.equal(mentionDateLabel(date, Date.parse("2026-10-04T04:00:00Z")),"1 week ago");
  assert.equal(mentionDateLabel(date, Date.parse("2026-10-05T04:00:00Z")),"September 27, 2026");
});
test("weekday queries and optional 24-hour times are validated", () => {
  assert.deepEqual(parseDateQuery("last Monday 9:30",now),{date:"2026-09-21",time:"09:30"});
  assert.deepEqual(parseDateQuery("tuesy",now),{date:"2026-09-29",time:null});
  assert.deepEqual(parseDateQuery("Last Sunday",now),{date:"2026-09-20",time:null});
  assert.equal(parseDateQuery("today 25:00",now),null);
  assert.equal(parseDateQuery("2026-02-30",now),null);
  assert.equal(parseDateHref("#date=2026-02-30"),null);
  assert.equal(fullMentionDate({date:"2026-09-06",time:"14:05"}),"September 6, 2026 at 14:05");
});
test("dates and page IDs survive Markdown save/reopen", () => {
  const manager = new MarkdownManager({extensions:[StarterKit,Mentions(()=>"0muicd6md6oa")]});
  const source="Meet [@September 27, 2026 at 14:30](#date=2026-09-27&time=14:30) and [@Child](#page=0muicd6md6oa).";
  const json=manager.parse(source);
  const mentions=json.content[0].content.filter(n=>n.type==="mention");
  assert.equal(mentions.length,2);
  assert.equal(mentions[0].attrs.time,"14:30");
  assert.equal(mentions[1].attrs.id,"0muicd6md6oa");
  assert.deepEqual(manager.parse(manager.serialize(json)),json);
});
test("public mentions resolve only published IDs and retain readable feed dates", async () => {
  const source="[@Date](#date=2026-09-27&time=09:00) [@Draft](#page=0muicd6md6oa)";
  const hidden=await markdownToTree(source);
  assert.equal(hidden.children[0].children[0].properties.dataDateMention,"#date=2026-09-27&time=09:00");
  assert.equal(hidden.children[0].children[2].tagName,"span");
  const published=await markdownToTree(source,[],()=>({slug:"renamed-child",title:"New title"}));
  assert.equal(published.children[0].children[2].properties.href,"/writing/renamed-child");
});
test("parent page IDs persist through publishing and reopening", () => {
  const draft={id:"0muicd6md6oa",parentId:"0muicd6md6ob",title:"Child",slug:"child",dek:"",icon:null,authors:[],fonts:null,page:true,ogImage:null,tags:[],cover:null,body:"Body",publishedAt:null,redirectFrom:[]};
  const post=parsePost(serializePost(draftToPost(draft,"2026-09-27T04:00:00Z")));
  assert.equal(postToDraft(post).parentId,draft.parentId);
});

test("subpage creation validates the parent and keeps the child unpublished", async () => {
  const stored = new Map();
  const parent = {id:"0muicd6md6ob",page:true,title:"Parent",authors:[],trashedAt:null};
  const env = {WRITING:{
    get:async(key)=>key===`drafts/${parent.id}/current.json`?({json:async()=>parent}):null,
    put:async(key,value)=>{stored.set(key,JSON.parse(value));return {etag:"created"};},
  }};
  const request = (body) => new Request("https://example.test/api/admin/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  await assert.rejects(()=>onRequestPost({env,request:request({parentId:"../invalid"})}),/Invalid parent/);
  const response=await onRequestPost({env,request:request({title:"Child",parentId:parent.id})});
  const {post}=await response.json();
  assert.equal(post.parentId,parent.id);
  assert.equal(post.status,"draft");
  assert.equal(post.publishedAt,null);
  assert.equal(stored.get(`drafts/${post.id}/current.json`).parentId,parent.id);
  parent.trashedAt="2026-09-27T04:00:00Z";
  await assert.rejects(()=>onRequestPost({env,request:request({parentId:parent.id})}),/Parent page not found/);
});
