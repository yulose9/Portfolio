/**
 * Firebase's sign-in helper pages, served from this domain:
 * nazarene.dev/__/auth/* and /__/firebase/* -> seneca-web.firebaseapp.com.
 *
 * Why: Safari, and an iPhone home-screen app most of all, partitions storage
 * by site. With the helper on firebaseapp.com, a redirect sign-in comes back
 * to a page that can't read what the helper stored, and Google sign-in starts
 * over every time. Served from the app's own domain (authDomain = this host),
 * the helper and the app share storage. This is Firebase's documented
 * "Option 3: proxy auth requests" (firebase.google.com/docs/auth/web/redirect-best-practices).
 *
 * Only these two prefixes are forwarded, only to the one fixed host, and only
 * GET/POST/HEAD, so the endpoint can't be used as a general relay.
 */

type PagesContext = { request: Request };

const AUTH_HOST = "seneca-web.firebaseapp.com";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST"]);
const ALLOWED_PREFIXES = ["/__/auth/", "/__/firebase/"];

export async function onRequest({ request }: PagesContext): Promise<Response> {
  const url = new URL(request.url);
  if (!ALLOWED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return new Response("Not found", { status: 404 });
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.set("host", AUTH_HOST);

  const upstream = await fetch(`https://${AUTH_HOST}${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: request.method === "POST" ? request.body : undefined,
    // Transparent forwarding: a 302 to firebaseapp.com would defeat the point.
    redirect: "manual",
  });

  const response = new Response(upstream.body, upstream);
  response.headers.set("x-robots-tag", "noindex");
  return response;
}
