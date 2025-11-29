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

    // Detect mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Initialize Lenis with optimized, platform-specific configuration
    const lenis = new Lenis({
      // Optimized duration: Faster for better responsiveness
      duration: prefersReducedMotion ? 0 : isMobile ? 0.6 : 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      // Disable smooth scrolling if user prefers reduced motion
      smoothWheel: !prefersReducedMotion && !isMobile,
      // Slightly increased for desktop, optimized for mobile
      wheelMultiplier: isMobile ? 1 : 1.1,
      // Reduced for less aggressive mobile scrolling
      touchMultiplier: 1.5,
      infinite: false,
      autoResize: true,
    });

    lenisRef.current = lenis;

    // Expose lenis instance globally for smooth scrolling
    window.lenis = lenis;

    // Start in stopped state - PreLoadHero will start it when ready
    lenis.stop();

    // Listen for preload complete event
    const handlePreloadComplete = () => {
      if (lenisRef.current) {
        lenisRef.current.start();
      }
    };

    window.addEventListener('preloadComplete', handlePreloadComplete);

    // Request animation frame loop
    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      window.removeEventListener('preloadComplete', handlePreloadComplete);
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      delete window.lenis;
    };
  }, []);

  return <>{children}</>;
}
