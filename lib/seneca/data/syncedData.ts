// @ts-nocheck
"use client";

/**
 * Everything the app syncs across devices, declared once.
 */

import { defineSyncedField } from "../hooks/useSyncedField";

// Arrays of { id } records: cloud order, local version wins on conflict
const mergeById = <T extends { id: string | number }>(local: T[] = [], cloud: T[] = []): T[] => [
  ...cloud.map((c) => local.find((l) => l.id === c.id) || c),
  ...local.filter((l) => !cloud.some((c) => c.id === l.id)),
];

// { key: value } maps: union, local wins
const mergeMap = <T extends Record<string, any>>(local: T = {} as T, cloud: T = {} as T): T => ({
  ...(cloud || {}),
  ...(local || {}),
});

// { outerKey: { innerKey: value } }: union per outer key, local wins
const mergeNestedMap = <T extends Record<string, Record<string, any>>>(
  local: T = {} as T,
  cloud: T = {} as T,
): T => {
  const merged: Record<string, any> = {};
  new Set([...Object.keys(cloud || {}), ...Object.keys(local || {})]).forEach((k) => {
    merged[k] = { ...((cloud && cloud[k]) || {}), ...((local && local[k]) || {}) };
  });
  return merged as T;
};

// ─── Study goal ──────────────────────────────────────────────────────────────
export const useStudyPortfolio = defineSyncedField<import("../utils/studyPortfolio").StudyPortfolio | null>("studyGoal", "portfolio", {
  initial: null,
  storageKey: "study_portfolio_v1",
});

export const useActiveStudyGoal = defineSyncedField<any>("studyGoal", "activeStudyGoal", {
  initial: null,
  storageKey: "study_goal_active",
});

export const useStudyHistory = defineSyncedField<Record<string, boolean>>("studyGoal", "studyHistory", {
  initial: {},
  storageKey: "study_goal_history",
  mergeDirty: mergeMap,
});

// ─── Personal goals ──────────────────────────────────────────────────────────
export const usePersonalGoalDefinitions = defineSyncedField<Record<string, any>>(
  "personalGoals",
  "goals",
  {
    initial: {},
    storageKey: "personal_goals_config",
    mergeDirty: mergeMap,
  },
);

export const usePersonalGoalHistory = defineSyncedField<Record<string, Record<string, boolean>>>(
  "personalGoals",
  "goalHistory",
  {
    initial: {},
    storageKey: "personal_goals_history",
    mergeDirty: mergeNestedMap,
  },
);

// Life calendar: birthday and the age you count toward. Lives on the
// personalGoals doc so it syncs with the goals it sits beside.
export const useLifeSettings = defineSyncedField<{ birthDate: string; targetAge: number }>("personalGoals", "life", {
  initial: { birthDate: "2000-01-01", targetAge: 90 },
  storageKey: "seneca_life_settings",
  mergeDirty: mergeMap,
});

// ─── Journal ─────────────────────────────────────────────────────────────────
export const useJournalEntries = defineSyncedField<any[]>("journal", "entries", {
  initial: [],
  storageKey: "journal_entries",
  mergeDirty: (local, cloud) => mergeById(local, cloud).sort((a, b) => b.id - a.id),
});

// ─── Wealth ──────────────────────────────────────────────────────────────────
export const useWealthAssets = defineSyncedField<any[]>("wealth", "assets", {
  initial: [],
  storageKey: "wealth_assets",
  mergeDirty: mergeById,
});

export const useWealthLiabilities = defineSyncedField<any[]>("wealth", "liabilities", {
  initial: [],
  storageKey: "wealth_liabilities",
  mergeDirty: mergeById,
});

export const useWealthTransactions = defineSyncedField<any[]>("wealth", "transactions", {
  initial: [],
  storageKey: "wealth_transactions",
  mergeDirty: (local, cloud) =>
    mergeById(local, cloud).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
});

export const useWealthSearchHistory = defineSyncedField<string[]>("wealth", "search_history", {
  initial: [],
  storageKey: "wealth_search_history",
});

// ─── Certifications ──────────────────────────────────────────────────────────
export const useCustomCertifications = defineSyncedField<any[]>(
  "certifications",
  "customCertifications",
  {
    initial: [],
    storageKey: "seneca_custom_certifications",
    mergeDirty: mergeById,
  },
);

export const useCertificationDomains = defineSyncedField<any[]>("certifications", "domains", {
  initial: () => {
    if (typeof window === "undefined") return [];
    try {
      const legacy = JSON.parse(localStorage.getItem("seneca_certification_statuses") || "{}");
      return [{ modules: Object.entries(legacy).map(([name, status]) => ({ name, status })) }];
    } catch {
      return [];
    }
  },
  storageKey: "seneca_domains",
});

export const useWealthBudgets = defineSyncedField<Record<string, import('../utils/wealthPlanning').CategoryBudget>>("wealth", "categoryBudgetsV1", { initial: {}, storageKey: "wealth_category_budgets_v1", mergeDirty: mergeMap });
export const useWealthPlanning = defineSyncedField<Record<string, import('../services/wealthLedger').PlanItem>>("wealth", "planningV1", {initial: {}, storageKey: "wealth_planning_v1", mergeDirty: mergeMap});
