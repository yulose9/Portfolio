import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { Callout } from "../app/admin/ui/extensions/blocks.ts";
import { calloutMeta, parseCalloutMeta } from "../cms/callout-icon.ts";
import { markdownToTree } from "../cms/render.ts";

const manager = new MarkdownManager({ extensions: [StarterKit, Callout] });
const all = (tree) => (tree.children ?? []).flatMap((n) => [n, ...all(n)]);
const cls = (n, c) => (n.properties?.className ?? []).includes(c);

test("a callout without its own icon is written exactly as before", () => {
  const md = "> [!NOTE]\n> Plain.";
  const doc = manager.parse(md);
  assert.equal(doc.content[0].attrs.icon, "");
  assert.equal(manager.serialize(doc).trim(), md);
});

test("callout icons round-trip: emoji raw, images encoded, none", () => {
  for (const icon of ["🔥", "/media/abc-256x256.webp", "https://example.com/a b].png".replace(" ", "%20"), "none"]) {
    const doc = manager.parse(`> [!TIP${calloutMeta(icon)}] Title\n> Body.`);
    const callout = doc.content[0];
    assert.equal(callout.attrs.icon, icon);
    assert.deepEqual(manager.parse(manager.serialize(doc)), doc);
  }
  assert.equal(calloutMeta("🔥"), "|icon=🔥");
  assert.equal(calloutMeta("/media/a.webp"), "|icon=%2Fmedia%2Fa.webp");
  assert.equal(calloutMeta("javascript:alert(1)"), "");
  assert.equal(parseCalloutMeta("icon=javascript%3Aalert(1)"), "");
  assert.equal(parseCalloutMeta("wide|icon=%2Fa.png"), "/a.png");
});

test("the site draws a callout's own icon, its image decorative", async () => {
  const tree = await markdownToTree(`> [!TIP${calloutMeta("/media/a-64x64.webp")}]\n> With an image.\n\n> [!NOTE|icon=🔥]\n> With an emoji.\n\n> [!NOTE|icon=none]\n> Without.\n\n> [!WARNING]\n> Default.`);
  const callouts = all(tree).filter((n) => cls(n, "callout"));
  assert.equal(callouts.length, 4);
  const [image, emoji, none, plain] = callouts;
  const img = all(image).find((n) => n.tagName === "img");
  assert.equal(img.properties.src, "/media/a-64x64.webp");
  assert.equal(img.properties.alt, "");
  assert.ok(cls(image.children[0], "callout-icon"));
  assert.equal(all(emoji).find((n) => cls(n, "fe")).children[0].value, "🔥");
  assert.equal(all(none).some((n) => cls(n, "callout-icon")), false);
  assert.equal(all(plain).find((n) => cls(n, "fe")).children[0].value, "⚠️");
  for (const c of callouts) assert.doesNotMatch(JSON.stringify(c), /\[!|icon=/);
});
