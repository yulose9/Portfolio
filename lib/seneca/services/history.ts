// @ts-nocheck
/**
 * Every day Seneca has kept, straight from Firestore:
 *   users/{uid}/daily_logs/{YYYY-MM-DD}
 *
 * The sync engine (dataLogger) only ever opens today's log. Analytics needs
 * the rest, and the owner needs to fix or remove a past day, so this reads
 * the collection in one query and writes single days directly. Today's log
 * still goes through the engine, which owns its listener and debounce.
 */

import {
  collection,
  deleteDoc,
  doc,
  documentId,
  FieldPath,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { flushPendingWrites, updateTodayLog, waitForAuth } from "./dataLogger";
import { getPhDateKey } from "../utils/timeUtils";

export type DayLog = {
  date: string;
  completion: number | null;
  mood: string | null;
  weight: number | null;
  netWorth: number | null;
  highlights: string[];
  challenges: string[];
  journalEntries: number;
  transactions: number;
  updated: string | null;
  raw: any;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const num = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Personal, work and other protocols each log a rate; the day's is their best. */
function completionOf(raw: any): number | null {
  const rates = ["protocol", "protocol_work", "protocol_other"]
    .map((k) => num(raw?.[k]?.completion_rate))
    .filter((r) => r !== null);
  return rates.length ? Math.max(...rates) : null;
}

export function toDayLog(date: string, raw: any): DayLog {
  return {
    date,
    completion: completionOf(raw),
    mood: typeof raw?.journal?.mood === "string" && raw.journal.mood ? raw.journal.mood : null,
    weight: num(raw?.growth?.current_weight),
    netWorth: num(raw?.wealth?.net_worth),
    highlights: Array.isArray(raw?.journal?.highlights) ? raw.journal.highlights : [],
    challenges: Array.isArray(raw?.journal?.challenges) ? raw.journal.challenges : [],
    journalEntries: num(raw?.journal?.entries_today) ?? 0,
    transactions: num(raw?.wealth?.transactions_today) ?? 0,
    updated: raw?.timestamp_updated || null,
    raw,
  };
}

const logsRef = (uid: string) => collection(db, "users", uid, "daily_logs");

async function requireUser() {
  const user = await waitForAuth();
  if (!user) throw new Error("Sign in to read your history.");
  return user;
}

/** Days between `from` and `to` (inclusive, date keys), newest first. */
export async function listDayLogs({ from, to }: { from?: string; to?: string } = {}): Promise<DayLog[]> {
  const user = await requireUser();
  const clauses = [];
  if (from) clauses.push(where(documentId(), ">=", from));
  if (to) clauses.push(where(documentId(), "<=", to));
  const snap = await getDocs(query(logsRef(user.uid), ...clauses, orderBy(documentId())));
  return snap.docs
    .filter((d) => DATE_KEY.test(d.id))
    .map((d) => toDayLog(d.id, d.data()))
    .reverse();
}

export type DayEdit = {
  mood?: string | null;
  weight?: number | null;
  netWorth?: number | null;
  highlights?: string[];
  challenges?: string[];
};

/** Field paths a day edit touches, in the shape the log stores them. */
function editFields(edit: DayEdit): Record<string, Record<string, any>> {
  const sections: Record<string, Record<string, any>> = {};
  const put = (section: string, key: string, value: any) => {
    if (value === undefined) return;
    (sections[section] ||= {})[key] = value;
  };
  put("journal", "mood", edit.mood);
  put("journal", "highlights", edit.highlights);
  put("journal", "challenges", edit.challenges);
  put("growth", "current_weight", edit.weight);
  put("wealth", "net_worth", edit.netWorth);
  return sections;
}

/** Create or change one day. Only the edited fields are written. */
export async function saveDayLog(date: string, edit: DayEdit) {
  if (!DATE_KEY.test(date)) throw new Error("That isn't a date.");
  if (date > getPhDateKey()) throw new Error("Days ahead of today can't be logged yet.");
  const user = await requireUser();
  const sections = editFields(edit);

  if (date === getPhDateKey()) {
    Object.entries(sections).forEach(([section, data]) => updateTodayLog(section, data));
    await flushPendingWrites();
    return;
  }

  const payload: Record<string, any> = { date, user_id: user.uid, timestamp_updated: new Date().toISOString() };
  const paths = [["date"], ["user_id"], ["timestamp_updated"]];
  Object.entries(sections).forEach(([section, data]) => {
    payload[section] = data;
    Object.keys(data).forEach((key) => paths.push([section, key]));
  });
  await setDoc(doc(db, "users", user.uid, "daily_logs", date), payload, {
    mergeFields: paths.map((p) => new FieldPath(...p)),
  });
}

/** Remove a past day for good. Today can't be deleted: the open app would write it straight back. */
export async function deleteDayLog(date: string) {
  if (date === getPhDateKey()) throw new Error("Today is still being written. Edit it instead.");
  const user = await requireUser();
  if (auth.currentUser?.uid !== user.uid) throw new Error("Your sign-in changed. Reload first.");
  await deleteDoc(doc(db, "users", user.uid, "daily_logs", date));
}
