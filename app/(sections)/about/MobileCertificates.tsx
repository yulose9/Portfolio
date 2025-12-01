"use client";

import { lockScroll, unlockScroll } from "@/app/utils/scroll-lock";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Unique lock ID for this component
const SCROLL_LOCK_ID = "mobile-certificates-drag";

// Configuration constants
const LONG_PRESS_DELAY = 250; // Increased to 500ms to prevent accidental triggers
const MOVEMENT_THRESHOLD = 10; // 10px movement cancels long press
const THROTTLE_MS = 16; // ~60fps for smooth updates
const TAP_THRESHOLD = 250; // Max duration for a tap (must be < LONG_PRESS_DELAY)

// Simplified certificate data matching desktop
interface Certificate {
  id: string;
  title: string;
  issuingOrg: string;
  date: string;
  image: string;
  credentialUrl: string;
}

interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  draggedIndex: number | null;
  currentPosition: { x: number; y: number };
  offset: { x: number; y: number };
  targetIndex: number | null;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedId: null,
  draggedIndex: null,
  currentPosition: { x: 0, y: 0 },
  offset: { x: 0, y: 0 },
  targetIndex: null,
};

const initialCertificates: Certificate[] = [
  {
    id: "cert-azure",
    title: "Azure Fundamentals",
    issuingOrg: "Microsoft",
    date: "Oct 2024",
    image: "/images/certifications/microsoft-certified-fundamentals-badge.svg",
    credentialUrl:
      "https://learn.microsoft.com/api/credentials/share/en-us/JohnNazareneDelaPisa-8958/D57215FE29EAA434?sharingId",
  },
  {
    id: "cert-gcp",
    title: "Cloud Digital Leader",
    issuingOrg: "Google",
    date: "Jan 2025",
    image: "/images/certifications/googlecloudpractitioner.png",
    credentialUrl:
      "https://www.credly.com/badges/95d75765-13fa-4c81-802c-834c0217da8a/linked_in_profile",
  },
  {
    id: "cert-terraform",
    title: "Terraform Associate",
    issuingOrg: "HashiCorp",
    date: "Feb 2025",
    image: "/images/certifications/TerraformAssociate.png",
    credentialUrl:
      "https://www.credly.com/badges/bebd520f-8e29-4ec4-9f11-22a35b047349/linked_in_profile",
  },
  {
    id: "cert-copilot",
    title: "GitHub Copilot",
    issuingOrg: "Microsoft",
    date: "Oct 2025",
    image: "/images/certifications/Github_Copilot_badge.png",
    credentialUrl: "",
  },
];

/**
 * iOS-style Drag and Drop implementation
 * Following Apple HIG: https://developer.apple.com/design/human-interface-guidelines/drag-and-drop
 *
 * Key behaviors:
 * - Long press (500ms) to lift item
 * - Visual lift with shadow and scale
 * - Smooth spring animations for reordering
 * - Haptic feedback where supported
 * - No visible drag handles
 *
 * Bug fixes applied:
 * - Fixed stale closure issues using refs for critical state
 * - Added movement threshold to cancel long press
 * - Added touchcancel handling for iOS Safari
 * - Added throttling for drag move events
 * - Improved cleanup on unmount
 * - Added visibility change and window blur handlers
 */
export default function MobileCertificates() {
  const [certificates, setCertificates] = useState(initialCertificates);
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const [isLongPressPending, setIsLongPressPending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<DragState>(dragState);
  const certificatesRef = useRef<Certificate[]>(certificates);
  const lastMoveTimeRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    certificatesRef.current = certificates;
  }, [certificates]);

  // Clear long press timer safely
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressPending(false);
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

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Vibration API may throw on some browsers
      }
    }
  }, []);

  // Check if movement exceeds threshold
  const hasExceededThreshold = useCallback((x: number, y: number): boolean => {
    const dx = Math.abs(x - startPosRef.current.x);
    const dy = Math.abs(y - startPosRef.current.y);
    return dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD;
  }, []);

  // Find which card is at position - improved algorithm
  const findCardAtPosition = useCallback(
    (x: number, y: number): number | null => {
      const currentCerts = certificatesRef.current;
      let closestIndex: number | null = null;
      let closestDistance = Infinity;

      for (let i = 0; i < currentCerts.length; i++) {
        const cert = currentCerts[i];
        const element = itemRefs.current.get(cert.id);
        if (element) {
          const rect = element.getBoundingClientRect();

          // First check if point is within element bounds
          if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            return i;
          }

          // Calculate distance to center for fallback
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

          // Only consider if within reasonable range
          const maxDistance = Math.max(rect.width, rect.height) * 0.8;
          if (distance < closestDistance && distance < maxDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        }
      }
      return closestIndex;
    },
    []
  );

  // Start drag
  const startDrag = useCallback(
    (id: string, index: number, clientX: number, clientY: number) => {
      const element = itemRefs.current.get(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      isDraggingRef.current = true;
      clearLongPressTimer();
      triggerHaptic();

      // Use centralized scroll lock
      lockScroll(SCROLL_LOCK_ID, true);

      const newState: DragState = {
        isDragging: true,
        draggedId: id,
        draggedIndex: index,
        currentPosition: { x: clientX, y: clientY },
        offset: { x: clientX - rect.left, y: clientY - rect.top },
        targetIndex: index,
      };

      dragStateRef.current = newState;
      setDragState(newState);
    },
    [triggerHaptic, clearLongPressTimer]
  );

  // Handle drag move - with throttling
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;

      // Throttle updates for performance
      const now = Date.now();
      if (now - lastMoveTimeRef.current < THROTTLE_MS) return;
      lastMoveTimeRef.current = now;

      const targetIndex = findCardAtPosition(clientX, clientY);

      setDragState((prev) => ({
        ...prev,
        currentPosition: { x: clientX, y: clientY },
        targetIndex: targetIndex !== null ? targetIndex : prev.targetIndex,
      }));
    },
    [findCardAtPosition]
  );

  // End drag - uses refs to avoid stale closures
  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    // Use refs for current state to avoid stale closures
    const { draggedIndex, targetIndex } = dragStateRef.current;

    if (
      draggedIndex !== null &&
      targetIndex !== null &&
      draggedIndex !== targetIndex
    ) {
      // Reorder using ref to get current certificates
      const currentCerts = certificatesRef.current;
      const newCerts = [...currentCerts];
      const [removed] = newCerts.splice(draggedIndex, 1);
      newCerts.splice(targetIndex, 0, removed);
      setCertificates(newCerts);
      triggerHaptic();
    }

    // Use centralized scroll unlock
    unlockScroll(SCROLL_LOCK_ID, true);
    isDraggingRef.current = false;

    const resetState = initialDragState;
    dragStateRef.current = resetState;
    setDragState(resetState);
  }, [triggerHaptic]);

  // Cancel drag
  const cancelDrag = useCallback(() => {
    clearLongPressTimer();

    if (isDraggingRef.current) {
      // Use centralized scroll unlock
      unlockScroll(SCROLL_LOCK_ID, true);
      isDraggingRef.current = false;

      const resetState = initialDragState;
      dragStateRef.current = resetState;
      setDragState(resetState);
    }
  }, [clearLongPressTimer]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (id: string, index: number, e: React.TouchEvent) => {
      const touch = e.touches[0];
      startPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Long press timer
      clearLongPressTimer();
      setIsLongPressPending(true);
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressPending(false);
        startDrag(id, index, touch.clientX, touch.clientY);
      }, LONG_PRESS_DELAY);
    },
    [startDrag, clearLongPressTimer]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];

      // Cancel long press if finger moved too much before drag started
      if (longPressTimerRef.current && !isDraggingRef.current) {
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

  // Mouse handlers (for desktop testing)
  const handleMouseDown = useCallback(
    (id: string, index: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      clearLongPressTimer();
      setIsLongPressPending(true);
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressPending(false);
        startDrag(id, index, e.clientX, e.clientY);
      }, LONG_PRESS_DELAY);
    },
    [startDrag, clearLongPressTimer]
  );

  // Global event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Cancel long press if moved before timer fires
      if (longPressTimerRef.current && !isDraggingRef.current) {
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelDrag();
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
        unlockScroll(SCROLL_LOCK_ID, true);
        isDraggingRef.current = false;
      }

      // Clear any pending timers
      clearLongPressTimer();
    };
  }, [
    handleDragMove,
    endDrag,
    cancelDrag,
    clearLongPressTimer,
    hasExceededThreshold,
  ]);

  // Handle tap (open credential URL)
  const handleTap = useCallback((cert: Certificate) => {
    if (!isDraggingRef.current && cert.credentialUrl) {
      window.open(cert.credentialUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  return (
    <div className="relative w-full px-4 py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        viewport={{ once: true, margin: "-50px" }}
        className="text-center mb-4"
      >
        <h2
          className="text-[32px] font-medium leading-[1.1] tracking-[-1.2px] text-white"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          Certificates & Licenses
        </h2>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.1,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="text-[14px] font-normal leading-[1.5] tracking-[-0.4px] text-white/80 text-center mb-8 px-2"
        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
      >
        Professional certifications that validate my technical expertise.
      </motion.p>

      {/* Certificates Grid */}
      <div ref={containerRef} className="grid grid-cols-2 gap-3 mb-8 relative">
        {certificates.map((cert, index) => {
          const isDragged = dragState.draggedId === cert.id;
          const isTarget =
            dragState.isDragging &&
            dragState.targetIndex === index &&
            dragState.draggedIndex !== index;

          return (
            <CertificateCard
              key={cert.id}
              cert={cert}
              index={index}
              isDragged={isDragged}
              isTarget={isTarget}
              isDragging={dragState.isDragging}
              isLongPressPending={isLongPressPending}
              onRef={(el) => {
                if (el) itemRefs.current.set(cert.id, el);
                else itemRefs.current.delete(cert.id);
              }}
              onTouchStart={(e) => handleTouchStart(cert.id, index, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => clearLongPressTimer()}
              onTouchCancel={handleTouchCancel}
              onMouseDown={(e) => handleMouseDown(cert.id, index, e)}
              onTap={() => handleTap(cert)}
            />
          );
        })}

        {/* Dragged card overlay */}
        {dragState.isDragging && dragState.draggedId && (
          <DragOverlay
            cert={certificates.find((c) => c.id === dragState.draggedId)!}
            position={dragState.currentPosition}
            offset={dragState.offset}
          />
        )}
      </div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="text-[12px] text-white/40 text-center mb-6"
        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
      >
        Hold to drag & reorder
      </motion.p>

      {/* View All Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.4,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="flex justify-center"
      >
        <button className="bg-[#8eb08a] rounded-[12px] px-5 py-3 shadow-md active:scale-95 transition-transform">
          <span
            className="text-[14px] font-semibold text-white"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            View All
          </span>
        </button>
      </motion.div>
    </div>
  );
}

// Certificate card component
interface CertificateCardProps {
  cert: Certificate;
  index: number;
  isDragged: boolean;
  isTarget: boolean;
  isDragging: boolean;
  isLongPressPending: boolean; // Whether long press timer is still running
  onRef: (el: HTMLDivElement | null) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onTap: () => void;
}

function CertificateCard({
  cert,
  index,
  isDragged,
  isTarget,
  isDragging,
  isLongPressPending,
  onRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  onMouseDown,
  onTap,
}: CertificateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });
  const [imageError, setImageError] = useState(false);
  const tapStartRef = useRef<number>(0);
  const tapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Register ref
  useEffect(() => {
    onRef(cardRef.current);
    return () => onRef(null);
  }, [onRef]);

  const handleTouchStartInternal = (e: React.TouchEvent) => {
    tapStartRef.current = Date.now();
    const touch = e.touches[0];
    tapPosRef.current = { x: touch.clientX, y: touch.clientY };
    onTouchStart(e);
  };

  const handleTouchEndInternal = (e: React.TouchEvent) => {
    const tapDuration = Date.now() - tapStartRef.current;
    const changedTouch = e.changedTouches[0];
    const dx = changedTouch
      ? Math.abs(changedTouch.clientX - tapPosRef.current.x)
      : 0;
    const dy = changedTouch
      ? Math.abs(changedTouch.clientY - tapPosRef.current.y)
      : 0;
    const movedTooMuch = dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD;

    // A tap is when:
    // 1. Long press timer is still pending (hasn't fired yet) OR duration is short
    // 2. Not currently in drag mode
    // 3. Finger didn't move too much
    const wasTap =
      (isLongPressPending || tapDuration < TAP_THRESHOLD) &&
      !isDragging &&
      !movedTooMuch;

    if (wasTap) {
      onTap();
    }
    onTouchEnd();
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if dragging - mouse click is handled separately
    if (!isDragging) {
      onTap();
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      layoutId={cert.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isDragged ? 0.3 : 1,
        y: isInView ? 0 : 20,
        scale: isTarget ? 1.05 : 1,
      }}
      transition={{
        layout: { type: "spring", stiffness: 400, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { type: "spring", stiffness: 400, damping: 25 },
        y: {
          duration: 0.5,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: index * 0.1,
        },
      }}
      className={`
        relative w-full rounded-[16px] 
        bg-[rgba(243,243,243,0.5)] backdrop-blur-[20px] 
        border border-[rgba(117,117,117,0.3)] 
        cursor-grab active:cursor-grabbing
        select-none
        ${isTarget ? "ring-2 ring-white/50" : ""}
      `}
      style={{
        aspectRatio: "0.85",
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      onTouchStart={handleTouchStartInternal}
      onTouchMove={onTouchMove}
      onTouchEnd={handleTouchEndInternal}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
      onClick={handleClick}
    >
      {/* Date Badge */}
      <div className="absolute top-3 right-3 bg-[#d9d9d9] rounded-full px-2.5 py-1.5 shadow-sm">
        <p
          className="text-[11px] font-normal leading-[10px] tracking-[-0.3px] text-black"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.date}
        </p>
      </div>

      {/* Certificate Image */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[25%] w-[100px] h-[100px] flex items-center justify-center pointer-events-none">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9] rounded-lg">
            <svg
              className="w-12 h-12 text-gray-400/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        ) : (
          <Image
            src={cert.image}
            alt={`${cert.title} certification badge`}
            width={100}
            height={100}
            className="object-contain"
            draggable={false}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Certificate Info */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <p
          className="text-[15px] font-semibold leading-[1.2] tracking-[-0.3px] text-black mb-1"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.title}
        </p>
        <p
          className="text-[12px] font-normal leading-[1.3] text-black/70"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.issuingOrg}
        </p>
      </div>
    </motion.div>
  );
}

// Drag overlay - the lifted card that follows touch/cursor
interface DragOverlayProps {
  cert: Certificate;
  position: { x: number; y: number };
  offset: { x: number; y: number };
}

function DragOverlay({ cert, position, offset }: DragOverlayProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ scale: 1, rotate: 0 }}
      animate={{
        scale: 1.08,
        rotate: 3,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed rounded-[16px] bg-[rgba(255,255,255,0.95)] backdrop-blur-xl border border-white/40 pointer-events-none z-[9999]"
      style={{
        left: position.x - offset.x,
        top: position.y - offset.y,
        width: "calc(50vw - 14px)",
        aspectRatio: "0.85",
      }}
    >
      {/* Date Badge */}
      <div className="absolute top-3 right-3 bg-[#d9d9d9] rounded-full px-2.5 py-1.5 shadow-md">
        <p
          className="text-[11px] font-normal leading-[10px] tracking-[-0.3px] text-black"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.date}
        </p>
      </div>

      {/* Certificate Image */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[25%] w-[100px] h-[100px] flex items-center justify-center">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9] rounded-lg">
            <svg
              className="w-12 h-12 text-gray-400/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        ) : (
          <Image
            src={cert.image}
            alt={cert.title}
            width={100}
            height={100}
            className="object-contain drop-shadow-lg"
            draggable={false}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Certificate Info */}
      <div className="absolute bottom-4 left-4 right-4">
        <p
          className="text-[15px] font-semibold leading-[1.2] tracking-[-0.3px] text-black mb-1"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.title}
        </p>
        <p
          className="text-[12px] font-normal leading-[1.3] text-black/70"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.issuingOrg}
        </p>
      </div>
    </motion.div>
  );
}
