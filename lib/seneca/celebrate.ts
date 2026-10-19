"use client";
import confetti from "canvas-confetti";

/**
 * A phase of the protocol was just finished by a tick (never by a reload or
 * a cloud sync). ProtocolContext raises it; Home's card and the app shell
 * answer it.
 */
export const PHASE_COMPLETE = "seneca:phase-complete";

export type PhaseComplete = {
  category: string;
  phaseId: string;
  title: string;
  emoji: string;
  total: number;
  nextPhaseId: string | null;
  nextTitle: string | null;
  nextEmoji: string | null;
  /** Every phase of the category is now done. */
  allDone: boolean;
};

const PALETTE = ["#F5A55B", "#5F8F69", "#FBE7A1", "#E2625C", "#F3C945", "#ffffff"];

/** Palette confetti from an element (or the top of the screen); bigger for a finished day. */
export function burst(from: Element | null, big = false) {
  if (typeof window === "undefined") return;
  const rect = from?.getBoundingClientRect();
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + Math.min(rect.height, 220) / 2) / window.innerHeight }
    : { x: 0.5, y: 0.35 };
  const base = { origin, colors: PALETTE, disableForReducedMotion: true, ticks: 220, gravity: 0.9, scalar: 0.95, zIndex: 9999 };
  confetti({ ...base, particleCount: big ? 120 : 60, spread: big ? 100 : 70, startVelocity: big ? 42 : 32 });
  if (big) {
    window.setTimeout(() => confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 180);
    window.setTimeout(() => confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 260);
  }
}
