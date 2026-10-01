import test from "node:test";
import assert from "node:assert/strict";
import { proseBlocks } from "../cms/server/prose-index.ts";
import { connectionHealth, unlinkedMentions } from "../cms/connections.ts";
import { researchIndex } from "../cms/server/research.ts";

const row = (id, title, text = "", references = []) => ({
  id,
  title,
  icon: null,
  updatedAt: "2026-10-01",
  references,
  mentionBlocks: [{ text }],
});
test("unlinked mentions match normalized whole titles and preserve display offsets", () => {
  const docs = [
    row("a", "Café"),
    row("b", "Notes", "Read the cafe\u0301 today."),
    row("c", "Unrelated", "cafeteria"),
    row("d", "Already linked", "Café", [{ target: "a" }]),
  ];
  const result = unlinkedMentions(docs, "a");
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "b");
  const hit = result.items[0];
  assert.equal(
    hit.snippet.slice(hit.start, hit.start + hit.length),
    "cafe\u0301",
  );
  assert.deepEqual(unlinkedMentions(docs, "missing"), { items: [], total: 0 });
});
test("suggestions are capped deterministically without hiding total or including self", () => {
  const docs = [
    row("target", "Topic", "Topic"),
    ...Array.from({ length: 35 }, (_, i) =>
      row(String(i).padStart(3, "0"), "Source", "Topic"),
    ),
  ];
  const result = unlinkedMentions(docs, "target");
  assert.equal(result.total, 35);
  assert.equal(result.items.length, 30);
  assert.equal(result.items[0].id, "000");
  assert.equal(
    unlinkedMentions([row("a", "Untitled"), row("b", "Other", "Untitled")], "a")
      .total,
    0,
  );
});
test("legacy prose skips code, links, images and HTML without joining across them", () => {
  const body =
    '# Normal **title**\n\nRead `code` here.\n\n[linked](https://example.com) ![image](x)\n\n~~~js\nHidden code\n~~~\n\nAlpha [link](x) Beta\n\n<a href="x">HTML link</a>';
  const blocks = proseBlocks({ body });
  const text = blocks.map((b) => b.text).join("|");
  assert.ok(text.includes("Normal title"));
  for (const hidden of [
    "Hidden",
    "linked",
    "image",
    "HTML",
    "Alpha Beta",
    "code",
  ])
    assert.ok(!text.includes(hidden), hidden);
});
test("structured prose retains block IDs, skips marked links and code", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { blockId: "block-12345" },
        content: [
          { type: "text", text: "Plain title" },
          {
            type: "text",
            text: "Linked title",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
        ],
      },
      { type: "codeBlock", content: [{ type: "text", text: "Hidden title" }] },
    ],
  };
  const result = proseBlocks({
    body: "checkpoint",
    editorDocument: { version: 1, markdown: "checkpoint", doc },
  });
  assert.deepEqual(result, [{ text: "Plain title", blockId: "block-12345" }]);
});
test("connection health counts unique pages, ignores self links and distinguishes missing targets", () => {
  const docs = [
    row("a", "A", "", [
      { target: "a" },
      { target: "b" },
      { target: "b" },
      { target: "missing" },
    ]),
    row("b", "B"),
    row("c", "C"),
  ];
  const rows = connectionHealth(docs);
  assert.deepEqual(
    rows.find((p) => p.id === "a"),
    { id: "a", title: "A", icon: null, incoming: 0, outgoing: 1, missing: 1 },
  );
  assert.equal(rows.find((p) => p.id === "b").incoming, 1);
  assert.equal(rows.find((p) => p.id === "c").outgoing, 0);
});

test("private indexes upgrade old caches, exclude trash and reuse current prose", async () => {
  const previous = globalThis.caches;
  globalThis.caches = { default: { match: async () => new Response("[]") } };
  const draft = (id, trashedAt = null) => ({
    id,
    title: "Source",
    body: "Plain **Topic**",
    tags: [],
    dek: "",
    status: "draft",
    dirty: true,
    updatedAt: "2026-10-01T00:00:00Z",
    trashedAt,
  });
  const live = draft("abcdefghijkl"),
    trash = draft("123456789abc", "2026-10-01");
  const objects = new Map([
    [`drafts/${live.id}/current.json`, live],
    [`drafts/${trash.id}/current.json`, trash],
    [
      `indexes/private/${live.id}.json`,
      { version: 2, updatedAt: live.updatedAt, searchText: "stale" },
    ],
  ]);
  let writes = 0;
  const env = {
    GITHUB_REPO: "test/repo",
    GITHUB_BRANCH: "test",
    WRITING: {
      list: async () => ({
        delimitedPrefixes: [live.id, trash.id].map((id) => `drafts/${id}/`),
        truncated: false,
      }),
      head: async (key) => ({
        customMetadata: { updatedAt: objects.get(key).updatedAt },
      }),
      get: async (key) =>
        objects.has(key) ? { json: async () => objects.get(key) } : null,
      put: async (key, value) => {
        writes++;
        objects.set(key, JSON.parse(value));
      },
    },
  };
  try {
    const rows = await researchIndex(env);
    assert.deepEqual(
      rows.map((row) => row.id),
      [live.id],
    );
    assert.equal(rows[0].version, 3);
    assert.deepEqual(rows[0].mentionBlocks, [{ text: "Plain Topic" }]);
    assert.equal(writes, 2);
    await researchIndex(env);
    assert.equal(writes, 2, "current cache should not rebuild");
  } finally {
    globalThis.caches = previous;
  }
});
