export type AnalyticsScope = "all" | "writing" | "projects";
export type AnalyticsReport = {
  configured: boolean;
  generatedAt: string;
  instrumentationStart: string | null;
  range: { from: string; to: string; scope: AnalyticsScope };
  days: { day: string; views: number; visitors: number }[];
  totals: { views: number; visits: number; engaged: number; actions: number; activeSeconds: number };
  previous: AnalyticsReport["totals"];
  breakdowns: { kind: string; label: string; count: number }[];
  journeys: { name: string; steps: { label: string; count: number }[] }[];
};
export function analyticsRange(from: string, to: string, scope: string) {
  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(to)) throw new Error("Choose valid calendar dates.");
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (days < 1 || days > 366) throw new Error("Choose a date range between 1 and 366 days.");
  if (!["all", "writing", "projects"].includes(scope)) throw new Error("Unknown content filter.");
  return { from, to, scope: scope as AnalyticsScope, days };
}
export const manilaDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);
export function initialAnalyticsRange(days = 30) {
  const to = manilaDate();
  return { from: new Date(Date.parse(to) - (days - 1) * 86400000).toISOString().slice(0, 10), to, scope: "all" as AnalyticsScope };
}
