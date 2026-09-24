/**
 * "today", "yesterday", "three days ago", "a week ago", "two months ago"…
 *
 * Counted in calendar days in one time zone, not in elapsed hours: a commit
 * at 11pm is "yesterday" the next morning, not "today" until 11pm comes round
 * again. That is how people talk about when something happened.
 *
 * Numbers are words ("three weeks ago", not "3 weeks ago"). It reads as a
 * sentence rather than a readout, and keeps days, weeks and months in one
 * voice. Past twelve it falls back to digits, which nobody reads as odd.
 */

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

const word = (n: number) => WORDS[n] ?? String(n);

/** "a week", "two weeks" — the singular reads as "a", like people say it. */
const unit = (n: number, singular: string) =>
  n === 1 ? `a ${singular}` : `${word(n)} ${singular}s`;

type CalendarDate = { y: number; m: number; d: number };

function calendarDate(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

const dayNumber = ({ y, m, d }: CalendarDate) => Math.round(Date.UTC(y, m - 1, d) / 86_400_000);

export function relativeDay(then: Date, now: Date, timeZone: string): string {
  const a = calendarDate(then, timeZone);
  const b = calendarDate(now, timeZone);
  const days = dayNumber(b) - dayNumber(a);

  // A commit dated in the future means a skewed clock somewhere; "today" is
  // the honest reading rather than "in two hours".
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${word(days)} days ago`;

  // Whole calendar months, so the 3rd to the 3rd is "a month" whether the
  // month in between had 28 days or 31.
  const months = (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0);

  if (months < 1) {
    // 7–29 days: weeks. Capped at four so it never says "five weeks ago" for
    // something that is really "a month ago".
    return `${unit(Math.min(Math.floor(days / 7), 4), "week")} ago`;
  }
  if (months < 12) return `${unit(months, "month")} ago`;
  return `${unit(Math.floor(months / 12), "year")} ago`;
}
