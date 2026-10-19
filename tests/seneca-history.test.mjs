import test from "node:test";
import assert from "node:assert/strict";
import { balanceHistory, recordDelta } from "../lib/seneca/utils/accountHistory.ts";
import { streaks, summarize } from "../lib/seneca/utils/historyStats.ts";

test("an account's line is rebuilt from its records, ending at today's balance", () => {
  const records = [
    { date: "2026-10-18T03:00:00Z", type: "deposit", amount: 500, accountId: "gcash" },
    { date: "2026-10-19T03:00:00Z", type: "withdrawal", amount: 200, accountId: "gcash" },
    { date: "2026-10-19T04:00:00Z", type: "withdrawal", amount: 999, accountId: "bpi" },
  ];
  const line = balanceHistory({ id: "gcash", amount: 1300 }, records, false, "2026-10-19", 3);
  assert.deepEqual(line, [
    { date: "2026-10-17", value: 1000 },
    { date: "2026-10-18", value: 1500 },
    { date: "2026-10-19", value: 1300 },
  ]);
});

test("record effects follow the ledger: transfers, borrowing and debt payments", () => {
  assert.equal(recordDelta({ date: "", type: "transfer", amount: 100, fee: 5, accountId: "a", destinationId: "b" }, "a", false), -10500);
  assert.equal(recordDelta({ date: "", type: "transfer", amount: 100, accountId: "a", destinationId: "b" }, "b", false), 10000);
  assert.equal(recordDelta({ date: "", type: "borrow", amount: 50, accountId: "loan", destinationId: "a" }, "loan", true), 5000);
  assert.equal(recordDelta({ date: "", type: "payment", amount: 50, accountId: "loan", destinationId: "a" }, "a", false), -5000);
  assert.equal(recordDelta({ date: "", type: "adjustment", amount: 20, accountId: "loan", category: "Liabilities", adjustmentDirection: "down" }, "loan", true), -2000);
});

test("streaks count consecutive days at 80%+, and today doesn't break one", () => {
  const days = ["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"].map((date) => ({ date, completion: 0.9 }));
  days.push({ date: "2026-10-19", completion: 0.3 });
  days.push({ date: "2026-10-10", completion: 1 });
  assert.deepEqual(streaks(days, "2026-10-19"), { current: 4, longest: 4 });
});

test("the analytics block is computed from the days, not left at its defaults", () => {
  const days = [
    { date: "2026-10-12", completion: 1, journalEntries: 1, updated: "2026-10-12T00:30:00Z" }, // Monday, 8:30 Manila
    { date: "2026-10-13", completion: 0.5, journalEntries: 0, updated: "2026-10-13T01:00:00Z" },
    { date: "2026-10-14", completion: null, journalEntries: 2, updated: null },
  ];
  const s = summarize(days, "2026-10-14");
  assert.equal(s.totalDaysTracked, 3);
  assert.equal(s.averageCompletionRate, 75);
  assert.equal(s.mostProductiveDay, "Monday");
  assert.equal(s.favoriteTimeToLog, "morning");
  assert.equal(s.totalJournalEntries, 3);
});
