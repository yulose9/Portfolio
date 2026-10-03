/*
 * Wall-clock values as the admin stores them: a day is "YYYY-MM-DD" and a
 * time is 24-hour "HH:MM", with no zone attached (the caller knows which zone
 * it means). These helpers turn them into what the pickers show and read
 * back whatever someone types into a time field.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30" → "2:30 PM". */
export function clockLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * Reads a typed time: "9", "9:30", "930", "9.30pm", "9 p", "14:30", "1430".
 * Returns 24-hour "HH:MM", or null when it isn't a time.
 */
export function parseClock(text: string): string | null {
  const q = text.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, ":");
  const match = /^(\d{1,2})(?::(\d{2}))?(a|am|p|pm)?$/.exec(q) ?? /^(\d{3,4})(a|am|p|pm)?$/.exec(q);
  if (!match) return null;
  let hours: number;
  let minutes: number;
  let meridiem: string | undefined;
  if (match.length === 4) {
    hours = Number(match[1]);
    minutes = Number(match[2] ?? 0);
    meridiem = match[3];
  } else {
    const digits = match[1];
    hours = Number(digits.slice(0, -2));
    minutes = Number(digits.slice(-2));
    meridiem = match[2];
  }
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem.startsWith("p") ? 12 : 0);
  } else if (hours > 23) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Every quarter hour of the day, as "HH:MM". */
export const quarterHours = Array.from({ length: 96 }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`);

/** Whether a typed query should keep a time in the suggestion list. */
export function clockMatches(time: string, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/[\s:.]/g, "");
  if (!q) return true;
  const label = clockLabel(time).toLowerCase().replace(/[\s:]/g, "");
  return label.startsWith(q) || time.replace(":", "").startsWith(q);
}

/** "YYYY-MM-DD" as a local Date at midnight, which is what a calendar grid shows. */
export function dayToDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** A calendar's local Date back to "YYYY-MM-DD". */
export const dateToDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Calendar arithmetic on "YYYY-MM-DD", free of the local zone's DST. */
export function addDays(day: string, days: number): string {
  const ms = Date.parse(`${day}T00:00:00Z`) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}
