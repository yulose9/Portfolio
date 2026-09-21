"use client";

// Each overlay owns its lock. Never release another overlay's lock on a timer.
const lockedBy = new Set<string>();
let scrollY = 0;
let originalStyles: Pick<CSSStyleDeclaration, "overflow" | "position" | "top" | "width"> | null = null;

export function lockScroll(lockId: string, stopLenis = true): void {
  if (typeof window === "undefined" || lockedBy.has(lockId)) return;
  if (lockedBy.size === 0) {
    scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;
    originalStyles = { overflow, position, top, width };
    Object.assign(document.body.style, {
      overflow: "hidden", position: "fixed", top: `-${scrollY}px`, width: "100%",
    });
  }
  lockedBy.add(lockId);
  if (stopLenis && window.lenis && !window.lenis.isStopped) {
    window.lenis.stop();
  }
}

export function unlockScroll(lockId: string, startLenis = true): void {
  if (!lockedBy.delete(lockId) || lockedBy.size > 0) return;
  if (originalStyles) Object.assign(document.body.style, originalStyles);
  originalStyles = null;
  // Synchronous restoration prevents a queued frame from overriding navigation or a new lock.
  window.scrollTo({ top: scrollY, behavior: "instant" });
  if (startLenis) window.lenis?.start();
}

export function forceUnlockScroll(): void {
  for (const id of Array.from(lockedBy)) unlockScroll(id);
}

export function isScrollLocked(): boolean { return lockedBy.size > 0; }
export function getScrollLockState() {
  return { lockCount: lockedBy.size, lockedBy: new Set(lockedBy), scrollY };
}
