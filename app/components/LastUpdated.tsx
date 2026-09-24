"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Commit } from "../last-commit";
import { relativeDay } from "../lib/relative-day";

const REPO = "yulose9/Portfolio";

/*
 * Manila, and pinned rather than local: this stamp reports when *I* last
 * touched the site, and it sits beside a Manila clock. Commits made in a
 * Manila evening are already the previous day in UTC — which is exactly why
 * "yesterday" and "today" are counted here, not in the visitor's zone.
 */
const TIME_ZONE = "Asia/Manila";

/** The first paint, before "now" is known: identical on server and client. */
const plainDate = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

/* The hover card: the exact instant, to the second, in UTC and in Manila. */
// en-US for the month ("Sep", where en-GB now prints "Sept"); h23 keeps it 24-hour.
const utcStamp = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/*
 * With its own date: a Manila evening is often the next calendar day in UTC
 * (a 05:00 commit on the 25th is 21:00 on the 24th), and that difference is
 * exactly why the label reads "today" rather than "yesterday".
 */
const manilaTime = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Rechecked this often, so a tab left open overnight rolls over to "yesterday". */
const TICK_MS = 60_000;

const subscribeToMinutes = (onChange: () => void) => {
  const tick = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(tick);
};
/* Rounded to the minute, so the snapshot is stable between ticks as React requires. */
const currentMinute = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const noServerTime = () => null;

/**
 * "Updated three days ago", linked to the commit, with a hover card giving
 * the exact time and the commit itself.
 *
 * Starts from the commit baked in at build time, so there is a real value on
 * first paint and no layout shift, then asks GitHub for the current HEAD and
 * upgrades if that is newer — which keeps the stamp honest when the site has
 * not been rebuilt since the last push. Every failure path is silent: a
 * rate-limited, offline or 404 response leaves the build-time commit.
 */
export default function LastUpdated({ initial }: { initial: Commit | null }) {
  const [commit, setCommit] = useState(initial);
  /*
   * The clock as an external store. The relative wording depends on the
   * current time, which the server (at build time) and the browser never
   * agree on: during hydration React uses the server snapshot (null, so the
   * plain date on both sides and no mismatch), then re-renders with the real
   * minute — the swap lands inside the page's own entrance fade.
   */
  const now = useSyncExternalStore(subscribeToMinutes, currentMinute, noServerTime);

  useEffect(() => {
    const abort = new AbortController();

    fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
      signal: abort.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const head = Array.isArray(data) ? data[0] : null;
        const date: unknown = head?.commit?.committer?.date;
        const sha: unknown = head?.sha;
        const message: unknown = head?.commit?.message;
        if (typeof date !== "string" || typeof sha !== "string") return;

        // Only move forward. A stale or reordered response should never wind
        // the date backwards from what the build knew.
        if (initial && Date.parse(date) <= Date.parse(initial.date)) return;

        setCommit({
          sha: sha.slice(0, 7),
          date,
          subject: typeof message === "string" ? message.split("\n")[0] : undefined,
        });
      })
      .catch(() => {
        // Offline, rate-limited, or aborted — keep what the build gave us.
      });

    return () => abort.abort();
  }, [initial]);

  if (!commit) return null;

  const when = new Date(commit.date);
  const label = now === null ? plainDate.format(when) : relativeDay(when, new Date(now), TIME_ZONE);

  return (
    <p className="m-0 text-base leading-6 text-zinc-400">
      Updated{" "}
      <Tooltip.Provider delay={300} closeDelay={80}>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <a
                href={`https://github.com/${REPO}/commit/${commit.sha}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 underline"
                // The hover card is visual only (Base UI tooltips add no
                // aria-describedby), so the exact time and commit are spoken
                // here instead of just "today".
                aria-label={`${label}: ${utcStamp.format(when)} UTC, commit ${commit.sha}${
                  commit.subject ? `, ${commit.subject}` : ""
                }. View on GitHub`}
              />
            }
          >
            <time dateTime={commit.date}>{label}</time>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner side="top" sideOffset={8} collisionPadding={12}>
              {/* No Tooltip.Arrow: a soft card, not a speech bubble. */}
              <Tooltip.Popup className="tip-popup">
                <span className="tip-primary">{utcStamp.format(when)} UTC</span>
                <span className="tip-secondary">{manilaTime.format(when)} in Manila · UTC+8</span>
                <span className="tip-commit">
                  <span className="font-paper-mono tip-sha">{commit.sha}</span>
                  {commit.subject ? <span className="tip-subject">{commit.subject}</span> : null}
                </span>
                <span className="tip-hint">View commit on GitHub ↗</span>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </p>
  );
}
