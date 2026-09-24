"use client";

import { useEffect, useRef } from "react";
import { cursorMarkup, cursorTransform, shapeAt, type CursorShape } from "../lib/cursor";
import {
  HEADING_SPRING,
  POINTER_SPRING,
  advance,
  advanceStable,
  makeHeading,
  makeSpring,
  steer,
} from "../lib/spring";

const POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";

/**
 * A cursor that follows the pointer on a tight, critically damped spring,
 * turns to face its direction of travel, and becomes a hand over anything
 * clickable or an I-beam over prose.
 *
 * Written against requestAnimationFrame directly rather than pulling in a
 * motion library for four springs. The physics lives in lib/spring, shared
 * with PeerCursors, so other people's cursors move exactly like this one.
 *
 * Deliberately narrow about when it runs:
 *  - fine pointers only, so it never appears after a tap on a touchscreen;
 *  - never under prefers-reduced-motion, where a trailing, rotating object
 *    following the pointer is precisely the kind of motion being opted out of;
 *  - the native cursor is only hidden while this is actually running, so a
 *    failure here can never leave someone with no pointer at all.
 */
export default function SmoothCursor() {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia(POINTER_QUERY);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let listening = false;

    const pointer = { x: 0, y: 0, seen: false };
    const x = makeSpring(0);
    const y = makeSpring(0);
    // An unseen, softer twin of the position, only for steering the arrow
    // (see HEADING_SPRING): the drawn cursor tracks tightly, the turn stays
    // smooth.
    const gx = makeSpring(0);
    const gy = makeSpring(0);
    const heading = makeHeading();
    let shape: CursorShape = "arrow";
    // Set when the pointer moves or the page scrolls, cleared once the shape
    // has been re-checked: the hit-test runs at most once a frame, and not at
    // all while nothing changes.
    let dirty = false;
    let spin: HTMLElement | null = null;
    let last = performance.now();

    /*
     * Click feedback: the cursor dips (see [data-pressed] in globals.css) while
     * any mouse button — left, right or middle — is held, in every shape.
     *
     * Driven by `buttons`, the live set of held buttons, rather than by
     * pairing pointerdown with pointerup: a second button pressed mid-hold
     * arrives as a pointermove, and a release that happens outside the window
     * or during Windows' middle-click autoscroll can skip pointerup entirely.
     * Reading `buttons` on every event means the next movement always tells
     * the truth, so the cursor can never be left stuck down.
     */
    let pressed = false;
    const setPressed = (next: boolean) => {
      if (next === pressed) return;
      pressed = next;
      const node = nodeRef.current;
      if (!node) return;
      if (next) node.dataset.pressed = "";
      else delete node.dataset.pressed;
    };
    const onButtons = (event: PointerEvent) => {
      if (event.pointerType === "mouse") setPressed(event.buttons !== 0);
    };
    // Alt-tab mid-press: the release never reaches this window.
    const onBlur = () => setPressed(false);

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      onButtons(event);
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (!pointer.seen) {
        // Start where the pointer already is, so it does not fly in from 0,0.
        pointer.seen = true;
        x.value = gx.value = pointer.x;
        y.value = gy.value = pointer.y;
      }

      // Set on every move, not just the first. Gating this behind `seen` meant
      // that once anything hid the cursor it could never come back.
      nodeRef.current?.style.setProperty("opacity", "1");
      dirty = true;
    };

    // Content scrolling under a still pointer changes what it is over.
    const onScroll = () => {
      dirty = true;
    };

    /*
     * pointerout bubbles and fires on every element-to-element transition, so
     * hiding on it unconditionally hid the cursor the moment it crossed onto
     * the main column. relatedTarget names the element being entered, and is
     * only null when the pointer genuinely leaves the window.
     */
    const onOut = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.relatedTarget === null) {
        nodeRef.current?.style.setProperty("opacity", "0");
      }
    };

    const tick = (now: number) => {
      // Clamped so a backgrounded tab does not resume with a huge dt and
      // launch the spring across the screen.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      // Sub-stepped: at this stiffness a single per-frame step diverges.
      advanceStable(x, pointer.x, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      advanceStable(y, pointer.y, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      advance(gx, pointer.x, dt, HEADING_SPRING.stiffness, HEADING_SPRING.damping);
      advance(gy, pointer.y, dt, HEADING_SPRING.stiffness, HEADING_SPRING.damping);
      steer(heading, gx.velocity, gy.velocity, dt);

      const node = nodeRef.current;
      if (node) {
        if (dirty && pointer.seen) {
          dirty = false;
          // Tested at the real pointer, not the lagging cursor, so the shape
          // answers to what you are actually pointing at.
          const next = shapeAt(pointer.x, pointer.y);
          if (next !== shape) {
            shape = next;
            node.dataset.shape = next;
          }
        }
        node.style.transform = cursorTransform(x.value, y.value);
        spin ??= node.querySelector<HTMLElement>(".cursor-spin");
        if (spin) spin.style.transform = `rotate(${heading.spring.value}deg)`;
      }

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (listening || !media.matches || calm.matches) return;
      listening = true;
      document.documentElement.classList.add("has-smooth-cursor");
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerout", onOut, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });
      window.addEventListener("pointerdown", onButtons, { passive: true, capture: true });
      window.addEventListener("pointerup", onButtons, { passive: true, capture: true });
      window.addEventListener("blur", onBlur);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!listening) return;
      listening = false;
      document.documentElement.classList.remove("has-smooth-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("pointerdown", onButtons, { capture: true });
      window.removeEventListener("pointerup", onButtons, { capture: true });
      window.removeEventListener("blur", onBlur);
      setPressed(false);
      cancelAnimationFrame(frame);
      pointer.seen = false;
      nodeRef.current?.style.setProperty("opacity", "0");
    };

    const sync = () => (media.matches && !calm.matches ? start() : stop());

    sync();
    media.addEventListener("change", sync);
    calm.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return (
    <div
      ref={nodeRef}
      className="smooth-cursor"
      data-shape="arrow"
      aria-hidden="true"
      // Static markup from lib/cursor with a fixed colour — nothing from input
      // reaches it. Shared with PeerCursors so both cursors are identical.
      dangerouslySetInnerHTML={{ __html: cursorMarkup("#111") }}
    />
  );
}
