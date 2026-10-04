"use client";
import { useSyncExternalStore } from "react";
import { fullMentionDate, mentionDateLabel, parseDateHref, type MentionDate } from "../../../cms/mentions";
import { Tooltip } from "../kit/tooltip";

const subscribe = (notify: () => void) => {
  const id = window.setInterval(notify, 30000);
  window.addEventListener("focus", notify);
  return () => { window.clearInterval(id); window.removeEventListener("focus", notify); };
};
const snapshot = () => Math.floor(Date.now() / 30000) * 30000;
const server = () => null;

export function MentionSpan(props: React.HTMLAttributes<HTMLSpanElement> & { "data-date-mention"?: string }) {
  const date = parseDateHref(String(props["data-date-mention"] ?? ""));
  return date ? <DateMention value={date}/> : <span {...props}/>;
}

export default function DateMention({ value }: { value: MentionDate }) {
  const now = useSyncExternalStore(subscribe, snapshot, server);
  const fullDate = fullMentionDate(value);
  const label = mentionDateLabel(value, now);
  const isoTime = value.time ? `${value.date}T${value.time}:00+08:00` : value.date;

  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-0.5 text-xs">
          <span className="font-medium text-foreground">{fullDate}</span>
          <span className="text-[11px] text-muted-foreground opacity-80">Asia/Manila (UTC+8)</span>
        </span>
      }
      side="top"
      sideOffset={6}
      delay={80}
    >
      <time
        className="date-mention inline-flex items-center cursor-help transition-opacity duration-150 hover:opacity-80"
        dateTime={isoTime}
        data-sound="tap"
      >
        @{label}
      </time>
    </Tooltip>
  );
}
