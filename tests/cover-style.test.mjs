import test from "node:test";
import assert from "node:assert/strict";
import { coverObjectPosition, coverPosition, coverStyle, withCoverPosition, withCoverStyle } from "../cms/cover.ts";
import { parsePost, serializePost } from "../cms/format.ts";

test("cover style: classic by default, banner kept through the post file", () => {
  const cover = { src: "/media/a.webp", alt: "A" };
  assert.equal(coverStyle(cover), "classic");
  assert.equal(coverStyle(null), "classic");
  const banner = withCoverStyle(cover, "banner");
  assert.equal(coverStyle(banner), "banner");
  assert.deepEqual(withCoverStyle(banner, "classic"), cover, "classic drops the field");
  const post = { id: "abcdefghijkl", title: "T", slug: "t", dek: "", icon: null, authors: [], fonts: null, page: true, ogImage: null, tags: [], cover: banner, publishedAt: "2026-01-01", updatedAt: "2026-01-01", redirectFrom: [], body: "Hi" };
  assert.equal(coverStyle(parsePost(serializePost(post)).cover), "banner");
});

test("cover position: middle by default, clamped, kept through the post file, dropped at 50", () => {
  const cover = { src: "/media/a.webp", alt: "A" };
  assert.equal(coverPosition(cover), 50);
  assert.equal(coverObjectPosition(cover), "50% 50%");
  const high = withCoverPosition(withCoverStyle(cover, "banner"), 12.345);
  assert.equal(coverPosition(high), 12.3);
  assert.equal(coverPosition(withCoverPosition(cover, 140)), 100);
  assert.deepEqual(withCoverPosition(high, 50), withCoverStyle(cover, "banner"), "the default isn't stored");
  assert.equal(coverStyle(withCoverStyle(high, "classic")), "classic");
  assert.equal(coverPosition(withCoverStyle(high, "classic")), 12.3, "switching style keeps the position");
  const post = { id: "abcdefghijkl", title: "T", slug: "t", dek: "", icon: null, authors: [], fonts: null, page: true, ogImage: null, tags: [], cover: high, publishedAt: "2026-01-01", updatedAt: "2026-01-01", redirectFrom: [], body: "Hi" };
  assert.equal(coverPosition(parsePost(serializePost(post)).cover), 12.3);
});
