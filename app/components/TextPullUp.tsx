"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface TextPullUpProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  staggerDelay?: number;
}

export default function TextPullUp({
  text,
  className = "",
  style = {},
  delay = 0,
  staggerDelay = 0.08,
}: TextPullUpProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const words = text.split(" ");

  return (
    <h2 ref={ref} className={className} style={style}>
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
              initial={{ y: "100%" }}
              animate={isInView ? { y: 0 } : { y: "100%" }}
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
    </h2>
  );
}
