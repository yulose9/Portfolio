export type DayTask = { id: string | number; title: string; emoji?: string; done: boolean; [key: string]: unknown };
export type DayPhases = Record<string, { title?: string; emoji?: string; tasks: DayTask[]; [key: string]: unknown }>;

export function validDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function summarizeDay(phases: DayPhases) {
  let total = 0, done = 0;
  const normalized = Object.fromEntries(Object.entries(phases).map(([id, phase]) => {
    const completed = phase.tasks.filter(task => task.done).length;
    total += phase.tasks.length; done += completed;
    return [id, { ...phase, total: phase.tasks.length, completed, completion_rate: phase.tasks.length ? completed / phase.tasks.length : 0, is_complete: phase.tasks.length > 0 && completed === phase.tasks.length }];
  }));
  return { phases: normalized, total_tasks: total, total_completed: done, completion_rate: total ? done / total : 0, all_phases_complete: total > 0 && done === total };
}

/** Positive evidence only: deleting a journal must not erase a manual completion. */
export function activityCompletions(entries: { isoDate?: string }[], exercise: Record<string, boolean>, study: Record<string, boolean>, subjects: Record<string, { history?: Record<string, boolean> }>, today: string) {
  const dates = (map: Record<string, boolean>) => Object.keys(map).filter(date => map[date] === true && validDayKey(date) && date <= today);
  return {
    "arena-1": [...new Set(entries.map(entry => entry.isoDate).filter((date): date is string => !!date && validDayKey(date) && date <= today))],
    "arena-5": dates(exercise),
    "arena-4": [...new Set([...dates(study), ...Object.values(subjects).flatMap(subject => dates(subject.history || {}))])],
  };
}

export function protocolAttention(category: string, date: string, now: Date) {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = local.toISOString().slice(0, 10);
  const active = category === "personal" && date === today;
  return { lunch: active && local.getUTCHours() === 12, shutdown: active && local.getUTCHours() >= 21 };
}
