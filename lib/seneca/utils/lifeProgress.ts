/**
 * How much of a life, and of a year, has passed — for the life calendar
 * under Home's month. Dates are "YYYY-MM-DD" calendar days (Manila), so the
 * maths is timezone-free.
 */

const DAY = 86_400_000;
const utc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** The date `years` after `birth` (Feb 29 birthdays land on Mar 1 in common years). */
const anniversary = (birth: string, years: number) => {
  const [y, m, d] = birth.split("-").map(Number);
  return Date.UTC(y + years, m - 1, d);
};

export type LifeProgress = {
  /** 0–100, one decimal */
  pct: number;
  /** Exact age in years, one decimal */
  age: number;
  /** Whole years completed */
  years: number;
  daysLived: number;
  daysLeft: number;
  targetAge: number;
};

export function lifeProgress(birth: string, targetAge: number, today: string): LifeProgress {
  const start = utc(birth);
  const now = utc(today);
  const end = anniversary(birth, targetAge);
  const span = Math.max(1, end - start);
  const lived = Math.min(Math.max(0, now - start), span);

  let years = new Date(now).getUTCFullYear() - new Date(start).getUTCFullYear();
  if (anniversary(birth, years) > now) years--;
  years = Math.max(0, years);
  const thisBirthday = anniversary(birth, years);
  const nextBirthday = anniversary(birth, years + 1);
  const age = years + (now - thisBirthday) / (nextBirthday - thisBirthday);

  return {
    pct: Math.round((lived / span) * 1000) / 10,
    age: Math.floor(Math.max(0, age) * 10) / 10,
    years,
    daysLived: Math.round(lived / DAY),
    daysLeft: Math.max(0, Math.round((end - now) / DAY)),
    targetAge,
  };
}

export type YearProgress = { year: number; dayOfYear: number; daysInYear: number; daysLeft: number; pct: number };

/** Today counts as lived: Jan 1 is day 1, Dec 31 leaves 0 days. */
export function yearProgress(today: string): YearProgress {
  const year = Number(today.slice(0, 4));
  const start = Date.UTC(year, 0, 1);
  const daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - start) / DAY);
  const dayOfYear = Math.round((utc(today) - start) / DAY) + 1;
  return {
    year,
    dayOfYear,
    daysInYear,
    daysLeft: daysInYear - dayOfYear,
    pct: Math.round((dayOfYear / daysInYear) * 1000) / 10,
  };
}
