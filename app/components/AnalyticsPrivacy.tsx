"use client";

import Link from "next/link";
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
    <nav
      aria-label="Legal and privacy"
      className="site-compliance-footer mx-auto my-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 text-[12px] text-[color:var(--fg-3)]"
    >
      <Link
        href="/privacy"
        className="transition-colors hover:text-[color:var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] rounded px-1 py-0.5"
      >
        Privacy Policy
      </Link>
      <span className="text-[color:var(--line-strong)] select-none" aria-hidden="true">
        •
      </span>
      <Link
        href="/terms"
        className="transition-colors hover:text-[color:var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] rounded px-1 py-0.5"
      >
        Terms &amp; Conditions
      </Link>
      <span className="text-[color:var(--line-strong)] select-none" aria-hidden="true">
        •
      </span>
      <Link
        href="/cookies"
        className="transition-colors hover:text-[color:var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] rounded px-1 py-0.5"
      >
        Cookie Policy
      </Link>
      <span className="text-[color:var(--line-strong)] select-none" aria-hidden="true">
        •
      </span>
      <button
        type="button"
        className="cursor-pointer transition-colors hover:text-[color:var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] rounded px-1 py-0.5"
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
    </nav>
  );
}
