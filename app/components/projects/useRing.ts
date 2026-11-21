"use client";

import { useCallback, useEffect, useRef } from "react";

import { holdGrabbing } from "../../lib/grabbing";
import { playSound } from "../ui/sound";

/** One card on the ring: the project it stands for (null is home) and its image. */
export type RingSlot = { project: string | null; src: string };

/** How far apart neighbouring card centres sit, in card widths. */
const PITCH = 1.12;
/** Spring that carries the ring to where it is asked to be (damping ratio ≈ 0.96). */
const STIFFNESS = 120;
const DAMPING = 21;
/** A card dims as it turns away from the light, up to this much. */
const MAX_SHADE = 0.18;

/** Distance from slot `i` to the ring position, wrapped into [-n/2, n/2). */
export function ringOffset(i: number, position: number, n: number) {
  const d = i - position;
  return (((d + n / 2) % n) + n) % n - n / 2;
}

/*
 * The ring's physics and input, kept apart from what the page shows.
 *
 * Geometry: a real cylinder. Every card is turned by its angle around one
 * centre and pushed out along the radius (rotateY then translateZ), so x, z
 * and the turn all come from the same circle and the cards recede and
 * foreshorten together. The radius follows from the card's width, so
 * neighbours sit PITCH card-widths apart at any size.
 *
 * Motion: one spring toward a target position, written straight to the cards
 * from a rAF loop that sleeps when settled, so turning never re-renders React.
 *
 * Input: wheel/trackpad (settles on a whole card, leaning the way it went),
 * drag with a throw, and arrow keys. `onCentre` hears which project a turn
 * comes to rest on; a `quiet` move (a hover preview, or steering to a chosen
 * project) turns the ring without reporting the cards it passes.
 */
export function useRing(slots: RingSlot[], onCentre: (project: string | null) => void) {
  const n = slots.length;
  const step = (Math.PI * 2) / n;

  const stageRef = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLElement | null>>([]);
  const position = useRef(0);
  const velocity = useRef(0);
  const target = useRef(0);
  const width = useRef(260);
  const raf = useRef(0);
  const lastFrame = useRef(0);
  const reduced = useRef(false);
  const quiet = useRef(false);
  const centred = useRef(0);
  const drag = useRef<{ id: number; x: number; from: number; moved: boolean; t: number; v: number; release?: () => void } | null>(null);
  const dragged = useRef(false);

  const report = useRef(onCentre);
  useEffect(() => {
    report.current = onCentre;
  });

  const place = useCallback(() => {
    const p = position.current;
    const r = n > 1 ? (width.current * PITCH) / (2 * Math.sin(step / 2)) : 0;
    cards.current.forEach((card, i) => {
      if (!card) return;
      const angle = ringOffset(i, p, n) * step;
      const a = Math.abs(angle);
      // Past about 60 degrees it is turning away; let it go before it does.
      const fade = a < 1.05 ? 1 : Math.max(0, 1 - (a - 1.05) / 0.35);
      card.style.transform = `translate(-50%, -50%) translateZ(${(-r).toFixed(1)}px) rotateY(${angle.toFixed(4)}rad) translateZ(${r.toFixed(1)}px)`;
      card.style.opacity = fade.toFixed(3);
      card.style.visibility = fade > 0 ? "visible" : "hidden";
      card.style.setProperty("--shade", Math.min(MAX_SHADE, a * 0.17).toFixed(3));
      card.toggleAttribute("data-centre", a < step / 2);
    });
    const now = ((Math.round(p) % n) + n) % n;
    if (now !== centred.current) {
      centred.current = now;
      playSound("select", { detune: (now % 8) * 45, velocity: 0.25 });
      if (!quiet.current) report.current(slots[now].project);
    }
  }, [n, step, slots]);

  const frame = useRef<(time: number) => void>(() => {});
  useEffect(() => {
    frame.current = (time: number) => {
      raf.current = 0;
      const dt = Math.min(1 / 30, lastFrame.current ? (time - lastFrame.current) / 1000 : 1 / 60);
      lastFrame.current = time;
      if (!drag.current) {
        if (reduced.current) {
          position.current = target.current;
          velocity.current = 0;
        } else {
          const pull = STIFFNESS * (target.current - position.current) - DAMPING * velocity.current;
          velocity.current += pull * dt;
          position.current += velocity.current * dt;
        }
      }
      const settled =
        !drag.current &&
        Math.abs(target.current - position.current) < 0.0005 &&
        Math.abs(velocity.current) < 0.001;
      if (settled) {
        position.current = target.current;
        velocity.current = 0;
        lastFrame.current = 0;
      }
      place();
      if (settled) {
        quiet.current = false;
      } else {
        raf.current = requestAnimationFrame((t) => frame.current(t));
      }
    };
  }, [place]);

  const wake = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame((t) => frame.current(t));
  }, []);

  /** Turn to `to` (a slot position). Quiet moves don't report what they pass. */
  const go = useCallback(
    (to: number, options: { quiet?: boolean } = {}) => {
      quiet.current = Boolean(options.quiet);
      target.current = to;
      wake();
    },
    [wake]
  );

  /** Be at `to` at once, with no motion (arriving on a deep link). */
  const jump = useCallback(
    (to: number) => {
      quiet.current = true;
      position.current = target.current = to;
      velocity.current = 0;
      centred.current = ((Math.round(to) % n) + n) % n;
      place();
      quiet.current = false;
    },
    [n, place]
  );

  /** Position of the nearest slot that stands for `project` (home: the avatar). */
  const nearest = useCallback(
    (project: string | null) => {
      let best = target.current;
      let distance = Infinity;
      slots.forEach((slot, i) => {
        if (slot.project !== project) return;
        // A project's first screen is the one that stands for it.
        if (project !== null && slots[(i - 1 + n) % n].project === project) return;
        const d = ringOffset(i, target.current, n);
        if (Math.abs(d) < distance) {
          distance = Math.abs(d);
          best = target.current + d;
        }
      });
      return Math.round(best);
    },
    [slots, n]
  );

  /** The slot centred right now. */
  const centredIndex = useCallback(() => ((Math.round(position.current) % n) + n) % n, [n]);

  /** The project whose card is centred right now. */
  const centredProject = useCallback(
    () => slots[((Math.round(position.current) % n) + n) % n].project,
    [slots, n]
  );

  /** The slot the ring is heading for. */
  const aimedIndex = useCallback(() => ((Math.round(target.current) % n) + n) % n, [n]);

  /** The project the ring is heading for (where it will come to rest). */
  const aimedProject = useCallback(
    () => slots[((Math.round(target.current) % n) + n) % n].project,
    [slots, n]
  );

  // Measure the card; the radius follows from its width.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const card = cards.current.find(Boolean);
      if (card) width.current = card.offsetWidth;
      place();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [place]);

  /*
   * Wheel and trackpad: a notch nudges the ring part of a card; a moment after
   * the input stops it settles on a whole card, leaning the way it was going,
   * so one notch moves on and a trackpad's few pixels of drift do not.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let lean = 0;
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      quiet.current = false;
      lean = Math.sign(delta);
      target.current += delta / 380;
      wake();
      clearTimeout(idle);
      idle = setTimeout(() => go(Math.round(target.current + lean * 0.35)), 120);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      clearTimeout(idle);
    };
  }, [go, wake]);

  // Drag with a throw. The stage captures the pointer so the drag survives
  // leaving it, a second finger is ignored, and once it is really a drag the
  // site's closed hand shows and text selection is off (holdGrabbing).
  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    // Touch has its own path (below): pointer events alone are fragile there,
    // because the browser may claim the gesture and cancel them mid-swipe.
    if (event.pointerType === "touch") return;
    if (event.button > 0 || drag.current) return;
    quiet.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, from: position.current, moved: false, t: event.timeStamp, v: 0 };
    dragged.current = false;
    velocity.current = 0;
    const stage = event.currentTarget;
    const pitch = width.current * PITCH;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 6) {
        d.moved = true;
        stage.setPointerCapture?.(d.id);
        if (e.pointerType !== "touch") d.release = holdGrabbing();
      }
      const next = d.from - dx / pitch;
      const dt = Math.max(1, e.timeStamp - d.t) / 1000;
      d.v = d.v * 0.6 + ((next - position.current) / dt) * 0.4;
      d.t = e.timeStamp;
      position.current = next;
      target.current = next;
      wake();
    };
    const up = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      drag.current = null;
      d.release?.();
      dragged.current = d.moved;
      velocity.current = d.moved ? d.v : 0;
      go(Math.round(position.current + Math.max(-2, Math.min(2, d.v * 0.2))));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /*
   * Swiping on a touch screen. The gesture's direction is decided once it has
   * moved 8px: sideways turns the ring (and stops the page scrolling under the
   * finger, which needs a non-passive touchmove), vertical is left to the
   * page. A touch that starts inside a live demo belongs to the demo.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let touch: { x: number; y: number; from: number; axis: "x" | "y" | null; t: number; v: number } | null = null;

    const start = (event: TouchEvent) => {
      const target = event.target as Element | null;
      if (event.touches.length !== 1 || target?.closest?.(".phone-demo")) {
        touch = null;
        return;
      }
      const point = event.touches[0];
      touch = { x: point.clientX, y: point.clientY, from: position.current, axis: null, t: event.timeStamp, v: 0 };
      dragged.current = false;
    };

    const move = (event: TouchEvent) => {
      const t = touch;
      if (!t || event.touches.length !== 1) return;
      const point = event.touches[0];
      const dx = point.clientX - t.x;
      const dy = point.clientY - t.y;
      if (!t.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        t.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (t.axis === "x") {
          quiet.current = false;
          velocity.current = 0;
          // Holds the spring still while the finger has the ring.
          drag.current = { id: -1, x: t.x, from: t.from, moved: true, t: event.timeStamp, v: 0 };
        }
      }
      if (t.axis !== "x") return;
      event.preventDefault();
      const next = t.from - dx / (width.current * PITCH);
      const dt = Math.max(1, event.timeStamp - t.t) / 1000;
      t.v = t.v * 0.6 + ((next - position.current) / dt) * 0.4;
      t.t = event.timeStamp;
      position.current = next;
      target.current = next;
      wake();
    };

    const end = () => {
      const t = touch;
      touch = null;
      if (!t || t.axis !== "x") return;
      drag.current = null;
      dragged.current = true;
      velocity.current = t.v;
      go(Math.round(position.current + Math.max(-2, Math.min(2, t.v * 0.2))));
    };

    stage.addEventListener("touchstart", start, { passive: true });
    stage.addEventListener("touchmove", move, { passive: false });
    stage.addEventListener("touchend", end);
    stage.addEventListener("touchcancel", end);
    return () => {
      stage.removeEventListener("touchstart", start);
      stage.removeEventListener("touchmove", move);
      stage.removeEventListener("touchend", end);
      stage.removeEventListener("touchcancel", end);
    };
  }, [go, wake]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    go(Math.round(target.current) + (forward ? 1 : -1));
  };

  /** Bring slot `i` to the centre. */
  const bring = useCallback(
    (i: number) => go(Math.round(position.current + ringOffset(i, position.current, n))),
    [go, n]
  );

  /** Whether slot `i` is the centred card. */
  const isCentred = useCallback(
    (i: number) => Math.abs(ringOffset(i, position.current, n)) < 0.5,
    [n]
  );

  /** Whether the gesture that just ended was a drag (its click must not act). */
  const wasDrag = useCallback(() => dragged.current, []);

  // A card can be replaced by a new element (a screenshot turning into a live
  // demo, and back); place it as soon as it attaches, or it would sit at its
  // unplaced CSS default (invisible) until the ring next moved.
  const cardRef = useCallback(
    (i: number) => (node: HTMLElement | null) => {
      cards.current[i] = node;
      if (node) wake();
    },
    [wake]
  );

  return { stageRef, cardRef, go, jump, nearest, centredProject, aimedProject, aimedIndex, centredIndex, bring, isCentred, wasDrag, onPointerDown, onKeyDown };
}
