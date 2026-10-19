// @ts-nocheck
/**
 * Streak rules over { "YYYY-MM-DD": boolean } histories (Manila calendar days).
 */
import { addDays, getPhDateKey } from "./timeUtils";

/**
 * Study streak: consecutive `true` days ending today. Today may still be
 * unanswered; a `false` day, or any earlier unanswered day, ends it.
 */
export const studyStreak = (history: Record<string, boolean | undefined> = {}, today = getPhDateKey()): number => {
  let streak = 0;
  for (let i = 0, key = today; i < 365; i++, key = addDays(key, -1)) {
    if (history[key] === true) streak++;
    else if (history[key] === false || i > 0) break;
  }
  return streak;
};

/** Goal streak: consecutive `true` days ending today, or yesterday if today isn't done yet. */
export const goalStreak = (history: Record<string, boolean | undefined> = {}, today = getPhDateKey()): number => {
  let key = history[today] === true ? today : addDays(today, -1);
  let streak = 0;
  while (history[key] === true) {
    streak++;
    key = addDays(key, -1);
  }
  return streak;
};

/**
 * Set the current streak to exactly `length` days, for when the log fell
 * behind the life. The run ends today (`includeToday`, the default when today
 * is already kept) or yesterday; the day before it is marked missed so it
 * can't merge with an older run. Every other day is left as it was.
 */
export const rewriteStreak = (
  history: Record<string, boolean | undefined> = {},
  length: number,
  { today = getPhDateKey(), includeToday = history?.[today] === true }: { today?: string; includeToday?: boolean } = {},
): Record<string, boolean | undefined> => {
  const n = Math.max(0, Math.floor(length));
  const keepToday = includeToday && n > 0;
  const next = { ...(history || {}) };
  const end = keepToday ? today : addDays(today, -1);
  if (!keepToday && next[today] === true) delete next[today];
  for (let i = 0; i < n; i++) next[addDays(end, -i)] = true;
  next[addDays(end, -n)] = false;
  return next;
};

export type GoalPick = { id: string; streak: number; keptToday: boolean; reason: string; rank: number };

/**
 * Which goals deserve the Home card today, best first: a live streak not yet
 * kept today (don't break it — longest first), then goals still open today,
 * then the ones already done. Ties keep the goals' own order.
 */
export const suggestGoals = (
  goals: { id: string }[],
  histories: Record<string, Record<string, boolean | undefined> | undefined>,
  today = getPhDateKey(),
): GoalPick[] =>
  goals
    .map((g, order) => {
      const history = histories?.[g.id] || {};
      const keptToday = history[today] === true;
      const streak = goalStreak(history, today);
      const rank = keptToday ? 2 : streak > 0 ? 0 : 1;
      const reason = keptToday
        ? "Done today"
        : streak > 0
          ? `Keep your ${streak}-day streak alive`
          : "Not logged today";
      return { id: g.id, streak, keptToday, reason, rank, order };
    })
    .sort((a, b) => a.rank - b.rank || (a.rank === 0 ? b.streak - a.streak : 0) || a.order - b.order)
    .map(({ order: _order, ...pick }) => pick);
