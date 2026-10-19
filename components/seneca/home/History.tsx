// @ts-nocheck
"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import Num, { pesoFormat } from "@/components/seneca/Num";
import Sheet from "@/components/seneca/Sheet";
import { deleteDayLog, listDayLogs, saveDayLog, type DayLog } from "@/lib/seneca/services/history";
import { getLocalPreferences, updateAnalytics } from "@/lib/seneca/services/userPreferences";
import { useJournalEntries, useWealthTransactions } from "@/lib/seneca/data/syncedData";
import { summarize } from "@/lib/seneca/utils/historyStats";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { isEqual } from "@/lib/seneca/utils/stableEqual";
import "@/app/admin/ui/seneca-data.css";

/*
 * Every day Seneca has kept, read from Firestore (daily_logs), not just today.
 * The card on Home shows the last month; the sheet shows trends over any
 * range and lets the owner add a missed day, correct one, or delete it.
 * Loading it also refreshes preferences/settings.analytics with real figures.
 */

const RANGES = [
  { id: 30, label: "30d" },
  { id: 90, label: "90d" },
  { id: 365, label: "Year" },
  { id: 0, label: "All" },
];

const fmtDay = (date, opts = { weekday: "short", month: "short", day: "numeric" }) =>
  new Date(`${date}T12:00:00+08:00`).toLocaleDateString("en-US", { timeZone: "Asia/Manila", ...opts });

const pct = (v) => (v === null ? null : Math.round(v * 100));

/** One shared read per session; mutations reload it. */
let cache: { logs: DayLog[]; at: number } | null = null;
const listeners = new Set<() => void>();

function useDayLogs() {
  const [logs, setLogs] = useState<DayLog[] | null>(cache?.logs ?? null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    try {
      const next = await listDayLogs();
      cache = { logs: next, at: Date.now() };
      setError(null);
      listeners.forEach((l) => l());
    } catch (err) {
      setError(err?.message || "Couldn't read your history.");
    }
  }, []);
  useEffect(() => {
    const sync = () => setLogs(cache?.logs ?? null);
    listeners.add(sync);
    if (!cache) reload();
    return () => {
      listeners.delete(sync);
    };
  }, [reload]);
  return { logs, error, reload };
}

/** A thin trend line; gaps where a day has no value. */
function Trend({ points, label, format }) {
  const values = points.map((p) => p.value).filter((v) => v !== null);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const last = values[values.length - 1];
  const first = values[0];
  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.value === null) {
      pen = false;
      return;
    }
    const x = (i / Math.max(1, points.length - 1)) * 100;
    const y = 30 - ((p.value - min) / span) * 28;
    d += `${pen ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)} `;
    pen = true;
  });
  const up = last >= first;
  return (
    <figure className="sn-trend">
      <figcaption>
        <span>{label}</span>
        <strong>
          <Num value={last} format={format} />
        </strong>
        <small className={up ? "is-up" : "is-down"}>
          {up ? "+" : "−"}
          <Num value={Math.abs(last - first)} format={format} />
        </small>
      </figcaption>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={`${label}: from ${first} to ${last}`}>
        <path d={d} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}

/** Kept-share bars, one per calendar day, oldest left. */
function KeptBars({ days, logs }) {
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  return (
    <div className="sn-kept" role="img" aria-label={`Protocol kept per day over ${days.length} days`}>
      {days.map((date) => {
        const v = byDate.get(date)?.completion ?? null;
        return (
          <span
            key={date}
            data-empty={v === null || undefined}
            style={{ "--h": v === null ? 0.06 : Math.max(0.08, v) }}
            title={`${fmtDay(date)}: ${v === null ? "not logged" : `${pct(v)}% kept`}`}
          />
        );
      })}
    </div>
  );
}

/** Home card: last 30 days at a glance, and the way into the full history. */
export function HistoryCard() {
  const { logs, error } = useDayLogs();
  const [open, setOpen] = useState(false);
  const [journal] = useJournalEntries();
  const [transactions] = useWealthTransactions();
  const today = getPhDateKey();
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)), [today]);
  const stats = useMemo(
    () => (logs ? summarize(logs, today, { journalEntries: journal.length, transactions: transactions.length }) : null),
    [logs, today, journal.length, transactions.length],
  );

  // Keep the cloud's analytics block true to the data, instead of its defaults.
  useEffect(() => {
    if (!stats) return;
    if (!isEqual(getLocalPreferences()?.analytics, stats)) updateAnalytics(stats);
  }, [stats]);

  return (
    <section className="sn-history-card" aria-labelledby="sn-history">
      <div className="sn-history-text">
        <h2 id="sn-history">Day by day</h2>
        <p>
          {error ? (
            error
          ) : stats ? (
            <>
              <Num value={stats.totalDaysTracked} /> days logged · <Num value={stats.averageCompletionRate} format={{ maximumFractionDigits: 0 }} suffix="%" /> kept on average
            </>
          ) : (
            "Reading your days…"
          )}
        </p>
      </div>
      {logs && <KeptBars days={days} logs={logs} />}
      <button type="button" className="sn-btn sn-btn-light" onClick={() => setOpen(true)} disabled={!logs}>
        Open history
      </button>
      <HistorySheet open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function HistorySheet({ open, onClose }) {
  const { logs, error, reload } = useDayLogs();
  const [range, setRange] = useState(90);
  const [editing, setEditing] = useState(null); // a date key, or "new"
  const today = getPhDateKey();

  useEffect(() => {
    if (open) reload();
    else setEditing(null);
  }, [open, reload]);

  const from = range ? addDays(today, -(range - 1)) : logs?.at(-1)?.date || today;
  const inRange = useMemo(() => (logs || []).filter((l) => l.date >= from), [logs, from]);
  const calendar = useMemo(() => {
    const out = [];
    for (let d = from; d <= today && out.length < 400; d = addDays(d, 1)) out.push(d);
    // "All" can span more days than bars fit; keep the most recent year of bars.
    return out.slice(-365);
  }, [from, today]);
  const series = (pick) => [...inRange].reverse().map((l) => ({ date: l.date, value: pick(l) }));
  const stats = useMemo(() => summarize(inRange, today), [inRange, today]);

  const editLog = editing && editing !== "new" ? logs?.find((l) => l.date === editing) : null;

  return (
    <Sheet open={open} onClose={onClose} label="Day by day" className="sn-sheet sn-history-sheet">
      {editing ? (
        <DayEditor
          key={editing}
          log={editLog}
          isNew={editing === "new"}
          taken={new Set((logs || []).map((l) => l.date))}
          onBack={() => setEditing(null)}
          onDone={async () => {
            await reload();
            setEditing(null);
          }}
        />
      ) : (
        <>
          <div className="sn-sheet-head">
            <div>
              <h2>Day by day</h2>
              <p className="mt-1 text-[13.5px] text-ink-2">Every logged day, from the cloud.</p>
            </div>
            <button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={onClose}>
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="sn-sheet-body">
            <div className="sn-seg self-start" role="group" aria-label="Range">
              {RANGES.map((r) => (
                <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>

            {error && <p className="sn-backup-status is-error">{error}</p>}
            {!logs && !error && <p className="text-[14px] text-ink-2">Reading your days…</p>}

            {logs && (
              <>
                <dl className="sn-history-stats">
                  <div>
                    <dt>Days logged</dt>
                    <dd><Num value={stats.totalDaysTracked} /></dd>
                  </div>
                  <div>
                    <dt>Kept on average</dt>
                    <dd><Num value={stats.averageCompletionRate} format={{ maximumFractionDigits: 0 }} suffix="%" /></dd>
                  </div>
                  <div>
                    <dt>Streak (80%+)</dt>
                    <dd><Num value={stats.currentStreak} suffix={stats.currentStreak === 1 ? " day" : " days"} /></dd>
                  </div>
                  <div>
                    <dt>Best weekday</dt>
                    <dd>{stats.mostProductiveDay || "—"}</dd>
                  </div>
                </dl>

                <KeptBars days={calendar} logs={inRange} />
                <div className="sn-trends">
                  <Trend label="Net worth" points={series((l) => l.netWorth)} format={pesoFormat(inRange.find((l) => l.netWorth !== null)?.netWorth ?? 0)} />
                  <Trend label="Weight" points={series((l) => l.weight)} format={{ maximumFractionDigits: 1, style: "unit", unit: "kilogram" }} />
                </div>

                <div className="sn-history-list-head">
                  <h3>Days</h3>
                  <button type="button" className="sn-btn sn-btn-outline" onClick={() => setEditing("new")}>
                    <Plus size={16} strokeWidth={2} aria-hidden="true" />
                    Add a day
                  </button>
                </div>
                {inRange.length === 0 ? (
                  <p className="text-[14px] text-ink-2">Nothing logged in this range.</p>
                ) : (
                  <ul className="sn-history-list">
                    {inRange.map((l) => (
                      <li key={l.date}>
                        <button type="button" onClick={() => setEditing(l.date)} aria-label={`Edit ${fmtDay(l.date, { weekday: "long", month: "long", day: "numeric" })}`}>
                          <span className="sn-history-mood" aria-hidden="true">{l.mood || "·"}</span>
                          <span className="sn-history-date">
                            <strong>{fmtDay(l.date)}</strong>
                            <small>
                              {[
                                l.weight !== null ? `${l.weight} kg` : null,
                                l.netWorth !== null ? `₱${Math.round(l.netWorth).toLocaleString("en-PH")}` : null,
                                l.date === today ? "today" : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "No details"}
                            </small>
                          </span>
                          <span className="sn-history-rate" data-empty={l.completion === null || undefined}>
                            {l.completion === null ? "—" : `${pct(l.completion)}%`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

const lines = (text) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

function DayEditor({ log, isNew, taken, onBack, onDone }) {
  const haptic = useWebHaptics();
  const today = getPhDateKey();
  const [date, setDate] = useState(log?.date || today);
  const [mood, setMood] = useState(log?.mood || "");
  const [weight, setWeight] = useState(log?.weight ?? "");
  const [netWorth, setNetWorth] = useState(log?.netWorth ?? "");
  const [highlights, setHighlights] = useState((log?.highlights || []).join("\n"));
  const [challenges, setChallenges] = useState((log?.challenges || []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [problem, setProblem] = useState(null);

  const clash = isNew && taken.has(date);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today && !clash;
  const toNum = (v) => (v === "" || v === null ? null : Number(v));

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await saveDayLog(date, {
        mood: mood.trim() || null,
        weight: toNum(weight),
        netWorth: toNum(netWorth),
        highlights: lines(highlights),
        challenges: lines(challenges),
      });
      haptic.trigger("success");
      await onDone();
    } catch (err) {
      haptic.trigger("error");
      setProblem(err?.message || "Couldn't save this day.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteDayLog(date);
      haptic.trigger("success");
      await onDone();
    } catch (err) {
      setProblem(err?.message || "Couldn't delete this day.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sn-sheet-head">
        <button type="button" className="sn-icon-btn" aria-label="Back to all days" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <h2 className="flex-1">{isNew ? "Add a day" : fmtDay(date, { weekday: "long", month: "long", day: "numeric" })}</h2>
      </div>
      <div className="sn-sheet-body">
        {isNew && (
          <label className="sn-field">
            <span>Date</span>
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} aria-invalid={clash || undefined} />
            {clash && <small className="text-[12.5px] text-ink-2">That day is already logged. Pick it from the list to edit it.</small>}
          </label>
        )}
        {!isNew && log?.completion !== null && (
          <p className="text-[13.5px] text-ink-2">
            {pct(log.completion)}% of the protocol kept. That figure comes from the ticks in Protocol.
          </p>
        )}
        <div className="sn-history-fields">
          <label className="sn-field">
            <span>Mood</span>
            <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="🙂" maxLength={16} />
          </label>
          <label className="sn-field">
            <span>Weight (kg)</span>
            <input type="number" inputMode="decimal" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className="sn-field">
            <span>Net worth (₱)</span>
            <input type="number" inputMode="decimal" step="1" value={netWorth} onChange={(e) => setNetWorth(e.target.value)} />
          </label>
        </div>
        <label className="sn-field">
          <span>Highlights, one per line</span>
          <textarea rows={3} value={highlights} onChange={(e) => setHighlights(e.target.value)} />
        </label>
        <label className="sn-field">
          <span>Challenges, one per line</span>
          <textarea rows={3} value={challenges} onChange={(e) => setChallenges(e.target.value)} />
        </label>
        {problem && <p className="sn-backup-status is-error" role="alert">{problem}</p>}
      </div>
      <div className="sn-sheet-foot">
        {!isNew && date !== today && (
          <button type="button" className={`sn-btn ${confirmDelete ? "sn-btn-danger" : "sn-btn-outline"}`} onClick={remove} disabled={busy}>
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            {confirmDelete ? "Delete for good" : "Delete day"}
          </button>
        )}
        <button type="button" className="sn-btn sn-btn-primary ml-auto" onClick={save} disabled={!valid || busy} aria-busy={busy || undefined}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}
