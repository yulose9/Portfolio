"use client";

import { WELCOME_LIFTING_EVENT } from "@/app/(sections)/hero/PreLoadHero";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to detect when the welcome screen starts lifting
 * This allows hero components to start their animations at the right time
 *
 * @param additionalDelay - Extra delay in seconds after the welcome screen starts lifting (default: 0)
 * @returns Object with:
 *   - isReady: boolean - true when welcome screen has started lifting (plus additional delay)
 *   - triggerNow: function - manually trigger the ready state (useful for testing)
 */
export function useWelcomeScreen(additionalDelay: number = 0) {
  const [isReady, setIsReady] = useState(false);

  const triggerNow = useCallback(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleWelcomeLifting = () => {
      if (additionalDelay > 0) {
        // Add stagger delay for cascading effect
        timeoutId = setTimeout(() => {
          setIsReady(true);
        }, additionalDelay * 1000);
      } else {
        setIsReady(true);
      }
    };

    // Listen for the welcome screen lifting event
    window.addEventListener(WELCOME_LIFTING_EVENT, handleWelcomeLifting);

    // Fallback: if event was already fired before this component mounted
    // Check after a small delay to give time for the event to be set up
    const fallbackTimer = setTimeout(() => {
      // If still not ready after 5 seconds, force ready state
      // This handles cases where user navigated directly or event was missed
      if (!isReady) {
        handleWelcomeLifting();
      }
    }, 5000);

    return () => {
      window.removeEventListener(WELCOME_LIFTING_EVENT, handleWelcomeLifting);
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(fallbackTimer);
    };
  }, [additionalDelay, isReady]);

  return { isReady, triggerNow };
}

/**
 * Stagger delay constants for hero elements (in seconds)
 * These create a nice cascade effect as elements appear
 */
export const HERO_STAGGER = {
  // Mobile stagger delays (relative to welcome screen lifting)
  mobile: {
    highlighter: 0, // First element - appears immediately
    roles: 0.1, // Roles text - slight delay
    gradientText: 0.3, // Main name - after roles start
    scrollPrompt: 0.6, // Scroll indicator - last
  },
  // Desktop stagger delays (relative to welcome screen lifting)
  desktop: {
    locationBadge: 0, // Location badge - appears immediately
    highlighter: 0.1, // Highlighter icon
    roles: 0.2, // Roles text
    gradientText: 0.4, // Main name
    scrollPrompt: 0.7, // Scroll indicator - last
  },
} as const;

export default useWelcomeScreen;
