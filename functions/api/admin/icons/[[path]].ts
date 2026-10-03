import { iconifyRoute } from "../../../../cms/icon-sets";
import { fail, type AdminFunction } from "../../../../cms/server/http";

/*
 * The icon library's way to Iconify. The browser used to ask
 * api.iconify.design directly, about 120 image requests a page; Iconify
 * throttles bursts like that, and its 429 carries no CORS header, so the
 * admin saw "Failed to fetch" and broken images. Privacy extensions block the
 * host too. Now every request comes here, same-origin, behind Access.
 *
 * Only the routes the library uses pass (see iconifyRoute), rebuilt from
 * checked parts. Answers are cached at the edge for a day, so a repeat
 * request never reaches Iconify; a 429 is retried once, and a failing host
 * falls back to Iconify's backup hosts.
 */

const HOSTS = ["https://api.iconify.design", "https://api.simplesvg.com", "https://api.unisvg.com"];
const DAY = 86_400;
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Upstream = { ok: true; response: Response } | { ok: false; status: number };

/** One host, with one retry when it says it's busy. */
async function ask(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json, image/svg+xml" },
        cf: { cacheTtl: DAY, cacheEverything: true },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status !== 429 || attempt) return response;
    } catch {
      if (attempt) return null;
    }
    await wait(400);
  }
  return null;
}

async function upstream(route: string): Promise<Upstream> {
  let status = 502;
  for (const host of HOSTS) {
    const response = await ask(`${host}/${route}`);
    if (!response) continue;
    // A missing icon or set is missing everywhere; don't ask the backups.
    if (response.ok || response.status === 404) return response.ok ? { ok: true, response } : { ok: false, status: 404 };
    status = response.status === 429 ? 429 : 502;
  }
  return { ok: false, status };
}

export const onRequestGet: AdminFunction<"path"> = async ({ request, params, waitUntil }) => {
  const url = new URL(request.url);
  const path = Array.isArray(params.path) ? params.path.join("/") : (params.path ?? "");
  const route = iconifyRoute(path, url.searchParams);
  if (!route) return fail("That icon request isn't one the library makes.", 404);

  const svg = route.includes(".svg");
  // Cached under this origin; the key never leaves the Worker.
  const key = new Request(`${url.origin}/__iconify-cache/${route}`);
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : null;
  let cached = await cache?.match(key).catch(() => undefined);

  if (!cached) {
    const answer = await upstream(route);
    if (!answer.ok) {
      return answer.status === 404
        ? fail("Iconify doesn't have that icon.", 404)
        : fail(answer.status === 429 ? "Iconify is busy. Wait a moment and try again." : "Iconify isn't answering. Try again in a moment.", answer.status);
    }
    const body = await answer.response.arrayBuffer();
    if (body.byteLength > 4 * 1024 * 1024) return fail("Iconify sent more than expected.", 502);
    const headers = new Headers({
      "Content-Type": svg ? "image/svg+xml" : "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${DAY}`,
    });
    cached = new Response(body, { headers });
    if (cache) waitUntil(cache.put(key, cached.clone()).catch(() => undefined));
  }

  const out = new Response(cached.body, { status: 200 });
  out.headers.set("Content-Type", svg ? "image/svg+xml" : "application/json; charset=utf-8");
  // Private: the admin answers only behind Access. The middleware keeps this.
  out.headers.set("Cache-Control", `private, max-age=${DAY}, immutable`);
  out.headers.set("X-Content-Type-Options", "nosniff");
  if (svg) out.headers.set("Content-Security-Policy", SVG_CSP);
  return out;
};
