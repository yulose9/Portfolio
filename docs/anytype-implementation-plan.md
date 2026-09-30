# Anytype-inspired implementation plan

September 30, 2026. Baseline: Portfolio `93ed628`. Companion: [source review, comparison and pinned references](anytype-codebase-review.md).

**Status: proposed, not implemented.** Keep Tiptap and the current publishing architecture. Extend existing capabilities rather than introducing a second collections, search, folder, keyboard, or recovery subsystem.

## Product boundary

The admin should support a clear sequence: **capture → connect evidence → draft → review → publish → revisit**. Organization is private by default. Publication remains an explicit, versioned action; moving a card, changing a type, editing a property, or importing a file never publishes content.

This plan independently adapts behavior observed in Anytype. It does not call for copying its source, switching to MobX/Electron, or integrating anytype-heart.

## Delivery order

| Phase | Deliverable | Depends on | Release gate |
| --- | --- | --- | --- |
| A | TOC consistency, media repair states, popup lifecycle regressions | Current app | Existing editor/reader journeys remain intact |
| B | Search-state restoration and source navigation | A | Back/peek preserve context; stale targets handled |
| C | Saved views, interactive editorial board, review calendar | B plus versioned view schema | Conflicting writes do not overwrite; no implicit publishing |
| D | Optional page kinds, properties, template defaults | C | Private/public metadata separation and migration tests |
| E | Import preflight, backup/export reports, operation history | B; D for property-rich import | Round-trip fixtures, bounded jobs, partial-result recovery |
| F | Evidence health, selected technical blocks, focused graph | B–E as applicable | Measured usability benefit and editor/public parity |

Ship these as small reviewed changes. Phase A can be completed without introducing a new backend schema. Do not bundle all phases into one large commit or treat every lower-priority idea as a launch requirement.

## A. Reliability and interaction polish

### A1. One heading navigation contract

**Source lesson:** Anytype's TOC patch `c2fed099` aligns the active-heading calculation with the click scroll anchor and handles bottom-clamped destinations.

**Current seam:** `app/components/writing/Toc.tsx` chooses active headings using 30% of viewport height; clicks use `scrollIntoView`. `app/admin/ui/Outline.tsx` has a separate editor navigation surface.

**Implementation:** extract pure heading-selection and scroll-target helpers. Derive the anchor from the actual sticky header/scroll margin. Keep an explicit clicked target until the intended scroll settles or the user interrupts. After settlement, retain the target when multiple headings share a clamped destination; release it after user scrolling moves away. Recalculate after disclosure collapse, resize and late image layout. An explicit click must update active state even when scrollTop does not change.

**Acceptance:** first/middle/last heading, two short tail sections, an already-visible target, mobile TOC collapse, reduced motion, manual interruption, heading renaming, and late image loading. Active link and URL hash agree; TOC internal scrolling never moves the article accidentally.

### A2. Actionable media state

**Source lesson:** broken media should render a real fallback with actions, not an empty image or CSS pseudo-element.

**Implementation:** share a small media-state presentation between image node views and library cards. Represent `loading | ready | failed` separately from durable upload-job state. Check `complete && naturalWidth === 0` as well as error events. Offer Retry, Open media details and Replace; show a safe filename/alt fallback. Replacing an image changes only the selected node unless an explicit broader operation is chosen. Preserve display width, caption, alt and block ID.

Expose the existing deduplication result as a user-visible “Existing image reused” status without treating it as an error. An optional response field from `uploads.ts` is sufficient; do not make the client infer reuse from filenames.

**Acceptance:** cached failed image, offline retry, duplicate upload, reupload of trashed content, failure before listeners attach, and replacement that preserves saved dimensions in the reader. No bytes are deleted by a failed preview or automatic repair attempt.

### A3. Cross-feature surface invariants

Keep Base UI for focus/positioning; do not add a custom popup framework. Audit new feature selectors for collisions and use feature-specific names. Add targeted journeys for open–close–open during transitions, a long submenu at the viewport edge, and nested popover focus. A late close callback must not dismiss a newer instance.

**Acceptance:** Edit/Page alongside media controls; keyboard access; Escape closes the topmost surface; focus returns to its owner; rapid reopen works; reduced motion does not leave stale overlays.

## B. Search and provenance

### B1. Search state as an explicit value

Extend `SearchPalette.tsx` and existing API filters. Proposed shape:

```ts
type SearchSession = {
  version: 1;
  query: string;
  mode: 'phrase' | 'words';
  filters: SearchFilter[]; // validated tagged union, not free-form objects
  activeKey: string | null; // pageId + blockId, never array index alone
  scrollTop: number;
};
```

A reducer owns query/filter/drill/back transitions. Existing AbortController stays; add a generation check if multiple loaders or paginated appends are introduced. A query or scope change invalidates pagination from the previous generation. Keep the list region mounted during loading to avoid collapse. Only add virtualization after actual corpus measurements justify it.

**Flow:** type “climate” → add tag/folder/stage chip → choose a result → read/peek → Back restores the same result and scroll. Clicking a tag caption can add a scope chip. Escape closes the surface; removing a chip is explicit. Backspace removes a chip only when the focused input is empty and its selection permits it.

**Data/API:** reuse `cms/search.ts` and the existing search route. Add folder/stage filters to its validated contract and index only if needed. Mentions request lightweight records; global full-text results request excerpts. Do not fetch full bodies to populate a picker.

**Acceptance:** stale responses, query changes during load-more, deleted active result, repeated titles, accents, quote/phrase behavior, restoration after opening a page, and no command activation for slashes inside URLs. Filters must have identical meaning in the API and saved collection evaluator.

### B2. Provenance that survives moves

We already store page/block references and source fingerprints in research records. Extend rather than replace them:

```ts
type Origin = {
  pageId?: string;
  blockId?: string;
  sourceUrl?: string;
  capturedAt: string;
  sourceVersion?: string;
};
```

For reused assets, provenance is one-to-many: the same file may have several insertion sites. Do not overwrite its original capture source whenever it is inserted elsewhere. Distinguish origin from current usages, and distinguish snapshot text from a live reference.

Create a single `revealReference` navigation service on top of `AdminApp`/page peek. If the target page is open, scroll to the block in place. If a summary lacks detail, fetch it before deciding the reference is missing. Save the current page before a full navigation. Missing blocks fall back to the target page with an explanation; missing/trashed pages have an explicit unavailable state.

**Acceptance:** page rename/move, target deletion, block deletion, source already open, failed save, partial detail records, multiple uses of one asset, and returning to the source caret. Private origin information never appears in public HTML or Markdown automatically.

## C. Saved views over existing pages

### C1. Versioned view configuration

Extend the existing research collection model with views. Start with list/table and the existing board/calendar; add gallery only when cover/icon density is useful. Proposed private data:

```ts
type WorkspaceView = {
  version: 1;
  id: string;
  collectionId: string;
  name: string;
  layout: 'list' | 'table' | 'board' | 'calendar' | 'gallery';
  filters: FilterGroup;
  sorts: SortSpec[];
  columns: ColumnSpec[];
  groupBy?: 'editorial.stage' | 'tag';
  dateField?: 'editorial.reviewAt' | 'publishAt';
  manualOrder?: string[];
};
```

These are design contracts, not complete production type declarations. Define `FilterGroup`, `SortSpec` and `ColumnSpec` as closed validated unions. Bound nesting, clause count, list size and string lengths. Resolve field names through a registry, never arbitrary JavaScript paths. Define missing values and empty-sort placement explicitly.

Store views as private versioned R2 records with ETag compare-and-swap. Avoid writing every view and page into one growing global object. Existing collections get a default list view on read; no destructive migration is needed. Keep fallback readers until migration has been exercised.

**Existing seams:** `cms/research.ts`, `cms/server/research.ts`, `ResearchWorkspace.tsx`, `use-research-form.ts` and the protected research API. Reuse the current pending-work/session guard for settings writes.

**Acceptance:** a view switch never mutates content; two tabs editing settings produce a conflict; invalid/deep filters are rejected; deleted field definitions render a repairable filter; saved ordering and query sorting cannot compete silently.

### C2. Board and calendar mutations

The current board and calendar already exist. Improve their interaction rather than replacing them.

For a board drop, persist the stage using the latest expected draft version. Apply an optimistic card move with rollback/error recovery. In sorted boards, disable manual card order and explain why. Provide “Move to stage” for keyboard/mobile users. If batch changes are later added, return per-page results instead of pretending R2 supports a cross-document transaction.

Make **Review calendar** and **Publication calendar** distinct views. Dragging review dates may change private planning data. Changing a publication date opens or uses the explicit scheduling workflow; moving an idea into a date cell must not create a live publication.

Show the chosen timezone. Continue storing instants in UTC; avoid mixing the existing Manila calendar display and UTC review editor without an explicit conversion policy. For date-only planning fields, store date-only values rather than invented midnight instants.

**Acceptance:** cross-tab conflict, auth expiry during drop, unknown stage, empty column, no-date group, timezone midnight boundary, drag cancellation, and keyboard equivalent. A failed save cannot leave a card permanently displayed in the wrong stage.

## D. Page kinds, properties and templates

### D1. A deliberately small schema

Start with optional kinds such as Essay, Note, Source and Review. They are private workflow presets, not new public URL types. A page can remain untyped. Suggested first properties: source URL, review date, research status and related pages; most already have nearby representations and should reuse them.

If genuine custom properties are needed, add definitions with stable IDs and a small kind set: text, number, date, checkbox, select, multi-select, page reference. Labels can change without changing identity. Option removal needs an explicit remap/archive decision. No executable formulas, recursive computed properties, or schema-less arbitrary JSON in the first version.

Do not duplicate `editorial.stage`, tags or `reviewAt` as custom fields. Register existing fields in the same view/filter interface. Public export must use an allowlist; setting `public: true` on an arbitrary client-supplied property cannot alone authorize publication.

### D2. Template defaults and lineage

Extend current user templates to include permitted metadata defaults and an optional page kind. On creation, remap block IDs using the existing clipboard/document identity tools. Save `templateId` and `templateVersion` privately. Template edits do not retroactively rewrite pages.

**Flow:** New → choose template → show concise preview/defaults → create one draft → focus the title/body. Retrying a network request must return the same created page, not duplicate it. Templates are editable through the existing research library.

**Acceptance:** old templates still work; defaults validate; copied block IDs are fresh; no publication fields activate a schedule; source links retain their intended targets; deleted templates do not break derived pages.

## E. Portability and operation reports

### E1. External import preflight

First formats: Markdown and a constrained HTML subset. Obsidian/Notion ZIP and CSV follow only after mapping and resource limits are established. Anytype's menu entries call its middleware; they are not standalone importers we can reuse.

**Flow:** choose file(s) → choose existing/new folder without leaving the wizard → inspect titles, links, media and unsupported blocks → confirm → watch per-item outcomes → open results. No automatic publishing.

Use deterministic job/item IDs and store progress independently of the dialog. Bound upload size, decompressed size, entry count, recursion depth and execution time. Reject archive traversal paths. Do not fetch remote URLs during preview unless explicitly requested through a server-side fetch boundary. Map internal IDs and links after parsing, before commit. Retrying failed items must not recreate successful pages.

Reuse existing structured-paste sanitization and block-ID remapping where applicable, but do not silently classify an external file as trusted internal clipboard data.

### E2. Export and backup

Offer two clearly different outputs: portable article Markdown plus chosen assets, and a versioned private workspace backup containing structured documents/metadata. Public article export never includes private notes, review state, credentials or journal data.

Snapshot the selected versions first. Report `success | partial | failed | canceled`, successful counts, missing assets, unresolved references and per-item retryable errors. An archive that omits images is not “complete” just because it downloads. Preserve the report alongside the artifact when practical. Every referenced asset needs identity/checksum and a safe relative archive path.

**Acceptance:** round trip of custom marks, image dimensions, date/page mentions, icons and source references; unsupported-node fallback; cancellation after partial completion; missing file; stale revision; duplicate retry; and schema-version rejection without destroying current content.

### E3. One activity surface, several distinct operations

Reuse `MediaJobs`, save/recovery UI and publication receipts. Add an operation model only for long-running jobs:

```ts
type Operation = {
  id: string;
  kind: 'upload' | 'import' | 'export' | 'publish';
  state: 'queued' | 'running' | 'partial' | 'succeeded' | 'failed' | 'canceled';
  done: number;
  total?: number;
  issues: { itemId: string; code: string; retryable: boolean }[];
};
```

Use phase text when total work is unknown; do not fabricate percentages. Closing a panel must not stop a durable job. Auth failure transitions to “Sign in to continue” while preserving recoverable local work. Jobs must not store credentials in logs or exported diagnostics.

## F. Optional editorial advantages

### F1. Evidence desk and health

Combine existing references, excerpt fingerprints and reviews around the current article. Show evidence snapshots and source changes; let the author explicitly refresh an excerpt. “Source changed” means a stored version/fingerprint differs, not that the claim is false. No automatic rewrite.

Add saved views for overdue review, unresolved notes, missing references and pending media. A repair queue should deep-link to the exact item. External link-health checks are separate, opt-in network operations with SSRF protection and rate limits.

### F2. Technical content blocks

For math/Mermaid or PDF attachment cards, define a versioned node, safe parser, editor node view, public renderer, Markdown fallback, clipboard behavior and export story together. Load heavy renderers only where used. Keep private source text out of third-party render services. Unsupported or failed rendering retains editable source.

Use dependency documentation at implementation time through Context7. This audit does not select or pin current renderer APIs. Avoid permissive raw HTML execution or copying Anytype's renderer trust settings without re-evaluating our web/public boundary.

### F3. Small relation graph

Start from one article and its explicit links, with bounded depth and node count. Distinguish source, citation and related-page edges; do not invent semantic links from shared words. Offer a table/list equivalent and keyboard navigation. A global force simulation should not load during ordinary editing.

## Verification and rollout

| Risk | Required evidence |
| --- | --- |
| Interaction regressions | Desktop/mobile viewport journeys for menu reopening, focus return, TOC anchors and selection; physical touch/IME checks before claiming full mobile support |
| Data loss | Conflict/late-response tests, recovery after reload, idempotent retries and rollback of optimistic mutations |
| Private metadata leakage | Fixtures asserting public HTML/Markdown/feeds omit private view/property/review/provenance fields |
| Unsafe input | Bounded nested filters, malformed imports, archive paths, URLs, unsupported nodes and invalid property types |
| Performance | Measure real search/storage latency at the current corpus and larger fixtures; profile before choosing virtualization/indexing infrastructure |
| Publication integrity | Stage/view/date changes cannot invoke publication; explicit scheduling/publishing retains version checks and receipts |
| Portability | Import/export fixtures that retain custom editor semantics and report anything omitted |

Keep new schemas versioned and readers backward-compatible. Derived views/indexes can be rebuilt; user-created property values, origin records and import results cannot. Back up before any future migration that rewrites authoritative records. Roll back UI independently of persisted records where possible.

## Recommended first implementation batch

Start with **A1 TOC consistency**, **A2 media repair/reuse feedback**, and **B1 search restoration**. These improve frequent actions without expanding the product into a full database. Then add **B2 provenance** and **C saved views** on the foundations already in the app. Reassess custom properties and external import after those flows work well.
