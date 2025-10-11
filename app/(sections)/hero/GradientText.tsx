"use client";

import { motion } from "framer-motion";
import { CSSProperties } from "react";

interface GradientTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  animationDuration?: number;
  delay?: number;
}

export default function GradientText({
  text,
  className = "",
  style = {},
  animationDuration = 3,
  delay = 0,
}: GradientTextProps) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.33, 1, 0.68, 1] }}
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
