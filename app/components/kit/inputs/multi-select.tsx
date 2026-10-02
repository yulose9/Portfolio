"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretDown, Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "../../../lib/cn";

/*
 * A multi-select filter in the manner of Kobra's: a compact trigger with a
 * count, a popover with a search field and checkable options, and the picks
 * shown as small removable chips after the trigger.
 *
 * Built on Base UI's Combobox in multiple mode with the input inside the
 * popup, so the trigger stays one button in a toolbar. Arrow keys move through
 * the options, Enter or a click checks one and keeps the popover open for the
 * next, Escape closes it and hands focus back to the trigger.
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
  /** Extra props for an option's label and a chip, e.g. `data-tint`. */
  itemProps?: (value: string) => Record<string, string | undefined>;
  /** Show the picks as removable chips after the trigger. On by default. */
  chips?: boolean;
  disabled?: boolean;
  className?: string;
};

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
  chips = true,
  disabled,
  className,
}: MultiSelectProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const items = useMemo(() => options.map((o) => o.value), [options]);
  const nameOf = (v: string) => byValue.get(v)?.label ?? v;

  const remove = (v: string) => {
    const next = value.filter((x) => x !== v);
    onValueChange(next);
    setStatus(`${nameOf(v)} removed. ${next.length ? `${next.length} selected.` : "No filter."}`);
    // The chip that held focus is gone: the trigger is the nearest stable place.
    requestAnimationFrame(() => trigger.current?.focus());
  };

  const showMatch = Boolean(match && onMatchChange);

  return (
    <div className={cn("ki-ms", className)} data-slot="multi-select" data-disabled={disabled || undefined}>
      <Combobox.Root<string, true>
        multiple
        items={items}
        itemToStringLabel={nameOf}
        value={value}
        onValueChange={(next) => onValueChange(next)}
        inputValue={query}
        onInputValueChange={(v) => setQuery(v)}
        onOpenChangeComplete={(open) => {
          if (!open) setQuery("");
        }}
        disabled={disabled}
        autoHighlight
      >
        <Combobox.Trigger
          ref={trigger}
          data-slot="multi-select-trigger"
          className="ki-ms-trigger"
          aria-label={value.length ? `${label}, ${value.length} selected` : label}
        >
          {icon}
          <span>{label}</span>
          {value.length ? (
            <span className="ki-ms-badge" aria-hidden="true">
              {value.length}
            </span>
          ) : null}
          <CaretDown className="ki-ms-caret" size={12} weight="bold" aria-hidden="true" />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner anchor={trigger} align="start" sideOffset={6} className="ki-positioner">
            <Combobox.Popup className="ki-popup ki-ms-popup" aria-label={label} data-lenis-prevent>
              <div className="ki-ms-search">
                <MagnifyingGlass size={14} aria-hidden="true" />
                <Combobox.Input
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
                        <Check size={10} weight="bold" />
                      </span>
                      <span className="ki-ms-label" {...itemProps?.(item)}>
                        {option?.label ?? item}
                      </span>
                      {option?.count !== undefined ? <span className="ki-ms-count">{option.count}</span> : null}
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
              {value.length ? (
                <div className="ki-ms-footer">
                  <span>{value.length} selected</span>
                  <button
                    type="button"
                    data-slot="multi-select-clear"
                    className="ki-ms-clear"
                    onClick={() => {
                      onValueChange([]);
                      setStatus("Filter cleared.");
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {chips && value.length ? (
        <ul className="ki-ms-chips" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map((v) => (
            <li key={v} className="ki-ms-chip" data-slot="multi-select-value" {...itemProps?.(v)}>
              <span>{nameOf(v)}</span>
              <button
                type="button"
                data-slot="multi-select-remove"
                className="ki-ms-chip-remove"
                aria-label={`Remove ${nameOf(v)}`}
                disabled={disabled}
                onClick={() => remove(v)}
              >
                <X size={10} weight="bold" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

export default MultiSelect;
