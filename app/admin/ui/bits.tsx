"use client";

import type { Draft } from "./api";
import { Switch } from "../../components/kit/switch";

/** Small shared pieces: status wording, the status dot, relative times. */

export function statusLabel(p: { status: Draft["status"]; dirty: boolean; publishAt: string | null; page?: boolean }): string {
  if (p.status === "scheduled") return "Scheduled";
  // One word for the state everywhere: the filter, toasts and History say "Published" too.
  const live = p.page === false ? "Published, listed only" : "Published";
  if (p.status === "published") return p.dirty ? `${live}, with unpublished changes` : live;
  return "Draft";
}

/**
 * Page or listed-only. A switch, because it's a setting that holds, not an
 * action; the label under it says what readers will get either way.
 */
export function PageSwitch({ page, slug, onChange }: { page: boolean; slug: string; onChange: (page: boolean) => void }) {
  return (
    <div className="switch-row">
      <span className="switch-text" id="page-switch-label">
        <span className="switch-title">Has its own page</span>
        <span className="field-help">
          {page
            ? `Readers can open it at /writing/${slug || "…"}.`
            : "Only the title and date show in the Writing list. It isn’t a link, and it stays out of search and the feed."}
        </span>
      </span>
      <Switch checked={page} onCheckedChange={(next) => onChange(next)} aria-labelledby="page-switch-label" />
    </div>
  );
}

export function StatusDot({ status, dirty }: { status: Draft["status"]; dirty: boolean }) {
  return <span className="admin-dot" data-status={status} data-dirty={status === "published" && dirty ? "" : undefined} aria-hidden="true" />;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
  ["year", Infinity],
];

/** "just now", "5 minutes ago", "in 2 days". */
export function relative(iso: string, now = Date.now()): string {
  let delta = (Date.parse(iso) - now) / 1000;
  if (Math.abs(delta) < 30) return "just now";
  for (const [unit, size] of STEPS) {
    if (Math.abs(delta) < size) return rtf.format(Math.round(delta), unit);
    delta /= size;
  }
  return "";
}

const exact = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
export const exactTime = (iso: string) => exact.format(new Date(iso));

/**
 * Arrow keys for a row of role="radio" buttons (segmented controls): Left and
 * Up step back, Right and Down step on, Home and End jump to the ends, each
 * moving focus and choosing, as native radio buttons do. Pair it with
 * `tabIndex={checked ? 0 : -1}` on each radio so the group is one Tab stop.
 */
export function onRadioKeys(event: React.KeyboardEvent<HTMLElement>) {
  const step: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
  if (!(event.key in step) && event.key !== "Home" && event.key !== "End") return;
  const group = (event.target as Element).closest('[role="radiogroup"]');
  if (!group) return;
  const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled]):not([aria-disabled="true"])')];
  if (!radios.length) return;
  const at = radios.indexOf(event.target as HTMLElement);
  const next =
    event.key === "Home" ? 0 : event.key === "End" ? radios.length - 1 : (at + step[event.key] + radios.length) % radios.length;
  event.preventDefault();
  radios[next].focus();
  radios[next].click();
}
