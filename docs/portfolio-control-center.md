# Portfolio control center

The portfolio admin now has five destinations: Overview, Analytics, Writing,
Projects, and Website. It retains the existing Tiptap editor and Cloudflare
Access boundary. This document records implementation and rollout requirements;
it is not evidence of a production deployment.

## Design and navigation

- Official Cloudflare Kumo Sidebar, Button, Input and Table components provide
  the dashboard foundation. The existing writing editor remains available.
- Navigation becomes a drawer on small screens. Motion respects reduced-motion
  preferences. Navigation flushes registered editor work before changing scope.
- `scripts/prepare-kumo.mjs` prepares Kumo's standalone stylesheet for the existing
  Tailwind 3 app. It scopes selectors to the admin, renames cascade layers and
  internal Tailwind variables, and emits scoped utilities at the app's cascade
  level. Run `npm run kumo:styles` after installing dependencies; dev/build do so
  automatically. Do not hand-edit the generated stylesheet.
- Kumo's dark tokens follow the existing `html[data-theme]` preference; the
  dashboard does not force light mode or introduce a second theme setting.

References: [Kumo](https://kumo-ui.com/),
[official repository guidance](https://github.com/cloudflare/kumo/blob/main/AGENTS.md).

## Content and publication

Website content lives in `content/website.json`. Profile, company, About, Work,
certificates, section order/visibility, tools, links and sharing metadata are
editable. The preview renders the actual portfolio components. Existing media
can be selected for profile and share images.

Private autosaves and immutable revisions live under `website/` in the existing
private R2 binding. Conditional writes reject stale versions. Restoring a revision
creates a new private draft and retains the latest publication base. Publication
requires a separate review action and creates one GitHub content commit. A receipt
identifies that commit and expected revision; `/site-revision.json` verifies when
the static deployment actually serves it. Submission is not deployment success.

Project drafts use `workspaces/projects/` in private R2. Published Markdown lives
under `content/projects/`; public routes are `/projects` and `/projects/[slug]`.
Project details include role, timeframe, tools, outcomes, external links, order and
homepage featuring. Supporting pages have their own stable slug. Publishing is
explicit; ancestors must already be published and live children prevent removal
of a parent. The shared media library remains shared across content types.
Media usage checks include private and published projects and Website content.
Failure to load usage information fails the operation rather than treating an
asset as unused.

## Analytics configuration and definitions

Configure on the server only:

- `POSTHOG_PROJECT_ID`: numeric project ID.
- `POSTHOG_QUERY_KEY`: reporting credential authorized to query that project.
- `POSTHOG_REGION`: `us` or `eu`.
- `ANALYTICS_START_DATE`: date the new engagement instrumentation becomes live.

Keep the public ingestion key in the existing `NEXT_PUBLIC_POSTHOG_KEY` setting.
The reporting key must never use a `NEXT_PUBLIC_` name. The API accepts validated
calendar dates and an allowlisted content scope, never caller-supplied SQL.
Reports are cached privately for five minutes. Live HogQL execution and event
ingestion must be validated against the configured project before rollout.

- Page views count measured `$pageview` events, including historical events that
  lack a session ID. Both comparison periods use that same definition.
- Visits and journeys require `$session_id`; cookieless visitor estimates are
  daily estimates, not unique people across days.
- Engaged visits have at least ten measured active seconds or a meaningful action.
- Active time pauses for hidden/inactive tabs. It does not establish reading.
- Reading-depth milestones are measured events, not proof of comprehension.
- Journeys measure ordered steps in a single visit across all content, even when
  the traffic report is scoped to Writing or Projects.
- Admin pages, session replay and automatic interaction capture are excluded.
  DNT, GPC and the site's opt-out control suppress collection. Query strings and
  identifiers used for advertising attribution are removed.

Legacy vendor snippets are off by default. `NEXT_PUBLIC_LEGACY_ANALYTICS=1` is
an explicit rollback switch; it should not be used as the normal configuration.
No analytics vendor accounts or historical data are deleted.

## Verification and rollout

Run unit tests, frontend and API typechecks, dashboard browser tests for desktop
and mobile, and a production static build. Browser tests use mocked owner/API
responses; they do not establish production Access, R2, GitHub or PostHog health.
After deploying, verify owner-only access, save/restore conflicts, a Website
publication receipt reaching the public revision endpoint, a project and child
publication, and actual analytics ingestion/reporting. Never populate unavailable
reports with fabricated data.

Further refinements such as image cropping, per-page analytics drilldowns and
cross-workspace search are not claimed as implemented by this dashboard change.

### Integration check — October 4, 2026

Resumed against `4b51ddd` on `master`, aligned with `origin/master` after fetching.
The newer media picker, Pages navigator, icon proxy, calendar and dark-theme work
were retained. Full-app lint, API typechecking, 162 unit tests, and the production
static export passed. Dashboard/theme/navigation browser checks cover desktop
and mobile; the Review Queue test now uses the current calendar/time picker.
Live PostHog queries and a production publication were not exercised. Deployment
and live-service verification are separate from these local checks.
