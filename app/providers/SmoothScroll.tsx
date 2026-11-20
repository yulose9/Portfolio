"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type LenisLike = { destroy: () => void; raf: (time: number) => void; stop: () => void; start: () => void };

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
 *
 * It also owns where a page change lands, because Lenis keeps its own target
 * position across pages and would otherwise glide the new page toward the
 * old page's scroll (a link from halfway down home opened /writing near its
 * bottom):
 *
 *   - Following a link opens the new page at the top.
 *   - Back and Forward keep the browser's restored position on a subpage...
 *   - ...but home always opens at the top, by a link or by Back: it is where
 *     every subpage returns to, and landing halfway down an old scroll
 *     position reads as being dropped somewhere, not as going home.
 *   - A link to a section (/#projects) still goes to its section.
 *
 * In every case Lenis is then re-synced to the real scroll (stop/start snaps
 * its target to it), so it never glides back to a stale position.
 */
export default function SmoothScroll() {
  const pathname = usePathname();
  const instance = useRef<LenisLike | undefined>(undefined);

  // Whether the page change in flight was started by following a link, and
  // where each page was left. A link navigation always begins with a click on
  // a link; Back and Forward never do. (popstate can't tell us: the router
  // re-renders inside its own popstate listener, before ours runs.) The
  // browser's own restoration can't be trusted either: the jump to the top of
  // the next page can land before the router records the page being left.
  const viaLink = useRef(false);
  const leftAt = useRef(new Map<string, number>());
  const lastPath = useRef(pathname);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
      viaLink.current = true;
      leftAt.current.set(window.location.pathname + window.location.search, window.scrollY);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const restoring = !viaLink.current;
    viaLink.current = false;
    const hash = Boolean(window.location.hash);
    const toTop = !hash && (pathname === "/" || !restoring);
    const back = restoring && !toTop && !hash ? leftAt.current.get(pathname + window.location.search) : undefined;

    const land = () => {
      if (toTop) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      else if (back !== undefined) window.scrollTo({ top: back, left: 0, behavior: "instant" });
      const lenis = instance.current;
      if (lenis) {
        lenis.stop();
        lenis.start();
      }
    };
    land();
    // Again after the router (or the browser, on Back) has placed the page.
    const frame = requestAnimationFrame(land);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );

    let lenis: LenisLike | undefined;
    let frame = 0;
    // Guards against a second `sync` resolving after a later one already did,
    // which would leave an orphaned instance running its own RAF loop.
    let generation = 0;

    const sync = async () => {
      const current = ++generation;

      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = undefined;
      instance.current = undefined;

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
      instance.current = lenis;

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
