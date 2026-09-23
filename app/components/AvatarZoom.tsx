"use client";

import { useCallback, useEffect, useRef } from "react";
import { haptic } from "../lib/haptics";

/**
 * A 20px WebP of the same portrait, inlined.
 *
 * It costs no request and paints on the first frame, so the circle is never an
 * empty hole while the real file arrives. At 48-72px the blur is invisible —
 * it just looks like the image loaded instantly.
 */
const LQIP =
  "data:image/webp;base64,UklGRsQAAABXRUJQVlA4ILgAAACwBQCdASoUABQAPt1mq1EopSOiqAgBEBuJagCdMzE";

const LARGE_SRC = "/avatar-1024.webp";

/*
 * One clock for the photo and the backdrop (the CSS reads the same values
 * through --zoom-dur and --zoom-ease). They used to run on separate curves and
 * lengths, and drifting apart is a large part of what read as chaotic.
 *
 * Fast out of the gate, long soft landing: the zoom answers the click on the
 * very next frame instead of easing in first, then settles without a bump.
 */
const ZOOM_MS = 520;
const ZOOM_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

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

    const run = figure.animate(frames, { duration: ZOOM_MS, easing: ZOOM_EASE, fill: "both" });
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
      window.setTimeout(finishClose, ZOOM_MS);
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
        className="avatar-button block cursor-zoom-in rounded-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar-144.webp"
          srcSet="/avatar-96.webp 96w, /avatar-144.webp 144w, /avatar-216.webp 216w, /avatar-288.webp 288w"
          // The rendered size at each breakpoint, so the browser picks the file
          // it actually needs rather than the largest one offered.
          sizes="(max-width: 639px) 72px, 48px"
          alt={alt}
          width={72}
          height={72}
          decoding="async"
          style={{ backgroundImage: `url(${LQIP})` }}
          className="h-[72px] w-[72px] rounded-full bg-cover object-cover sm:h-12 sm:w-12"
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
        style={{ "--zoom-dur": `${ZOOM_MS}ms`, "--zoom-ease": ZOOM_EASE } as React.CSSProperties}
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
