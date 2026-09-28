# AppFlowy codebase review for the writing admin

Reviewed September 28, 2026. Companion: [implementation plan](appflowy-implementation-plan.md).

Follow-up: [delivered implementation and verification limits](appflowy-implementation.md). The audit below describes the baseline before those changes.

## Recommendation

Keep Tiptap, our React/Next.js admin, Base UI components, private R2 drafts, and explicit Markdown publication through GitHub. AppFlowy's strongest transferable ideas are durable media jobs, explicit transaction and selection ownership, contextual page navigation, indexed search, platform-specific interactions, and behavioral test coverage. These improve the writing workflow without importing a second editor or a native application stack.

We already implemented much of the linked-document and recovery foundation identified in the [AFFiNE review](affine-codebase-review.md). The next step is to make those capabilities dependable and connected, then add the missing navigation, media, and editorial tools. More block types alone will not resolve disappearing menus, lost selections, or publication mismatches.

This is a source audit and implementation proposal, not an implementation, penetration test, or certification that AppFlowy or our admin is bug-free.

## Evidence and coverage

The main repository was mapped at **4,597 tracked paths**. Selected flows were traced into its pinned editor and cloud dependencies. A repository-wide file inventory is not equivalent to reading every line. Flutter/Rust applications and their tests were not built or executed; our browser behavior was not reverified in this audit.

| Source | Exact revision examined | Scope |
| --- | --- | --- |
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy/tree/5cf3a365dec0d59f64bad1ee4bb1050471a39b93) | `5cf3a365dec0d59f64bad1ee4bb1050471a39b93` | Repository structure; selected Flutter UI, document, navigation, search, storage, database, mobile and test code |
| [appflowy-editor](https://github.com/AppFlowy-IO/appflowy-editor/tree/470c4e77c71b63f693ce0923a927afcd667d6f3b) | `470c4e77c71b63f693ce0923a927afcd667d6f3b` | Editor dependency pinned by the app; transaction and undo implementation |
| [AppFlowy-Cloud](https://github.com/AppFlowy-IO/AppFlowy-Cloud/tree/592f644a24beb159d45f25a4cabc34621ef7382c) | `592f644a24beb159d45f25a4cabc34621ef7382c` | Cloud dependency pinned by the app; selected search/authentication/access-filtering paths |
| Portfolio | `1c855083ca0e3acc8d67451a05b4b0821bbfb42d` | Existing editor, research, search, recovery, history, media and publication boundaries |

The AppFlowy commit is dated June 26, 2026; its Flutter manifest identifies version 0.11.4. These are source snapshot facts, not a claim about the latest released or deployed version. The separate collaboration model, plugins, board package, and full cloud realtime service were not independently audited. Features whose directories were inventoried but whose behavior was not traced are identified below as inventory-level findings.

## Architecture: what can and cannot transfer

AppFlowy is a Flutter client backed by a substantial Rust client core. Its [Flutter manifest](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/pubspec.yaml) connects the editor and UI packages. The [Rust workspace](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/rust-lib/Cargo.toml) separates document, folder, database, search and storage domains, with SQLite, Tantivy and collaboration dependencies. The cloud server is another repository. A client-side permission check or sync indicator is not proof of a server authorization guarantee.

The useful separation is:

```text
User gesture → editor transaction → document model → persistence/synchronization
                     ↓                     ↓
               selection/history     derived indexes and views
```

Our equivalent should remain ProseMirror transactions → versioned private editor JSON plus Markdown checkpoint → conditional R2 persistence → explicit validated public Markdown. Search, backlinks, collections and media usage are derived views, not competing sources of document truth.

### 1. Transactions, selection and interaction ownership

AppFlowy's [transaction adapter](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/application/editor_transaction_adapter.dart) translates editor changes into backend block actions and external text updates. The editor's [Transaction](https://github.com/AppFlowy-IO/appflowy-editor/blob/470c4e77c71b63f693ce0923a927afcd667d6f3b/lib/src/core/transform/transaction.dart) carries operations and before/after selections. Its [undo manager](https://github.com/AppFlowy-IO/appflowy-editor/blob/470c4e77c71b63f693ce0923a927afcd667d6f3b/lib/src/history/undo_manager.dart) inverts operation order and restores selection.

The lesson is to make each user action an intentional change with a recoverable target. Keep Tiptap's history; do not port another operation engine. A menu must retain the block or mapped range it opened for, even while its form owns DOM focus. Conversion, duplicate, drag and delete need explicit rules for identity, selected descendants, unsupported nodes and undo grouping.

The [block action dispatcher](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/actions/block_action_option_cubit.dart) handles selected-block duplication/deletion and related actions. Not every enum action is implemented in that dispatcher; it is not evidence that all actions share one complete engine.

Our stable block IDs, mapped link ranges, marquee selection and command registry are already present. The gap is a common, tested interaction contract across all surfaces, not adding IDs again. This is especially relevant to the user's disappearing link editor and “Turn into” submenu reports.

### 2. Resize feedback and document persistence

The [column resizer](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/columns/simple_column_block_width_resizer.dart) applies in-memory updates during drag and a persistent transaction at completion. It constrains adjacent column ratios and suppresses the drag menu while resizing.

Borrow temporary interaction state, bounded geometry and one completed user action. Do not copy its global drag-menu flag: an editor-scoped owner with cleanup on cancel/unmount is safer for our application. For our images, preserve the saved width through JSON, Markdown, preview, public rendering and reload. An attractive resize handle is insufficient if the published renderer loses the value. Current source already supports image dimensions; runtime parity remains an acceptance requirement, not a new feature claim.

### 3. Clipboard and schema evolution

AppFlowy's [paste command](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/copy_and_paste/custom_paste_command.dart) dispatches among internal JSON, image bytes, HTML and text, with special handling for links. Its executable order prefers image bytes before HTML after internal-format handling. [Internal JSON paste](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/copy_and_paste/paste_from_in_app_json.dart) distinguishes insertion contexts, including table restrictions.

Our [paste helpers](../app/admin/ui/paste.ts) already clean rich HTML, detect Markdown and preserve supported custom marks. The useful extension is a validated, versioned internal clipboard representation with fresh IDs when copying into another location/document, plus explicit degradation for unsupported content. Prefer a preview for complex imports rather than interrupting every ordinary paste. Treat clipboard JSON, URLs and HTML as untrusted inputs.

AppFlowy's [migration module](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/migration/editor_migration.dart) contains explicit conversions of old block structures and attributes. Our private JSON currently has version 1. Add fixture-backed migrations before introducing version 2, preserving the original payload on failure. Do not copy raw-JSON fallback presentation or content-bearing error logs.

### 4. Media uploads that survive interruption

This is one of the largest useful gaps. The Rust [uploader](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/rust-lib/flowy-storage/src/uploader.rs) owns a queued worker, bounded concurrency, retry decisions and pause/resume signals. [SQLite upload persistence](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/rust-lib/flowy-storage/src/sqlite_sql.rs) records file jobs and multipart progress independently of an editor widget.

Our [media pipeline](../app/admin/ui/media.ts) already performs conversions, progress reporting and upload coordination. It is not a durable resumable upload queue. A browser adaptation needs IndexedDB jobs and blobs, stable document/block ownership, auth-paused and storage-unavailable states, retry/cancel controls, and idempotent server completion. Native local file paths and SQLite cannot be copied directly into a browser design.

Start with retrying complete bounded uploads. Byte-level resume requires an actual multipart server protocol and is a later capability. Reopening a page must never attach a completed upload to whichever block happens to occupy an old numeric position.

### 5. Search architecture and privacy

AppFlowy's [search manager](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/rust-lib/flowy-search/src/services/manager.rs) coordinates search handlers and rejects stale request IDs. Its [local document handler](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/rust-lib/flowy-search/src/document/local_search_handler.rs) uses Tantivy. The cloud [search route](https://github.com/AppFlowy-IO/AppFlowy-Cloud/blob/592f644a24beb159d45f25a4cabc34621ef7382c/src/api/search.rs) checks workspace read access; [search operations](https://github.com/AppFlowy-IO/AppFlowy-Cloud/blob/592f644a24beb159d45f25a4cabc34621ef7382c/src/biz/search/ops.rs) derive searchable view IDs and exclude private/trash views before querying the cloud index. Local lexical and cloud semantic search are different paths.

Our [search palette](../app/admin/ui/SearchPalette.tsx) already debounces, aborts prior requests and rejects aborted results. Our [endpoint](../functions/api/admin/search.ts) already searches phrases across titles, summaries and bodies, ranks title matches first, and returns block-level jumps. Do not rebuild these as missing features.

Improve filters, exact-phrase versus loose-word behavior, Unicode normalization, useful snippets and result navigation. Our [index loader](../cms/server/research.ts) lists the `drafts/` prefix and filters current documents after listing, so revision objects still increase listing work. Cached indexes compare timestamps but have no explicit index-schema version. Introduce versioned indexes and measure corpus/listing costs before adding a separate search service. Preserve the private admin boundary and avoid logging full queries or article bodies.

### 6. Navigation that retains writing context

The [tabs state manager](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/workspace/application/tabs/tabs_bloc.dart) manages active views, pinned tabs, closing rules, latest-opened state and ancestor expansion. Its move-tab branch is empty in the inspected handler; this review does not infer a complete tab-reordering implementation from that file.

We have pinned posts, parent IDs, page mentions, backlinks and read-only peek. We do not yet have an integrated navigable page tree with breadcrumbs and reliable return position. Add that first. One live editor plus peek and recent pages is a useful, lower-risk step before multiple simultaneously mounted editors, which multiply recovery, memory and session-expiry concerns.

### 7. UI design and mobile behavior

The [theme model](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/packages/appflowy_ui/lib/src/theme/definition/theme_data.dart) separates semantic colors, typography, spacing, radii and shadows. This is a useful system principle, not a reason to imitate AppFlowy's appearance or install Flutter components. Extend our existing shared admin controls and Base UI primitives.

The [mobile block action sheet](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/mobile/presentation/bottom_sheet/bottom_sheet_block_action_widget.dart) provides explicit insert, duplicate and delete actions without hover. Our mobile controls should similarly have visible entry points, scrollable sheets, retained selections and predictable keyboard behavior. Desktop menus need stable nested placement and keyboard navigation. Neither surface should depend on a hover-only drag handle.

AppFlowy's [outline block](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/outline/outline_block_component.dart) distinguishes no headings, no matching headings and usable content. We already have an editor outline and public TOC: improve contextual empty states, active heading tracking and reduced-motion scrolling rather than adding a duplicate outline.

### 8. Rich blocks, databases, reminders and AI

The [multi-image menu](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/document/presentation/editor_plugins/image/multi_image_block_component/multi_image_menu.dart) exposes gallery-oriented controls and intercepts selection gestures while its menu is active. A bounded gallery is a plausible publishing feature after image sizing and upload recovery pass their tests. Arbitrary columns should wait until mobile reading order and Markdown export are specified.

Database grid/board/calendar and row-document areas were inventoried. The inspected [field enum](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/rust-lib/flowy-database2/src/entities/field_entities.rs) includes text, number, date, selects, checkbox, URL, checklist, timestamps, relation, summary, translation, time and media. It does not establish formula/rollup parity with Notion. Our existing editorial board and calendar should gain writing-specific review stages, not a generic database engine.

The [reminder reference handler](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/plugins/inline_actions/handlers/reminder_reference.dart) connects parsed dates to reminders. Our dynamic date mentions already display relative dates; that is distinct from scheduling a review reminder. A review-due field is useful without altering publication schedules or automatically sending notifications.

The [AI source picker](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/ai/widgets/prompt_input/select_sources_menu.dart) makes selected document sources explicit and filters unsupported view types. If AI is later added, borrow source selection, an inspectable context list and accept/reject changes. This UI inspection does not establish end-to-end provider privacy. AI, realtime collaboration and generic databases remain optional product decisions, not prerequisites for an excellent publishing admin.

## Comparison with our current implementation

“Present” means source exists; it does not mean every interaction has passed browser testing.

| Capability | Our baseline | Recommended delta |
| --- | --- | --- |
| Stable blocks and private structured document | Present | Versioned migrations and cross-operation identity fixtures |
| Selection, batch delete/drag, conversion menus | Present | Unified target ownership and desktop/touch regression tests |
| Link text/URL editing and text appearance | Present | Focus/selection contracts; verify reported dismissals |
| Image resize and publication metadata | Present | End-to-end dimension parity and recoverable media jobs |
| Backlinks, page mentions, child extraction, peek | Present | Tree, breadcrumbs, return position, broken-reference states |
| Search across pages and block jumps | Present | Filters, normalization, ranking fixtures, index version/freshness |
| Revision timeline and diff/restore | Present | Restore-conflict and recoverability tests; no second history system |
| Local journals and conditional cloud saves | Present | Exercise offline/auth/race states; do not label complete offline sync |
| Saved collections, board, calendar, captures, excerpts | Present | Separate editorial stages; provenance and publishing checks |
| Shared selects and Research UI | Present | Consistent focus, touch, empty/error and overflow behavior |
| Durable upload jobs | Gap | Persist queue independently of editor lifecycle |
| Page tree and contextual navigation | Gap | Build on existing parent IDs and peek |
| Generic relational databases and canvas | Not part of current product | Defer |
| Simultaneous collaborative editing | Not active in inspected editor | Defer; installed dependencies are not implementation evidence |

See [AFFiNE implementation notes](affine-implementation.md) for the established persistence and publication contracts. Its recorded 57 passing automated tests and build/type checks are historical verification, not tests rerun by this audit. Its browser suite was authored but not executed.

## Boundaries and reuse

The main AppFlowy and pinned cloud sources carry [AGPL-3.0](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/LICENSE) / [AGPL-3.0](https://github.com/AppFlowy-IO/AppFlowy-Cloud/blob/592f644a24beb159d45f25a4cabc34621ef7382c/LICENSE) licenses. The inspected editor [license](https://github.com/AppFlowy-IO/appflowy-editor/blob/470c4e77c71b63f693ce0923a927afcd667d6f3b/LICENSE) offers AGPLv3/MPL2 licensing. This plan proposes independent TypeScript implementations of patterns, with source references; it does not copy their code or provide a legal conclusion about reuse. Reassess obligations before copying implementation code.

Preserve server-side admin authorization, conditional writes and explicit publication. Treat imported content, source URLs, media and derived indexes as untrusted or private as appropriate. AppFlowy's security paths are useful examples, not a security guarantee for either application. Do not add a server URL-fetching feature without explicit redirect, address, size and timeout restrictions.

The best opportunity is a writing system that preserves work, makes research easy to revisit, and publishes exactly what the author approved. The companion plan turns that into testable phases.
