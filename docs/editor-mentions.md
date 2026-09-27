# Writing editor controls

- Drag a text selection across paragraphs to select whole blocks. Use the floating toolbar for formatting, duplicate, or delete. Drag a selected block's grip to move the selection together. The block menu and move shortcuts also act on the selected group. Undo restores these edits.
- Select an image to edit its width in pixels, alt text, or caption. Drag either bottom corner to resize with its aspect ratio preserved. Reset size restores automatic sizing. Sized images are saved as HTML inside Markdown so their dimensions survive publishing.
- Type `@` and a date or page name, then choose an item with the mouse or the arrow keys and Enter. Examples: `@today`, `@yesterday`, `@last Monday`, `@Tuesday 14:30`, and `@2026-09-06`.
- Dates use Asia/Manila (UTC+8). A mention stores its calendar date, not the word “today.” The label updates as time passes: Today, Yesterday, Last Sunday, then a full date at seven days. Click the mention in the editor to change its date or optional 24-hour time. Readers cannot edit dates.
- Choose an existing page in the `@` menu, or type a new title and choose “Create subpage.” The new page is a draft associated with its parent. Open its link in another tab to write it. Parent and child are published independently. Public mentions resolve stable IDs to current published slugs; unpublished targets remain text.
- On phones and narrower windows, the contents list is a sticky disclosure above the article body and closes after choosing a heading. At 1440px and wider it becomes a right rail beyond the article's wide figures.

## Checks

Run the editor and mention regression tests with:

```sh
node --experimental-loader ./tests/typescript-loader.mjs --test tests/editor-blocks.test.mjs tests/mentions.test.mjs tests/updated-at.test.mjs
```

These cover date rollover, Markdown persistence, parent validation, published link resolution, mixed-block edits and undo, and image dimensions. They do not replace browser checks for dragging, popover placement, keyboard focus, or responsive layout.

## Session recovery, inline logos, links, and colors

- The admin reads the verified Cloudflare Access token expiry from API responses. Two minutes before expiry it saves the current draft and opens a sign-in notice. Cloudflare still enforces the actual expiry; the editor never extends or bypasses it.
- Body and post details are also kept in session storage in the current browser tab while unsaved. If the session expires or a save fails, sign in in the same tab and choose **Restore changes**. Closing the tab clears this recovery storage. A server-version mismatch is shown before restoring. No recovered content is published automatically.
- **Okay, sign in again** saves again before calling Access logout and returning to the current admin URL. Navigation is blocked when neither the server nor recovery storage can preserve changes, or when uploads/recordings are still running. **Stay here** leaves the editor open.
- Type `/logo` or choose **Logo and text** from Insert. Click the inline item to upload its logo, change its label, or apply a link. SVGs are rendered as images and rasterized before upload; PNG/JPG/WebP and browser-readable images work, with the existing HEIF decoder as a fallback. Inline assets use a static image frame and follow the surrounding font size.
- Hover or tap an ordinary article link in the editor for its destination, **Edit link**, and **Remove link**. Keyboard users can use the existing link action on selected text.
- Select text and choose the underlined **A** for a text color, including a custom color or **Default** to clear it. This is also in the mobile editing bar. Color and logo metadata survive Markdown save/reopen and public rendering.

Additional checks: `tests/inline-editor.test.mjs` and `tests/session-recovery.test.mjs`. Browser layout, real Cloudflare expiry/logout, native image decoding, and mobile keyboard interactions still need manual verification.

## UI implementation review

The design keeps the existing admin palette: white `#ffffff`, ink `#0a0a0a`, secondary text `#52525b`, divider `#ececee`, surface `#f4f4f5`, and focus blue `#2563eb`. Inter remains the control typeface; the inline logo inherits the article typeface and font size. Controls are left aligned, with actions at the end of each panel. The logo is the only distinctive inline element; it has no badge background or independent entrance animation.

Layout: `sentence [small logo + label] sentence`; editing opens a compact panel with text, file, and optional link fields. The selection bar gains an underlined A, with named color options and a default/reset action. This preserves the article's existing visual identity instead of adding a separate card style.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH, resolved | app/admin/ui/SessionGuard.tsx:7; app/admin/ui/Editor.tsx:262 | Expiry only surfaced as a failed save | Saving/recovery status, explicit sign-in confirmation, and a reminder after dismissal | State feedback: no automatic navigation away from unprotected work |
| MEDIUM, resolved | app/admin/ui/extensions/inline-logo.tsx:10 | Images were article blocks | Text-sized logo and label with inline editing | Optical alignment: preserve the sentence's baseline and reading rhythm |
| MEDIUM, resolved | app/admin/ui/LinkHover.tsx:8 | Existing links required selecting text before editing | Hover/tap destination card with Edit and Remove actions | Contextual controls: make the relevant action discoverable |
| MEDIUM, resolved | app/admin/ui/ColorPicker.tsx:6 | No text-color control | Named palette, custom color, and explicit Default option | Static state cues: selected outline and labels accompany color swatches |

Code verification covers hover, focus, press, busy, error, missing-image, selected, and default states. New repeated color interactions use a 150ms transition with `cubic-bezier(0.2, 0, 0, 1)` and `scale(0.96)`; reduced motion removes that transform. Existing Base UI surfaces supply focus management and origin-aware popover transitions.

Not verified: browser layout, 10% motion replay, physical-device keyboard/touch behavior, native image decoding, and real Cloudflare expiry/logout. The earlier browser-access denial was not retried or bypassed. Approval applies only to inspected code and automated checks.

Approve


## Writing editor controls and reading-page polish

- Drag from the editor gutter or hold Alt while dragging to draw a selection rectangle. Every intersected top-level block joins the selection; use the existing block controls to move or delete the group. Escape cancels the gesture.
- Hover a tag to reveal its grip. Drag the grip onto another tag to reorder, or focus it and use Left/Right. The order is saved with the post.
- The image inspector sits above the image. Width/reset, alt text, and caption have separate rows. Saved pixel widths now pass through the figure conversion in the public renderer; narrow screens still constrain images to the available width.
- Find has a labelled panel, match count, case/whole-word controls, and a separate replacement row. **Search all writing** carries the query to the global palette. The palette searches saved drafts and published posts, excludes Trash, ignores stale responses, and reports network errors. Words and phrases can cross inline formatting and soft line breaks.
- Type @ and choose **Choose date and time…** to pick any date and optional time. A bare colon now opens emoji choices immediately.
- Last updated appears beside the article's date and updates after a successful save. Its tooltip includes the weekday, date, seconds, and UTC.
- Insert **Heading with icon** from the slash/insert menu. Click its icon to change the emoji or upload an image. Outline rows expose a plus control for adding/replacing that heading's icon; the same icon appears in the public table of contents. Icons do not change heading labels or fragment IDs.
- **Details → Typography → Enable font ligatures** is on by default. The selection toolbar's underlined A opens font, color, and opacity controls. The curated font shelf and 0–100% opacity persist through Markdown and publishing.
- **All writing → Tag pages** (also available through the command palette) edits a tag page's title and description. **Save and publish** commits its metadata and triggers the site's normal build. Tags used only by drafts gain a public page when an associated article is published. Unsaved tag edits are cached in this browser tab; closing the tab clears that recovery copy. Concurrent edits return a conflict; the reload action explicitly discards local edits.
- The reading-page TOC has one scroll container, a thin scrollbar, active-section tracking, reduced-motion-aware navigation, and list-only autoscroll. Links keep their hash fallback. Bottom duplicate tags are removed; header tags remain. Public and preview tags use the custom pointer, dates use its text shape, and zoomable article photos use a magnifying-glass cursor.

### UI implementation review — this change

Existing Inter controls, white/zinc surfaces, blue focus rings, and compact spacing are retained. Image properties form a two-column width/reset row followed by full-width metadata fields. Find uses a scope heading above its inputs. Heading icons follow the text baseline and have no separate badge surface. Repeated controls use short transitions; heading-icon press feedback uses scale(0.96). Reduced motion disables new transform feedback and smooth scrolling.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH, resolved in code | app/admin/ui/Bubble.tsx:12; app/admin/admin-editor.css:1234 | Reset and metadata competed for space near resize controls | Inspector above image; separate width/reset and metadata rows | Spatial separation: controls remain distinguishable |
| HIGH, resolved in code | app/admin/ui/menu.tsx:77; app/admin/ui/EditorChrome.tsx:272 | Custom submenu state and a moving drag anchor could dismiss navigation | Base UI hover intent with a locked anchor while open | Continuity: preserve the pointer path into Turn into |
| MEDIUM, resolved in code | app/components/writing/Toc.tsx:12; app/article-extras.css:167 | Nested scroll containers and competing active-section logic | One list scroll area and one active-section owner | Motion ownership: prevent scroll jumps and chunky nested bars |
| MEDIUM, resolved in code | app/admin/ui/EditorChrome.tsx:474; app/admin/ui/SearchPalette.tsx:67 | Crowded find controls, stale search responses, errors shown as empty results | Explicit scope, separate replace row, cancellation guard and error feedback | State clarity: distinguish loading, no results, and failure |
| MEDIUM, resolved in code | app/admin/ui/Outline.tsx:13; app/admin/ui/ColorPicker.tsx:10 | Outline had no icon controls; selected text only offered color | Heading-linked icons plus font/color/opacity controls | Contextual editing: place changes beside their content |

Verification: automated Markdown/rendering, search, selection geometry, emoji, tag validation, and concurrent-write checks. Code inspection covers hover/focus/press, loading/empty/error states, responsive bounds and reduced motion. **Not verified:** real pointer dragging, native date/file pickers, submenu hover trajectories, mobile keyboards, iframe cursor transitions, visual layout or 10% animation replay. Browser access was declined earlier and was not retried. Approval below applies only to inspected code and automated coverage.

Approve
