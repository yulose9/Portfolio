"use client";

import gsap from "gsap";
import { CSSProperties, useEffect, useRef } from "react";

type AnimationStyle = "bouncy" | "smooth" | "elastic" | "pop" | "wave" | "smooth-wave";
interface GsapBouncyTextProps {
  text: string; className?: string; style?: CSSProperties; delay?: number;
  staggerDelay?: number; as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
  animationStyle?: AnimationStyle; duration?: number; once?: boolean;
  useWelcomeEvent?: boolean; welcomeEventDelay?: number;
}

export default function GsapBouncyText({ text, className = "", style, delay = 0, staggerDelay = 0.04, as: Component = "div", duration = 0.3, once = true, useWelcomeEvent = false }: GsapBouncyTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = containerRef.current;
    // Above-the-fold copy and reduced-motion content remain visible from first paint.
    if (!element || useWelcomeEvent || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tween: gsap.core.Tween | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      tween?.kill();
      tween = gsap.fromTo(element.querySelectorAll("[data-word]"), { y: 8, opacity: 0.6 }, { y: 0, opacity: 1, duration: Math.min(duration, 0.4), delay: Math.min(delay, 0.15), stagger: Math.min(staggerDelay, 0.05), ease: "power2.out", clearProps: "transform,opacity" });
      if (once) observer.unobserve(element);
    }, { threshold: 0.1 });
    observer.observe(element);
    return () => { observer.disconnect(); tween?.kill(); };
  }, [text, useWelcomeEvent, delay, staggerDelay, duration, once]);
  return <Component ref={containerRef as React.Ref<never>} className={className} style={style}>{text.split(" ").map((word, index) => <span key={index} data-word style={{ display: "inline-block" }}>{word}{index < text.split(" ").length - 1 ? "\u00a0" : ""}</span>)}</Component>;
}
