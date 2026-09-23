"use client";

import { useEffect, useRef } from "react";
import {
  HOVER_SCALE,
  INTERACTIVE,
  POINTER_SPRING,
  advance,
  approach,
  cursorTransform,
  makeHeading,
  makeSpring,
  steer,
} from "../lib/spring";

const POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";

/**
 * A cursor that lags behind the pointer on a spring and turns to face its
 * direction of travel.
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
    const heading = makeHeading();
    let targetScale = 1;
    let scale = 1;
    let last = performance.now();

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (!pointer.seen) {
        // Start where the pointer already is, so it does not fly in from 0,0.
        pointer.seen = true;
        x.value = pointer.x;
        y.value = pointer.y;
      }

      // Set on every move, not just the first. Gating this behind `seen` meant
      // that once anything hid the cursor it could never come back.
      nodeRef.current?.style.setProperty("opacity", "1");

      // Grow over anything clickable. With the native cursor hidden, this is
      // what replaces the pointer/hand change as the affordance.
      const el = event.target as Element | null;
      targetScale = el?.closest?.(INTERACTIVE) ? HOVER_SCALE : 1;
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

      advance(x, pointer.x, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      advance(y, pointer.y, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      steer(heading, x.velocity, y.velocity, dt);
      scale = approach(scale, targetScale, dt);

      const node = nodeRef.current;
      if (node) {
        node.style.transform = cursorTransform(x.value, y.value, heading.spring.value, scale);
      }

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (listening || !media.matches || calm.matches) return;
      listening = true;
      document.documentElement.classList.add("has-smooth-cursor");
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerout", onOut, { passive: true });
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!listening) return;
      listening = false;
      document.documentElement.classList.remove("has-smooth-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
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
    <div ref={nodeRef} className="smooth-cursor" aria-hidden="true">
      {/*
        An original mark rather than the demo's: a narrow arrowhead with a
        white keyline, so it stays readable over the page's white surfaces and
        over the zoom dialog's dark backdrop alike.
      */}
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
        <path
          d="M11 1.5 20 23.2a1.1 1.1 0 0 1-1.45 1.4L11.4 21.3a1.1 1.1 0 0 0-.8 0l-7.15 3.3A1.1 1.1 0 0 1 2 23.2Z"
          fill="#111"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
