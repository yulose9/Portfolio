import { POLL_ID } from "../../../cms/blocks";

/*
 * Reader polls (components/writing/ChoicePoll.tsx), one per <div data-poll>.
 *
 *   GET  /api/polls/<id>?options=3   → { counts: [12, 4, 0], total: 16, voted: 1 | null }
 *   POST /api/polls/<id>             { option: 1, options: 3, voter: "<random token>" }
 *                                    → the same, with your vote counted
 *
 * Storage is a KV namespace bound as POLLS (see docs in the report / README:
 * `wrangler kv namespace create POLLS`, then bind it to the Pages project).
 * Without the binding the API answers 503 and the poll keeps the vote on the
 * reader's device instead.
 *
 * Each vote is its own key, v:<poll>:<voter hash>, with the option in its
 * metadata, so two votes at once can't overwrite each other; the totals are
 * a count of those keys, cached for a minute under c:<poll>. One vote per
 * browser: the voter token (kept in localStorage) and a cookie both stop a
 * second one. Votes are rate-limited per IP (hashed, never stored raw).
 */

type Env = { POLLS?: KVNamespace };
type Results = { counts: number[]; total: number; voted: number | null };

const MAX_OPTIONS = 12;
const PER_MINUTE = 8;

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });

async function sha(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

const cookieVote = (request: Request, id: string): number | null => {
  const m = new RegExp(`(?:^|;\\s*)poll_${id}=(\\d{1,2})`).exec(request.headers.get("Cookie") ?? "");
  return m ? Number(m[1]) : null;
};

const optionCount = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2 && n <= MAX_OPTIONS ? n : null;
};

/** Counts from the vote keys (or the minute-old cache of them). */
async function tally(kv: KVNamespace, id: string, options: number): Promise<number[]> {
  const cached = await kv.get<number[]>(`c:${id}`, "json");
  let counts: number[];
  if (Array.isArray(cached)) counts = cached.map((n) => (Number.isFinite(n) ? n : 0));
  else {
    counts = [];
    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const list: KVNamespaceListResult<{ o?: number }> = await kv.list<{ o?: number }>({ prefix: `v:${id}:`, cursor, limit: 1000 });
      for (const key of list.keys) {
        const o = key.metadata?.o;
        if (typeof o === "number" && o >= 0 && o < MAX_OPTIONS) counts[o] = (counts[o] ?? 0) + 1;
      }
      if (list.list_complete) break;
      cursor = list.cursor;
    }
    await kv.put(`c:${id}`, JSON.stringify(Array.from({ length: Math.max(counts.length, 0) }, (_, i) => counts[i] ?? 0)), { expirationTtl: 60 });
  }
  return Array.from({ length: Math.max(options, counts.length) }, (_, i) => counts[i] ?? 0).slice(0, Math.max(options, 2));
}

const results = (counts: number[], voted: number | null): Results => ({ counts, total: counts.reduce((a, b) => a + b, 0), voted });

export const onRequestGet: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
  const id = String(params.id);
  if (!POLL_ID.test(id)) return reply({ error: "Unknown poll." }, 404);
  if (!env.POLLS) return reply({ error: "Polls aren't set up on this deployment." }, 503);
  const options = optionCount(new URL(request.url).searchParams.get("options")) ?? 2;
  return reply(results(await tally(env.POLLS, id, options), cookieVote(request, id)));
};

export const onRequestPost: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
  const id = String(params.id);
  if (!POLL_ID.test(id)) return reply({ error: "Unknown poll." }, 404);
  if (!env.POLLS) return reply({ error: "Polls aren't set up on this deployment." }, 503);
  const kv = env.POLLS;

  // Votes come from the article page itself.
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Cross-site vote refused." }, 403);
  if ((request.headers.get("Content-Type") ?? "").split(";")[0].trim() !== "application/json") return reply({ error: "Expected JSON." }, 415);
  const raw = await request.text();
  if (raw.length > 1024) return reply({ error: "Too large." }, 413);
  let body: { option?: unknown; options?: unknown; voter?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "Expected JSON." }, 400);
  }
  const options = optionCount(body.options);
  const option = Number(body.option);
  const voter = typeof body.voter === "string" && /^[a-z0-9]{16,40}$/.test(body.voter) ? body.voter : null;
  if (!options || !Number.isInteger(option) || option < 0 || option >= options || !voter) return reply({ error: "Invalid vote." }, 400);

  // Rate limit: a few votes a minute from one address, across all polls.
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const minute = Math.floor(Date.now() / 60000);
  const limitKey = `rl:${await sha(`${ip}:polls`)}:${minute}`;
  const used = Number((await kv.get(limitKey)) ?? 0);
  if (used >= PER_MINUTE) return reply({ error: "Too many votes. Try again in a minute." }, 429, { "Retry-After": "60" });
  await kv.put(limitKey, String(used + 1), { expirationTtl: 120 });

  const voterKey = `v:${id}:${await sha(`${id}:${voter}`)}`;
  const previous = await kv.getWithMetadata<{ o?: number }>(voterKey);
  const already = cookieVote(request, id) ?? (previous.value !== null ? (previous.metadata?.o ?? Number(previous.value)) : null);
  if (already !== null) return reply(results(await tally(kv, id, options), already), 409);

  // Count before writing (the list behind tally() is eventually consistent),
  // then add this vote directly and keep that in the minute cache.
  const counts = await tally(kv, id, options);
  await kv.put(voterKey, String(option), { metadata: { o: option } });
  counts[option] = (counts[option] ?? 0) + 1;
  await kv.put(`c:${id}`, JSON.stringify(counts), { expirationTtl: 60 });
  return reply(results(counts, option), 200, {
    "Set-Cookie": `poll_${id}=${option}; Path=/api/polls; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`,
  });
};
