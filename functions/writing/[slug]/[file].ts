/*
 * Share cards (/writing/<slug>/opengraph-image-<hash>) are exported by Next
 * without a file extension, and without one Pages serves them as
 * application/octet-stream, which some link-preview crawlers refuse. This
 * serves the same file with its real type. It only runs for this one shape of
 * path, and only when a card is fetched.
 */
type Env = { ASSETS: Fetcher };

export const onRequestGet: PagesFunction<Env, "slug" | "file"> = async ({ request, env, params }) => {
  const res = await env.ASSETS.fetch(request);
  if (!String(params.file).startsWith("opengraph-image") || !res.ok) return res;
  const out = new Response(res.body, res);
  out.headers.set("Content-Type", "image/png");
  out.headers.set("Cache-Control", "public, max-age=86400");
  return out;
};
