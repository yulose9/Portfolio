import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewQueue,
  reviewPreset,
  reviewInput,
  reviewInstant,
} from "../cms/review-queue.ts";

test("review queue partitions at the exact instant and excludes trash or missing dates", () => {
  const now = Date.parse("2026-10-01T01:00:00Z");
  const row = (id, reviewAt, trashedAt = null) => ({
    id,
    editorial: { reviewAt },
    trashedAt,
  });
  const posts = [
    row("future", "2026-10-02T01:00:00Z"),
    row("now", "2026-10-01T01:00:00Z"),
    row("old", "2026-09-01T00:00:00Z"),
    row("trash", "2026-09-01T00:00:00Z", "deleted"),
    row("none", null),
    row("bad", "invalid"),
  ];
  const queue = reviewQueue(posts, now);
  assert.deepEqual(
    queue.due.map((p) => p.id),
    ["old", "now"],
  );
  assert.deepEqual(
    queue.later.map((p) => p.id),
    ["future"],
  );
  assert.equal(posts[0].id, "future");
});
test("review presets use Manila calendar days across UTC and year boundaries", () => {
  const now = Date.parse("2026-12-31T17:00:00Z");
  assert.equal(reviewPreset(1, now), "2027-01-02T01:00:00.000Z");
  assert.equal(reviewPreset(7, now), "2027-01-08T01:00:00.000Z");
});
test("custom review dates round trip and reject normalized invalid dates", () => {
  assert.equal(reviewInstant("2026-10-01T00:30"), "2026-09-30T16:30:00.000Z");
  assert.equal(reviewInput("2026-09-30T16:30:00.000Z"), "2026-10-01T00:30");
  for (const value of [
    "",
    "2026-02-30T09:00",
    "2026-13-01T09:00",
    "2026-10-01T24:00",
  ])
    assert.equal(reviewInstant(value), null);
});
