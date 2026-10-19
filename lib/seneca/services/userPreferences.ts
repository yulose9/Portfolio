// @ts-nocheck
/**
 * User Preferences & Session Management Service
 * Path: users/{uid}/preferences/settings
 */

import { db, auth } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const PREFS_STORAGE_KEY = "seneca_user_preferences";

export const createDefaultPreferences = () => ({
  ui: {
    theme: "auto",
    lastViewedTab: "protocol",
    compactMode: false,
    animationsEnabled: true,
    fontSize: "medium",
    accentColor: "#007AFF",
  },
  drafts: {
    journal: {
      content: null,
      title: "",
      mood: "😊",
      lastModified: null,
    },
    protocolReflection: "",
    growthNotes: "",
    wealthNotes: "",
  },
  session: {
    lastActiveDate: null,
    lastActiveSection: "protocol",
    deviceInfo: {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      platform: typeof navigator !== "undefined" ? navigator.platform : "",
      language: typeof navigator !== "undefined" ? navigator.language : "",
    },
    sessionStartTime: new Date().toISOString(),
    totalSessionTime: 0,
  },
  analytics: {
    totalDaysTracked: 0,
    currentStreak: 0,
    longestStreak: 0,
    favoriteTimeToLog: "morning",
    mostProductiveDay: "Monday",
    totalJournalEntries: 0,
    totalTransactions: 0,
    averageCompletionRate: 0,
  },
  personalization: {
    displayName: "",
    favoriteEmoji: "⭐",
    dailyGoalText: "Make today count!",
    customGreeting: "",
    notificationsEnabled: false,
    reminderTime: "09:00",
  },
  metadata: {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  },
});

const getPrefsRef = () => {
  if (!auth.currentUser) return null;
  return doc(db, "users", auth.currentUser.uid, "preferences", "settings");
};

export const getLocalPreferences = () => {
  if (typeof window === "undefined") return createDefaultPreferences();
  try {
    const data = localStorage.getItem(PREFS_STORAGE_KEY);
    return data ? JSON.parse(data) : createDefaultPreferences();
  } catch {
    return createDefaultPreferences();
  }
};

const saveToLocal = (prefs: any) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save preferences locally:", e);
  }
};

export const getUserPreferences = async () => getLocalPreferences();

export const initializePreferences = async () => getLocalPreferences();

export const updateUserPreferences = async (section: string, data: Record<string, any>) => {
  const currentPrefs = getLocalPreferences();
  currentPrefs[section] = {
    ...currentPrefs[section],
    ...data,
  };
  currentPrefs.metadata = {
    ...currentPrefs.metadata,
    lastUpdated: new Date().toISOString(),
  };

  saveToLocal(currentPrefs);

  const ref = getPrefsRef();
  const keys = Object.keys(data);
  if (ref && keys.length > 0) {
    const payload = {
      [section]: Object.fromEntries(keys.map((k) => [k, data[k] === undefined ? null : data[k]])),
      metadata: { lastUpdated: currentPrefs.metadata.lastUpdated },
    };
    const fields = [...keys.map((k) => `${section}.${k}`), "metadata.lastUpdated"];
    setDoc(ref, payload, { mergeFields: fields }).catch((error) => {
      console.error("Failed to sync preferences to cloud:", error);
    });
  }

  return currentPrefs;
};

export const saveDraft = async (draftType: string, content: any) => {
  return updateUserPreferences("drafts", {
    [draftType]: {
      ...content,
      lastModified: new Date().toISOString(),
    },
  });
};

export const clearDraft = async (draftType: string) => {
  return updateUserPreferences("drafts", {
    [draftType]: {
      content: null,
      title: "",
      mood: "😊",
      lastModified: null,
    },
  });
};

export const updateSession = async (data: Record<string, any>) => {
  return updateUserPreferences("session", data);
};

export const updateAnalytics = async (data: Record<string, any>) => {
  return updateUserPreferences("analytics", data);
};

export const subscribeToPreferences = (callback: (prefs: any) => void) => {
  if (typeof window === "undefined") return () => {};
  const ref = getPrefsRef();
  if (!ref) return () => {};

  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const cloudPrefs = snap.data();
        const merged = { ...createDefaultPreferences(), ...cloudPrefs };
        saveToLocal(merged);
        callback(merged);
      }
    },
    (error) => {
      console.error("Preferences sync error:", error);
    },
  );
};
