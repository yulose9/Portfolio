// @ts-nocheck
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import {
  updateUserPreferences,
  saveDraft as saveDraftToService,
  clearDraft as clearDraftFromService,
  updateSession,
  updateAnalytics,
  subscribeToPreferences,
  initializePreferences,
} from "../services/userPreferences";

const PreferencesContext = createContext<any>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const prefs = await initializePreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error("Failed to initialize preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPreferences((updatedPrefs) => {
      setPreferences(updatedPrefs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateSessionActivity = () => {
      if (typeof window === "undefined") return;
      updateSession({
        lastActiveDate: new Date().toISOString(),
        lastActiveSection: window.location.pathname.split("/")[1] || "protocol",
      });
    };

    const interval = setInterval(updateSessionActivity, 30 * 60 * 1000);
    updateSessionActivity();

    return () => clearInterval(interval);
  }, []);

  const uiBatchRef = useRef<Record<string, any>>({});
  const uiBatchTimeoutRef = useRef<any>(null);

  const batchUIUpdate = useCallback((key: string, value: any) => {
    uiBatchRef.current[key] = value;

    if (uiBatchTimeoutRef.current) {
      clearTimeout(uiBatchTimeoutRef.current);
    }

    uiBatchTimeoutRef.current = setTimeout(async () => {
      const updates = { ...uiBatchRef.current };
      uiBatchRef.current = {};

      const updated = await updateUserPreferences("ui", updates);
      setPreferences(updated);
    }, 2000);
  }, []);

  const saveDraft = useCallback(async (draftType: string, content: any) => {
    const updated = await saveDraftToService(draftType, content);
    setPreferences(updated);
  }, []);

  const clearDraft = useCallback(async (draftType: string) => {
    const updated = await clearDraftFromService(draftType);
    setPreferences(updated);
  }, []);

  const setTheme = useCallback(
    (theme: string) => {
      setPreferences((prev: any) =>
        prev
          ? {
              ...prev,
              ui: { ...prev.ui, theme },
            }
          : prev,
      );

      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
      }

      batchUIUpdate("theme", theme);
    },
    [batchUIUpdate],
  );

  const setLastViewedTab = useCallback(
    (tab: string) => {
      setPreferences((prev: any) =>
        prev
          ? {
              ...prev,
              ui: { ...prev.ui, lastViewedTab: tab },
            }
          : prev,
      );

      batchUIUpdate("lastViewedTab", tab);
    },
    [batchUIUpdate],
  );

  const incrementAnalytic = useCallback(
    async (key: string) => {
      if (!preferences) return;
      const updated = await updateAnalytics({
        [key]: (preferences.analytics?.[key] || 0) + 1,
      });
      setPreferences(updated);
    },
    [preferences],
  );

  const updatePersonalization = useCallback(async (data: Record<string, any>) => {
    const updated = await updateUserPreferences("personalization", data);
    setPreferences(updated);
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      saveDraft,
      clearDraft,
      getDraft: (draftType: string) => preferences?.drafts?.[draftType],
      setTheme,
      setLastViewedTab,
      theme: preferences?.ui?.theme || "auto",
      lastViewedTab: preferences?.ui?.lastViewedTab || "protocol",
      incrementAnalytic,
      analytics: preferences?.analytics,
      updatePersonalization,
      personalization: preferences?.personalization,
    }),
    [
      preferences,
      isLoading,
      saveDraft,
      clearDraft,
      setTheme,
      setLastViewedTab,
      incrementAnalytic,
      updatePersonalization,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
