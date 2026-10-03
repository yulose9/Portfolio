"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Popover } from "@base-ui/react/popover";
import { CalendarBlank } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { Calendar } from "../../components/kit/inputs/calendar";
import { Switch } from "../../components/kit/switch";
import { clockLabel, clockMatches, dateToDay, dayToDate, parseClock, quarterHours } from "./clock";

/*
 * A wall-clock day and time ("YYYY-MM-DD" and "HH:MM", no zone attached),
 * picked with the kit Calendar inline and a time field that takes free typing
 * ("930p", "14:30") or a quarter hour from its list. Used where the stored
 * value is a plain day and time rather than an instant: date mentions, which
 * are Manila wall time, and the editorial review dates.
 *
 * Keyboard: the arrow keys move through the calendar; Enter on a day picks it
 * and confirms; Enter in the time field reads what was typed and confirms.
 * Escape belongs to whatever holds the fields (a popover or the @ menu).
 */

export type DayTime = { date: string; time: string | null };
export type DayPreset = { label: string; date: string };

export function TimeField({
  value,
  onChange,
  label = "Time",
}: {
  value: string;
  onChange: (time: string) => void;
  label?: string;
}) {
  const [draft, setDraft] = useState(() => clockLabel(value));
  const [seen, setSeen] = useState(value);
  const latest = useRef("");
  const list = useRef<HTMLDivElement>(null);
  if (seen !== value) {
    setSeen(value);
    setDraft(clockLabel(value));
  }
  useEffect(() => {
    latest.current = draft;
  }, [draft]);
  const type = (text: string) => {
    latest.current = text;
    setDraft(text);
  };
  // Read what was typed; anything that isn't a time puts the last good one back.
  const commit = () => {
    const next = parseClock(latest.current);
    type(clockLabel(next ?? value));
    if (next && next !== value) onChange(next);
  };
  // Until something is typed, the list shows the whole day, not just the match.
  const query = draft === clockLabel(value) ? "" : draft;
  const items = quarterHours.filter((time) => clockMatches(time, query));
  return (
    <Autocomplete.Root
      items={quarterHours}
      filteredItems={items}
      filter={null}
      value={draft}
      itemToStringValue={clockLabel}
      openOnInputClick
      onValueChange={(text, details) => {
        type(text);
        if (details.reason === "item-press") {
          const next = parseClock(text);
          if (next && next !== value) onChange(next);
        }
      }}
      onOpenChange={(open) => {
        if (!open) return;
        // Open on the hour that's set rather than at midnight.
        requestAnimationFrame(() => {
          const [h, m] = value.split(":").map(Number);
          const nearest = quarterHours[Math.min(95, h * 4 + Math.floor(m / 15))];
          list.current?.querySelector<HTMLElement>(`[data-time="${nearest}"]`)?.scrollIntoView({ block: "center" });
        });
      }}
    >
      <Autocomplete.Input
        aria-label={label}
        className="field-input day-time-input"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner className="admin-select-positioner" sideOffset={6} align="end" collisionPadding={12}>
          <Autocomplete.Popup className="admin-select-popup day-time-popup">
            <Autocomplete.Empty className="day-time-empty">Type a time like 9:30 pm</Autocomplete.Empty>
            <Autocomplete.List ref={list} className="admin-select-list">
              {(time: string) => (
                <Autocomplete.Item key={time} value={time} data-time={time} className="admin-select-option">
                  {clockLabel(time)}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

export function DayTimeFields({
  value,
  onChange,
  onConfirm,
  presets = [],
  today,
  optionalTime = true,
  zoneNote,
  autoFocus = false,
}: {
  value: DayTime;
  onChange: (value: DayTime) => void;
  /** Enter on a day or in the time field. */
  onConfirm?: (value: DayTime) => void;
  presets?: DayPreset[];
  /** The day to mark as today, when it's another zone's today. */
  today?: string;
  /** Whether the time can be left off (an "Include time" switch). */
  optionalTime?: boolean;
  zoneNote?: string;
  autoFocus?: boolean;
}) {
  const [month, setMonth] = useState(() => dayToDate(value.date));
  const [lastTime, setLastTime] = useState(value.time ?? "09:00");
  const latest = useRef(value);
  const switchId = useId();
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const change = (next: DayTime) => {
    latest.current = next;
    if (next.time) setLastTime(next.time);
    onChange(next);
  };
  const setDay = (date: string) => {
    change({ ...latest.current, date });
    setMonth(dayToDate(date));
  };
  return (
    <div
      className="dtp day-time"
      onKeyDown={(e) => {
        if (e.key !== "Enter" || e.defaultPrevented || e.nativeEvent.isComposing || !onConfirm) return;
        const target = e.target as HTMLElement;
        const day = target.closest<HTMLElement>("[data-day]")?.dataset.day;
        if (day) {
          e.preventDefault();
          change({ ...latest.current, date: day });
          onConfirm(latest.current);
        } else if (target.tagName === "INPUT") {
          e.preventDefault();
          onConfirm(latest.current);
        }
      }}
    >
      {presets.length ? (
        <div className="dtp-presets" role="group" aria-label="Quick picks">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="admin-chip"
              aria-pressed={preset.date === value.date}
              onClick={() => setDay(preset.date)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      <Calendar
        mode="single"
        selected={dayToDate(value.date)}
        onSelect={(date) => date && change({ ...latest.current, date: dateToDay(date) })}
        month={month}
        onMonthChange={setMonth}
        weekStartsOn={1}
        today={today ? dayToDate(today) : undefined}
        autoFocus={autoFocus}
        className="dtp-calendar"
      />
      <div className="dtp-time">
        <div className="day-time-row">
          {optionalTime ? (
            <span className="day-time-switch">
              <Switch
                checked={value.time !== null}
                onCheckedChange={(on) => change({ ...latest.current, time: on ? lastTime : null })}
                aria-labelledby={switchId}
              />
              <span id={switchId}>Include time</span>
            </span>
          ) : (
            <span className="field-label">Time</span>
          )}
          {value.time !== null ? (
            <TimeField value={value.time} onChange={(time) => change({ ...latest.current, time })} />
          ) : null}
        </div>
        {zoneNote && value.time !== null ? <p className="field-help">{zoneNote}</p> : null}
      </div>
    </div>
  );
}

/**
 * A field-shaped button showing the day and time, or `placeholder`, that opens
 * the fields in a popover. Edits are a draft: Done or Enter applies them,
 * Escape drops them, Clear empties the field.
 */
export function DayTimeButton({
  value,
  onChange,
  label,
  fallback,
  placeholder = "Not set",
  today,
  zoneNote,
}: {
  value: DayTime | null;
  onChange: (value: DayTime | null) => void;
  label: string;
  /** What the picker starts on when the field is empty. */
  fallback: () => DayTime;
  placeholder?: string;
  today?: string;
  zoneNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayTime>(() => value ?? fallback());
  const popup = useRef<HTMLDivElement>(null);
  const shown = value
    ? `${new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value.date}T00:00:00Z`))}${value.time ? `, ${clockLabel(value.time)}` : ""}`
    : placeholder;
  const confirm = (next: DayTime) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value ?? fallback());
        setOpen(next);
      }}
    >
      <Popover.Trigger className="field-input day-time-trigger" aria-label={`${label}: ${shown}`}>
        <CalendarBlank size={14} aria-hidden="true" />
        <span data-empty={value ? undefined : ""}>{shown}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" collisionPadding={12} className="menu-positioner">
          <Popover.Popup
            ref={popup}
            className="menu-popup admin-popover dtp-popover day-time-popover"
            initialFocus={() => popup.current?.querySelector<HTMLElement>('.rdp-day_button[tabindex="0"]') ?? true}
          >
            <Popover.Title className="sr-only">{label}</Popover.Title>
            <DayTimeFields value={draft} onChange={setDraft} onConfirm={confirm} today={today} optionalTime={false} zoneNote={zoneNote} />
            <div className="picker-footer">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={!value}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear
              </button>
              <button type="button" className="admin-button admin-button-primary" onClick={() => confirm(draft)}>
                Done
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
