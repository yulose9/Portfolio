import test from "node:test";
import assert from "node:assert/strict";
import { convertDocument, parseConversionInput } from "../cms/server/convert.ts";
import { onRequestPost } from "../functions/api/admin/convert.ts";
import { onRequestGet as listResearch } from "../functions/api/admin/research/index.ts";
import { projectEnvironment } from "../cms/server/project-environment.ts";

class Bucket {
  records = new Map(); serial = 0; beforePut;
  async put(key, value, options = {}) {
    this.beforePut?.(key, value);
    if (options.onlyIf?.etagDoesNotMatch === "*" && this.records.has(key)) return null;
    const text = String(value), etag = `etag-${++this.serial}`;
    this.records.set(key, { text, etag, metadata: options.customMetadata ?? {} });
    return { key, etag };
  }
  async get(key) {
    const record = this.records.get(key);
    return record ? { key, etag: record.etag, size: Buffer.byteLength(record.text), customMetadata: record.metadata,
      text: async () => record.text, json: async () => JSON.parse(record.text) } : null;
  }
  head(key) { return this.get(key); }
  async list({ prefix = "", delimiter } = {}) {
    const objects = [], prefixes = new Set();
    for (const [key, record] of [...this.records].sort()) {
      if (!key.startsWith(prefix)) continue;
      const tail = key.slice(prefix.length);
      if (delimiter && tail.includes(delimiter)) { prefixes.add(prefix + tail.split(delimiter)[0] + delimiter); continue; }
      objects.push({ key, etag: record.etag, size: Buffer.byteLength(record.text), customMetadata: record.metadata });
    }
    return { objects, delimitedPrefixes: [...prefixes], truncated: false };
  }
}
const at = "2026-11-06T10:00:00.000Z";
const draft = (extra = {}) => ({ id: "abcdefghijkl", title: "Study", slug: "study", dek: "A real project", tags: ["Design"], body: "Some words.", icon: "📓", authors: [{ name: "Writer" }], fonts: null,
  page: true, ogImage: null, cover: { src: "/media/2026/abcdefghijkl-200x200.webp", width: 200, height: 200, alt: "Sketch" }, status: "published", pinned: true, publishedAt: at, publishAt: null, liveSlug: "study", redirectFrom: ["old-study"], createdAt: at, updatedAt: at, dirty: false,
  ...extra });
const input = (extra = {}) => ({ version: 1, sourceWorkspace: "writing", id: "abcdefghijkl", base: at, ...extra });
async function setup(t, source = draft(), workspace = "writing") {
  const bucket = new Bucket();
  const prefix = workspace === "projects" ? "workspaces/projects/" : "";
  await bucket.put(`${prefix}drafts/${source.id}/current.json`, JSON.stringify(source));
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  return { env: { WRITING: bucket, GITHUB_TOKEN: "test-only", GITHUB_REPO: "test/repo", GITHUB_BRANCH: "test" }, bucket, prefix };
}

test("conversion validates its namespace, identity and optimistic version", async t => {
  const { env } = await setup(t);
  for (const value of [null, {}, input({ id: "../private" }), input({ sourceWorkspace: "other" }), { ...input(), destination: "arbitrary" }]) assert.throws(() => parseConversionInput(value));
  await assert.rejects(convertDocument(env, input({ base: "2026-11-05T10:00:00.000Z" })), error => error.code === "source_changed");
  await assert.rejects(convertDocument({ ...env, contentKind: "projects" }, input()), error => error.code === "invalid_namespace");
});

test("copy preserves content, media, metadata, history and source; retry is idempotent", async t => {
  const source = draft({ project: { role: "Engineer", timeframe: "2026", tools: ["TypeScript"], links: [], outcomes: [], featured: true, order: 1 } });
  const { env, bucket } = await setup(t, source);
  await bucket.put(`drafts/${source.id}/rev/${at}.json`, JSON.stringify(source), { customMetadata: { label: "Before change", words: "2" } });
  const original = bucket.records.get(`drafts/${source.id}/current.json`).text;
  const [first, second] = await Promise.all([convertDocument(env, input()), convertDocument(env, input())]);
  assert.equal(first.post.id, second.post.id);
  assert.equal(first.targetWorkspace, "projects");
  assert.equal(first.post.kind, "project");
  for (const key of ["title", "body", "dek", "cover", "authors", "icon", "project", "fonts", "tags"]) assert.deepEqual(first.post[key], source[key]);
  assert.equal(first.post.status, "draft"); assert.equal(first.post.liveSlug, null); assert.equal(first.post.publishAt, null);
  assert.equal(first.revisionCount, 1);
  const revision = await bucket.get(`workspaces/projects/drafts/${first.post.id}/rev/${at}.json`);
  assert.equal(revision.customMetadata.label, "Before change");
  assert.equal((await revision.json()).body, source.body);
  assert.equal(bucket.records.get(`drafts/${source.id}/current.json`).text, original);
  assert.equal((await convertDocument(env, input())).replayed, true);
});

test("Project to Writing keeps dormant project properties for a later roundtrip", async t => {
  const source = draft({ kind: "project", project: { role: "Engineer", tools: ["React"] } });
  const { env } = await setup(t, source, "projects");
  const result = await convertDocument(env, input({ sourceWorkspace: "projects" }));
  assert.equal(result.targetWorkspace, "writing"); assert.equal(result.post.kind, undefined);
  assert.deepEqual(result.post.project, source.project);
  assert.equal(result.post.body, source.body);
});

test("incomplete writes expose no draft and a retry resumes staged history", async t => {
  const source = draft();
  const { env, bucket } = await setup(t, source);
  await bucket.put(`drafts/${source.id}/rev/${at}.json`, JSON.stringify(source));
  bucket.beforePut = key => { if (/^workspaces\/projects\/drafts\/.+\/current.json$/.test(key)) throw new Error("Network lost"); };
  await assert.rejects(convertDocument(env, input()), error => error.code === "copy_incomplete");
  assert.equal([...bucket.records.keys()].filter(k => /^workspaces\/projects\/drafts\/.+\/current.json$/.test(k)).length, 0);
  bucket.beforePut = undefined;
  assert.equal((await convertDocument(env, input())).revisionCount, 1);
});

test("a saved destination is never overwritten by a retry", async t => {
  const { env, bucket } = await setup(t);
  const result = await convertDocument(env, input());
  const key = `workspaces/projects/drafts/${result.post.id}/current.json`;
  await bucket.put(key, JSON.stringify({ ...result.post, title: "Edited copy" }));
  assert.equal((await convertDocument(env, input())).post.title, "Edited copy");
  await bucket.put(key, JSON.stringify({ ...result.post, creationRequestId: "someone-else" }));
  await assert.rejects(convertDocument(env, input()), error => error.code === "destination_conflict");
});

test("unsupported children, private references and polls fail before destination writes", async t => {
  const { env, bucket } = await setup(t);
  await bucket.put("drafts/mnopqrstuvwx/current.json", JSON.stringify(draft({ id: "mnopqrstuvwx", parentId: "abcdefghijkl" })));
  await assert.rejects(convertDocument(env, input()), error => error.code === "subtree_unsupported");
  bucket.records.delete("drafts/mnopqrstuvwx/current.json");
  for (const body of ["[Private](#page=mnopqrstuvwx)", '<div data-poll="live">Poll</div>', "[Pending media: file.png]"]) {
    await bucket.put("drafts/abcdefghijkl/current.json", JSON.stringify(draft({ body })));
    await assert.rejects(convertDocument(env, input()), error => ["unsafe_reference", "unsafe_media"].includes(error.code));
  }
  assert.equal([...bucket.records.keys()].some(key => key.startsWith("workspaces/projects/")), false);
});

test("conversion API requires authenticated same-origin admin writes", async t => {
  const { env } = await setup(t);
  const request = new Request("https://site.test/api/admin/convert", { method: "POST", body: JSON.stringify(input()), headers: { "Content-Type": "application/json" } });
  assert.equal((await onRequestPost({ env, request, data: {} })).status, 401);
  assert.equal((await onRequestPost({ env, request, data: { email: "test@example.test" } })).status, 403);
});

const note = (extra = {}) => ({ id: 'review-note-1', kind: 'review', title: 'Check the explanation',
  body: '[This page](#page=abcdefghijkl)', pageId: 'abcdefghijkl', blockId: 'block-12345',
  sourceUpdatedAt: at, resolved: false, createdAt: at, updatedAt: at, ...extra });

test('linked notes, excerpts and captures keep their content and block references in either direction', async t => {
  for (const workspace of ['writing', 'projects']) {
    const { env, bucket, prefix } = await setup(t, draft(), workspace);
    const originals = ['review', 'excerpt', 'capture'].map(kind => note({ id: `${kind}-note-123`, kind }));
    for (const item of originals) await bucket.put(`${prefix}research/${item.id}.json`, JSON.stringify(item));
    const result = await convertDocument(env, input({ sourceWorkspace: workspace }));
    assert.equal(result.researchCount, 3);
    const target = workspace === 'writing' ? projectEnvironment(env) : env;
    const copied = (await (await listResearch({ env: target })).json()).items;
    assert.equal(copied.length, 3);
    for (const original of originals) {
      const copy = copied.find(item => item.kind === original.kind);
      assert.notEqual(copy.id, original.id);
      for (const key of ['title', 'blockId', 'resolved', 'createdAt', 'updatedAt']) assert.equal(copy[key], original[key]);
      assert.equal(copy.pageId, result.post.id);
      assert.equal(copy.body, `[This page](#page=${result.post.id})`);
      assert.equal(copy.sourceUpdatedAt, result.post.updatedAt);
      assert.deepEqual(await (await bucket.get(`${prefix}research/${original.id}.json`)).json(), original);
    }
    assert.equal((await convertDocument(env, input({ sourceWorkspace: workspace }))).replayed, true);
    assert.equal((await (await listResearch({ env: target })).json()).items.length, 3);
  }
});

test('interrupted copies keep staged research invisible; retry reveals one complete copy', async t => {
  const { env, bucket } = await setup(t);
  await bucket.put('research/review-note-1.json', JSON.stringify(note()));
  bucket.beforePut = key => { if (/^workspaces\/projects\/drafts\/.+\/current.json$/.test(key)) throw new Error('Disconnected'); };
  await assert.rejects(convertDocument(env, input()), error => error.code === 'copy_incomplete');
  const target = projectEnvironment(env);
  assert.equal((await (await listResearch({ env: target })).json()).items.length, 0);
  assert.equal([...bucket.records.keys()].filter(k => k.startsWith('workspaces/projects/research/')).length, 1);
  bucket.beforePut = undefined;
  const completed = await convertDocument(env, input());
  assert.equal(completed.researchCount, 1);
  const copied = (await (await listResearch({ env: target })).json()).items[0];
  await target.WRITING.put(`research/${copied.id}.json`, JSON.stringify({ ...copied, body: 'Edited after conversion' }));
  await convertDocument(env, input());
  assert.equal((await (await target.WRITING.get(`research/${copied.id}.json`)).json()).body, 'Edited after conversion');
});

test('research changed during staging prevents visibility without deleting source or staged recovery data', async t => {
  const { env, bucket } = await setup(t);
  await bucket.put('research/review-note-1.json', JSON.stringify(note()));
  bucket.beforePut = key => {
    if (key.startsWith('workspaces/projects/research/')) {
      const original = bucket.records.get('research/review-note-1.json');
      bucket.records.set('research/review-note-1.json', { ...original, text: JSON.stringify(note({ body: 'New review' })), etag: 'changed' });
    }
  };
  await assert.rejects(convertDocument(env, input()), error => error.code === 'source_changed');
  assert.equal((await (await listResearch({ env: projectEnvironment(env) })).json()).items.length, 0);
  assert.equal((await (await bucket.get('research/review-note-1.json')).json()).body, 'New review');
});

test('cross-page research and collection membership still fail before destination writes', async t => {
  for (const item of [note({ body: '[Other](#page=mnopqrstuvwx)' }), note({ kind: 'collection', rules: { include: ['abcdefghijkl', 'mnopqrstuvwx'] } })]) {
    const { env, bucket } = await setup(t);
    await bucket.put(`research/${item.id}.json`, JSON.stringify(item));
    await assert.rejects(convertDocument(env, input()), error => ['unsafe_reference', 'linked_collection'].includes(error.code));
    assert.equal([...bucket.records.keys()].some(key => key.startsWith('workspaces/projects/')), false);
  }
});
