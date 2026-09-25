"use client";

import { ArrowSquareOut, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

/*
 * After Publish: the commit is in, and Cloudflare Pages is building. That
 * usually takes two to three minutes, and opening the link before it's done
 * shows the old page (or a 404). So instead of an "Open" that might lie, the
 * top bar shows the build: a ring that fills over ~3 minutes while this polls
 * the live page, and turns into "View live" the moment the new version is
 * actually being served (its JSON-LD carries the new dateModified), or when
 * the time is up.
 */

export type Deploy = { id: string; url: string; updatedAt: string; startedAt: number; page: boolean; title: string };

const EXPECTED_MS = 3 * 60 * 1000;
const KEY = (id: string) => `admin-deploy:${id}`;

export function rememberDeploy(d: Deploy) {
  try {
    localStorage.setItem(KEY(d.id), JSON.stringify(d));
  } catch {
    /* private mode */
  }
}
export function recallDeploy(id: string): Deploy | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY(id)) ?? "null") as Deploy | null;
    // Forget it after half an hour; by then it's simply the live page.
    return d && Date.now() - d.startedAt < 30 * 60 * 1000 ? d : null;
  } catch {
    return null;
  }
}
function forgetDeploy(id: string) {
  try {
    localStorage.removeItem(KEY(id));
  } catch {
    /* ignore */
  }
}

async function isLive(d: Deploy): Promise<boolean> {
  try {
    const res = await fetch(`${d.page ? d.url : "/writing"}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const html = await res.text();
    return d.page ? html.includes(`"dateModified":"${d.updatedAt}"`) : html.includes(d.title.replace(/&/g, "&amp;"));
  } catch {
    return false;
  }
}

export default function DeployPill({ deploy, onDismiss }: { deploy: Deploy; onDismiss: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [live, setLive] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (live) return;
    let stop = false;
    const check = async () => {
      if (await isLive(deploy)) {
        if (!stop) setLive(true);
        return;
      }
      if (!stop) window.setTimeout(check, 8000);
    };
    const first = window.setTimeout(check, 20_000);
    return () => {
      stop = true;
      window.clearTimeout(first);
    };
  }, [deploy, live]);

  const elapsed = now - deploy.startedAt;
  const ready = live || elapsed >= EXPECTED_MS;
  const left = Math.max(0, EXPECTED_MS - elapsed);
  const progress = Math.min(1, elapsed / EXPECTED_MS);
  const label = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
  const href = deploy.page ? deploy.url : "/writing";

  if (ready) {
    return (
      <span className="deploy-pill" data-ready="">
        <a className="deploy-live" href={href} target="_blank" rel="noopener">
          <span className="deploy-dot" aria-hidden="true" />
          {live ? "View live" : "Should be live"}
          <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
        </a>
        <button
          type="button"
          className="deploy-close"
          aria-label="Dismiss"
          onClick={() => {
            forgetDeploy(deploy.id);
            onDismiss();
          }}
        >
          <X size={11} weight="bold" />
        </button>
      </span>
    );
  }
  return (
    <span className="deploy-pill" role="status" aria-live="polite" title="Cloudflare is building the site. The link opens when it's done.">
      <svg className="deploy-ring" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" pathLength="100" className="deploy-ring-track" />
        <circle cx="8" cy="8" r="6" pathLength="100" className="deploy-ring-fill" style={{ strokeDashoffset: 100 - progress * 100 }} />
      </svg>
      Deploying
      <span className="deploy-time">{label}</span>
    </span>
  );
}
