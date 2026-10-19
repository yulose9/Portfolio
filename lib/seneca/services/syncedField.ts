// @ts-nocheck
/**
 * Synced field — one top-level field of users/{uid}/global_data/{docName},
 * mirrored into local state, localStorage and Firestore.
 */

import {
  hasPendingGlobalWrite,
  isGlobalDirty,
  subscribeToGlobalData,
  updateGlobalData,
  waitForAuth,
  onPrivateSessionReset,
  type SnapshotMeta,
} from "./dataLogger";
import { isEqual } from "../utils/stableEqual";

export interface SyncedFieldOptions<T> {
  initial?: T | (() => T);
  storageKey?: string;
  mergeDirty?: (local: T, cloud: T) => T;
}

/**
 * Where the value on screen came from:
 *   loading  nothing cached yet, waiting for Firebase's first answer
 *   cached   showing this device's copy while Firebase confirms it
 *   live     confirmed by Firebase (server snapshot)
 *   local    no Firebase user, so this device's copy is all there is
 *   offline  Firebase didn't answer in time; showing what we have
 */
export type SyncStatus = "loading" | "cached" | "live" | "local" | "offline";

export interface SyncedFieldController<T> {
  get: () => T;
  replaceCached: (value: T) => void;
  set: (valueOrFn: T | ((prev: T) => T)) => void;
  subscribe: (fn: () => void) => () => void;
  getStatus: () => SyncStatus;
  dispose: () => void;
}

const FIRST_ANSWER_TIMEOUT_MS = 8000;

const registry = new Map<string, SyncedFieldController<any>>();
const dirtyAtStart = new Map<string, boolean>();
onPrivateSessionReset(() => {
  registry.forEach(controller => controller.dispose());
  registry.clear();
  dirtyAtStart.clear();
});

const readLocal = <T>(storageKey?: string, fallback?: T): T => {
  if (!storageKey || typeof window === "undefined") return fallback as T;
  try {
    if (storageKey.startsWith("wealth_")) {
      const recovery = JSON.parse(localStorage.getItem("wealth_ledger_recovery") || "null");
      const field = {wealth_assets:"assets",wealth_liabilities:"liabilities",wealth_transactions:"transactions",wealth_planning_v1:"planningV1",wealth_category_budgets_v1:"categoryBudgetsV1"}[storageKey];
      if (recovery && field && field in recovery) return recovery[field];
    }
    const raw = localStorage.getItem(storageKey);
    return raw === null ? (fallback as T) : JSON.parse(raw);
  } catch {
    return fallback as T;
  }
};

const writeLocal = <T>(storageKey: string | undefined, value: T) => {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* quota exceeded */
  }
};

const createSyncedField = <T>(
  docName: string,
  field: string,
  { initial, storageKey, mergeDirty }: SyncedFieldOptions<T> = {},
): SyncedFieldController<T> => {
  if (!dirtyAtStart.has(docName)) dirtyAtStart.set(docName, isGlobalDirty(docName));

  const fallback = typeof initial === "function" ? (initial as () => T)() : (initial as T);
  let value: T = readLocal(storageKey, fallback);
  const hadLocal = !!storageKey && typeof window !== "undefined" && (() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  })();
  let status: SyncStatus = hadLocal ? "cached" : "loading";
  let statusChecked = false;
  let leftoverHandled = false;
  let unsubscribeCloud: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((fn) => fn());

  const apply = (next: T) => {
    value = next;
    writeLocal(storageKey, next);
    emit();
  };

  const setStatus = (next: SyncStatus) => {
    if (status === next) return;
    status = next;
    emit();
  };

  // Once someone is watching: learn whether Firebase can answer at all
  const checkStatus = () => {
    if (statusChecked || typeof window === "undefined") return;
    statusChecked = true;
    waitForAuth().then((user) => {
      if (!user) return setStatus("local");
      setTimeout(() => {
        if (status === "loading" || status === "cached") setStatus("offline");
      }, FIRST_ANSWER_TIMEOUT_MS);
    });
  };

  const onCloud = (data: Record<string, any>, meta: SnapshotMeta) => {
    if (meta.authoritative) setStatus("live");
    if (!(field in data)) {
      if (docName === "wealth" && meta.authoritative && !hasPendingGlobalWrite(docName)) apply(fallback);
      return;
    }
    const cloud = data[field];

    if (!leftoverHandled && meta.authoritative) {
      leftoverHandled = true;
      // Money is committed atomically by mutateWealth. A dirty summary must
      // never cause a stale cached ledger to be merged back over the server.
      const atomicMoneyField = docName === "wealth" && ["assets", "liabilities", "transactions", "planningV1", "categoryBudgetsV1"].includes(field);
      if (dirtyAtStart.get(docName) && !atomicMoneyField) {
        const merged = mergeDirty ? mergeDirty(value, cloud) : value;
        if (!isEqual(merged, value)) apply(merged);
        updateGlobalData(docName, { [field]: merged });
        return;
      }
    }

    if (hasPendingGlobalWrite(docName)) return;
    if (!isEqual(cloud, value)) apply(cloud);
  };

  return {
    dispose: () => { unsubscribeCloud?.(); unsubscribeCloud = null; listeners.clear(); },
    get: () => value,
    replaceCached: apply,
    set: (valueOrFn) => {
      const next = typeof valueOrFn === "function" ? (valueOrFn as (prev: T) => T)(value) : valueOrFn;
      if (next === value) return;
      apply(next);
      updateGlobalData(docName, { [field]: next });
    },
    getStatus: () => status,
    subscribe: (fn) => {
      listeners.add(fn);
      checkStatus();
      if (!unsubscribeCloud) unsubscribeCloud = subscribeToGlobalData(docName, onCloud, (meta) => {
        if (meta.authoritative) setStatus("live");
        if (docName === "wealth" && meta.authoritative && !meta.exists && !hasPendingGlobalWrite(docName)) apply(fallback);
      });
      return () => {
        listeners.delete(fn);
        if (listeners.size === 0 && unsubscribeCloud) {
          unsubscribeCloud();
          unsubscribeCloud = null;
        }
      };
    },
  };
};

export const getSyncedField = <T>(
  docName: string,
  field: string,
  options: SyncedFieldOptions<T> = {},
): SyncedFieldController<T> => {
  const key = `${docName}/${field}`;
  let controller = registry.get(key);
  if (!controller) {
    controller = createSyncedField(docName, field, options);
    registry.set(key, controller);
  }
  return controller;
};
