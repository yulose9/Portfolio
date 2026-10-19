// @ts-nocheck
"use client";

import { useSyncExternalStore } from "react";
import { getSyncedField, type SyncedFieldOptions } from "../services/syncedField";

/**
 * Define a hook for one field synced across devices via Firestore global_data.
 * The hook behaves like useState:
 *   const [entries, setEntries] = useJournalEntries();
 */
export function defineSyncedField<T>(
  docName: string,
  field: string,
  options: SyncedFieldOptions<T> = {},
) {
  function useSyncedField(): [T, (valueOrFn: T | ((prev: T) => T)) => void] {
    const controller = getSyncedField<T>(docName, field, options);
    const value = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
    return [value, controller.set];
  }
  /** Where the value came from: loading | cached | live | local | offline. */
  useSyncedField.useStatus = function useSyncStatus() {
    const controller = getSyncedField<T>(docName, field, options);
    return useSyncExternalStore(controller.subscribe, controller.getStatus, () => "loading");
  };
  return useSyncedField;
}
