"use client";

import Lenis from "lenis";
import { ReactNode, useEffect, useRef } from "react";

interface SmoothScrollingProps {
  children: ReactNode;
}

export default function SmoothScrolling({ children }: SmoothScrollingProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Detect mobile devices - more comprehensive check
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth <= 768 ||
      ("ontouchstart" in window && navigator.maxTouchPoints > 0);

    // MOBILE: Skip Lenis entirely and use native scroll
    // This prevents scroll locking bugs on mobile devices
    if (isMobile || prefersReducedMotion) {
      // Create a mock lenis object for components that might reference it
      window.lenis = {
        start: () => {},
        stop: () => {},
        destroy: () => {},
        raf: () => {},
        scrollTo: (target: number | string | HTMLElement) => {
          if (typeof target === "number") {
            window.scrollTo({ top: target, behavior: "smooth" });
          } else if (typeof target === "string") {
            const element = document.querySelector(target);
            element?.scrollIntoView({ behavior: "smooth" });
          } else if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        },
      } as unknown as Lenis;

      // Dispatch preload complete event immediately for mobile
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("preloadComplete"));
      }, 5000);

      return () => {
        delete window.lenis;
      };
    }

    // DESKTOP: Use Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1,
      infinite: false,
      autoResize: true,
    });

    lenisRef.current = lenis;
    window.lenis = lenis;

    // Start in stopped state - PreLoadHero will start it when ready
    lenis.stop();

    // Listen for preload complete event
    const handlePreloadComplete = () => {
      if (lenisRef.current) {
        lenisRef.current.start();
      }
    };

    window.addEventListener("preloadComplete", handlePreloadComplete);

    // Request animation frame loop
    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      window.removeEventListener("preloadComplete", handlePreloadComplete);
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      delete window.lenis;
    };
  }, []);

  return <>{children}</>;
}
