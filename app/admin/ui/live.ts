"use client";

import { useEffect, useRef } from "react";

/*
 * Live across devices. Write on the laptop and the phone catches up within a
 * couple of seconds, and the other way round.
 *
 * Each open screen asks /api/admin/pulse every 2.5s while it's visible (one
 * tiny R2 read), and fetches what it shows only when the answer changes. A
 * hidden tab stops asking; coming back asks at once. Tabs in the same browser
 * don't wait for the poll: a save is announced on a BroadcastChannel.
 */

const CHANNEL = "writing-admin";
const INTERVAL = 2500;

export type Pulse = { at: string | null; id: string | null; version?: string | null };

export function announceSave(id: string, at: string) {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ id, at });
    ch.close();
  } catch {
    /* old browser: the poll still covers it */
  }
}

/** Calls `onPulse` whenever the pulse (or the given post's version) changes. */
export function usePulse(onPulse: (p: Pulse) => void, post?: string) {
  const handler = useRef(onPulse);
  useEffect(() => {
    handler.current = onPulse;
  }, [onPulse]);

  useEffect(() => {
    let last = "";
    let timer: number | undefined;
    let stopped = false;
    const url = `/api/admin/pulse${post ? `?post=${encodeURIComponent(post)}` : ""}`;

    const check = async () => {
      window.clearTimeout(timer);
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
          if (res.ok && (res.headers.get("Content-Type") ?? "").includes("json")) {
            const p = (await res.json()) as Pulse;
            const key = `${p.at}|${p.version ?? ""}`;
            // The first answer only sets the baseline.
            if (last && key !== last) handler.current(p);
            last = key;
          }
        } catch {
          /* offline: try again next round */
        }
      }
      if (!stopped) timer = window.setTimeout(check, INTERVAL);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => void check();
    } catch {
      channel = null;
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    void check();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      channel?.close();
    };
  }, [post]);
}
