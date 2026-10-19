/**
 * Journal helpers shared by the list and the document: text out of an entry
 * (TipTap JSON, or legacy HTML strings), its preview, word count, which list
 * filter it belongs to, and the writing streak.
 */
import { addDays } from "./timeUtils";

type Node = { type?: string; text?: string; content?: Node[] };

/** Plain text from TipTap JSON, or from a legacy HTML string. */
export function entryText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") {
    return content
      .replace(/<(br|\/p|\/h\d|\/li)\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }
  const walk = (nodes?: Node[]): string =>
    (nodes || []).map((n) => (n.type === "text" ? n.text || "" : walk(n.content))).join(" ");
  return walk((content as Node).content).replace(/\s+/g, " ").trim();
}

/** The first 100 characters, the way entries have always previewed. */
export const entryPreview = (content: unknown): string => {
  const text = entryText(content);
  return text.length > 100 ? `${text.substring(0, 100)}...` : text;
};

export const wordCount = (content: unknown): number => {
  const text = entryText(content);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

export type JournalFilter = "all" | "today" | "week" | "month";

/** Is an entry written on `isoDate` inside `filter`, counted back from `today`? */
export function inFilter(isoDate: string | undefined, filter: JournalFilter, today: string): boolean {
  if (filter === "all") return true;
  if (!isoDate) return false;
  if (filter === "today") return isoDate === today;
  if (filter === "week") return isoDate > addDays(today, -7) && isoDate <= today;
  return isoDate.slice(0, 7) === today.slice(0, 7);
}

/** Consecutive days with at least one entry, ending today (or yesterday if today is still blank). */
export function writingStreak(isoDates: (string | undefined)[], today: string): number {
  const days = new Set(isoDates.filter(Boolean));
  let key = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(key)) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

/** "2:25 PM" ⇄ "14:25" for the time input; values already in 24-hour pass through. */
export function to24Hour(time12h?: string): string {
  if (!time12h) return "";
  if (!/AM|PM/i.test(time12h)) return time12h;
  const [time, modifier] = time12h.trim().split(/\s+/);
  let [h, m] = time.split(":").map(Number);
  if (h === 12) h = 0;
  if (/PM/i.test(modifier)) h += 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function to12Hour(time24h?: string): string {
  if (!time24h) return "";
  const [h, m] = time24h.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
