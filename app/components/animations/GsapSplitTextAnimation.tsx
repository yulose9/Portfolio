"use client";

import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import SplitText from "gsap/dist/SplitText";
import { useEffect, useRef } from "react";

gsap.registerPlugin(SplitText, ScrollTrigger);

type SplitType = "chars" | "words" | "lines";
type AnimationType =
  | "slideUp"
  | "slideDown"
  | "fadeIn"
  | "scale"
  | "rotateIn"
  | "tilt"
  | "skew"
  | "blur";

interface GsapSplitTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  splitType?: SplitType;
  animationType?: AnimationType;
  duration?: number;
  staggerDelay?: number;
  delay?: number;
  ease?: string;
  scrollTriggered?: boolean;
  triggerElement?: string;
  once?: boolean;
}

/**
 * Advanced GSAP SplitText component using official SplitText plugin
 * Provides more control and customization than AdvancedSplitText
 *
 * @example
 * <GsapSplitTextAnimation
 *   text="Hello World"
 *   splitType="chars"
 *   animationType="slideUp"
 *   duration={0.5}
 *   staggerDelay={0.05}
 * />
 */
export function GsapSplitTextAnimation({
  text,
  className = "",
  style = {},
  splitType = "words",
  animationType = "slideUp",
  duration = 0.6,
  staggerDelay = 0.08,
  delay = 0,
  ease = "power2.out",
  scrollTriggered = false,
  triggerElement,
  once = true,
}: GsapSplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<InstanceType<typeof SplitText> | null>(null);
  const hasAnimated = useRef(false);

  // Animation configurations
  const animationConfigs: Record<AnimationType, any> = {
    slideUp: {
      from: { yPercent: 100, opacity: 0 },
      duration,
      ease,
    },
    slideDown: {
      from: { yPercent: -100, opacity: 0 },
      duration,
      ease,
    },
    fadeIn: {
      from: { opacity: 0 },
      duration,
      ease,
    },
    scale: {
      from: { scale: 0, opacity: 0 },
      duration,
      ease: "back.out(1.7)",
    },
    rotateIn: {
      from: { rotation: -180, opacity: 0 },
      duration,
      ease,
    },
    tilt: {
      from: { rotationZ: -10, yPercent: 50, opacity: 0 },
      duration,
      ease: "sine.out",
    },
    skew: {
      from: { skewY: 10, yPercent: 100, opacity: 0 },
      duration,
      ease: "power3.out",
    },
    blur: {
      from: { filter: "blur(10px)", opacity: 0 },
      duration,
      ease: "power1.out",
    },
  };

  const config = animationConfigs[animationType];

  useEffect(() => {
    if (!containerRef.current) return;

    // Create split text
    const split = SplitText.create(containerRef.current, {
      type: splitType,
      linesClass: "split-line",
      charsClass: "split-char",
      wordsClass: "split-word",
    });

    splitRef.current = split;

    const playAnimation = () => {
      if (once && hasAnimated.current) return;

      // Determine target based on split type
      const target =
        splitType === "chars"
          ? split.chars
          : splitType === "words"
          ? split.words
          : split.lines;

      // Create animation
      gsap.from(target, {
        ...config.from,
        stagger: staggerDelay,
        duration: config.duration,
        ease: config.ease,
        delay,
      });

      hasAnimated.current = true;
    };

    if (scrollTriggered) {
      ScrollTrigger.create({
        trigger: triggerElement || containerRef.current,
        onEnter: playAnimation,
        once,
      });
    } else {
      // Use IntersectionObserver for non-scroll triggered animations
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              playAnimation();
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

      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [
    text,
    splitType,
    animationType,
    duration,
    staggerDelay,
    delay,
    ease,
    scrollTriggered,
    triggerElement,
    once,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

export default GsapSplitTextAnimation;
