"use client";

import gsap from "gsap";
import React, { useEffect, useRef } from "react";

interface SplitTextProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
}

export function SplitText({
  children,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.08,
}: SplitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const words = children.split(" ");

  useEffect(() => {
    if (!containerRef.current) return;

    // Create IntersectionObserver for scroll-triggered animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Create timeline for coordinated animations
            const tl = gsap.timeline({ delay: delay });

            // Animate words with y-axis movement (inspired by CodePen)
            tl.fromTo(
              wordsRef.current,
              {
                yPercent: 100,
              },
              {
                yPercent: 0,
                duration: 0.5,
                ease: "power2.out", // Faster, smoother easing
                stagger: staggerDelay,
              },
              0
            );

            // Animate opacity simultaneously
            tl.fromTo(
              wordsRef.current,
              {
                opacity: 0,
              },
              {
                opacity: 1,
                duration: 0.4,
                ease: "power1.out",
                stagger: staggerDelay,
              },
              0
            );

            // Unobserve after animation triggers
            observer.unobserve(entry.target);
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
  }, [delay, staggerDelay]);

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
