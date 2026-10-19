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
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    return retrieveAsset(context, pathWithSearch);
  }
  return forward(request, pathWithSearch);
}

/** The SDK's own scripts and remote config: cached at the edge, per PostHog. */
async function retrieveAsset(context, pathWithSearch) {
  const cache = caches.default;
  let response = await cache.match(context.request);
  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathWithSearch}`, { method: context.request.method, redirect: "error" });
    if (response.ok && context.request.method === "GET") context.waitUntil(cache.put(context.request, response.clone()));
  }
  return response;
}

async function forward(request, pathWithSearch) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  // Allowlist: Access assertions, service tokens and future private headers
  // must never cross the first-party analytics boundary.
  const headers = new Headers();
  for (const name of ["content-type", "content-encoding", "accept", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Without this every visitor would geolocate to a Cloudflare data centre.
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let body = null;
  if (hasBody && request.body) {
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return new Response("Payload too large", { status: 413 });
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  }

  return fetch(`https://${API_HOST}${pathWithSearch}`, {
    method: request.method,
    headers,
    body,
    redirect: "error",
  });
}
