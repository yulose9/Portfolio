// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck, Flame } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import Num from "@/components/seneca/Num";
import { PHASE_COMPLETE } from "@/lib/seneca/celebrate";
import { useProtocol } from "@/lib/seneca/context/ProtocolContext";
import { goalStreak } from "@/lib/seneca/utils/streaks";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { Check, SectionHead, Tile } from "./parts";

const EASE_OUT = [0.23, 1, 0.32, 1];
const HOLD_MS = 2800; // how long the congratulations stay before the next phase arrives

// The card's content swaps like a page: up and out, up and in.
const swap = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.36, ease: EASE_OUT } },
  exit: { opacity: 0, y: -12, filter: "blur(3px)", transition: { duration: 0.18, ease: EASE_OUT } },
};

/**
 * The phase you're in right now, as a checklist. Ticking here is the same
 * toggle as the Protocol tab. Finishing the phase turns the card into a
 * short congratulations, then the next phase slides in.
 */
export default function TodayTodos({ onOpen, date = getPhDateKey() }) {
  const reduce = useReducedMotion();
  const haptic = useWebHaptics();
  const { phases, phaseOrder, phaseTasks, taskHistory, toggleTask, toggleTaskHistory, isComplete } = useProtocol();
  const [cheer, setCheer] = useState(null);

  useEffect(() => {
    let timer;
    const onComplete = (event) => {
      setCheer(event.detail);
      clearTimeout(timer);
      if (!event.detail.allDone) timer = setTimeout(() => setCheer(null), HOLD_MS);
    };
    window.addEventListener(PHASE_COMPLETE, onComplete);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(PHASE_COMPLETE, onComplete);
    };
  }, []);

  const phaseId = phaseOrder.find((id) => (phaseTasks[id] || []).some((t) => !t.done)) ?? phaseOrder.find((id) => phaseTasks[id]?.length);
  const phase = phaseId ? phases[phaseId] : null;
  const tasks = phaseId ? phaseTasks[phaseId] || [] : [];
  const done = tasks.filter((t) => t.done).length;
  const today = getPhDateKey();

  // Unticking during the celebration cancels it
  useEffect(() => {
    if (cheer && !(phaseTasks[cheer.phaseId] || []).every((t) => t.done)) setCheer(null);
  }, [phaseTasks, cheer]);

  const view = cheer ? `cheer-${cheer.phaseId}` : isComplete ? "complete" : tasks.length === 0 ? "empty" : `list-${phaseId}`;

  if (date !== today) {
    const label = new Date(`${date}T12:00:00+08:00`).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
    const remaining = phaseOrder.flatMap(id => (phaseTasks[id] || []).filter(t => taskHistory[`${id}-${t.id}`]?.[date] !== true).map(t => ({ ...t, phaseId: id })));
    return <section aria-labelledby="sn-todos" className="flex h-full flex-col">
      <SectionHead id="sn-todos" title={`${label} protocol`} onMore={onOpen} />
      <div className="sn-todos"><div className="sn-card sn-day-protocol p-2.5">
        <p className="px-3 py-3 text-[13px] text-ink-2">{remaining.length ? `${remaining.length} tasks not checked off` : "Every recorded task is complete."}</p>
        <ul>{remaining.map(task => <li className="sn-todo" key={`${task.phaseId}-${task.id}`}>
          <Tile>{task.emoji}</Tile><div className="min-w-0 flex-1"><p className="text-[16px] font-semibold text-ink">{task.title}</p><p className="text-[13px] text-ink-2">{phases[task.phaseId]?.title}</p></div>
          <Check checked={false} label={`${task.title}, ${label}`} onToggle={() => toggleTaskHistory(task.phaseId, task.id, date)} />
        </li>)}</ul>
      </div></div>
    </section>;
  }

  return (
    <section aria-labelledby="sn-todos" className="flex h-full flex-col">
      <SectionHead id="sn-todos" title="Today's protocol" onMore={onOpen} />

      <div className="sn-todos flex-1">
        <div className="sn-card relative flex h-full flex-col overflow-hidden p-2.5" data-celebrate-origin="today">
          <AnimatePresence mode="wait" initial={false}>
            {cheer ? (
              <motion.div key={view} {...(reduce ? {} : swap)} className="sn-cheer" role="status">
                <div className="sn-cheer-mark">
                  {!reduce && (
                    <svg className="sn-cheer-rings" viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="34" />
                      <circle cx="60" cy="60" r="34" />
                    </svg>
                  )}
                  <motion.span
                    className="sn-cheer-emoji"
                    aria-hidden="true"
                    initial={reduce ? false : { scale: 0.4, rotate: -18, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.6, bounce: 0.45, delay: 0.08 }}
                  >
                    {cheer.allDone ? "🏆" : cheer.emoji}
                  </motion.span>
                </div>
                <motion.h3
                  className="sn-cheer-title"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.16, duration: 0.3, ease: EASE_OUT } }}
                >
                  {cheer.allDone ? "Protocol complete" : `${cheer.title} done`}
                </motion.h3>
                <motion.p
                  className="sn-cheer-sub"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.24, duration: 0.3, ease: EASE_OUT } }}
                >
                  {cheer.allDone ? "Every phase, every task. Rest well tonight." : `All ${cheer.total} tasks, ticked.`}
                </motion.p>
                {cheer.nextTitle && !cheer.allDone && (
                  <motion.button
                    type="button"
                    className="sn-cheer-next"
                    onClick={() => setCheer(null)}
                    initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1, transition: { delay: 0.36, duration: 0.28, ease: EASE_OUT } }}
                  >
                    <span aria-hidden="true">{cheer.nextEmoji}</span>
                    Next up: {cheer.nextTitle}
                    <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                  </motion.button>
                )}
                {!reduce && !cheer.allDone && <span className="sn-cheer-timer" style={{ animationDuration: `${HOLD_MS}ms` }} aria-hidden="true" />}
                {cheer.allDone && (
                  <button type="button" className="sn-more mt-3" onClick={() => setCheer(null)}>
                    Close
                  </button>
                )}
              </motion.div>
            ) : isComplete ? (
              <motion.div key={view} {...(reduce ? {} : swap)} className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <span className="text-[44px]" aria-hidden="true">🌙</span>
                <p className="text-[18px] font-[650] text-ink">Protocol complete</p>
                <p className="text-[14px] text-ink-2">Every phase is done. Rest well tonight.</p>
              </motion.div>
            ) : tasks.length === 0 ? (
              <motion.div key={view} {...(reduce ? {} : swap)} className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <span className="text-[44px]" aria-hidden="true">📋</span>
                <p className="text-[16px] font-[600] text-ink">No tasks yet</p>
                <p className="text-[14px] text-ink-2">Add one with New task to start a streak.</p>
              </motion.div>
            ) : (
              <motion.div key={view} {...(reduce ? {} : swap)} className="flex flex-col">
                <div className="px-3 pb-2 pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[13px] font-[600] text-ink-2">
                      <span aria-hidden="true">{phase.emoji}</span> {phase.title}
                    </p>
                    <p className="shrink-0 text-[13px] font-[600] text-ink-2">
                      <Num value={done} suffix={` of ${tasks.length}`} />
                    </p>
                  </div>
                  <div className="sn-phase-bar" aria-hidden="true">
                    <motion.span
                      initial={false}
                      animate={{ scaleX: tasks.length ? done / tasks.length : 0 }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                    />
                  </div>
                </div>

                <ul className="flex flex-col">
                  {tasks.map((task, i) => {
                    const key = `${phaseId}-${task.id}`;
                    const streak = goalStreak(taskHistory[key]);
                    let kept = 0;
                    for (let d = 0; d < 30; d++) if (taskHistory[key]?.[addDays(today, -d)] === true) kept++;
                    return (
                      <motion.li
                        key={task.id}
                        className={`sn-todo ${task.done ? "is-done" : ""}`}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT, delay: 0.05 + i * 0.04 } }}
                      >
                        <Tile>{task.emoji}</Tile>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[16px] font-[600] tracking-[-0.01em] text-ink">
                            <span className="sn-strike">{task.title}</span>
                          </p>
                          <div className="sn-meta mt-0.5">
                            <span>
                              <CalendarCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                              <Num value={kept} suffix=" of 30 days" />
                            </span>
                            <span>
                              <Flame size={14} strokeWidth={1.75} aria-hidden="true" />
                              <Num value={streak} suffix="-day streak" />
                            </span>
                          </div>
                        </div>
                        <Check
                          checked={!!task.done}
                          label={`${task.title}${task.done ? ", done" : ""}`}
                          onToggle={() => {
                            haptic.trigger(task.done ? "light" : "success");
                            toggleTask(phaseId, task.id);
                          }}
                        />
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
