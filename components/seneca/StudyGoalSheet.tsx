// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useStudyGoal } from "@/lib/seneca/context/StudyGoalContext";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import Sheet from "./Sheet";
import NumberStepper from "./NumberStepper";
import AdminSelect from "@/app/admin/ui/AdminSelect";
import { studyKey } from "@/lib/seneca/utils/studyPortfolio";
import { playSound } from "@/app/components/ui/sound";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const ROUTE_WEEKS = [1, 2, 4, 8];

/** "Dec 2026" → { month: 11, year: 2026 }; anything else falls back to this year-end. */
export const parseTarget = (target) => {
  const m = String(target || "").match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  const month = m ? MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) : -1;
  const year = Number(getPhDateKey().slice(0, 4));
  return month >= 0 ? { month, year: Number(m[2]) } : { month: 11, year };
};

/**
 * Tune the study goal: when you mean to sit the exam (month and year), how
 * many weeks Home's route shows, and the current study streak.
 */
export default function StudyGoalSheet({ open, onClose }) {
  const { activeStudyGoal, updateStudyGoal, getStudyStreak, setStudyStreak, getStudiedToday, availableSubjects, activeSubjects, setStudyGoal, multipleStudy, setMultipleStudy, passStudyGoal } = useStudyGoal();
  const [confirmPass, setConfirmPass] = useState(false);
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [weeks, setWeeks] = useState(2);
  const [streak, setStreak] = useState(0);
  const [countToday, setCountToday] = useState(false);
  const thisYear = Number(getPhDateKey().slice(0, 4));

  useEffect(() => {
    if (!open || !activeStudyGoal) return;
    const t = parseTarget(activeStudyGoal.target);
    setMonth(t.month);
    setYear(t.year);
    setWeeks(activeStudyGoal.routeWeeks || 2);
    setStreak(getStudyStreak());
    setCountToday(getStudiedToday() === true);
    setConfirmPass(false);
  }, [open, activeStudyGoal?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeStudyGoal) return null;

  const save = () => {
    updateStudyGoal({ target: `${MONTHS[month]} ${year}`, routeWeeks: weeks });
    if (streak !== getStudyStreak() || countToday !== (getStudiedToday() === true)) {
      setStudyStreak(streak, { includeToday: countToday });
    }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label="Edit study goal" className="sn-sheet">
      <div className="sn-sheet-head">
        <div className="min-w-0">
          <h2>Study goal</h2>
          <p className="mt-0.5 truncate text-[13px] text-ink-2">{activeStudyGoal.name}</p>
        </div>
        <button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={onClose}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="sn-sheet-body">
        <AdminSelect label="Currently studying" value={studyKey(activeStudyGoal)} onValueChange={id => { const subject = availableSubjects.find(s => studyKey(s) === id); if (subject) setStudyGoal(subject); }} options={availableSubjects.map(s => ({ value: studyKey(s), label: s.name }))} />
        <p className="text-sm text-ink-2">Choosing a subject switches your route immediately.</p>
        <label className="sn-switch-row"><span><strong>Study more than one subject</strong><small>Each subject keeps its own days and streak.</small></span><input type="checkbox" role="switch" checked={multipleStudy} onChange={e => setMultipleStudy(e.target.checked)} /></label>
        {multipleStudy && <p className="text-sm text-ink-2">{activeSubjects.length} active subjects. Choosing another adds it to your current studies.</p>}
        <div className="sn-study-target">
        <AdminSelect className="sn-study-month" label="Target month" value={String(month)} onValueChange={value => setMonth(Number(value))} options={MONTHS.map((m,i) => ({ value: String(i), label: new Date(2000,i,1).toLocaleDateString('en-US', {month:'long'}) }))} />
        <div className="sn-field"><span>Target year</span><NumberStepper label="Year" value={year} onChange={setYear} min={thisYear} max={thisYear + 10} less="Year earlier" more="Year later" /></div>
        </div>

        <div className="sn-field">
          <span>Route on Home</span>
          <div className="sn-seg w-full" role="group" aria-label="Weeks shown">
            {ROUTE_WEEKS.map((w) => (
              <button key={w} type="button" className="flex-1" aria-pressed={weeks === w} onClick={() => setWeeks(w)}>
                {w === 1 ? "1 week" : `${w} weeks`}
              </button>
            ))}
          </div>
        </div>

        <div className="sn-field"><span>Current streak</span><NumberStepper label="Streak in days" value={streak} onChange={setStreak} min={0} max={3650} less="One day less" more="One day more" unit={streak === 1 ? 'day' : 'days'} /><small className="text-ink-2">Tap a number to edit it directly.</small></div>

        <label className="sn-switch-row">
          <span>
            <strong>Studied today</strong>
            <small>Count today in the streak.</small>
          </span>
          <input type="checkbox" role="switch" checked={countToday && streak > 0} disabled={streak === 0} onChange={(e) => setCountToday(e.target.checked)} />
        </label>
        <button type="button" className="sn-btn sn-btn-outline" data-sound="select" onClick={() => setConfirmPass(true)}>I passed this</button>
      </div>

      <div className="sn-sheet-foot">
        <div className="ml-auto flex gap-2">
          <button type="button" className="sn-btn sn-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="sn-btn sn-btn-primary" data-sound="pop" onClick={save}>
            Save
          </button>
        </div>
      </div>
      <Sheet open={confirmPass} onClose={() => setConfirmPass(false)} label="Confirm study completion" className="sn-sheet" zIndex={80}>
        <div className="sn-sheet-head"><h2>You passed {activeStudyGoal.name}?</h2></div>
        <div className="sn-sheet-body"><p>This marks the certification completed and keeps your study history. You can choose your next subject afterward.</p></div>
        <div className="sn-sheet-foot"><button className="sn-btn sn-btn-outline" onClick={() => setConfirmPass(false)}>Keep studying</button><button className="sn-btn sn-btn-primary" data-sound="none" onClick={() => { passStudyGoal(); playSound("accomplish"); setConfirmPass(false); onClose(); }}>Yes, I passed</button></div>
      </Sheet>
    </Sheet>
  );
}
