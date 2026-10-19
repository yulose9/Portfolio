// @ts-nocheck
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@cloudflare/kumo/components/button";
import { ArrowRight, BookOpen, CaretDown, MagnifyingGlass, NotePencil, Trash } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/kit/tabs";
import { SlidingNumber } from "@/app/components/kit/inputs/counter";
import { Kbd } from "@/app/components/kit/kbd";
import { Checkbox } from "@/app/admin/ui/BulkBar";
import { EmptyState } from "@/app/admin/ui/PageHeader";
import { RailCard, RailProgressRow, RailRow } from "@/app/admin/ui/CloudflareRail";
import { Fluent } from "@/app/admin/ui/extensions/emoji";
import { inFilter, wordCount, writingStreak } from "@/lib/seneca/utils/journal";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import JournalActivity from "./JournalActivity";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const PAGE = 30;
const ROW_EASE = [0.23, 1, 0.32, 1];

/** "Today", "Yesterday", "Mon", or "Sep 28" — how far back an entry sits. */
function dayLabel(isoDate, today) {
  if (!isoDate) return "Earlier";
  if (isoDate === today) return "Today";
  if (isoDate === addDays(today, -1)) return "Yesterday";
  const d = new Date(`${isoDate}T00:00:00`);
  if (isoDate > addDays(today, -7)) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: isoDate.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric" });
}

/**
 * The journal as Writing lists posts: a filter field, sliding tabs with
 * counts, a table of entries (mood, title, preview · day · words · time),
 * and a rail of facts and quick actions. Select rows to delete in bulk.
 */
const SYNC_COPY = {
  live: "Synced with Firebase",
  cached: "Showing your saved copy while Firebase confirms it",
  loading: "Loading your journal from Firebase",
  local: "Not signed in to Firebase: entries are kept on this device only",
  offline: "Couldn't reach Firebase: showing your saved copy",
};

export default function JournalList({ entries, sync = "live", onOpen, onNew, onDelete, onBackToProtocol }) {
  const reduce = useReducedMotion();
  const today = getPhDateKey();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [shownCount, setShownCount] = useState(PAGE);
  const [selected, setSelected] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const search = useRef(null);

  // "/" filters, "N" starts an entry — Writing's keys
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.("input, textarea, [contenteditable='true']");
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNew();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNew]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, entries.filter((e) => inFilter(e.isoDate, f.id, today)).length])),
    [entries, today],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) => inFilter(e.isoDate, filter, today) && (!q || `${e.title} ${e.preview}`.toLowerCase().includes(q)),
    );
  }, [entries, filter, query, today]);

  const month = today.slice(0, 7);
  const monthEntries = entries.filter((e) => e.isoDate?.startsWith(month));
  const daysWritten = new Set(monthEntries.map((e) => e.isoDate)).size;
  const dayOfMonth = Number(today.slice(8));
  const streak = writingStreak(entries.map((e) => e.isoDate), today);
  const wordsThisMonth = monthEntries.reduce((n, e) => n + wordCount(e.content), 0);
  const moods = Object.entries(
    monthEntries.reduce((acc, e) => ((acc[e.mood] = (acc[e.mood] || 0) + 1), acc), {}),
  )
    .filter(([m]) => m && m !== "undefined")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const page = shown.slice(0, shownCount);
  const allChecked = page.length > 0 && page.every((e) => selected.has(e.id));
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="cc-page sn-journal" data-selecting={selected.size > 0 || undefined}>
      {sync !== "loading" && <JournalActivity entries={entries} onOpen={onOpen} />}
      <div className="cc-toolbar">
        <label className="admin-search cc-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input
            ref={search}
            type="search"
            placeholder="Filter entries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter entries by title or text"
          />
          <Kbd size="sm">/</Kbd>
        </label>
        <Button variant="primary" data-keycap onClick={onNew} data-sound="select">
          New entry
          <Kbd size="sm">N</Kbd>
        </Button>
      </div>

      <p className={`sn-sync is-${sync}`} role="status">
        <span className="sn-sync-dot" aria-hidden="true" />
        {SYNC_COPY[sync]}
      </p>

      <div className="admin-toolbar writing-status-toolbar cc-filters">
        <Tabs value={filter} onValueChange={(next) => { setFilter(next); setShownCount(PAGE); }}>
          <TabsList aria-label="Filter entries">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.id} value={f.id}>
                {f.label}
                <span className="admin-segment-count">
                  <SlidingNumber value={counts[f.id]} />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="cc-layout-two-col">
        <div className="cc-main-col">
          {entries.length === 0 && sync === "loading" ? (
            // First visit on this device: Writing's skeleton rows until Firebase answers
            <div className="cc-card cc-list">
              <ul className="admin-rows" aria-busy="true" aria-label="Loading entries">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="admin-row admin-row-skeleton kit-skeleton skeleton-shimmer" />
                ))}
              </ul>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState icon={<BookOpen size={32} aria-hidden="true" />} title="Nothing written yet">
              <p>A little space for your day. Choose New entry to begin.</p>
            </EmptyState>
          ) : shown.length === 0 ? (
            <EmptyState compact icon={<MagnifyingGlass size={28} aria-hidden="true" />} title="No entries match">
              <p>Try another range or a different word.</p>
            </EmptyState>
          ) : (
            <div className="cc-card cc-list sn-journal-list">
              <div className="rows-head cc-list-head">
                <Checkbox
                  checked={allChecked}
                  mixed={selected.size > 0 && !allChecked}
                  label={allChecked ? "Select none" : "Select all"}
                  onToggle={() => setSelected(allChecked ? new Set() : new Set(page.map((e) => e.id)))}
                />
                <span className="cc-col-title">{selected.size ? `${selected.size} of ${shown.length} selected` : "Entry"}</span>
                <span className="cc-col-status">Day</span>
                <span className="cc-col-tags">Length</span>
                <span className="cc-col-updated">Written</span>
              </div>
              <ul className="admin-rows" style={{ position: "relative" }}>
                <AnimatePresence initial={false} mode="popLayout">
                  {page.map((e, i) => {
                    const words = wordCount(e.content);
                    return (
                      <motion.li
                        key={e.id}
                        data-selected={selected.has(e.id) || undefined}
                        layout={reduce ? false : "position"}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.2, ease: ROW_EASE, delay: Math.min(i, 8) * 0.025 }}
                      >
                        <Checkbox checked={selected.has(e.id)} label={`Select “${e.title}”`} onToggle={() => toggle(e.id)} />
                        <button
                          type="button"
                          className="admin-row"
                          onClick={(ev) => {
                            if (selected.size || ev.metaKey || ev.ctrlKey || ev.shiftKey) toggle(e.id);
                            else onOpen(e.id);
                          }}
                        >
                          <span className="cc-cell-title">
                            <span className="sn-journal-mood" aria-hidden="true">
                              {e.mood ? <Fluent emoji={e.mood} size={22} /> : "📝"}
                            </span>
                            <span className="admin-row-main">
                              <span className="admin-row-title">{e.title?.trim() || <em>Untitled entry</em>}</span>
                              {e.preview && e.preview !== "No additional text" ? <span className="admin-row-dek">{e.preview}</span> : null}
                            </span>
                          </span>
                          <span className="cc-cell-status">
                            <span className={`sn-day-pill ${e.isoDate === today ? "is-today" : ""}`}>{dayLabel(e.isoDate, today)}</span>
                          </span>
                          <span className="cc-cell-tags">
                            <span className="cc-cell-note">{words === 1 ? "1 word" : `${words.toLocaleString()} words`}</span>
                          </span>
                          <span className="cc-cell-updated">
                            <span className="cc-cell-note">{e.time || ""}</span>
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          )}

          {shown.length ? (
            <div className="cc-footer">
              <span className="cc-footer-count">
                Showing <SlidingNumber value={page.length} /> of {shown.length} {shown.length === 1 ? "entry" : "entries"}
              </span>
              {shownCount < shown.length && (
                <Button variant="secondary" size="sm" onClick={() => setShownCount((n) => n + PAGE)}>
                  Show more
                </Button>
              )}
            </div>
          ) : null}
        </div>

        <aside className="cc-rail-col sn-journal-insights" data-expanded={insightsOpen}>
          <button className="sn-journal-insights-toggle" aria-expanded={insightsOpen} aria-controls="journal-insights" onClick={() => setInsightsOpen(v => !v)} data-sound="select"><span>This month <small>{monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'} · {streak} day streak</small></span><CaretDown size={18} /></button>
          <div id="journal-insights" className="sn-journal-insights-body">
          <RailCard title="This month">
            <RailProgressRow label="Days written" current={daysWritten} total={dayOfMonth} unit="days" />
            <RailRow label="Writing streak" value={streak === 1 ? "1 day" : `${streak} days`} />
            <RailRow label="Entries" value={monthEntries.length} />
            <RailRow label="Words" value={wordsThisMonth.toLocaleString()} />
          </RailCard>

          {moods.length > 0 && (
            <RailCard title="Moods">
              <div className="sn-journal-moods">
                {moods.map(([m, n]) => (
                  <span key={m} className="sn-journal-moodchip" title={`${n} ${n === 1 ? "entry" : "entries"}`}>
                    <Fluent emoji={m} size={18} />
                    <span>{n}</span>
                  </span>
                ))}
              </div>
            </RailCard>
          )}

          <RailCard title="Quick actions">
            <Button variant="secondary" className="w-full justify-start !h-9 text-xs" onClick={onNew}>
              <NotePencil size={14} className="mr-2" />
              <span>New entry (N)</span>
            </Button>
            <Button variant="secondary" className="w-full justify-start !h-9 text-xs" onClick={onBackToProtocol}>
              <ArrowRight size={14} className="mr-2" />
              <span>Back to Protocol</span>
            </Button>
          </RailCard>
          </div>
        </aside>
      </div>

      {/* Selection bar, as Writing's bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="sn-journal-bulk"
            role="toolbar"
            aria-label="Selected entries"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
          >
            <span className="tabular-nums">{selected.size} selected</span>
            {confirming ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete([...selected]);
                    setSelected(new Set());
                    setConfirming(false);
                  }}
                >
                  Delete {selected.size === 1 ? "entry" : `${selected.size} entries`}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" icon={<Trash size={14} aria-hidden="true" />} onClick={() => setConfirming(true)}>
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
