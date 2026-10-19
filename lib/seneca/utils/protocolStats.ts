/**
 * Read-only views over the protocol's task history for the Home dashboard.
 *
 * `history` is the ProtocolContext shape: { "<phase>-<taskId>": { "YYYY-MM-DD": boolean } }.
 * `keys` is the set of tasks that make up a full day, so a day's ratio is
 * done / keys.length. Tasks added later count against earlier days too; the
 * dashboard reads "how much of today's protocol did I do", not an audit.
 */
import { addDays } from "./timeUtils";

export type TaskHistory = Record<string, Record<string, boolean | undefined> | undefined>;

/** Share of `keys` checked on `day`, 0..1. An empty protocol is 0, never NaN. */
export const dayRatio = (history: TaskHistory, keys: readonly string[], day: string): number => {
  if (keys.length === 0) return 0;
  let done = 0;
  for (const key of keys) if (history[key]?.[day] === true) done++;
  return done / keys.length;
};

/** Mean daily ratio over the `days` days ending on `end` (inclusive). */
export const periodRate = (history: TaskHistory, keys: readonly string[], end: string, days: number): number => {
  if (days <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < days; i++) sum += dayRatio(history, keys, addDays(end, -i));
  return sum / days;
};

/**
 * This period against the one before it, in percentage points (rounded to
 * one decimal). 30 days → this month vs last month.
 */
export const periodDelta = (history: TaskHistory, keys: readonly string[], end: string, days: number): number => {
  const now = periodRate(history, keys, end, days);
  const before = periodRate(history, keys, addDays(end, -days), days);
  return Math.round((now - before) * 1000) / 10;
};

/** Ratio for every day of a calendar month (`month` is 1-12), keyed by date. */
export const monthRatios = (
  history: TaskHistory,
  keys: readonly string[],
  year: number,
  month: number,
): Record<string, number> => {
  const out: Record<string, number> = {};
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= length; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    out[key] = dayRatio(history, keys, key);
  }
  return out;
};

/** How many of the `days` days ending on `end` each task was checked, most first. */
export const habitTotals = (
  history: TaskHistory,
  keys: readonly string[],
  end: string,
  days: number,
): { key: string; count: number }[] =>
  keys
    .map((key) => {
      let count = 0;
      for (let i = 0; i < days; i++) if (history[key]?.[addDays(end, -i)] === true) count++;
      return { key, count };
    })
    .sort((a, b) => b.count - a.count || keys.indexOf(a.key) - keys.indexOf(b.key));
