"use client";

import { CalendarBlank } from "@phosphor-icons/react";
import { Popover } from "@base-ui/react/popover";
import AdminSelect from "./AdminSelect";
import { useState } from "react";
import { Calendar } from "../../components/kit/inputs/calendar";
import { onRadioKeys } from "./bits";

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
  // The calendar stops days before `min`; this stops an earlier time on that
  // same day, so "today, 9 am" at noon becomes noon rather than the past.
  const within = (d: Date) => (min && d < min ? new Date(min) : max && d > max ? new Date(max) : d);
  const setClock = (hour12: number, minute: number, isPm: boolean) => onChange(within(withTime(value, (hour12 % 12) + (isPm ? 12 : 0), minute)));

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
      <Calendar
        mode="single"
        selected={value}
        onSelect={(d) => d && onChange(within(withTime(d, value.getHours(), value.getMinutes())))}
        month={month}
        onMonthChange={setMonth}
        weekStartsOn={1}
        showOutsideDays
        disabled={[...(min ? [{ before: new Date(min.getFullYear(), min.getMonth(), min.getDate()) }] : []), ...(max ? [{ after: max }] : [])]}
        className="dtp-calendar"
      />
      <div className="dtp-time">
        <div>
          <span className="field-label">Time</span>
          <div className="dtp-clock">
            <AdminSelect label="Hour" hideLabel value={String(h12)} onValueChange={hour=>setClock(Number(hour),value.getMinutes(),pm)} options={Array.from({length:12},(_,i)=>({value:String(i+1),label:String(i+1)}))}/>
            <span aria-hidden="true">:</span>
            <AdminSelect label="Minute" hideLabel value={String(value.getMinutes())} onValueChange={minute=>setClock(h12,Number(minute),pm)} options={Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")}))}/>
            <span className="admin-segments dtp-ampm" onKeyDown={onRadioKeys} role="radiogroup" aria-label="AM or PM">
              <button type="button" role="radio" aria-checked={!pm} tabIndex={!pm ? 0 : -1} className="admin-segment" onClick={() => setClock(h12, value.getMinutes(), false)}>
                AM
              </button>
              <button type="button" role="radio" aria-checked={pm} tabIndex={pm ? 0 : -1} className="admin-segment" onClick={() => setClock(h12, value.getMinutes(), true)}>
                PM
              </button>
            </span>
          </div>
        </div>
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
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  value: Date;
  onChange: (d: Date) => void;
  min?: Date;
  max?: Date;
  label?: string;
  className?: string;
  children?: React.ReactNode;
  footer?: (close: () => void) => React.ReactNode;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* With visible text (the eyebrow's date), that text is the name and the
          label is a tooltip; a name that hid the visible words would fail
          label-in-name for voice control. */}
      <Popover.Trigger
        className={className}
        aria-label={children ? undefined : label ?? "Pick a date and time"}
        title={children ? label : undefined}
      >
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
            <Popover.Title className="sr-only">{label ?? "Pick a date and time"}</Popover.Title>
            <DateTimeFields value={value} onChange={onChange} min={min} max={max} showNow={!min} />
            {footer ? <div className="dtp-footer">{footer(() => setOpen(false))}</div> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
