// @ts-nocheck
/**
 * Data Logger Service (Firestore Edition)
 *
 * Paths:
 *   users/{uid}/daily_logs/{YYYY-MM-DD}   — per-day snapshot (PH timezone)
 *   users/{uid}/global_data/{docName}      — data that persists across days
 *
 * Sync engine guarantees (cost + correctness):
 * - ONE shared onSnapshot per document, reference-counted and kept warm for 5 min.
 * - Writes are coalesced per document and HELD until the document has been
 *   hydrated from the server.
 * - Writes are diffed against the last known server state (stableEqual).
 * - Writes use `mergeFields` with `FieldPath`.
 * - Unsynced local edits are tracked as "dirty" in localStorage.
 * - Pending writes are flushed on pagehide / tab hide and before logout.
 */

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, FieldPath, onSnapshot, setDoc, runTransaction, type DocumentReference } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getPhDateKey } from "../utils/timeUtils";
import { isEqual } from "../utils/stableEqual";
import { switchPrivateCache } from "../utils/privateCache";

const STORAGE_KEY = "seneca_daily_logs";
const DIRTY_KEY = "seneca_sync_dirty";

const LISTENER_LINGER_MS = 5 * 60 * 1000; // keep idle listeners warm for 5 min
const DAILY_WRITE_DELAY = 1500;
const GLOBAL_WRITE_DELAY = 600;
const POST_HYDRATION_DELAY = 2500;
const HYDRATION_TIMEOUT_MS = 8000;

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const waitForAuth = async (): Promise<User | null> => {
  if (typeof window === "undefined") return null;
  if ("authStateReady" in auth && typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }
  preparePrivateSession(auth.currentUser?.uid || null);
  return auth.currentUser;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const readDirty = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}");
  } catch {
    return {};
  }
};

const setDirty = (key: string, dirty: boolean) => {
  if (typeof window === "undefined") return;
  const all = readDirty();
  if (dirty) all[key] = Date.now();
  else delete all[key];
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify(all));
  } catch {
    /* storage full — dirty tracking is best-effort */
  }
};

// ─── SHARED DOCUMENT ENGINE ───────────────────────────────────────────────────

export interface SnapshotMeta {
  fromCache?: boolean;
  hasPendingWrites?: boolean;
  exists: boolean;
  authoritative: boolean;
  replay?: boolean;
}

interface DocEntry {
  key: string;
  segments: string[];
  uid: string | null;
  ref: DocumentReference | null;
  subscribers: Set<(data: any, meta: SnapshotMeta) => void>;
  unsub: (() => void) | null;
  lingerTimer: any;
  attaching: Promise<void> | null;
  data: any;
  exists: boolean;
  meta: SnapshotMeta | null;
  hydrated: boolean;
  waiters: Array<(entry: DocEntry) => void>;
  pending: Record<string, any> | null;
  timer: any;
  inflight: number;
}

const _docs = new Map<string, DocEntry>();

const docKey = (segments: string[]) => segments.join("/");

const getEntry = (segments: string[]): DocEntry => {
  const key = docKey(segments);
  let entry = _docs.get(key);
  if (!entry) {
    entry = {
      key,
      segments,
      uid: null,
      ref: null,
      subscribers: new Set(),
      unsub: null,
      lingerTimer: null,
      attaching: null,
      data: null,
      exists: false,
      meta: null,
      hydrated: false,
      waiters: [],
      pending: null,
      timer: null,
      inflight: 0,
    };
    _docs.set(key, entry);
  }
  return entry;
};

const notify = (entry: DocEntry, meta: SnapshotMeta) => {
  entry.subscribers.forEach((cb) => {
    try {
      cb(entry.data, meta);
    } catch (error) {
      console.error(`[sync] subscriber error (${entry.key}):`, error);
    }
  });
};

const markHydrated = (entry: DocEntry) => {
  if (entry.hydrated) return;
  entry.hydrated = true;
  entry.waiters.splice(0).forEach((resolve) => resolve(entry));
  if (entry.pending) scheduleFlush(entry, POST_HYDRATION_DELAY);
};

const attach = (entry: DocEntry) => {
  if (typeof window === "undefined") return Promise.resolve();
  if (entry.unsub || entry.attaching) return entry.attaching;
  entry.attaching = waitForAuth().then((user) => {
    entry.attaching = null;
    if (!user) return;
    if (auth.currentUser?.uid !== user.uid || _docs.get(entry.key) !== entry) return;
    if (entry.subscribers.size === 0 && entry.waiters.length === 0 && !entry.pending) return;

    entry.uid = user.uid;
    entry.ref = doc(db, "users", user.uid, ...entry.segments);
    entry.unsub = onSnapshot(
      entry.ref,
      { includeMetadataChanges: true },
      (snap) => {
        if (entry.uid !== auth.currentUser?.uid) return;
        const { fromCache, hasPendingWrites } = snap.metadata;
        const exists = snap.exists();
        const data = exists ? snap.data() : null;
        const dataChanged =
          !entry.meta || exists !== entry.exists || !isEqual(data, entry.data);
        entry.exists = exists;
        entry.data = data;
        const authoritative =
          !fromCache || (exists && typeof navigator !== "undefined" && !navigator.onLine);
        const wasHydrated = entry.hydrated;
        entry.meta = { fromCache, hasPendingWrites, exists, authoritative };
        if (authoritative) markHydrated(entry);
        if (dataChanged || (entry.hydrated && !wasHydrated)) notify(entry, entry.meta);
      },
      (error) => {
        console.error(`Sync listener error (${entry.key}):`, error);
      },
    );
  });
  return entry.attaching;
};

const detach = (entry: DocEntry) => {
  clearTimeout(entry.lingerTimer);
  entry.lingerTimer = null;
  if (entry.unsub) entry.unsub();
  entry.unsub = null;
  entry.hydrated = false;
};

const scheduleLinger = (entry: DocEntry) => {
  clearTimeout(entry.lingerTimer);
  entry.lingerTimer = setTimeout(() => {
    if (entry.subscribers.size === 0 && !entry.pending && entry.inflight === 0) {
      detach(entry);
    }
  }, LISTENER_LINGER_MS);
};

const subscribeEntry = (
  segments: string[],
  callback: (data: any, meta: SnapshotMeta) => void,
) => {
  const entry = getEntry(segments);
  entry.subscribers.add(callback);
  clearTimeout(entry.lingerTimer);
  attach(entry);
  if (entry.meta) {
    const meta = entry.meta;
    queueMicrotask(() => {
      if (entry.subscribers.has(callback)) callback(entry.data, meta);
    });
  }
  return () => {
    entry.subscribers.delete(callback);
    if (entry.subscribers.size === 0) scheduleLinger(entry);
  };
};

const whenHydrated = (segments: string[], timeoutMs = HYDRATION_TIMEOUT_MS): Promise<DocEntry> => {
  const entry = getEntry(segments);
  if (entry.hydrated && entry.unsub) return Promise.resolve(entry);
  attach(entry);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const i = entry.waiters.indexOf(done);
      if (i !== -1) entry.waiters.splice(i, 1);
      if (entry.subscribers.size === 0) scheduleLinger(entry);
      resolve(entry);
    }, timeoutMs);
    function done(e: DocEntry) {
      clearTimeout(timer);
      if (e.subscribers.size === 0) scheduleLinger(e);
      resolve(e);
    }
    entry.waiters.push(done);
  });
};

const getAtPath = (obj: any, path: string) =>
  path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

const queueWrite = (segments: string[], fields: Record<string, any>, delay: number) => {
  const entry = getEntry(segments);
  entry.pending = { ...(entry.pending || {}), ...fields };
  setDirty(entry.key, true);
  clearTimeout(entry.lingerTimer);
  attach(entry);
  if (entry.hydrated) scheduleFlush(entry, delay);
};

const scheduleFlush = (entry: DocEntry, delay: number) => {
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => flush(entry), delay);
};

const flush = async (entry: DocEntry) => {
  clearTimeout(entry.timer);
  entry.timer = null;
  if (!entry.pending || !entry.hydrated || !entry.ref) return;
  if (auth.currentUser?.uid !== entry.uid) {
    entry.pending = null;
    return;
  }

  const pending = entry.pending;
  entry.pending = null;

  const changed: Record<string, any> = {};
  Object.entries(pending).forEach(([path, value]) => {
    if (!isEqual(getAtPath(entry.data, path), value)) changed[path] = value;
  });
  const paths = Object.keys(changed);

  if (paths.length === 0) {
    if (entry.inflight === 0) setDirty(entry.key, false);
    if (entry.meta) notify(entry, { ...entry.meta, replay: true });
    return;
  }

  const payload: Record<string, any> = {};
  paths.forEach((path) => {
    const parts = path.split(".");
    let node = payload;
    parts.slice(0, -1).forEach((p) => {
      node[p] = node[p] || {};
      node = node[p];
    });
    node[parts[parts.length - 1]] = changed[path];
  });
  const extras =
    entry.segments[0] === "daily_logs"
      ? { timestamp_updated: new Date().toISOString(), date: entry.segments[1], user_id: entry.uid }
      : { lastUpdated: new Date().toISOString() };
  Object.assign(payload, extras);

  entry.inflight += 1;
  try {
    const mergeFields = [...paths, ...Object.keys(extras)].map((p) => new FieldPath(...p.split(".")));
    await setDoc(entry.ref, payload, { mergeFields });
  } catch (error) {
    console.error(`Firestore write failed (${entry.key}):`, error);
    if (entry.uid === auth.currentUser?.uid) entry.pending = { ...changed, ...(entry.pending || {}) };
  } finally {
    entry.inflight -= 1;
  }

  if (entry.uid === auth.currentUser?.uid && !entry.pending && entry.inflight === 0) {
    setDirty(entry.key, false);
    if (entry.meta) notify(entry, { ...entry.meta, hasPendingWrites: false, replay: true });
    if (entry.subscribers.size === 0) scheduleLinger(entry);
  }
};

/** Flush every pending write now (pagehide, logout). */
export const flushPendingWrites = () =>
  Promise.all([..._docs.values()].filter((e) => e.pending).map((e) => flush(e)));

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flushPendingWrites());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingWrites();
  });
}

let sessionUid: string | null | undefined;
let sessionGeneration = 0;
const resetCallbacks = new Set<() => void>();
export const onPrivateSessionReset = (callback: () => void) => { resetCallbacks.add(callback); return () => { resetCallbacks.delete(callback); }; };
export const privateSessionGeneration = () => sessionGeneration;
export function preparePrivateSession(uid: string | null) {
  if (typeof window === "undefined" || sessionUid === uid) return;
  const changed = switchPrivateCache(localStorage, uid);
  if (changed || (sessionUid !== undefined && sessionUid !== uid)) {
    sessionGeneration++;
    _docs.forEach(entry => { clearTimeout(entry.timer); detach(entry); entry.pending=null; entry.ref=null; entry.uid=null; entry.subscribers.clear(); entry.waiters.splice(0).forEach(resolve=>resolve(entry)); });
    _docs.clear();
    resetCallbacks.forEach(reset => reset());
  }
  sessionUid = uid;
}
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, user => { try { preparePrivateSession(user?.uid || null); } catch { /* The app's auth gate shows storage errors and blocks mounting. */ } });
}

const logSegments = (dateKey: string) => ["daily_logs", dateKey];
const globalSegments = (docName: string) => ["global_data", docName];

export const createEmptyLog = (dateKey: string) => ({
  date: dateKey,
  user_id: auth.currentUser?.uid || "unknown",
  timestamp_created: new Date().toISOString(),
  timestamp_updated: new Date().toISOString(),
  protocol: {
    completion_rate: 0,
    phases: {},
    custom_tasks: [],
    task_order: {},
    reflections: "",
  },
  growth: {
    active_study_goal: null,
    study_history: {},
    study_streak: 0,
    personal_goals: {
      noPorn: {},
      exercise: {},
    },
    current_weight: null,
    goal_weight: 90,
    certificates: [],
    study_sessions: [],
    focus_time: 0,
    books_read: [],
    reflections: "",
  },
  wealth: {
    assets: [],
    liabilities: [],
    transactions: [],
    net_worth: 0,
    reflections: "",
  },
  journal: {
    entries: [],
    mood: null,
    highlights: [],
    challenges: [],
  },
  metadata: {
    app_version: "1.0.0",
    device: "web",
  },
});

// ─── DAILY LOG API ────────────────────────────────────────────────────────────

export const getLogForDate = async (dateKey = getPhDateKey()) => {
  const user = await waitForAuth();
  if (!user) return getLocalLog(dateKey);

  const entry = await whenHydrated(logSegments(dateKey));
  if (entry.exists && entry.data) {
    return { ...createEmptyLog(dateKey), ...entry.data };
  }
  return entry.hydrated ? createEmptyLog(dateKey) : getLocalLog(dateKey);
};

export const updateTodayLog = (section: string, data: Record<string, any>) => {
  const dateKey = getPhDateKey();
  const localLog = updateLocalLog(dateKey, section, data);

  const fields: Record<string, any> = {};
  Object.entries(data).forEach(([k, v]) => {
    fields[`${section}.${k}`] = v === undefined ? null : v;
  });
  queueWrite(logSegments(dateKey), fields, DAILY_WRITE_DELAY);

  return localLog;
};

export const hasPendingTodayWrite = (dateKey = getPhDateKey()) => {
  const entry = _docs.get(docKey(logSegments(dateKey)));
  return !!entry && (!!entry.pending || entry.inflight > 0);
};

export const subscribeToTodayLog = (
  callback: (log: any, meta: SnapshotMeta) => void,
  dateKey = getPhDateKey(),
) =>
  subscribeEntry(logSegments(dateKey), (data, meta) => {
    if (meta.exists && data) {
      const fullLog = { ...createEmptyLog(dateKey), ...data };
      saveToLocal(dateKey, fullLog);
      callback(fullLog, meta);
    } else {
      callback(createEmptyLog(dateKey), meta);
    }
  });

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────

const getLocalLog = (dateKey: string) => {
  if (typeof window === "undefined") return createEmptyLog(dateKey);
  try {
    const allData = localStorage.getItem(STORAGE_KEY);
    const logs = allData ? JSON.parse(allData) : {};
    return logs[dateKey] || createEmptyLog(dateKey);
  } catch {
    return createEmptyLog(dateKey);
  }
};

const updateLocalLog = (dateKey: string, section: string, data: Record<string, any>) => {
  const navLog = getLocalLog(dateKey);
  navLog[section] = {
    ...navLog[section],
    ...data,
  };
  navLog.timestamp_updated = new Date().toISOString();
  saveToLocal(dateKey, navLog);
  return navLog;
};

const saveToLocal = (dateKey: string, logData: any) => {
  if (typeof window === "undefined") return;
  try {
    const allData = localStorage.getItem(STORAGE_KEY);
    const logs = allData ? JSON.parse(allData) : {};
    logs[dateKey] = logData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Local save failed", e);
  }
};

// ─── EXPORT HELPERS (For ExportDataButton) ───────────────────────────────────

const getAllLogs = (): Record<string, any> => {
  if (typeof window === "undefined") return {};
  const allData = localStorage.getItem(STORAGE_KEY);
  return allData ? JSON.parse(allData) : {};
};

export const getLastNDaysLogs = (days = 30) => {
  const logs = getAllLogs();
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return Object.entries(logs)
    .filter(([dateKey]) => {
      const date = new Date(dateKey);
      return date >= cutoffDate;
    })
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([, log]) => log);
};

/** `logs`: newest first. Defaults to this device's cache; Home passes the days read from Firestore. */
export const exportForLLM = (days = 30, logs = getLastNDaysLogs(days)) => {

  return {
    user_profile: {
      user_id: auth.currentUser?.uid || "local_user",
      period: `Last ${days} days`,
      total_days: logs.length,
    },
    summary: {
      protocol: calculateProtocolSummary(logs),
      growth: calculateGrowthSummary(logs),
      wealth: calculateWealthSummary(logs),
      journal: calculateJournalSummary(logs),
    },
    daily_logs: logs,
    insights: {
      best_day: findBestDay(logs),
      worst_day: findWorstDay(logs),
      streaks: calculateStreaks(logs),
    },
  };
};

export const exportAsLLMPrompt = (days = 30, logs = getLastNDaysLogs(days)) => {
  const data = exportForLLM(days, logs);

  return `
# User Habit Data (Last ${days} Days)

## Summary
- Days Tracked: ${data.user_profile.total_days}
- Average Protocol Completion: ${data.summary.protocol?.average_completion || 0}%
- Current Streak: ${data.insights.streaks.current_streak} days
- Longest Streak: ${data.insights.streaks.longest_streak} days

## Daily Logs
${JSON.stringify(data.daily_logs, null, 2)}

## Analysis Questions
Based on this data, please analyze:
1. Which habits do I skip most often?
2. What patterns exist between my morning routine and overall day success?
3. Which days of the week am I most productive?
4. Are there any correlations between my mood and completion rate?
`;
};

const calculateProtocolSummary = (logs: any[]) => {
  const validLogs = logs.filter((log) => log.protocol);
  if (validLogs.length === 0) return null;

  const avgCompletion =
    validLogs.reduce((sum, log) => sum + (log.protocol.completion_rate || 0), 0) / validLogs.length;

  return {
    average_completion: Math.round(avgCompletion * 100) / 100,
    total_days_tracked: validLogs.length,
    phases_completed: validLogs.filter((log) => log.protocol.completion_rate === 1).length,
  };
};

const calculateGrowthSummary = (logs: any[]) => {
  const validLogs = logs.filter((log) => log.growth);
  if (validLogs.length === 0) return null;

  const totalStudyTime = validLogs.reduce(
    (sum, log) => sum + (log.growth.focus_time || 0),
    0,
  );

  return {
    total_study_time_minutes: totalStudyTime,
    total_sessions: validLogs.reduce((sum, log) => sum + (log.growth.study_sessions?.length || 0), 0),
    books_read: validLogs.reduce((sum, log) => sum + (log.growth.books_read?.length || 0), 0),
  };
};

const calculateWealthSummary = (logs: any[]) => {
  const validLogs = logs.filter((log) => log.wealth);
  if (validLogs.length === 0) return null;

  const transactions = validLogs.flatMap((log) => log.wealth.transactions || []);

  return {
    total_transactions: transactions.length,
    total_spent: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    latest_net_worth: validLogs[0]?.wealth?.net_worth || 0,
  };
};

const calculateJournalSummary = (logs: any[]) => {
  const validLogs = logs.filter((log) => log.journal);
  if (validLogs.length === 0) return null;

  const moods: Record<string, number> = {};
  logs.forEach((log) => {
    if (log.journal?.mood) {
      moods[log.journal.mood] = (moods[log.journal.mood] || 0) + 1;
    }
  });

  return {
    total_entries: validLogs.reduce((sum, log) => sum + (log.journal.entries?.length || 0), 0),
    mood_distribution: moods,
  };
};

const findBestDay = (logs: any[]) => {
  if (logs.length === 0) return null;
  return logs.reduce((best, current) => {
    const currentRate = current.protocol?.completion_rate || 0;
    const bestRate = best.protocol?.completion_rate || 0;
    return currentRate > bestRate ? current : best;
  }, logs[0]);
};

const findWorstDay = (logs: any[]) => {
  if (logs.length === 0) return null;
  return logs.reduce((worst, current) => {
    const currentRate = current.protocol?.completion_rate || 0;
    const worstRate = worst.protocol?.completion_rate || 1;
    return currentRate < worstRate ? current : worst;
  }, logs[0]);
};

const calculateStreaks = (logs: any[]) => {
  let currentStreak = 0;
  let longestStreak = 0;

  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (let i = 0; i < sortedLogs.length; i++) {
    const completion = sortedLogs[i].protocol?.completion_rate || 0;
    if (completion >= 0.8) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
  };
};

// ─── GLOBAL DATA SYNC ─────────────────────────────────────────────────────────

export const getGlobalData = async (docName: string) => {
  const user = await waitForAuth();
  if (!user) return null;
  const entry = await whenHydrated(globalSegments(docName));
  if (entry.hydrated) return entry.exists ? entry.data : null;
  return entry.data ?? loadGlobalDataLocal(docName);
};

export const updateGlobalData = (docName: string, data: Record<string, any>) => {
  if (docName === "wealth" && Object.keys(data).some(key => ["assets", "liabilities", "transactions", "planningV1", "categoryBudgetsV1"].includes(key.split(".")[0]))) {
    throw new Error("Money records must be saved through the atomic ledger.");
  }
  const fields: Record<string, any> = {};
  Object.entries(data).forEach(([k, v]) => {
    fields[k] = v === undefined ? null : v;
  });
  queueWrite(globalSegments(docName), fields, GLOBAL_WRITE_DELAY);
  return Promise.resolve();
};

export const isGlobalDirty = (docName: string) => !!readDirty()[docKey(globalSegments(docName))];

export const hasPendingGlobalWrite = (docName: string) => {
  const entry = _docs.get(docKey(globalSegments(docName)));
  return !!entry && (!!entry.pending || entry.inflight > 0);
};

export const subscribeToGlobalData = (
  docName: string,
  callback: (data: any, meta: SnapshotMeta) => void,
  /** Every snapshot's metadata, including "this doc doesn't exist yet". */
  onMeta?: (meta: SnapshotMeta) => void,
) =>
  subscribeEntry(globalSegments(docName), (data, meta) => {
    onMeta?.(meta);
    if (!meta.exists || !data) return;
    saveGlobalDataLocal(docName, data);
    callback(data, meta);
  });

const GLOBAL_STORAGE_KEY = "seneca_global_data";

export const saveGlobalDataLocal = (docName: string, data: any) => {
  if (typeof window === "undefined") return;
  try {
    const allData = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || "{}");
    allData[docName] = data;
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(allData));
  } catch (e) {
    console.error("Failed to save global data locally:", e);
  }
};

const loadGlobalDataLocal = (docName: string) => {
  if (typeof window === "undefined") return null;
  try {
    const allData = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || "{}");
    return allData[docName] || null;
  } catch {
    return null;
  }
};

/** Monetary mutations use the server version and commit related fields together. */
export async function transactGlobalData(docName: string, mutate: (data: any) => any) {
  const user = await waitForAuth();
  if (!user) throw new Error("Sign in before saving to the cloud.");
  const entry = await whenHydrated(globalSegments(docName));
  if (!entry.hydrated || !entry.ref) throw new Error("Wait for cloud sync before changing money records.");
  if (entry.inflight) throw new Error("A save is in progress. Try again in a moment.");
  await flush(entry);
  if (entry.pending || entry.inflight) throw new Error("Finish syncing this device before changing money records.");
  const result = await runTransaction(db, async transaction => {
    if (auth.currentUser?.uid !== user.uid) throw new Error("Your sign-in changed. Reload before saving.");
    const snapshot = await transaction.get(entry.ref!);
    const patch = mutate(snapshot.data() || {});
    transaction.set(entry.ref!, {...patch, lastUpdated: new Date().toISOString()}, {mergeFields: [...Object.keys(patch), 'lastUpdated']});
    return patch;
  });
  if (auth.currentUser?.uid !== user.uid) throw new Error("Your sign-in changed. Reload to see the saved result.");
  return result;
}
