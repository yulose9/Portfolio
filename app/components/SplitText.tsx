"use client";

import { motion } from "framer-motion";
import React from "react";

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
  staggerDelay = 0.1,
}: SplitTextProps) {
  const words = children.split(" ");

  return (
    <span className={className} style={style}>
      {words.map((word, i) => {
        return (
          <span
            key={children + i}
            style={{ display: "inline-block", overflow: "hidden" }}
          >
            <motion.span
              style={{ display: "inline-block", willChange: "transform" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{
                delay: delay + i * staggerDelay,
                duration: 0.5,
                ease: [0.33, 1, 0.68, 1],
              }}
            >
              {word + (i !== words.length - 1 ? "\u00A0" : "")}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
