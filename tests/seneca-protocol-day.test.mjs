import test from "node:test";
import assert from "node:assert/strict";
import { validDayKey, summarizeDay, activityCompletions, protocolAttention } from "../lib/seneca/utils/protocolDay.ts";
import { SENECA_FEATURES, availableSenecaTab } from "../lib/seneca/features.ts";
import { withCivilService } from "../lib/seneca/utils/civilService.ts";
import { monthRatios } from "../lib/seneca/utils/protocolStats.ts";

test("date validation rejects impossible days and document path injection", () => {
  for (const value of ["2026-02-29", "2026-13-01", "../wealth", "2026-11-05/evil", "2026-1-1", "", "2026-02-30"]) assert.equal(validDayKey(value), false, value);
  assert.equal(validDayKey("2024-02-29"), true);
});
test("daily edits update totals without treating an empty phase as complete", () => {
  const result = summarizeDay({ arena: { tasks: [{ id: 1, title: "Read", done: true }, { id: 2, title: "Study", done: false }] }, shutdown: { tasks: [] } });
  assert.equal(result.total_tasks, 2);
  assert.equal(result.total_completed, 1);
  assert.equal(result.completion_rate, .5);
  assert.equal(result.all_phases_complete, false);
  assert.equal(result.phases.shutdown.is_complete, false);
  assert.equal(summarizeDay({}).all_phases_complete, false);
});
test("journal, exercise and multiple study subjects derive completion on their own dates", () => {
  assert.deepEqual(activityCompletions([{ isoDate: "2026-11-04" }, { isoDate: "2026-11-04" }, { isoDate: "2026-11-06" }], { "2026-11-03": true, "2026-11-04": false }, { "2026-11-01": true }, { aws: { history: { "2026-11-02": true } }, civil: { history: { "2026-11-02": true, bad: true } } }, "2026-11-05"), {
    "arena-1": ["2026-11-04"], "arena-5": ["2026-11-03"], "arena-4": ["2026-11-01", "2026-11-02"],
  });
});
test("reminders follow Manila noon, 1pm, 9pm and midnight boundaries", () => {
  const at = (iso, date = "2026-11-05", category = "personal") => protocolAttention(category, date, new Date(iso));
  assert.equal(at("2026-11-05T03:59:59Z").lunch, false);
  assert.equal(at("2026-11-05T04:00:00Z").lunch, true);
  assert.equal(at("2026-11-05T05:00:00Z").lunch, false);
  assert.equal(at("2026-11-05T12:59:59Z").shutdown, false);
  assert.equal(at("2026-11-05T13:00:00Z").shutdown, true);
  assert.equal(at("2026-11-05T16:00:00Z").shutdown, false);
  assert.equal(at("2026-11-05T04:00:00Z", "2026-11-04").lunch, false);
  assert.equal(at("2026-11-05T13:00:00Z", "2026-11-05", "work").shutdown, false);
});
test("disabled Wealth routes resolve to Home and other tabs are preserved", () => {
  assert.equal(SENECA_FEATURES.wealth, false);
  assert.equal(availableSenecaTab("wealth"), "home");
  assert.equal(availableSenecaTab("journal"), "journal");
});
test("Civil Service catalog addition preserves existing exam status and avoids duplicates", () => {
  const existing = [{ title: "My roadmap", subcategories: [{ modules: [{ name: "Civil Service Professional", status: "done" }] }] }];
  assert.equal(withCivilService(existing), existing);
  const added = withCivilService([{ title: "Custom", modules: [{ name: "My subject" }] }]);
  assert.equal(added[0].modules[0].name, "My subject");
  assert.equal(added[1].modules[0].name, "Civil Service Professional Exam");
  assert.equal(withCivilService(added), added);
});
test("editing a historical day changes its own calendar denominator only", () => {
  const history = { a: { "2026-11-01": true, "2026-11-02": true }, b: { "2026-11-01": false } };
  const ratios = monthRatios(history, ["a", "b"], 2026, 11, { "2026-11-01": ["a"] });
  assert.equal(ratios["2026-11-01"], 1);
  assert.equal(ratios["2026-11-02"], .5);
});
