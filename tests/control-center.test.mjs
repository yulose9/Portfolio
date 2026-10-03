import test from "node:test";
import assert from "node:assert/strict";
import { analyticsRange } from "../cms/analytics.ts";
import { publishedWebsite, validateWebsite } from "../cms/website.ts";
import { cleanProject } from "../cms/projects.ts";
import { draftToPost, parsePost, serializePost } from "../cms/format.ts";
import { saveWebsite, restoreWebsite } from "../cms/server/website.ts";
import { analyticsReport } from "../cms/server/analytics.ts";
import { projectEnvironment } from "../cms/server/project-environment.ts";

test("analytics only accepts bounded real calendar ranges and fixed scopes", () => {
  assert.equal(analyticsRange("2026-09-01", "2026-09-30", "writing").days, 30);
  for (const [from, to, scope] of [["2026-02-30", "2026-03-01", "all"], ["2025-01-01", "2026-10-01", "all"], ["2026-01-01", "2026-01-02", "all' OR 1=1"], ["2026-02-01", "2026-01-01", "all"]]) assert.throws(() => analyticsRange(from, to, scope));
});
test("website fields preserve data while rejecting executable URLs and duplicate sections", () => {
  const result = validateWebsite(publishedWebsite);
  assert.equal(result.profile.name, publishedWebsite.profile.name);
  assert.equal(result.tools.length, publishedWebsite.tools.length);
  const bad = structuredClone(publishedWebsite); bad.profile.employerUrl = "javascript:alert(1)";
  assert.throws(() => validateWebsite(bad));
  bad.profile.employerUrl = "https://example.com"; bad.tabs.push(bad.tabs[0]);
  assert.throws(() => validateWebsite(bad));
  assert.throws(() => cleanProject({ links: [{ label: "Bad", href: "//evil.example" }] }));
});
test("website saves compare versions and use conditional storage without publishing", async () => {
  let record = { content: publishedWebsite, version: "one", source: "published" };
  let etag = "v1";
  const writes = [];
  const env = { WRITING: {
    get: async () => ({ etag, json: async () => structuredClone(record) }),
    put: async (key, value, options) => {
      writes.push(key);
      if (key === "website/draft.json") {
        assert.equal(options.onlyIf.get("If-Match"), etag);
        record = JSON.parse(value); etag = "v2";
      }
      return { etag };
    },
  } };
  await assert.rejects(saveWebsite(env, { content: publishedWebsite, base: "stale" }), /another session/);
  assert.equal(writes.length, 0);
  const saved = await saveWebsite(env, { content: publishedWebsite, base: "one" });
  assert.notEqual(saved.version, "one"); assert.equal(saved.source, "published");
  assert.ok(writes[1].startsWith("website/revisions/"));
});
test("project namespace preserves writing objects and strips private storage prefixes from lists", async () => {
  const calls = [];
  const env = projectEnvironment({ WRITING: {
    get: async key => { calls.push(key); return null; },
    put: async key => { calls.push(key); return null; },
    list: async options => { calls.push(options.prefix); return { objects: [{ key: `${options.prefix}id/current.json` }], delimitedPrefixes: [`${options.prefix}id/`], truncated: false }; },
  } });
  await env.WRITING.get("drafts/id/current.json");
  const list = await env.WRITING.list({ prefix: "drafts/" });
  assert.equal(calls[0], "workspaces/projects/drafts/id/current.json");
  assert.equal(list.objects[0].key, "drafts/id/current.json");
  assert.equal(list.delimitedPrefixes[0], "drafts/id/");
});
test("project metadata and identity survive the published Markdown round trip", () => {
  const draft = { kind: "project", project: cleanProject({ role: "Engineer", featured: true, links: [{ label: "Site", href: "https://example.com" }] }), id: "abcdefghijkl", parentId: null, title: "Case study", slug: "case-study", dek: "Summary", body: "# Work", authors: [], tags: [], redirectFrom: [], page: true, publishedAt: null };
  const post = parsePost(serializePost(draftToPost(draft, "2026-10-01T00:00:00Z")));
  assert.equal(post.kind, "project"); assert.equal(post.project.role, "Engineer"); assert.equal(post.project.featured, true);
});

test("restoring website history creates a private version without rewinding the public base", async () => {
  const version = "a1234567-1234-1234-1234-123456789012";
  const current = { content: publishedWebsite, version: "current", source: "latest-publication" };
  const old = { content: { ...publishedWebsite, profile: { ...publishedWebsite.profile, name: "Earlier name" } }, version, source: "old-publication" };
  const writes = [];
  const env = { WRITING: {
    get: async key => ({ etag: "current-etag", json: async () => key.includes("revisions/") ? old : current }),
    put: async (key, value) => { writes.push(key); return { etag: "next-etag" }; },
  } };
  const restored = await restoreWebsite(env, { version, base: "current" });
  assert.equal(restored.content.profile.name, "Earlier name");
  assert.equal(restored.source, "latest-publication");
  assert.notEqual(restored.version, version);
  assert.ok(writes.every(key => key.startsWith("website/")));
  await assert.rejects(restoreWebsite(env, { version, base: "stale" }), /another session/);
  await assert.rejects(restoreWebsite(env, { version: "../../draft", base: "current" }), /Invalid/);
});

test("analytics compares all page views in both periods and fills missing calendar days", async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    [["2026-09-29", 9, 4], ["2026-10-01", 5, 3]],
    [["previous", 2, 1, 2, 0, 4], ["current", 1, 1, 1, 1, 12]],
    [], [[0, 0, 0, 0, 0, 0]],
  ];
  globalThis.fetch = async () => new Response(JSON.stringify({ results: responses.shift() }), { headers: { "Content-Type": "application/json" } });
  try {
    const report = await analyticsReport({ POSTHOG_PROJECT_ID: "1", POSTHOG_QUERY_KEY: "test-key", WRITING: { get: async () => null, put: async () => ({}) } }, new URLSearchParams({ from: "2026-10-01", to: "2026-10-02", scope: "all" }));
    assert.equal(report.totals.views, 5);
    assert.equal(report.previous.views, 9);
    assert.deepEqual(report.days[1], { day: "2026-10-02", views: 0, visitors: 0 });
  } finally { globalThis.fetch = originalFetch; }
});
