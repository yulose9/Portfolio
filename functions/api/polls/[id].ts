import { POLL_ID } from "../../../cms/blocks";
import { optionCount, remember, results, sha, tally } from "../../../cms/server/poll-store";

/*
 * Reader polls (components/writing/ChoicePoll.tsx), one per <div data-poll>.
 *
 *   GET    /api/polls/<id>?options=3  → { counts: [12, 4, 0], total: 16, voted: 1 | null }
 *   POST   /api/polls/<id>            { option: 1, options: 3, voter: "<random token>" }
 *                                     → the same, with your vote counted, or moved if
 *                                       you had already voted
 *   DELETE /api/polls/<id>            { options: 3, voter } → your vote taken back
 *
 * Storage is the KV namespace bound as POLLS (wrangler.toml); the shared
 * helpers are in cms/server/poll-store.ts. Without the binding the API
 * answers 503 and the poll keeps the vote on the reader's device instead.
 *
 * One vote per reader, which they can change: the vote is keyed by a hash of
 * the reader's random token (kept in localStorage), and an HttpOnly cookie
 * remembers that hash too, so clearing one of the two still finds the same
 * vote instead of adding a second. Writes are rate-limited per IP (hashed,
 * never stored raw).
 */

type Env = { POLLS?: KVNamespace };

const PER_MINUTE = 10;
const YEAR = 31536000;

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });

/** The cookie: "<option>.<voter hash>" (older cookies hold just the option). */
function fromCookie(request: Request, id: string): { option: number; hash: string | null } | null {
  const m = new RegExp(`(?:^|;\\s*)poll_${id}=(\\d{1,2})(?:\\.([0-9a-f]{32}))?`).exec(request.headers.get("Cookie") ?? "");
  return m ? { option: Number(m[1]), hash: m[2] ?? null } : null;
}

const cookie = (id: string, value: string, maxAge: number) =>
  `poll_${id}=${value}; Path=/api/polls; Max-Age=${maxAge}; SameSite=Lax; Secure; HttpOnly`;

export const onRequestGet: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
  const id = String(params.id);
  if (!POLL_ID.test(id)) return reply({ error: "Unknown poll." }, 404);
  if (!env.POLLS) return reply({ error: "Polls aren't set up on this deployment." }, 503);
  const options = optionCount(new URL(request.url).searchParams.get("options")) ?? 2;
  const mine = fromCookie(request, id)?.option ?? null;
  return reply(results(await tally(env.POLLS, id, options), mine !== null && mine < options ? mine : null));
};

/** What every write shares: same-site JSON, a valid body, the rate limit, and whose vote it is. */
async function writeRequest(env: Env, id: string, request: Request) {
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
  const voter = typeof body.voter === "string" && /^[a-z0-9]{16,40}$/.test(body.voter) ? body.voter : null;
  if (!options || !voter) return reply({ error: "Invalid vote." }, 400);

  // Rate limit: a few writes a minute from one address, across all polls.
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const minute = Math.floor(Date.now() / 60000);
  const limitKey = `rl:${await sha(`${ip}:polls`)}:${minute}`;
  const used = Number((await kv.get(limitKey)) ?? 0);
  if (used >= PER_MINUTE) return reply({ error: "Too many votes. Try again in a minute." }, 429, { "Retry-After": "60" });
  await kv.put(limitKey, String(used + 1), { expirationTtl: 120 });

  // The cookie's hash wins: it is the vote this browser already cast, even
  // if its localStorage (and so its token) has since been cleared.
  const hash = fromCookie(request, id)?.hash ?? (await sha(`${id}:${voter}`));
  const key = `v:${id}:${hash}`;
  const stored = await kv.getWithMetadata<{ o?: number }>(key);
  const previous = stored.value !== null ? (stored.metadata?.o ?? Number(stored.value)) : null;
  return { kv, options, body, hash, key, previous: Number.isInteger(previous) ? (previous as number) : null };
}

export const onRequestPost: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
  const id = String(params.id);
  const w = await writeRequest(env, id, request);
  if (w instanceof Response) return w;
  const { kv, options, body, hash, key, previous } = w;
  const option = Number(body.option);
  if (!Number.isInteger(option) || option < 0 || option >= options) return reply({ error: "Invalid vote." }, 400);

  // Count before writing (the list behind tally() lags), then correct by hand.
  const counts = await tally(kv, id, options);
  if (previous !== option) {
    await kv.put(key, String(option), { metadata: { o: option } });
    if (previous !== null && previous < counts.length) counts[previous] = Math.max(0, counts[previous] - 1);
    counts[option] = (counts[option] ?? 0) + 1;
    await remember(kv, id, counts);
  }
  return reply(results(counts, option), 200, { "Set-Cookie": cookie(id, `${option}.${hash}`, YEAR) });
};

export const onRequestDelete: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
  const id = String(params.id);
  const w = await writeRequest(env, id, request);
  if (w instanceof Response) return w;
  const { kv, options, key, previous } = w;
  const counts = await tally(kv, id, options);
  if (previous !== null) {
    await kv.delete(key);
    if (previous < counts.length) counts[previous] = Math.max(0, counts[previous] - 1);
    await remember(kv, id, counts);
  }
  return reply(results(counts, null), 200, { "Set-Cookie": cookie(id, "", 0) });
};
