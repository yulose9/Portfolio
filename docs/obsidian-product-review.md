# Obsidian: feature research and writing-workspace plan

Reviewed October 1, 2026.

## What was actually reviewed

The requested [obsidian-releases repository](https://github.com/obsidianmd/obsidian-releases) is a release and community-directory repository. It explicitly does not contain Obsidian's application source. This review covers documented product behavior, release history, public schemas and our implementation seams; it does not claim to reverse-engineer Obsidian's private application or backend.

- Screened all 25 official changelog archive pages, spanning March 30, 2020 through September 29, 2026. See [coverage ledger](obsidian-changelog-coverage.md).
- Read selected major releases, minor interaction fixes, official core-plugin documentation, Bases documentation, Web Clipper workflows, and the roadmap.
- Read the English help repository at commit 9cf8c2913e56830e75c13f33ba198d7e70b6d9ef. [Help source](https://github.com/obsidianmd/obsidian-help/tree/9cf8c2913e56830e75c13f33ba198d7e70b6d9ef/en).
- Compared those patterns with our editor, research, search, private indexes, publishing checks, page hierarchy, media, recovery and shortcut code.
- No Obsidian binary or community plugin was installed. No authenticated Obsidian workspace was tested.

The release manifest reported public desktop 1.13.7 and beta 1.14.3. Do not conflate beta changes with stable availability. The roadmap still listed Kanban as active while the 1.14 beta changelog described it; dated release notes are the more specific evidence. [Release manifest](https://github.com/obsidianmd/obsidian-releases/blob/master/desktop-releases.json), [latest changelog](https://obsidian.md/changelog/), [roadmap](https://obsidian.md/roadmap/).

## Recommendation

Keep Tiptap, stable page/block IDs, private drafts, and explicit publication. Borrow Obsidian's strengths in connecting ideas, retrieving context, composing notes, and retaining ownership of content. A browser-based publishing workspace needs different storage and security boundaries from a desktop Markdown vault.

The first implementation is deliberately coherent: discover possible connections, inspect existing references, and find pages whose connections deserve attention. Larger ideas below are a roadmap, not claims of completion.

## Release history: the useful progression

| Era | Important direction | What matters here |
|---|---|---|
| 2020 foundations | Backlinks, unlinked mentions, previews, local graphs, section/block links, templates, daily notes, configurable shortcuts | Stable identities and source context are more useful than a decorative global graph. |
| 2021 composition | Note Composer, outgoing references, richer search, slash commands, mobile interactions | Preserve selection, update links deliberately, and make actions usable without a pointer. |
| 2022 workspace | Live Preview, tabs with individual history, pop-out windows, Canvas | Reading/editing parity and preserved navigation state matter; multiple editors introduce save ownership problems. |
| 2023 structured notes | Bookmarks replace simple starring; properties add typed metadata; table editing improves | Separate navigation shortcuts from publication pinning; use validated metadata instead of arbitrary scripts. |
| 2024 reading/research | Footnote interaction, editable previews, cache-rebuild controls, Web Clipper and Web viewer | References should keep readers oriented; derived indexes must be disposable and repairable. |
| 2025 Bases | Table/card views over files, then grouping, list layouts and summaries | Keep one underlying page record and multiple views; do not make copies for each collection. |
| 2026 refinement | Searchable settings, image keyboard controls, capture locations, faster suggestions, better mobile focus/scroll behavior | Small interaction details deserve explicit regression tests. |
| 1.14 beta | Kanban, group management, improved hierarchy filtering, capture refinements | Useful design references, with beta status recorded. |

Sources: [2020 archive](https://obsidian.md/changelog/page/25/), [2021 composition](https://obsidian.md/changelog/page/20/), [2022 tabs/Canvas](https://obsidian.md/changelog/page/15/), [properties](https://obsidian.md/changelog/page/12/), [tables](https://obsidian.md/changelog/page/11/), [footnotes](https://obsidian.md/changelog/page/10/), [2024–25 research](https://obsidian.md/changelog/page/8/), [Bases 1.9](https://obsidian.md/changelog/2025-08-18-desktop-v1.9.10/), [Bases 1.10](https://obsidian.md/changelog/2025-11-11-desktop-v1.10.3/), [1.13](https://obsidian.md/changelog/2026-07-30-desktop-v1.13.4/).

## Feature inventory and decisions

Status: **Added** means implemented in this change; **Existing** identifies a related capability already found in our code; **Next** is a recommended follow-up; **Conditional** needs a demonstrated use case or more design work.

### Connections and navigation

| Feature worth borrowing | Our adaptation | Status |
|---|---|---|
| Incoming links with surrounding prose | Existing research backlinks, now searchable with optional context | Added refinement |
| Unlinked mentions | Suggest other saved pages that mention the current title without linking to it | Added |
| Clearly marked unavailable links | Show a disabled unavailable-reference row with a repair hint | Added |
| Orphan discovery | Connections view separates isolated pages from pages with no incoming links | Added |
| Link counts | Count distinct source/target pages, ignoring self-links | Added |
| Link-health inspection | Filter pages with missing targets and open their Research panel | Added |
| Preview before navigation | Reuse the existing private page preview from reference results | Existing, reused |
| Aliases | Private alternate titles for abbreviations, old terminology and translations | Next |
| Heading/block destinations | Extend the existing stable block-link model into mention suggestions | Next |
| Local graph | An accessible one-hop/two-hop relationship explorer with a list equivalent | Conditional |
| Global animated graph | Attractive, but low value until there are enough connected pages | Defer |
| Searchable grouped bookmarks | Bookmark pages, blocks and searches independently of public pinning | Next |
| Recent-page quick switching | Extend the existing command/search palette with explicit recent history | Next |
| Context-preserving navigation | Restore search, outline and scroll position when returning to a source | Next audit |
| Link display text independent of identity | Preserve IDs while allowing deliberate display-label changes | Existing principle; audit rename behavior |

Sources: [Backlinks](https://obsidian.md/help/plugins/backlinks), [Outgoing links](https://obsidian.md/help/plugins/outgoing-links), [Aliases](https://obsidian.md/help/aliases), [Internal links](https://obsidian.md/help/links), [Graph](https://obsidian.md/help/plugins/graph), [Bookmarks](https://obsidian.md/help/plugins/bookmarks), [Quick switcher](https://obsidian.md/help/plugins/quick-switcher), [Page preview](https://obsidian.md/help/plugins/page-preview).

Important distinction: our new unlinked list is a suggestion list, not an automatic editor. It returns one context per source page, uses the current saved title, excludes pages already linking to the target, and does not yet search aliases. This is intentionally narrower than every possible Obsidian unlinked-mention occurrence.

### Search and retrieval

| Feature | Adaptation | Status |
|---|---|---|
| Phrase and multi-word search | Already available through our indexed document search | Existing |
| Property filters | Extend current status/tag/subtree filters with safe editorial fields | Next |
| Search operators | Add a small documented grammar before attempting full Obsidian syntax | Next |
| Search explanation | Show parsed filters and literal text so mistakes are visible | Next |
| Search selected text globally | Pass editor selection to existing global search | Next |
| Recent/saved searches | Store query and options privately, never a stale copy of results | Next |
| Copy results as links | Export an intentional list of selected results | Next |
| Search by block/section/task | Index these explicitly; avoid rescanning every body on each keystroke | Conditional |
| Regex search | Requires bounded execution and clear errors; no arbitrary regex on the server by default | Defer |
| Searchable reference context | Filter titles and snippets across incoming, outgoing and suggested links | Added |
| Clear empty and error states | Distinguish no matches, loading and failed requests | Added in new views |
| Rebuildable indexes | Upgrade private cache shape and regenerate old entries lazily | Added refinement |

Source: [Search](https://obsidian.md/help/plugins/search). The existing cms/search.ts already normalizes accents, maps display offsets, scopes results, and ranks title matches. Preserve that infrastructure rather than introducing an unrelated search engine.

### Structured views and metadata

| Feature | Adaptation | Status |
|---|---|---|
| Multiple views over the same data | Extend research collections, not a second page database | Existing foundation |
| Table/list/card layouts | Add compact table and cover-card modes to saved collections | Next |
| Per-view visible fields | Title, status, tags, stage, review due, updated date | Next |
| Grouping | Group by editorial stage, tag or folder with explicit multi-tag behavior | Next |
| Nested AND/OR filters | A validated declarative rule tree with depth and size limits | Next |
| Date-relative filters | Due this week, untouched for 30 days, unpublished edits | Next |
| View summaries | Counts and reading-time totals before arbitrary formulas | Next |
| Create within a view | Preview inherited folder/tag/stage before creating the page | Conditional |
| Typed custom properties | Private schema with explicit allowed types and migrations | Conditional |
| Formula language | Requires parser, runtime limits and clear error reporting | Defer |
| Map views | Useful only if geographic content becomes a real workflow | Defer |
| Kanban group moves | Extend existing editorial board with version-checked moves | Next; Obsidian 1.14 reference is beta |

Sources: [Bases](https://obsidian.md/help/bases), [Views](https://obsidian.md/help/bases/views), [Properties](https://obsidian.md/help/properties), [Bases syntax](https://obsidian.md/help/bases/syntax). In Obsidian, the views are backed by files and metadata. Here, private draft records remain the source of truth.

### Writing and composition

| Feature | Adaptation | Status |
|---|---|---|
| Extract selection into another note | Our Research panel already creates a child draft and leaves a reference | Existing |
| Append/prepend extraction | Add a destination picker and two-document conflict handling | Next |
| Merge pages | Requires redirect/reference repair, recovery, and publication decisions | Conditional |
| Reusable snippets | Insert fragments with visible placeholders and fresh block IDs | Next |
| Template variables | A small allowlist such as title/date/time; resolve once per insertion | Next |
| Daily notes | Idempotent daily capture page using an explicit timezone | Conditional |
| Unique note creation | Existing page IDs already avoid identity collisions; timestamp titles are optional UX | Existing foundation |
| Move whole heading sections | Add outline reorder only after defining subtree boundaries | Next |
| Footnotes | Authoring, renumbering, preview, reader backlinks and export parity as one feature | Next |
| Callouts and collapsible sections | Already have callout/details nodes; audit nested content and round trips | Existing |
| Image keyboard resizing | Extend existing image node controls with scoped grow/shrink/reset actions | Next |
| Image lightbox navigation | Next/previous images, dimensions, keyboard and touch dismissal | Next audit |
| Table manipulation | Audit row/column selection, reorder, paste and undo together | Next audit |
| Selection statistics | Show selection word/character counts without distracting live animation | Next |
| Editable previews | Two editors can race; keep our preview read-only until ownership is designed | Defer |

Sources: [Note composer](https://obsidian.md/help/plugins/note-composer), [Templates](https://obsidian.md/help/plugins/templates), [Daily notes](https://obsidian.md/help/plugins/daily-notes), [Outline](https://obsidian.md/help/plugins/outline), [Callouts](https://obsidian.md/help/callouts), [1.13 image interactions](https://obsidian.md/changelog/2026-07-30-desktop-v1.13.4/).

### Capture, research and publishing

| Feature | Adaptation | Status |
|---|---|---|
| Capture destinations | Presets for inbox, current project or a daily capture page | Next |
| Web clipping templates | Normalize title/source/author/date/selection into our research records | Next |
| Highlight collections | Preserve quotation, URL, capture date and source context | Next |
| Reader view | A safe article preview for saved research; external extraction must be designed separately | Conditional |
| Source-dependent templates | Match an allowlisted hostname/content kind, with user-visible results | Conditional |
| Localize external images | Explicit import with type/size checks, deduplication and source attribution | Conditional |
| Permalinks and redirects | Existing publication code manages slug changes and redirectFrom | Existing |
| Public/private metadata separation | Keep aliases, research context and graph diagnostics private | Existing requirement |
| Published reference checks | Existing publish gate checks missing references; health view makes issues easier to find earlier | Added complement |
| Public related articles | Only published pages opted into discovery, never private graph data | Next |
| Portable export | Markdown plus assets and a manifest; preserve private export boundaries | Next audit |
| Markdown import | Preview conversion loss and remap page/block identities | Conditional |

Sources: [Clipper templates](https://obsidian.md/help/web-clipper/templates), [Highlighter](https://obsidian.md/help/web-clipper/highlight), [Reader](https://obsidian.md/help/web-clipper/reader), [Permalinks](https://obsidian.md/help/publish/permalinks).

### Reliability and workspace polish

| Feature/detail | Adaptation | Status |
|---|---|---|
| Recovery separate from synchronization | Preserve our local recovery and server revision responsibilities | Existing |
| Recovery comparison | Keep inspection before restoration, with conflict-safe writes | Existing foundation; audit |
| Named workspace layouts | Save view/filter/panel preferences, never serialized editor instances | Conditional |
| Per-tab history | Requires explicit ownership of dirty state and navigation recovery | Conditional |
| Searchable settings | Search labels/descriptions and take focus to the chosen control | Next |
| Touch-safe controls | Visible actions, scrollable sheets and no hover-only requirements | Existing convention |
| Focus restoration | Preserve the writing selection when a panel closes | Existing convention; regression target |
| Hierarchy filtering | Keep descendants visible when a parent matches; reveal result ancestry | Next audit |
| Drag edge autoscroll | Use bounded scroll speed and pointer cancellation | Next audit |
| IME composition safety | Avoid running suggestion/shortcut actions during composition | Next audit |
| Reduced motion and idle behavior | Avoid continuous spinners and unnecessary animation | Existing convention |
| Optional modules | Keep the workspace focused; do not load every advanced view eagerly | Existing architecture direction |

Sources: [File recovery](https://obsidian.md/help/plugins/file-recovery), [Version history](https://obsidian.md/help/sync/version-history), [Workspaces](https://obsidian.md/help/plugins/workspaces), [mobile 1.13 notes](https://obsidian.md/changelog/), and the dated archive pages in the coverage ledger.

## Minor upgrades that deserve actual acceptance tests

The release history repeatedly returns to these failure modes. They are useful test ideas, not a claim that each bug currently exists here.

1. Opening a command or search panel must preserve the selection when Escape dismisses it.
2. A search field should not steal focus merely because a sidebar opens.
3. A failed rename should retain the invalid input and focus so it can be corrected.
4. Deleting an item should move keyboard focus to a sensible surviving control.
5. Two references in one block must not masquerade as the same occurrence.
6. Code, inline code, links and images should not create unlinked-prose suggestions.
7. Contextual views must refresh when their source changes, without displaying another page's stale data.
8. Nested menus and page previews need consistent stacking and pointer ownership.
9. Long labels must not push filter operators or inputs outside the viewport.
10. Mobile forms must scroll fully above the software keyboard.
11. Long-document scrolling should preserve position through view switches.
12. Batch drag should show invalid destinations and report a failed save.
13. Group counts should use readable number formatting and deterministic ordering.
14. Dragging/copying content must preserve relative links and attachment identity.
15. Rendering an embedded component must not expose unrelated metadata.
16. Slow saves and interrupted network requests need recoverable state, not optimistic disappearance.

References: [2020 reference correctness](https://obsidian.md/changelog/page/23/), [2023 table/property interactions](https://obsidian.md/changelog/page/11/), [2024 rendering/context fixes](https://obsidian.md/changelog/page/10/), [2026 settings and image work](https://obsidian.md/changelog/2026-07-30-desktop-v1.13.4/), [1.14 beta refinements](https://obsidian.md/changelog/).

## What this change actually adds

1. Unlinked title mentions in a page's Research → References panel.
2. Highlighted matching text, source preview, a 30-source display cap and total count.
3. A title/context filter across reference groups.
4. A Show context toggle for compact scanning.
5. Explicit unavailable-reference presentation instead of opening a predictably failing preview.
6. Workspace → Research → Connections.
7. Isolated, no-incoming-links, broken-reference and all-page views with counts.
8. A page-title filter in Connections and direct opening into that page's Research panel.
9. Deduplicated directed connection counts that exclude self-links and hierarchy relationships.
10. A versioned private prose index for suggestions, including legacy Markdown parsing.
11. Lazy cache rebuilding and updated cache writes after saves.
12. Unit and desktop/mobile browser coverage for the new behaviors.

No aliases, automatic linking, graph visualization, footnote authoring, generalized Bases engine, or new capture integration is claimed as shipped.

## Implementation design

### Identity and indexes

Continue to use existing page IDs and block IDs. Display titles are labels, not database keys. The private document-index version advances from 2 to 3 and gains mentionBlocks. Existing indexes are rebuilt lazily when their version/shape is old. Cache writes after saves include the new data.

For structured drafts, inspect paragraph/heading prose and preserve owning block IDs. For legacy Markdown, parse with the existing unified/remark-parse dependencies. Parsing is structural: no HTML execution, remote fetch, or regex replacement of the user's document. Code, link and image nodes are excluded. Paragraphs containing raw HTML are conservatively excluded from suggestions.

The matching layer normalizes text using the existing search utilities, applies title boundaries and maps the match back to original display offsets. Suggestions are deterministic, one per source page, newest edited first. Titles shorter than two characters and the placeholder Untitled are skipped.

Limitations: this is lexical title discovery, not semantic similarity. It does not resolve aliases or infer concepts. Word-boundary behavior is best suited to separated-word prose; CJK segmentation needs dedicated follow-up. It indexes saved content rather than unsaved keystrokes.

### Connection model

Build sets of outgoing page IDs and reverse incoming IDs from the private index. Deduplicate repeated references to the same page. Ignore self-links. Missing targets count as unavailable references, not as existing outgoing neighbors. A page is isolated only if it has no incoming links, no existing outgoing links, and no missing targets. A standalone page is not automatically an error.

The new /api/admin/connections endpoint returns titles and counts, not full document bodies. It inherits the existing Cloudflare Access verification and no-store headers. No public endpoint, public graph or publishing side effect is added.

### UI

| Before | After | Why |
|---|---|---|
| Incoming/outgoing lists only | Unlinked suggestions alongside existing references | Helps discover useful connections without switching tasks |
| Fixed context-heavy lists | Search field plus Show context toggle | Supports scanning larger collections |
| Missing target opens a failing preview | Unavailable row with a repair hint | Makes the problem visible before navigation |
| Connection health hidden inside individual pages | Focused workspace views | Finds maintenance work without a force-directed graph |
| Possible matches imply a definitive relationship | Explicit suggestion copy and manual linking | The writer remains in control |

The UI follows the existing admin components and the emil-design-eng principles: restrained typography, ordinary keyboard behavior, visible touch controls, and no decorative animation for frequent filtering.

## Prioritized implementation roadmap

### Next: aliases and richer connection navigation

Add a private aliases array to the draft schema, validate length/count/duplicates, and include it in the disposable index. Show alias matches distinctly in page suggestions and unlinked mentions. Insert the stable target ID with the chosen display label. Do not reuse aliases as public redirects automatically.

Acceptance: renaming a page does not break ID links; duplicate aliases do not silently choose a target; public serialization excludes private aliases; titles and aliases have accurate highlight offsets.

### Next: bookmarks and saved searches

Use a private discriminated bookmark model: page, block, search, external source. Groups and ordering are metadata; deleting a bookmark never deletes a page. Save search options, not result bodies. Keep public pinning separate.

Acceptance: missing targets remain repairable, reorder supports keyboard alternatives, saved searches use current data, and conflicts cannot overwrite another tab's updates.

### Next: richer collection views

Extend CollectionRules with versioned nested predicates and a limited property allowlist. Add table/card layouts, visible-field preferences and grouping. Build counts and date filters before formulas. Preview inherited properties when creating from a filtered view.

Acceptance: all layouts act on the same records; invalid rules produce an explicit error; filtering is performed before result limits; bulk edits use version checks; private metadata never leaks through public exports.

### Next: footnotes and references

Design the Tiptap node model and Markdown representation together. Editing, deletion, renumbering, reader popovers, return-to-reference links and accessible keyboard behavior must ship as one compatible feature.

Acceptance: repeated references to the same footnote survive round trips; deleting a reference cannot silently delete still-used note text; numbering is deterministic; public and admin render the same content.

### Next: capture and reusable writing

Extend existing research capture and templates with destination presets, a small safe variable vocabulary and reusable fragments. Preserve source URL, capture date and selected quotation. Idempotent request IDs prevent duplicate capture or daily pages.

Acceptance: preview insertion, fresh block IDs, reliable Undo, explicit timezone, no arbitrary template execution, and no remote fetch of internal/private URLs.

### Conditional: merge, local graph and workspace layouts

Merge needs a multi-document operation journal, revision snapshots, redirects, reference repair and recovery from partial failure. A local graph needs a keyboard-accessible list counterpart and strict private/public separation. Workspace layouts must store preferences while reconstructing fresh editor instances safely.

These are larger projects. They should not be bundled into a small UI patch.

## What not to copy

- Arbitrary third-party code loading inside the privileged admin. Obsidian documents that community plugins inherit broad application access. A plugin directory is not a permissions sandbox. [Plugin security](https://obsidian.md/help/plugin-security).
- Desktop tricks that bypass web embedding restrictions or access arbitrary local files.
- Live private embeds in public articles. Publish deliberate snapshots instead.
- Formula evaluation through eval or Function.
- Treating synchronization as a backup, or a view filter as authorization.
- A second storage engine, CodeMirror migration or full Canvas workspace solely for feature parity.
- Native-only widgets, audio recording, slides or map views without a concrete writing use case.

## Validation and remaining limits

Validation: all 87 unit tests passed, including prose extraction, normalized mention offsets, connection counts and private-cache upgrade/reuse. Both new browser scenarios passed on desktop and mobile (four tests). Lint passed. Frontend and API type checks and the production build passed in an isolated snapshot containing the committed baseline plus this task's changes; the build generated all 22 static pages, with existing lint warnings.

The shared checkout also contained unrelated in-progress edits. Its build and API check failed at cms/render.ts:251 because ariaLabelledBy received a string instead of a string array. Those edits were excluded from this task's commit and isolated validation.

Browser tests use mocked API responses; they verify the interface and request behavior, not a production Cloudflare deployment. The official Obsidian UI itself was studied through documentation and release material, not an authenticated installation.
