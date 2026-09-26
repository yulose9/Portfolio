"use client";
import { useSyncExternalStore } from "react";
import { fullMentionDate, mentionDateLabel, parseDateHref, type MentionDate } from "../../../cms/mentions";
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
export default function DateMention({ value }: {value: MentionDate}) {
  const now = useSyncExternalStore(subscribe, snapshot, server);
  return <time className="date-mention" dateTime={value.time ? `${value.date}T${value.time}:00+08:00` : value.date}
    title={`${fullMentionDate(value)} · Asia/Manila (UTC+8)`}>@{mentionDateLabel(value, now)}</time>;
}
