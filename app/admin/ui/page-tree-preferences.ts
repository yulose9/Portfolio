import { useSyncExternalStore } from "react";
const KEY = "writing-expanded-pages",
  EVENT = "writing:expanded-pages";
let fallback = "[]";
let memoryOnly = false;
function snapshot() {
  if (memoryOnly) return fallback;
  try {
    return localStorage.getItem(KEY) || "[]";
  } catch {
    return fallback;
  }
}
function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
export function useExpandedPages() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  let ids: string[] = [];
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value))
      ids = value
        .filter((id) => typeof id === "string" && /^[a-z0-9]{12}$/.test(id))
        .slice(0, 5000);
  } catch {
    /* optional preference */
  }
  const save = (value: Set<string>) => {
    fallback = JSON.stringify([...value].slice(0, 5000));
    try {
      localStorage.setItem(KEY, fallback);
      memoryOnly = false;
    } catch {
      memoryOnly = true;
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [new Set(ids), save] as const;
}
