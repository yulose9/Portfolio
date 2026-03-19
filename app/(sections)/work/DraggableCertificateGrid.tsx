"use client";

import { motion, useInView } from "framer-motion";
import React, { useCallback, useRef, useState } from "react";
import { useDragAndDrop } from "@/app/hooks/use-drag-and-drop";

export interface Certificate {
  id: string;
  title: string;
  issuingOrg: string;
  date: string;
  image: string;
  credentialUrl: string;
  // Enhanced metadata for richer UI
  skills?: string[];
  level?: "Fundamentals" | "Associate" | "Professional" | "Expert";
  verified?: boolean;
  expiresAt?: string;
}

interface DraggableCertificateGridProps {
  certificates: Certificate[];
  onReorder?: (certificates: Certificate[]) => void;
  variant?: "desktop" | "mobile";
}

/**
 * iOS-style draggable certificate grid
 * Features:
 * - Long press to initiate drag (500ms)
 * - Visual lift effect with shadow
 * - Smooth spring animations
 * - Touch and mouse support
 * - Haptic feedback on supported devices
 */
export default function DraggableCertificateGrid({
  certificates: initialCertificates,
  onReorder,
  variant = "desktop",
}: DraggableCertificateGridProps) {
  const [certificates, setCertificates] = useState(initialCertificates);

  const handleReorder = useCallback((newCertificates: Certificate[]) => {
    setCertificates(newCertificates);
    onReorder?.(newCertificates);
  }, [onReorder]);

  const { dragState, registerItem, getDragHandlers } = useDragAndDrop({
    items: certificates,
    onReorder: handleReorder,
    dragDelay: 500,
    hapticFeedback: true,
  });

  const isDesktop = variant === "desktop";

  return (
    <div className="relative">
      {/* Grid container */}
      <div
        className={
          isDesktop
            ? "grid grid-cols-3 gap-[80px] w-full"
            : "grid grid-cols-2 gap-3 px-1"
        }
      >
        {certificates.map((cert, index) => (
          <DraggableCard
            key={cert.id}
            cert={cert}
            index={index}
            isDesktop={isDesktop}
            isDragging={dragState.isDragging && dragState.draggedIndex === index}
            isTarget={dragState.isDragging && dragState.targetIndex === index && dragState.draggedIndex !== index}
            registerItem={registerItem}
            dragHandlers={getDragHandlers(index)}
          />
        ))}
      </div>

      {/* Dragged item overlay */}
      {dragState.isDragging && dragState.draggedIndex !== null && (
        <DragOverlay
          cert={certificates[dragState.draggedIndex]}
          position={dragState.position}
          offset={dragState.offset}
          isDesktop={isDesktop}
        />
      )}

      {/* Drag hint - Enhanced for mobile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className={`flex items-center justify-center gap-2 mt-6 ${isDesktop ? "" : "mt-5"}`}
      >
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg 
            className="w-4 h-4 text-white/50" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.5" 
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" 
            />
          </svg>
          <span 
            className="text-white/50 text-xs font-medium"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            Hold to drag & reorder
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// Individual draggable card
interface DraggableCardProps {
  cert: Certificate;
  index: number;
  isDesktop: boolean;
  isDragging: boolean;
  isTarget: boolean;
  registerItem: (index: number, element: HTMLElement | null) => void;
  dragHandlers: ReturnType<ReturnType<typeof useDragAndDrop>["getDragHandlers"]>;
}

function DraggableCard({
  cert,
  index,
  isDesktop,
  isDragging,
  isTarget,
  registerItem,
  dragHandlers,
}: DraggableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });
  const [imageError, setImageError] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Register this card for drag calculations
  React.useEffect(() => {
    registerItem(index, cardRef.current);
    return () => registerItem(index, null);
  }, [index, registerItem]);

  // Handle long press visual feedback
  const handleInteractionStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
    }, 200); // Show feedback slightly before drag starts
  }, []);

  const handleInteractionEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleClick = useCallback(() => {
    // Only open URL if not dragging
    if (!isDragging && cert.credentialUrl) {
      window.open(cert.credentialUrl, "_blank", "noopener,noreferrer");
    }
  }, [isDragging, cert.credentialUrl]);

  if (isDesktop) {
    return (
      <motion.div
        ref={cardRef}
        layout
        layoutId={cert.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: isDragging ? 0.5 : 1,
          scale: isDragging ? 0.95 : isTarget ? 1.05 : isLongPressing ? 1.02 : 1,
          y: isTarget ? -8 : 0,
        }}
        transition={{
          layout: { type: "spring", stiffness: 400, damping: 30 },
          opacity: { duration: 0.2 },
          scale: { type: "spring", stiffness: 400, damping: 25 },
        }}
        className={`
          group relative w-full h-[495px] rounded-[21px] 
          bg-[rgba(243,243,243,0.5)] backdrop-blur-[36.31px] 
          border-[0.303px] border-[rgba(117,117,117,0.4)] 
          cursor-grab active:cursor-grabbing
          transition-shadow duration-300 ease-out
          ${isTarget ? "ring-2 ring-white/50 shadow-2xl" : ""}
          ${isLongPressing ? "shadow-2xl ring-2 ring-white/30" : ""}
          ${!isDragging && !isLongPressing ? "hover:scale-[1.02] hover:shadow-xl hover:bg-[rgba(255,255,255,0.7)] hover:-translate-y-1" : ""}
        `}
        style={{
          // Only disable touch-action when actively dragging.
          // Using "none" unconditionally kills iOS scroll through the card grid.
          touchAction: isDragging || isLongPressing ? "none" : "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onTouchStart={(e) => {
          handleInteractionStart();
          dragHandlers.onTouchStart(e);
        }}
        onTouchMove={dragHandlers.onTouchMove}
        onTouchEnd={() => {
          handleInteractionEnd();
          dragHandlers.onTouchEnd();
        }}
        onTouchCancel={() => {
          handleInteractionEnd();
          dragHandlers.onTouchCancel?.();
        }}
        onMouseDown={(e) => {
          handleInteractionStart();
          dragHandlers.onMouseDown(e);
        }}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd}
        onClick={handleClick}
      >
        {/* Date Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98], delay: index * 0.1 + 0.2 }}
          className="absolute top-[19px] right-[20px] bg-[#d9d9d9] rounded-full px-[12px] py-[9px] shadow-sm"
        >
          <p
            className="text-[24px] font-normal leading-[12px] tracking-[-1px] text-black"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            {cert.date}
          </p>
        </motion.div>

        {/* Certificate Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98], delay: index * 0.1 + 0.3 }}
          className="absolute left-[84px] top-[88px] w-[205px] h-[205px] rounded-[5px] overflow-hidden pointer-events-none"
        >
          {imageError ? (
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9]">
              <svg className="w-20 h-20 text-gray-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <img
              src={cert.image}
              alt={`${cert.title} certification badge`}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
              draggable={false}
            />
          )}
        </motion.div>

        {/* Certificate Info */}
        <div className="absolute bottom-[80px] left-[42px] right-[42px] pointer-events-none">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98], delay: index * 0.1 + 0.4 }}
            className="text-[32px] font-semibold leading-[1.3] tracking-[-0.02em] text-black mb-4"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            {cert.title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98], delay: index * 0.1 + 0.5 }}
            className="text-[20px] font-normal leading-[1.3] text-black/80"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            {cert.issuingOrg}
          </motion.p>
        </div>

        {/* Drag indicator */}
        <div className="absolute top-[19px] left-[20px] opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-6 h-6 text-black/30" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM6 20a2 2 0 100-4 2 2 0 000 4zM14 6a2 2 0 11-4 0 2 2 0 014 0zM12 14a2 2 0 100-4 2 2 0 000 4zM12 20a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </div>
      </motion.div>
    );
  }

  // Mobile variant - Premium Glassmorphism Design
  return (
    <motion.div
      ref={cardRef}
      layout
      layoutId={cert.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.4 : 1,
        scale: isDragging ? 0.92 : isTarget ? 1.06 : isLongPressing ? 1.04 : 1,
        y: isTarget ? -6 : 0,
      }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 28 },
        scale: { type: "spring", stiffness: 350, damping: 22 },
      }}
      viewport={{ once: true, margin: "-50px" }}
      className={`
        relative w-full aspect-[0.75] rounded-[20px] overflow-hidden
        cursor-grab active:cursor-grabbing
        ${isTarget ? "ring-2 ring-white/70" : ""}
        ${isLongPressing ? "ring-2 ring-white/50" : ""}
      `}
      style={{
        // Only disable touch-action when actively dragging.
        // Using "none" unconditionally kills iOS scroll through the card grid.
        touchAction: isDragging || isLongPressing ? "none" : "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: isLongPressing 
          ? "0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(255,255,255,0.2)"
          : "0 8px 32px -8px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.3), 0 0 0 1px rgba(255,255,255,0.15)",
      }}
      onTouchStart={(e) => {
        handleInteractionStart();
        dragHandlers.onTouchStart(e);
      }}
      onTouchMove={dragHandlers.onTouchMove}
      onTouchEnd={() => {
        handleInteractionEnd();
        dragHandlers.onTouchEnd();
      }}
      onTouchCancel={() => {
        handleInteractionEnd();
        dragHandlers.onTouchCancel?.();
      }}
      onMouseDown={(e) => {
        handleInteractionStart();
        dragHandlers.onMouseDown(e);
      }}
      onMouseUp={handleInteractionEnd}
      onMouseLeave={handleInteractionEnd}
      onClick={handleClick}
    >
      {/* Animated gradient mesh background */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: getOrgGradient(cert.issuingOrg),
          filter: "blur(40px)",
        }}
      />

      {/* Glass inner border highlight */}
      <div 
        className="absolute inset-[1px] rounded-[19px] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)",
        }}
      />

      {/* Top row: Org icon + Level badge + Verified */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        {/* Organization icon */}
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.3)",
          }}
        >
          {getOrgIcon(cert.issuingOrg)}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Verified badge */}
          {cert.verified !== false && cert.credentialUrl && (
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
                boxShadow: "0 2px 8px rgba(16,185,129,0.4)",
              }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}

          {/* Level badge */}
          {cert.level && (
            <div 
              className="px-2 py-1 rounded-full"
              style={{
                background: getLevelGradient(cert.level),
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <span 
                className="text-[9px] font-bold text-white uppercase tracking-wide"
                style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
              >
                {cert.level}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Image - larger and centered */}
      <div className="absolute inset-x-0 top-12 bottom-[88px] flex items-center justify-center pointer-events-none px-4">
        <motion.div 
          className="relative w-full h-full max-w-[110px] max-h-[110px]"
          animate={{ 
            rotate: isLongPressing ? [0, -2, 2, 0] : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          {imageError ? (
            <div 
              className="w-full h-full flex items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
              }}
            >
              <svg className="w-12 h-12 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <img
              src={cert.image}
              alt={`${cert.title} certification badge`}
              className="w-full h-full object-contain drop-shadow-xl"
              style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))" }}
              onError={() => setImageError(true)}
              draggable={false}
            />
          )}
        </motion.div>
      </div>

      {/* Bottom info panel - frosted glass effect */}
      <div 
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Skills tags */}
        {cert.skills && cert.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pt-2.5">
            {cert.skills.slice(0, 2).map((skill, i) => (
              <span 
                key={i}
                className="px-1.5 py-0.5 rounded-md text-[8px] font-medium text-white/90"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {skill}
              </span>
            ))}
            {cert.skills.length > 2 && (
              <span 
                className="px-1.5 py-0.5 rounded-md text-[8px] font-medium text-white/70"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                +{cert.skills.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Title and org */}
        <div className="px-3 py-2.5">
          <h3
            className="text-[13px] font-bold text-white leading-tight line-clamp-2 mb-1"
            style={{ 
              fontFamily: "Inter, SF Pro Display, sans-serif",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            {cert.title}
          </h3>
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] font-medium text-white/80"
              style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
            >
              {cert.issuingOrg}
            </p>
            <p
              className="text-[9px] font-medium text-white/60"
              style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
            >
              {cert.date}
            </p>
          </div>
        </div>
      </div>

      {/* Subtle drag indicator - top left corner */}
      <div 
        className="absolute top-3 left-12 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: isLongPressing ? 0.6 : 0.3 }}
      >
        <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM6 20a2 2 0 100-4 2 2 0 000 4zM14 6a2 2 0 11-4 0 2 2 0 014 0zM12 14a2 2 0 100-4 2 2 0 000 4zM12 20a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </div>

      {/* Shine effect on hover/press */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLongPressing ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 55%, transparent 60%)",
        }}
      />
    </motion.div>
  );
}

// Helper function to get organization-specific gradient
function getOrgGradient(org: string): string {
  const gradients: Record<string, string> = {
    "Microsoft": "radial-gradient(circle at 30% 30%, #00BCF2 0%, #0078D4 50%, #002050 100%)",
    "Google": "radial-gradient(circle at 30% 30%, #4285F4 0%, #34A853 33%, #FBBC05 66%, #EA4335 100%)",
    "HashiCorp": "radial-gradient(circle at 30% 30%, #7B42BC 0%, #1D1D1F 100%)",
    "Amazon": "radial-gradient(circle at 30% 30%, #FF9900 0%, #232F3E 100%)",
    "AWS": "radial-gradient(circle at 30% 30%, #FF9900 0%, #232F3E 100%)",
  };
  return gradients[org] || "radial-gradient(circle at 30% 30%, #6366F1 0%, #4F46E5 100%)";
}

// Helper function to get organization icon
function getOrgIcon(org: string): React.ReactNode {
  const iconClass = "w-4 h-4";
  
  switch (org) {
    case "Microsoft":
      return (
        <svg className={iconClass} viewBox="0 0 23 23" fill="none">
          <path d="M0 0h11v11H0z" fill="#F25022"/>
          <path d="M12 0h11v11H12z" fill="#7FBA00"/>
          <path d="M0 12h11v11H0z" fill="#00A4EF"/>
          <path d="M12 12h11v11H12z" fill="#FFB900"/>
        </svg>
      );
    case "Google":
      return (
        <svg className={iconClass} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case "HashiCorp":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="#7B42BC">
          <path d="M12.007 0L1.572 6.005v12.009l3.83 2.205V8.21l6.605-3.808 6.606 3.808v12.009l3.83-2.205V6.005L12.007 0z"/>
          <path d="M12.007 24l-6.605-3.808V8.184l6.605 3.808 6.606-3.808v12.008L12.007 24zm-2.776-6.783l-3.83-2.205v4.41l3.83 2.205v-4.41z"/>
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" className="text-white/70" />
        </svg>
      );
  }
}

// Helper function to get level-specific gradient
function getLevelGradient(level: string): string {
  const gradients: Record<string, string> = {
    "Fundamentals": "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    "Associate": "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
    "Professional": "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    "Expert": "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
  };
  return gradients[level] || gradients["Fundamentals"];
}

// Drag overlay - the floating card that follows the cursor
interface DragOverlayProps {
  cert: Certificate;
  position: { x: number; y: number };
  offset: { x: number; y: number };
  isDesktop: boolean;
}

function DragOverlay({ cert, position, offset, isDesktop }: DragOverlayProps) {
  const [imageError, setImageError] = useState(false);

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x - offset.x,
    top: position.y - offset.y,
    zIndex: 9999,
    pointerEvents: "none",
    touchAction: "none",
  };

  if (isDesktop) {
    return (
      <motion.div
        initial={{ scale: 1, boxShadow: "0px 10px 30px rgba(0,0,0,0.2)" }}
        animate={{ 
          scale: 1.05, 
          boxShadow: "0px 25px 60px rgba(0,0,0,0.35)",
          rotate: 2,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={style}
        className="w-[373px] h-[495px] rounded-[21px] bg-[rgba(255,255,255,0.95)] backdrop-blur-xl border border-white/40"
      >
        {/* Date Badge */}
        <div className="absolute top-[19px] right-[20px] bg-[#d9d9d9] rounded-full px-[12px] py-[9px] shadow-md">
          <p
            className="text-[24px] font-normal leading-[12px] tracking-[-1px] text-black"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            {cert.date}
          </p>
        </div>

        {/* Certificate Image */}
        <div className="absolute left-[84px] top-[88px] w-[205px] h-[205px] rounded-[5px] overflow-hidden">
          {imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9]">
              <svg className="w-20 h-20 text-gray-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <img
              src={cert.image}
              alt={cert.title}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
              draggable={false}
            />
          )}
        </div>

        {/* Certificate Info */}
        <div className="absolute bottom-[80px] left-[42px] right-[42px]">
          <p
            className="text-[32px] font-semibold leading-[1.3] tracking-[-0.02em] text-black mb-4"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            {cert.title}
          </p>
          <p
            className="text-[20px] font-normal leading-[1.3] text-black/80"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            {cert.issuingOrg}
          </p>
        </div>
      </motion.div>
    );
  }

  // Mobile overlay - Premium Glassmorphism
  return (
    <motion.div
      initial={{ scale: 1, rotate: 0 }}
      animate={{ 
        scale: 1.12, 
        rotate: 4,
      }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      style={{
        ...style,
        width: "calc(50vw - 20px)",
        aspectRatio: "0.75",
        background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.25) 100%)",
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
        boxShadow: "0 30px 60px -12px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.3)",
        borderRadius: "20px",
      }}
      className="overflow-hidden"
    >
      {/* Animated gradient mesh background */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: getOrgGradient(cert.issuingOrg),
          filter: "blur(40px)",
        }}
      />

      {/* Glass inner border highlight */}
      <div 
        className="absolute inset-[1px] rounded-[19px] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.15) 100%)",
        }}
      />

      {/* Top row: Org icon */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.35)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4)",
          }}
        >
          {getOrgIcon(cert.issuingOrg)}
        </div>

        {/* Verified badge */}
        {cert.credentialUrl && (
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
              boxShadow: "0 4px 12px rgba(16,185,129,0.5)",
            }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Certificate Image */}
      <div className="absolute inset-x-0 top-12 bottom-[88px] flex items-center justify-center px-4">
        <motion.div 
          className="relative w-full h-full max-w-[110px] max-h-[110px]"
          animate={{ rotate: [0, -3, 3, 0] }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {imageError ? (
            <div 
              className="w-full h-full flex items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 100%)",
              }}
            >
              <svg className="w-12 h-12 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <img
              src={cert.image}
              alt={cert.title}
              className="w-full h-full object-contain"
              style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.3))" }}
              onError={() => setImageError(true)}
              draggable={false}
            />
          )}
        </motion.div>
      </div>

      {/* Bottom info panel */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="px-3 py-3">
          <h3
            className="text-[13px] font-bold text-white leading-tight line-clamp-2 mb-1"
            style={{ 
              fontFamily: "Inter, SF Pro Display, sans-serif",
              textShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            {cert.title}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/85">
              {cert.issuingOrg}
            </p>
            <p className="text-[9px] font-medium text-white/65">
              {cert.date}
            </p>
          </div>
        </div>
      </div>

      {/* Animated shine effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)",
            "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.4) 5%, rgba(255,255,255,0.6) 10%, rgba(255,255,255,0.4) 15%, transparent 20%)",
          ],
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </motion.div>
  );
}

// Certificate type is already exported via "export interface Certificate" at the top
