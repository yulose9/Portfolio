"use client";

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

export function useHaptics() {
  const { trigger } = useWebHaptics();
  return useCallback((preset: "light" | "medium" | "heavy" | "selection" = "light") => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void trigger(preset);
  }, [trigger]);
}
