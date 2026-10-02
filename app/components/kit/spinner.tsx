"use client";

import { useEffect, useRef, useState, type CSSProperties, type ComponentProps } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's bars spinner: twelve rounded bars around a centre, each fading on
 * the same clock and started a twelfth of a turn later than the one before,
 * so the fade walks round. The bar rule and its keyframes live in kit.css
 * (t-spinner-bar), which also pauses them while a busy button is idle.
 */
const BARS = Array.from({ length: 12 }, (_, i) => i);

export function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0.96 0.96 22.08 22.08"
      data-slot="spinner"
      data-variant="bars"
      role="status"
      aria-label="Loading"
      className={cn("size-4 text-current", className)}
      {...props}
    >
      {BARS.map((i) => (
        <rect
          key={i}
          className="t-spinner-bar"
          x="16"
          y="11.1"
          width="5.2"
          height="1.8"
          rx="0.9"
          fill="currentColor"
          transform={`rotate(${i * 30} 12 12)`}
          style={{ animationDelay: `calc(var(--spinner-bars-dur) * -${(11 - i) / 12})` }}
        />
      ))}
    </svg>
  );
}

/*
 * The pending-to-done badge (Kobra's StatusBadge, on kit.css's t-check-*
 * rules): a faint ring with an arc running round it while something is
 * pending; on done the arc lets go, the disc fills with a small overshoot and
 * the tick draws itself in once the fill is most of the way there. The badge
 * blurs for a moment as it crosses from one to the other, which hides the
 * hand-over between the arc and the fill.
 */
type BadgeState = "loading" | "done";

export function StatusBadge({
  state,
  size = 16,
  outline = false,
  className,
}: {
  state: BadgeState;
  /** Diameter in px. */
  size?: number;
  /** A drawn tick on the ring instead of a filled disc. */
  outline?: boolean;
  className?: string;
}) {
  const [crossing, setCrossing] = useState(false);
  const previous = useRef(state);

  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    setCrossing(true);
    // A little under half the fill: long enough to cover the swap, gone before the tick draws.
    const timer = window.setTimeout(() => setCrossing(false), 100);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <span
      className={cn("t-check-blur-wrap", crossing && "is-crossing", className)}
      style={{ "--check-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <span className={cn("t-check-badge", outline && "is-outline")} data-state={state}>
        <span className="t-check-ring" />
        <span className="t-check-arc" />
        <span className="t-check-fill" />
        <span className="t-check-disc">
          <svg viewBox="0 0 22 22">
            <path className="t-check-mark" d="M6.5 11.5l3 3 6-6.5" style={{ "--check-mark-len": 14 } as CSSProperties} />
          </svg>
        </span>
      </span>
    </span>
  );
}
