/**
 * Figures over the kept days, for Home's history panel and for the
 * `analytics` block in preferences/settings (which until now held the
 * defaults it was created with: "Monday", "morning", zeros).
 */

import { addDays } from "./timeUtils";

type Day = { date: string; completion: number | null; journalEntries?: number; transactions?: number; updated?: string | null };

/** A day counts toward a streak when at least this much of the protocol was kept. */
export const STREAK_THRESHOLD = 0.8;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

/** Morning, afternoon, evening or night, by Manila hour. */
function partOfDay(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const hour = (new Date(t).getUTCHours() + 8) % 24;
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

const mode = (values: (string | null)[]) => {
  const counts = new Map<string, number>();
  values.forEach((v) => v && counts.set(v, (counts.get(v) || 0) + 1));
  let best: string | null = null;
  counts.forEach((n, v) => {
    if (!best || n > (counts.get(best) || 0)) best = v;
  });
  return best;
};

/** Streaks over consecutive calendar days ending today (current) and anywhere (longest). */
export function streaks(days: Day[], today: string) {
  const kept = new Set(days.filter((d) => (d.completion ?? 0) >= STREAK_THRESHOLD).map((d) => d.date));
  let current = 0;
  // Today still counts as open: a streak isn't broken until the day is over.
  let cursor = kept.has(today) ? today : addDays(today, -1);
  while (kept.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  [...kept].sort().forEach((date) => {
    run = prev && addDays(prev, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  });
  return { current, longest };
}

export function summarize(days: Day[], today: string, totals: { journalEntries?: number; transactions?: number } = {}) {
  const rated = days.filter((d) => d.completion !== null);
  const average = rated.length ? rated.reduce((s, d) => s + (d.completion || 0), 0) / rated.length : 0;

  const byWeekday = new Map<string, { sum: number; n: number }>();
  rated.forEach((d) => {
    const w = weekday(d.date);
    const cell = byWeekday.get(w) || { sum: 0, n: 0 };
    cell.sum += d.completion || 0;
    cell.n++;
    byWeekday.set(w, cell);
  });
  let mostProductiveDay: string | null = null;
  let bestRate = -1;
  byWeekday.forEach(({ sum, n }, w) => {
    if (sum / n > bestRate) {
      bestRate = sum / n;
      mostProductiveDay = w;
    }
  });

  const { current, longest } = streaks(days, today);
  return {
    totalDaysTracked: days.length,
    currentStreak: current,
    longestStreak: longest,
    averageCompletionRate: Math.round(average * 1000) / 10,
    mostProductiveDay,
    favoriteTimeToLog: mode(days.map((d) => (d.updated ? partOfDay(d.updated) : null))),
    totalJournalEntries: totals.journalEntries ?? days.reduce((s, d) => s + (d.journalEntries || 0), 0),
    totalTransactions: totals.transactions ?? days.reduce((s, d) => s + (d.transactions || 0), 0),
  };
}
