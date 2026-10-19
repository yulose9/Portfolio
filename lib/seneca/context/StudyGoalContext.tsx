"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { updateTodayLog } from "../services/dataLogger";
import { useActiveStudyGoal, useStudyHistory, useStudyPortfolio, useCertificationDomains, useCustomCertifications } from "../data/syncedData";
import { getPhDateKey, toDateKey } from "../utils/timeUtils";
import { rewriteStreak, studyStreak } from "../utils/streaks";
import { initialPortfolio, selectStudy, finishStudy, studyKey, type StudyPortfolio } from "../utils/studyPortfolio";

const StudyGoalContext = createContext<any>(null);
const EMPTY_HISTORY: Record<string, boolean> = {};

export function StudyGoalProvider({ children }: { children: ReactNode }) {
  const [legacyGoal] = useActiveStudyGoal();
  const [legacyHistory] = useStudyHistory();
  const [stored, setStored] = useStudyPortfolio();
  const [domains, setDomains] = useCertificationDomains();
  const [custom, setCustom] = useCustomCertifications();
  // The old fields stay intact. Migration is written only with an explicit edit.
  const portfolio = useMemo(() => stored ?? initialPortfolio(legacyGoal, legacyHistory), [stored, legacyGoal, legacyHistory]);
  const focused = portfolio.focusedId ? portfolio.subjects[portfolio.focusedId] : null;
  const activeStudyGoal = focused?.active && !focused.passedAt ? focused.goal : null;
  const studyHistory = focused?.history ?? EMPTY_HISTORY;
  const activeSubjects = Object.entries(portfolio.subjects).filter(([, subject]) => subject.active && !subject.passedAt).map(([id, subject]) => ({ id, ...subject }));
  const mutate = (fn: (p: StudyPortfolio) => StudyPortfolio) => setStored(prev => fn(prev ?? initialPortfolio(legacyGoal, legacyHistory)));
  const setHistory = (fn: (history: Record<string, boolean>) => Record<string, boolean>) => mutate(p => {
    const id = p.focusedId;
    if (!id || !p.subjects[id] || !p.subjects[id].active) return p;
    return { ...p, subjects: { ...p.subjects, [id]: { ...p.subjects[id], history: fn(p.subjects[id].history) } } };
  });
  const candidates = [...domains.flatMap(domain => [...(domain.modules ?? []), ...(domain.subcategories ?? []).flatMap((sub: any) => sub.modules ?? [])]), ...custom, ...Object.values(portfolio.subjects).map(s => s.goal)];
  const availableSubjects = Array.from(new Map(candidates.filter(c => c?.name).map(c => [studyKey(c), c])).values());
  useEffect(() => {
    updateTodayLog("growth", { active_study_goal: activeStudyGoal, study_streak: studyStreak(studyHistory) });
  }, [activeStudyGoal, studyHistory]);

  const setStudiedToday = (value: boolean | undefined) => setHistory(history => {
    const next = { ...history };
    if (value === undefined) delete next[getPhDateKey()];
    else next[getPhDateKey()] = value;
    return next;
  });
  const passStudyGoal = () => {
    if (!activeStudyGoal) return;
    const id = studyKey(activeStudyGoal);
    const completed = { status: "done", passedAt: getPhDateKey() };
    const update = (cert: any) => studyKey(cert) === id ? { ...cert, ...completed } : cert;
    mutate(p => finishStudy(p, getPhDateKey()));
    if (custom.some(cert => studyKey(cert) === id)) setCustom(prev => prev.map(update));
    else setDomains(prev => {
      const found = prev.some(d => [...(d.modules ?? []), ...(d.subcategories ?? []).flatMap((s: any) => s.modules ?? [])].some(c => studyKey(c) === id));
      const updated = prev.map(d => ({ ...d, ...(d.modules ? { modules: d.modules.map(update) } : {}), ...(d.subcategories ? { subcategories: d.subcategories.map((s: any) => ({ ...s, modules: s.modules.map(update) })) } : {}) }));
      return found ? updated : [...updated, { modules: [{ ...activeStudyGoal, ...completed }] }];
    });
  };
  return <StudyGoalContext.Provider value={{
    activeStudyGoal, studyHistory, activeSubjects, availableSubjects, multipleStudy: portfolio.multiple,
    setStudyGoal: (goal: any) => mutate(p => selectStudy(p, goal)),
    focusStudy: (id: string) => mutate(p => p.subjects[id]?.active ? { ...p, focusedId: id } : p),
    setMultipleStudy: (multiple: boolean) => mutate(p => ({ ...p, multiple, subjects: Object.fromEntries(Object.entries(p.subjects).map(([id, s]) => [id, { ...s, active: multiple ? s.active : id === p.focusedId && !s.passedAt }])) })),
    clearStudyGoal: () => mutate(p => ({ ...p, focusedId: null, subjects: Object.fromEntries(Object.entries(p.subjects).map(([id, s]) => [id, { ...s, active: false }])) })),
    passStudyGoal,
    toggleStudyDate: (date: string) => setHistory(history => { const next = { ...history }; if (next[date] === false) delete next[date]; else next[date] = next[date] === undefined; return next; }),
    markStudiedToday: (value: boolean, onStudied?: () => void) => { setStudiedToday(value); if (value) onStudied?.(); },
    setStudiedToday,
    getStudiedToday: () => studyHistory[getPhDateKey()],
    getTodayStr: getPhDateKey,
    getStudyStreak: () => studyStreak(studyHistory),
    updateStudyGoal: (patch: Record<string, any>) => mutate(p => { const id = p.focusedId; return id ? { ...p, subjects: { ...p.subjects, [id]: { ...p.subjects[id], goal: { ...p.subjects[id].goal, ...patch } } } } : p; }),
    setStudyStreak: (length: number, opts?: { includeToday?: boolean }) => setHistory(history => Object.fromEntries(Object.entries(rewriteStreak(history, length, opts)).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"))),
    formatLocalDate: toDateKey,
  }}>{children}</StudyGoalContext.Provider>;
}

export function useStudyGoal() {
  const context = useContext(StudyGoalContext);
  if (!context) throw new Error("useStudyGoal must be used within a StudyGoalProvider");
  return context;
}
export default StudyGoalContext;
