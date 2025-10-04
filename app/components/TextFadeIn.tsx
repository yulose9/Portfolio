"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface TextFadeInProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
  animateOpacity?: boolean; // Add this prop
}

export default function TextFadeIn({
  text,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.05,
  as = "p",
  animateOpacity = true, // Default to true to not break other usages
}: TextFadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const words = text.split(" ");

  const Component =
    as === "h1"
      ? "h1"
      : as === "h2"
      ? "h2"
      : as === "h3"
      ? "h3"
      : as === "p"
      ? "p"
      : as === "span"
      ? "span"
      : "div";

  return (
    <Component ref={ref} className={className} style={style}>
      {words.map((word, i) => {
        return (
          <span
            key={text + i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: "0.1em",
            }}
          >
            <motion.span
              style={{ display: "inline-block", willChange: "transform" }}
              initial={{ y: "100%", opacity: animateOpacity ? 0 : 1 }}
              animate={
                isInView
                  ? { y: 0, opacity: 1 }
                  : { y: "100%", opacity: animateOpacity ? 0 : 1 }
              }
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
    </Component>
  );
}
