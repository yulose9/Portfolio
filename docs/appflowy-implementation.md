# AppFlowy-inspired writing workflows

September 28, 2026. Implementation companion to the [source review](appflowy-codebase-review.md) and [original plan](appflowy-implementation-plan.md).

The editor remains Tiptap and publishing remains an explicit R2 draft → GitHub Markdown action. These are independent TypeScript adaptations of the interaction, recovery, navigation and editorial patterns identified in the pinned AppFlowy audit; no AppFlowy implementation was copied.

## Delivered behavior

| Area | Implementation and access |
| --- | --- |
| Editor reliability | Link, appearance and block-menu interactions share an owner. Text targets map through transactions; block actions resolve stable IDs. Saved image dimensions apply when a node view opens. Legacy page mentions resolve. Alt-drag marquee selection captures its pointer gesture. |
| Clipboard | Versioned internal slices retain custom content while remapping copied block IDs, validating bounds and rejecting unsafe URLs. HTML/plain text remain portable fallbacks. Internal pastes larger than 12 top-level blocks open an import review; accepting inserts one undoable transaction. |
| Body media recovery | File selections persist source bytes and stable placeholder identity in IndexedDB before insertion. The Media uploads panel exposes progress, pause, retry, completed attachment and explicit insertion when the original target disappeared. Prepared encoded parts reuse their exact bytes on retries. |
| Media library | Open Media from the writing list or the editor View menu. Browse paginated uploads and direct document usage; insert an existing asset into the editor. There is deliberately no remote deletion action. |
| Navigation | Browse page hierarchy and recently opened pages from the writing list. Editor breadcrumbs expose a keyboard-accessible Move to selector. Returning to a page restores remembered block/scroll context. Graph updates reject missing parents, cycles and conflicting moves. |
| Search | Phrase/all-word modes and status, tag and subtree filters. Unicode normalization, deterministic ranking and snippets preserve original text offsets. Version-2 derived indexes validate the source timestamp; current-head listing skips revision subdirectories. |
| Editorial | Details includes Idea/Drafting/Review/Ready and a review date/time expressed in UTC. The Research board groups editorial stages independently of publication state. These fields remain private. |
| Research provenance | Captures carry fingerprints and checked timestamps. Mark a source checked or inspect the change preview before updating its stored excerpt. Previously inserted copies are not silently rewritten. |
| Publishing | Review flags unresolved references/notes, missing image descriptions and unfinished media. Pending media blocks publishing at the server boundary. Receipts identify the exact source version, output fingerprint and Git commit. A newer concurrently saved draft is preserved when publication settles. |

## Persistence and compatibility

- Structured editor documents remain version 1; no content migration is required. Existing Markdown documents keep their fallback path.
- `writing-media-jobs` IndexedDB version 3 stores version-1 jobs and prepared upload parts. Body upload input is limited to 128 MB and browser quota still applies. Source bytes are retained through conversion/upload failures; completed jobs are cleared after attachment and a successful page save. Discarding a local job does not delete remote assets or remove document placeholders.
- Upload objects are immutable conditional writes with a SHA-256 digest. Identical retries return the existing URL; different bytes at the same name are rejected. Job filenames and upload year remain stable across retries.
- Private `meta/page-hierarchy.json` is the authoritative parent overlay. One conditional object write serializes graph changes, preventing opposite concurrent moves from forming a cycle across separate drafts. Existing parent metadata supplies the fallback for untouched pages.
- Search index version 2 is derived and rebuildable. Revision prefixes are excluded from current-document scans; bounded reads still depend on the number of documents. There is no new global search catalog.
- Editorial metadata and research provenance stay in private storage. Publication receipts are retained under `receipts/<document>/<commit>.json` before draft finalization. Git and R2 are not one transaction: if finalization conflicts after Git succeeds, the error and retained receipt require reconciliation with that commit before republishing.

## Scope and verification limits

Core phases have working implementations, but this is not a claim that every aspirational acceptance scenario in the original plan has passed.

- Durable jobs cover body file insertion. Cover images, inline logos and recorded audio retain their existing guarded upload paths. Uploads pause when the page closes; this is not a background service or multipart byte resume. Web Locks coordinate the same job across tabs where supported; each mounted jobs panel runs one upload at a time.
- Import review currently covers large internal structured pastes. Existing sanitization handles external HTML/Markdown; there is no general external import wizard.
- Navigation provides a keyboard Move to action, not tree drag-and-drop. Existing page peek remains available. Legacy malformed graphs can still be found through the list/search.
- The browser suite uses mocked admin APIs and emulated mobile Chromium. It does not prove physical mobile keyboard behavior, real Access expiry, R2 deployment configuration or an actual GitHub publication. No production articles were changed during verification.
- The provisional 500 ms staging search target is not established. Local synthetic algorithm timings exclude R2/network/debounce and are not a staging p95 or typing responsiveness measurement.
- Optional galleries, AI assistance, independent editor tabs, realtime collaboration, arbitrary columns and relational databases remain outside this delivery.

## Rollback

Retain draft revisions, media job records, prepared bytes, hierarchy overlay and publication receipts. Reverting UI code alone must not delete these records. Before reverting server hierarchy support, export/materialize overlay parents into the older representation or retain the overlay reader; otherwise moved locations would appear to revert. Derived search indexes can be rebuilt. Existing public media URLs and Markdown remain compatible.

## Validation

Release checks completed September 29, 2026:

- Unit and storage suite: 66 passed, zero failures.
- Desktop/mobile browser suite: 13 passed; three mouse-only scenarios intentionally skipped on mobile. The final editorial layout check also passed in both projects.
- API typecheck and application lint passed.
- Production build passed, including its TypeScript validation and static export. Non-blocking lint warnings remain for media thumbnails, full-page navigation and pre-existing analytics directives.
- `git diff --check` passed. Desktop and mobile editorial screenshots were inspected; the review-date styling and narrow-screen URL field were corrected.

Relevant coverage includes editor/public image parity, link and submenu focus, marquee selection, page mentions, editorial persistence, internal paste undo, completed-upload recovery, unsafe clipboard input, immutable upload retries, competing graph moves and publishing during a newer draft save. One earlier standalone typecheck overlapped Next's regeneration of `.next/types` and reported missing generated files; the production build subsequently validated the regenerated types successfully.

An uncached local stress run used 100, 1,000 and 5,000 synthetic documents with 10,780 characters per body (one cold query plus five repeat queries). Cold/worst-repeat times were respectively 114/73 ms, 789/3,653 ms and 18,322/23,279 ms on a loaded Windows development machine. These inputs deliberately omitted the stored normalized index fields, so they include normalization work; they also exclude storage latency. This does not satisfy the staging target. Before increasing the corpus substantially, benchmark the actual cached-index route in staging and evaluate an indexed catalog/search service if its measured latency warrants it.
