# Verification and retirement pass — 2026-11-12

Scope: remove Sentry, strengthen repeatable checks for active features, and reduce
document conversion limitations. This is not a completion claim for the earlier
design, Wealth, migration, accessibility, or cross-device backlog.

## Sentry removed

Removed the browser/server/edge initialization, router/request instrumentation,
SDK packages, replay/profiling setup, logger, build wrapper/source-map integration,
profiling response header, settings, switch/removal scripts, obsolete tests, and
switch documentation. Removed its entries from the local environment files.
The application error screen and retry action remain.

The root dependency lockfile contains no Sentry packages. GitHub repository
secrets/variables and Cloudflare Pages preview/production environment-variable
names were checked: no Sentry entries were configured. No credential values were
printed. Existing public PostHog analytics and its private-route filter remain.
PostHog's bundled third-party code contains an unused Sentry compatibility adapter
and a bot-name string; this is not the Sentry SDK or an initialized integration.

Old deployments and already-open tabs retain their old JavaScript until a reload.
This change does not delete historical data from an external monitoring account.

## Verification completed locally

| Check | Result |
| --- | --- |
| Unit/regression suite | 317 passed, 0 failed |
| Firebase integration suite | 13 passed, 0 failed, Node 22 + Java 21 |
| Live rule comparison | Firestore and Storage rules fetched through Firebase MCP match checked-in files |
| Application/API TypeScript | Passed |
| Changed-file lint | Passed without warnings |
| Production build | Static export passed; existing unrelated image/hook lint warnings remain |
| Social export | 17 public pages, 17 distinct 1200 × 630 PNGs, each below 1 MB |

The Firebase suite uses a `demo-` project and loopback-only emulators. It tests
verified-owner CRUD, unverified/anonymous/cross-owner denial, collection queries,
unknown paths, forged daily-log ownership, and upload type/size restrictions.
It runs the actual sync service and synced-field controller through the real
Firebase SDK to check different-field concurrent writes, selected dates, undo
after reload, offline reconnect, account-switch isolation, and Journal CRUD
between independent clients. No production records were read or changed.

These checks exposed and fixed a real cache bug: a confirmed missing document or
field could leave stale Journal entries visible. Clean caches now follow the
authoritative empty result. Pending local edits remain protected. Both behaviors
are covered by integration tests. The suite is now part of CI; reproduce it with
the commands in [firebase/README.md](../firebase/README.md).

## Conversion improvement

Copy to Writing/Projects now preserves linked review notes, excerpts, and captures.
Each gets a deterministic new identity, its page/self references are remapped,
and its block references, text, dates, and resolution state are retained. The
immutable conversion plan retains original records for recovery.

Research records stage before the destination draft and stay hidden until that
draft exists. Failed requests can retry without exposing detached annotations,
overwriting an edited destination, or changing source records. Tests cover both
directions, interrupted writes, concurrent source research changes, and retries.
The dialog reports how many revisions and research items were copied.

Still intentionally blocked: child-page trees, saved collection membership,
cross-page private references, live polls/votes, and pending local media. Folder
placement and live editor undo stacks are not copied. They require coordinated
state migration, not removal of validation guards.

## Remaining verification gaps

- Browser host is disconnected (`apps: []`, `browsers: []`). No new mobile,
  keyboard/screen-reader, real-login, or visual acceptance claim is made.
- Emulator auth uses synthetic claims. Browser IndexedDB persistence, real
  Google authentication, and device-switch UX still need browser acceptance.
- The concurrency check covers different fields. Same-field/array conflicts
  need dedicated acceptance coverage before claiming conflict-free editing.
- Conversion failure/concurrency tests use an in-memory R2 implementation.
  A full UI-to-R2 test in a disposable preview workspace remains outstanding.
- Export metadata/image validation does not prove Messenger, Telegram, or
  iMessage have refreshed an existing cached preview.

Wealth, Money Story, and Priority Payment remain disabled. Bills and AI remain
outside this pass.

References: [Firebase emulator workflow](https://firebase.google.com/docs/emulator-suite/connect_and_prototype),
[Firebase rules unit testing](https://firebase.google.com/docs/rules/unit-tests),
[Temurin installation](https://adoptium.net/installation/ci-scripts).
