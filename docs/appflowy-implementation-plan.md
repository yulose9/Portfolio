# AppFlowy-inspired implementation plan

Status: **core implementation delivered with bounded scope; verification and remaining acceptance work are tracked in [implementation notes](appflowy-implementation.md)**. September 28, 2026. The phase descriptions below preserve the original proposal, including targets that are not yet verified in staging.

Based on the pinned source audit in [AppFlowy codebase review](appflowy-codebase-review.md) and our existing [AFFiNE-inspired implementation](affine-implementation.md).

## Product direction and constraints

Make the writing admin excellent at composing, researching, recovering and publishing articles. Preserve Tiptap, React/Next.js, Base UI and the R2 → explicit publish → GitHub Markdown workflow. Adapt AppFlowy's interaction, persistence and navigation patterns to these tools. Do not introduce Flutter, a second editor engine, CRDT synchronization or a generic database platform to obtain individual features.

Priorities are ordered by user impact and dependency. Each phase should ship independently behind a small feature flag where it changes storage or interaction behavior. Effort labels are relative engineering scope, not delivery promises: S = localized change; M = several coordinated surfaces; L = storage/API/UI work with failure recovery.

## Phase 0 — Establish observable editor and publication behavior

**Priority P0 · scope M · dependency: none.**

Extend and execute the existing browser scenarios before expanding the editor. Use AppFlowy's [selection tests](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/integration_test/desktop/document/document_selection_test.dart), [image tests](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/integration_test/desktop/document/document_with_image_block_test.dart) and [mobile slash-menu tests](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/integration_test/mobile/document/slash_menu_test.dart) as behavioral references, not test code to port.

Work in `tests/browser/editor.spec.ts`, existing focused unit tests, `playwright.config.ts` and the relevant editor/public rendering components. Add a representative article fixture containing an image width, custom text marks, inline logo, heading icon, date mention, page mention, nested lists and long links. Use mocked APIs for deterministic interactions and a controlled staging publication for integration parity.

Acceptance:

- Open a link editor by pointer and keyboard, change both text and URL, move focus between fields, submit and undo. No premature dismissal or wrong target.
- Open “Turn into,” traverse to its submenu near both viewport edges, select a type, then undo. Escape closes the innermost surface first.
- Marquee-select intersecting blocks, drag/delete, then undo. Native text selection and scrolling still work; nested blocks are not operated on twice.
- Resize an image, save, reload, preview and publish the fixture. The saved width matches within rounding when space permits and clamps to available width on smaller screens. Alt controls never obscure resize handles.
- During auth expiry, retain local work, distinguish server save success from local recovery, and wait for confirmation before app-initiated reauthentication navigation. Cloudflare may reject expired requests regardless of a popup; never promise that confirmation extends server access.
- Cover touch controls, mobile virtual keyboard, reduced motion and keyboard-only navigation. Record actual browser results rather than treating discovery or typechecking as execution.

Exit gate: regression suite runs successfully in its configured desktop/mobile projects, and any reported failure is fixed before claiming the associated bug resolved. Capture baseline interaction/search timings for later comparison. No production content edits are necessary to create fixtures.

## Phase 1 — Consolidate editor interaction and schema contracts

**Priority P0 · scope M · dependency: phase 0 fixtures.**

Adapt the transaction/undo ownership described in audit sections 1–3. Extend `app/admin/ui/interaction-range.ts`, `app/admin/ui/registry.ts`, the editor and its extensions; add `app/admin/ui/editor-interactions.ts` as a proposed shared coordinator if existing helpers cannot carry the contract clearly.

Define one active editor interaction with its owner, target block IDs or mapped text bookmark, originating document identity, return-focus element, and completion/cancel cleanup. Nested menus belong to the same interaction; they do not reset the target. Re-resolve targets after document transactions. If a target was deleted or changed incompatibly, explain that the action is unavailable rather than modifying a nearby block.

Use a capability map to drive consistent available/disabled actions in block menus, selection toolbars and the command palette. Keep ProseMirror history. Group a completed local conversion, drag or resize into a meaningful undo step; do not pretend cross-document network actions can be undone atomically through editor history.

Extend `cms/editor-document.ts` only when a new schema is actually needed. Add explicit version-to-version migration functions and fixtures before accepting version 2. Keep the original saved payload and revision recoverable on migration failure. Moving a block within its document preserves its ID; duplication/import gets new IDs; references require deliberate remapping rules.

Acceptance: link/style forms retain selections; opening one interaction releases the previous one cleanly; cancel, pointer cancellation and unmount restore state; unsupported mixed selections have readable disabled reasons; undo restores both content and a useful selection. Existing version-1 and legacy Markdown documents continue to open. Rollback leaves readers able to load the prior representation; never silently downgrade unknown structured content.

## Phase 2 — Reliable clipboard and import behavior

**Priority P1 · scope M · dependency: phase 1 identity/schema rules.**

Extend `app/admin/ui/paste.ts` and clipboard hooks in `Editor.tsx`. Introduce a proposed versioned internal clipboard envelope containing supported document fragments and a source document ID. Preserve ordinary HTML/plain-text clipboard formats as portable fallbacks because browser clipboard format support varies.

Dispatch through validated internal content, supported file/image content, sanitized HTML and text/Markdown. The exact precedence must be covered by fixtures for mixed representations rather than copied blindly from another application. Copy remaps IDs; a same-document move uses the editor transaction path. Strip private research metadata from portable exports. Keep published URL safety checks at serialization/rendering boundaries.

For complex import, offer a concise preview: retained blocks, unsupported structures, external images and text fallback. Preserve recoverable original input locally where appropriate, with explicit size limits; never log raw clipboard content. Paste without formatting remains available.

Acceptance: round-trip custom marks, resized images and links internally; paste from rich HTML/Markdown/plain text; block scripts/unsafe URLs; handle malformed/oversized JSON, tables in incompatible contexts, unsupported versions and clipboard fallback. One undo reverses one completed insertion. Import failure leaves the existing document unchanged.

## Phase 3 — Durable media jobs and a useful media library

**Priority P1 · scope L · dependency: phase 1 stable target rules.**

Use the audit's uploader and SQLite-persistence findings as a model for ownership, not as a browser implementation. Extend `app/admin/ui/media.ts`, `functions/api/admin/uploads.ts`, `cms/server/upload.ts` and existing recovery/session protection. Proposed new modules: `app/admin/ui/media-journal.ts`, `app/admin/ui/MediaJobs.tsx` and a private server upload-job store.

Proposed job contract:

```ts
type MediaJob = {
  version: 1;
  id: string;                  // also the server idempotency key
  documentId: string;
  blockId: string;
  state: 'queued' | 'processing' | 'uploading' | 'auth-paused'
    | 'failed' | 'complete' | 'cancelled';
  blobKey?: string;            // private IndexedDB Blob, not a public URL
  resultAssetId?: string;
  attempts: number;
  updatedAt: string;
};
```

Persist intent and browser-readable bytes before reporting recoverability. If storage fails or exceeds quota, show that the upload cannot survive closing the page and allow retry/reselection. Use bounded concurrency and backoff only for retriable failures. Authentication failures pause work until reauthentication; malformed media must not retry forever.

Server completion must be idempotent and validate identity, byte limits and media types. A successful upload is an asset result; attaching it to a document is a separate conditional step. If the target was deleted, show a recoverable unattached asset instead of inserting at an obsolete position. Pending local object URLs must never become published image sources.

Expose progress, retry, cancel and attachment status near the media block and in a compact jobs panel. Add asset usage (“used in these pages”), alt text and dimensions to a later media-library view. Deletion must check references and require deliberate handling of shared assets; do not automatically delete a remote asset just because one upload UI was cancelled.

Acceptance: refresh during upload; expired session; lost network; conversion failure; quota failure; two tabs retrying one job; deleted/replaced target; save conflict after successful upload. No duplicate attachments, loss of recoverable input, or false “saved” state. Initial delivery retries complete files; multipart byte resume is explicitly excluded until its server protocol and cleanup policy exist.

Rollout: opt-in queue for new uploads, retain current successful asset URLs, set retention/cleanup rules, and migrate only versioned job records. Disable queue creation on rollback without deleting pending records or source blobs.

## Phase 4 — Page tree, breadcrumbs and return context

**Priority P1 · scope M · dependency: phase 1 and existing session guards.**

Extend `PostList.tsx`, page navigation, `ResearchPanel.tsx` and existing parent metadata. Proposed new components: `PageTree.tsx` and `PageBreadcrumbs.tsx`. Use one parent graph, not separate sidebar-only ownership. A page's URL/identity must not depend on its display position.

Provide collapsible ancestors, pinned/recent shortcuts, breadcrumbs and page peek. Restore the last useful block/scroll position when returning from another page. Store view preferences separately from article content. Start with one live editor; defer tabs with independent mounted editors until save/recovery isolation is measured.

Validate self-parenting, cycles, missing/deleted parents and concurrent reparenting on the server. If concurrent reparent operations can create a cycle across objects, require serialization for graph mutations rather than relying solely on independent ETags. Add keyboard “Move to…” alongside pointer drag-and-drop. Trashed ancestors should produce a recoverable location state, not hide accessible children silently.

Acceptance: navigating away flushes or preserves work; selecting a backlink and returning restores context; reparent retains page IDs and links; cycles cannot be created; narrow screens expose the same actions through a sheet; long trees remain usable by keyboard. Rollback hides the tree but retains valid parent metadata and list access.

## Phase 5 — Search that is precise, explainable and scalable

**Priority P1 · scope M, potentially L if measured scale warrants a new store · dependency: existing search retained.**

Extend `SearchPalette.tsx`, `functions/api/admin/search.ts`, `cms/research.ts` and `cms/server/research.ts`. Preserve existing debounce, abort and block-jump behavior. Add explicit filters for status, tag and current page subtree, then phrase/word search modes. Separate command results and document results clearly; show page path and matched context. Preserve keyboard focus when results update.

Define a versioned derived index containing source version/fingerprint, normalization version, title, plain text, block IDs and filter metadata. Normalize Unicode consistently and preserve a mapping back to original text offsets for highlights. Rank exact titles, title words and body matches deterministically; bounded typo tolerance can follow measured query failures. Do not imply semantic search is needed for phrase search.

Replace repeated revision-prefix traversal with a repairable current-document catalog if measurement justifies it. A shared catalog requires conditional updates or a serialized writer; do not create a new lost-update hotspot. Document/index/catalog writes are not an atomic R2 transaction. Treat indexes as disposable, mark lag explicitly and make reconciliation idempotent. Failed refresh must never look like an authoritative empty corpus.

Acceptance: titles/phrases spanning formatting, Unicode text, renamed/deleted pages, block moves, stale responses, partial index failure and schema upgrades. Test filters before ranking and limit application. Benchmark cold and warm searches over 100, 1,000 and 5,000 synthetic documents plus realistic revision counts. Provisional warm-result target: p95 under 500 ms on the agreed staging setup, excluding the intentional debounce; record environment and revise architecture from evidence. This is a target, not an observed performance claim.

Rollout: dual-read old/new indexes with source-version validation; rebuild privately; compare result fixtures before switching. Never expose private snippets through public routes or analytics.

## Phase 6 — Editorial stages, source confidence and publication review

**Priority P2 · scope M · dependency: existing Research/Workspace and phase 5 metadata support.**

Extend `ResearchWorkspace.tsx`, `ResearchPanel.tsx`, draft metadata validation and `cms/server/publish.ts`. Reuse existing collections, captures, excerpts, private review notes, calendar and revision history.

Add private editorial stage (`idea`, `drafting`, `review`, `ready`) independently of publication status. An already published article can be under review without becoming a draft-only article. Add optional review-due date/time with explicit timezone semantics; this is not a change to `publishAt`, a reminder notification service, or automatic publication.

Improve research provenance: source title/URL, capture time, last checked time and stored excerpt fingerprint. Refresh shows a diff and requires an explicit choice; inserted excerpts remain snapshots. Avoid introducing unrestricted server-side URL fetching merely to obtain source titles.

Add a compact prepublication review for unresolved references, unfinished uploads, missing image descriptions, unresolved review notes and unsupported public serialization. Classify real blockers versus optional editorial suggestions. Private child-page content must not leak through page mentions or source snippets.

Record a publication receipt containing draft source version, output fingerprint and Git commit identity, so “published” identifies the version actually sent. Reconcile uncertain responses before retrying. Compare preview/public semantics for image dimensions, marks, headings, dates, links and mentions; intentional public styling differences are allowed.

Acceptance: stages do not publish/unpublish; review dates remain stable across timezone/daylight transitions; private research stays out of front matter; source refresh cannot silently rewrite inserted article text; a failed or conflicting publish has a truthful status and retry path. Legacy drafts default safely; unknown metadata is not accidentally serialized publicly.

## Phase 7 — Optional additions after reliability gates

**Priority P3 · separately scoped and selected by actual writing needs.**

- Bounded image galleries with captions, alt text, reorder and a specified mobile reading order. Require JSON/Markdown/public-renderer round trips before exposing insertion.
- Context-aware writing checks such as broken internal references, missing descriptions and outdated research. Keep suggestions explainable and dismissible.
- AI assistance only if desired: explicit selected sources, inspectable transmitted context, provider/cost settings, cancellable execution and accept/reject changes. Never send every private draft by default or autopublish generated edits.
- Multi-editor tabs, realtime collaboration, arbitrary columns and relational databases need independent product/architecture decisions. They are not included in the core phases.

## Delivery and verification rules

Each implementation change should identify the audited source pattern, current behavior being improved, storage impact, migration/rollback path and acceptance evidence. Consult current documentation through Context7 when implementing library-specific APIs; this audit does not prescribe unverified current Tiptap or Base UI method signatures.

Run the relevant unit and browser scenarios for each phase, frontend typechecking/lint, and separate Cloudflare route checks when APIs change. Run publication round-trip checks when document or serializer contracts change. Add a staging integration check for real storage/authorization behavior because mocked browser APIs cannot prove it.

Measure regressions against the phase-0 baseline: typing responsiveness in a long article, menu focus stability, upload recovery outcomes, search latency and publication parity. Avoid content-bearing telemetry; job/error codes, timings and counts are sufficient for most diagnostics.

The release gate is concrete evidence that work survives interruption and the published article represents the approved draft. Merely adding a component, dependency or passing typecheck does not establish that an interaction works.

## Suggested delivery sequence

1. Verify reported editor bugs and publication fixtures (phase 0).
2. Consolidate target/selection ownership and schema rules (phase 1).
3. Deliver media recovery (phase 3), then clipboard robustness (phase 2).
4. Deliver contextual navigation (phase 4) and search improvements (phase 5).
5. Add editorial review/provenance (phase 6).
6. Select optional features only after the earlier acceptance gates pass.

No application implementation, dependency installation, live-data migration, commit, push or deployment is performed by this planning document.
