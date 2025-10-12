"use client";

import { motion } from "framer-motion";

interface ProjectPlaceholderProps {
  title?: string;
  message?: string;
}

export default function ProjectPlaceholder({
  title = "Coming Soon",
  message = "This project is currently in development. Check back soon!",
}: ProjectPlaceholderProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Animated Icon */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-6"
      >
        <svg
          className="w-16 h-16 md:w-20 md:h-20 text-white/80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      </motion.div>

      {/* Coming Soon Badge */}
      <div className="px-6 py-2.5 rounded-full mb-4 bg-[#6b7280]/90 backdrop-blur-sm">
        <span className="text-white text-sm md:text-base font-bold uppercase tracking-wide">
          Coming Soon
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white text-2xl md:text-3xl font-bold text-center mb-3 leading-tight px-6">
        {title}
      </h3>

      {/* Description */}
      <p className="text-white/70 text-center text-sm md:text-base max-w-[280px] md:max-w-[400px] px-6">
        {message}
      </p>
    </div>
  );
}
