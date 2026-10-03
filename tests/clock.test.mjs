import test from "node:test";
import assert from "node:assert/strict";
import { addDays, clockLabel, clockMatches, dateToDay, dayToDate, parseClock, quarterHours } from "../app/admin/ui/clock.ts";

test("typed times read as 24-hour HH:MM", () => {
  for (const [typed, want] of [["9", "09:00"], ["9:30", "09:30"], ["930", "09:30"], ["9.30pm", "21:30"], ["9 p", "21:00"], ["12am", "00:00"], ["12 PM", "12:00"], ["14:30", "14:30"], ["1430", "14:30"], ["0:05", "00:05"]])
    assert.equal(parseClock(typed), want, typed);
  for (const typed of ["", "25:00", "13pm", "9:60", "noon", "0am"]) assert.equal(parseClock(typed), null, typed);
});

test("time labels, quarter hours and matching", () => {
  assert.equal(clockLabel("00:00"), "12:00 AM");
  assert.equal(clockLabel("14:05"), "2:05 PM");
  assert.equal(quarterHours.length, 96);
  assert.equal(quarterHours[37], "09:15");
  assert.ok(clockMatches("21:30", "9:3"));
  assert.ok(clockMatches("21:30", "930p"));
  assert.ok(clockMatches("21:30", "21"));
  assert.ok(!clockMatches("09:30", "930p"));
});

test("calendar days convert without drifting across zones", () => {
  assert.equal(dateToDay(dayToDate("2026-03-08")), "2026-03-08");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});
