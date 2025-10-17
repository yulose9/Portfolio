"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

interface SectionHeadingProps {
  /**
   * The text content to display as heading
   * Examples: "Projects", "Blogs", "Work & Experiences", "Certificates & Licenses", "About", "Want to collaborate on something?"
   */
  children: ReactNode;

  /**
   * Optional custom className to override defaults
   */
  className?: string;

  /**
   * Optional custom text color (default: text-white/light)
   */
  textColor?: string;

  /**
   * Optional custom background color for the section
   */
  bgColor?: string;

  /**
   * Animation delay in seconds (default: 0)
   */
  delay?: number;

  /**
   * Enable animation on scroll into view (default: true)
   */
  animate?: boolean;

  /**
   * Custom style properties
   */
  style?: React.CSSProperties;

  /**
   * HTML element tag to render as (default: "h2")
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div" | "span";
}

/**
 * SectionHeading Component
 *
 * A reusable heading component with Apple's design aesthetic.
 * Uses SF Pro Display font with generous letter spacing and precise typography.
 *
 * Font Stack: Inter (primary) → SF Pro Display (fallback) → System fonts
 * Size: 80px (desktop), scalable via Tailwind
 * Weight: 600 (semi-bold)
 * Line Height: 84px (1.05)
 * Letter Spacing: -1.2px (optical balance)
 *
 * @example
 * ```tsx
 * <SectionHeading>Projects</SectionHeading>
 * <SectionHeading textColor="text-[#657a62]" bgColor="bg-white">Work & Experiences</SectionHeading>
 * <SectionHeading delay={0.2} animate>About</SectionHeading>
 * ```
 */
export function SectionHeading({
  children,
  className = "",
  textColor = "text-white",
  bgColor,
  delay = 0,
  animate = true,
  style = {},
  as: Component = "h2",
}: SectionHeadingProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Base Tailwind classes
  const baseClasses = `
    text-[80px]
    md:text-[80px]
    font-semibold
    leading-[84px]
    tracking-[-1.2px]
    ${textColor}
    transition-all
    duration-300
  `;

  // Merge with custom className
  const finalClassName = `${baseClasses} ${className}`.trim();

  // Font stack: Inter (primary), SF Pro Display (Mac fallback), system fonts
  const fontFamily = "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  // Content
  const content = (
    <Component
      className={finalClassName}
      style={{
        fontFamily,
        ...style,
      }}
      ref={ref}
    >
      {children}
    </Component>
  );

  // Conditionally apply animation
  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98] as any,
      }}
      ref={ref}
    >
      {content}
    </motion.div>
  );
}

export default SectionHeading;
