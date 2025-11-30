"use client";

import { motion } from "framer-motion";
import { CSSProperties, useEffect, useState } from "react";
import { WELCOME_LIFTING_EVENT } from "./PreLoadHero";

interface GradientTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  animationDuration?: number;
  /** Legacy delay prop - used if useWelcomeEvent is false */
  delay?: number;
  /** If true, animation waits for welcome screen lift event */
  useWelcomeEvent?: boolean;
  /** Additional delay after welcome event fires (in seconds) */
  welcomeEventDelay?: number;
}

export default function GradientText({
  text,
  className = "",
  style = {},
  animationDuration = 3,
  delay = 0,
  useWelcomeEvent = true,
  welcomeEventDelay = 0.3,
}: GradientTextProps) {
  const [shouldAnimate, setShouldAnimate] = useState(!useWelcomeEvent);

  // Listen for welcome screen lifting event
  useEffect(() => {
    if (!useWelcomeEvent) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const handleWelcomeLifting = () => {
      if (welcomeEventDelay > 0) {
        timeoutId = setTimeout(() => {
          setShouldAnimate(true);
        }, welcomeEventDelay * 1000);
      } else {
        setShouldAnimate(true);
      }
    };

    window.addEventListener(WELCOME_LIFTING_EVENT, handleWelcomeLifting);

    // Fallback: if event was already fired, trigger after safety delay
    const fallbackTimer = setTimeout(() => {
      if (!shouldAnimate) {
        handleWelcomeLifting();
      }
    }, 5000);

    return () => {
      window.removeEventListener(WELCOME_LIFTING_EVENT, handleWelcomeLifting);
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(fallbackTimer);
    };
  }, [useWelcomeEvent, welcomeEventDelay, shouldAnimate]);

  // Determine actual delay
  const actualDelay = useWelcomeEvent ? 0 : delay;

  return (
    <motion.h1
      initial={{ opacity: 0, y: 50 }}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{
        duration: 0.5,
        delay: actualDelay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      style={{
        ...style,
        background:
          "linear-gradient(90deg, #1173FC, #4C8FFB, #9DB1D3, #CDC6C6, #F9DAB9, #F8CFA5, #E0B989, #9DB1D3, #4C8FFB, #1173FC)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        animation: `gradient-shift ${animationDuration}s linear infinite`,
      }}
    >
      {text}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </motion.h1>
  );
}
