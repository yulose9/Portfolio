"use client";
import { useSyncExternalStore } from "react";
const preferenceEvent = "portfolio:analytics-preference";
let memoryPreference: boolean | undefined;
function readPreference() {
  try {
    return localStorage.getItem("portfolio:analytics-opt-out") === "1";
  } catch {
    return memoryPreference ?? false;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(preferenceEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(preferenceEvent, listener);
  };
}
export default function AnalyticsPrivacy() {
  const disabled = useSyncExternalStore(subscribe, readPreference, () => false);
  return (
    <button
      type="button"
      className="analytics-privacy"
      onClick={async () => {
        const next = !disabled;
        memoryPreference = next;
        try {
          localStorage.setItem("portfolio:analytics-opt-out", next ? "1" : "0");
        } catch {
          /* SDK may retain preference in memory */
        }
        window.dispatchEvent(new Event(preferenceEvent));
        const { default: posthog } = await import("posthog-js");
        if (next) posthog.opt_out_capturing();
        else posthog.opt_in_capturing();
      }}
      aria-pressed={disabled}
    >
      {disabled ? "Analytics off for this browser" : "Opt out of analytics"}
    </button>
  );
}
