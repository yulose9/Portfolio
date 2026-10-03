import assert from "node:assert/strict";
import test from "node:test";

import {
  isMediaPart,
  MEDIA_LIMITS,
  mediaDimensions,
  mediaParts,
  parseMediaDetails,
  replacementAllowed,
  replacementProblem,
  validateMediaDetails,
  versionedSrc,
} from "../cms/media-details.ts";

test("stored details parse with defaults, so files written before captions still read", () => {
  assert.deepEqual(parseMediaDetails({ title: "Cat", alt: "A cat", trashed: true }), {
    title: "Cat",
    alt: "A cat",
    caption: "",
    trashed: true,
  });
  assert.deepEqual(parseMediaDetails(null), { title: "", alt: "", caption: "", trashed: false });
  assert.deepEqual(parseMediaDetails(["x"]), { title: "", alt: "", caption: "", trashed: false });
  assert.deepEqual(parseMediaDetails({ title: 4, caption: "Hi", trashed: "yes" }), {
    title: "",
    alt: "",
    caption: "Hi",
    trashed: false,
  });
  assert.equal(parseMediaDetails({ caption: "x".repeat(5000) }).caption.length, MEDIA_LIMITS.caption);
});

test("details validate per field against 200 / 1000 / 2000 characters, after trimming", () => {
  assert.deepEqual(validateMediaDetails({ title: "x".repeat(200), alt: "x".repeat(1000), caption: "x".repeat(2000) }), {});
  assert.deepEqual(validateMediaDetails({ title: `  ${"x".repeat(200)}  ` }), {});
  const errors = validateMediaDetails({ title: "x".repeat(201), alt: "x".repeat(1001), caption: "x".repeat(2001) });
  assert.deepEqual(Object.keys(errors).sort(), ["alt", "caption", "title"]);
  assert.match(errors.title, /201 characters; the limit is 200/);
  assert.match(validateMediaDetails({ alt: 3 }).alt, /must be text/);
  // A missing field (an older client) is not an error.
  assert.deepEqual(validateMediaDetails({ title: "a" }), {});
});

test("an image may only be replaced by an image, video and audio by the same format", () => {
  assert.equal(replacementAllowed("image/webp", "image/jpeg"), true);
  assert.equal(replacementAllowed("image/gif", "image/webp"), true);
  assert.equal(replacementAllowed("image/webp", "video/mp4"), false);
  assert.equal(replacementAllowed("video/mp4", "video/mp4"), true);
  assert.equal(replacementAllowed("video/mp4", "video/webm"), false);
  assert.equal(replacementAllowed("video/mp4", "image/webp"), false);
  assert.equal(replacementAllowed("audio/mp4", "audio/mp4"), true);
  assert.equal(replacementAllowed("audio/mp4", "video/mp4"), false);
  assert.equal(replacementAllowed("image/webp", "image/svg+xml"), false);
  assert.equal(replacementAllowed("application/octet-stream", "image/webp"), false);
  assert.equal(replacementProblem("image/webp", "image/png"), null);
  assert.match(replacementProblem("image/webp", "video/mp4"), /only be replaced by another image/);
  assert.match(replacementProblem("video/mp4", "image/webp"), /a video file.*another video file/);
  assert.match(replacementProblem("video/mp4", "video/webm"), /MP4 file/);
  assert.match(replacementProblem("image/webp", "image/svg+xml"), /can't be stored/);
});

test("a photo's parts are its smaller widths first and the main file last", () => {
  const src = "/media/2026/abcdefghij12-2048x1365.webp";
  assert.deepEqual(mediaParts(src, "image/webp"), [
    { name: "abcdefghij12-640.webp", role: "variant", width: 640, height: 427 },
    { name: "abcdefghij12-1280.webp", role: "variant", width: 1280, height: 853 },
    { name: "abcdefghij12-2048x1365.webp", role: "main", width: 2048, height: 1365 },
  ]);
  assert.deepEqual(
    mediaParts("/media/2026/abcdefghij12-900x600.webp", "image/webp").map((p) => p.name),
    ["abcdefghij12-640.webp", "abcdefghij12-900x600.webp"],
  );
  assert.deepEqual(mediaParts("/media/2026/abcdefghij12-1280x720.mp4", "video/mp4"), [
    { name: "abcdefghij12-poster.webp", role: "poster", width: 1280 },
    { name: "abcdefghij12-1280x720.mp4", role: "main", width: 1280, height: 720 },
  ]);
  assert.deepEqual(mediaParts("/media/2026/abcdefghij12-0x0.gif", "image/gif"), [{ name: "abcdefghij12-0x0.gif", role: "main" }]);
  assert.deepEqual(mediaParts("/media/2026/abcdefghij12-37s.m4a", "audio/mp4"), [{ name: "abcdefghij12-37s.m4a", role: "main" }]);
  assert.deepEqual(mediaParts("/media/2025/oldstyle123.webp", "image/webp"), [{ name: "oldstyle123.webp", role: "main" }]);
});

test("only an asset's own files may be written by a replacement", () => {
  const src = "/media/2026/abcdefghij12-2048x1365.webp";
  assert.equal(isMediaPart(src, "abcdefghij12-2048x1365.webp"), true);
  assert.equal(isMediaPart(src, "abcdefghij12-640.webp"), true);
  assert.equal(isMediaPart(src, "abcdefghij12-poster.webp"), true);
  assert.equal(isMediaPart(src, "zzzzzzzzzz12-640.webp"), false);
  assert.equal(isMediaPart(src, "abcdefghij12-640.webp/../x"), false);
  assert.equal(isMediaPart(src, "../2025/abcdefghij12-640.webp"), false);
  assert.equal(isMediaPart("/media/2025/oldstyle123.webp", "oldstyle123-640.webp"), false);
});

test("dimensions come from the name, and the admin URL carries the version", () => {
  assert.deepEqual(mediaDimensions("/media/2026/abcdefghij12-2048x1365.webp"), { width: 2048, height: 1365 });
  assert.equal(mediaDimensions("/media/2026/abcdefghij12-0x0.gif"), null);
  assert.equal(mediaDimensions("/media/2026/abcdefghij12-640.webp"), null);
  assert.equal(versionedSrc("/media/2026/a.webp", null), "/media/2026/a.webp");
  assert.equal(versionedSrc("/media/2026/a.webp", "m1x2"), "/media/2026/a.webp?v=m1x2");
});
