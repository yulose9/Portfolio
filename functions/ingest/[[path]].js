/**
 * First-party proxy for PostHog: nazarene.dev/ingest/* -> PostHog US.
 *
 * Why it exists: requests to *.posthog.com are on most ad-block lists, so a
 * large share of visitors were never counted. Served from this domain, they
 * are ordinary same-origin requests.
 *
 * Why a Pages Function and not the Next.js rewrites it replaces: the site is a
 * static export with no server, and rewrites need one — they were removed for
 * exactly that reason, which silently left `/ingest` answering nothing. A file
 * under functions/ runs on Cloudflare's edge, and only for /ingest: every other
 * path is still served as plain static files and never invokes (or bills) this.
 *
 * Adapted from PostHog's own Cloudflare proxy recipe
 * (posthog.com/docs/advanced/proxy/cloudflare), with the prefix stripped and a
 * few limits added so the endpoint cannot be used as a general relay.
 */

const API_HOST = "us.i.posthog.com";
const ASSET_HOST = "us-assets.i.posthog.com";

/** Capture batches, including session replay chunks, stay well under this. */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "OPTIONS"]);

/** @param {{ request: Request, waitUntil: (p: Promise<unknown>) => void }} context */
export async function onRequest(context) {
  const { request } = context;

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  // Only the path after /ingest is forwarded, and only ever to PostHog's two
  // fixed hosts, so nothing a client sends can choose where this proxies to.
  const path = url.pathname.replace(/^\/ingest/, "") || "/";
  const pathWithSearch = path + url.search;

  if (path.startsWith("/static/") || path.startsWith("/array/")) {
    return retrieveAsset(context, pathWithSearch);
  }
  return forward(request, pathWithSearch);
}

/** The SDK's own scripts and remote config: cached at the edge, per PostHog. */
async function retrieveAsset(context, pathWithSearch) {
  const cache = caches.default;
  let response = await cache.match(context.request);
  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathWithSearch}`);
    if (response.ok) context.waitUntil(cache.put(context.request, response.clone()));
  }
  return response;
}

async function forward(request, pathWithSearch) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const headers = new Headers(request.headers);
  // This site's cookies and credentials are no business of PostHog's.
  headers.delete("cookie");
  headers.delete("authorization");
  // Without this every visitor would geolocate to a Cloudflare data centre.
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : null;
  // Content-Length can be absent (chunked), so check the real size too.
  if (body && body.byteLength > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  return fetch(`https://${API_HOST}${pathWithSearch}`, {
    method: request.method,
    headers,
    body,
    redirect: request.redirect,
  });
}
