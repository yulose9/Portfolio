"use client";

/**
 * Centralized scroll lock manager
 *
 * This solves the issue of multiple components trying to lock/unlock scroll
 * independently, which can leave scroll stuck in a locked state.
 *
 * Uses a ref-counting approach:
 * - Multiple components can request a lock
 * - Scroll is only restored when ALL locks are released
 * - Provides emergency unlock for stuck states
 *
 * MOBILE OPTIMIZATION:
 * - On mobile, we use a lighter-weight scroll lock that doesn't break native scrolling
 * - Auto-unlock mechanism prevents scroll from getting stuck
 */

interface ScrollLockState {
  lockCount: number;
  lockedBy: Set<string>;
  scrollY: number;
  originalStyles: {
    overflow: string;
    position: string;
    top: string;
    width: string;
    touchAction: string;
  } | null;
  autoUnlockTimer: NodeJS.Timeout | null;
}

const state: ScrollLockState = {
  lockCount: 0,
  lockedBy: new Set(),
  scrollY: 0,
  originalStyles: null,
  autoUnlockTimer: null,
};

// Detect mobile - used for lighter scroll lock approach
const isMobile =
  typeof window !== "undefined" &&
  (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.innerWidth <= 768 ||
    ("ontouchstart" in window && navigator.maxTouchPoints > 0));

// Auto-unlock after this duration to prevent stuck scroll (mobile only)
// Reduced to 5 seconds for faster recovery on mobile
const AUTO_UNLOCK_MS = 5000; // 5 seconds

// Debug mode - set to true to log all lock/unlock operations
const DEBUG = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (DEBUG) {
    console.log("[ScrollLock]", ...args);
  }
}

/**
 * Lock scrolling on the page
 * @param lockId - Unique identifier for the lock (e.g., "mobile-nav", "drag-drop")
 * @param stopLenis - Whether to also stop Lenis smooth scrolling
 */
export function lockScroll(lockId: string, stopLenis = true): void {
  // Already locked by this component
  if (state.lockedBy.has(lockId)) {
    log(`${lockId} already has a lock, skipping`);
    return;
  }

  // Clear any existing auto-unlock timer
  if (state.autoUnlockTimer) {
    clearTimeout(state.autoUnlockTimer);
    state.autoUnlockTimer = null;
  }

  const isFirstLock = state.lockCount === 0;

  state.lockCount++;
  state.lockedBy.add(lockId);

  log(
    `Lock acquired by ${lockId}, total locks: ${state.lockCount}, locked by:`,
    [...state.lockedBy]
  );

  if (isFirstLock) {
    // Store scroll position and original styles only on first lock
    state.scrollY = window.scrollY;
    state.originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      touchAction: document.body.style.touchAction,
    };

    // Universal scroll lock approach
    // We use position: fixed for both mobile and desktop to prevent "stuck" scroll behavior
    // This is more robust than just overflow: hidden on iOS
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${state.scrollY}px`;
    document.body.style.width = "100%";

    // Only set touch-action: none on desktop
    // On mobile, we keep the default (or global) touch-action to allow inner scrolling
    if (!isMobile) {
      document.body.style.touchAction = "none";
    }

    // Stop Lenis if requested and available (no-op on mobile with mock)
    if (stopLenis && window.lenis) {
      window.lenis.stop();
      log("Lenis stopped");
    }

    // Set auto-unlock timer on mobile as a safety net (shorter timeout)
    if (isMobile) {
      state.autoUnlockTimer = setTimeout(() => {
        log("Auto-unlock triggered after timeout");
        forceUnlockScroll();
      }, AUTO_UNLOCK_MS);
    }
  }
}

/**
 * Unlock scrolling on the page
 * @param lockId - The unique identifier used when locking
 * @param startLenis - Whether to also start Lenis smooth scrolling
 */
export function unlockScroll(lockId: string, startLenis = true): void {
  // This component doesn't have a lock
  if (!state.lockedBy.has(lockId)) {
    log(`${lockId} doesn't have a lock, skipping unlock`);
    return;
  }

  // Clear auto-unlock timer
  if (state.autoUnlockTimer) {
    clearTimeout(state.autoUnlockTimer);
    state.autoUnlockTimer = null;
  }

  state.lockCount--;
  state.lockedBy.delete(lockId);

  log(
    `Lock released by ${lockId}, remaining locks: ${state.lockCount}, locked by:`,
    [...state.lockedBy]
  );

  // Only restore scroll when all locks are released
  if (state.lockCount === 0) {
    const scrollY = state.scrollY;

    // Restore original styles
    if (state.originalStyles) {
      document.body.style.overflow = state.originalStyles.overflow;
      document.body.style.position = state.originalStyles.position;
      document.body.style.top = state.originalStyles.top;
      document.body.style.width = state.originalStyles.width;
      document.body.style.touchAction = state.originalStyles.touchAction;
    } else {
      // Fallback: clear all styles
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.touchAction = "";
    }

    // Restore scroll position AFTER a paint frame.
    // On iOS Safari, calling scrollTo() synchronously after removing
    // position:fixed doesn't work — the browser hasn't repainted yet.
    // requestAnimationFrame ensures styles are applied first.
    const restoreScroll = () => {
      window.scrollTo(0, scrollY);

      // Force reflow to prevent stuck scroll on mobile Safari
      if (isMobile) {
        void document.body.offsetHeight;
      }

      // Start Lenis if requested and available (no-op on mobile with mock)
      if (startLenis && window.lenis) {
        window.lenis.start();
        log("Lenis started");
      }

      log("Scroll fully unlocked and restored");
    };

    // Reset state immediately (before rAF so any re-lock during the frame works)
    state.originalStyles = null;
    state.scrollY = 0;

    requestAnimationFrame(restoreScroll);
  }
}

/**
 * Force unlock all scroll locks
 * Use this as an emergency escape hatch when scroll gets stuck
 */
export function forceUnlockScroll(): void {
  log("FORCE UNLOCK - clearing all locks:", [...state.lockedBy]);

  // Clear auto-unlock timer
  if (state.autoUnlockTimer) {
    clearTimeout(state.autoUnlockTimer);
    state.autoUnlockTimer = null;
  }

  // Clear all state
  state.lockCount = 0;
  state.lockedBy.clear();

  // Force clear all body styles that could block scroll
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.touchAction = "";
  document.body.style.pointerEvents = "";

  // Also clear on html element
  document.documentElement.style.overflow = "";
  document.documentElement.style.touchAction = "";

  // Force reflow
  if (isMobile) {
    document.body.offsetHeight;
  }

  // Start Lenis if available
  if (window.lenis) {
    window.lenis.start();
  }

  // Reset state
  state.originalStyles = null;
  state.scrollY = 0;

  log("Force unlock complete");
}

/**
 * Check if scroll is currently locked
 */
export function isScrollLocked(): boolean {
  return state.lockCount > 0;
}

/**
 * Get current lock state (for debugging)
 */
export function getScrollLockState(): Readonly<ScrollLockState> {
  return { ...state, lockedBy: new Set(state.lockedBy) };
}

// Add emergency unlock on triple-tap (mobile) or pressing Escape 3 times quickly
if (typeof window !== "undefined") {
  let escapeCount = 0;
  let escapeTimer: NodeJS.Timeout | null = null;

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      escapeCount++;

      if (escapeTimer) clearTimeout(escapeTimer);

      if (escapeCount >= 3) {
        log("Emergency unlock triggered by triple Escape");
        forceUnlockScroll();
        escapeCount = 0;
      }

      escapeTimer = setTimeout(() => {
        escapeCount = 0;
      }, 1000);
    }
  });

  // Triple tap detection for mobile
  let tapCount = 0;
  let tapTimer: NodeJS.Timeout | null = null;

  window.addEventListener(
    "touchstart",
    (e) => {
      // Only trigger if using 3 fingers
      if (e.touches.length === 3) {
        tapCount++;

        if (tapTimer) clearTimeout(tapTimer);

        if (tapCount >= 1) {
          // Just one 3-finger tap
          log("Emergency unlock triggered by 3-finger tap");
          forceUnlockScroll();
          tapCount = 0;
        }

        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 1000);
      }
    },
    { passive: true }
  );

  // MOBILE SAFETY: Periodic check to detect stuck scroll state
  // If body has overflow:hidden but no locks are registered, force unlock
  if (isMobile) {
    setInterval(() => {
      const bodyOverflow = document.body.style.overflow;
      const hasLocks = state.lockCount > 0;

      // Detect inconsistent state: body is locked but no components claim the lock
      if (bodyOverflow === "hidden" && !hasLocks) {
        log("Detected orphan scroll lock - forcing unlock");
        forceUnlockScroll();
      }
    }, 2000); // Check every 2 seconds
  }
}
