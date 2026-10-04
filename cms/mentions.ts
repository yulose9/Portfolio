export type MentionDate = { date: string; time: string | null };
export const MENTION_ZONE = "Asia/Manila";
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: MENTION_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const fullFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const weekFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" });
const DAY = 86400000;
export const todayDate = (now = Date.now()) => dayFormat.format(new Date(now));
export function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const stamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === date;
}
export const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export function parseDateHref(href: string): MentionDate | null {
  const match = /^#date=(\d{4}-\d{2}-\d{2})(?:&time=(\d{2}:\d{2}))?$/.exec(href);
  return match && validDate(match[1]) && (!match[2] || validTime(match[2])) ? { date: match[1], time: match[2] ?? null } : null;
}
export const dateHref = ({ date, time }: MentionDate) => `#date=${date}${time ? `&time=${time}` : ""}`;
export const fullMentionDate = ({date, time}: MentionDate) => `${fullFormat.format(new Date(`${date}T00:00:00Z`))}${time ? ` at ${time}` : ""}`;
export function mentionDateLabel(value: MentionDate, now: number | null): string {
  if (now === null) return fullMentionDate(value);
  const delta = Math.round((Date.parse(`${value.date}T00:00:00Z`) - Date.parse(`${todayDate(now)}T00:00:00Z`)) / DAY);
  let relative: string | null = null;
  if (delta === 0) relative = "Today";
  else if (delta === -1) relative = "Yesterday";
  else if (delta === 1) relative = "Tomorrow";
  else if (delta < -1 && delta > -7) relative = `${Math.abs(delta)} days ago`;
  else if (delta === -7) relative = "1 week ago";
  else if (delta > 1 && delta < 7) relative = `in ${delta} days`;
  else if (delta === 7) relative = "in 1 week";
  else relative = null;
  return relative ? `${relative}${value.time ? ` at ${value.time}` : ""}` : fullMentionDate(value);
}
export function parseDateQuery(query: string, now = Date.now()): MentionDate | null {
  let q = query.trim().toLowerCase().replace(/^@/, "");
  const clock = /\s+(\d{1,2}:\d{2})$/.exec(q);
  const time = clock ? clock[1].padStart(5, "0") : null;
  if (time && !validTime(time)) return null;
  if (clock) q = q.slice(0, clock.index).trim();
  const base = Date.parse(`${todayDate(now)}T00:00:00Z`);
  let offset: number;
  if (q === "today") offset = 0;
  else if (q === "yesterday") offset = -1;
  else if (q === "tomorrow") offset = 1;
  else if (validDate(q)) return { date: q, time };
  else {
    const match = /^(?:(last|next)\s+)?(sun(?:day)?|mon(?:day)?|tue(?:s|sday|sy)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?)$/.exec(q);
    if (!match) return null;
    const weekday = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(match[2].slice(0, 3));
    const current = new Date(base).getUTCDay();
    offset = match[1] === "last" ? -((current - weekday + 7) % 7 || 7)
      : match[1] === "next" ? ((weekday - current + 7) % 7 || 7) : (weekday - current + 7) % 7;
  }
  return { date: new Date(base + offset * DAY).toISOString().slice(0, 10), time };
}
export const pageMentionId = (href: string) => /^#page=([a-z0-9]{12})$/.exec(href)?.[1] ?? null;
