export type StudySubject = { goal: Record<string, any>; history: Record<string, boolean>; active: boolean; passedAt?: string };
export type StudyPortfolio = { version: 1; subjects: Record<string, StudySubject>; focusedId: string | null; multiple: boolean };
export const studyKey = (goal: Record<string, any>) => encodeURIComponent(String(goal.id ?? goal.name));

export function initialPortfolio(goal: Record<string, any> | null, history: Record<string, boolean> = {}): StudyPortfolio {
  const id = goal ? studyKey(goal) : null;
  return { version: 1, subjects: id ? { [id]: { goal: { ...goal }, history: { ...history }, active: true } } : {}, focusedId: id, multiple: false };
}

export function selectStudy(portfolio: StudyPortfolio, goal: Record<string, any>): StudyPortfolio {
  const id = studyKey(goal);
  const subjects = Object.fromEntries(Object.entries(portfolio.subjects).map(([key, subject]) => [key, { ...subject, active: portfolio.multiple ? subject.active : false }]));
  const previous = Object.prototype.hasOwnProperty.call(subjects, id) ? subjects[id] : undefined;
  const selected = { ...subjects, [id]: { goal: { ...goal, ...previous?.goal }, history: previous?.history ?? {}, active: true } };
  return { ...portfolio, subjects: selected, focusedId: id };
}

export function finishStudy(portfolio: StudyPortfolio, date: string): StudyPortfolio {
  const id = portfolio.focusedId;
  if (!id || !portfolio.subjects[id]) return portfolio;
  const subjects = { ...portfolio.subjects, [id]: { ...portfolio.subjects[id], active: false, passedAt: date, goal: { ...portfolio.subjects[id].goal, status: "done" } } };
  return { ...portfolio, subjects, focusedId: Object.keys(subjects).find(key => subjects[key].active && !subjects[key].passedAt) ?? null };
}
