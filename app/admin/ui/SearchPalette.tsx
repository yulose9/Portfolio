"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, type SearchResult } from "./api";
import { relative, StatusDot, statusLabel } from "./bits";
import { Fluent } from "./extensions/emoji";

/*
 * ⌘K: search every post, drafts and live, by title, standfirst and full text.
 * Each result shows the passages that match; choosing one opens the post with
 * find-in-page already on that passage.
 */

export type Jump = { id: string; q: string; n: number };

function Snippet({ text, start, length }: { text: string; start: number; length: number }) {
  return (
    <span className="search-snippet">
      {text.slice(0, start)}
      <mark>{text.slice(start, start + length)}</mark>
      {text.slice(start + length)}
    </span>
  );
}

export default function SearchPalette({ open, onClose, onJump }: { open: boolean; onClose: () => void; onJump: (j: Jump) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  // Debounced, and a newer query aborts the one in flight.
  useEffect(() => {
    const q = query.trim();
    // Too short to search: the list below shows a prompt, whatever's in results.
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      api
        .search(q, ctrl.signal)
        .then((r) => {
          setResults(r.results);
          setActive(0);
        })
        .catch(() => !ctrl.signal.aborted && setResults([]));
    }, 160);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // One flat list of choices: each post, then each of its passages.
  const choices = useMemo(
    () =>
      (results ?? []).flatMap((r) => [
        { key: `${r.id}`, jump: { id: r.id, q: query.trim(), n: 0 }, result: r, hit: null },
        ...r.hits
          .filter((h) => h.field === "body")
          .map((h) => ({ key: `${r.id}:${h.occurrence}`, jump: { id: r.id, q: query.trim(), n: h.occurrence }, result: r, hit: h })),
      ]),
    [results, query]
  );

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (i: number) => {
    const c = choices[i];
    if (!c) return;
    onJump(c.jump);
    onClose();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
        else setQuery("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" data-variant="center" />
        <Dialog.Popup className="palette" aria-label="Search all writing">
          <div className="palette-input">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and words in every post"
              aria-label="Search all writing"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(choices.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(active);
                }
              }}
            />
            <kbd className="admin-kbd">esc</kbd>
          </div>
          <div ref={list} className="palette-results" role="listbox" aria-label="Results">
            {query.trim().length < 2 ? (
              <p className="palette-empty">Type to search every draft and published post.</p>
            ) : results === null ? (
              <p className="palette-empty">Searching…</p>
            ) : !choices.length ? (
              <p className="palette-empty">Nothing matches “{query.trim()}”.</p>
            ) : (
              choices.map((c, i) =>
                c.hit ? (
                  <button
                    key={c.key}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    className="palette-hit"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(i)}
                  >
                    <Snippet text={c.hit.snippet} start={c.hit.start} length={c.hit.length} />
                  </button>
                ) : (
                  <button
                    key={c.key}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    className="palette-post"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(i)}
                  >
                    <span className="palette-post-icon">{c.result.icon ? <Fluent emoji={c.result.icon} size={18} /> : null}</span>
                    <span className="palette-post-title">{c.result.title.trim() || "Untitled"}</span>
                    <span className="palette-post-meta">
                      <StatusDot status={c.result.status} dirty={c.result.dirty} />
                      {statusLabel({ ...c.result, publishAt: null })} · {c.result.total} {c.result.total === 1 ? "match" : "matches"} · {relative(c.result.updatedAt)}
                    </span>
                  </button>
                )
              )
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
