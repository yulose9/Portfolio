import test from "node:test";
import assert from "node:assert/strict";
import { entryPreview, entryText, inFilter, to12Hour, to24Hour, wordCount, writingStreak } from "../lib/seneca/utils/journal.ts";

const doc = {
  type: "doc",
  content: [
    { type: "heading", content: [{ type: "text", text: "Morning" }] },
    { type: "paragraph", content: [{ type: "text", text: "The obstacle" }, { type: "text", text: "is the way." }] },
  ],
};

test("text comes out of TipTap JSON and of legacy HTML alike", () => {
  assert.equal(entryText(doc), "Morning The obstacle is the way.");
  assert.equal(entryText("<p>Hello&nbsp;<b>world</b></p><p>again &amp; again</p>"), "Hello world again & again");
  assert.equal(entryText(null), "");
  assert.equal(wordCount(doc), 6);
  assert.equal(wordCount(""), 0);
});

test("previews keep the old 100-character cut", () => {
  const long = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a".repeat(150) }] }] };
  assert.equal(entryPreview(long), "a".repeat(100) + "...");
  assert.equal(entryPreview(doc), "Morning The obstacle is the way.");
});

test("filters: today, the last seven days, this month", () => {
  const today = "2026-10-06";
  assert.ok(inFilter("2026-10-06", "today", today));
  assert.ok(!inFilter("2026-10-05", "today", today));
  assert.ok(inFilter("2026-09-30", "week", today));
  assert.ok(!inFilter("2026-09-29", "week", today));
  assert.ok(inFilter("2026-10-01", "month", today));
  assert.ok(!inFilter("2026-09-30", "month", today));
  assert.ok(inFilter(undefined, "all", today));
  assert.ok(!inFilter(undefined, "week", today));
});

test("the writing streak counts back from today, or yesterday if today is blank", () => {
  assert.equal(writingStreak(["2026-10-06", "2026-10-05", "2026-10-03"], "2026-10-06"), 2);
  assert.equal(writingStreak(["2026-10-05", "2026-10-04"], "2026-10-06"), 2);
  assert.equal(writingStreak(["2026-10-01"], "2026-10-06"), 0);
});

test("time converts between the stored 12-hour and the input's 24-hour", () => {
  assert.equal(to24Hour("2:25 PM"), "14:25");
  assert.equal(to24Hour("12:05 AM"), "00:05");
  assert.equal(to24Hour("12:30 PM"), "12:30");
  assert.equal(to24Hour("09:15"), "09:15");
  assert.equal(to12Hour("14:25"), "2:25 PM");
  assert.equal(to12Hour("00:05"), "12:05 AM");
  assert.equal(to12Hour(""), "");
});
