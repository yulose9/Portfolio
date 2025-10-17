"use client";

import gsap from "gsap";
import React, { useEffect, useRef } from "react";

interface SplitTextProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
  animationType?: "slideUp" | "slideDown" | "fade" | "scale" | "wave";
  duration?: number;
  ease?: string;
  once?: boolean;
}

/**
 * Enhanced SplitText component with multiple animation types
 * Inspired by GSAP best practices and CodePen examples
 *
 * @example
 * <SplitText animationType="slideUp" staggerDelay={0.1}>
 *   Hello World
 * </SplitText>
 */
export function SplitText({
  children,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.08,
  animationType = "slideUp",
  duration = 0.6,
  ease = "power2.out",
  once = true,
}: SplitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const hasAnimated = useRef(false);
  const words = children.split(" ");

  // Animation configurations
  const animationConfig = {
    slideUp: {
      from: { yPercent: 100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
    },
    slideDown: {
      from: { yPercent: -100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
    },
    fade: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    scale: {
      from: { scale: 0.8, opacity: 0 },
      to: { scale: 1, opacity: 1 },
    },
    wave: {
      from: { yPercent: 100, opacity: 0, rotationZ: -5 },
      to: { yPercent: 0, opacity: 1, rotationZ: 0 },
    },
  };

  const config = animationConfig[animationType] || animationConfig.slideUp;

  useEffect(() => {
    if (!containerRef.current) return;

    // Create IntersectionObserver for scroll-triggered animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (once && hasAnimated.current) return;

            // Create timeline for coordinated animations
            const tl = gsap.timeline({ delay: delay });

            // Animate words with the selected animation type
            tl.fromTo(
              wordsRef.current,
              config.from,
              {
                ...config.to,
                duration: duration,
                ease: ease,
                stagger: staggerDelay,
              },
              0
            );

            // Stagger opacity fade for better visual effect
            if (animationType !== "fade") {
              tl.fromTo(
                wordsRef.current,
                {
                  opacity: config.from.opacity ?? 0,
                },
                {
                  opacity: 1,
                  duration: duration * 0.85,
                  ease: "power1.out",
                  stagger: staggerDelay,
                },
                0
              );
            }

            hasAnimated.current = true;

            // Unobserve after animation triggers if once is true
            if (once) {
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "-50px",
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [delay, staggerDelay, animationType, duration, ease, once]);

  return (
    <span ref={containerRef} className={className} style={style}>
      {words.map((word, i) => {
        return (
          <span
            key={children + i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              padding: "0 0 0.2em 0",
              margin: "0 0 -0.1em",
            }}
          >
            <span
              ref={(el) => {
                if (el) wordsRef.current[i] = el;
              }}
              style={{
                display: "inline-block",
                willChange: "transform, opacity",
              }}
            >
              {word + (i !== words.length - 1 ? "\u00A0" : "")}
            </span>
          </span>
        );
      })}
    </span>
  );
}
