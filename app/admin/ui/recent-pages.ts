import { useSyncExternalStore } from "react";
const KEY = "writing-recent-pages",
  EVENT = "writing:recent-pages";
function snapshot() {
  try {
    return sessionStorage.getItem(KEY) || "[]";
  } catch {
    return "[]";
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
function parse(value: string): string[] {
  try {
    return JSON.parse(value)
      .filter(
        (id: unknown) => typeof id === "string" && /^[a-z0-9]{12}$/.test(id),
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}
export function recordRecentPage(id: string) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify(
        [id, ...parse(snapshot()).filter((v) => v !== id)].slice(0, 8),
      ),
    );
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* view preferences must not block writing */
  }
}
export function useRecentPages() {
  return parse(useSyncExternalStore(subscribe, snapshot, () => "[]"));
}
