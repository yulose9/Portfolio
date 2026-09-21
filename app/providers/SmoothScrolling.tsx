"use client";

import type Lenis from "lenis";
import { ReactNode, useEffect } from "react";
import { isScrollLocked } from "@/app/utils/scroll-lock";

export default function SmoothScrolling({ children }: { children: ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let lenis: Lenis | undefined;
    let frame = 0;
    let generation = 0;
    const reset = async () => {
      const current = ++generation;
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = undefined;
      delete window.lenis;
      if (!media.matches || navigator.maxTouchPoints > 0) return;
      const { default: Lenis } = await import("lenis");
      if (current !== generation) return;
      lenis = new Lenis({ duration: 0.8, smoothWheel: true, syncTouch: false });
      window.lenis = lenis;
      if (isScrollLocked()) lenis.stop();
      const tick = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    void reset();
    media.addEventListener("change", reset);
    return () => {
      generation++;
      media.removeEventListener("change", reset);
      cancelAnimationFrame(frame);
      lenis?.destroy();
      delete window.lenis;
    };
  }, []);
  return children;
}
