# AFFiNE-inspired writing workflows

This implements the writing-focused recommendations in [the codebase review](affine-codebase-review.md). Tiptap remains the editor. Drafts remain private R2 objects; publishing still produces Markdown in GitHub for the public site. There is no BlockSuite runtime dependency and no copied AFFiNE implementation.

## Where to find the features

- Open **Workspace** from the admin page list for saved collections, an editorial board/calendar, templates and the capture inbox.
- Open **Research** in the editor for incoming/outgoing references, saved material, private review notes and published-source comparison.
- Click a page mention to peek at its contents. Modifier-click retains normal navigation.
- Select text before opening Research to save an excerpt or extract it into a child draft. Place the cursor in a block to copy its private block link.

## Recommendation coverage

| Review item | Implementation |
| --- | --- |
| 1. Interaction ownership and acceptance tests | Link targets and marquee bookmarks map through document transactions. Link editing retains a visual target while form fields own focus. Added browser scenarios for links, resize/reload/preview, page peek, conversion menus and marquee delete/undo. Browser execution remains pending. |
| 2. Backlinks and cross-page search | Private per-document indexes track outgoing references and block text. Incoming links include source snippets; search results can navigate to a saved block. Stale/missing indexes are repaired against source versions. |
| 3. Linked-page peek | Read-only page preview uses the existing preview renderer, with a route to open the editor and return to writing. |
| 4. Durable recovery and save states | IndexedDB journals are queued per page and separated by browser-tab runtime. Explicit recovery comparison/selection precedes editing. Local recovery and cloud-save status are distinct. Research forms participate in session protection. |
| 5. Saved collections | Persist query, tag, status, pinned, sorting and manual-inclusion rules over existing page metadata. Trashed pages stay excluded. |
| 6. Templates and capture inbox | Save page templates, create drafts from them, and collect text/source URLs. Create request IDs support retry without overwriting an already-created page. |
| 7. Versioned JSON and block identity | Private version-1 editor JSON is paired with its Markdown checkpoint. Tiptap UniqueID maintains block IDs; duplication remaps them. Legacy Markdown opens normally. |
| 8. Block workflows | Private block links, block-associated review notes with resolve/reopen, and ordered selection-to-child extraction. |
| 9. Reusable excerpts | Save selected content with its source, insert a copy, inspect the original and explicitly refresh the saved excerpt. Insertions are snapshots, not live transclusions. |
| 10. Editorial board/calendar | Views over current publication/status/date metadata; publishing remains an explicit action. |

Items 11–12 in the review—simultaneous multi-user CRDT editing, canvas/mind maps and full embedded databases—were conditional future directions, not requirements for this publication workflow. They are not implemented.

## Persistence and publication contracts

`cms/editor-document.ts` validates version, supported node/mark names, size/depth, unique block IDs and the Markdown checkpoint. The first structured save snapshots the existing draft. A Markdown-only update invalidates old JSON, so importing or editing Markdown cannot silently reload an obsolete structured body. Duplicating a draft generates fresh block identities.

`cms/format.ts` remains the public boundary: editor JSON, recovery information, private research and source fingerprints are not serialized into public front matter. Publishing retains the existing sanitizer/renderer and rejects page mentions whose targets are unavailable or unpublished. Referenced drafts must be published first, including before a bulk publish that references them.

Published-source fingerprints detect subsequent GitHub changes. Research exposes an explicit comparison with **keep draft** or **import published** reconciliation. Import clears obsolete JSON and saves a revision. A legacy page's first observed fingerprint establishes a baseline; it cannot reconstruct external changes that happened before tracking began. Conditional Git writes also guard the observed source and destination slug.

Editor saves use the observed R2 object ETag in addition to the timestamp. Research item updates use conditional writes too. This protects those writes from concurrent overwrite; it does not convert every older administrative operation into a transaction.

## Recovery and cross-page limits

Browser-local recovery is not a cloud backup. Clearing site data, storage eviction or unavailable browser storage can remove/prevent recovery. The UI distinguishes unavailable local persistence from a successful cloud save. Session protection aggregates editor and research-form work before reauthentication navigation.

Recovery deletion checks the snapshot token, so dismissing an old copy cannot delete a newer write from another tab. Restoring a copy is an explicit choice rather than silently overwriting a newer server draft.

Extraction saves the source, resolves and verifies the selected text, then creates the child before replacing the source with a mention. A retry reuses the creation request ID. If the source changes during creation, the child remains a copy and the source is retained. If the final source save fails, local recovery retains the replacement. This is an ordered, recoverable workflow—not an atomic transaction across two R2 objects.

Excerpts are inserted by value. Changes to the original cannot silently modify an article already using an excerpt. This deliberately avoids recursive embeds, live dependency cycles and implicit publication of private sources.

The reference index is disposable and private, under the existing admin authorization boundary. Its current scan is suited to this personal publishing system; it is not a large-workspace search service.

## Reference code studied

References remain pinned to AFFiNE `164a84ffe00e8e3df289396b6a25d9b85e0343d1` from the original review:

- [Backlink entity](https://github.com/toeverything/AFFiNE/blob/164a84ffe00e8e3df289396b6a25d9b85e0343d1/packages/frontend/core/src/modules/doc-link/entities/doc-backlinks.ts): source/target reference relationships.
- [Peek view](https://github.com/toeverything/AFFiNE/blob/164a84ffe00e8e3df289396b6a25d9b85e0343d1/packages/frontend/core/src/modules/peek-view/entities/peek-view.ts): inspecting another document while retaining writing context.
- [Collection entity](https://github.com/toeverything/AFFiNE/blob/164a84ffe00e8e3df289396b6a25d9b85e0343d1/packages/frontend/core/src/modules/collection/entities/collection.ts): rule-based membership plus explicit inclusion.
- [Document storage state](https://github.com/toeverything/AFFiNE/blob/164a84ffe00e8e3df289396b6a25d9b85e0343d1/packages/common/nbstore/src/frontend/doc.ts): separating local persistence from synchronization.
- [Cross-document identity handling](https://github.com/toeverything/AFFiNE/blob/164a84ffe00e8e3df289396b6a25d9b85e0343d1/blocksuite/affine/widgets/drag-handle/src/middleware/new-id-cross-doc.ts): new identities when content changes ownership.
- [Link popup lifecycle](https://github.com/toeverything/AFFiNE/blob/164a84ffe00e8e3df289396b6a25d9b85e0343d1/blocksuite/affine/inlines/link/src/link-node/link-popup/link-popup.ts): explicit target/focus ownership.

The corresponding implementation uses React, ProseMirror transactions and Tiptap's native UniqueID extension. Current Tiptap and Cloudflare R2 documentation was consulted through Context7. The full review contains additional source links and licensing boundaries.

## Verification

Automated coverage includes structured-checkpoint validation, identity remapping, private/public separation, reference indexing, collection rules, conditional storage conflicts, idempotent creates, link-range mapping, IndexedDB ordering and recovery token races, and session protection aggregation.

Verification on September 28, 2026: all 57 automated tests passed; the production build, lint check, frontend typecheck and separate Cloudflare route typecheck passed. The final frontend check includes the last extraction safeguard. The build reports existing warnings in `WebMcpTools.tsx` and `analytics.ts`.

Commands:

```sh
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:browser
```

The Cloudflare routes also receive a separate strict TypeScript check because the frontend tsconfig excludes them. The Playwright suite uses mocked admin APIs and has ten discovered desktop/mobile cases; hover-only cases skip mobile. It has not been executed, so visual polish, focus behavior and touch interactions are not yet browser-verified. No deployment or live-data migration is performed by this implementation.
