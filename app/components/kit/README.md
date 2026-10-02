# Component kit

Kobra's (kobra.systems) design language rebuilt as our own components, on
`@base-ui/react` 1.8, Tailwind 3 and `motion`. Nothing here is Kobra's code:
the sizes, radii, states and timings come from the server-rendered markup of
Kobra's demos and its compiled stylesheet. The behaviour (gooey slider,
sliding tabs, button faces) is our own implementation of what the demos show.

- Shared material (tokens, `t-surface`, `t-check`, `t-toggle`, `t-skel`,
  `t-spinner`, keyframes) lives in `app/kit.css`.
- The components' own rules live in `app/kit-components.css`, imported right
  after `kit.css` in both root layouts. Base rules are wrapped in `:where()`,
  so any Tailwind class passed as `className` wins over a kit default.
- Every part sets a `data-slot` named after Kobra's. The sound layer
  (`app/components/ui/sound.tsx`) reads these, so keep them as they are.
- Everything respects `prefers-reduced-motion`. Keyboard behaviour, focus
  management and ARIA come from Base UI.
- Light theme only.

Imports are relative, e.g. `import { Button } from "../components/kit/button"`.

---

## button.tsx

`Button` (Base UI `Button`) and `buttonClassName(variant, className?)`.

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `variant` | `"default" \| "secondary" \| "outline" \| "destructive" \| "ghost" \| "link"` | `"default"` | |
| `size` | `"default" \| "xs" \| "sm" \| "lg" \| "icon" \| "icon-xs" \| "icon-sm" \| "icon-lg"` | `"default"` | h-8 / h-6 / h-7 / h-9 |
| `loading` | `boolean` | | Turns the label over to the bars spinner. Sets `aria-busy` and ignores presses (no `disabled`, so focus stays). |
| `success` | `boolean` | | Turns the label over to a check that draws in. |
| …Base UI `Button` props | | | `render`, `disabled`, `focusableWhenDisabled`, `nativeButton`, … |

An icon marked `data-icon="inline-start"` / `"inline-end"` pulls that edge's padding in.

Fidelity: `t-surface` gradients, edge highlight, ring and drop shadow, the
hover tint, the press (`::before` scales to .99, 150ms ease-out; not when the
button opens a popup) and the busy morph (faces turn over on X with blur,
.3s spring-like `linear()` curve) all match Kobra's CSS. The success face uses
Kobra's `t-success-check` keyframes (fade, rotate, blur, bob, then the stroke
draws). Differences: Kobra's demo also animates the label's width with
`motion` when the label text changes. Here all faces share one grid cell, so
the button keeps the label's width and nothing is measured. There is no
`push` variant (`t-push`).

## checkbox.tsx

`Checkbox`: Base UI `Checkbox.Root` props (`checked`, `defaultChecked`,
`onCheckedChange`, `indeterminate`, `disabled`, `name`, …) plus `className`.

Fidelity: 16px box, 4px radius, border `--input` that fills `--primary` in
.15s while the tick draws over .35s (`t-check`, `--check-ease`). The tick
un-draws in .15s, and the indicator stays mounted so it can. Same hit-area
`::after`, focus ring and `aria-invalid` ring. Indeterminate draws a dash the
same way. Kobra's demo has no indeterminate state, so the dash is our own.

## radio-group.tsx

`RadioGroup` (Base UI `RadioGroup`: `value`, `defaultValue`,
`onValueChange`, `disabled`, `name`) and `RadioGroupItem` (Base UI
`Radio.Root`: `value`, `disabled`).

Fidelity: 16px ring and an 8px dot (`inset: 3px`) that springs in with
`radio-dot-in`, .22s `cubic-bezier(.34,1.56,.64,1)`. Leaving a choice is
instant, as on Kobra.

## switch.tsx

`Switch`: Base UI `Switch.Root` props (`checked`, `defaultChecked`,
`onCheckedChange`, `disabled`, `name`) plus `className`.

Fidelity: exact sizes (32.66 × 18.4px, 14px thumb). The thumb is Kobra's
clip-path pill (`t-toggle-thumb`): it travels by moving the clip over .22s
`--toggle-ease`, and on hover it grows 5px towards the far side. The track
colour changes instantly (`--toggle-track: 0s`). Kobra keys this on
`data-on`, but Base UI sets `data-checked`, so `kit-components.css` repeats
the checked and hover rules for `data-checked`.

## slider.tsx

`Slider`, single value.

| Prop | Type | |
| --- | --- | --- |
| `value` / `defaultValue` | `number` | |
| `onValueChange` | `(value: number, details) => void` | |
| `min`, `max`, `step`, `largeStep`, `disabled`, `name`, `format`, `onValueCommitted` | | Base UI |
| `aria-label` | `string` | Labels the thumb's range input when no visible label does. |

Fidelity: 6px track (`--muted` mixed 10% toward `--foreground`), a
`--primary` range, a 26px thumb with edge alignment, and Kobra's goo filter
with the same values (Gaussian blur 7, alpha matrix `44 -17.83`, composited
`atop`). The thumb you see is painted in SVG. The real Base UI thumb is
transparent and serves as the hit area and focus target. Kobra's exact
animation is in its paid bundle, so ours is our own design on the same
filter: a smaller drop follows the thumb on a spring and is drawn out of it
when the value jumps or moves fast. At rest the blob is 85% size, 92% on
hover and 100% while dragging. Not matched: Kobra's second "melt" overlay
(a masked layer above the thumb) and range (two-thumb) sliders.

## tabs.tsx

`Tabs` (Base UI `Tabs.Root`: `value`, `defaultValue`, `onValueChange`,
`orientation`), `TabsList`, `TabsTrigger` (`value`, `disabled`) and
`TabsContent` (`value`, `keepMounted`).

Fidelity: Kobra's pill well (`t-well`, `--muted`, 2px padding), triggers at
px-4 py-1.5 in `--muted-foreground` that scale to .96 when pressed, and a
white pill that slides over .25s `--tabs-ease` (Kobra's
`sliding-tab-pill`). The active label is Kobra's clip technique
(`sliding-tab-active-label`): the pill carries a second, inert copy of the
labels in `--foreground`, held in place by a counter-translation, so the
active colour is wiped across by the pill's edges. Differences: the pill is
Base UI's `Tabs.Indicator` and moves with `transform`. If the list is
horizontally scrolled mid-transition, the copy can be off by the scroll
offset until the pill settles. Horizontal lists only.

## tooltip.tsx

- `Tooltip` with `content`, one element as `children` (the trigger), `side`,
  `sideOffset` (6), `delay`, `className`, plus Base UI `Tooltip.Root` props.
- `TooltipProvider`, i.e. Base UI's provider, for shared delays.
- `createTooltipHandle()`, `TooltipTrigger` (`handle`, `payload`, any
  trigger props) and `GlidingTooltip` (`handle`, `side`, `sideOffset`):
  one tooltip shared by a row of triggers.

Fidelity: inverted dark label (`--foreground` on `--background`), 12px
text, px-3 py-1.5, `radius - 2px`, with an arrow. It scales from .96 from the
anchor over 150ms and is instant between tooltips. In the gliding version,
the popup slides and resizes on Kobra's navtip tokens (`--navtip-travel`
.18s, `--navtip-ease`) and the label slides in from the side of travel.
Kobra's exact tooltip popup classes are not in the downloaded markup (it only
renders on hover), so the popup's styling follows its `tooltip-content`
rules and the shadcn base styles Kobra builds on.

## menu.tsx

`DropdownMenu` (Root), `DropdownMenuTrigger`, `DropdownMenuContent`
(`side` "bottom", `align` "start", `sideOffset` 4, `alignOffset`),
`DropdownMenuItem` (`variant: "default" | "destructive"`, `inset`,
`onClick`, `closeOnClick`, `disabled`), `DropdownMenuCheckboxItem`
(`checked`, `onCheckedChange`), `DropdownMenuRadioGroup` (`value`,
`onValueChange`), `DropdownMenuRadioItem` (`value`), `DropdownMenuLabel`
(`inset`), `DropdownMenuSeparator`, `DropdownMenuShortcut`,
`DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuSubTrigger` and
`DropdownMenuSubContent`.

The trigger is unstyled. For Kobra's look, write
`<DropdownMenuTrigger render={<Button variant="outline" />}>`. The trigger
keeps `data-slot="dropdown-menu-trigger"`, which the sound layer reads.

Fidelity: the popup is animated with Kobra's `popover-panel` (`popover-flip-in`:
perspective tilt of ±20° toward the anchor side plus scale from .94, .3s
`--ease-out`, with a .16s fade; `popover-flip-out` .16s `--ease-exit`).
Items are 28px rows with a flat `--accent` highlight. Checkbox items draw
their tick like the checkbox, and radio items spring their dot in.
Differences: the panel's ring, shadow and padding follow the shadcn base
style Kobra uses, because the open menu isn't in the server-rendered
markup.

## dialog.tsx

`Dialog` (Root: `open`, `defaultOpen`, `onOpenChange`, `modal`),
`DialogTrigger`, `DialogContent` (`size: "sm" | "md" | "lg"` = 24/28/32rem
max from 640px, `showClose` true), `DialogHeader`, `DialogFooter`,
`DialogTitle`, `DialogDescription`, `DialogClose` and `createDialogHandle`.

Fidelity: a white card with an xl radius and a hairline ring, over a 10% black
backdrop with a 4px blur. It scales in from .96 over .2s `--ease-out` and
leaves in .15s `--ease-exit`. A nested dialog steps the one below back 4%.
The footer is the muted band with a top border. The close button is a ghost
icon button, `data-slot="dialog-close"`. Differences: the open card isn't in
Kobra's preview markup, so its classes are inferred from Kobra's
`dialog-content` rule and the shadcn base dialog.

## sheet.tsx

`Sheet` (Root), `SheetTrigger`, `SheetContent` (`side: "top" | "right" |
"bottom" | "left"`, default right; `showClose`), `SheetHeader`,
`SheetFooter`, `SheetTitle`, `SheetDescription` and `SheetClose`
(`data-slot="sheet-close"`).

Fidelity: 75% width (max 24rem from 640px) against its edge, with a border on
the inner side. It slides in .4s on the drawer curve `cubic-bezier(.32,.72,0,1)`
and out in .22s `--ease-in`. Reduced motion fades it in place. Same caveat as
the dialog: it's built on Base UI `Dialog` and has no drag-to-dismiss.

## skeleton.tsx

- `Skeleton`: a `div` with `animation: "shimmer" | "pulse" | "none"`
  (default shimmer).
- `SkeletonReveal`: `loading`, `skeleton` (placeholder node), `children`,
  `pulse` (one breath before the reveal), `className`.

Fidelity: `--muted` blocks with Kobra's `skeleton-shimmer` sweep
(`--skeleton-sweep`, 1.6s linear, reversed in RTL) and `t-skel-pulse`. The
reveal is Kobra's `t-skel` cross-fade with a blur (.4s, 2px). Difference:
Kobra stacks both layers absolutely in a fixed-size box. Here they share a
grid cell, so the box sizes itself.

## spinner.tsx

- `Spinner`: Kobra's 12-bar spinner (`t-spinner-bar`, 1.2s).
- `StatusBadge`: `state: "loading" | "done"`, `size` (px, default 16),
  `outline`. Kobra's pending-to-done badge on the `t-check-*` rules: the arc
  spins, then the disc fills with overshoot and the tick draws in, with a
  short blur during the change.

---

## Toast (app/components/ui/toast.tsx)

The API is unchanged. It is still Base UI's toast manager in `app/lib/toast.ts`
(`toast.add / update / promise / close`), and `Toaster` is still the export.
`ToastSounds` / `playSound` and the copy and paste keyboard toasts are kept
as they were. Styles are under `.kt-*` in `kit-components.css`. The old
`.toast-*` rules in `globals.css` are no longer used.

Matches Kobra's `@kobra/toast`:

- A single-line pill, h-9, on the popover at 80% with `backdrop-blur`, and
  Kobra's shadow (`0 1px 2px` / `0 8px 24px` / white hairline).
  `prefers-reduced-transparency` makes it solid.
- The pile: each card back sits 10px further up, 3% smaller and 15% fainter,
  three deep. Cards behind hide their words and are held to the front card's
  width (Kobra's DeckCap; the width is measured and passed in as
  `--kt-front-width`). Pointing at or focusing the pile fans it into a list
  with 8px gaps.
- One motion curve: the .3s critically damped spring (`--toast-morph-*` in
  CSS, `{ type: "spring", duration: .3, bounce: 0 }` in motion), with a .2s
  exit. A new card rises 8px from .98 scale. A leaving card drops 8px to 96%.
- Inside the pill: the glyph pops (scale .25 → 1 with blur) and its slot opens
  in width. Words slide in from 6px and the line's width morphs, so an
  update like a promise going from "Saving…" to "Saved" reads as one motion.
  Loading and success share Kobra's StatusBadge, so pending turns into a
  filled tick in place.

Differences:

- Bottom-centre, as the site's toasts have always been, so the pile rises.
  Kobra's default is top-centre.
- There's a description. Kobra's toast is one message. Ours shows the title,
  then the description in muted grey on the same line, truncated, and the
  full text stays the toast's accessible description.
- Swipe to dismiss is Base UI's (down, left or right), not Kobra's free drag
  with its canvas "smoky dissolve".
- There is still a dismiss ×. It folds away for toasts that time out and
  opens when the pile fans out or gets keyboard focus. Toasts that stay
  until dismissed (errors, `timeout: 0`) always show it.
- Error, warning and info marks are Phosphor's filled icons in `--error`,
  `--warning` and `--info`. Kobra's alert marks are paid.
- The action is a small `default` kit button (h-6), not Kobra's `sm`.
