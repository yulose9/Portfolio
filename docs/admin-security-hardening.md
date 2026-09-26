# Admin security hardening

Source review and implementation, 2026-09-26. This is a focused hardening pass,
not a penetration test or a claim that the console cannot be compromised.
No deployed endpoints, real identities, or unpublished content were probed.

## Boundaries and changes

The protected assets are drafts/revisions in R2, the publishing GitHub token,
and the ability to change public posts. The lower-trust inputs are HTTP
requests, imported/pasted Markdown, upload bytes, and embed metadata.

| ID | Source evidence | Change | Priority |
| --- | --- | --- | --- |
| 1 | `functions/api/admin/posts/[id]/publish.ts:7` previously caught every JSON error and published immediately | Reject malformed JSON and invalid scheduling dates before loading a draft | High correctness priority; no unauthenticated publish bypass established |
| 2 | `cms/render.ts:289` now sanitizes the parsed tree used by both public posts and inline admin previews | Proven allowlist sanitizer; prohibit authored scripts, styles, frames, forms, event handlers and forged custom components; preserve media/details/Markdown | High hardening priority; hostile content still requires a path into authored material |
| 3 | `functions/api/admin/_middleware.ts:44` and `cms/server/http.ts:30` | Require RS256, signed expiry/issued-at/subject/email claims and application-token type; retain issuer/audience/email checks; enforce exact Origin, non-simple request header, and fetch metadata on writes | Defense in depth |
| 4 | `cms/server/http.ts:36` and `cms/server/http.ts:52` | JSON content type, object-root validation, 2 MiB streamed JSON limit, actual byte counting independent of Content-Length | Resource and input hardening |
| 5 | `functions/api/admin/uploads.ts:36` and `cms/server/upload.ts:2` | Images capped at 12 MiB, audio/video at 32 MiB; check container signatures and prevent overwriting immutable public URLs | Resource and integrity hardening; signatures are not malware scanning |
| 6 | `cms/server/store.ts:20`, post edit and bulk routes | Validate storage IDs and revision timestamps, construct bounded cover metadata, bound tags and reject duplicate bulk IDs | Input hardening |
| 7 | `functions/api/admin/posts/index.ts:9` | Listing posts no longer permanently purges trash; explicit authenticated deletion remains | Prevent read-side destructive effects |
| 8 | `public/_headers`, admin middleware, public media handler | No-store and nosniff on admin API success/error/denials; deny framing; restrict active media documents; baseline CSP and permissions policy for the admin shell | Defense in depth |

The admin frontend remains observable to its visitors. Authorization lives on
the server; hiding API paths, disabling developer tools, or blocking right-click
would not provide that boundary.

## Compatibility notes

- Reload an already-open admin tab after deployment. Old tabs do not send the
  new `X-Admin-Request: 1` header and their mutations will be refused.
- Scripts, arbitrary HTML frames/styles and authored custom components in
  Markdown no longer render. Use supported provider links for embeds.
- Sanitized heading IDs use the `user-content-` prefix. TOC links generated from
  the tree agree; old externally saved heading fragments may need updating.
- Trash now remains until explicitly deleted. The UI describes this behavior.
- Upload limits apply after browser compression. Large recordings may need to
  be shortened or recompressed. Existing media is not removed.
- New sanitizer dependency is recorded in package.json and package-lock.json.
  Only lockfile metadata was resolved; dependency lifecycle scripts were not run.

## Verification and limits

- Source traces and `git diff --check` completed. Regression cases in
  `tests/admin-security.test.mjs` cover JSON rejection, actual byte overflow,
  browser write-origin policy and media signatures.
- These new tests, typecheck, production build and browser regression checks
  were **not executed in this security pass**. The security-audit skill requires
  an OS-enforced sandbox with no network, an empty allowlisted environment,
  read-only source/toolchain, scratch-only writes and resource limits. Windows
  has Node; the available WSL sandbox tooling has no Linux Node runtime. A
  compliant JavaScript execution environment was not available.
- Run `node --test tests/admin-security.test.mjs`, TypeScript checks for both
  root and functions/tsconfig.json, and the production build in a provisioned
  isolated environment with the locked dependencies already present. Use dummy
  keys/storage, not production credentials. Verify safe Markdown/media/embeds,
  real Access login, save, publish, revision restore, upload conflict handling,
  and headers in an owner-operated staging environment before relying on this.
- No external compromise or production policy weakness was confirmed. Existing
  Access issuer/audience/signature and email allowlist checks were present.

## Dependency triage

`npm audit --package-lock-only --omit=dev --ignore-scripts` reported one high
PostCSS entry and one moderate Next.js transitive entry on 2026-09-26. The
PostCSS advisories concern attacker-controlled CSS/source maps processed by
build tooling. This static-export deployment does not expose PostCSS as an
admin request handler; imported Markdown styles are now stripped. That limits
the identified admin runtime path, but does not certify the build supply chain.
The suggested fix crosses to Next.js 16.3.6; no untested major migration or
forced audit fix was applied. Revisit by 2026-10-03 with isolated build tests.
Relevant advisories: GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp,
GHSA-r28c-9q8g-f849 and GHSA-qx2v-qp2m-jg93. Dev dependencies were not audited.

## Owner-controlled deployment checks still required

1. Verify Access covers `/admin`, `/admin/*`, `/api/admin` and `/api/admin/*`
   across custom domains, pages.dev and preview domains. Use an identity provider
   with phishing-resistant MFA; shorten the documented 24-hour admin session to
   an operationally suitable window. Source cannot establish these settings.
2. Keep `ADMIN_DEV_BYPASS` absent in production and preview environments. The
   existing bypass is loopback-only; it is not a production login mechanism.
3. Configure edge rate limits for the admin API and stricter limits for upload,
   publish and bulk operations. No isolate-local counter was added or presented
   as distributed protection. Rate-limit configuration was not changed remotely.
4. Keep R2 private. Uploaded media remains public by URL, including media used
   in drafts; random filenames are not private-media authorization.
5. Keep the publishing token repo-scoped, short-lived and without workflow/admin
   permissions. Rotate it on suspected disclosure. Verify backups and restores.
6. The admin CSP is a baseline (framing, objects, base URLs, forms and inline
   event attributes), not a complete script policy. A strict script-src needs
   build-generated hashes for Next's static inline bootstrap and staging checks.
7. Same-admin concurrent saves and publishing still need atomic conflict checks
   or serialization. The existing optional version check is not a storage CAS.
8. The public site and admin share an origin. Sanitization helps, but eventual
   isolation on a dedicated admin origin would further contain public scripts.

## Installed skills

Project-local installs: auth-implementation-patterns,
better-auth-security-best-practices, security-best-practices,
security-and-hardening, security-requirement-extraction, solidity-security.
All six SKILL.md files were read. Better Auth's generic controls informed the
review, but the application still uses Cloudflare Access. Solidity is not part
of this codebase; no blockchain dependency or contract code was added.
