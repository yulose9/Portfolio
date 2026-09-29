# Writing workbench polish

## Design direction

Daily editing, restrained density, existing Base UI components. Keep the current Inter interface font and Paper Mono for shortcuts. Preserve the site's neutral tokens: canvas #ffffff, ink #0a0a0a, secondary #52525b, muted #6b6b73, fill #f4f4f5, structural line #ececee. Blue remains the focus cue. Controls use 8px corners, floating surfaces 14px, and the established pill primary action.

The user's request for less maximalism takes priority over the invoked marketing-oriented skills' hero, randomized layout, GSAP, and perpetual-animation recipes. No new marketing layout, typeface, or motion dependency is appropriate for this editor. Apply their hierarchy, restraint, spacing, and component-cohesion guidance.

```
Writing                         Workspace v   New post v
Pages       [Filter posts................]    Search all
All 2    Drafts 1    Scheduled 0    Published 1    Trash 0
-------------------------------------------------------
Post rows
```

## Changes and root causes

| Before | After | Why |
| --- | --- | --- |
| Header tools and filters wrap into unrelated pill clusters | One primary action, workspace menu, dedicated search row, quiet status tabs | Distinguishes global tools from list filtering |
| Move opens inline and displaces document chrome | Searchable destination dialog with current location and Move here | Makes the destination explicit without moving the editor |
| Raw file input and immediate heading-icon changes | Staged preview, upload target, Remove and Done | Supports inspection and cancellation |
| Mention popup shares a two-column block-preview layout and manually positions only on typing | Independent one-column surface using Tiptap's managed anchor | Updates on scrolling, resizing and layout changes |
| Hover selection invokes scrollIntoView | Keyboard reveals only within the options pane; pointer selection never scrolls | Stops page jumps and wheel/hover feedback loops |
| Preview height depends on selected content | Bounded, stable block menu with independently scrollable options | Keeps items and preview in predictable positions |
| Font details expands the appearance panel | Shared Base UI select, grouped colors, opacity and completion footer | Reduces layout jumps and preserves keyboard handling |
| Reduced-motion press rule scales every active ancestor | Scope press treatment to interactive controls | Prevents layout and portal ancestors from changing stacking during clicks; move-dialog regression passes on both viewport sizes |
| Mobile appearance panel scrolls above the viewport during formatting | Fixed positioning with viewport collision handling | Keeps the title, controls and completion action reachable |

Popover transitions use opacity/transform at 180ms with cubic-bezier(.2,0,0,1), and reduced motion removes them. High-frequency typed suggestions appear immediately. Existing focus, selection ownership, save/version and publication boundaries remain in place.

## Verification

- Full Playwright suite: 39 passed, 5 intentional viewport/input-specific skips. Desktop Chrome and mobile Chromium emulation; mocked admin APIs, no production content changed.
- Added coverage for dashboard filtering/navigation, moving and conflict feedback, slash mouse-wheel/keyboard/query behavior, mention scrolling and viewport resize, date/time insertion, staged heading icons and uploads, text selection preservation, font/color/opacity, and reduced motion.
- Unit suite: 72 passed. ESLint: passed.
- Inspected desktop and mobile screenshots for dashboard, move dialog, suggestion menus, heading controls and text appearance.
- Production build passed, including TypeScript validation and static page generation. Existing non-blocking lint warnings remain.
- Physical mobile keyboards and Safari were not tested.
