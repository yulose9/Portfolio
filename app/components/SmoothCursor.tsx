"use client";

import { useEffect, useRef } from "react";

/*
 * Spring constants, in the same units the reference implementation uses.
 * Critically damped enough to settle without wobble, loose enough that the
 * cursor visibly trails the pointer rather than being glued to it.
 */
const STIFFNESS = 400;
const DAMPING = 45;
const MASS = 1;

/* The rotation spring is softer, so direction changes sweep rather than snap. */
const ROT_STIFFNESS = 300;
const ROT_DAMPING = 60;

/** Below this speed the heading is noise, so the arrow holds its last angle. */
const MIN_SPEED = 0.08;

const POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, summary";

type Spring = { value: number; velocity: number };

/** One step of a damped harmonic oscillator. dt is seconds. */
function advance(s: Spring, target: number, dt: number, k: number, c: number) {
  const force = -k * (s.value - target);
  const damper = -c * s.velocity;
  s.velocity += ((force + damper) / MASS) * dt;
  s.value += s.velocity * dt;
}

/**
 * A cursor that lags behind the pointer on a spring and turns to face its
 * direction of travel.
 *
 * Written against requestAnimationFrame directly rather than pulling in a
 * motion library for four springs. The whole physics model is the `advance`
 * function above.
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
    const x: Spring = { value: 0, velocity: 0 };
    const y: Spring = { value: 0, velocity: 0 };
    const rot: Spring = { value: 0, velocity: 0 };
    let targetRot = 0;
    let turns = 0;
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
        nodeRef.current?.style.setProperty("opacity", "1");
      }

      // Grow over anything clickable. With the native cursor hidden, this is
      // what replaces the pointer/hand change as the affordance.
      const el = event.target as Element | null;
      targetScale = el?.closest?.(INTERACTIVE) ? 1.6 : 1;
    };

    const onLeave = () => nodeRef.current?.style.setProperty("opacity", "0");

    const tick = (now: number) => {
      // Clamped so a backgrounded tab does not resume with a huge dt and
      // launch the spring across the screen.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      advance(x, pointer.x, dt, STIFFNESS, DAMPING);
      advance(y, pointer.y, dt, STIFFNESS, DAMPING);

      const speed = Math.hypot(x.velocity, y.velocity) / 1000;
      if (speed > MIN_SPEED) {
        const heading = Math.atan2(y.velocity, x.velocity) * (180 / Math.PI) + 90;
        // Unwrap, so crossing 180deg sweeps the short way instead of spinning.
        const delta = ((heading - (targetRot - turns * 360) + 540) % 360) - 180;
        targetRot += delta;
        turns = Math.round((targetRot - heading) / 360);
      }
      advance(rot, targetRot, dt, ROT_STIFFNESS, ROT_DAMPING);

      scale += (targetScale - scale) * Math.min(dt * 12, 1);

      const node = nodeRef.current;
      if (node) {
        node.style.transform =
          `translate3d(${x.value}px, ${y.value}px, 0) ` +
          `translate(-50%, -50%) rotate(${rot.value}deg) scale(${scale})`;
      }

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (listening || !media.matches || calm.matches) return;
      listening = true;
      document.documentElement.classList.add("has-smooth-cursor");
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerout", onLeave, { passive: true });
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!listening) return;
      listening = false;
      document.documentElement.classList.remove("has-smooth-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
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
