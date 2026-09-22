"use client";

import { useEffect, useState } from "react";
import type { Commit } from "../last-commit";

const REPO = "yulose9/Portfolio";

/*
 * Formatted in UTC on purpose.
 *
 * The build-time value is rendered on the server and again on the client for
 * hydration. Formatting in the local zone would let those two disagree
 * whenever the commit falls near midnight, so the zone is pinned and both
 * sides produce the same string.
 */
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * "Updated <date>", linked to the commit it came from.
 *
 * Starts from the commit baked in at build time, so there is a real date on
 * first paint with no placeholder and no layout shift. Then it asks GitHub for
 * the current HEAD and upgrades if that is newer — which keeps the stamp
 * honest even when the site has not been rebuilt since the last push.
 *
 * Every failure path is silent: a rate-limited, offline or 404 response leaves
 * the build-time date in place. A "last updated" line is not worth an error
 * state.
 */
export default function LastUpdated({ initial }: { initial: Commit | null }) {
  const [commit, setCommit] = useState(initial);

  useEffect(() => {
    const abort = new AbortController();

    // setState lands in an async continuation, never synchronously during the
    // effect, so this does not cascade renders.
    fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
      signal: abort.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const head = Array.isArray(data) ? data[0] : null;
        const date: unknown = head?.commit?.committer?.date;
        const sha: unknown = head?.sha;
        if (typeof date !== "string" || typeof sha !== "string") return;

        // Only move forward. A stale or reordered response should never wind
        // the date backwards from what the build knew.
        if (initial && Date.parse(date) <= Date.parse(initial.date)) return;

        setCommit({ sha: sha.slice(0, 7), date });
      })
      .catch(() => {
        // Offline, rate-limited, or aborted — keep what the build gave us.
      });

    return () => abort.abort();
  }, [initial]);

  if (!commit) return null;

  return (
    <p className="m-0 text-base leading-6 text-zinc-400">
      Updated{" "}
      <a
        href={`https://github.com/${REPO}/commit/${commit.sha}`}
        target="_blank"
        rel="noreferrer"
        className="text-zinc-400 underline"
        title={`Commit ${commit.sha}`}
      >
        <time dateTime={commit.date}>
          {formatter.format(new Date(commit.date))}
        </time>
      </a>
    </p>
  );
}
