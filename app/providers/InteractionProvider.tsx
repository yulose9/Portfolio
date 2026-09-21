"use client";

import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";

export default function InteractionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>{children}</MotionConfig>;
}
