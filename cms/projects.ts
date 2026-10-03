import { websiteUrl } from "./website";
export type ProjectDetails = { role: string; timeframe: string; tools: string[]; links: { label: string; href: string }[]; outcomes: string[]; featured: boolean; order: number };
export function cleanProject(value: unknown): ProjectDetails {
  const v = (value && typeof value === "object" ? value : {}) as Partial<ProjectDetails>;
  return { role: String(v.role ?? "").slice(0, 300), timeframe: String(v.timeframe ?? "").slice(0, 100), tools: Array.isArray(v.tools) ? v.tools.slice(0, 40).map(t => String(t).slice(0, 100)) : [], links: Array.isArray(v.links) ? v.links.slice(0, 20).map(l => ({ label: String(l.label ?? "").slice(0, 100), href: websiteUrl(l.href) })) : [], outcomes: Array.isArray(v.outcomes) ? v.outcomes.slice(0, 20).map(t => String(t).slice(0, 1000)) : [], featured: Boolean(v.featured), order: Number.isFinite(v.order) ? Math.max(0, Math.min(100000, Number(v.order))) : 0 };
}
