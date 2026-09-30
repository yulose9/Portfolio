import type { Editorial } from "./editorial";

type Reviewable = {
  id: string;
  editorial?: Editorial;
  trashedAt?: string | null;
};
const offset = 8 * 60 * 60 * 1000;

/** Display dates in Manila, consistently with the publication calendar. */
export function reviewInput(iso: string): string {
  return new Date(Date.parse(iso) + offset).toISOString().slice(0, 16);
}
export function reviewInstant(value: string): string | null {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return null;
  const ms = Date.parse(`${value}:00+08:00`);
  if (!Number.isFinite(ms)) return null;
  const iso = new Date(ms).toISOString();
  return reviewInput(iso) === value ? iso : null;
}
export function reviewPreset(days: number, now = Date.now()): string {
  const date = new Date(now + offset);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(9, 0, 0, 0);
  return new Date(date.getTime() - offset).toISOString();
}
export function reviewQueue<T extends Reviewable>(posts: T[], now: number) {
  const ordered = posts
    .filter(
      (p) =>
        !p.trashedAt &&
        p.editorial?.reviewAt &&
        Number.isFinite(Date.parse(p.editorial.reviewAt)),
    )
    .sort(
      (a, b) =>
        Date.parse(a.editorial!.reviewAt!) -
          Date.parse(b.editorial!.reviewAt!) || a.id.localeCompare(b.id),
    );
  return {
    due: ordered.filter((p) => Date.parse(p.editorial!.reviewAt!) <= now),
    later: ordered.filter((p) => Date.parse(p.editorial!.reviewAt!) > now),
  };
}
