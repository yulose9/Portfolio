import { createRemoteJWKSet, jwtVerify } from "jose";

import { GitHubError } from "../../../cms/server/github";
import { fail, HttpError, type AdminFunction } from "../../../cms/server/http";
import { PublishError } from "../../../cms/server/publish";

/*
 * Every /api/admin request passes through here.
 *
 * Cloudflare Access already stands in front of /admin and /api/admin and turns
 * away anyone who isn't me. This checks again, on the request itself, because
 * Access is configuration: a typo in a path rule, a new *.pages.dev preview
 * URL, a policy edited in a hurry, and the edge check is gone without a sound.
 * The signed token Access attaches can't be forged, so verifying it here means
 * the API stays closed even then.
 */

// Keys are fetched once per isolate and refreshed by jose when they rotate.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksFor = "";

export const onRequest: AdminFunction = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (local && env.ADMIN_DEV_BYPASS === "1") {
    ctx.data.email = "dev@localhost";
  } else {
    const team = env.ACCESS_TEAM_DOMAIN?.replace(/\/+$/, "");
    if (!team || !env.ACCESS_AUD || !env.ADMIN_EMAIL) {
      return fail("The admin isn't configured yet (Access team domain, AUD or admin email missing).", 503);
    }

    // The header is the one to trust; the cookie isn't always forwarded.
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) return fail("Not signed in.", 401);

    try {
      if (!jwks || jwksFor !== team) {
        jwks = createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
        jwksFor = team;
      }
      const { payload } = await jwtVerify(token, jwks, { issuer: team, audience: env.ACCESS_AUD });
      const email = String(payload.email ?? "").toLowerCase();
      const allowed = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
      if (!email || !allowed.includes(email)) return fail("This account can't use the admin.", 403);
      ctx.data.email = email;
    } catch {
      return fail("Your sign-in couldn't be verified. Reload to sign in again.", 401);
    }
  }

  // Writes must come from the admin page itself. SameSite cookies already stop
  // most cross-site posts; this closes the rest.
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return fail("Cross-origin request refused.", 403);
  }

  try {
    const response = await ctx.next();
    const out = new Response(response.body, response);
    out.headers.set("Cache-Control", "no-store");
    out.headers.set("X-Robots-Tag", "noindex");
    return out;
  } catch (error) {
    if (error instanceof PublishError || error instanceof HttpError) return fail(error.message, error.status);
    if (error instanceof GitHubError) {
      const hint =
        error.status === 401 || error.status === 403
          ? "GitHub refused the token. Check GITHUB_TOKEN has Contents: read and write on the repo."
          : "GitHub didn't accept the change. Try again in a moment.";
      console.error(error.message);
      return fail(hint, 502);
    }
    console.error(error);
    return fail("Something went wrong on the server.", 500);
  }
};
