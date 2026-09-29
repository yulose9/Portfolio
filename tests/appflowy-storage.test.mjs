import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPut as move } from "../functions/api/admin/posts/[id]/parent.ts";
import { onRequestPost as upload } from "../functions/api/admin/uploads.ts";
import { publish } from "../cms/server/publish.ts";
import { onRequestPut as reorder } from "../functions/api/admin/page-order.ts";

function bucket(initial = {}) {
  const objects = new Map(
    Object.entries(initial).map(([key, value]) => [
      key,
      {
        value: JSON.stringify(value),
        etag: "initial",
        customMetadata: { updatedAt: value.updatedAt },
      },
    ]),
  );
  let sequence = 0;
  return {
    objects,
    get: async (key) => {
      const o = objects.get(key);
      return o ? { ...o, json: async () => JSON.parse(o.value) } : null;
    },
    head: async (key) => objects.get(key) ?? null,
    put: async (key, value, options = {}) => {
      const previous = objects.get(key),
        condition = options.onlyIf;
      if (condition?.etagMatches && condition.etagMatches !== previous?.etag)
        return null;
      if (
        (condition?.etagDoesNotMatch === "*" ||
          (condition instanceof Headers &&
            condition.get("If-None-Match") === "*")) &&
        previous
      )
        return null;
      const o = {
        value,
        etag: `etag-${++sequence}`,
        customMetadata: options.customMetadata,
        httpMetadata: options.httpMetadata,
      };
      objects.set(key, o);
      return o;
    },
    delete: async (key) => {
      for (const k of Array.isArray(key) ? key : [key]) objects.delete(k);
    },
    list: async ({ prefix, delimiter }) => ({
      objects: delimiter
        ? []
        : [...objects]
            .filter(([k]) => k.startsWith(prefix))
            .map(([key, v]) => ({ key, ...v })),
      delimitedPrefixes: delimiter
        ? [
            ...new Set(
              [...objects.keys()]
                .filter((k) => k.startsWith(prefix))
                .map(
                  (k) => prefix + k.slice(prefix.length).split("/")[0] + "/",
                ),
            ),
          ]
        : [],
      truncated: false,
    }),
  };
}
const draft = (id) => ({
  id,
  title: "Writing",
  slug: `writing-${id}`,
  dek: "",
  body: "Original words",
  authors: [],
  fonts: null,
  icon: null,
  page: true,
  tags: [],
  cover: null,
  ogImage: null,
  parentId: null,
  status: "draft",
  dirty: true,
  publishedAt: null,
  publishAt: null,
  liveSlug: null,
  redirectFrom: [],
  createdAt: "2026-09-28T00:00:00.000Z",
  updatedAt: "2026-09-28T00:00:00.000Z",
});
const envFor = (WRITING) => ({
  WRITING,
  GITHUB_TOKEN: "fixture",
  GITHUB_REPO: "fixture/repo",
  GITHUB_BRANCH: "main",
});
const orderRequest = (
  ids,
  previousIds = ["aaaaaaaaaaaa", "bbbbbbbbbbbb"],
  parentId = null,
) =>
  new Request("https://example.test/api/admin/page-order", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, previousIds, parentId }),
  });
test("sibling order persists privately and a later reparent retains it", async () => {
  const a = "aaaaaaaaaaaa",
    b = "bbbbbbbbbbbb",
    WRITING = bucket({
      [`drafts/${a}/current.json`]: draft(a),
      [`drafts/${b}/current.json`]: draft(b),
    });
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([]);
  try {
    await reorder({ env: envFor(WRITING), request: orderRequest([b, a]) });
    assert.deepEqual(
      JSON.parse(WRITING.objects.get("meta/page-hierarchy.json").value).orders
        .root,
      [b, a],
    );
    assert.equal(
      JSON.parse(WRITING.objects.get(`drafts/${a}/current.json`).value)
        .updatedAt,
      draft(a).updatedAt,
    );
    await move({
      env: envFor(WRITING),
      params: { id: b },
      request: new Request("https://example.test/api/admin/posts/x/parent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: a, previousParentId: null }),
      }),
    });
    assert.deepEqual(
      JSON.parse(WRITING.objects.get("meta/page-hierarchy.json").value).orders
        .root,
      [b, a],
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("reordering rejects duplicate, foreign and stale sibling lists", async () => {
  const a = "aaaaaaaaaaaa",
    b = "bbbbbbbbbbbb",
    c = "cccccccccccc",
    WRITING = bucket({
      [`drafts/${a}/current.json`]: draft(a),
      [`drafts/${b}/current.json`]: draft(b),
      [`drafts/${c}/current.json`]: { ...draft(c), parentId: a },
    });
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([]);
  try {
    for (const ids of [[a, a], [a, c], [a]])
      await assert.rejects(
        reorder({ env: envFor(WRITING), request: orderRequest(ids) }),
      );
    await assert.rejects(
      reorder({ env: envFor(WRITING), request: orderRequest([b, a], [b, a]) }),
      (e) => e.status === 409,
    );
    assert.equal(WRITING.objects.has("meta/page-hierarchy.json"), false);
  } finally {
    globalThis.fetch = original;
  }
});
test("concurrent reorder and reparent cannot overwrite the shared graph", async () => {
  const a = "aaaaaaaaaaaa",
    b = "bbbbbbbbbbbb",
    WRITING = bucket({
      [`drafts/${a}/current.json`]: draft(a),
      [`drafts/${b}/current.json`]: draft(b),
    });
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([]);
  try {
    const results = await Promise.allSettled([
      reorder({ env: envFor(WRITING), request: orderRequest([b, a]) }),
      move({
        env: envFor(WRITING),
        params: { id: b },
        request: new Request("https://example.test/api/admin/posts/x/parent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: a, previousParentId: null }),
        }),
      }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      results.find((r) => r.status === "rejected").reason.status,
      409,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("simultaneous opposite page moves cannot commit a parent cycle", async () => {
  const a = "aaaaaaaaaaaa",
    b = "bbbbbbbbbbbb",
    WRITING = bucket({
      [`drafts/${a}/current.json`]: draft(a),
      [`drafts/${b}/current.json`]: draft(b),
    });
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([]);
  const request = (parentId) =>
    new Request("https://example.test/api/admin/posts/x/parent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, previousParentId: null }),
    });
  try {
    const outcomes = await Promise.allSettled([
      move({ env: envFor(WRITING), params: { id: a }, request: request(b) }),
      move({ env: envFor(WRITING), params: { id: b }, request: request(a) }),
    ]);
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    assert.equal(
      outcomes.find((o) => o.status === "rejected").reason.status,
      409,
    );
    const graph = JSON.parse(
      WRITING.objects.get("meta/page-hierarchy.json").value,
    ).parents;
    assert.ok(!(graph[a] === b && graph[b] === a));
  } finally {
    globalThis.fetch = original;
  }
});
test("immutable media retry accepts identical bytes and refuses changed bytes", async () => {
  const env = envFor(bucket()),
    name = "abcdefghijkl-100x100.png";
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const request = (value) =>
    new Request(`https://example.test/api/admin/uploads?name=${name}`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: value,
    });
  assert.equal((await upload({ env, request: request(bytes) })).status, 201);
  assert.equal((await upload({ env, request: request(bytes) })).status, 200);
  bytes[8] = 1;
  assert.equal((await upload({ env, request: request(bytes) })).status, 409);
});
test("publication keeps newer draft edits and retains the actual Git receipt", async () => {
  const original = globalThis.fetch,
    id = "aaaaaaaaaaaa",
    before = draft(id),
    key = `drafts/${id}/current.json`,
    WRITING = bucket({ [key]: before });
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/contents/content/writing")) return Response.json([]);
    if (path.includes("/contents/"))
      return new Response("missing", { status: 404 });
    if (path.endsWith("/git/ref/heads/main"))
      return Response.json({ object: { sha: "old-head" } });
    if (path.endsWith("/git/commits/old-head"))
      return Response.json({ tree: { sha: "old-tree" } });
    if (path.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
    if (path.endsWith("/git/commits"))
      return Response.json({ sha: "published-commit" });
    if (path.endsWith("/git/refs/heads/main") && init.method === "PATCH") {
      const newer = {
        ...before,
        body: "Newer private edits",
        updatedAt: "2026-09-28T00:01:00.000Z",
      };
      await WRITING.put(key, JSON.stringify(newer), {
        customMetadata: { updatedAt: newer.updatedAt },
      });
      return Response.json({});
    }
    throw new Error(`Unexpected fixture URL ${path}`);
  };
  try {
    const result = await publish(envFor(WRITING), before);
    assert.equal(result.body, "Newer private edits");
    assert.equal(result.dirty, true);
    assert.equal(result.publicationReceipt.commit, "published-commit");
    assert.equal(result.publicationReceipt.sourceUpdatedAt, before.updatedAt);
    assert.ok(WRITING.objects.has(`receipts/${id}/published-commit.json`));
  } finally {
    globalThis.fetch = original;
  }
});
