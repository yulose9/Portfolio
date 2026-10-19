// @ts-nocheck
"use client";
import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Num, { pesoFormat } from "@/components/seneca/Num";
import { dayRatio, habitTotals, periodDelta, periodRate } from "@/lib/seneca/utils/protocolStats";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { Fluent as FluentEmoji } from "@/app/admin/ui/extensions/emoji";
import { SectionHead } from "./parts";

const RANGES = [
  { id: 7, label: "Week" },
  { id: 30, label: "Month" },
];

/**
 * Sage card: how much of the protocol you kept over 30 days, how that moved
 * against the 30 before, and the days themselves as a strip of bars.
 */
function Consistency({ history, taskKeys }) {
  const reduce = useReducedMotion();
  const today = getPhDateKey();
  const rate = Math.round(periodRate(history, taskKeys, today, 30) * 100);
  const delta = periodDelta(history, taskKeys, today, 30);
  const days = Array.from({ length: 30 }, (_, i) => {
    const key = addDays(today, i - 29);
    return { key, ratio: dayRatio(history, taskKeys, key) };
  });
  const up = delta >= 0;
  return (
    <div className="sn-sage">
      <div className="sn-sage-head">
        <p>Consistency</p>
        <span>30 days</span>
      </div>
      <p className="sn-sage-value">
        <Num value={rate} suffix="%" />
      </p>
      <p className={`sn-sage-delta ${up ? "is-up" : "is-down"}`}>
        {up ? <ArrowUpRight size={13} strokeWidth={2.25} aria-hidden="true" /> : <ArrowDownRight size={13} strokeWidth={2.25} aria-hidden="true" />}
        <Num value={Math.abs(delta)} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix=" pts" />
        <span>vs last month</span>
      </p>
      <div className="sn-sage-bars" role="img" aria-label={`Daily completion, last 30 days. Today ${Math.round(days[29].ratio * 100)}%`}>
        {days.map((d, i) => (
          <motion.span
            key={d.key}
            className={`${d.ratio > 0 ? "is-on" : ""} ${i === 29 ? "is-today" : ""}`}
            title={`${new Date(`${d.key}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${Math.round(d.ratio * 100)}%`}
            style={{ transformOrigin: "bottom" }}
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: Math.max(0.12, d.ratio) }}
            transition={{ type: "spring", duration: 0.5, bounce: 0, delay: reduce ? 0 : i * 0.012 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Charcoal card: net worth, with the reference's confetti. */
function NetWorth({ netWorth, onOpen }) {
  // Kept to the corners and edges so it never crosses the figures.
  const confetti = [
    [10, 8, "#f5a55b", 20], [30, 4, "#e2625c", 70], [72, 5, "#7fd1c2", -30], [90, 14, "#fbe7a1", 45],
    [6, 34, "#7fd1c2", -20], [93, 38, "#e2625c", 30], [14, 6, "#fbe7a1", -50],
  ];
  return (
    <div className="sn-dark">
      <svg className="sn-confetti" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {confetti.map(([x, y, c, r], i) => (
          <rect key={i} x={x} y={y} width="1.6" height="6" rx="0.8" fill={c} transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </svg>
      <span className="sn-dark-badge" aria-hidden="true">💰</span>
      <p className="sn-kpi-label mt-3 opacity-80">Net worth</p>
      <p className="sn-kpi-value">
        <Num value={netWorth} format={pesoFormat(netWorth)} />
      </p>
      <button type="button" className="sn-btn sn-btn-light sn-btn-block mt-3" style={{ minHeight: 40 }} onClick={onOpen}>
        View
      </button>
    </div>
  );
}

/** Hatched columns; the most-kept habit is filled apricot and named on top. */
function HabitBars({ history, tasks }) {
  const reduce = useReducedMotion();
  const [days, setDays] = useState(30);
  const today = getPhDateKey();
  const rows = useMemo(() => {
    const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));
    return habitTotals(history, tasks.map((t) => t.key), today, days)
      .slice(0, 6)
      .map((r) => ({ ...r, ...byKey[r.key] }));
  }, [history, tasks, today, days]);
  const lead = rows[0]?.count > 0 ? rows[0].key : null;

  // Show the leader in the middle like the reference, the rest fanned around it.
  const ordered = useMemo(() => {
    if (rows.length < 3) return rows;
    const [first, ...rest] = rows;
    const mid = Math.floor(rows.length / 2) - (rows.length % 2 === 0 ? 1 : 0);
    const out = [...rest];
    out.splice(mid, 0, first);
    return out;
  }, [rows]);

  return (
    <div className="sn-card sn-habits">
      <div className="sn-habits-head">
        <h3>Most kept habits</h3>
        <div className="sn-seg" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={days === r.id} onClick={() => setDays(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!lead ? (
        <div className="sn-bars-empty">
          <span aria-hidden="true">📊</span>
          <p className="text-[15px] font-[600] text-ink">Nothing kept this {days === 7 ? "week" : "month"} yet</p>
          <p className="text-[13px] text-ink-2">Tick a task in Today&apos;s protocol and your most-kept habits rise here.</p>
        </div>
      ) : (
        <div className="sn-bars" role="list" aria-label={`Days each habit was kept, last ${days} days`}>
          {ordered.map((row, i) => {
            const isLead = row.key === lead;
            const share = row.count / days;
            return (
              <div key={row.key} className="sn-bar-col" role="listitem" aria-label={`${row.title}: ${row.count} of ${days} days`} title={`${row.title}: ${row.count} of ${days} days`}>
                <p className={isLead ? "sn-bar-tip" : "sn-bar-label"}>
                  <span className="sn-bar-name">{row.title}</span>
                  <span className="sn-bar-emoji" aria-hidden="true">{row.emoji}</span>
                  {isLead && (
                    <small>
                      <Num value={Math.round(share * 100)} suffix="%" />
                    </small>
                  )}
                </p>
                <motion.div
                  key={`${row.key}-${days}`}
                  className={`sn-bar ${isLead ? "is-lead" : ""}`}
                  style={{ height: `calc(${Math.max(0.08, row.count / Math.max(1, rows[0]?.count || 0))} * (100% - 44px))`, transformOrigin: "bottom" }}
                  initial={reduce ? false : { scaleY: 0.2, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0.18, delay: i * 0.05 }}
                >
                  {isLead && <span className="sn-bar-badge">{row.emoji}</span>}
                  <span className="sn-bar-count">
                    <Num value={row.count} suffix="d" />
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
      {lead && <ol className="sn-habit-podium" aria-label="Top kept habits">
        {rows.filter(row => row.count > 0).slice(0, 3).map((row, index) => <li key={row.key}>
          <FluentEmoji emoji={['🥇','🥈','🥉'][index]} size={30} />
          <span className="sn-podium-rank">{['1st','2nd','3rd'][index]} place</span>
          <strong>{row.title}</strong>
          <span><Num value={row.count} /> {row.count === 1 ? 'day' : 'days'} kept</span>
        </li>)}
      </ol>}
    </div>
  );
}

export default function Analytics({ history, taskKeys, tasks, netWorth, onOpenProtocol, onOpenWealth }) {
  return (
    <section aria-labelledby="sn-analytics" className="sn-area-section sn-analytics-section">
      <SectionHead id="sn-analytics" title="Analytics" onMore={onOpenProtocol} />
      <div className="sn-analytics sn-fill">
        <div className="sn-analytics-side">
          <Consistency history={history} taskKeys={taskKeys} />
          <NetWorth netWorth={netWorth} onOpen={onOpenWealth} />
        </div>
        <HabitBars history={history} tasks={tasks} />
      </div>
    </section>
  );
}
