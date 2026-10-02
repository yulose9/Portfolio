"use client";

import { CaretDown, CaretLeft, CaretRight, CaretUp } from "@phosphor-icons/react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type ChevronProps,
  type DayButtonProps,
  type DayPickerProps,
  type MonthGridProps,
  type MonthProps,
} from "react-day-picker";

import { cn } from "../../../lib/cn";

/*
 * Kobra's calendar on react-day-picker v10, the library the admin's
 * DateTimePicker already uses, so swapping `DayPicker` for `Calendar` there is
 * a rename and nothing else: every DayPicker prop passes straight through.
 *
 * What it adds is the turn of the page. When the month changes, the new grid
 * slides in from the side it came from (`calendar-month-in`, from kit.css).
 * The grid alone is re-keyed, not the month: the caption updates in place, so
 * its live region announces the new month once, and the navigation buttons
 * keep focus through repeated presses. The rdp-* class names stay on so the
 * library's own stylesheet still applies wherever it is loaded; `.ki-calendar`
 * (kit-inputs.css) styles everything it needs without it, for the site.
 */

type Direction = "forward" | "back";

const Turn = createContext<{ direction: Direction | null; remember: (date: Date) => void }>({
  direction: null,
  remember: () => {},
});
const MonthKey = createContext("");

const isLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Month({ calendarMonth, displayIndex, ...props }: MonthProps) {
  const { remember } = useContext(Turn);
  const date = calendarMonth.date;
  // The first visible month is what a turn is measured from.
  isLayout(() => {
    if (displayIndex === 0) remember(date);
  }, [date, displayIndex, remember]);
  return (
    <MonthKey.Provider value={date.toISOString()}>
      <div {...props} />
    </MonthKey.Provider>
  );
}

function MonthGrid({ className, ...props }: MonthGridProps) {
  const month = useContext(MonthKey);
  const { direction } = useContext(Turn);
  // A new key per month remounts the table, which replays the keyframe.
  return (
    <table
      key={month}
      {...props}
      data-direction={direction ?? undefined}
      className={cn(className, direction && "ki-calendar-turn")}
    />
  );
}

function DayButton({ day, modifiers, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  // DayPicker's own button does this; a remounted grid relies on it to put
  // keyboard focus back on the day the arrow keys moved to.
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <button
      ref={ref}
      {...props}
      data-slot="calendar-day-option"
      data-today={modifiers.today || undefined}
      data-day={day.isoDate}
    />
  );
}

function Chevron({ orientation = "left", className }: ChevronProps) {
  const Icon = { left: CaretLeft, right: CaretRight, up: CaretUp, down: CaretDown }[orientation];
  return <Icon size={14} weight="bold" className={className} aria-hidden="true" />;
}

export type CalendarProps = DayPickerProps;

/** A month grid. Takes every react-day-picker prop; see README for the extras. */
export function Calendar({ className, classNames, components, onMonthChange, showOutsideDays = true, ...props }: CalendarProps) {
  const [direction, setDirection] = useState<Direction | null>(null);
  const shown = useRef<Date | null>(null);
  const remember = useCallback((date: Date) => {
    shown.current = date;
  }, []);
  const turn = useMemo(() => ({ direction, remember }), [direction, remember]);

  const defaults = useMemo(() => getDefaultClassNames(), []);

  return (
    <Turn.Provider value={turn}>
      <DayPicker
        data-slot="calendar"
        showOutsideDays={showOutsideDays}
        {...(props as DayPickerProps)}
        className={cn("ki-calendar", className)}
        classNames={{ ...defaults, ...classNames }}
        onMonthChange={(month) => {
          const from = shown.current;
          setDirection(from && month < from ? "back" : "forward");
          onMonthChange?.(month);
        }}
        components={{ Chevron, DayButton, Month, MonthGrid, ...components }}
      />
    </Turn.Provider>
  );
}

export default Calendar;
