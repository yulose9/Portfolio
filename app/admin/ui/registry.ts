"use client";

import { useEffect, useId, useRef } from "react";

/*
 * Every command the ⌘K palette offers, from wherever it lives. A screen
 * registers a function that builds its commands; the palette asks all of
 * them when it opens, so what it lists (and which toggles read "on") is
 * always what's true right then, without anyone keeping a copy in sync.
 */

export type Command = {
  id: string;
  title: string;
  group: "Post" | "View" | "Insert" | "Turn into" | "Edit" | "Go to" | "Posts";
  icon: React.ReactNode;
  keys?: string;
  keywords?: string[];
  /** A setting: shown as a switch, on or off. */
  checked?: boolean;
  /** Greyed out, with why. */
  disabled?: string;
  run: () => void;
};

const sources = new Map<string, () => Command[]>();

export function useCommands(build: () => Command[]) {
  const key = useId();
  const latest = useRef(build);
  useEffect(() => {
    latest.current = build;
  });
  useEffect(() => {
    sources.set(key, () => latest.current());
    return () => {
      sources.delete(key);
    };
  }, [key]);
}

export function allCommands(): Command[] {
  const seen = new Set<string>();
  const out: Command[] = [];
  for (const build of sources.values())
    for (const c of build()) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
  return out;
}

/** Loose matching: every word of the query appears in the title or keywords, in any order. */
export function matches(c: Command, q: string) {
  if (!q) return true;
  const hay = `${c.title} ${c.group} ${(c.keywords ?? []).join(" ")}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
