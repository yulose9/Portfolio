import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  journalWrite,
  journalRead,
  journalClear,
  journalFlush,
  journalOwnKey,
} from "../app/admin/ui/draft-journal.ts";
const storage = new Map();
test("discarding an old recovery snapshot cannot delete a newer write",async()=>{
  await journalWrite("race","base",{body:"old"});
  const old=(await journalRead("race"))[0];
  await journalWrite("race","base",{body:"new"});
  await journalClear("race",old.key,old.token);
  assert.equal((await journalRead("race"))[0].edit.body,"new");
});
globalThis.sessionStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
test("recovery journal preserves last queued edit and flush waits for durable commit", async () => {
  const first = { body: "first", title: "Title" };
  const a = journalWrite("page", "base", first);
  first.body = "mutated after queue";
  const b = journalWrite("page", "base", { body: "last", title: "Title" });
  assert.equal(await journalFlush("page"), true);
  await Promise.all([a, b]);
  const entries = await journalRead("page");
  assert.equal(entries[0].edit.body, "last");
  assert.equal(entries[0].base, "base");
  storage.clear();
  assert.equal(
    (await journalRead("page"))[0].edit.body,
    "last",
    "persistent database survives loss of sessionStorage",
  );
});
test("clearing one tab does not erase another tab's recovery", async () => {
  await journalWrite("other-page", "base", { body: "own" });
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("writing-draft-journal", 1);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put({
      key: "other-page:other-tab",
      tab: "other-tab",
      id: "other-page",
      base: "older",
      edit: { body: "other tab" },
      at: Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  assert.equal((await journalRead("other-page")).length, 2);
  await journalClear("other-page");
  const entries = await journalRead("other-page");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].edit.body, "other tab");
  assert.notEqual(entries[0].key, journalOwnKey("other-page"));
  await journalClear("other-page", entries[0].key);
  assert.equal((await journalRead("other-page")).length, 0);
  db.close();
});
