"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { useSyncExternalStore } from "react";
import { updatedAtExact, updatedAtLabel } from "../lib/updated-at";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((notify) => notify()), 1000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); timer = undefined; }
  };
};
const snapshot = () => Math.floor(Date.now() / 1000) * 1000;
const serverSnapshot = () => null;

/** Persisted content time; never the page load or an unsaved keystroke. */
export default function UpdatedAt({ at, nested = false }: { at: string; nested?: boolean }) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const label = updatedAtLabel(at, now);
  if (label === null) return null;
  const exact = updatedAtExact(at);
  return (
    <Tooltip.Provider delay={300}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={<span tabIndex={nested ? undefined : 0} />}
          className="updated-at"
          aria-label={`Last updated ${exact}`}
        >
          Last updated <time dateTime={at}>{label}</time>
          <span className="sr-only"> ({exact})</span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={8} collisionPadding={12}>
            <Tooltip.Popup className="tip-popup">
              <span className="tip-primary">{exact}</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
