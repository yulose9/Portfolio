/*
 * Poll votes in KV (bound as POLLS), shared by the reader API
 * (functions/api/polls/[id].ts) and the admin's (functions/api/admin/polls/[id].ts).
 *
 * Each vote is its own key, v:<poll>:<voter hash>, holding the option index
 * in its metadata, so two votes at once can't overwrite each other and a
 * reader can change or take back theirs. Totals are a count of those keys,
 * cached for a minute under c:<poll>; every write corrects that cache
 * directly, because KV's list is only eventually consistent.
 */

export const MAX_OPTIONS = 12;

export type Results = { counts: number[]; total: number; voted: number | null };

export async function sha(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const optionCount = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2 && n <= MAX_OPTIONS ? n : null;
};

const fit = (counts: number[], options: number) =>
  Array.from({ length: Math.max(options, 2) }, (_, i) => Math.max(0, counts[i] ?? 0));

/** Every vote key of a poll, with its option. */
export async function voteKeys(kv: KVNamespace, id: string): Promise<{ name: string; option: number }[]> {
  const out: { name: string; option: number }[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const list: KVNamespaceListResult<{ o?: number }> = await kv.list<{ o?: number }>({ prefix: `v:${id}:`, cursor, limit: 1000 });
    for (const key of list.keys) {
      const o = key.metadata?.o;
      if (typeof o === "number" && o >= 0 && o < MAX_OPTIONS) out.push({ name: key.name, option: o });
    }
    if (list.list_complete) break;
    cursor = list.cursor;
  }
  return out;
}

/** Counts from the vote keys, or the minute-old cache of them. */
export async function tally(kv: KVNamespace, id: string, options: number, fresh = false): Promise<number[]> {
  const cached = fresh ? null : await kv.get<number[]>(`c:${id}`, "json");
  if (Array.isArray(cached)) return fit(cached.map((n) => (Number.isFinite(n) ? n : 0)), options);
  const counts: number[] = [];
  for (const { option } of await voteKeys(kv, id)) counts[option] = (counts[option] ?? 0) + 1;
  const all = fit(counts, Math.max(options, counts.length));
  await kv.put(`c:${id}`, JSON.stringify(all), { expirationTtl: 60 });
  return fit(all, options);
}

export const results = (counts: number[], voted: number | null): Results => ({
  counts,
  total: counts.reduce((a, b) => a + b, 0),
  voted,
});

/** Writes the corrected totals after a change, so the next read sees it at once. */
export const remember = (kv: KVNamespace, id: string, counts: number[]) =>
  kv.put(`c:${id}`, JSON.stringify(counts), { expirationTtl: 60 });

/** Removes every vote of a poll (the admin's reset). Returns how many went. */
export async function clearVotes(kv: KVNamespace, id: string): Promise<number> {
  const keys = await voteKeys(kv, id);
  for (let i = 0; i < keys.length; i += 50) await Promise.all(keys.slice(i, i + 50).map((k) => kv.delete(k.name)));
  await kv.delete(`c:${id}`);
  return keys.length;
}
