import test from "node:test";
import assert from "node:assert/strict";
import { goalStreak, rewriteStreak, suggestGoals } from "../lib/seneca/utils/streaks.ts";

const today = "2026-10-06";

test("rewriting a streak ending yesterday sets exactly that many days and caps the run", () => {
  const history = { "2026-09-20": true, "2026-10-01": true };
  const next = rewriteStreak(history, 4, { today, includeToday: false });
  assert.deepEqual(
    ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"].map((d) => next[d]),
    [false, true, true, true, true],
  );
  assert.equal(next["2026-09-20"], true, "older history is untouched");
  assert.equal(goalStreak(next, today), 4);
});

test("a streak that includes today counts today", () => {
  const next = rewriteStreak({}, 3, { today, includeToday: true });
  assert.equal(next[today], true);
  assert.equal(goalStreak(next, today), 3);
});

test("defaulting includeToday follows whether today is already kept", () => {
  assert.equal(goalStreak(rewriteStreak({ [today]: true }, 10, { today }), today), 10);
  assert.equal(goalStreak(rewriteStreak({}, 10, { today }), today), 10);
  assert.equal(rewriteStreak({}, 10, { today })[today], undefined);
});

test("a zero streak clears today and breaks yesterday", () => {
  const next = rewriteStreak({ [today]: true, "2026-10-05": true, "2026-10-04": true }, 0, { today, includeToday: true });
  assert.equal(next[today], undefined);
  assert.equal(next["2026-10-05"], false);
  assert.equal(goalStreak(next, today), 0);
});

test("suggestions put a streak at risk first, then open goals, then finished ones", () => {
  const goals = [{ id: "done" }, { id: "open" }, { id: "short" }, { id: "long" }];
  const histories = {
    done: { [today]: true },
    open: {},
    short: { "2026-10-05": true },
    long: { "2026-10-05": true, "2026-10-04": true, "2026-10-03": true },
  };
  const picks = suggestGoals(goals, histories, today);
  assert.deepEqual(picks.map((p) => p.id), ["long", "short", "open", "done"]);
  assert.equal(picks[0].reason, "Keep your 3-day streak alive");
  assert.equal(picks[3].reason, "Done today");
  assert.equal(picks[2].keptToday, false);
});
