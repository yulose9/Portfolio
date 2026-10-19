// @ts-nocheck
/**
 * A whole-account backup, read from Firestore rather than this device's cache:
 * every document under users/{uid}/global_data, daily_logs and preferences.
 *
 * Restore writes a backup's documents back with merge, so fields the backup
 * doesn't have are left alone and nothing is deleted. Pending local edits are
 * flushed first so they can't land on top of the restored data afterwards.
 */

import { collection, doc, getDocs, Timestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import { flushPendingWrites, waitForAuth } from "./dataLogger";

export const BACKUP_FORMAT = "seneca-backup";
export const BACKUP_VERSION = 1;
const COLLECTIONS = ["global_data", "daily_logs", "preferences"] as const;
const ID = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/;
/** Firestore allows 500 writes per batch; stay clear of it. */
const BATCH_SIZE = 400;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: Record<(typeof COLLECTIONS)[number], Record<string, any>>;
};

/** Timestamps become ISO strings so the file is plain JSON. */
function plain(value: any): any {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  return value;
}

async function requireUser() {
  const user = await waitForAuth();
  if (!user) throw new Error("Sign in to back up your data.");
  return user;
}

export async function createBackup(): Promise<Backup> {
  const user = await requireUser();
  await flushPendingWrites();
  const data = {} as Backup["data"];
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, "users", user.uid, name));
    data[name] = Object.fromEntries(snap.docs.map((d) => [d.id, plain(d.data())]));
    counts[name] = snap.size;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), counts, data };
}

/** Checks a parsed file is a Seneca backup this version can restore. Throws with the reason. */
export function readBackup(parsed: any): Backup {
  if (!parsed || parsed.format !== BACKUP_FORMAT) throw new Error("This file isn't a Seneca backup.");
  if (parsed.version > BACKUP_VERSION) throw new Error("This backup is from a newer Seneca. Update first.");
  const data = parsed.data || {};
  for (const name of Object.keys(data)) {
    if (!COLLECTIONS.includes(name)) throw new Error(`Unknown section "${name}" in the backup.`);
    for (const [id, value] of Object.entries(data[name] || {})) {
      if (!ID.test(id)) throw new Error(`"${id}" isn't a valid document name.`);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`"${name}/${id}" isn't a document.`);
    }
  }
  return parsed;
}

export function backupCounts(backup: Backup) {
  return Object.fromEntries(COLLECTIONS.map((name) => [name, Object.keys(backup.data?.[name] || {}).length]));
}

/** Writes every document in the backup back to this account. Returns how many were written. */
export async function restoreBackup(backup: Backup): Promise<number> {
  const user = await requireUser();
  readBackup(backup);
  await flushPendingWrites();
  const writes: Array<[string, string, any]> = [];
  for (const name of COLLECTIONS) {
    for (const [id, value] of Object.entries(backup.data?.[name] || {})) writes.push([name, id, value]);
  }
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    if (auth.currentUser?.uid !== user.uid) throw new Error("Your sign-in changed during the restore. Reload and try again.");
    const batch = writeBatch(db);
    writes.slice(i, i + BATCH_SIZE).forEach(([name, id, value]) => {
      batch.set(doc(db, "users", user.uid, name, id), value, { merge: true });
    });
    await batch.commit();
  }
  return writes.length;
}

export function downloadJSON(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking synchronously can cancel the download in Safari/Firefox
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
