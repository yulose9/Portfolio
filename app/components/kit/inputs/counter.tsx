"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent } from "react";

import { cn } from "../../../lib/cn";

/*
 * A number that rolls. Each digit is a column 0–9 that slides to its place on
 * a spring, the shadcn.io counter's sliding number. Digits are keyed by their
 * place from the right, so going from 99 to 100 rolls the two nines over and
 * adds a column, rather than redrawing all three.
 *
 * The columns are decoration; assistive tech reads one plain number.
 */

const SPRING = { type: "spring", stiffness: 280, damping: 30, mass: 0.8 } as const;

function Digit({ digit }: { digit: number }) {
  const still = useReducedMotion();
  return (
    <span className="ki-digit" aria-hidden="true">
      <motion.span
        className="ki-digit-reel"
        initial={false}
        animate={{ y: `${-digit * 10}%` }}
        transition={still ? { duration: 0 } : SPRING}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n}>{n}</span>
        ))}
      </motion.span>
    </span>
  );
}

export type SlidingNumberProps = {
  value: number;
  /** Zero-pads to this many digits. */
  pad?: number;
  /** Groups thousands with the locale's separator. */
  group?: boolean;
  className?: string;
};

/** Just the rolling number, for counts that change on their own (word counts). */
export function SlidingNumber({ value, pad = 0, group = false, className }: SlidingNumberProps) {
  const n = Math.round(Math.abs(value));
  const digits = String(n).padStart(pad, "0").split("").map(Number);
  const separator = group ? (new Intl.NumberFormat().formatToParts(1000).find((p) => p.type === "group")?.value ?? ",") : "";
  const text = group ? new Intl.NumberFormat().format(Math.round(value)) : `${value < 0 ? "−" : ""}${String(n).padStart(pad, "0")}`;
  return (
    <span className={cn("ki-sliding-number", className)} data-slot="sliding-number">
      <span className="sr-only">{text}</span>
      {value < 0 ? <span aria-hidden="true">−</span> : null}
      {digits.map((d, i) => {
        const place = digits.length - i;
        return (
          <span key={place} className="ki-digit-slot">
            <Digit digit={d} />
            {separator && place > 1 && (place - 1) % 3 === 0 ? (
              <span aria-hidden="true" className="ki-digit-separator">
                {separator}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

export type CounterProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** The accessible name, e.g. "Image width". */
  label: string;
  /** Read after the number, e.g. "px". */
  unit?: string;
  disabled?: boolean;
  className?: string;
};

/** − n + : a stepper whose number is itself a spinbutton (arrows, Page keys, Home/End). */
export function Counter({ value, onChange, min = -Infinity, max = Infinity, step = 1, label, unit, disabled, className }: CounterProps) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  const onKeys = (e: KeyboardEvent<HTMLSpanElement>) => {
    const keys: Record<string, () => void> = {
      ArrowUp: () => set(value + step),
      ArrowRight: () => set(value + step),
      ArrowDown: () => set(value - step),
      ArrowLeft: () => set(value - step),
      PageUp: () => set(value + step * 10),
      PageDown: () => set(value - step * 10),
      Home: () => Number.isFinite(min) && set(min),
      End: () => Number.isFinite(max) && set(max),
    };
    if (disabled || !keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
  };

  return (
    <div data-slot="counter" className={cn("ki-counter", className)} data-disabled={disabled || undefined}>
      <button
        type="button"
        data-slot="counter-decrement"
        className="ki-counter-button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => set(value - step)}
      >
        <Minus size={14} weight="bold" aria-hidden="true" />
      </button>
      <span
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-valuetext={unit ? `${value} ${unit}` : undefined}
        aria-disabled={disabled || undefined}
        className="ki-counter-value"
        onKeyDown={onKeys}
      >
        <SlidingNumber value={value} />
        {unit ? (
          <span className="ki-counter-unit" aria-hidden="true">
            {unit}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        data-slot="counter-increment"
        className="ki-counter-button"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => set(value + step)}
      >
        <Plus size={14} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

export default Counter;
