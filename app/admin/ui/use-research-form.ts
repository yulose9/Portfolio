"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  keepRecovery,
  readRecovery,
  clearRecovery,
  registerProtection,
} from "./session";
import {
  journalWrite,
  journalRead,
  journalClear,
  journalFlush,
} from "./draft-journal";
/** The smaller research forms get the same expiry/restart protection as prose. */
export function useResearchForm<T extends { body: string }>(key: string) {
  const [value, setState] = useState<T | null>(null);
  const current = useRef<T | null>(null);
  const touched = useRef(false);
  const recoveredKey = useRef<string | undefined>(undefined);
  const recoveredToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void journalRead<T>(key).then((entries) => {
      if (!alive || touched.current) return;
      const session = readRecovery<T>(key);
      const item =
        session && (!entries[0] || session.at > entries[0].at)
          ? session
          : entries[0];
      if (item) {
        current.current = item.edit;
        recoveredKey.current = item.key;
        recoveredToken.current = item.token;
        setState(item.edit);
      }
    });
    return () => {
      alive = false;
    };
  }, [key]);
  const setValue = useCallback(
    (next: T | null) => {
      touched.current = true;
      current.current = next;
      setState(next);
      if (next) {
        keepRecovery(key, "form", next);
        void journalWrite(key, "form", next);
      } else {
        clearRecovery(key);
        void journalClear(key);
        if (recoveredKey.current) void journalClear(key, recoveredKey.current,recoveredToken.current);
        recoveredKey.current = undefined;
        recoveredToken.current = undefined;
      }
    },
    [key],
  );
  useEffect(
    () =>
      registerProtection(async () => {
        const form = current.current;
        if (!form) return { saved: true, recoverable: true };
        const temporary = keepRecovery(key, "form", form);
        await journalWrite(key, "form", form);
        return {
          saved: false,
          recoverable: (await journalFlush(key)) || temporary,
        };
      }),
    [key],
  );
  return [value, setValue] as const;
}
