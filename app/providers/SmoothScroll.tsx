"use client";

import { useEffect } from "react";

/**
 * Subtle smooth scrolling on desktop pointers only.
 *
 * Three gates, and each one is load-bearing:
 *
 *  - `hover: hover` + `pointer: fine` limits this to a mouse or trackpad. Lenis
 *    hijacking touch scrolling is what caused the iOS scroll freezes fixed in
 *    295f778, and the fix then was the same as the rule here: let phones use
 *    native scrolling.
 *  - `prefers-reduced-motion: no-preference` skips it entirely for anyone who
 *    has asked the OS for less motion. Smoothing scroll is motion they did not
 *    ask for and cannot opt out of once it is running.
 *  - `navigator.maxTouchPoints` catches touchscreen laptops, which satisfy the
 *    media query above but still want their finger to move the page directly.
 *
 * Lenis is imported dynamically, so it never enters the bundle for the phones
 * and reduced-motion users who will never run it.
 *
 * To remove all of this: delete this file and its one line in layout.tsx, then
 * `npm rm lenis`. Nothing else references it.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );

    let lenis: { destroy: () => void; raf: (time: number) => void } | undefined;
    let frame = 0;
    // Guards against a second `sync` resolving after a later one already did,
    // which would leave an orphaned instance running its own RAF loop.
    let generation = 0;

    const sync = async () => {
      const current = ++generation;

      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = undefined;

      if (!media.matches || navigator.maxTouchPoints > 0) return;

      const { default: Lenis } = await import("lenis");
      if (current !== generation) return;

      lenis = new Lenis({
        // Lenis defaults to 1.2, which glides long enough to feel like the page
        // is catching up with you. 0.85 keeps the smoothing without the lag.
        duration: 0.85,
        smoothWheel: true,
        // Never take over touch, even if one somehow reaches this far.
        syncTouch: false,
      });

      const tick = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    void sync();

    // Plugging in a mouse, or changing the reduced-motion setting, re-evaluates
    // without a reload.
    media.addEventListener("change", sync);

    return () => {
      generation++;
      media.removeEventListener("change", sync);
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);

  return null;
}
