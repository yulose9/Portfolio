/*
 * Markdown for agents, by content negotiation. A request that asks for
 * `Accept: text/markdown` (and prefers it to HTML) gets the page's Markdown
 * twin, which the build already writes: /llms.txt for the home page,
 * /writing/index.md for the hub, /writing/<slug>/index.md for a post.
 * Browsers never ask for Markdown, so they get the HTML as before; every
 * negotiated response says `Vary: Accept` so no cache mixes the two.
 *
 * Cloudflare offers the same thing as "Markdown for Agents" on Pro plans;
 * this is the free-plan version, for the few URLs where it matters.
 */

type Ctx = { request: Request; env: { ASSETS: Fetcher }; next: () => Promise<Response> };

/** True when text/markdown is acceptable and not ranked below text/html. */
export function wantsMarkdown(request: Request): boolean {
  let md = -1;
  let html = -1;
  for (const part of (request.headers.get("Accept") ?? "").split(",")) {
    const [type, ...params] = part.trim().split(";");
    const q = Number(params.map((p) => p.trim()).find((p) => p.startsWith("q="))?.slice(2) ?? 1);
    const t = type.trim().toLowerCase();
    if (t === "text/markdown") md = Math.max(md, Number.isFinite(q) ? q : 1);
    if (t === "text/html") html = Math.max(html, Number.isFinite(q) ? q : 1);
  }
  return md > 0 && md >= html;
}

export async function negotiate({ request, env, next }: Ctx, twin: string, links?: string): Promise<Response> {
  if ((request.method === "GET" || request.method === "HEAD") && wantsMarkdown(request)) {
    const res = await env.ASSETS.fetch(new URL(twin, request.url));
    if (res.ok) {
      const text = await res.text();
      const headers = new Headers({
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Location": twin,
        // A rough count (about 4 characters a token), so an agent can budget.
        "x-markdown-tokens": String(Math.ceil(text.length / 4)),
        "X-Content-Type-Options": "nosniff",
      });
      if (links) headers.set("Link", links);
      return new Response(request.method === "HEAD" ? null : text, { headers });
    }
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.append("Vary", "Accept");
  if (links) out.headers.set("Link", links);
  return out;
}

/** Where an agent finds the machine-readable side of the site (RFC 8288, RFC 9727). */
export const DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</api.md>; rel="service-doc"; type="text/markdown"',
  '</llms.txt>; rel="describedby"; type="text/markdown"',
  '</llms.txt>; rel="alternate"; type="text/markdown"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");
