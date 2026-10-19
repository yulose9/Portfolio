// @ts-nocheck
"use client";
import GoalIcon from "@/components/seneca/GoalIcon";
import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CalendarDays, ChevronRight, Flame, Pencil, Pin, Plus, Sparkles, Target } from "lucide-react";
import GoalsManagerSheet from "@/components/seneca/GoalsManagerSheet";
import GoalEditSheet from "@/components/seneca/GoalEditSheet";
import Num from "@/components/seneca/Num";
import StudyGoalSheet, { ROUTE_WEEKS } from "@/components/seneca/StudyGoalSheet";
import { usePersonalGoals } from "@/lib/seneca/context/PersonalGoalsContext";
import { useProtocol } from "@/lib/seneca/context/ProtocolContext";
import { useStudyGoal } from "@/lib/seneca/context/StudyGoalContext";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { Check, SectionHead, Tile } from "./parts";
import RouteMap from "./RouteMap";

const LAYOUT = { type: "spring", duration: 0.4, bounce: 0 };

/**
 * The reference's "Should Do!" list, now yours to arrange. Pinned goals come
 * first; empty spots are filled with the system's pick for today (a streak
 * at risk first), and each row says why it's there. A goal kept today is a
 * solid card, one still open is the dashed "not yet" slot — tick it here.
 */
export function Streaks({ onOpenGoal }) {
  const reduce = useReducedMotion();
  const { getHomeGoals, setGoalDate, getGoalsArray } = usePersonalGoals();
  const [managing, setManaging] = useState(false);
  const [creating, setCreating] = useState(false);
  const today = getPhDateKey();
  const items = getHomeGoals(3);

  return (
    <section aria-labelledby="sn-streaks" className="sn-area-section">
      <SectionHead
        id="sn-streaks"
        title="Keep going"
        action={
          <button type="button" className="sn-more" data-sound="open" onClick={() => setManaging(true)}>
            Edit
          </button>
        }
      />

      {items.length === 0 && getGoalsArray().length > 0 ? (
        <button type="button" className="sn-dashed sn-press flex w-full items-center gap-3.5 p-3.5 text-left" onClick={() => setManaging(true)}>
          <Tile>🙈</Tile>
          <span className="flex-1">
            <span className="block text-[16px] font-[600] text-ink">Every goal is hidden</span>
            <span className="block text-[13px] text-ink-2">Choose Edit to show one on Home again.</span>
          </span>
          <ChevronRight size={18} strokeWidth={2} className="text-ink-3" aria-hidden="true" />
        </button>
      ) : items.length === 0 ? (
        <button type="button" className="sn-dashed sn-press flex w-full items-center gap-3.5 p-3.5 text-left" onClick={() => setCreating(true)}>
          <Tile>🎯</Tile>
          <span className="flex-1">
            <span className="block text-[16px] font-[600] text-ink">Add your first goal</span>
            <span className="block text-[13px] text-ink-2">Something to keep, day after day.</span>
          </span>
          <Plus size={18} strokeWidth={2} className="text-ink-3" aria-hidden="true" />
        </button>
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {items.map(({ goal, streak, keptToday, reason, rank, pinned }) => (
              <motion.li
                key={goal.id}
                layout={!reduce}
                transition={LAYOUT}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
              >
                <div className={`sn-goal-row ${keptToday ? "is-kept" : ""}`}>
                  <button type="button" className="sn-goal-main" onClick={() => onOpenGoal(goal.id)} aria-label={`${goal.title}: open in Growth`}>
                    <Tile><GoalIcon goal={goal} /></Tile>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[16px] font-[600] tracking-[-0.01em] text-ink">{goal.title}</span>
                        {pinned ? (
                          <Pin size={12} strokeWidth={2.25} className="shrink-0 text-ink-3" aria-label="Pinned" />
                        ) : (
                          <Sparkles size={12} strokeWidth={2.25} className="shrink-0 text-ink-3" aria-label="Suggested" />
                        )}
                      </span>
                      <span className="sn-meta mt-0.5">
                        <span>
                          <Flame size={14} strokeWidth={1.75} aria-hidden="true" />
                          <Num value={streak} suffix="-day streak" />
                        </span>
                        {!keptToday && <span className={rank === 0 ? "font-[600] text-accent" : ""}>{rank === 0 ? "At risk today" : "Open today"}</span>}
                      </span>
                    </span>
                    <ChevronRight size={18} strokeWidth={2} className="sn-goal-chev shrink-0 text-ink-3" aria-hidden="true" />
                  </button>
                  <Check
                    checked={keptToday}
                    label={`${goal.title}: ${keptToday ? "kept today" : "mark kept today"}. ${reason}`}
                    sound={keptToday ? "toggleOff" : "check"}
                    onToggle={() => setGoalDate(goal.id, today, keptToday ? undefined : true)}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <GoalsManagerSheet open={managing} onClose={() => setManaging(false)} />
      <GoalEditSheet open={creating} onClose={() => setCreating(false)} />
    </section>
  );
}

/**
 * The reference's "Running Competition" map, re-read as a study route: the
 * last N weeks are stops along a winding road, lit apricot where you
 * studied, ending at today's pin. Weeks, target and streak are editable.
 */
export function StudyRoute({ onOpen }) {
  const reduce = useReducedMotion();
  const { activeStudyGoal, studyHistory, getStudyStreak, getStudiedToday, setStudiedToday, updateStudyGoal, activeSubjects, focusStudy } = useStudyGoal();
  const { markLearnStuffDone } = useProtocol();
  const [editing, setEditing] = useState(false);
  const [localWeeks, setLocalWeeks] = useState(2);
  const weeks = activeStudyGoal?.routeWeeks || localWeeks;
  const days = weeks * 7;
  const today = getPhDateKey();
  const stops = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1))).map((key) => studyHistory?.[key] === true),
    [studyHistory, today, days],
  );
  const studiedToday = getStudiedToday() === true;
  const streak = getStudyStreak();
  const studied = stops.filter(Boolean).length;
  const target = activeStudyGoal ? "study-goal" : "certifications";

  const setWeeks = (w) => (activeStudyGoal ? updateStudyGoal({ routeWeeks: w }) : setLocalWeeks(w));

  return (
    <section aria-labelledby="sn-route" data-nav-focus="home-study" className="sn-area-section">
      <SectionHead id="sn-route-head" title="Study route" onMore={() => onOpen(target)} moreLabel="Open in Growth" />
      <div className="sn-card sn-study-card flex flex-col p-5">
        <div className="flex items-start gap-2">
          <button type="button" className="sn-route-title sn-hit min-w-0 flex-1 text-left" onClick={() => onOpen(target)}>
            <h3 id="sn-route" className="text-[19px] leading-[24px] font-[650] tracking-[-0.02em] text-ink line-clamp-2 text-balance">
              {activeStudyGoal?.name || "Pick a study goal"}
            </h3>
          </button>
          {activeStudyGoal && (
            <button type="button" className="sn-icon-btn -mr-1 -mt-0.5" aria-label="Edit study goal" data-sound="open" onClick={() => setEditing(true)}>
              <Pencil size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        {activeSubjects.length > 1 && <div className="sn-study-subjects" role="group" aria-label="Active study subjects">{activeSubjects.map(subject => <button key={subject.id} className="sn-btn sn-btn-outline" aria-pressed={subject.goal.name === activeStudyGoal?.name} onClick={() => focusStudy(subject.id)}>{subject.goal.name}</button>)}</div>}
        <div className="sn-meta mt-2">
          <span>
            <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
            <Num value={studied} suffix={` of ${days} days`} />
          </span>
          <span>
            <Flame size={14} strokeWidth={1.75} aria-hidden="true" />
            <Num value={streak} suffix="-day streak" />
          </span>
          {activeStudyGoal?.target && (
            <span>
              <Target size={14} strokeWidth={1.75} aria-hidden="true" />
              {activeStudyGoal.target}
            </span>
          )}
        </div>

        <div className={`sn-map my-4 ${activeStudyGoal ? "" : "is-empty"}`}>
          <RouteMap weeks={weeks} stops={stops} studiedToday={studiedToday} empty={!activeStudyGoal} />

          <div className="sn-map-weeks" role="group" aria-label="Weeks shown">
            {ROUTE_WEEKS.map((w) => (
              <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)} aria-label={`${w} ${w === 1 ? "week" : "weeks"}`}>
                {w}w
              </button>
            ))}
          </div>
          <button type="button" className="sn-map-go" aria-label={activeStudyGoal ? "Open study goal in Growth" : "Choose a certification in Growth"} onClick={() => onOpen(target)}>
            <ArrowUpRight size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {activeStudyGoal ? (
          // A real toggle: tick it, and tap again to undo. Writes through the
          // synced study history (local + Firestore), like the Growth grid.
          <button
            type="button"
            className={`sn-btn sn-btn-block mt-auto sn-studied ${studiedToday ? "is-on" : ""}`}
            title={studiedToday ? "Tap again to un-mark today" : undefined}
            aria-pressed={studiedToday}
            data-sound={studiedToday ? "toggleOff" : "check"}
            onClick={() => {
              if (studiedToday) {
                setStudiedToday(undefined);
              } else {
                setStudiedToday(true);
                markLearnStuffDone();
              }
            }}
          >
            <span className="sn-studied-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M3 7.4 5.8 10 11 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="sn-studied-label">{studiedToday ? "Studied today" : "I studied today"}</span>
          </button>
        ) : (
          <button type="button" className="sn-btn sn-btn-outline sn-btn-block mt-auto" onClick={() => onOpen("certifications")}>
            Choose a certification
          </button>
        )}
      </div>

      <StudyGoalSheet open={editing} onClose={() => setEditing(false)} />
    </section>
  );
}
