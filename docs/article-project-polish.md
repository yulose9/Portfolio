# Article and project polish

This batch builds on release `10e271c` and the subsequently published PinaSweldo content (`1e6d807`). Site-wide sharing is documented in [social-previews.md](social-previews.md).

## Design decisions

The homepage now lists every published root project, rather than requiring the hidden `featured` flag. Supporting pages remain inside their parent. Both `#project` and `#projects` select the Projects tab.

Role, Timeline, Built with, and links use the same `ProjectFields` controls in the editor and project workspace. `ProjectProperties` renders those saved values in preview and publication. Empty fields stay hidden. The icon picker accepts Fluent emoji or uploaded artwork; SVG is rasterized through the existing media pipeline. Project listing icons are square and sit to the right of the title.

Long essays without headings receive navigation anchors based on actual paragraph excerpts. Authored headings take precedence. The text is not rewritten and synthetic headings are not inserted into the document.

| Before | After | Why |
| --- | --- | --- |
| New published projects could disappear from Home | All published root projects listed | Home and All projects agree |
| Properties edited separately from the document | Shared property controls in the editor | Saved data, preview and public page agree |
| Recents only animated new rows | Keyed positional spring movement | Promotions and demotions keep spatial continuity |
| Long prose had no outline | Real paragraph excerpts provide anchors | Navigation works without invented sections |
| Delayed, blurred page entrance | One short title-group arrival | Content and images remain immediately readable |
| Image zoom only fitted the screen | Lazy viewer with zoom controls, pan, gallery and minimap | Readers can inspect details |
| Whole editor focus rectangle | Caret-based document editing, control focus retained | Removes the distracting page-sized outline |
| Loud trash action with a changing long label | Stable action with explicit confirmation | Clearer consequence and less layout movement |

## Research used

- [Instrument work](https://www.instrument.com/work): specific project descriptions, prominent work imagery, and a clear path into each case study. Used as inspiration for content hierarchy, not copied branding.
- [IDEO guest-experience case study](https://www.ideo.com/case-study/the-future-guest-experience): a readable narrative with contextual images. The implementation preserves the author's existing prose instead of inventing results or imposing a template.
- [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article): project narratives now have Article/CreativeWork, WebPage and BreadcrumbList data from published facts. Canonical, social metadata, authors and dates use the same source. Private editor fields and author email addresses are excluded.
- [web.dev LCP guidance](https://web.dev/articles/optimize-lcp): the lead image is discoverable and prioritized; later covers are lazy, dimensions reserve space, and responsive image slots match the actual column. Zoom code loads on demand. No performance score is claimed without measurement.
- Context7: Motion layout animation; Tiptap Markdown parsing; react-zoom-pan-pinch controls and minimap. Installed types were checked against implementation.

## Import and conversion behavior

Import supports `.md`, `.markdown`, `.txt`, and `.json` with a preview before file insertion. File contents append rather than replacing the document. Pasted larger documents preserve the selection bookmark and detect intervening edits. Structured editor JSON is schema-validated; ordinary JSON becomes a formatted code block. Input size, depth, URLs and attributes are bounded. Markdown thematic breaks work on their own. Frontmatter is kept out of the body, with supported metadata offered explicitly.

Copy to Writing / Projects creates an unpublished draft in the other workspace. It preserves content, editor data, media addresses, metadata, and saved revisions. Originals and live URLs stay unchanged. Project properties remain stored when copying to Writing. Retries resume the same deterministic copy, never overwrite an edited destination, and stage history before making the current draft visible.

Linked notes, excerpts, and captures now copy with new identities and remapped page references. They remain hidden until the destination draft exists, so interrupted copies never expose detached annotations. Retries preserve later destination edits. Conversion still refuses pages with child pages, saved collection membership, cross-page private references, polls, or pending media. Those require a coordinated tree/state migration. Folder placement and the live editor undo stack are not copied. These limits are stated in the dialog; this is not a claim of unrestricted migration parity.

## Verification

Validated on 2026-11-09:

- All 320 unit/regression tests pass, including import validation, conversion retries and concurrency, project metadata and sharing.
- Application types pass in the production build; the separate API type check also passes.
- Changed-file lint has no errors and six warnings, mainly native image usage with the existing responsive media pipeline. The build also reports existing Sentry import and hook warnings.
- The production static export succeeds. Both published projects appear on Home; the portfolio's prose, images, properties and paragraph outline survive export. Unsupported Outcomes claims remain absent.
- All 17 public HTML pages have complete, matching Open Graph/Twitter metadata and a distinct, real 1200 × 630 PNG under 1 MB. The CI pipeline now checks this after building.
- Generated preview images were viewed locally. Browser interaction, responsive screenshots and assistive-technology checks remain **not verified** because the computer-use host is disconnected.

Remote control was requested and started, but its latest response was `connecting` with a timeout. The three delegated final reviewers could not run because their workspace credits were exhausted; their earlier code was integrated and checked locally. No independent-agent review is claimed for the final state.
