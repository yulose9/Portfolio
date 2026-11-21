"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/*
 * A preview that follows the cursor while a row is hovered (the Projects
 * list), after joshpuckett.me: one card per row, floating just above and to
 * the right of the pointer.
 *
 *   - It trails the pointer on a spring rather than sticking to it, so it
 *     feels carried, not glued.
 *   - It leans the way the pointer is moving and settles upright-ish when it
 *     stops: each card has its own small resting tilt, like a print dropped
 *     on a desk.
 *   - Changing rows swaps cards: the old one shrinks to half and fades as the
 *     new one grows in. Leaving the list shrinks it away.
 *
 * Only transform and opacity animate. The spring runs on one rAF loop that
 * sleeps when settled, and writes straight to the DOM, so following the
 * pointer never re-renders React. It only exists where there is a fine
 * pointer that can hover; under reduced motion it snaps to the pointer with
 * no lag or lean, and cards only fade.
 */

/** Resting tilt per card, in order; reads as hand-placed rather than random. */
const TILTS = [-4, 3.5, -2.5, 5, -3, 2.5];
/** Card size: a desktop screenshot (16:10, as captured at 1440 × 900). */
const WIDTH = 280;
const HEIGHT = 175;
/** How far from the pointer the card's near corner sits. */
const GAP = { x: 22, y: 18 };
/** Spring: a slight trail, no overshoot (damping ratio ≈ 0.85). */
const STIFFNESS = 260;
const DAMPING = 27;
/** Lean per px/s of horizontal speed, and its cap, in degrees. */
const LEAN = 0.012;
const MAX_LEAN = 9;

const HOVER = "(hover: hover) and (pointer: fine)";
const canHover = () => window.matchMedia(HOVER).matches;
// Whether there's a mouse at all, kept current if one is plugged in. Without
// one nothing renders, so a phone never downloads the preview images.
const subscribeHover = (listener: () => void) => {
  const media = window.matchMedia(HOVER);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};

export default function CursorPreview({
  sources,
  active,
}: {
  /** One image per row, in row order; null where a row has none. */
  sources: Array<string | null>;
  /** The row under the pointer, or null. */
  active: number | null;
}) {
  // Rendered into <body> after mount only: a fixed layer inside the page's
  // transformed column would be positioned against the column, not the window.
  const mounted = useSyncExternalStore(subscribeHover, canHover, () => false);
  const layer = useRef<HTMLDivElement>(null);

  // Pointer target and the spring's state, all outside React.
  const state = useRef({ tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, lean: 0, raf: 0, last: 0, placed: false, reduced: false });

  useEffect(() => {
    if (!mounted || !canHover()) return;
    const s = state.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const el = layer.current;
      if (!el) return;
      // Flip to the left of the pointer near the right edge, and below it near
      // the top, so the card never leaves the window.
      const left = s.x + GAP.x + WIDTH > window.innerWidth - 8;
      const below = s.y - GAP.y - HEIGHT < 8;
      const ox = left ? -GAP.x - WIDTH : GAP.x;
      const oy = below ? GAP.y : -GAP.y - HEIGHT;
      el.style.transform = `translate3d(${(s.x + ox).toFixed(1)}px, ${(s.y + oy).toFixed(1)}px, 0) rotate(${s.lean.toFixed(2)}deg)`;
    };

    const tick = (time: number) => {
      s.raf = 0;
      const dt = Math.min(1 / 30, s.last ? (time - s.last) / 1000 : 1 / 60);
      s.last = time;
      if (s.reduced) {
        s.x = s.tx;
        s.y = s.ty;
        s.vx = s.vy = s.lean = 0;
      } else {
        s.vx += (STIFFNESS * (s.tx - s.x) - DAMPING * s.vx) * dt;
        s.vy += (STIFFNESS * (s.ty - s.y) - DAMPING * s.vy) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        // The lean follows the speed, eased so it doesn't flicker.
        const want = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, s.vx * LEAN));
        s.lean += (want - s.lean) * Math.min(1, dt * 14);
      }
      draw();
      const settled =
        Math.abs(s.tx - s.x) < 0.3 && Math.abs(s.ty - s.y) < 0.3 &&
        Math.abs(s.vx) < 2 && Math.abs(s.vy) < 2 && Math.abs(s.lean) < 0.05;
      if (settled) s.last = 0;
      else s.raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      s.tx = event.clientX;
      s.ty = event.clientY;
      // The first sighting places the card at the pointer, instead of
      // flying in from wherever it was last.
      if (!s.placed) {
        s.x = s.tx;
        s.y = s.ty;
        s.vx = s.vy = s.lean = 0;
        s.placed = true;
        draw();
      }
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [mounted]);

  // Leaving the list: the next entrance starts at the pointer again.
  useEffect(() => {
    if (active === null) state.current.placed = false;
  }, [active]);

  if (!mounted || !sources.some(Boolean)) return null;

  return createPortal(
    <div ref={layer} aria-hidden="true" className="cursor-preview" style={{ width: WIDTH, height: HEIGHT }}>
      {sources.map((src, index) =>
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + index}
            src={src}
            alt=""
            width={WIDTH}
            height={HEIGHT}
            decoding="async"
            draggable={false}
            className="cursor-preview-card"
            data-on={active === index ? "" : undefined}
            style={{ "--tilt": `${TILTS[index % TILTS.length]}deg` } as React.CSSProperties}
          />
        ) : null
      )}
    </div>,
    document.body
  );
}
