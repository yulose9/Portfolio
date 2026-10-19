// @ts-nocheck
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import ExportDataButton from "@/components/seneca/ExportDataButton";
import Num from "@/components/seneca/Num";
import { monthRatios, periodDelta } from "@/lib/seneca/utils/protocolStats";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";

const PH = "Asia/Manila";
const EASE_OUT = [0.23, 1, 0.32, 1];

/** Re-render once a minute so the clock line stays honest. */
function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Greeting({ onAddTask, onWrite, hasJournalToday }) {
  const now = useMinute();
  const weekday = now.toLocaleDateString("en-US", { timeZone: PH, weekday: "long" });
  const date = now.toLocaleDateString("en-GB", { timeZone: PH, day: "numeric", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-US", { timeZone: PH, hour: "numeric", minute: "2-digit" }).toLowerCase();

  return (
    <section aria-labelledby="sn-greeting">
      <h1 id="sn-greeting" className="sn-greeting">
        <span className="sn-greeting-line">Happy</span>
        <span className="sn-greeting-line" style={{ animationDelay: "70ms" }}>
          {weekday} <span className="sn-wave" aria-hidden="true">👋</span>
        </span>
      </h1>
      <p className="mt-2 text-[15px] text-ink-2 tabular-nums">
        <time dateTime={now.toISOString()}>
          {date}, {time}
        </time>
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <button type="button" className="sn-btn sn-btn-primary sn-btn-block" data-sound="pop" onClick={onAddTask}>
          <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
          New task
        </button>
        <button type="button" className="sn-btn sn-btn-outline sn-btn-block" onClick={onWrite}>
          {hasJournalToday ? "Read today's entry" : "Write today's entry"}
        </button>
      </div>
    </section>
  );
}

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const R = 9;
const C = 2 * Math.PI * R;

/** A thick arc fills a disk clockwise, proportional to completed tasks. */
function Day({ day, ratio, state, index, reduce, selected, onSelect }) {
  const pct = Math.round(ratio * 100);
  const cls =
    state === "today" ? "is-today" : state === "future" ? "is-future" : ratio >= 1 ? "is-full" : ratio > 0 ? "is-partial" : "";
  const label = state === "future" ? `${day}` : `${day}: ${pct}% of protocol done${state === "today" ? " (today)" : ""}. Show the day`;

  return (
    <button
      type="button"
      className={`sn-day ${cls} ${selected ? "is-selected" : ""}`}
      aria-label={label}
      aria-current={state === "today" ? "date" : undefined}
      aria-pressed={state === "future" ? undefined : selected}
      disabled={state === "future"}
      data-pct={state === "future" ? undefined : pct}
      data-sound="tick"
      onClick={onSelect}
    >
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle className="sn-day-track" cx="20" cy="20" r="18" />
        {ratio > 0 && state !== "future" && (
          <motion.circle
            className={`sn-day-pie ${ratio >= 1 ? "is-complete" : ""}`}
            cx="20"
            cy="20"
            r={R}
            initial={reduce ? false : { strokeDasharray: `0 ${C}` }}
            animate={{ strokeDasharray: `${C * ratio} ${C}` }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.12 + index * 0.012 }}
          />
        )}
      </svg>
      <span className="relative">{day}</span>
    </button>
  );
}

// Pages slide the way you turned them; blur bridges the swap.
const page = {
  enter: (dir) => ({ opacity: 0, x: dir * 28, filter: "blur(4px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.32, ease: EASE_OUT } },
  exit: (dir) => ({ opacity: 0, x: dir * -20, filter: "blur(3px)", transition: { duration: 0.14, ease: EASE_OUT } }),
};

export function MonthRings({ history, taskKeys, selected, onSelect }) {
  const setSelected = (value) => onSelect(typeof value === "function" ? value(selected) : value);
  const reduce = useReducedMotion();
  const today = getPhDateKey();
  const [ty, tm] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: ty, m: tm, dir: 0 });
  const atCurrent = cursor.y === ty && cursor.m === tm;

  const ratios = useMemo(
    () => monthRatios(history, taskKeys, cursor.y, cursor.m),
    [history, taskKeys, cursor.y, cursor.m],
  );
  const delta = useMemo(() => periodDelta(history, taskKeys, today, 30), [history, taskKeys, today]);

  const first = new Date(Date.UTC(cursor.y, cursor.m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first grid
  const title = first.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const monthKey = `${cursor.y}-${cursor.m}`;

  const shift = (by) => {
    setSelected(null);
    turn(by);
  };
  const turn = (by) =>
    setCursor(({ y, m }) => {
      const next = m + by;
      return next < 1 ? { y: y - 1, m: 12, dir: by } : next > 12 ? { y: y + 1, m: 1, dir: by } : { y, m: next, dir: by };
    });

  return (
    <section aria-labelledby="sn-month" className="mt-3">
      <div className="sn-head">
        <h2 id="sn-month" className="sn-month-title">
          <span className="sn-month-name">
            <AnimatePresence mode="popLayout" initial={false} custom={cursor.dir}>
              <motion.span
                key={title}
                custom={cursor.dir}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: cursor.dir >= 0 ? 10 : -10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: cursor.dir >= 0 ? -8 : 8, transition: { duration: 0.14 } }}
                className="inline-block"
              >
                {title}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="whitespace-pre">, </span>
          <Num value={cursor.y} format={{ useGrouping: false }} />
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" className="sn-icon-btn" aria-label="Previous month" data-sound="flip" onClick={() => shift(-1)}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`sn-icon-btn ${atCurrent ? "" : "is-filled"}`}
            aria-label="Next month"
            data-sound="flip"
            onClick={() => shift(1)}
            disabled={atCurrent}
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="sn-cal-frame">
        <div className="sn-cal" aria-hidden="true">
          {DOW.map((d) => (
            <div key={d} className="sn-cal-dow">
              {d}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false} custom={cursor.dir}>
          <motion.div
            key={monthKey}
            custom={cursor.dir}
            variants={reduce ? undefined : page}
            initial={reduce ? { opacity: 0 } : "enter"}
            animate={reduce ? { opacity: 1 } : "center"}
            exit={reduce ? { opacity: 0 } : "exit"}
            className="sn-cal mt-2"
            role="group"
            aria-label={`${title} ${cursor.y} protocol completion`}
          >
            {Array.from({ length: lead }, (_, i) => (
              <div key={`lead-${i}`} aria-hidden="true" />
            ))}
            {Object.entries(ratios).map(([key, ratio], i) => (
              <Day
                key={key}
                index={i}
                reduce={reduce}
                day={Number(key.slice(8))}
                ratio={ratio}
                state={key === today ? "today" : key > today ? "future" : "past"}
                selected={selected === key}
                onSelect={() => setSelected((k) => (k === key ? null : key))}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sn-calendar-selection">
        {selected && selected !== today ? <button className="sn-more" onClick={() => setSelected(null)}>Back to today</button> : <span>Choose a day to review its protocol and journal.</span>}
      </div>

      <p className="mt-4 text-[13px] text-ink-2 tabular-nums">
        <span className={delta >= 0 ? "font-semibold text-positive" : "font-semibold text-negative"}>
          <Num value={delta} format={{ signDisplay: "always", minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="%" />
        </span>{" "}
        from last month
      </p>
    </section>
  );
}

/** The reference's "Sync anywhere" card, now a slim bar: take your data with you. */
export function ExportCard() {
  return (
    <section className="sn-export" aria-labelledby="sn-export">
      <span className="sn-export-art" aria-hidden="true">
        <svg className="sn-export-burst" viewBox="0 0 48 48">
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x="23" y="2" width="2" height="12" rx="1" transform={`rotate(${i * 22.5} 24 24)`} />
          ))}
        </svg>
        <span className="sn-export-emoji">🗂️</span>
      </span>
      <div className="sn-export-text">
        <h2 id="sn-export" className="text-[16px] leading-[21px] font-[650] tracking-[-0.015em] text-ink">Keep a copy of every day</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">Protocol, journal and wealth, ready for an LLM.</p>
      </div>
      <ExportDataButton pill />
    </section>
  );
}
