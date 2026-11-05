"use client";
import { useEffect, useRef, useState } from "react";
import { getLogForDate, subscribeToTodayLog, updateLogForDate } from "../services/dataLogger";
import { useProtocol } from "../context/ProtocolContext";
import { getPhDateKey } from "../utils/timeUtils";
import { useProtocolCalendarDays } from "../data/syncedData";
import { summarizeDay, type DayPhases, type DayTask } from "../utils/protocolDay";

/** A selected day's snapshot. Requests are cancelled on date/category changes. */
export function useProtocolDay(date: string) {
  const { phaseTasks, phases, taskHistory, protocolCategory, setTaskDate, toggleTask } = useProtocol() as {
    phaseTasks: Record<string, DayTask[]>;
    phases: Record<string, { title: string; emoji: string }>;
    taskHistory: Record<string, Record<string, boolean>>;
    protocolCategory: string;
    setTaskDate: (phase: string, id: string | number, date: string, done: boolean) => void;
    toggleTask: (phase: string, id: string | number) => void;
  };
  const section = protocolCategory === "personal" ? "protocol" : `protocol_${protocolCategory}`;
  const [, setCalendarDays] = useProtocolCalendarDays();
  const key = `${date}/${section}`;
  const historical = date !== getPhDateKey();
  const [snapshot, setSnapshot] = useState<{ key: string; phases: DayPhases | null; error?: string } | null>(null);
  const latest = useRef<DayPhases>({});
  useEffect(() => {
    if (!historical) return;
    let cancelled = false, received = false;
    const accept = (log: Record<string, any>) => {
      if (!cancelled) setSnapshot({ key, phases: log[section]?.phases || null });
    };
    const stop = subscribeToTodayLog((log, meta) => {
      if (meta?.exists) { received = true; accept(log); }
    }, date);
    void getLogForDate(date).then(log => { if (!received) accept(log); }).catch(() => {
      if (!cancelled) setSnapshot({ key, phases: null, error: "Could not load this day. Select it again to retry." });
    });
    return () => { cancelled = true; stop(); };
  }, [date, key, section, historical]);

  const record = snapshot?.key === key ? snapshot : null;
  const source: DayPhases = historical && record?.phases ? record.phases : Object.fromEntries(Object.entries(phaseTasks).map(([id, tasks]) => [id, { title: phases[id]?.title, emoji: phases[id]?.emoji, tasks: tasks as DayTask[] }]));
  const displayed: DayPhases = Object.fromEntries(Object.entries(source).map(([id, phase]) => [id, { ...phase, tasks: (phase.tasks || []).map(task => ({ ...task, done: historical ? taskHistory[`${id}-${task.id}`]?.[date] ?? (record?.phases ? !!task.done : false) : !!task.done })) }]));
  useEffect(() => { latest.current = displayed; });
  const save = (next: DayPhases) => {
    latest.current = next;
    setSnapshot({ key, phases: next });
    updateLogForDate(date, section, summarizeDay(next));
    const keys = Object.entries(next).flatMap(([id, phase]) => phase.tasks.map(task => `${id}-${task.id}`));
    setCalendarDays(previous => ({ ...previous, [protocolCategory]: { ...previous[protocolCategory], [date]: keys } }));
  };
  const editTask = (phaseId: string, task: DayTask, previousPhase = phaseId) => {
    if (!historical || !record || record.error) return;
    const next = { ...latest.current };
    if (previousPhase !== phaseId) {
      next[previousPhase] = { ...next[previousPhase], tasks: (next[previousPhase]?.tasks || []).filter(item => item.id !== task.id) };
      setTaskDate(previousPhase, task.id, date, false);
      // Built-in IDs repeat across phases. Moving one must never replace another habit.
      task = { ...task, id: `day-${crypto.randomUUID()}` };
      setTaskDate(phaseId, task.id, date, task.done);
    }
    const items = next[phaseId]?.tasks || [];
    next[phaseId] = { ...next[phaseId], title: phases[phaseId]?.title, tasks: items.some(item => item.id === task.id) ? items.map(item => item.id === task.id ? task : item) : [...items, task] };
    save(next);
  };
  const removeTask = (phaseId: string, taskId: string | number) => {
    if (!historical || !record || record.error) return;
    const next = { ...latest.current, [phaseId]: { ...latest.current[phaseId], tasks: latest.current[phaseId].tasks.filter(task => task.id !== taskId) } };
    setTaskDate(phaseId, taskId, date, false);
    save(next);
  };
  const toggle = (phaseId: string, taskId: string | number) => {
    if (!historical) { toggleTask(phaseId, taskId); return; }
    if (!record || record.error) return;
    const phase = latest.current[phaseId];
    const task = phase?.tasks.find(item => item.id === taskId);
    if (!task) return;
    const done = !task.done;
    setTaskDate(phaseId, taskId, date, done);
    save({ ...latest.current, [phaseId]: { ...phase, tasks: phase.tasks.map(item => item.id === taskId ? { ...item, done } : item) } });
  };
  const reorder = (phaseId: string, tasks: DayTask[]) => {
    if (historical && record && !record.error) save({ ...latest.current, [phaseId]: { ...latest.current[phaseId], tasks } });
  };
  return { reorder, phaseTasks: Object.fromEntries(Object.entries(displayed).map(([id, phase]) => [id, phase.tasks])), loading: historical && !record, error: record?.error, historical, toggle, editTask, removeTask };
}
