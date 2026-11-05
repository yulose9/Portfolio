# Projects and Seneca follow-up

Verification date: November 5, 2026. Branch: `feature/seneca-migration`.

This report accompanies the local feature-branch commit. These changes have not been pushed, deployed, or written directly to the production Firestore database.

## Changes

| Area | Implementation |
| --- | --- |
| Projects index | Uses the Writing page's breadcrumb, title, introduction, and count treatment, followed by restrained project previews. |
| Project documents | Shared article typography, byline, outline, reading progress, sharing, context menu, code copying, and image zoom. Project metadata uses a semantic properties list. Unsupported Outcomes claims were removed. |
| Project preview | Shares project properties, article enhancements, outline, context menu, Markdown copying, and project-specific links. Interactions use the preview document rather than assuming the main browser document. |
| Dark mode and mobile | Theme-based project text, surfaces, borders, responsive type, and gutters; keyboard focus and reduced-motion handling. Visual acceptance remains pending. |
| Image zoom | Explicit close control, Escape and keyboard focus handling, and cleanup when an animation is cancelled. |
| Admin overview | Removed the page width cap, corrected stacked rail sizing, and made KPI columns respond to available width. Writing counts explicitly use the Writing API even after visiting Projects. |
| Popover icons | Removed clipping around animated check glyphs and prevented menu icons from shrinking. |
| Temporarily hidden features | Wealth navigation, Money Story, Net Worth, and Priority Payment are gated off. Existing code and stored financial data remain intact. Disabled Wealth deep links resolve to Home. |
| Protocol calendar | Selecting a date loads that date's task record. Historical tasks can be added, edited, removed, checked, moved between phases, and reordered without rewriting today's routine. Calendar completion uses that day's task count. |
| Activity completion | Journal entries, workout history, and study history supply dated completion evidence for Reflect, Workout, and Learn Stuff. Invalid and future completion dates are ignored. |
| Time reminders | Manila time controls Eat Lunch highlighting from noon to 1 PM and Shutdown highlighting from 9 PM until midnight. Checking the relevant tasks stops their highlight. Reduced motion receives a static treatment. |
| Category transitions | Personal, Work, Other, and selected-date changes use short transitions. Exiting panels are inert so they cannot accept stale clicks. Task details are keyboard accessible. |
| Growth | Civil Service Professional Exam is available in the roadmap and study subject catalog. Existing records are preserved and duplicate insertion is prevented. No exam date is invented. |
| Life calendar | Uses one tooltip mechanism instead of triggering both custom and global tooltips. |

## Data and interaction guards

- Strict date keys reject malformed dates and path-like input before dated log writes.
- Historical requests ignore stale results after changing dates or categories.
- Editing controls are gated while a historical record is loading or has failed to load.
- Moving historical tasks between phases generates a distinct ID because built-in IDs can repeat across phases.
- Automatic completion is idempotent and waits for the current category to hydrate. Source evidence does not erase unrelated manual completions.
- The existing account-scoped persistence engine handles writes; no additional public data endpoint or database permission was introduced.

## Verification

| Check | Result |
| --- | --- |
| Full unit suite | 276 passed; 0 failed, skipped, or cancelled. |
| TypeScript | `tsc --noEmit --pretty false` passed. |
| Production build | `npm run build` passed and generated all 35 static pages. Nonblocking lint and Sentry JSON-import warnings remain. |
| Pages Functions types | `npm run typecheck:api` passed. |
| Export integrity | Project index, full project article, project Markdown, and admin exports exist. The full published story and both images are preserved; unsupported Outcomes claims are absent. |
| Changed-file ESLint | 0 errors, 3 warnings: the project index's native responsive image and two existing ProtocolContext hook dependency warnings. |
| Final ProtocolView lint | Passed with no warnings or errors after the interaction changes. |
| Whitespace validation | `git diff --check` passed. |
| Impeccable detector | Returned an empty findings list. This is not visual acceptance. |
| Local route smoke checks | HTTP 200 for `/projects`, `/projects/this-portfolio-redesigned`, its `/index.md` endpoint, and `/admin?section=seneca`. |
| Project response checks | Shared article markup present; unsupported Outcomes claims absent. |

New tests cover dated task summaries, date validation, activity-derived completion, Manila reminder boundaries, feature flags, Civil Service catalog merging, per-day calendar denominators, and explicit admin workspace API routing.

## Outstanding verification and release caveat

- The browser automation host was unavailable. Fresh desktop/mobile screenshots, dark-mode inspection, image-zoom behavior, touch dragging, and an interactive accessibility pass have **not** been verified in a browser during this pass.
- Authenticated Firestore round trips, multi-device synchronization, and deployed security-rule behavior have **not** been exercised against production. Unit tests and local HTTP responses do not establish those results.
- The published article update from `origin/master` (`6cb043d`) was incorporated before the release commit. Its full body, images, title, and metadata are preserved; only the unsupported Outcomes claims are removed. The earlier local/live content mismatch is resolved.
- This is a scoped follow-up, not a certification that the entire repository is secure or that every earlier request has been re-audited.

## Machine setup

- Imported 249 missing skill folders from the existing Claude Code and Gemini/Antigravity locations into the shared agent skills directory; existing entries were preserved.
- Imported 27 MCP server configurations into Codex and backed up the previous TOML file. Configuration syntax was validated; server connections and OAuth sessions were not all tested.
- PostHog remains disabled because `POSTHOG_AUTH_HEADER` is missing.
- No usable Claude Desktop MCP configuration was found in its standard or Store application location.
- User-level `EDITOR` and `VISUAL` are both `notepad.exe`. New processes inherit these values.
- Codex may need a reload to activate newly imported servers.

Local verification logs and the import inventory are in the ignored `.audit` directory. No credentials are included in this report.

## Release preparation

- Fast-forwarded the feature branch to `origin/master` at `6cb043d` before preparing the commit, incorporating the latest published article without rewriting its body.
- Reviewed and staged the 40 files belonging to this follow-up. Unrelated pre-existing research reports and the font-catalog timestamp change remain outside the commit.
- The build regenerated the font catalog; its exact pre-build contents were restored afterward.
- Checked staged paths and common credential patterns; no generated build output, environment files, or matching credential patterns were staged.
- Production deployment remains a separate step: pushing or merging to the configured Cloudflare Pages production branch triggers the existing Git-based deployment workflow. A local commit does not publish the site.
