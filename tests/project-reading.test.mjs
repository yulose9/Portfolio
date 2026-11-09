import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { markdownToTree, outline } from "../cms/render.ts";
import { parsePost } from "../cms/format.ts";
import { cleanPageIcon, pageIconSrc } from "../cms/page-icon.ts";

test("unsectioned portfolio has real, stable navigation anchors without changed prose", async () => {
  const post = parsePost(fs.readFileSync("content/projects/this-portfolio-redesigned.md", "utf8"));
  const tree = await markdownToTree(post.body);
  const text = node => node.value ?? node.children?.map(text).join("") ?? "";
  const before = text(tree);
  const items = outline(tree);
  assert.ok(items.length >= 2 && items.length <= 6);
  for (const item of items) assert.ok(tree.children.some(n => n.properties?.id === item.id));
  assert.equal(text(tree), before);
  assert.deepEqual(outline(tree), items);
});

test("authored headings remain the primary outline; short notes get none", async () => {
  assert.deepEqual(outline(await markdownToTree("Small note.")), []);
  assert.deepEqual(outline(await markdownToTree("## Context\n\nWords.\n\n## Result\n\nMore words.")).map(i => i.text), ["Context", "Result"]);
});

test("page icons preserve uploaded paths and reject active/external markup", () => {
  const icon = "/media/2026/abcdefghijklmnopqrstuvwx-256x256.webp";
  assert.equal(cleanPageIcon(icon), icon);
  assert.equal(pageIconSrc(icon), icon);
  assert.match(pageIconSrc("🧑‍🎨"), /^https:\/\/cdn\.jsdelivr\.net\/.+\.webp$/);
  for (const bad of ["javascript:alert(1)", "https://example.com/x.svg", "<svg onload=x>", "/media/2026/../../private.png", "data:image/svg+xml,evil"]) assert.equal(cleanPageIcon(bad), null);
});
