// @ts-nocheck
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { updateTodayLog } from "../services/dataLogger";
import { usePersonalGoalDefinitions, usePersonalGoalHistory } from "../data/syncedData";
import { goalStreak, rewriteStreak, suggestGoals } from "../utils/streaks";
import { getPhDateKey } from "../utils/timeUtils";

const PersonalGoalsContext = createContext<any>(null);

const DEFAULT_GOAL_IDS = ["noPorn", "exercise"];
const DEFAULT_GOALS: Record<string, any> = {
  noPorn: {
    id: "noPorn",
    title: "No Porn",
    emoji: "🚫",
    color: "#5F8F69",
    type: "habit",
  },
  exercise: {
    id: "exercise",
    title: "Exercise",
    emoji: "🏋️",
    color: "#E2625C",
    type: "weight",
    currentWeight: 120,
    goalWeight: 90,
  },
};

export function PersonalGoalsProvider({ children }: { children: ReactNode }) {
  const [storedGoals, setGoals] = usePersonalGoalDefinitions();
  const [goalHistory, setGoalHistory] = usePersonalGoalHistory();

  // Stored definitions override the defaults field by field; a default goal
  // the user deleted is kept as a `deleted` tombstone so it stays gone.
  const goals = useMemo(() => {
    const merged: Record<string, any> = {};
    for (const id of new Set([...Object.keys(DEFAULT_GOALS), ...Object.keys(storedGoals || {})])) {
      const goal = { ...(DEFAULT_GOALS[id] || {}), ...((storedGoals || {})[id] || {}) };
      if (!goal.deleted) merged[id] = goal;
    }
    return merged;
  }, [storedGoals]);

  useEffect(() => {
    updateTodayLog("growth", {
      current_weight: goals.exercise?.currentWeight || null,
      goal_weight: goals.exercise?.goalWeight || 90,
      noPorn_streak: goalStreak(goalHistory?.noPorn),
      exercise_streak: goalStreak(goalHistory?.exercise),
    });
  }, [goals, goalHistory]);

  const toggleGoalDate = useCallback(
    (goalId: string, dateStr: string) => {
      setGoalHistory((prev: any) => {
        const goalData = (prev && prev[goalId]) || {};
        const current = goalData[dateStr];
        if (current === false) {
          const { [dateStr]: _removed, ...rest } = goalData;
          return { ...(prev || {}), [goalId]: rest };
        }
        return { ...(prev || {}), [goalId]: { ...goalData, [dateStr]: current === undefined } };
      });
    },
    [setGoalHistory],
  );

  /** Set one day directly: true kept, false missed, undefined not logged. */
  const setGoalDate = useCallback(
    (goalId: string, dateStr: string, value: boolean | undefined) => {
      setGoalHistory((prev: any) => {
        const { [dateStr]: _old, ...rest } = (prev && prev[goalId]) || {};
        return { ...(prev || {}), [goalId]: value === undefined ? rest : { ...rest, [dateStr]: value } };
      });
    },
    [setGoalHistory],
  );

  const getGoalHistory = useCallback((goalId: string) => (goalHistory && goalHistory[goalId]) || {}, [goalHistory]);

  const updateWeight = useCallback(
    (newWeight: number) => {
      setGoals((prev: any) => ({
        ...(prev || {}),
        exercise: { ...DEFAULT_GOALS.exercise, ...(prev?.exercise || {}), currentWeight: newWeight },
      }));
    },
    [setGoals],
  );

  const addGoal = useCallback(
    (emoji: string, title: string, color = "#5F8F69", extra: Record<string, any> = {}) => {
      const id = `goal-${Date.now()}`;
      setGoals((prev: any) => ({
        ...(prev || {}),
        [id]: {
          id,
          title,
          emoji,
          color,
          type: "habit",
          createdAt: new Date().toISOString(),
          startDate: getPhDateKey(),
          ...extra,
        },
      }));
      return id;
    },
    [setGoals],
  );

  /** Change any part of a goal: title, emoji, colour, start date, Home pin. */
  const updateGoal = useCallback(
    (goalId: string, patch: Record<string, any>) => {
      setGoals((prev: any) => ({
        ...(prev || {}),
        [goalId]: { ...(DEFAULT_GOALS[goalId] || {}), ...((prev || {})[goalId] || {}), ...patch, id: goalId },
      }));
    },
    [setGoals],
  );

  /** Make the current streak exactly `length` days (see rewriteStreak). */
  const setGoalStreak = useCallback(
    (goalId: string, length: number, opts?: { includeToday?: boolean }) => {
      setGoalHistory((prev: any) => ({
        ...(prev || {}),
        [goalId]: rewriteStreak((prev || {})[goalId] || {}, length, opts),
      }));
    },
    [setGoalHistory],
  );

  /** Pin to (or unpin from) Home's "Keep going" card. Pins keep the order they were made in. */
  const setGoalPinned = useCallback(
    (goalId: string, pinned: boolean) => updateGoal(goalId, pinned ? { pinnedAt: Date.now(), hiddenAt: null } : { pinnedAt: null }),
    [updateGoal],
  );

  /** Hide a goal from Home (never pinned, never suggested) or show it again. Growth still lists it. */
  const setGoalHidden = useCallback(
    (goalId: string, hidden: boolean) => updateGoal(goalId, hidden ? { hiddenAt: Date.now(), pinnedAt: null } : { hiddenAt: null }),
    [updateGoal],
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      setGoals((prev: any) => {
        const { [goalId]: _removed, ...rest } = prev || {};
        // A built-in goal would come back from the defaults: leave a tombstone.
        return DEFAULT_GOAL_IDS.includes(goalId) ? { ...rest, [goalId]: { id: goalId, deleted: true } } : rest;
      });
      setGoalHistory((prev: any) => {
        const { [goalId]: _removed, ...rest } = prev || {};
        return rest;
      });
      return true;
    },
    [setGoals, setGoalHistory],
  );

  const getGoalsArray = useCallback(
    () =>
      Object.values(goals).sort((a: any, b: any) => {
        if (a.homeOrder !== b.homeOrder && (Number.isFinite(a.homeOrder) || Number.isFinite(b.homeOrder))) return (a.homeOrder ?? Infinity) - (b.homeOrder ?? Infinity);
        const order = (g: any) => {
          const i = DEFAULT_GOAL_IDS.indexOf(g.id);
          return i === -1 ? 2 : i;
        };
        if (order(a) !== order(b)) return order(a) - order(b);
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }),
    [goals],
  );

  const reorderGoals = useCallback((ids: string[]) => {
    setGoals((prev: any) => {
      const next = { ...prev };
      [...new Set(ids)].forEach((id, homeOrder) => {
        if (!goals[id] || prev?.[id]?.deleted) return;
        next[id] = { ...(DEFAULT_GOALS[id] || {}), ...prev?.[id], homeOrder };
      });
      return next;
    });
  }, [setGoals, goals]);

  const getGoalStreak = useCallback((goalId: string) => goalStreak(goalHistory?.[goalId]), [goalHistory]);

  /**
   * What Home's "Keep going" shows: your pinned goals in pin order, topped up
   * with the system's picks (streaks at risk first). Each entry says why.
   */
  const getHomeGoals = useCallback(
    (limit = 3) => {
      const all = getGoalsArray().filter((g: any) => !g.hiddenAt);
      const picks = suggestGoals(all, goalHistory || {});
      const byId = Object.fromEntries(picks.map((p) => [p.id, p]));
      const pinned = all
        .filter((g: any) => g.pinnedAt)
        .sort((a: any, b: any) => (a.homeOrder ?? Infinity) - (b.homeOrder ?? Infinity) || a.pinnedAt - b.pinnedAt)
        .map((g: any) => ({ goal: g, ...byId[g.id], pinned: true }));
      const fill = picks
        .filter((p) => !pinned.some((x: any) => x.goal.id === p.id))
        .sort((a, b) => (goals[a.id].homeOrder ?? Infinity) - (goals[b.id].homeOrder ?? Infinity))
        .map((p) => ({ goal: goals[p.id], ...p, pinned: false }));
      return [...pinned, ...fill].slice(0, limit);
    },
    [getGoalsArray, goalHistory, goals],
  );

  const value = useMemo(
    () => ({
      goals,
      goalHistory,
      toggleGoalDate,
      setGoalDate,
      getGoalHistory,
      updateWeight,
      getGoalStreak,
      addGoal,
      updateGoal,
      setGoalStreak,
      setGoalPinned,
      setGoalHidden,
      deleteGoal,
      getGoalsArray,
      getHomeGoals,
      reorderGoals,
    }),
    [
      goals,
      goalHistory,
      toggleGoalDate,
      setGoalDate,
      getGoalHistory,
      updateWeight,
      getGoalStreak,
      addGoal,
      updateGoal,
      setGoalStreak,
      setGoalPinned,
      setGoalHidden,
      deleteGoal,
      getGoalsArray,
      getHomeGoals,
      reorderGoals,
    ],
  );

  return <PersonalGoalsContext.Provider value={value}>{children}</PersonalGoalsContext.Provider>;
}

export function usePersonalGoals() {
  const context = useContext(PersonalGoalsContext);
  if (!context) {
    throw new Error("usePersonalGoals must be used within a PersonalGoalsProvider");
  }
  return context;
}
