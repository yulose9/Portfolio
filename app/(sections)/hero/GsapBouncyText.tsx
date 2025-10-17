"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

type AnimationStyle =
  | "bouncy"
  | "smooth"
  | "elastic"
  | "pop"
  | "wave"
  | "smooth-wave";

interface GsapBouncyTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
  animationStyle?: AnimationStyle;
  duration?: number;
  once?: boolean;
}

export default function GsapBouncyText({
  text,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.08,
  as = "div",
  animationStyle = "bouncy",
  duration = 0.6,
  once = true,
}: GsapBouncyTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const hasAnimated = useRef(false);

  // Animation configurations for different styles
  const animationStyles: Record<AnimationStyle, any> = {
    bouncy: {
      from: { yPercent: 100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
      duration,
      ease: "back.out(1.7)", // Playful bounce effect
    },
    smooth: {
      from: { yPercent: 100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
      duration,
      ease: "power2.out", // Professional smooth entrance
    },
    elastic: {
      from: { scale: 0.8, opacity: 0 },
      to: { scale: 1, opacity: 1 },
      duration,
      ease: "elastic.out(1, 0.6)", // Elastic springy effect
    },
    pop: {
      from: { scale: 0, opacity: 0 },
      to: { scale: 1, opacity: 1 },
      duration: duration * 0.8,
      ease: "cubic.out", // Quick pop effect
    },
    wave: {
      from: { yPercent: 100, opacity: 0, rotationZ: -5 },
      to: { yPercent: 0, opacity: 1, rotationZ: 0 },
      duration: duration + 0.1,
      ease: "sine.out", // Wave-like motion
    },
    "smooth-wave": {
      from: { yPercent: 100, opacity: 0, scaleY: 0.8 },
      to: { yPercent: 0, opacity: 1, scaleY: 1 },
      duration,
      ease: "power3.out", // Smooth controlled wave
    },
  };

  const config = animationStyles[animationStyle];

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

            // Animate words with selected animation style
            tl.fromTo(
              wordsRef.current,
              config.from,
              {
                ...config.to,
                stagger: {
                  each: staggerDelay,
                  ease: "power1.inOut", // Smooth stagger distribution
                },
              },
              0
            );

            // Animate opacity simultaneously with matching cascade
            tl.fromTo(
              wordsRef.current,
              {
                opacity: config.from.opacity ?? 0,
              },
              {
                opacity: 1,
                duration: config.duration * 0.85, // Slightly shorter opacity fade
                ease: "power1.out",
                stagger: {
                  each: staggerDelay,
                  ease: "power1.inOut",
                },
              },
              0
            );

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
  }, [delay, staggerDelay, animationStyle, duration, once]);

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
