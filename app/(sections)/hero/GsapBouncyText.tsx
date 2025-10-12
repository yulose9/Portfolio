"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

interface GsapBouncyTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
}

export default function GsapBouncyText({
  text,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.08,
  as = "div",
}: GsapBouncyTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);

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
                ease: "power2.out", // Faster, smoother easing for snappier movement
                stagger: staggerDelay,
              },
              0 // Start at timeline position 0
            );

            // Animate opacity simultaneously for smooth fade-in
            tl.fromTo(
              wordsRef.current,
              {
                opacity: 0,
              },
              {
                opacity: 1,
                duration: 0.4,
                ease: "power1.out", // Gentle easing for opacity
                stagger: staggerDelay,
              },
              0 // Start at timeline position 0 (same time as y-animation)
            );

            // Unobserve after animation triggers (once: true behavior)
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

  const words = text.split(" ");

  const Component = as;

  return (
    <Component ref={containerRef as any} className={className} style={style}>
      {words.map((word, i) => (
        <span
          key={text + i}
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
      ))}
    </Component>
  );
}
