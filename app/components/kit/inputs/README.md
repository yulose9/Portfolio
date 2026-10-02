# Input and picker kit

Client components for picking, entering and handling values. They are built on Base UI 1.8, `motion` 13, `@hello-pangea/dnd` 18 and Phosphor icons. Styles live in `app/kit-inputs.css`, which both layouts import. That file uses the tokens in `app/kit.css`.

Conventions:

- **Class prefix.** Every class is prefixed `ki-`. The `kit-` prefix belongs to the primitives in `kit-components.css`.
- **Sound slots.** Each component sets `data-slot` so the sound layer (`components/ui/sound.tsx`) gives it the right cue:
  - `*-item` and `*-option` play select.
  - `*-remove` plays chirp.
  - `*-trigger` plays open and close.
- **Coded cues.** Some cues are raised from code with `playSound`: `success`, `error`, `blocked` and `destructive`.
- **Reduced motion.** Every animation has a rule for reduced motion. Motion-driven parts check `useReducedMotion()`, and CSS parts have a media query in `kit-inputs.css`.
- **Imports.** Import from the file directly. There is no barrel.

```tsx
import { TagsInput } from "../../components/kit/inputs/multi-select-tags";
```

---

## `calendar.tsx`: `Calendar`

This is react-day-picker v10 with Kobra's month turn. When the month changes, the new grid slides in from the side it was turned toward (the `calendar-month-in` keyframe from kit.css). The caption stays mounted, so the new month is announced once and the navigation buttons keep focus.

- **Props:** every `DayPickerProps` prop, passed through. `showOutsideDays` defaults to `true`.
- **Components:** your `components` are merged over the kit's own `Chevron`, `DayButton`, `Month` and `MonthGrid`.
- **Classes:** the `rdp-*` class names are kept, and the root gets `.ki-calendar`.
- **Slots:** the root has `data-slot="calendar"` and each day has `data-slot="calendar-day-option"`.

**Adoption:**

- `admin/ui/DateTimePicker.tsx:73`: change `<DayPicker` to `<Calendar` and keep every prop.
  - The Chevron override can go, because the kit's Chevron is the same Phosphor caret.
  - After the swap, check `.dtp-calendar` in `admin/admin-bulk.css:282`, which also styles `rdp-*`. Remove whatever it duplicates.
- `admin/ui/DetailsSheet.tsx:79` and `admin/ui/ReviewQueue.tsx:258`: these `datetime-local` fields could become `DateTimePicker` once it uses `Calendar`.
- `admin/ui/extensions/mentions.tsx:81`/`:92` and `:240`/`:249`: the date + time input pairs in the date-mention popover.

## `color-picker.tsx`: `ColorPicker`, `ColorPickerPopover`

This is a mix of Kobra's and cult-ui's pickers:

- a saturation area and hue rail from react-colorful
- a hex field
- an HSL field that accepts `hsl(…)`, `#abc` or `#aabbcc`
- named swatches as a radiogroup, with arrow keys, Home and End
- the system eyedropper, where `window.EyeDropper` exists

The value is always lower-case `#rrggbb`.

| Prop       | Type                                         | Notes                                                                   |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `value`    | `string`                                     | Any hex. It is normalised when read.                                    |
| `onChange` | `(hex) => void`                              | Fires continuously while dragging.                                      |
| `swatches` | `(string \| { name, color })[]`              | Presets. `TEXT_COLORS` from `cms/inline.ts` maps to `{ name, color }`.  |
| `label`    | `string`                                     | The group's accessible name, e.g. "Text color".                         |

- `ColorPickerPopover` takes the same props plus `children` (a custom trigger) and `triggerClassName`. It renders a swatch-and-hex trigger that opens the panel.
- `normalizeColor`, `toHsl` and `fromHsl` are exported.

**Adoption:**

- `admin/ui/ColorPicker.tsx:119-188`: the `HexColorPicker`, the `.color-options` swatch group and the hand-written hex field with its validation become one `<ColorPicker value={selected ?? "#52525b"} onChange={apply} swatches={TEXT_COLORS.map(([name, color]) => ({ name, color }))} label="Text color" />`.
  - Keep the "Page color" (null) button beside it. The kit picker always holds a colour.

## `multi-select-tags.tsx`: `TagsInput`

This combines Kobra's multi-select with shadcn.io's tags. Each tag is a chip with a remove button, and a Base UI Combobox adds, filters and creates tags.

Chips reorder in three ways:

- by dragging, with `@hello-pangea/dnd`
- with the keyboard handle: Space lifts, the arrow keys move, Space drops and Escape cancels, all announced
- with Alt+←/→ to nudge one place

Other keys:

- Delete or Backspace on a focused chip removes it.
- Backspace in the empty field removes the last chip.
- A comma adds what you typed as it is.

| Prop                     | Type                          | Default         |
| ------------------------ | ----------------------------- | --------------- |
| `value` / `onChange`     | `string[]`                    | required        |
| `label`                  | `string`                      | required (accessible name) |
| `suggestions`            | `string[]`                    | `[]`            |
| `allowCreate`            | `boolean`                     | `true`          |
| `max`, `maxLength`       | `number`                      | `∞`, `40`       |
| `placeholder`            | `string`                      | "Add a tag…"    |
| `renderTag`, `tagProps`  | per-tag label / extra attributes, e.g. `data-tint` | |

The chip row stays on one line and scrolls sideways, because the drag library measures along one axis. Duplicates are refused without regard to case. Adding past `max` sounds "blocked" and is announced.

**Adoption:**

- `admin/ui/TagsInline.tsx:60-134` replaces:
  - the HTML5 drag reorder (:72-73)
  - the grip arrow keys (:74-75)
  - the add input and suggestion listbox (:85-130)
  - the 8-tag and 40-character limits

  Use `<TagsInput value={tags} onChange={…} suggestions={known} max={8} label="Tags" tagProps={(t) => ({ "data-tint": tagTint(t) })} />`.
- `admin/ui/DetailsSheet.tsx:119-143` is the simpler duplicate, with no reorder and no suggestions. Use the same component so both sheets behave the same.

## `magnetic-dropzone.tsx`: `MagneticDropzone`

This is a drop target that reacts as soon as a file is dragged anywhere over the page:

1. Once a file is over the page, the dashed edge darkens.
2. Within `reach` px of the zone, the zone leans toward the pointer on a spring, up to 10 px.
3. Over the zone, the solid edge grows from the point where the pointer came in. The icon becomes a hand and the label reads "Release to add it".

Validation:

- A wrong type or size is refused.
- On refusal, the zone shakes, plays the error sound and shows an alert.

Keyboard and page behaviour:

- Click, Enter or Space opens the file dialog.
- Only the zone's own `dragover` calls `preventDefault`, so drops elsewhere on the page, such as the editor's, behave as before.

| Prop                | Type                     | Notes                                            |
| ------------------- | ------------------------ | ------------------------------------------------ |
| `onFiles`           | `(files: File[]) => void`| Called only with files that pass validation.     |
| `accept`            | `string`                 | Same syntax as the file input's `accept`.        |
| `multiple`          | `boolean`                | `false`                                          |
| `maxSize`           | `number` (bytes)         | Per file.                                        |
| `title`, `hint`     | `ReactNode`              |                                                  |
| `reach`             | `number`                 | `160`                                            |
| `disabled`, `children` |                       |                                                  |

`formatBytes` is exported.

**Adoption:**

- `admin/ui/MediaLibrary.tsx:179-205`: the Upload `<label>` + sr-only input becomes `<MagneticDropzone multiple accept="image/*,video/*,audio/*" onFiles={upload} />`. Reuse the existing sequential "2 of 5" progress (:218-222).
- `admin/ui/DetailsSheet.tsx:168-171`: the "Add a cover image" empty state could become a dropzone with `accept="image/*"`. It currently opens the hidden input at `Editor.tsx:1217`.
- `admin/ui/extensions/heading-icon.tsx:83-100`: the "Upload image" label.

## `counter.tsx`: `Counter`, `SlidingNumber`

This is shadcn.io's counter. Each digit is a 0–9 column that rolls to place on a spring. Digits are keyed by their place value, so going from 99 to 100 rolls the nines over and adds a column instead of redrawing the number.

- **`SlidingNumber`** takes `value`, `pad` and `group` (locale thousands separators). Screen readers hear one plain number.
- **`Counter`** takes `value`, `onChange`, `min`, `max`, `step`, `label` (required), `unit` and `disabled`.
  - It is laid out as − n +, and the number itself is a `spinbutton`.
  - Keys: ↑/→ and ↓/← step by one, PageUp/PageDown step by ten, Home/End jump to the limits.
  - It shows integers only.

**Adoption:**

- `admin/ui/Bubble.tsx:205`: the image width `type="number"` (64–2400) becomes `<Counter label="Image width" unit="px" min={64} max={2400} step={16} … />`.
- `admin/ui/Editor.tsx:1195-1198`: the footer's word count and minutes become `<SlidingNumber value={words} group />`.
- `admin/ui/ReferenceLists.tsx:70-73` (`.research-count`) and `admin/ui/MediaLibrary.tsx:221` (asset count): show these with `SlidingNumber`.

## Special buttons

### `copy-button.tsx`: `CopyButton`, `writeClipboard`

The copy icon morphs into a check, with a slight blur crossing, then turns back after `timeout`.

| Prop         | Type / default                                       |
| ------------ | ---------------------------------------------------- |
| `value`      | `string \| () => string \| Promise<string>`          |
| `label`      | "Copy"                                               |
| `copiedLabel`| "Copied"                                             |
| `timeout`    | `2000`                                               |
| `onCopied`   | callback                                             |
| `variant`    | `"ghost" \| "outline"`                               |

- `children` adds visible text next to the icon.
- A role=status line announces "Copied".
- The `execCommand` fallback is marked with `markProgrammaticCopy` so the site's Ctrl+C toast doesn't fire twice.

**Adoption:**

- `components/writing/ShareRow.tsx:26`: the copy-link button.
- `admin/ui/extensions/code-block.tsx:36`: the code-block copy.
- `components/writing/ArticleEnhance.tsx:35`/`:55`: the heading link and code copy.
- `admin/ui/ResearchPanel.tsx:317`: the private block link.
- Menu items keep `components/menu/actions.ts`'s `copy()`, because menus close before a morph could be seen.

### `download-button.tsx`: `DownloadButton`, `saveBlob`

The progress shows inside the button. A fill crosses the button, the label shows the percentage (or stays indeterminate when there is no content-length), a check appears at the end, and then the button rests. Pressing it mid-download cancels.

- **`source`** is either a URL, which is fetched with streamed progress, or `(report, signal) => Promise<Blob>`.
- **Other props:** `filename`, `children` (the resting label), `onDone` and `onError`.

**Adoption:**

- `components/writing/ArticleMenu.tsx:120-127`: the `download(href)` helper (used at :308 and :352) as a visible button wherever an image or media file is offered.
- The admin has no Blob downloads yet. The first candidate is an "Export Markdown" next to copy-as-Markdown (`admin/ui/Editor.tsx:892`).

### `long-press-button.tsx`: `LongPressButton`

Hold to confirm, for destructive actions:

1. While the button is held, a fill crosses it over `duration` (default 1200 ms).
2. Letting go early drains the fill.
3. A quick tap shows "Press and hold".

Holding Space or Enter works the same way. The destructive sound plays only when the action fires.

Props: `onConfirm`, `children`, `duration`, `holdingLabel`, `variant` (`"destructive"` is the default, or `"primary"` or `"outline"`) and `disabled`.

**Adoption** (the ones that currently have no confirmation at all come first):

- `admin/ui/Folders.tsx:184-191`: folder delete.
- `admin/ui/MediaLibrary.tsx:308-319`: media trash.
- `admin/ui/MediaJobs.tsx:331-345`: "Discard local job".
- `admin/ui/DetailsSheet.tsx:54-60`, `:206-210`: replace the "Click again to move to Trash" two-click confirm.
- `admin/ui/PostActions.tsx:296-315` and `admin/ui/BulkBar.tsx:363-389`: the AlertDialogs for "Delete forever" can stay. The dialog's confirm button could be a `LongPressButton` for an extra beat.

### `shake-button.tsx`: `ShakeButton`, `useShake`

A button that shakes when it refuses. `onPress` returns `false`, or a string giving the reason, to refuse. The button then shakes, plays the blocked sound, and announces the reason.

- With reduced motion, the shake becomes an outline flash.
- `useShake<T>()` returns `{ ref, shake }`, so the same refusal works on any element, such as a field or a chip.

**Adoption** (these refusals are currently silent):

- `admin/ui/TagsInline.tsx:62` and `:134`: tag limit and duplicate.
- `admin/ui/MetaEditors.tsx:174`: "Add co-author" at 6 authors.
- `admin/ui/ColorPicker.tsx:170`/`:185`: use `useShake` on the bad-hex field.
- `admin/ui/LinkHover.tsx:103-105`: invalid URL on Save.

## `avatar-group.tsx`: `AvatarGroup`

Avatars overlap, and each one has a bite masked out instead of a border, so the edges stay clean on any background. A face lifts on hover or focus, its name shows in a tooltip, and a +N chip names the rest. Every face is a tab stop.

- **Props:** `people: { id?, name, src?, avatar? }[]`, `max` (4), `size` (32), `label` and `onSelect`.
- **Custom faces:** pass `avatar` to use your own face element, e.g. `components/writing/Avatar` with its generated styles.
- **Overflow:** the group never shows "+1". It shows the face instead.

**Adoption:**

- `components/writing/Byline.tsx:18-26`: the stacked `span.article-avatars`, which is currently `aria-hidden`.
- `admin/ui/MetaEditors.tsx:161`: the byline trigger.
- A future presence list for `components/PeerCursors.tsx`.

## `glimpse.tsx`: `Glimpse`

A link hover preview, following shadcn.io's glimpse. It is Base UI PreviewCard on a real `<a>` and opens on hover or focus.

- **`data`:** pass `{ title, description, image, site }` up front.
- **`load`:** or pass a loader, `load(href) => Promise<GlimpseData | null>`. It is called the first time the card opens, and its result is cached per URL.
- **Other props:** `delay` (350), `side`, `cardClassName` and the usual anchor props.

**Adoption:**

- Article links in `components/TabbedIndex.tsx` (:148, :334, :603, :833, :944): `data` from the article list (title, dek, cover). Another agent owns that file, so coordinate before changing it.
- `admin/ui/ReferenceLists.tsx:59-128`: wrap backlink rows' titles.
- `admin/ui/LinkHover.tsx:110-112`: its view mode shows only the raw href. A `load` that reads internal pages from the CMS would add title and cover.

## `file-tree.tsx`: `FileTree`, `kindOf`

A collapsible tree that follows the WAI-ARIA tree pattern: `role="tree"`/`treeitem`/`group`, with aria-level, setsize, posinset, expanded and selected.

It has a single tab stop. Keys:

- ↑/↓ walk the visible rows.
- → opens a folder, or steps into one that is open.
- ← closes a folder, or steps out to its parent.
- Home and End jump to the first and last rows.
- `*` opens every sibling.
- Typing letters jumps to a matching row.
- Enter activates.
- Space selects.

Focus does not select.

Each row's icon comes from its kind: folder or open folder, page, image, video, audio, pdf, document, code, archive or file. The kind is set on the node or inferred from the file extension.

- **Props:** `nodes: { id, name, kind?, children?, icon?, meta? }[]`, `label`, `selectedId`, `onSelect`, `onActivate` (Enter or double-click, defaults to `onSelect`), `expanded`/`defaultExpanded`/`onExpandedChange` (string ids).
- **Animation:** children open and close with a height animation.

**Adoption:**

- `admin/ui/PageTree.tsx:191-307`: the nested `<ul>`/`<li>` inside `<nav aria-label="Page navigator">`. It has no tree roles and no arrow-key navigation.
  - Map pages to nodes, with `icon` set to the page's emoji.
  - Its drag reorder (:197-214, :250-262), its Alt+↑/↓ (:243-249) and its "…" menu (:270-304) would need to come along through `meta` or a follow-up. The kit tree does not reorder.
  - Expand all and Collapse all (:324-346) map to `expanded`.
- `admin/ui/PageNavigator.tsx:72`: gets the tree through PageTree.
- `admin/ui/Folders.tsx:149-194`: folders with their pages as children would make the flat list a two-level tree.

## `attachments.tsx`: `Attachments`, `attachmentKind`

File and media chips, following shadcn.io's attachments. Each chip shows the kind's icon (or the image itself), the name, and the size in the list variant, plus a remove button.

Behaviour:

- Hovering or focusing a chip opens a preview card with the image, the video's first frame, or details.
- Removing a chip animates it out, and the rest close the gap.
- Focus moves to the chip beside the removed one, or to `onEmpty` once the last chip goes.
- Delete or Backspace on a chip removes it.

- **Props:** `items: { id, name, url?, mediaType?, size?, kind?, detail? }[]`, `onRemove`, `onOpen`, `onEmpty`, `variant` (`"inline"` chips or a `"list"` with meta), `label` and `preview`.

**Adoption:**

- `admin/ui/MediaJobs.tsx:266-347`: the `.media-job` rows have no thumbnail. Use `variant="list"` with `detail` for the status, keeping the job actions alongside.
- `admin/ui/DetailsSheet.tsx:156-171`: the cover thumbnail has no remove button. A single-item `Attachments` with `onRemove` would add one.
- `admin/ui/MediaLibrary.tsx:263-324`: the list view (`data-view=list`) of `.asset-card` could use the `list` variant. The gallery view stays a grid.
