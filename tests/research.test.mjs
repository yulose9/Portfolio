import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorState } from "@tiptap/pm/state";
import {
  cleanEditorDocument,
  editorContent,
  copyEditorDocument,
} from "../cms/editor-document.ts";
import {
  indexDocument,
  cleanResearchItem,
  inCollection,
} from "../cms/research.ts";
import { mapInteractionRange } from "../app/admin/ui/interaction-range.ts";
import { draftToPost, serializePost } from "../cms/format.ts";
import { publishedFingerprint } from "../cms/published-fingerprint.ts";
import { onRequestPut } from "../functions/api/admin/research/[id].ts";
import { putDraftIfVersion } from "../cms/server/store.ts";
import { onRequestPost as createPost } from "../functions/api/admin/posts/index.ts";

const tree = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { blockId: "block-12345" },
      content: [
        { type: "text", text: "Read " },
        {
          type: "mention",
          attrs: { kind: "page", id: "abcdefghijkl", label: "Research" },
        },
      ],
    },
  ],
};
const document = {
  version: 1,
  markdown: "Read [Research](#page=abcdefghijkl)",
  doc: tree,
};
const draft = {
  id: "123456789abc",
  title: "Writing",
  slug: "writing",
  dek: "",
  icon: null,
  authors: [],
  fonts: null,
  tags: [],
  page: true,
  cover: null,
  body: document.markdown,
  editorDocument: document,
  status: "draft",
  dirty: true,
  redirectFrom: [],
  updatedAt: "2026-09-28T00:00:00.000Z",
};
test("structured drafts retain block identity, copies remap it, Markdown changes invalidate it", () => {
  assert.deepEqual(cleanEditorDocument(document, draft.body), document);
  assert.equal(editorContent(draft), tree);
  assert.equal(editorContent({ ...draft, body: "GitHub edits" }), null);
  const copy = copyEditorDocument(document);
  assert.notEqual(copy.doc.content[0].attrs.blockId, "block-12345");
  assert.equal(document.doc.content[0].attrs.blockId, "block-12345");
  assert.throws(
    () =>
      cleanEditorDocument(
        {
          ...document,
          doc: { type: "doc", content: [...tree.content, ...tree.content] },
        },
        draft.body,
      ),
    /duplicate/,
  );
  assert.throws(() => cleanEditorDocument(document, "different"), /checkpoint/);
  assert.throws(
    () => cleanEditorDocument({ ...document, version: 2 }, draft.body),
    /checkpoint/,
  );
});
test("index links carry block context while legacy references still work", () => {
  const index = indexDocument(draft);
  assert.deepEqual(index.references, [
    {
      target: "abcdefghijkl",
      blockId: "block-12345",
      snippet: "Read Research",
    },
  ]);
  assert.equal(index.blocks[0].id, "block-12345");
  assert.equal(
    indexDocument({ ...draft, editorDocument: null }).references[0].target,
    "abcdefghijkl",
  );
});
test("editor JSON and private fields never leak into publication front matter", () => {
  const source = serializePost(
    draftToPost(
      {
        ...draft,
        publishedFingerprint: "private-checkpoint",
        research: [{ body: "private review" }],
      },
      "2026-09-28T00:00:00Z",
    ),
  );
  assert.doesNotMatch(
    source,
    /block-12345|editorDocument|private-checkpoint|private review/,
  );
  assert.match(source, /#page=abcdefghijkl/);
});
test("collections combine rules and manual includes but always exclude trash", () => {
  const post = {
    id: "abcdefghijkl",
    title: "Writing notes",
    dek: "Research",
    tags: ["notes"],
    status: "draft",
    pinned: true,
  };
  assert.equal(
    inCollection(post, {
      query: "research",
      tag: "notes",
      status: "draft",
      pinned: true,
    }),
    true,
  );
  assert.equal(inCollection(post, { tag: "missing" }), false);
  assert.equal(
    inCollection(post, { tag: "missing", include: [post.id] }),
    true,
  );
  assert.equal(
    inCollection({ ...post, trashedAt: "now" }, { include: [post.id] }),
    false,
  );
});
test("research validation rejects active URLs and malformed page targets", () => {
  const input = {
    kind: "capture",
    title: "Source",
    body: "notes",
    url: "https://example.com",
  };
  assert.equal(cleanResearchItem(input, "research-123", "now").url, input.url);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:pass@example.com",
  ])
    assert.throws(() =>
      cleanResearchItem({ ...input, url }, "research-123", "now"),
    );
  assert.throws(() =>
    cleanResearchItem({ ...input, pageId: "../draft" }, "research-123", "now"),
  );
  assert.throws(() =>
    cleanResearchItem(
      { ...input, body: "a".repeat(100001) },
      "research-123",
      "now",
    ),
  );
});
test("link interaction targets move with preceding edits and invalidate when deleted", () => {
  const schema = getSchema([StarterKit]);
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("alpha link omega")),
  ]);
  const state = EditorState.create({ doc });
  assert.deepEqual(
    mapInteractionRange({ from: 7, to: 11 }, state.tr.insertText("new ", 1)),
    { from: 11, to: 15 },
  );
  assert.equal(
    mapInteractionRange({ from: 7, to: 11 }, state.tr.delete(7, 11)),
    null,
  );
});
test("published fingerprints detect external changes without line-ending false positives", async () => {
  assert.equal(
    await publishedFingerprint("one\r\ntwo"),
    await publishedFingerprint("one\ntwo"),
  );
  assert.notEqual(
    await publishedFingerprint("one"),
    await publishedFingerprint("two"),
  );
  assert.equal(await publishedFingerprint(null), null);
});
test("concurrent R2 draft writes fail closed instead of overwriting", async () => {
  let condition;
  const env = {
    WRITING: {
      head: async () => ({
        etag: "old",
        customMetadata: { updatedAt: draft.updatedAt },
      }),
      put: async (_key, _value, opts) => {
        condition = opts.onlyIf;
        return null;
      },
    },
  };
  await assert.rejects(putDraftIfVersion(env, draft, draft.updatedAt), {
    status: 409,
  });
  assert.deepEqual(condition, { etagMatches: "old" });
});
test("a retried create request returns its first draft without overwriting later edits",async()=>{
  const objects=new Map();
  const env={WRITING:{get:async key=>objects.has(key)?{json:async()=>JSON.parse(objects.get(key))}:null,put:async(key,value,options)=>{if(options?.onlyIf&&objects.has(key))return null;objects.set(key,value);return {etag:"created"};}}};
  const requestId="11111111-1111-4111-8111-111111111111";
  const call=()=>createPost({env,request:new Request("https://nazarene.dev/api/admin/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Extracted",body:"Selected words",requestId})})});
  const first=await (await call()).json();
  const key=`drafts/${first.post.id}/current.json`;
  objects.set(key,JSON.stringify({...first.post,body:"Edited after creation"}));
  const retry=await (await call()).json();
  assert.equal(retry.post.id,first.post.id);assert.equal(retry.post.body,"Edited after creation");
  assert.equal([...objects.keys()].filter(k=>k.endsWith("/current.json")).length,1);
});
test("research update refuses a stale base and a racing conditional write", async () => {
  const old = {
    id: "research-123",
    kind: "capture",
    title: "Source",
    body: "old",
    updatedAt: "old",
    createdAt: "older",
  };
  let puts = 0;
  const env = {
    WRITING: {
      get: async () => ({ etag: "etag", json: async () => old }),
      put: async () => {
        puts++;
        return null;
      },
    },
  };
  const call = (base) =>
    onRequestPut({
      env,
      params: { id: old.id },
      request: new Request(
        "https://nazarene.dev/api/admin/research/research-123",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...old, body: "new", base }),
        },
      ),
    });
  await assert.rejects(call("stale"), { status: 409 });
  assert.equal(puts, 0);
  await assert.rejects(call("old"), { status: 409 });
  assert.equal(puts, 1);
});
