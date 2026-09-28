import type { Recovery } from "./session";

type Entry = Recovery & { key: string; tab: string };
export type LocalState = "writing" | "saved" | "unavailable";
export const JOURNAL_EVENT = "admin:draft-journal";
let tab = "";
const tabId = () => {
  if (tab) return tab;
  // A duplicated browser tab can inherit sessionStorage. A fresh runtime ID
  // prevents the two tabs from writing to the same journal entry.
  tab = crypto.randomUUID();
  return tab;
};
let opening: Promise<IDBDatabase> | null = null;
function database() {
  return (opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local storage unavailable"));
      return;
    }
    const req = indexedDB.open("writing-draft-journal", 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore("drafts", { keyPath: "key" });
      store.createIndex("id", "id");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      opening = null;
      reject(req.error);
    };
    req.onblocked = () => {
      opening = null;
      reject(new Error("Close an older admin tab to enable recovery."));
    };
  }));
}
const queues = new Map<string, Promise<boolean>>();
const versions = new Map<string, number>();
function notify(id: string, state: LocalState) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent(JOURNAL_EVENT, { detail: { id, state } }),
    );
}
function enqueue(
  id: string,
  write: (store: IDBObjectStore) => void,
): Promise<boolean> {
  const generation = (versions.get(id) ?? 0) + 1;
  versions.set(id, generation);
  notify(id, "writing");
  const job = (queues.get(id) ?? Promise.resolve(true)).then(async () => {
    try {
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        write(tx.objectStore("drafts"));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      if (versions.get(id) === generation) notify(id, "saved");
      return true;
    } catch {
      if (versions.get(id) === generation) notify(id, "unavailable");
      return false;
    }
  });
  queues.set(id, job);
  return job;
}
export function journalWrite<T>(id: string, base: string, edit: T) {
  const owner = tabId();
  // Snapshot before awaiting: later edits must not mutate an earlier recovery entry.
  const entry = JSON.parse(
    JSON.stringify({
      key: `${id}:${owner}`,
      tab: owner,
      id,
      base,
      edit,
      at: Date.now(),
      token:crypto.randomUUID(),
    }),
  );
  return enqueue(id, (s) => {
    s.put(entry);
  });
}
export function journalClear(id: string, key?: string, expectedToken?:string) {
  return enqueue(id, (s) => {
    const target=key ?? `${id}:${tabId()}`;
    if(expectedToken){const request=s.get(target);request.onsuccess=()=>{if(request.result?.token===expectedToken)s.delete(target);};}
    else s.delete(target);
  });
}
export function journalOwnKey(id: string) {
  return `${id}:${tabId()}`;
}
export async function journalRead<T>(
  id: string,
): Promise<(Recovery<T> & { key: string })[]> {
  try {
    await queues.get(id);
    const db = await database();
    const entries = await new Promise<Entry[]>((resolve, reject) => {
      const r = db
        .transaction("drafts")
        .objectStore("drafts")
        .index("id")
        .getAll(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return entries
      .filter((e) => e.id === id && typeof e.edit?.body === "string")
      .sort((a, b) => b.at - a.at) as (Recovery<T> & { key: string })[];
  } catch {
    notify(id, "unavailable");
    return [];
  }
}
export async function journalFlush(id: string) {
  return (await queues.get(id)) ?? false;
}
