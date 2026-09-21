"use client";

import { CSSProperties } from "react";

interface GradientTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  animationDuration?: number;
  delay?: number;
  useWelcomeEvent?: boolean;
  welcomeEventDelay?: number;
}

export default function GradientText({ text, className = "", style = {} }: GradientTextProps) {
  return <h1 className={className} style={{ ...style, background: "linear-gradient(90deg, #c9e1ff, #f9dab9)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{text}</h1>;
}
