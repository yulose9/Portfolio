"use client";

import type { Draft } from "./api";

/** Small shared pieces: status wording, the status dot, relative times. */

export function statusLabel(p: { status: Draft["status"]; dirty: boolean; publishAt: string | null }): string {
  if (p.status === "scheduled") return "Scheduled";
  if (p.status === "published") return p.dirty ? "Live · unpublished edits" : "Live";
  return "Draft";
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
