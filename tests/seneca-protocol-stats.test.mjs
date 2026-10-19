import test from "node:test";
import assert from "node:assert/strict";
import { dayRatio, habitTotals, monthRatios, periodDelta, periodRate } from "../lib/seneca/utils/protocolStats.ts";

const keys = ["a-1", "a-2", "b-1", "b-2"];
const history = {
  "a-1": { "2026-10-06": true, "2026-10-05": true, "2026-09-01": true },
  "a-2": { "2026-10-06": true, "2026-10-05": false },
  "b-1": { "2026-10-06": true },
  "stale-9": { "2026-10-06": true },
};

test("a day's ratio counts only checked tasks in the current protocol", () => {
  assert.equal(dayRatio(history, keys, "2026-10-06"), 0.75);
  assert.equal(dayRatio(history, keys, "2026-10-05"), 0.25);
  assert.equal(dayRatio(history, keys, "2026-01-01"), 0);
  assert.equal(dayRatio(history, [], "2026-10-06"), 0);
});

test("period rate averages across the window, including empty days", () => {
  assert.equal(periodRate(history, keys, "2026-10-06", 2), 0.5);
  assert.equal(periodRate(history, keys, "2026-10-06", 4), 0.25);
  assert.equal(periodRate(history, keys, "2026-10-06", 0), 0);
});

test("period delta compares against the window just before, in points", () => {
  // Last 2 days: 0.5 average. The 2 days before: 0. → +50 points.
  assert.equal(periodDelta(history, keys, "2026-10-06", 2), 50);
  // Shifted forward two days, the busy days are now the previous window.
  assert.equal(periodDelta(history, keys, "2026-10-08", 2), -50);
});

test("month ratios cover every day of the month, leap years included", () => {
  const oct = monthRatios(history, keys, 2026, 10);
  assert.equal(Object.keys(oct).length, 31);
  assert.equal(oct["2026-10-06"], 0.75);
  assert.equal(oct["2026-10-31"], 0);
  assert.equal(Object.keys(monthRatios({}, keys, 2028, 2)).length, 29);
});

test("habit totals rank by count and keep protocol order on ties", () => {
  assert.deepEqual(habitTotals(history, keys, "2026-10-06", 7), [
    { key: "a-1", count: 2 },
    { key: "a-2", count: 1 },
    { key: "b-1", count: 1 },
    { key: "b-2", count: 0 },
  ]);
  // A 40-day window reaches back to Sep 1.
  assert.equal(habitTotals(history, keys, "2026-10-06", 40)[0].count, 3);
});
