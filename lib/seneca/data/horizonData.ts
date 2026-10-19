"use client";
import { defineSyncedField } from '../hooks/useSyncedField';
import type { TimeBlock } from '../utils/horizon';

// Null tombstones keep removed blocks removed during offline reconciliation.
export const useTimeBlocks = defineSyncedField<Record<string, TimeBlock | null>>('personalGoals', 'timeBlocks', {
  initial: {}, storageKey: 'seneca_time_blocks',
  mergeDirty: (local = {}, cloud = {}) => ({ ...cloud, ...local }),
});
