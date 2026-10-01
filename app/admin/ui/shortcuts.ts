"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  SHORTCUTS,
  prettyKeys,
  shortcutKey,
  validateBindings,
  type Bindings,
  type ShortcutId,
} from "../../../cms/shortcuts";
export const SHORTCUT_STORAGE = "writing-shortcuts:v1";
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener("writing:shortcuts", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("writing:shortcuts", notify);
  };
};
const snapshot = () => {
  try {
    return localStorage.getItem(SHORTCUT_STORAGE) || "{}";
  } catch {
    return "{}";
  }
};
export function useBindings() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  return useMemo(() => {
    try {
      return validateBindings(JSON.parse(raw));
    } catch {
      return {};
    }
  }, [raw]);
}
export function readBindings(): Bindings {
  try {
    return validateBindings(
      JSON.parse(localStorage.getItem(SHORTCUT_STORAGE) || "{}"),
    );
  } catch {
    return {};
  }
}
export function useShortcuts(
  actions: Partial<Record<ShortcutId, () => void>>,
  canEdit: () => boolean,
) {
  useEffect(() => {
    let bindings = readBindings();
    const reload = () => {
      bindings = readBindings();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented || e.repeat) return;
      const key = shortcutKey(e);
      if (!key) return;
      const eligible = (id: ShortcutId) =>
        [
          "save",
          "find",
          "replace",
          "palette",
          "details",
          "preview",
          "publish",
        ].includes(id) || canEdit();
      const command = SHORTCUTS.find(
        (s) =>
          (bindings[s.id] ?? s.keys) === key && actions[s.id] && eligible(s.id),
      );
      const old = SHORTCUTS.find(
        (s) =>
          s.keys === key &&
          bindings[s.id] &&
          bindings[s.id] !== key &&
          eligible(s.id),
      );
      if (command || old) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (command) actions[command.id]?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("storage", reload);
    window.addEventListener("writing:shortcuts", reload);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("storage", reload);
      window.removeEventListener("writing:shortcuts", reload);
    };
  }, [actions, canEdit]);
}

/**
 * The keys for a shortcut as they are bound right now, for hints and menus,
 * so a rebound shortcut never shows its old keys. In the ⌘ notation keys()
 * takes.
 */
export function shortcutLabel(id: ShortcutId, bindings: Bindings = readBindings()): string {
  const item = SHORTCUTS.find((s) => s.id === id);
  return prettyKeys(bindings[id] ?? item?.keys ?? "");
}
