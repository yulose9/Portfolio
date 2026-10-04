"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * What the control-center shell knows about the admin: its destinations,
 * the sub-views of Writing and Projects, and the five things opened last.
 * The sidebar, the breadcrumbs and the ⌘K palette all read from here, so
 * they always name things the same way.
 */

export type Destination = "overview" | "analytics" | "writing" | "projects" | "website";
export const DESTINATIONS: readonly Destination[] = ["overview", "analytics", "writing", "projects", "website"];
export const DESTINATION_LABEL: Record<Destination, string> = {
  overview: "Overview",
  analytics: "Analytics",
  writing: "Writing",
  projects: "Projects",
  website: "Website",
};

export const WRITING_VIEWS = [
  { id: "all", label: "All posts" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
  { id: "trash", label: "Trash" },
] as const;
export const PROJECT_VIEWS = [
  { id: "all", label: "All projects" },
  { id: "draft", label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "trash", label: "Trash" },
] as const;
export type ViewScope = "writing" | "projects";
export const VIEWS: Record<ViewScope, readonly { id: string; label: string }[]> = {
  writing: WRITING_VIEWS,
  projects: PROJECT_VIEWS,
};

/* ── Sub-view bus ────────────────────────────────────────────────────────
 * The sidebar asks for a view (admin:writing-filter / admin:projects-filter);
 * the list answers with the view it shows (…-filter-shown). A request made
 * while the list is still mounting waits in `pending` for it to pick up.
 */
const requestEvent = (scope: ViewScope) => `admin:${scope}-filter`;
const shownEvent = (scope: ViewScope) => `admin:${scope}-filter-shown`;
const pending: Partial<Record<ViewScope, string>> = {};
const shown: Record<ViewScope, string> = { writing: "all", projects: "all" };

export function requestView(scope: ViewScope, view: string) {
  pending[scope] = view;
  window.dispatchEvent(new CustomEvent(requestEvent(scope), { detail: view }));
}

/** For the list: follow the sidebar's requests, and say which view is showing. */
export function useShellView(scope: ViewScope, current: string, apply: (view: string) => void) {
  const latest = useRef(apply);
  useEffect(() => {
    latest.current = apply;
  });
  useEffect(() => {
    const take = () => {
      const view = pending[scope];
      delete pending[scope];
      if (view && VIEWS[scope].some((v) => v.id === view)) latest.current(view);
    };
    take();
    window.addEventListener(requestEvent(scope), take);
    return () => window.removeEventListener(requestEvent(scope), take);
  }, [scope]);
  useEffect(() => {
    shown[scope] = current;
    window.dispatchEvent(new Event(shownEvent(scope)));
  }, [scope, current]);
}

/** For the shell: the view the list currently shows. */
export function useShownView(scope: ViewScope) {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener(shownEvent(scope), notify);
      return () => window.removeEventListener(shownEvent(scope), notify);
    },
    () => shown[scope],
    () => "all",
  );
}

/* ── Recents ─────────────────────────────────────────────────────────────
 * The last five posts, projects and pages opened, newest first. Kept in
 * localStorage so they survive a reload; a broken or blocked store reads as
 * empty and never stops navigation.
 */
export type RecentItem = {
  kind: "post" | "project" | "page";
  /** The post id, or the destination for a page. */
  id: string;
  title: string;
  icon?: string | null;
};

const RECENTS_KEY = "admin-recents";
const RECENTS_EVENT = "admin:recents";
const RECENTS_MAX = 5;

function readRaw() {
  try {
    return localStorage.getItem(RECENTS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
let cacheRaw = "";
let cacheList: RecentItem[] = [];
function parseRecents(raw: string): RecentItem[] {
  if (raw === cacheRaw) return cacheList;
  let list: RecentItem[] = [];
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value))
      list = value
        .filter(
          (r): r is RecentItem =>
            !!r &&
            typeof r === "object" &&
            ["post", "project", "page"].includes((r as RecentItem).kind) &&
            typeof (r as RecentItem).id === "string" &&
            typeof (r as RecentItem).title === "string" &&
            ((r as RecentItem).kind !== "page" || DESTINATIONS.includes((r as RecentItem).id as Destination)),
        )
        .slice(0, RECENTS_MAX);
  } catch {
    list = [];
  }
  cacheRaw = raw;
  cacheList = list;
  return list;
}

export function recordRecent(item: RecentItem) {
  const title = item.title.trim() || "Untitled";
  const list = parseRecents(readRaw());
  const first = list[0];
  if (first && first.kind === item.kind && first.id === item.id && first.title === title && (first.icon ?? null) === (item.icon ?? null)) return;
  const next = [{ ...item, title }, ...list.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, RECENTS_MAX);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* recents are a convenience */
  }
  window.dispatchEvent(new Event(RECENTS_EVENT));
}

export function useRecents(): RecentItem[] {
  return parseRecents(
    useSyncExternalStore(
      (notify) => {
        window.addEventListener(RECENTS_EVENT, notify);
        window.addEventListener("storage", notify);
        return () => {
          window.removeEventListener(RECENTS_EVENT, notify);
          window.removeEventListener("storage", notify);
        };
      },
      readRaw,
      () => "[]",
    ),
  );
}

/** The muted line under a recent: where it lives. */
export function recentContext(item: RecentItem) {
  return item.kind === "post" ? "Writing" : item.kind === "project" ? "Projects" : "Page";
}
