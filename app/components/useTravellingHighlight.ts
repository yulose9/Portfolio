"use client";

import { useCallback, useRef, useState } from "react";

import { playSound } from "./ui/sound";

/*
 * Used by the home page's lists (TabbedIndex) and the Writing index, so a row
 * highlight looks and moves the same everywhere. Pair it with an element
 * carrying .list-highlight (globals.css) and rows whose refs are in rowRefs.
 */

/**
 * One highlight surface that travels to whichever row the pointer is over.
 *
 * Shared by the entry lists and the links list, which were doing this
 * identically. A background that fades in per row makes moving between rows
 * two events — one surface leaving, another arriving — and the eye reads that
 * as a blink. A single element moving is one continuous event.
 *
 * Geometry is driven imperatively so React never fights the inline transform,
 * and all four values come from the same offsetParent that positions the
 * highlight, so no correction is needed.
 */
export function useTravellingHighlight() {
  const [hovered, setHovered] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const highlightRef = useRef<HTMLDivElement>(null);
  const idle = useRef(true);
  const lastSoundedRow = useRef<number | null>(null);

  const enter = useCallback((index: number) => {
    const row = rowRefs.current[index];
    const highlight = highlightRef.current;
    if (!row || !highlight) return;

    if (
      lastSoundedRow.current !== index &&
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      lastSoundedRow.current = index;
      playSound("select", { detune: Math.min(index, 7) * 55, velocity: 0.35 });
    }

    // Arriving from idle it should fade in under the cursor rather than slide
    // across from whichever row the pointer left last. Suppress the
    // transition, set the geometry, flush a reflow, restore it.
    if (idle.current) highlight.style.transition = "none";

    highlight.style.transform = `translate(${row.offsetLeft}px, ${row.offsetTop}px)`;
    highlight.style.width = `${row.offsetWidth}px`;
    highlight.style.height = `${row.offsetHeight}px`;

    if (idle.current) {
      void highlight.offsetHeight;
      highlight.style.transition = "";
    }

    idle.current = false;
    setHovered(index);
  }, []);

  const leave = useCallback(() => {
    idle.current = true;
    lastSoundedRow.current = null;
    setHovered(null);
  }, []);

  /*
   * The highlight follows keyboard focus as well as the pointer, so it must
   * let go of both: when focus leaves the list, and when the pointer leaves
   * unless a row still holds keyboard focus (then the highlight stays on it).
   */
  const wrapperProps = {
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
      if (!event.currentTarget.querySelector(":focus-visible")) leave();
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) leave();
    },
  };

  return { hovered, rowRefs, highlightRef, enter, leave, wrapperProps };
}
