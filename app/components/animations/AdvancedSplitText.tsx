"use client";

import gsap from "gsap";
import React, { useEffect, useRef } from "react";

type AnimationType =
  | "slideUp"
  | "slideDown"
  | "fadeSlide"
  | "scaleReveal"
  | "elasticSlide"
  | "rotateIn"
  | "charWave"
  | "letterPress"
  | "bounce"
  | "blur";

interface AdvancedSplitTextProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
  animationType?: AnimationType;
  splitType?: "words" | "chars" | "lines";
  duration?: number;
  ease?: string;
  once?: boolean;
  hover?: boolean;
  triggerOnView?: boolean;
}

export function AdvancedSplitText({
  children,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.08,
  animationType = "slideUp",
  splitType = "words",
  duration = 0.6,
  ease = "power2.out",
  once = true,
  hover = false,
  triggerOnView = true,
}: AdvancedSplitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const elementsRef = useRef<HTMLSpanElement[]>([]);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const hasAnimated = useRef(false);

  // Split text based on type
  const getElements = (text: string) => {
    if (splitType === "chars") {
      return text.split("");
    } else if (splitType === "lines") {
      return text.split("\n");
    }
    return text.split(" ");
  };

  const elements = getElements(children);

  // Animation configurations
  const animationConfigs: Record<AnimationType, any> = {
    slideUp: {
      from: { yPercent: 100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
      duration,
      ease,
    },
    slideDown: {
      from: { yPercent: -100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
      duration,
      ease,
    },
    fadeSlide: {
      from: { x: 30, opacity: 0, skewY: 2 },
      to: { x: 0, opacity: 1, skewY: 0 },
      duration,
      ease: "power2.out",
    },
    scaleReveal: {
      from: { scale: 0, opacity: 0 },
      to: { scale: 1, opacity: 1 },
      duration,
      ease: "elastic.out(1, 0.5)",
    },
    elasticSlide: {
      from: { xPercent: -50, opacity: 0 },
      to: { xPercent: 0, opacity: 1 },
      duration: duration + 0.1,
      ease: "back.out(1.7)",
    },
    rotateIn: {
      from: { rotation: -180, opacity: 0, scale: 0.8 },
      to: { rotation: 0, opacity: 1, scale: 1 },
      duration,
      ease: "power2.out",
    },
    charWave: {
      from: { yPercent: 50, opacity: 0, rotationZ: -10 },
      to: { yPercent: 0, opacity: 1, rotationZ: 0 },
      duration: duration + 0.2,
      ease: "sine.out",
    },
    letterPress: {
      from: { y: -20, opacity: 0 },
      to: { y: 0, opacity: 1 },
      duration: duration - 0.1,
      ease: "power3.out",
    },
    bounce: {
      from: { yPercent: 100, opacity: 0 },
      to: { yPercent: 0, opacity: 1 },
      duration,
      ease: "bounce.out",
    },
    blur: {
      from: { filter: "blur(10px)", opacity: 0 },
      to: { filter: "blur(0px)", opacity: 1 },
      duration,
      ease: "power1.out",
    },
  };

  const config = animationConfigs[animationType];

  const playAnimation = () => {
    if (once && hasAnimated.current) return;

    // Kill previous animation
    animationRef.current?.kill();

    const tl = gsap.timeline({ delay });
    elementsRef.current.forEach((element, index) => {
      if (splitType === "chars" && index > 0 && children[index - 1] === " ") {
        // Add small delay for spaces
        tl.fromTo(element, config.from, config.to, "-=0.1");
      } else {
        tl.fromTo(element, config.from, config.to, 0.1 + index * staggerDelay);
      }
    });

    animationRef.current = tl;
    hasAnimated.current = true;
  };

  useEffect(() => {
    if (!triggerOnView) {
      playAnimation();
      return;
    }

    if (!containerRef.current) return;

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
  }, [animationType, delay, staggerDelay, duration, ease, triggerOnView, once]);

  const handleHover = () => {
    if (!hover) return;

    // Reverse and replay on hover
    if (animationRef.current) {
      animationRef.current.reverse().then(() => {
        animationRef.current?.play();
      });
    }
  };

  return (
    <span
      ref={containerRef}
      className={className}
      style={style}
      onMouseEnter={handleHover}
    >
      {elements.map((element, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) elementsRef.current[i] = el;
          }}
          style={{
            display:
              splitType === "chars" || element === " "
                ? "inline-block"
                : "inline-block",
            willChange: "transform, opacity, filter",
            paddingRight: splitType === "chars" ? "0.05em" : "0",
            overflow:
              animationType === "slideUp" ||
              animationType === "slideDown" ||
              animationType === "elasticSlide"
                ? "hidden"
                : "visible",
          }}
        >
          {element}
          {splitType === "words" && i !== elements.length - 1 && "\u00A0"}
        </span>
      ))}
    </span>
  );
}
