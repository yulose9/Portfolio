"use client";

import { useCallback, useEffect, useRef } from "react";
import { haptic } from "../lib/haptics";

/**
 * A 20px WebP of the same portrait, inlined.
 *
 * It costs no request and paints on the first frame, so the circle is never an
 * empty hole while the real file arrives. It shows only for the moment
 * before the real file lands, so at 96-144px it reads as a soft fade-in.
 */
const LQIP =
  "data:image/webp;base64,UklGRsQAAABXRUJQVlA4ILgAAACwBQCdASoUABQAPt1mq1EopSOiqAgBEBuJagCdMzE";

const LARGE_SRC = "/avatar-1024.webp";

/**
 * A damped spring from 0 to 1, baked into a CSS linear() easing.
 *
 * A real spring gives the zoom its momentum, and baking it into linear()
 * keeps it a Web Animation — composited, off the main thread — instead of a
 * per-frame JS loop. Sampled until it has settled; the settle time is the
 * animation's duration.
 */
function springEasing(stiffness: number, damping: number) {
  const dt = 1 / 1000;
  let x = 0;
  let v = 0;
  let t = 0;
  let still = 0;
  const samples: number[] = [];
  while (t < 1.5) {
    v += (-stiffness * (x - 1) - damping * v) * dt;
    x += v * dt;
    t += dt;
    if (Math.round(t * 1000) % 8 === 0) samples.push(x);
    still = Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.02 ? still + dt : 0;
    if (still > 0.03) break;
  }
  const points = [0, ...samples.slice(0, -1), 1].map((n) => +n.toFixed(4));
  return { easing: `linear(${points.join(", ")})`, duration: Math.round(t * 1000) };
}

/*
 * Asymmetric, as an entrance and an exit should be.
 *
 * Open: 90% of the way there in ~120ms, then a settle with the faintest
 * overshoot (under 1% of the travel — a few pixels) so the photo lands with
 * some life instead of stopping dead.
 * Close: critically damped — the same snap, no overshoot at all, a little
 * quicker to finish. An exit should get out of the way, not perform.
 *
 * The backdrop fades on its own matching clock in globals.css.
 */
const OPEN = springEasing(700, 44);
const CLOSE = springEasing(1000, 63);

/* For engines without linear() easing: the nearest cubic, a touch longer. */
const FALLBACK = {
  open: { easing: "cubic-bezier(0.23, 1, 0.32, 1)", duration: 360 },
  close: { easing: "cubic-bezier(0.23, 1, 0.32, 1)", duration: 280 },
};

const supportsLinearEasing = () =>
  typeof CSS !== "undefined" && CSS.supports("transition-timing-function", "linear(0, 1)");

/** How long a click waits for a photo that has not finished decoding. */
const DECODE_WAIT_MS = 1200;

type Phase = "closed" | "opening" | "open" | "closing";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The portrait, which zooms to fill the screen on click and flies home on a
 * click outside it (or Esc).
 *
 * What made the old version jumpy, and what replaced each part:
 *
 *  - The large photo only started downloading on click, so the zoom flew an
 *    empty frame and the photo popped in mid-flight. It is now fetched and
 *    decoded ahead of time — on idle after load, sooner on hover or focus —
 *    and a click waits for decode before anything moves.
 *  - The trip home used fill: "both", which left the shrunk transform on the
 *    photo after closing. The next open measured that transformed box, worked
 *    out a near-zero zoom, and the photo simply appeared. Every animation is
 *    now cancelled before measuring, and removed once the dialog closes.
 *  - The photo faded 60%→100% over a still-visible thumbnail, so both showed
 *    at once at each end. It stays opaque and lands exactly on the thumbnail.
 *  - A second click during the trip home reversed it back out again. A phase
 *    ref now makes every interruption do the one sensible thing.
 */
export default function AvatarZoom({ alt }: { alt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const figureRef = useRef<HTMLImageElement>(null);
  const thumbRef = useRef<HTMLButtonElement>(null);
  const animation = useRef<Animation | null>(null);
  const phase = useRef<Phase>("closed");
  const ready = useRef<Promise<void> | null>(null);

  /** Starts the large photo loading and decoding, once. */
  const prime = useCallback((): Promise<void> => {
    const figure = figureRef.current;
    if (!figure) return Promise.resolve();
    if (!ready.current) {
      // Set imperatively: React never renders a src for this <img>, so it
      // never resets it. decode() resolves once the pixels are ready to paint,
      // and works while the dialog is still display: none.
      figure.src = LARGE_SRC;
      ready.current = figure.decode().catch(() => {
        /* a failed decode still lets the zoom run; the box has its size */
      });
    }
    return ready.current;
  }, []);

  // Prefetch after the page has settled, so a first click is already smooth.
  // 86 kB, after everything that matters for first paint.
  useEffect(() => {
    const idle =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => void prime(), { timeout: 4000 } as never);
    return () => cancel(handle);
  }, [prime]);

  // Scrolling the page behind the open photo moves the spot it flies home to.
  // Blocked at the dialog, rather than with overflow: hidden on the page,
  // which would drop the scrollbar and shift the whole layout sideways.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const block = (event: Event) => event.preventDefault();
    dialog.addEventListener("wheel", block, { passive: false });
    dialog.addEventListener("touchmove", block, { passive: false });
    return () => {
      dialog.removeEventListener("wheel", block);
      dialog.removeEventListener("touchmove", block);
    };
  }, []);

  /** FLIP between the thumbnail and the photo's real box. Transform only. */
  const fly = useCallback((direction: "in" | "out", done: () => void) => {
    const thumb = thumbRef.current;
    const figure = figureRef.current;
    if (!thumb || !figure) return done();

    // Cancel first, measure second. Measuring with an old animation still
    // applied is what used to turn a zoom into a jump.
    animation.current?.cancel();
    const from = thumb.getBoundingClientRect();
    const to = figure.getBoundingClientRect();
    if (!to.width || !to.height) return done();

    const scale = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const collapsed = `translate(${dx}px, ${dy}px) scale(${scale})`;

    figure.style.visibility = "";
    const frames: Keyframe[] =
      direction === "in"
        ? [{ transform: collapsed }, { transform: "none" }]
        : [{ transform: "none" }, { transform: collapsed }];

    const timing = supportsLinearEasing()
      ? direction === "in"
        ? OPEN
        : CLOSE
      : FALLBACK[direction === "in" ? "open" : "close"];
    const run = figure.animate(frames, { ...timing, fill: "both" });
    animation.current = run;
    run.onfinish = done;
  }, []);

  const finishClose = useCallback(() => {
    dialogRef.current?.close();
    // Nothing left behind for the next open to measure through.
    animation.current?.cancel();
    animation.current = null;
    phase.current = "closed";
  }, []);

  const show = useCallback(async () => {
    const dialog = dialogRef.current;
    const figure = figureRef.current;
    if (!dialog || !figure || phase.current !== "closed") return;
    phase.current = "opening";
    haptic();

    const decoded = prime();
    // Laid out (so it can be measured) but not painted until it can fly:
    // no frame ever shows an empty box or the full-size photo pre-zoom.
    figure.style.visibility = "hidden";
    // showModal, not an overlay div: the top layer, a real backdrop, focus
    // trapping and Esc handling all come with it.
    dialog.showModal();

    if (prefersReducedMotion()) {
      figure.style.visibility = "";
      dialog.dataset.open = "true";
      phase.current = "open";
      return;
    }

    // The backdrop starts on the next frame, so the click is acknowledged at
    // once even on the rare occasion the photo is still decoding.
    requestAnimationFrame(() => {
      if (phase.current === "opening") dialog.dataset.open = "true";
    });
    await Promise.race([decoded, wait(DECODE_WAIT_MS)]);
    // Dismissed while waiting: hide() has already dealt with it.
    if (phase.current !== "opening") return;

    fly("in", () => {
      if (phase.current === "opening") phase.current = "open";
    });
  }, [fly, prime]);

  const hide = useCallback(() => {
    const dialog = dialogRef.current;
    const figure = figureRef.current;
    if (!dialog || !figure) return;
    if (phase.current === "closed" || phase.current === "closing") return;

    const wasOpening = phase.current === "opening";
    phase.current = "closing";
    delete dialog.dataset.open; // the backdrop fades on the same clock

    if (prefersReducedMotion()) return finishClose();

    const running = animation.current;
    if (wasOpening && running && running.playState === "running") {
      // Mid-zoom: run the same curve backwards from wherever it is, rather
      // than re-measuring a half-transformed box and jumping.
      running.onfinish = finishClose;
      running.reverse();
      return;
    }
    if (wasOpening) {
      // Still waiting on decode, so nothing has moved: let the backdrop go.
      figure.style.visibility = "hidden";
      window.setTimeout(finishClose, CLOSE.duration);
      return;
    }

    fly("out", finishClose);
  }, [fly, finishClose]);

  return (
    <>
      <button
        ref={thumbRef}
        type="button"
        onClick={() => void show()}
        // Intent: someone about to click gets the photo warmed first.
        onPointerEnter={() => void prime()}
        onFocus={() => void prime()}
        aria-label={`View ${alt} larger`}
        data-keycap=""
        className="avatar-button block cursor-zoom-in rounded-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar-288.webp"
          // 1x-3x of both rendered sizes (96px desktop, 144px phone). 432 is the
          // 3x phone file; the 1024 original stays reserved for the zoom.
          srcSet="/avatar-96.webp 96w, /avatar-144.webp 144w, /avatar-216.webp 216w, /avatar-288.webp 288w, /avatar-432.webp 432w"
          // The rendered size at each breakpoint, so the browser picks the file
          // it actually needs rather than the largest one offered.
          sizes="(max-width: 639px) 144px, 96px"
          alt={alt}
          width={144}
          height={144}
          decoding="async"
          style={{ backgroundImage: `url(${LQIP})` }}
          className="h-[144px] w-[144px] rounded-full bg-cover object-cover sm:h-24 sm:w-24"
        />
      </button>

      <dialog
        ref={dialogRef}
        // Esc fires `cancel`; intercepting it routes the close through the
        // same flight home as a click rather than snapping shut.
        onCancel={(event) => {
          event.preventDefault();
          hide();
        }}
        // The dialog fills the viewport, so a click that lands on it rather
        // than on the photo is a click outside the photo.
        onClick={(event) => {
          if (event.target === dialogRef.current) hide();
        }}
        // Lenis must not smooth-scroll the page underneath the open photo.
        data-lenis-prevent=""
        className="avatar-dialog"
        aria-label={alt}
      >
        {/*
          Always mounted, with its src set by prime(), so it can be fetched and
          decoded before the first click. width/height give it a box to
          measure before the pixels arrive.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={figureRef}
          alt={alt}
          width={1024}
          height={1024}
          decoding="async"
          className="avatar-dialog-img"
          onClick={hide}
        />
      </dialog>
    </>
  );
}
