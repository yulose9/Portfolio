/**
 * What the custom cursors look like and which shape they take. Shared by the
 * local cursor and everyone else's, so a guest's pointer turns into a hand or
 * an I-beam over exactly the same things yours does. The motion itself lives
 * in ./spring.
 */

export type CursorShape = "arrow" | "text" | "hand";

/** Rendered size of every glyph, in px. Close to a native arrow (~12x19). */
export const CURSOR_SIZE = { width: 16, height: 19 } as const;

/** Anything clickable: the hand. */
const INTERACTIVE = "a, button, [role='button'], summary, label, select";

/**
 * Where the I-beam is allowed. Opt-in rather than every <p>: the I-beam says
 * "this is reading material", which is true of the About prose and not of a
 * one-line label that happens to be text.
 */
const TEXT_REGION = "[data-cursor='text']";

/** Fields always get the I-beam, wherever they are. */
const FIELD = "input:not([type='checkbox']):not([type='radio']), textarea, [contenteditable]";

/*
 * Vertical allowance around each line of text. A character's box is its
 * glyph height, not the line height, so without this the gaps between lines
 * would flick the cursor back to an arrow on every line crossed.
 */
const LINE_PAD = 4;

/**
 * The shape for a point on screen. `x`/`y` are viewport coordinates.
 * The cursor layers are pointer-events: none, so elementFromPoint never
 * returns a cursor itself.
 */
export function shapeAt(x: number, y: number): CursorShape {
  const el = document.elementFromPoint(x, y);
  if (!el) return "arrow";
  if (el.closest(INTERACTIVE)) return "hand";
  if (el.closest(FIELD)) return "text";
  if (el.closest(TEXT_REGION) && overText(x, y)) return "text";
  return "arrow";
}

/** True when the point sits on rendered characters, not the block's margin. */
function overText(x: number, y: number): boolean {
  let node: Node | null = null;
  let offset = 0;
  // caretPositionFromPoint is the standard; caretRangeFromPoint is Safari's.
  if ("caretPositionFromPoint" in document) {
    const pos = document.caretPositionFromPoint(x, y);
    node = pos?.offsetNode ?? null;
    offset = pos?.offset ?? 0;
  } else if ("caretRangeFromPoint" in document) {
    const range = (document as Document).caretRangeFromPoint(x, y);
    node = range?.startContainer ?? null;
    offset = range?.startOffset ?? 0;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;

  const length = node.textContent?.length ?? 0;
  if (!length) return false;
  // The characters either side of the caret: whichever the point is over.
  const range = document.createRange();
  range.setStart(node, Math.max(0, offset - 1));
  range.setEnd(node, Math.min(length, offset + 1));
  for (const r of range.getClientRects()) {
    if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - LINE_PAD && y <= r.bottom + LINE_PAD) {
      return true;
    }
  }
  return false;
}

/** Position only. Rotation is applied to the arrow alone; see cursorMarkup. */
export function cursorTransform(x: number, y: number): string {
  return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
}

/**
 * The three glyphs, stacked; CSS cross-fades between them on [data-shape].
 *
 * Only the arrow sits inside .cursor-spin, the element that turns to face the
 * direction of travel. A rotating I-beam or hand would read as broken.
 *
 * Static markup with a fixed fill — never interpolated from input — so it is
 * safe to set as innerHTML for both cursors.
 *
 * @param fill the glyph colour: near-black locally, the peer's hue for guests.
 */
export function cursorMarkup(fill: string): string {
  const { width, height } = CURSOR_SIZE;
  return (
    `<span class="cursor-shape" style="width:${width}px;height:${height}px">` +
    // Arrow: the original mark, on its own 22x26 box.
    `<span class="cursor-glyph" data-glyph="arrow"><span class="cursor-spin">` +
    `<svg viewBox="0 0 22 26" fill="none"><path d="M11 1.5 20 23.2a1.1 1.1 0 0 1-1.45 1.4L11.4 21.3a1.1 1.1 0 0 0-.8 0l-7.15 3.3A1.1 1.1 0 0 1 2 23.2Z" fill="${fill}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>` +
    `</span></span>` +
    // I-beam: drawn twice, a wide white stroke under a narrow dark one, so it
    // keeps a keyline like the arrow's over any background.
    `<span class="cursor-glyph" data-glyph="text">` +
    `<svg viewBox="0 0 22 26" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M7.5 2.5c2 0 3.5.8 3.5 2.5 0-1.7 1.5-2.5 3.5-2.5M11 5v16M7.5 23.5c2 0 3.5-.8 3.5-2.5 0 1.7 1.5 2.5 3.5 2.5M8.5 13h5" stroke="#fff" stroke-width="4.4"/>` +
    `<path d="M7.5 2.5c2 0 3.5.8 3.5 2.5 0-1.7 1.5-2.5 3.5-2.5M11 5v16M7.5 23.5c2 0 3.5-.8 3.5-2.5 0 1.7 1.5 2.5 3.5 2.5M8.5 13h5" stroke="${fill}" stroke-width="1.8"/>` +
    `</svg></span>` +
    // Hand: Phosphor's HandPointing (fill weight, MIT), the icon set the rest
    // of the page uses. paint-order puts the keyline behind the fill.
    `<span class="cursor-glyph" data-glyph="hand">` +
    `<svg viewBox="0 0 256 256"><path d="M224,104v50.93c0,46.2-36.85,84.55-83,85.06A83.71,83.71,0,0,1,80.6,215.4C58.79,192.33,34.15,136,34.15,136a16,16,0,0,1,6.53-22.23c7.66-4,17.1-.84,21.4,6.62l21,36.44a6.09,6.09,0,0,0,6,3.09l.12,0A8.19,8.19,0,0,0,96,151.74V32a16,16,0,0,1,16.77-16c8.61.4,15.23,7.82,15.23,16.43V104a8,8,0,0,0,8.53,8,8.17,8.17,0,0,0,7.47-8.25V88a16,16,0,0,1,16.77-16c8.61.4,15.23,7.82,15.23,16.43V112a8,8,0,0,0,8.53,8,8.17,8.17,0,0,0,7.47-8.25v-7.28c0-8.61,6.62-16,15.23-16.43A16,16,0,0,1,224,104Z" fill="${fill}" stroke="#fff" stroke-width="24" stroke-linejoin="round" paint-order="stroke"/></svg>` +
    `</span>` +
    `</span>`
  );
}
