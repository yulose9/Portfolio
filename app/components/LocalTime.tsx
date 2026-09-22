"use client";

import { useSyncExternalStore } from "react";

const PLACE = "Manila, Philippines";

// Always Manila, never the viewer's zone — the point is to say where I am,
// not where they are. Built once; constructing a formatter is not cheap.
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * A clock is an external data source, not derived state, so it is read through
 * useSyncExternalStore rather than an effect that calls setState. That also
 * gives the prerender a defined snapshot, so the statically exported HTML and
 * the first client render agree instead of hydrating against a different
 * minute.
 */
function subscribe(onChange: () => void) {
  // Polled every second, but getSnapshot returns the same string until the
  // minute rolls over, so React only re-renders once a minute.
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return formatter.format(new Date()).toLowerCase().replace(/\s/g, "");
}

function getServerSnapshot(): string | null {
  return null;
}

export default function LocalTime() {
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <p className="font-paper-mono m-0 text-base leading-6 text-zinc-400">
      {/*
        tabular-nums stops the line reflowing each time the minute ticks over.
        The non-breaking space holds the row's height before the clock reads.
      */}
      <span className="tabular-nums">{time ?? " "}</span>
      {time ? ` in ${PLACE}` : ""}
    </p>
  );
}
