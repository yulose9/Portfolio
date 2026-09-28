import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { normalizedText, searchDocuments } from "../cms/search.ts";
import { ancestors, canParent } from "../cms/page-tree.ts";
import { readClipboard } from "../cms/clipboard.ts";
import { cleanEditorial, publicationChecks } from "../cms/editorial.ts";
import { draftToPost, serializePost } from "../cms/format.ts";
import {
  mediaJobs,
  saveMediaJob,
  removeMediaJob,
  preparedMediaPart,
} from "../app/admin/ui/media-journal.ts";

test("normalized search retains display offsets and filters before limiting", () => {
  const text = "The cafe\u0301 changes";
  const n = normalizedText(text),
    at = n.value.indexOf("cafe");
  assert.equal(text.slice(n.starts[at], n.ends[at + 3]), "cafe\u0301");
  const base = {
    version: 2,
    title: "Café writing",
    dek: "",
    text: "Research source material",
    blocks: [],
    references: [],
    tags: ["Essay"],
    status: "draft",
    updatedAt: "2026-09-28",
    dirty: true,
  };
  const docs = [
    { ...base, id: "a", parentId: null },
    { ...base, id: "b", parentId: "a", status: "published" },
    { ...base, id: "c", parentId: null },
  ];
  assert.deepEqual(
    searchDocuments(docs, "cafe material", {
      mode: "words",
      root: "a",
      status: "published",
    }).map((d) => d.id),
    ["b"],
  );
  assert.equal(
    searchDocuments(docs, "cafe material", { mode: "phrase" }).length,
    0,
  );
  assert.equal(searchDocuments(docs, "research", { tag: "Missing" }).length, 0);
});
test("parent choices reject cycles and ancestors tolerate malformed legacy graphs", () => {
  const pages = [
    { id: "a", title: "A" },
    { id: "b", title: "B", parentId: "a" },
    { id: "c", title: "C", parentId: "b" },
  ];
  assert.equal(canParent(pages, "a", "c"), false);
  assert.equal(canParent(pages, "b", "b"), false);
  assert.equal(canParent(pages, "b", null), true);
  assert.deepEqual(
    ancestors(pages, "c").map((p) => p.id),
    ["a", "b"],
  );
  assert.equal(
    ancestors(
      [
        { id: "a", title: "A", parentId: "b" },
        { id: "b", title: "B", parentId: "a" },
      ],
      "a",
    ).length,
    1,
  );
});
test("internal clipboard remaps identities and rejects unsafe or future formats", () => {
  const v = {
    version: 1,
    openStart: 0,
    openEnd: 0,
    content: [
      {
        type: "paragraph",
        attrs: { blockId: "abcdefgh", privateNote: "secret" },
        content: [
          {
            type: "text",
            text: "Hello",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
        ],
      },
    ],
  };
  const result = readClipboard(JSON.stringify(v));
  assert.ok(result);
  assert.notEqual(result.content[0].attrs.blockId, "abcdefgh");
  assert.equal(result.content[0].attrs.privateNote, undefined);
  v.content[0].content[0].marks[0].attrs.href = "javascript:alert(1)";
  assert.equal(readClipboard(JSON.stringify(v)), null);
  assert.equal(readClipboard(JSON.stringify({ ...v, version: 2 })), null);
});
test("review metadata is private and pending media blocks publication", () => {
  assert.equal(
    cleanEditorial({ stage: "review", reviewAt: "2026-10-01T09:00Z" }).reviewAt,
    "2026-10-01T09:00:00.000Z",
  );
  assert.throws(() => cleanEditorial({ stage: "publish", reviewAt: null }));
  assert.equal(
    publicationChecks({ body: "[Pending media: hello.jpg]" })[0].ok,
    false,
  );
  const draft = {
    id: "abcdefghijkl",
    title: "Test",
    slug: "test",
    body: "Hello",
    dek: "",
    tags: [],
    authors: [],
    cover: null,
    fonts: null,
    page: true,
    icon: null,
    ogImage: null,
    publishedAt: null,
    redirectFrom: [],
    editorial: { stage: "review", reviewAt: null, timezone: "UTC" },
    publicationReceipt: { commit: "secret" },
  };
  const output = serializePost(draftToPost(draft, "2026-09-28T00:00:00Z"));
  assert.ok(!output.includes("editorial"));
  assert.ok(!output.includes("secret"));
});
test("media journal retains source bytes and completed results independently of page mounting", async () => {
  globalThis.indexedDB = indexedDB;
  const job = {
    version: 1,
    id: "upload1",
    documentId: "doc1",
    blockId: "block1",
    name: "photo.png",
    mime: "image/png",
    file: new Blob(["bytes"]),
    state: "queued",
    attempts: 0,
    updatedAt: 1,
  };
  await saveMediaJob(job);
  assert.equal(await (await mediaJobs("doc1"))[0].file.text(), "bytes");
  assert.deepEqual(await mediaJobs("doc2"), []);
  await saveMediaJob({
    ...job,
    file: undefined,
    state: "complete",
    result: { kind: "image", src: "/media/test.webp", width: 100, height: 50 },
  });
  assert.equal((await mediaJobs("doc1"))[0].result.width, 100);
  await removeMediaJob(job.id);
  assert.deepEqual(await mediaJobs("doc1"), []);
});

test("upload retries reuse original encoded bytes and discard clears local parts", async () => {
  globalThis.indexedDB = indexedDB;
  const id = "12345678-1234-1234-1234-123456789abc",
    name = id.replaceAll("-", "").slice(0, 24) + "-100x100.webp";
  assert.equal(
    await (await preparedMediaPart(name, 2026, new Blob(["first"]))).text(),
    "first",
  );
  assert.equal(
    await (
      await preparedMediaPart(name, 2026, new Blob(["different encode"]))
    ).text(),
    "first",
  );
  await removeMediaJob(id);
  assert.equal(
    await (await preparedMediaPart(name, 2026, new Blob(["new file"]))).text(),
    "new file",
  );
});
