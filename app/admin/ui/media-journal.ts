import type { Uploaded } from "./media";

export type MediaJob = {
  version: 1;
  id: string;
  documentId: string;
  blockId: string;
  name: string;
  file?: Blob;
  mime: string;
  state:
    | "queued"
    | "uploading"
    | "auth-paused"
    | "failed"
    | "complete"
    | "cancelled";
  result?: Uploaded;
  error?: string;
  attempts: number;
  updatedAt: number;
  uploadYear?: number;
};
export const MEDIA_JOBS_EVENT = "writing:media-jobs";
let opening: Promise<IDBDatabase> | undefined;
function database() {
  return (opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("writing-media-jobs", 3);
    r.onupgradeneeded = () => {
      const store = r.result.objectStoreNames.contains("jobs")
        ? r.transaction!.objectStore("jobs")
        : r.result.createObjectStore("jobs", { keyPath: "id" });
      if (!store.indexNames.contains("documentId"))
        store.createIndex("documentId", "documentId");
      if (!r.result.objectStoreNames.contains("parts"))
        r.result.createObjectStore("parts", { keyPath: "key" });
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => {
        r.result.close();
        opening = undefined;
      };
      resolve(r.result);
    };
    r.onerror = () => {
      opening = undefined;
      reject(r.error);
    };
    r.onblocked = () => {
      opening = undefined;
      reject(new Error("Close older admin tabs to enable upload recovery."));
    };
  }));
}
export async function mediaJobs(documentId: string): Promise<MediaJob[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("jobs")
      .objectStore("jobs")
      .index("documentId")
      .getAll(documentId);
    r.onsuccess = () =>
      resolve(
        (r.result as MediaJob[])
          .filter((j) => j.version === 1 && j.documentId === documentId)
          .sort((a, b) => a.updatedAt - b.updatedAt),
      );
    r.onerror = () => reject(r.error);
  });
}
export async function saveMediaJob(job: MediaJob) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("jobs", "readwrite");
    tx.objectStore("jobs").put({ ...job, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(MEDIA_JOBS_EVENT));
}
export async function removeMediaJob(id: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["jobs", "parts"], "readwrite");
    tx.objectStore("jobs").delete(id);
    const prefix = id.replaceAll("-", "").slice(0, 24) + "-";
    const request = tx.objectStore("parts").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (String(cursor.key).startsWith(prefix)) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(MEDIA_JOBS_EVENT));
}
export const pendingMediaLabel = (name: string) =>
  `[Pending media: ${name.slice(0, 160)}]`;

/** Retry sends the exact encoded bytes even if a codec produces different output on the next run. */
export async function preparedMediaPart(
  name: string,
  year: number,
  blob: Blob,
): Promise<Blob> {
  const db = await database(),
    key = `${name}:${year}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("parts", "readwrite"),
      store = tx.objectStore("parts"),
      request = store.get(key);
    let bytes = blob;
    request.onsuccess = () => {
      if (request.result) bytes = request.result.blob;
      else store.put({ key, blob });
    };
    tx.oncomplete = () => resolve(bytes);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
