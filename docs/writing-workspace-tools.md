# Writing workspace tools

## Media

- SHA-256 of the processed image identifies exact duplicate content. A conditional R2 index claim makes concurrent uploads converge on the same immutable primary URL. The largest image uploads first; its canonical ID and year determine its smaller responsive files. Variants never independently deduplicate into an unrelated image family.
- Existing uploads with SHA-256 metadata are discovered when an index entry is first needed. Legacy URLs remain intact. Visually similar images, different crops, or different encodings are not merged; this is exact-content deduplication, not perceptual matching.
- The library hides responsive variants and groups identical loaded assets. Gallery/list views, search within loaded assets, uploads, names, default alt text, trash and restore share the admin's components. Further pages load explicitly.
- Details are separate private R2 metadata, shared by identical content and protected by an ETag check. Alt text is a default for new insertions; it does not rewrite published articles.
- Trash hides assets and is reversible. Files remain available for published pages and revisions. Reuploading the same image restores its library entry. This change does not run a destructive cleanup of old storage.

## Folders

Private workspace folders are separate from page parent/child relationships and public URLs. Create, rename, remove, and move assignments use one conditional R2 document. Removing a folder unfiles its pages. The page navigator provides drag/drop and a keyboard-accessible select for each page. The Move page dialog also provides folder assignment and management.

## Find and replace

The search sidebar lists contextual excerpts for each match. Selecting an excerpt changes the active match and scrolls to its position. Replace operates on that match, or all matches, through the existing undoable editor commands. Case/whole-word filters and cross-page search remain available. Small screens use a bounded panel so the document remains reachable.

## Color and typography

The color panel uses react-colorful's keyboard-accessible saturation and hue controls, restrained preset swatches, a hex field, and a separate opacity slider. It preserves the editor selection while controls have focus.

`npm run fonts:sync` retrieves Google Fonts and Fontshare family metadata. The build refreshes this catalog and falls back to the last verified snapshot on provider failure. Search is capped to 80 rendered results at once; narrow the query to reach other families. Stylesheets load for selected/used fonts only. The editor and public sanitizer/rendering use the same catalog. Google Fonts supplies the available default face; unsupported weights may be synthesized by the browser.

Sources: [Google Fonts metadata](https://fonts.google.com/metadata/fonts), [Google Fonts repository](https://github.com/google/fonts), [Fontshare](https://www.fontshare.com/about), [react-colorful](https://github.com/omgovich/react-colorful), [R2 conditional operations](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations).

## Shortcuts

`/admin/shortcuts` lists 23 editable actions and the fixed structural editor shortcuts. Bindings persist in this browser, update other open tabs, reject collisions and reserved keys, and can reset to defaults. The editor captures configured actions before its built-in handlers and suppresses old defaults after remapping. Search/replace/save are available when an input is focused; formatting shortcuts require editor focus. OS/browser-owned shortcuts can still take precedence. Workspace and command-palette links open the settings page separately.

## Verification

- 78 unit tests pass, including concurrent upload deduplication, stale media metadata rejection, trash restoration, folder compare-and-swap, shortcut collisions, and public font rendering.
- Lint, API TypeScript checks, and the optimized static build pass. The build retains non-blocking lint warnings.
- Production-export browser coverage: 47 cases passed across the full run and focused reruns; 5 viewport-specific cases were skipped. The initial run passed 44 cases; shortcut tests were corrected to save before navigating (avoiding the intentional recovery dialog), and mobile appearance uses a native selection range instead of desktop word-selection keys. All three failed cases then passed. APIs are mocked; physical mobile devices and Safari are not covered.
- Dependency audit reports two existing findings in the Next.js/PostCSS dependency tree (one moderate, one high). The only dependency added here is react-colorful; the audit's suggested fix requires a separate Next.js major-version migration.
