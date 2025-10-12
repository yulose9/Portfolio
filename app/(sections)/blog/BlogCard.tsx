"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

interface BlogCardProps {
  image: string;
  tag: string;
  tagColor: string;
  title: string;
  date: string;
  isPlaceholder?: boolean; // New prop for placeholder cards
}

export default function BlogCard({
  image,
  tag,
  tagColor,
  title,
  date,
  isPlaceholder = false,
}: BlogCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative bg-black rounded-[31px] overflow-hidden w-full h-[471px] ${
        isPlaceholder ? "cursor-default" : "group cursor-pointer"
      }`}
    >
      {/* Image Container - fills entire card with zoom effect on hover */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div
          className={`relative w-full h-full transition-transform duration-500 ease-out ${
            !isPlaceholder && "group-hover:scale-110"
          }`}
        >
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            className="object-cover"
            priority
          />
          {/* Dimmer overlay for placeholder */}
          {isPlaceholder && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          )}
        </div>
      </div>

      {/* Gradient overlay - enhanced on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 transition-all duration-300 ${
          !isPlaceholder &&
          "group-hover:from-transparent group-hover:via-black/50 group-hover:to-black"
        }`}
      />

      {/* Animated shine effect on hover */}
      {!isPlaceholder && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400">
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]" />
        </div>
      )}

      {/* Placeholder Content */}
      {isPlaceholder ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[31px]">
          {/* Animated Icon */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mb-6"
          >
            <svg
              className="w-16 h-16 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </motion.div>

          {/* Coming Soon Badge */}
          <div
            className="px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: tagColor }}
          >
            <span className="text-white text-sm font-bold uppercase tracking-wide">
              {tag}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-white text-2xl font-bold text-center mb-3 leading-tight">
            Coming Soon
          </h3>

          {/* Description */}
          <p className="text-white/70 text-center text-sm max-w-[280px]">
            I'm currently working on new content. Check back soon for insights,
            tutorials, and stories!
          </p>

          {/* Date */}
          <p className="text-white/50 text-xs mt-4">{date}</p>
        </div>
      ) : (
        <>
          {/* Content Container - slides up slightly on hover */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end pb-[31px] px-[31px] transition-all duration-300 group-hover:pb-[35px]">
            <div className="w-full space-y-[10px]">
              {/* Tag - glows on hover */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={
                  isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }
                }
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-[10px]"
              >
                <span
                  className="inline-block px-[8px] py-[3px] rounded-[21px] text-white text-[16px] font-bold uppercase tracking-tight transition-all duration-200 group-hover:shadow-lg group-hover:scale-105"
                  style={{ backgroundColor: tagColor }}
                >
                  {tag}
                </span>
              </motion.div>

              {/* Title - slightly grows on hover */}
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.3, delay: 0.15 }}
                className="text-white text-[27px] font-bold leading-[33px] tracking-wide transition-all duration-200 group-hover:text-[28px] group-hover:tracking-wider"
              >
                {title}
              </motion.h3>

              {/* Date - brightens on hover */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.3, delay: 0.2 }}
                className="text-white/80 text-[18px] font-semibold tracking-tight mt-[16px] transition-colors duration-200 group-hover:text-white"
              >
                {date}
              </motion.p>
            </div>
          </div>
        </>
      )}

      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 rounded-[31px] ring-0 ring-white/0 transition-all duration-300 group-hover:ring-2 group-hover:ring-white/20 pointer-events-none" />
    </motion.div>
  );
}
