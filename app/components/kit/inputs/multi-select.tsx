"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretDown, Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "../../../lib/cn";
import { Tooltip } from "../tooltip";
import { SlidingNumber } from "./counter";

/*
 * A multi-select filter in the manner of Kobra's: a compact trigger, and a
 * popover with a search field and checkable options.
 *
 * The trigger is one line at one height whatever is picked. Nothing picked,
 * it reads as its label; then it shows the first one or two picks as small
 * pills and "+N" for the rest, truncating rather than growing past its cap,
 * with the whole list in a tooltip. Picks come off in the popover (uncheck),
 * through its Clear, or all at once with the × at the trigger's end.
 *
 * Built on Base UI's Combobox in multiple mode with the input inside the
 * popup, so the trigger stays one button in a toolbar. Arrow keys move through
 * the options, Enter or a click checks one and keeps the popover open for the
 * next, Escape closes it and hands focus back to the trigger.
 *
 * Nothing moves under the pointer while the popover is open: the options keep
 * their order, a pick keeps the search (selected, so the next keystroke starts
 * a new one) rather than clearing it and throwing the list back to the top,
 * and the footer is always there, so the popover never changes height.
 *
 * Optional "Any / All" match toggle: pass `match` and `onMatchChange`.
 */

export type MultiSelectOption = {
  value: string;
  /** Shown instead of the value. */
  label?: string;
  /** A number after the label, e.g. how many posts carry the tag. */
  count?: number;
};

export type MultiSelectMatch = "any" | "all";

export type MultiSelectProps = {
  options: readonly MultiSelectOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
  /** The trigger's text and the control's accessible name, e.g. "Tags". */
  label: string;
  icon?: ReactNode;
  /** The search field's placeholder. */
  placeholder?: string;
  emptyText?: string;
  /** With `onMatchChange`, shows the Any / All toggle in the popover. */
  match?: MultiSelectMatch;
  onMatchChange?: (match: MultiSelectMatch) => void;
  /** Extra props for an option's label and a pill in the trigger, e.g. `data-tint`. */
  itemProps?: (value: string) => Record<string, string | undefined>;
  /** How many picks the trigger names before "+N". */
  maxShown?: number;
  disabled?: boolean;
  className?: string;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SLIDE = { type: "spring", duration: 0.3, bounce: 0 } as const;
const INSTANT = { duration: 0 } as const;

export function MultiSelect({
  options,
  value,
  onValueChange,
  label,
  icon,
  placeholder = "Search…",
  emptyText = "Nothing matches",
  match,
  onMatchChange,
  itemProps,
  maxShown = 2,
  disabled,
  className,
}: MultiSelectProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const still = useReducedMotion();

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const items = useMemo(() => options.map((o) => o.value), [options]);
  const nameOf = (v: string) => byValue.get(v)?.label ?? v;

  const showMatch = Boolean(match && onMatchChange);
  const shown = value.slice(0, maxShown);
  const more = value.length - shown.length;
  const names = value.map(nameOf).join(", ");
  const summary = showMatch && value.length > 1 ? `${match === "all" ? "All of" : "Any of"}: ${names}` : names;

  const clear = (refocus: boolean) => {
    onValueChange([]);
    setStatus("Filter cleared.");
    // The × that held focus is gone: the trigger is the nearest stable place.
    if (refocus) requestAnimationFrame(() => trigger.current?.focus());
  };

  // What appears and leaves inside the trigger: a short blur-scale, while the
  // pieces that stay slide over on the spring.
  const piece = {
    layout: still ? false : ("position" as const),
    initial: { opacity: 0, scale: 0.9, filter: "blur(2px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: {
      opacity: 0,
      scale: 0.95,
      filter: "blur(2px)",
      transition: still ? INSTANT : { duration: 0.15, ease: EASE_OUT },
    },
    transition: still ? INSTANT : { duration: 0.2, ease: EASE_OUT, layout: SLIDE },
  };

  return (
    <div
      className={cn("ki-ms", className)}
      data-slot="multi-select"
      data-has-value={value.length ? "" : undefined}
      data-disabled={disabled || undefined}
    >
      <Combobox.Root<string, true>
        multiple
        items={items}
        itemToStringLabel={nameOf}
        value={value}
        onValueChange={(next) => onValueChange(next)}
        inputValue={query}
        onInputValueChange={(v, details) => {
          // A pick would clear the search, refilter the list to everything and
          // scroll the picked option into view: the list jumps. Keep the search
          // and select it instead, so typing starts a new one.
          if (details.reason === "input-clear" && details.isItemPress) {
            details.cancel();
            if (document.activeElement === input.current) input.current?.select();
            return;
          }
          setQuery(v);
        }}
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setQuery("");
        }}
        disabled={disabled}
        autoHighlight
      >
        {/* The full list, for when the trigger names only some of it or truncates. */}
        <Tooltip content={summary} disabled={open || !value.length} delay={400}>
          <Combobox.Trigger
            ref={trigger}
            data-slot="multi-select-trigger"
            className="ki-ms-trigger"
            aria-label={value.length ? `${label}: ${names}` : label}
          >
            {icon}
            <span className="ki-ms-summary">
              <AnimatePresence initial={false} mode="popLayout">
                {value.length ? (
                  shown.map((v) => (
                    <motion.span
                      key={v}
                      {...piece}
                      className="ki-ms-chip"
                      data-slot="multi-select-value"
                      {...itemProps?.(v)}
                    >
                      {nameOf(v)}
                    </motion.span>
                  ))
                ) : (
                  <motion.span key="__label" {...piece} className="ki-ms-text">
                    {label}
                  </motion.span>
                )}
                {more > 0 ? (
                  <motion.span key="__more" {...piece} className="ki-ms-more" aria-hidden="true">
                    +<SlidingNumber value={more} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </span>
            <CaretDown className="ki-ms-caret" size={12} weight="bold" aria-hidden="true" />
          </Combobox.Trigger>
        </Tooltip>

        <Combobox.Portal>
          <Combobox.Positioner anchor={trigger} align="end" sideOffset={6} className="ki-positioner">
            <Combobox.Popup className="ki-popup ki-ms-popup" aria-label={label} data-lenis-prevent>
              <div className="ki-ms-search">
                <MagnifyingGlass size={14} aria-hidden="true" />
                <Combobox.Input
                  ref={input}
                  data-slot="multi-select-input"
                  className="ki-ms-input"
                  placeholder={placeholder}
                  aria-label={`Search ${label.toLowerCase()}`}
                />
              </div>
              {showMatch ? (
                <div className="ki-ms-match" role="group" aria-label="Match">
                  <span>Match</span>
                  {(["any", "all"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-slot="multi-select-match"
                      className="ki-ms-match-option"
                      aria-pressed={match === m}
                      title={m === "any" ? "Any selected tag" : "Every selected tag"}
                      onClick={() => onMatchChange?.(m)}
                    >
                      {m === "any" ? "Any" : "All"}
                    </button>
                  ))}
                </div>
              ) : null}
              <Combobox.Empty className="ki-ms-empty">{emptyText}</Combobox.Empty>
              <Combobox.List className="ki-ms-list">
                {(item: string) => {
                  const option = byValue.get(item);
                  const on = value.includes(item);
                  return (
                    <Combobox.Item
                      key={item}
                      value={item}
                      data-slot="multi-select-option"
                      data-sound={on ? "toggleOff" : "toggleOn"}
                      className="ki-ms-option"
                    >
                      <span className="ki-ms-box" aria-hidden="true">
                        {/* The tick grows in from a blur rather than popping. */}
                        <motion.span
                          className="ki-ms-tick"
                          initial={false}
                          animate={
                            on
                              ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                              : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                          }
                          transition={still ? INSTANT : SLIDE}
                        >
                          <Check size={10} weight="bold" />
                        </motion.span>
                      </span>
                      <span className="ki-ms-label" {...itemProps?.(item)}>
                        {option?.label ?? item}
                      </span>
                      {option?.count !== undefined ? <span className="ki-ms-count">{option.count}</span> : null}
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
              {/* Always present, so a first pick doesn't grow the popover under the pointer. */}
              <div className="ki-ms-footer">
                <span>
                  <SlidingNumber value={value.length} /> selected
                </span>
                <button
                  type="button"
                  data-slot="multi-select-clear"
                  className="ki-ms-clear"
                  disabled={!value.length}
                  onClick={() => clear(false)}
                >
                  Clear
                </button>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {/* Clears every pick at once. A sibling of the trigger (a button can't
          hold a button), laid over the end of it. */}
      <AnimatePresence initial={false}>
        {value.length ? (
          <motion.button
            key="reset"
            type="button"
            data-slot="multi-select-reset"
            className="ki-ms-reset"
            aria-label={`Clear ${label.toLowerCase()} filter`}
            disabled={disabled}
            onClick={() => clear(true)}
            initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            transition={still ? INSTANT : SLIDE}
          >
            <X size={11} weight="bold" aria-hidden="true" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

export default MultiSelect;
