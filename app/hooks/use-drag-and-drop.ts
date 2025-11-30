"use client";

import { lockScroll, unlockScroll } from "@/app/utils/scroll-lock";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface DragItem {
  id: string;
  index: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  targetIndex: number | null;
  position: Position;
  offset: Position;
  startPosition: Position;
}

interface UseDragAndDropOptions<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  dragDelay?: number; // Long press delay in ms (iOS-style)
  hapticFeedback?: boolean;
  lockId?: string; // Optional custom lock ID
  movementThreshold?: number; // Movement threshold to cancel long press (default 10px)
}

/**
 * iOS-style drag and drop hook with touch support
 * Implements Apple HIG drag and drop patterns:
 * - Long press to initiate drag
 * - Visual lift effect
 * - Haptic feedback (where supported)
 * - Smooth animations
 *
 * References:
 * - https://developer.apple.com/design/human-interface-guidelines/drag-and-drop
 * - https://web.dev/articles/mobile-touch
 *
 * Bug fixes applied:
 * - Added movement threshold to cancel long press if user moves before timer fires
 * - Fixed stale closure issues by using refs for critical state
 * - Added touchcancel event handling for iOS Safari
 * - Added throttling for drag move events
 * - Improved cleanup on unmount
 */
export function useDragAndDrop<T extends { id?: string; title?: string }>({
  items,
  onReorder,
  dragDelay = 350, // 350ms long press - reduced for better responsiveness
  hapticFeedback = true,
  lockId: customLockId,
  movementThreshold = 10, // 10px movement cancels long press
}: UseDragAndDropOptions<T>) {
  // Generate stable unique ID for this hook instance
  const instanceId = useId();
  const lockId = customLockId || `drag-drop-${instanceId}`;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    targetIndex: null,
    position: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
  });

  // Refs to avoid stale closures - these are the source of truth
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const isDraggingRef = useRef(false);
  const startPosRef = useRef<Position>({ x: 0, y: 0 });
  const dragStateRef = useRef<DragState>(dragState);
  const itemsRef = useRef<T[]>(items);

  // Throttle ref for drag move
  const lastMoveTime = useRef<number>(0);
  const THROTTLE_MS = 16; // ~60fps

  // Keep refs in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Clear long press timer safely
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Safety: Clear timer on scroll to prevent accidental locks during scrolling
  useEffect(() => {
    const handleScroll = () => {
      clearLongPressTimer();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [clearLongPressTimer]);

  // Trigger haptic feedback if available
  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "heavy" = "medium") => {
      if (!hapticFeedback) return;

      // Try Vibration API (works on Android and some iOS browsers)
      if ("vibrate" in navigator) {
        const duration = type === "light" ? 10 : type === "medium" ? 20 : 30;
        try {
          navigator.vibrate(duration);
        } catch {
          // Vibration API may throw on some browsers
        }
      }
    },
    [hapticFeedback]
  );

  // Get element center position
  const getElementCenter = useCallback((element: HTMLElement): Position => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  // Find which item is at a given position - improved algorithm
  const findItemAtPosition = useCallback(
    (x: number, y: number): number | null => {
      let closestIndex: number | null = null;
      let closestDistance = Infinity;

      for (const [index, element] of itemRefs.current.entries()) {
        const rect = element.getBoundingClientRect();

        // First check if point is within element bounds
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          return index;
        }

        // Calculate distance to center for fallback
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        // Only consider if within reasonable range (1.5x the element size)
        const maxDistance = Math.max(rect.width, rect.height) * 1.5;
        if (distance < closestDistance && distance < maxDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }

      return closestIndex;
    },
    []
  );

  // Start drag operation
  const startDrag = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const element = itemRefs.current.get(index);
      if (!element) return;

      const rect = element.getBoundingClientRect();

      isDraggingRef.current = true;
      clearLongPressTimer();
      triggerHaptic("medium");

      const newState: DragState = {
        isDragging: true,
        draggedIndex: index,
        targetIndex: index,
        position: { x: clientX, y: clientY },
        offset: {
          x: clientX - rect.left,
          y: clientY - rect.top,
        },
        startPosition: { x: rect.left, y: rect.top },
      };

      dragStateRef.current = newState;
      setDragState(newState);

      // Use centralized scroll lock
      lockScroll(lockId, true);
    },
    [triggerHaptic, lockId, clearLongPressTimer]
  );

  // Handle drag move - with throttling
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;

      // Throttle updates for performance
      const now = Date.now();
      if (now - lastMoveTime.current < THROTTLE_MS) return;
      lastMoveTime.current = now;

      const targetIndex = findItemAtPosition(clientX, clientY);

      setDragState((prev) => ({
        ...prev,
        position: { x: clientX, y: clientY },
        targetIndex: targetIndex !== null ? targetIndex : prev.targetIndex,
      }));
    },
    [findItemAtPosition]
  );

  // End drag operation - uses refs to avoid stale closure
  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    // Use refs for current state to avoid stale closures
    const { draggedIndex, targetIndex } = dragStateRef.current;
    const currentItems = itemsRef.current;

    if (
      draggedIndex !== null &&
      targetIndex !== null &&
      draggedIndex !== targetIndex
    ) {
      // Reorder items
      const newItems = [...currentItems];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);

      triggerHaptic("light");
      onReorder(newItems);
    }

    isDraggingRef.current = false;

    // Use centralized scroll unlock
    unlockScroll(lockId, true);

    const resetState: DragState = {
      isDragging: false,
      draggedIndex: null,
      targetIndex: null,
      position: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      startPosition: { x: 0, y: 0 },
    };

    dragStateRef.current = resetState;
    setDragState(resetState);
  }, [onReorder, triggerHaptic, lockId]);

  // Cancel drag operation
  const cancelDrag = useCallback(() => {
    clearLongPressTimer();

    if (isDraggingRef.current) {
      isDraggingRef.current = false;

      // Use centralized scroll unlock
      unlockScroll(lockId, true);

      const resetState: DragState = {
        isDragging: false,
        draggedIndex: null,
        targetIndex: null,
        position: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        startPosition: { x: 0, y: 0 },
      };

      dragStateRef.current = resetState;
      setDragState(resetState);
    }
  }, [lockId, clearLongPressTimer]);

  // Check if movement exceeds threshold (cancels long press)
  const hasExceededThreshold = useCallback(
    (clientX: number, clientY: number): boolean => {
      const dx = Math.abs(clientX - startPosRef.current.x);
      const dy = Math.abs(clientY - startPosRef.current.y);
      return dx > movementThreshold || dy > movementThreshold;
    },
    [movementThreshold]
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (index: number, e: React.TouchEvent) => {
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      // Store start position for movement threshold check
      startPosRef.current = { x: startX, y: startY };

      // Start long press timer
      clearLongPressTimer();
      longPressTimer.current = setTimeout(() => {
        startDrag(index, startX, startY);
      }, dragDelay);
    },
    [dragDelay, startDrag, clearLongPressTimer]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];

      // Cancel long press if moved before timer fires
      if (longPressTimer.current && !isDraggingRef.current) {
        if (hasExceededThreshold(touch.clientX, touch.clientY)) {
          clearLongPressTimer();
        }
      }

      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        handleDragMove(touch.clientX, touch.clientY);
      }
    },
    [handleDragMove, clearLongPressTimer, hasExceededThreshold]
  );

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();
    endDrag();
  }, [endDrag, clearLongPressTimer]);

  // Handle touch cancel (iOS Safari specific - fires when system takes over)
  const handleTouchCancel = useCallback(() => {
    cancelDrag();
  }, [cancelDrag]);

  // Mouse event handlers (for desktop)
  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;

      const startX = e.clientX;
      const startY = e.clientY;

      // Store start position for movement threshold check
      startPosRef.current = { x: startX, y: startY };

      // Start long press timer
      clearLongPressTimer();
      longPressTimer.current = setTimeout(() => {
        startDrag(index, startX, startY);
      }, dragDelay);
    },
    [dragDelay, startDrag, clearLongPressTimer]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Cancel long press if moved before timer fires
      if (longPressTimer.current && !isDraggingRef.current) {
        if (hasExceededThreshold(e.clientX, e.clientY)) {
          clearLongPressTimer();
        }
      }

      if (isDraggingRef.current) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
      }
    },
    [handleDragMove, clearLongPressTimer, hasExceededThreshold]
  );

  const handleMouseUp = useCallback(() => {
    clearLongPressTimer();
    endDrag();
  }, [endDrag, clearLongPressTimer]);

  // Global mouse/touch move and up handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Cancel long press if moved before timer fires
      if (longPressTimer.current && !isDraggingRef.current) {
        if (hasExceededThreshold(e.clientX, e.clientY)) {
          clearLongPressTimer();
        }
      }

      if (isDraggingRef.current) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = () => {
      clearLongPressTimer();
      endDrag();
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
          handleDragMove(touch.clientX, touch.clientY);
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      clearLongPressTimer();
      endDrag();
    };

    // iOS Safari specific - fires when system gesture takes over
    const handleGlobalTouchCancel = () => {
      cancelDrag();
    };

    // Escape key to cancel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelDrag();
      }
    };

    // Handle visibility change (tab switch, app switch on mobile)
    const handleVisibilityChange = () => {
      if (document.hidden && isDraggingRef.current) {
        cancelDrag();
      }
    };

    // Handle window blur (another app takes focus)
    const handleWindowBlur = () => {
      if (isDraggingRef.current) {
        cancelDrag();
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleGlobalTouchEnd);
    window.addEventListener("touchcancel", handleGlobalTouchCancel);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
      window.removeEventListener("touchcancel", handleGlobalTouchCancel);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);

      // Cleanup: ensure scroll is unlocked when component unmounts
      if (isDraggingRef.current) {
        unlockScroll(lockId, true);
        isDraggingRef.current = false;
      }

      // Clear any pending timers
      clearLongPressTimer();
    };
  }, [
    handleDragMove,
    endDrag,
    cancelDrag,
    lockId,
    clearLongPressTimer,
    hasExceededThreshold,
  ]);

  // Register item ref
  const registerItem = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element) {
        itemRefs.current.set(index, element);
      } else {
        itemRefs.current.delete(index);
      }
    },
    []
  );

  // Get drag handlers for an item
  const getDragHandlers = useCallback(
    (index: number) => ({
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(index, e),
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(index, e),
    }),
    [
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleTouchCancel,
      handleMouseDown,
    ]
  );

  return {
    dragState,
    containerRef,
    registerItem,
    getDragHandlers,
    cancelDrag,
  };
}

export default useDragAndDrop;
