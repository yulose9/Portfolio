"use client";

import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { DayPicker } from "react-day-picker";

/*
 * Date and time, shadcn's way: a calendar (react-day-picker, which shadcn's
 * Calendar is built on) with a time row under it and a few presets for the
 * usual answers. In your own time zone, shown under the time so a schedule
 * is never ambiguous.
 */

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
export const formatDateTime = (d: Date) => fmt.format(d);

function withTime(day: Date, hours: number, minutes: number) {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function presets(now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const monday = new Date(now);
  monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  const inHour = new Date(now.getTime() + 60 * 60 * 1000);
  inHour.setMinutes(Math.ceil(inHour.getMinutes() / 5) * 5, 0, 0);
  return [
    { label: "Now", date: now },
    { label: "In 1 hour", date: inHour },
    { label: "Tomorrow, 9 am", date: withTime(tomorrow, 9, 0) },
    { label: "Next Monday, 9 am", date: withTime(monday, 9, 0) },
  ];
}

export function DateTimeFields({
  value,
  onChange,
  min,
  max,
  showNow = true,
}: {
  value: Date;
  onChange: (d: Date) => void;
  min?: Date;
  max?: Date;
  showNow?: boolean;
}) {
  const [month, setMonth] = useState(value);
  const h12 = value.getHours() % 12 || 12;
  const pm = value.getHours() >= 12;
  const setClock = (hour12: number, minute: number, isPm: boolean) => onChange(withTime(value, (hour12 % 12) + (isPm ? 12 : 0), minute));

  return (
    <div className="dtp">
      <div className="dtp-presets">
        {presets()
          .filter((p) => showNow || p.label !== "Now")
          .filter((p) => (!min || p.date >= min) && (!max || p.date <= max))
          .map((p) => (
            <button key={p.label} type="button" className="admin-chip" onClick={() => onChange(p.date)}>
              {p.label}
            </button>
          ))}
      </div>
      <DayPicker
        mode="single"
        selected={value}
        onSelect={(d) => d && onChange(withTime(d, value.getHours(), value.getMinutes()))}
        month={month}
        onMonthChange={setMonth}
        weekStartsOn={1}
        showOutsideDays
        disabled={[...(min ? [{ before: new Date(min.getFullYear(), min.getMonth(), min.getDate()) }] : []), ...(max ? [{ after: max }] : [])]}
        className="dtp-calendar"
        components={{
          Chevron: ({ orientation }) => (orientation === "left" ? <CaretLeft size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />),
        }}
      />
      <div className="dtp-time">
        <label>
          <span className="field-label">Time</span>
          <span className="dtp-clock">
            <select value={h12} onChange={(e) => setClock(Number(e.target.value), value.getMinutes(), pm)} aria-label="Hour">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span aria-hidden="true">:</span>
            <select value={value.getMinutes() - (value.getMinutes() % 5)} onChange={(e) => setClock(h12, Number(e.target.value), pm)} aria-label="Minute">
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="admin-segments dtp-ampm" role="radiogroup" aria-label="AM or PM">
              <button type="button" role="radio" aria-checked={!pm} className="admin-segment" onClick={() => setClock(h12, value.getMinutes(), false)}>
                AM
              </button>
              <button type="button" role="radio" aria-checked={pm} className="admin-segment" onClick={() => setClock(h12, value.getMinutes(), true)}>
                PM
              </button>
            </span>
          </span>
        </label>
        <p className="field-help">
          {formatDateTime(value)} · {zone()}
        </p>
      </div>
    </div>
  );
}

/** A button showing the date that opens the picker in a popover. */
export default function DateTimePicker({
  value,
  onChange,
  min,
  max,
  label,
  className = "admin-button",
  children,
  footer,
}: {
  value: Date;
  onChange: (d: Date) => void;
  min?: Date;
  max?: Date;
  label?: string;
  className?: string;
  children?: React.ReactNode;
  footer?: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={className} aria-label={label ?? "Pick a date and time"}>
        {children ?? (
          <>
            <CalendarBlank size={14} aria-hidden="true" />
            {formatDateTime(value)}
          </>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" collisionPadding={8} className="menu-positioner">
          <Popover.Popup className="menu-popup admin-popover dtp-popover">
            <DateTimeFields value={value} onChange={onChange} min={min} max={max} showNow={!min} />
            {footer ? <div className="dtp-footer">{footer(() => setOpen(false))}</div> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
