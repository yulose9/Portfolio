"use client";

import Lenis from "lenis";
import { ReactNode, useEffect } from "react";

interface SmoothScrollingProps {
  children: ReactNode;
}

export default function SmoothScrolling({ children }: SmoothScrollingProps) {
  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Initialize Lenis with optimized, platform-specific configuration
    const lenis = new Lenis({
      // Optimized duration: Faster for better responsiveness
      // 0.8s feels snappier than 1.2s while still being smooth
      duration: prefersReducedMotion ? 0 : (isMobile ? 0.6 : 0.8),
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      // Disable smooth scrolling if user prefers reduced motion
      smoothWheel: !prefersReducedMotion && !isMobile,
      // Slightly increased for desktop, optimized for mobile
      wheelMultiplier: isMobile ? 1 : 1.1,
      // Reduced from 2 to 1.5 for less aggressive mobile scrolling
      touchMultiplier: 1.5,
      infinite: false,
      autoResize: true,
    });

    // Expose lenis instance globally for smooth scrolling
    window.lenis = lenis;

    // Prevent horizontal scrolling
    const preventHorizontalScroll = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", preventHorizontalScroll, {
      passive: false,
    });

    // Request animation frame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
      delete window.lenis;
      window.removeEventListener("wheel", preventHorizontalScroll);
    };
  }, []);

  return <>{children}</>;
}
