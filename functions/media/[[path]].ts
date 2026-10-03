/*
 * Public images, from the private bucket. Only keys under media/ are ever
 * served, so drafts and revisions in the same bucket can't be fetched by
 * guessing a path. File names are random and never reused, so each response
 * is cached for a year, at the edge and in the browser.
 *
 * The one exception is a file replaced in the admin (it carries a `version`
 * in its custom metadata): the same URL now has new bytes, so its plain URL
 * is cached for minutes rather than a year and revalidates by ETag. The
 * admin asks for `?v=<version>`, which is a new URL and stays immutable.
 */

type Env = { WRITING: R2Bucket };

export const onRequestGet: PagesFunction<Env, "path"> = async ({ env, params, request, waitUntil }) => {
  const parts = Array.isArray(params.path) ? params.path : [params.path];
  if (parts.some((p) => !p || p === ".." || p.startsWith("."))) return new Response("Not found", { status: 404 });
  const key = `media/${parts.join("/")}`;

  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const obj = await env.WRITING.get(key, { onlyIf: request.headers });
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  const replaced = Boolean(obj.customMetadata?.version) && !new URL(request.url).searchParams.has("v");
  headers.set("Cache-Control", replaced ? "public, max-age=300, must-revalidate" : "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  // Direct navigation to a media object must not create an active document.
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox; frame-ancestors 'none'");
  headers.set("X-Frame-Options", "DENY");

  // A conditional request that matched: the object comes back without a body.
  if (!("body" in obj)) return new Response(null, { status: 304, headers });

  const response = new Response(obj.body, { headers });
  waitUntil(cache.put(request, response.clone()));
  return response;
};
