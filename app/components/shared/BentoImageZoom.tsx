"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import Image from "next/image";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(Flip);
}

interface BentoImageZoomProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

export function BentoImageZoom({ src, alt, children }: BentoImageZoomProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (animatingRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    // If already expanded, collapse it
    if (isExpanded) {
      collapseImage();
      return;
    }

    expandImage();
  };

  const expandImage = () => {
    const container = containerRef.current;
    if (!container || animatingRef.current) return;

    animatingRef.current = true;

    // Get the original position and size
    const originalRect = container.getBoundingClientRect();

    // Create overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0);
      z-index: 9998;
      cursor: zoom-out;
    `;
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    // Create clone
    const clone = container.cloneNode(true) as HTMLDivElement;
    clone.style.cssText = `
      position: fixed;
      top: ${originalRect.top}px;
      left: ${originalRect.left}px;
      width: ${originalRect.width}px;
      height: ${originalRect.height}px;
      z-index: 9999;
      cursor: zoom-out;
      margin: 0;
    `;
    document.body.appendChild(clone);
    cloneRef.current = clone;

    // Hide original
    gsap.set(container, { visibility: "hidden" });

    // Calculate target position (centered and larger)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.min(viewportWidth * 0.9, 1200);
    const maxHeight = viewportHeight * 0.9;

    // Calculate aspect ratio to maintain proportions
    const aspectRatio = originalRect.width / originalRect.height;
    let targetWidth = maxWidth;
    let targetHeight = maxWidth / aspectRatio;

    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = maxHeight * aspectRatio;
    }

    const targetLeft = (viewportWidth - targetWidth) / 2;
    const targetTop = (viewportHeight - targetHeight) / 2;

    // Animate clone to center
    const tl = gsap.timeline({
      onComplete: () => {
        setIsExpanded(true);
        animatingRef.current = false;
      },
    });

    tl.to(
      overlay,
      {
        background: "rgba(0, 0, 0, 0.85)",
        duration: 0.4,
        ease: "power2.inOut",
      },
      0
    );

    tl.to(
      clone,
      {
        top: targetTop,
        left: targetLeft,
        width: targetWidth,
        height: targetHeight,
        duration: 0.5,
        ease: "power2.inOut",
        borderRadius: "8px",
      },
      0
    );

    // Add click handlers to collapse
    overlay.addEventListener("click", collapseImage);
    clone.addEventListener("click", collapseImage);
  };

  const collapseImage = () => {
    const container = containerRef.current;
    const clone = cloneRef.current;
    const overlay = overlayRef.current;

    if (!container || !clone || !overlay || animatingRef.current) return;

    animatingRef.current = true;

    // Get original position again (in case of scroll/resize)
    const originalRect = container.getBoundingClientRect();

    // Animate back
    const tl = gsap.timeline({
      onComplete: () => {
        // Remove clone and overlay
        if (clone.parentNode) {
          clone.parentNode.removeChild(clone);
        }
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        // Show original
        gsap.set(container, { visibility: "visible" });

        setIsExpanded(false);
        animatingRef.current = false;
        cloneRef.current = null;
        overlayRef.current = null;
      },
    });

    tl.to(
      overlay,
      {
        background: "rgba(0, 0, 0, 0)",
        duration: 0.4,
        ease: "power2.inOut",
      },
      0
    );

    tl.to(
      clone,
      {
        top: originalRect.top,
        left: originalRect.left,
        width: originalRect.width,
        height: originalRect.height,
        duration: 0.5,
        ease: "power2.inOut",
        borderRadius: getComputedStyle(container).borderRadius,
      },
      0
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cloneRef.current && cloneRef.current.parentNode) {
        cloneRef.current.parentNode.removeChild(cloneRef.current);
      }
      if (overlayRef.current && overlayRef.current.parentNode) {
        overlayRef.current.parentNode.removeChild(overlayRef.current);
      }
    };
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        collapseImage();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isExpanded]);

  // Clone the child element and add ref and onClick
  if (!isValidElement(children)) {
    return <>{children}</>;
  }

  return cloneElement(children as React.ReactElement<any>, {
    ref: containerRef,
    onClick: handleClick,
    style: {
      ...((children as React.ReactElement<any>).props.style || {}),
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
  });
}
