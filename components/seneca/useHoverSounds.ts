"use client";
import { useEffect, type RefObject } from "react";
import { playSound } from "@/app/components/ui/sound";

// What counts as "a control you can press" for the hover cue.
const HOVERABLE = 'button:not(:disabled), a[href], [role="button"], [role="tab"], [role="checkbox"], .sn-day[data-pct]';

/**
 * A breath of sound when the pointer lands on a control inside Seneca —
 * the hover counterpart to the global press cues. One delegated listener;
 * mouse and pen only (touch has no hover); it plays once per control, and
 * no more than every 70ms, so sweeping across a row doesn't chatter. Mute
 * and reduced motion are honoured by playSound itself.
 */
export function useHoverSounds(root: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const el = root.current;
    if (!active || !el || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    let last: Element | null = null;
    let at = 0;
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = (event.target as Element | null)?.closest?.(HOVERABLE);
      if (!target || target === last || !el.contains(target)) return;
      last = target;
      const now = performance.now();
      if (now - at < 70) return;
      at = now;
      playSound("hover");
    };
    const onOut = (event: PointerEvent) => {
      // Leaving to empty space resets, so returning to the same control sounds again.
      const to = (event.relatedTarget as Element | null)?.closest?.(HOVERABLE);
      if (!to) last = null;
    };
    el.addEventListener("pointerover", onOver);
    el.addEventListener("pointerout", onOut);
    return () => {
      el.removeEventListener("pointerover", onOver);
      el.removeEventListener("pointerout", onOut);
    };
  }, [root, active]);
}
