"use client";

import { useCallback, useRef, useState } from "react";
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

/*
 * Carried over from the GSAP version in 5576b0b, which is the motion this is
 * meant to feel like: the clone travelled over 0.6s on power3.inOut. GSAP's
 * power curves are cubic-beziers underneath, so the feel survives dropping the
 * dependency. The backdrop's own 0.4s power2.inOut lives in CSS beside it.
 */
const TRAVEL_MS = 600;
const EASE_TRAVEL = "cubic-bezier(0.645, 0.045, 0.355, 1)";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function AvatarZoom({ alt }: { alt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const figureRef = useRef<HTMLImageElement>(null);
  const thumbRef = useRef<HTMLButtonElement>(null);
  const animation = useRef<Animation | null>(null);
  const [open, setOpen] = useState(false);
  // Gates the large file: nothing is fetched until the first open.
  const [everOpened, setEverOpened] = useState(false);

  /**
   * FLIP.
   *
   * The large photo is already laid out where it belongs, so rather than
   * animating its box — which would relayout every frame — we measure where the
   * thumbnail sits, work out the transform that would put the photo exactly
   * there, and animate from that back to nothing. All of it is transform and
   * opacity, so it runs on the compositor.
   */
  const flip = useCallback((direction: "in" | "out", done?: () => void) => {
    const thumb = thumbRef.current;
    const figure = figureRef.current;
    if (!thumb || !figure) {
      done?.();
      return;
    }

    const from = thumb.getBoundingClientRect();
    const to = figure.getBoundingClientRect();
    if (!to.width || !to.height) {
      done?.();
      return;
    }

    const scale = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const collapsed = `translate(${dx}px, ${dy}px) scale(${scale})`;

    const frames: Keyframe[] = [
      { transform: collapsed, opacity: 0.6 },
      { transform: "none", opacity: 1 },
    ];

    animation.current?.cancel();
    animation.current = figure.animate(
      direction === "in" ? frames : [...frames].reverse(),
      { duration: TRAVEL_MS, easing: EASE_TRAVEL, fill: "both" }
    );
    animation.current.onfinish = () => done?.();
  }, []);

  const show = useCallback(() => {
    haptic();
    setEverOpened(true);
    // showModal, not an overlay div: it brings the top layer, a real backdrop,
    // focus trapping and Esc handling with it.
    dialogRef.current?.showModal();
    setOpen(true);

    if (prefersReducedMotion()) return;
    // Wait a frame so the photo has been laid out and can be measured.
    requestAnimationFrame(() => flip("in"));
  }, [flip]);

  const hide = useCallback(() => {
    // Drops data-open, which starts the backdrop fading on its own shorter
    // clock. The photo flies home over the longer one.
    setOpen(false);

    if (prefersReducedMotion()) {
      dialogRef.current?.close();
      return;
    }

    const running = animation.current;
    if (running && running.playState === "running") {
      /*
       * Still opening. Reverse from wherever it currently is rather than
       * starting a fresh trip home: flip() measures getBoundingClientRect,
       * which during a running animation returns the half-applied transformed
       * box, so a new animation would compute its start from the wrong place
       * and visibly jump. reverse() just runs the same curve backwards from
       * the current time.
       */
      running.onfinish = () => dialogRef.current?.close();
      running.reverse();
      return;
    }

    flip("out", () => dialogRef.current?.close());
  }, [flip]);

  return (
    <>
      <button
        ref={thumbRef}
        type="button"
        onClick={show}
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
        data-open={open}
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
        className="avatar-dialog"
        aria-label={alt}
      >
        {everOpened ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={figureRef}
            src="/avatar-1024.webp"
            alt={alt}
            width={1024}
            height={1024}
            className="avatar-dialog-img"
            onClick={hide}
          />
        ) : null}
      </dialog>
    </>
  );
}
