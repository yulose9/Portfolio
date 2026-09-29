# Zotion and lilNotion: source review and implementation plan

Reviewed September 29, 2026 against Portfolio `95a2033`. This is a source-level comparison, not a claim to have executed either upstream application or audited every line.

## Evidence and architecture

- Zotion: [adityaphasu/notion-clone](https://github.com/adityaphasu/notion-clone/tree/91a5bb8cbfed9b085e6ad012d2d7057ff4c86dc7), 106 tracked files. Next.js/React, BlockNote, Clerk, Convex, EdgeStore, Radix and dnd-kit. MIT license. Read its schema, document mutations/queries, editor, navigation, item actions, ordering, publishing, TOC and focus settings.
- lilNotion: [brandonfang/lilnotion](https://github.com/brandonfang/lilnotion/tree/d0ef4e43a13690f6dcf1f29fba593d9c322c0209), 381 tracked files, including a large image collection. React/Redux, Rails/PostgreSQL, Active Storage/S3 and react-beautiful-dnd. No root license file was present in this checkout. Read its page/block models and controllers, session boundary, reducers, sidebar, page editor, block menus and representative blocks. Adapt interaction ideas independently; do not copy source or bundled imagery.

Zotion stores a whole serialized editor document with parent, sibling order, favorites and display settings. Its indexed sidebar query filters by owner and parent, then sorts the siblings. The client recursively mounts lists and uses an eight-pixel drag activation distance plus keyboard sorting. Navigation is a resizable sidebar on desktop and drawer on mobile. A row combines expansion, opening, child creation and actions. Focus mode hides navigation; favorites and recently opened pages provide short paths back to work.

lilNotion normalizes pages and blocks into Redux maps. A page holds an ordered array of block IDs; dragging changes that array while block identities stay stable. The block switch chooses a dedicated component for each type. Its chooser includes a name, description, thumbnail and hover example. The page title also updates the browser tab, which is useful when several documents are open.

## Comparison and decisions

| Upstream pattern | Existing system | Decision |
| --- | --- | --- |
| Recursive pages, favorites and recent pages | Private parent graph, pins and recent IDs; tree only on writing list | Add the same navigator inside the editor, with current-page state, pinned/recent sections, remembered expansion and filter results that retain ancestor context. |
| Sibling drag ordering | Tags and blocks reorder; page siblings have no saved order | Add private sibling order to the existing hierarchy object, atomic conditional updates, drag handles and explicit Move up/down actions for keyboard/touch. |
| Create a page from a parent row | Creation API already validates parent and supports idempotency | Expose child creation in navigator row actions. Flush editor work before navigating; retain the request ID when retrying an uncertain create. |
| Page-local row actions | Duplicate, pin and trash already exist in list/menu | Reuse pinning and child creation in the navigator; keep destructive and duplicate workflows in their existing surfaces. |
| Block examples in chooser | Shared block registry, descriptive hints, keyboard slash menu | Add original semantic examples that follow highlighted keyboard/pointer selection, with a compact mobile description and bounded viewport placement. |
| Document-aware browser tab | Admin title is generic | Reflect the current title and icon as plain text, restore prior title on unmount. Do not load third-party emoji favicons. |
| Focus, typography, covers, TOC | Already present, including richer fonts and reader parity | Retain current implementation. Do not add duplicate switches or adopt global settings that override published typography. |
| Rich blocks, media and drag/undo | Tiptap already supports these, with durable jobs and stable IDs | Keep Tiptap and transaction history. No BlockNote/custom-contenteditable migration. |
| Public sharing | Explicit Git publication with receipts | Retain our snapshot/publication boundary. A boolean public flag on a mutable draft is not suitable for this publisher. |
| Search, trash, duplicates | Existing body search, recovery, revisions and private copy behavior exceed the smaller clones | Keep these; improve access rather than replace working backend contracts. |

## Source findings that should not be copied

Zotion's [editor media tracking](https://github.com/adityaphasu/notion-clone/blob/91a5bb8cbfed9b085e6ad012d2d7057ff4c86dc7/components/editor.tsx) deletes removed URLs immediately. A removal can later be undone and an asset can be shared; our remote assets must survive those cases. Its [document mutations](https://github.com/adityaphasu/notion-clone/blob/91a5bb8cbfed9b085e6ad012d2d7057ff4c86dc7/convex/documents.ts) contain useful owner checks but create does not validate ownership of a supplied parent, reorder does not reject an absent source before splicing, and recursive archive/restore calls are started without awaiting the outer call. These are source observations, not tested exploit claims. Our ordering must validate complete sibling membership and handle write conflicts explicitly.

lilNotion's inspected [page controller](https://github.com/brandonfang/lilnotion/blob/d0ef4e43a13690f6dcf1f29fba593d9c322c0209/app/controllers/api/pages_controller.rb) and [block controller](https://github.com/brandonfang/lilnotion/blob/d0ef4e43a13690f6dcf1f29fba593d9c322c0209/app/controllers/api/blocks_controller.rb) look up records directly by ID and accept client-supplied owner IDs. The [application controller](https://github.com/brandonfang/lilnotion/blob/d0ef4e43a13690f6dcf1f29fba593d9c322c0209/app/controllers/application_controller.rb) supplies session helpers but does not establish an ownership gate for those actions. Retain our Access authentication and request guards. Do not reproduce its mutable Redux entity updates or independent page/block writes for one editor action.

Some lilNotion UI is unfinished: Link renders no body, Toggle contains placeholder comments, nested pages and rich text remain listed as to-do, and favicon code returns immediately. A menu label is not evidence of a working feature. Our additions are based on traced behavior and clearly identified design ideas.

## Implementation sequence and contracts

1. Extend the version-1 private hierarchy with optional `orders`, keyed by parent ID (`root` for top-level), containing sibling IDs. Legacy graphs default to empty orders. Unlisted/new siblings follow a stable creation-time/ID fallback. Reparenting preserves the order map; ordering never changes content timestamps or publication status.
2. A private reorder route takes parent, previous sibling IDs and requested IDs. Reject duplicates, missing/trashed pages, cross-parent IDs and stale membership/order. Write the whole hierarchy once using the fetched ETag so reorder and reparent cannot overwrite each other.
3. Share one PageTree between the list and an editor Sheet. Keep expansion in browser preferences, not article metadata. Filter retains matching pages' ancestors; cyclic/orphan legacy entries remain discoverable. Offer collapse/expand, pin shortcuts, current-page indication and row actions. Drag only from handles; explicit move controls are the touch/keyboard equivalent.
4. Add original block examples to slash suggestions without moving editor focus into the popup. Keep descriptions available on small screens; clamp and reposition the popup when the viewport/keyboard changes.
5. Update browser tab context without modifying published metadata. Test navigation/save refusal, ordering conflicts, reload persistence, paste/menu regressions and mobile layout.

## References for the adaptations

- [Zotion navigation](https://github.com/adityaphasu/notion-clone/blob/91a5bb8cbfed9b085e6ad012d2d7057ff4c86dc7/app/(main)/_components/Navigation.tsx)
- [Zotion sortable document list](https://github.com/adityaphasu/notion-clone/blob/91a5bb8cbfed9b085e6ad012d2d7057ff4c86dc7/app/(main)/_components/DocumentList.tsx)
- [Zotion row actions](https://github.com/adityaphasu/notion-clone/blob/91a5bb8cbfed9b085e6ad012d2d7057ff4c86dc7/app/(main)/_components/Item.tsx)
- [lilNotion block choices](https://github.com/brandonfang/lilnotion/blob/d0ef4e43a13690f6dcf1f29fba593d9c322c0209/frontend/components/menus/BlockSelectMenu.jsx)
- [lilNotion page composition and ordering](https://github.com/brandonfang/lilnotion/blob/d0ef4e43a13690f6dcf1f29fba593d9c322c0209/frontend/components/page/Page.jsx)

## Implemented access paths and persistence

- In the editor, open **View → Browse pages**, use the command palette's **Browse pages**, or press **Ctrl/Cmd + \\**. The writing list uses the same navigator. Pinned and recently opened shortcuts, current-page state, ancestor-preserving title filtering and remembered expansion are included.
- Drag a row's handle between siblings. Keyboard users can focus its handle and press **Alt + Up/Down**; row menus offer **Move up/down** on desktop and touch. Ordering is acknowledged by the server before the displayed order changes. Conflicts offer an explicit refresh path.
- Row menus offer **New subpage** and pin/unpin. Navigation and child creation flush current editor work first and refuse to leave after a failed save. Child creation retries retain one request identity while that navigator remains mounted. Pinning the current document adopts the returned server version before a subsequent edit.
- Slash suggestions show original block examples, descriptions and Markdown shortcuts. Keyboard selection updates the example without taking focus from the editor. Mobile retains the selected description in a compact layout. The document title and icon update the browser tab.

The private `meta/page-hierarchy.json` remains version 1 with an optional `orders` field. Existing documents need no migration, and published content is unaffected. Reparent and reorder share conditional writes to this object; this does not make separate create/delete operations globally transactional. Unknown/deleted order entries are ignored and new siblings use deterministic fallback order. Keep the new parent writer when retaining ordering: rolling back to a writer that reconstructs only `parents` can discard the optional order map.

## Verification

- Unit/storage suite: **72 passed**, including deterministic sibling ordering, legacy cycles, ancestor filtering, malformed/stale reorder requests, preserved order after reparenting, and competing hierarchy writes.
- Browser suite: **24 passed, 4 skipped**. The skips are desktop mouse/drag interactions in the mobile project. Covered remembered expansion, filtering, persisted ordering, native handle dragging, keyboard moves, pin-then-edit save versions, failed-save navigation refusal, child-create retry identity, slash preview selection/focus and viewport bounds. Existing link, image, block menu, selection, paste, editorial and upload-recovery regressions also passed.
- ESLint, API TypeScript checks and the production build (including frontend type validation and static export) passed. Existing warnings remain in MediaLibrary, PageLocation, WebMcpTools and analytics; no build errors.
- Desktop/mobile navigator and slash-preview screenshots were inspected. No new dependencies or upstream assets were added.

Browser fixtures use mocked admin APIs, and storage concurrency tests use a fake bucket; real Cloudflare sessions and production R2 concurrency are outside this local validation. Mobile checks use Chromium device emulation, not a physical iPhone keyboard. Upstream applications were not executed, and upstream servers, accounts and data were not touched.
