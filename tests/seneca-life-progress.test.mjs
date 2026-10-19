import test from "node:test";
import assert from "node:assert/strict";
import { lifeProgress, yearProgress } from "../lib/seneca/utils/lifeProgress.ts";

test("life progress for Mar 15 2000 toward 90", () => {
  const p = lifeProgress("2000-03-15", 90, "2026-10-06");
  assert.equal(p.years, 26);
  assert.equal(p.age, 26.5);
  assert.equal(p.pct, 29.5);
  assert.equal(p.daysLived, 9701);
  assert.ok(p.daysLeft > 23_100 && p.daysLeft < 23_200);
});

test("the target age changes the share, not the age", () => {
  const a = lifeProgress("2000-03-15", 76, "2026-10-06");
  assert.equal(a.age, 26.5);
  assert.equal(a.pct, 34.9);
});

test("birthdays: the day before is still the younger age", () => {
  assert.equal(lifeProgress("2000-03-15", 90, "2026-03-14").years, 25);
  assert.equal(lifeProgress("2000-03-15", 90, "2026-03-15").years, 26);
  assert.equal(lifeProgress("2000-03-15", 90, "2026-03-15").age, 26);
});

test("before birth and past the target clamp to 0% and 100%", () => {
  assert.equal(lifeProgress("2030-01-01", 90, "2026-10-06").pct, 0);
  const done = lifeProgress("1900-01-01", 90, "2026-10-06");
  assert.equal(done.pct, 100);
  assert.equal(done.daysLeft, 0);
});

test("year progress counts today as lived, leap years included", () => {
  assert.deepEqual(yearProgress("2026-10-06"), { year: 2026, dayOfYear: 279, daysInYear: 365, daysLeft: 86, pct: 76.4 });
  assert.equal(yearProgress("2026-01-01").daysLeft, 364);
  assert.equal(yearProgress("2026-12-31").daysLeft, 0);
  assert.equal(yearProgress("2026-12-31").pct, 100);
  assert.equal(yearProgress("2028-12-31").daysInYear, 366);
});
