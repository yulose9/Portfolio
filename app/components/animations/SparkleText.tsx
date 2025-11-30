"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface SparkleTextProps {
  text: string;
  revealPrefix?: number; // Number of characters to show at start
  revealSuffix?: number; // Number of characters to show at end (e.g., ".com")
  className?: string;
  sparkleColor?: string;
  revealOnHover?: boolean;
  revealOnClick?: boolean;
  href?: string;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

const SparkleIcon = ({
  size = 16,
  color = "#FFD700",
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={style}
    className="absolute pointer-events-none"
  >
    <motion.path
      d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
      fill={color}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
      }}
    />
  </svg>
);

export function SparkleText({
  text,
  revealPrefix = 3,
  revealSuffix = 4,
  className = "",
  sparkleColor = "#FFD700",
  revealOnHover = true,
  revealOnClick = true,
  href,
}: SparkleTextProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [sparkleKey, setSparkleKey] = useState(0);

  // Parse email to show prefix and suffix
  const { prefix, hidden, suffix } = useMemo(() => {
    const atIndex = text.indexOf("@");
    if (atIndex === -1) {
      // Not an email, just hide middle portion
      return {
        prefix: text.slice(0, revealPrefix),
        hidden: text.slice(revealPrefix, text.length - revealSuffix),
        suffix: text.slice(-revealSuffix),
      };
    }
    // For email, show first few chars and domain suffix
    const domain = text.slice(atIndex);
    const localPart = text.slice(0, atIndex);
    return {
      prefix: localPart.slice(0, revealPrefix),
      hidden: localPart.slice(revealPrefix) + domain.slice(0, -revealSuffix),
      suffix: domain.slice(-revealSuffix),
    };
  }, [text, revealPrefix, revealSuffix]);

  // Generate sparkles for hidden characters
  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles: Sparkle[] = [];
      const hiddenLength = hidden.length;

      // Create 2-3 sparkles per hidden character position
      for (let i = 0; i < hiddenLength; i++) {
        const sparkleCount = Math.floor(Math.random() * 2) + 2;
        for (let j = 0; j < sparkleCount; j++) {
          newSparkles.push({
            id: i * 10 + j,
            x: (i / hiddenLength) * 100 + Math.random() * 10 - 5,
            y: Math.random() * 100,
            size: Math.random() * 8 + 8,
            delay: Math.random() * 2,
            duration: Math.random() * 1 + 0.8,
          });
        }
      }
      setSparkles(newSparkles);
    };

    generateSparkles();

    // Regenerate sparkles periodically for continuous animation
    const interval = setInterval(() => {
      setSparkleKey((prev) => prev + 1);
      generateSparkles();
    }, 2000);

    return () => clearInterval(interval);
  }, [hidden.length]);

  const handleInteraction = () => {
    if (revealOnClick) {
      setIsRevealed(true);
    }
  };

  const handleMouseEnter = () => {
    if (revealOnHover) {
      setIsRevealed(true);
    }
  };

  const handleMouseLeave = () => {
    if (revealOnHover) {
      setIsRevealed(false);
    }
  };

  const content = (
    <span
      className={`relative inline-flex items-center cursor-pointer ${className}`}
      onClick={handleInteraction}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Visible prefix */}
      <span className="relative z-10">{prefix}</span>

      {/* Hidden/Sparkle section */}
      <span className="relative inline-block">
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.span
              key="hidden"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative inline-block"
            >
              {/* Asterisks/dots as placeholder */}
              <span className="relative z-10">
                {hidden.split("").map((_, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    animate={{
                      opacity: [0.4, 1, 0.4],
                      scale: [0.9, 1.1, 0.9],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.05,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    ✦
                  </motion.span>
                ))}
              </span>

              {/* Sparkle overlay */}
              <span className="absolute inset-0 overflow-visible pointer-events-none">
                {sparkles.map((sparkle) => (
                  <motion.span
                    key={`${sparkleKey}-${sparkle.id}`}
                    className="absolute"
                    style={{
                      left: `${sparkle.x}%`,
                      top: `${sparkle.y}%`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                      y: [-5, 5],
                    }}
                    transition={{
                      duration: sparkle.duration,
                      delay: sparkle.delay,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 1,
                    }}
                  >
                    <SparkleIcon size={sparkle.size} color={sparkleColor} />
                  </motion.span>
                ))}
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="revealed"
              initial={{ opacity: 0, scale: 1.1, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
              }}
              className="relative z-10"
            >
              {/* Reveal with character-by-character animation */}
              {hidden.split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: i * 0.02,
                    ease: "easeOut",
                  }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Visible suffix */}
      <span className="relative z-10">{suffix}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} className="no-underline">
        {content}
      </a>
    );
  }

  return content;
}

export default SparkleText;
