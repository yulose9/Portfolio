import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, listAll } from 'firebase/storage';

// Refuse production or remotely hosted targets, even if a shell has Firebase credentials.
for (const [key, expected] of Object.entries({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8088', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9198' })) {
  assert.equal(process.env[key], expected, `Run through npm test in firebase/: ${key}`);
}
const projectId = 'demo-seneca-verification';
const root = fileURLToPath(new URL('../', import.meta.url));
let env;
const owner = () => env.authenticatedContext('alice', { email_verified: true });
const other = () => env.authenticatedContext('bob', { email_verified: true });
const dailyPath = 'users/alice/daily_logs/2026-11-11';
const globalPath = 'users/alice/global_data/study';
before(async () => {
  env = await initializeTestEnvironment({ projectId,
    firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8') },
    storage: { host: '127.0.0.1', port: 9198, rules: readFileSync(new URL('./storage.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); });
after(async () => { await env?.cleanup(); });

test('verified owner can create, read, update, query and delete their permitted records', async () => {
  const db = owner().firestore();
  for (const location of [dailyPath, globalPath, 'users/alice/preferences/display']) {
    const record = firestore.doc(db, location);
    await assertSucceeds(firestore.setDoc(record, { user_id: 'alice', value: 1 }));
    assert.equal((await assertSucceeds(firestore.getDocFromServer(record))).data().value, 1);
    await assertSucceeds(firestore.updateDoc(record, { value: 2 }));
    await assertSucceeds(firestore.getDocs(firestore.collection(db, location.split('/').slice(0, -1).join('/'))));
    await assertSucceeds(firestore.deleteDoc(record));
  }
});

test('anonymous, unverified and other accounts cannot read, list, create, update or delete private records', async () => {
  for (const location of [dailyPath, globalPath, 'users/alice/preferences/display']) {
    await firestore.setDoc(firestore.doc(owner().firestore(), location), { value: 'private fixture' });
    for (const context of [env.unauthenticatedContext(), env.authenticatedContext('alice', { email_verified: false }), other()]) {
      const db = context.firestore(), record = firestore.doc(db, location);
      await assertFails(firestore.getDocFromServer(record));
      await assertFails(firestore.getDocs(firestore.collection(db, location.split('/').slice(0, -1).join('/'))));
      await assertFails(firestore.setDoc(record, { value: 'overwrite' }));
      await assertFails(firestore.setDoc(firestore.doc(db, location + '-new'), { value: 'create' }));
      await assertFails(firestore.updateDoc(record, { value: 'update' }));
      await assertFails(firestore.deleteDoc(record));
    }
  }
});

test('daily logs reject forged owners, malformed date keys and excessive top-level fields', async () => {
  const db = owner().firestore();
  await assertFails(firestore.setDoc(firestore.doc(db, dailyPath), { user_id: 'bob' }));
  await assertFails(firestore.setDoc(firestore.doc(db, 'users/alice/daily_logs/not-a-date'), { value: 1 }));
  const oversized = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`field${i}`, i]));
  for (const location of [dailyPath, globalPath]) await assertFails(firestore.setDoc(firestore.doc(db, location), oversized));
});

test('unknown collections, nested records and cross-owner queries remain denied', async () => {
  const db = owner().firestore();
  for (const location of ['users/alice', 'users/alice/unknown/one', globalPath + '/private/one', 'public/one']) {
    await assertFails(firestore.setDoc(firestore.doc(db, location), { value: 1 }));
    await assertFails(firestore.getDocFromServer(firestore.doc(db, location)));
  }
  await assertFails(firestore.getDocs(firestore.collectionGroup(db, 'daily_logs')));
});

test('uploads support owner CRUD and deny foreign/anonymous reads, listing and writes', async () => {
  const location = 'users/alice/uploads/photo.png';
  const image = new Uint8Array([137, 80, 78, 71]);
  const storage = owner().storage();
  await assertSucceeds(uploadBytes(ref(storage, location), image, { contentType: 'image/png' }));
  assert.equal((await assertSucceeds(getBytes(ref(storage, location)))).byteLength, 4);
  await assertSucceeds(listAll(ref(storage, 'users/alice/uploads')));
  for (const context of [other(), env.unauthenticatedContext(), env.authenticatedContext('alice', { email_verified: false })]) {
    const denied = context.storage();
    await assertFails(getBytes(ref(denied, location)));
    await assertFails(listAll(ref(denied, 'users/alice/uploads')));
    await assertFails(uploadBytes(ref(denied, location), image, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(denied, 'users/alice/uploads/new.png'), image, { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(denied, location)));
  }
  await assertSucceeds(deleteObject(ref(storage, location)));
});

test('uploads reject non-image types, the 10 MiB boundary and paths outside the owner tree', async () => {
  const storage = owner().storage(), file = ref(storage, 'users/alice/uploads/file');
  await assertFails(uploadBytes(file, new Uint8Array([1]), { contentType: 'text/html' }));
  await assertFails(uploadBytes(file, new Uint8Array(10 * 1024 * 1024), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(storage, 'public/file.png'), new Uint8Array([1]), { contentType: 'image/png' }));
});

// Load the actual sync service, replacing only browser lifecycle/auth adapters.
// All Firestore reads, listeners, mergeFields writes and transactions use the real SDK + emulator.
function appClient(db, uid = 'alice') {
  const data = new Map(), timers = new Set(), modules = new Map();
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) };
  const auth = { currentUser: { uid }, authStateReady: async () => {} };
  const load = filename => {
    if (modules.has(filename)) return modules.get(filename);
    const exports = {}; modules.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const bindings = { exports, console, Date, URL, Intl, queueMicrotask, localStorage: storage,
      window: { addEventListener() {} }, document: { addEventListener() {}, visibilityState: 'visible' }, navigator: { onLine: true },
      setTimeout: (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); return timer; },
      clearTimeout: timer => { clearTimeout(timer); timers.delete(timer); },
      require: name => {
        if (name === 'firebase/firestore') return firestore;
        if (name === 'firebase/auth') return { onAuthStateChanged: (_, fn) => { queueMicrotask(() => fn(auth.currentUser)); return () => {}; } };
        if (name === './firebase') return { auth, db };
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
        throw new Error(`Unexpected test dependency: ${name}`);
      },
    };
    // Stay in the SDK's realm: a VM context gives object literals a different
    // Object.prototype, which Firestore correctly rejects as custom instances.
    compileFunction(code, Object.keys(bindings), { filename })(...Object.values(bindings));
    return exports;
  };
  const api = load(path.join(root, 'lib/seneca/services/dataLogger.ts'));
  return { api, auth, storage,
    field: (...args) => load(path.join(root, 'lib/seneca/services/syncedField.ts')).getSyncedField(...args),
    close() { auth.currentUser = null; api.preparePrivateSession(null); for (const timer of timers) clearTimeout(timer); } };
}
async function until(check, label, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 30)); }
  assert.fail(`Timed out: ${label}`);
}

test('actual sync service hydrates before saving and preserves concurrent edits to different fields', { timeout: 30000 }, async t => {
  const a = appClient(owner().firestore()), b = appClient(owner().firestore());
  t.after(() => { a.close(); b.close(); });
  await firestore.setDoc(firestore.doc(owner().firestore(), globalPath), { title: 'AWS', weeks: 4, streak: 2 });
  const seen = [];
  b.api.subscribeToGlobalData('study', value => seen.push(value));
  await Promise.all([a.api.getGlobalData('study'), b.api.getGlobalData('study')]);
  a.api.updateGlobalData('study', { weeks: 8 });
  b.api.updateGlobalData('study', { streak: 3 });
  await Promise.all([a.api.flushPendingWrites(), b.api.flushPendingWrites()]);
  await until(() => seen.some(v => v.weeks === 8 && v.streak === 3), 'other client sees both changes');
  const saved = (await firestore.getDocFromServer(firestore.doc(owner().firestore(), globalPath))).data();
  assert.equal(saved.title, 'AWS'); assert.equal(saved.weeks, 8); assert.equal(saved.streak, 3);
  assert.equal(a.api.isGlobalDirty('study'), false);
});

test('actual daily-log writes persist selected dates independently and support undo after reload', { timeout: 30000 }, async t => {
  const client = appClient(owner().firestore()); t.after(() => client.close());
  for (const day of ['2026-11-10', '2026-11-11']) await client.api.getLogForDate(day);
  client.api.updateLogForDate('2026-11-10', 'protocol', { phases: { learn: true } });
  client.api.updateLogForDate('2026-11-11', 'journal', { entries: [{ id: 'fixture', title: 'Today' }] });
  await client.api.flushPendingWrites();
  const reloaded = appClient(owner().firestore()); t.after(() => reloaded.close());
  assert.equal((await reloaded.api.getLogForDate('2026-11-10')).protocol.phases.learn, true);
  assert.equal((await reloaded.api.getLogForDate('2026-11-11')).journal.entries[0].title, 'Today');
  reloaded.api.updateLogForDate('2026-11-10', 'protocol', { phases: { learn: false } });
  await reloaded.api.flushPendingWrites();
  const saved = await firestore.getDocFromServer(firestore.doc(owner().firestore(), 'users/alice/daily_logs/2026-11-10'));
  assert.equal(saved.data().protocol.phases.learn, false); assert.equal(saved.data().user_id, 'alice');
});

test('actual sync service retains dirty edits offline and confirms them after reconnection', { timeout: 30000 }, async t => {
  const db = owner().firestore(), client = appClient(db); t.after(() => client.close());
  await client.api.getGlobalData('study');
  await firestore.disableNetwork(db);
  client.api.updateGlobalData('study', { weeks: 2 });
  const pending = client.api.flushPendingWrites();
  assert.equal(client.api.isGlobalDirty('study'), true);
  assert.equal((await firestore.getDocFromServer(firestore.doc(owner().firestore(), globalPath))).exists(), false);
  await firestore.enableNetwork(db);
  await pending;
  assert.equal((await firestore.getDocFromServer(firestore.doc(owner().firestore(), globalPath))).data().weeks, 2);
  assert.equal(client.api.isGlobalDirty('study'), false);
});

test('account switch discards the former account’s queued writes and private working cache', { timeout: 30000 }, async t => {
  const client = appClient(owner().firestore()); t.after(() => client.close());
  await client.api.getGlobalData('study');
  client.api.updateGlobalData('study', { title: 'Alice private fixture' });
  client.auth.currentUser = { uid: 'bob' };
  client.api.preparePrivateSession('bob');
  await client.api.flushPendingWrites();
  assert.equal((await firestore.getDocFromServer(firestore.doc(owner().firestore(), globalPath))).exists(), false);
  assert.equal(client.storage.getItem('seneca_sync_dirty'), null);
  assert.equal(client.storage.getItem('seneca_global_data'), null);
});

test('journal field replaces a stale cache with Firebase, then syncs create, edit and delete to another client', { timeout: 30000 }, async t => {
  const a = appClient(owner().firestore()), b = appClient(owner().firestore());
  t.after(() => { a.close(); b.close(); });
  await Promise.all([a.api.waitForAuth(), b.api.waitForAuth()]);
  const location = 'users/alice/global_data/journal';
  await firestore.setDoc(firestore.doc(owner().firestore(), location), { entries: [{ id: 1, title: 'Server version' }] });
  a.storage.setItem('journal_entries', JSON.stringify([{ id: 1, title: 'Stale cache' }]));
  const options = { initial: [], storageKey: 'journal_entries' };
  const left = a.field('journal', 'entries', options), right = b.field('journal', 'entries', options);
  assert.equal(left.getStatus(), 'cached');
  left.subscribe(() => {}); right.subscribe(() => {});
  await until(() => left.get()[0]?.title === 'Server version' && right.getStatus() === 'live', 'cloud replaces cache');
  left.set(previous => [...previous, { id: 2, title: 'New entry' }]);
  await a.api.flushPendingWrites();
  await until(() => right.get().length === 2, 'created entry reaches another device');
  right.set(previous => previous.map(entry => entry.id === 2 ? { ...entry, title: 'Revised entry' } : entry));
  await b.api.flushPendingWrites();
  await until(() => left.get().some(entry => entry.title === 'Revised entry'), 'edited entry reaches first device');
  left.set(previous => previous.filter(entry => entry.id !== 2));
  await a.api.flushPendingWrites();
  await until(() => right.get().length === 1, 'deletion reaches other device');
  assert.equal((await firestore.getDocFromServer(firestore.doc(owner().firestore(), location))).data().entries.length, 1);
});

test('authoritative missing journal data clears a clean cache instead of showing deleted entries', { timeout: 30000 }, async t => {
  const client = appClient(owner().firestore()); t.after(() => client.close());
  await client.api.waitForAuth();
  client.storage.setItem('journal_entries', JSON.stringify([{ id: 1, title: 'Deleted remotely' }]));
  const entries = client.field('journal', 'entries', { initial: [], storageKey: 'journal_entries' });
  entries.subscribe(() => {});
  await until(() => entries.getStatus() === 'live', 'authoritative empty document');
  assert.deepEqual(entries.get(), []);
  const record = firestore.doc(owner().firestore(), 'users/alice/global_data/journal');
  await firestore.setDoc(record, { entries: [{ id: 2, title: 'New server entry' }] });
  await until(() => entries.get().length === 1, 'server entry appears');
  await firestore.updateDoc(record, { entries: firestore.deleteField() });
  await until(() => entries.get().length === 0, 'missing field clears cache too');
});

test('an empty server snapshot does not erase a pending local journal edit', { timeout: 30000 }, async t => {
  const client = appClient(owner().firestore()); t.after(() => client.close());
  await client.api.waitForAuth();
  const entries = client.field('journal', 'entries', { initial: [], storageKey: 'journal_entries' });
  entries.set([{ id: 1, title: 'Unsynced entry' }]);
  entries.subscribe(() => {});
  await until(() => entries.getStatus() === 'live', 'first server response');
  assert.equal(entries.get()[0].title, 'Unsynced entry');
  await client.api.flushPendingWrites();
  assert.equal((await firestore.getDocFromServer(firestore.doc(owner().firestore(), 'users/alice/global_data/journal'))).data().entries[0].title, 'Unsynced entry');
});
