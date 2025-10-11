"use client";

import { useEffect } from "react";

/**
 * ImagePreloader Component
 *
 * Modern approach to preload critical hero images:
 * 1. Uses Link preload with fetchpriority="high" for immediate loading
 * 2. Loads image BEFORE React hydration and component render
 * 3. Leverages browser cache for instant subsequent loads
 * 4. Eliminates content shift and text repositioning on load
 *
 * Based on web.dev best practices for LCP optimization:
 * - Eliminate resource load delay
 * - Optimize when the resource is discovered
 * - Optimize the priority the resource is given
 *
 * Reference: https://web.dev/articles/optimize-lcp
 */
export default function ImagePreloader() {
  useEffect(() => {
    // Preload critical hero image with high priority
    const heroImageLink = document.createElement("link");
    heroImageLink.rel = "preload";
    heroImageLink.as = "image";
    heroImageLink.href = "/7a97f9ff1efd6be56501753f1f090d23d760914c.png";
    heroImageLink.fetchPriority = "high";
    heroImageLink.type = "image/png";

    // Optional: Preload location badge image
    const badgeImageLink = document.createElement("link");
    badgeImageLink.rel = "preload";
    badgeImageLink.as = "image";
    badgeImageLink.href = "/snazzy-image.png";
    badgeImageLink.fetchPriority = "high";
    badgeImageLink.type = "image/png";

    // Add to document head for immediate loading
    document.head.appendChild(heroImageLink);
    document.head.appendChild(badgeImageLink);

    // Cleanup on unmount
    return () => {
      if (document.head.contains(heroImageLink)) {
        document.head.removeChild(heroImageLink);
      }
      if (document.head.contains(badgeImageLink)) {
        document.head.removeChild(badgeImageLink);
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
