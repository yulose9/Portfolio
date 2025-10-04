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
}

export default function BlogCard({
  image,
  tag,
  tagColor,
  title,
  date,
}: BlogCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative bg-black rounded-[31px] overflow-hidden w-full h-[471px] group cursor-pointer"
    >
      {/* Image Container - fills entire card with zoom effect on hover */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="relative w-full h-full transition-transform duration-700 ease-out group-hover:scale-110">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Gradient overlay - enhanced on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 transition-all duration-500 group-hover:from-transparent group-hover:via-black/50 group-hover:to-black" />

      {/* Animated shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]" />
      </div>

      {/* Content Container - slides up slightly on hover */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end pb-[31px] px-[31px] transition-all duration-500 group-hover:pb-[35px]">
        <div className="w-full space-y-[10px]">
          {/* Tag - glows on hover */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-[10px]"
          >
            <span
              className="inline-block px-[8px] py-[3px] rounded-[21px] text-white text-[16px] font-bold uppercase tracking-tight transition-all duration-300 group-hover:shadow-lg group-hover:scale-105"
              style={{ backgroundColor: tagColor }}
            >
              {tag}
            </span>
          </motion.div>

          {/* Title - slightly grows on hover */}
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-white text-[27px] font-bold leading-[33px] tracking-wide transition-all duration-300 group-hover:text-[28px] group-hover:tracking-wider"
          >
            {title}
          </motion.h3>

          {/* Date - brightens on hover */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-white/80 text-[18px] font-semibold tracking-tight mt-[16px] transition-colors duration-300 group-hover:text-white"
          >
            {date}
          </motion.p>
        </div>
      </div>

      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 rounded-[31px] ring-0 ring-white/0 transition-all duration-500 group-hover:ring-2 group-hover:ring-white/20 pointer-events-none" />
    </motion.div>
  );
}
