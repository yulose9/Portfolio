"use client";

import { ImageZoom } from "@/app/components/shared";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

export default function MobileAbout() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div
      ref={ref}
      id="about"
      className="relative w-full min-h-screen bg-gradient-to-r from-[#dfffd9] via-[#f5f5f5] to-[#ffcae7] px-4 py-16"
    >
      {/* Header with About and Arrow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="flex items-center justify-between mb-8 px-2"
      >
        <h2
          className="text-[36px] font-medium leading-[33.77px] tracking-[-1.44px] text-black"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          About
        </h2>
        <button className="p-1" aria-label="View more about">
          <svg
            className="w-[18.408px] h-[15.082px] text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </motion.div>

      {/* Bento Grid - Mobile Scaled Down from Desktop (maintaining exact proportions) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.2,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="w-full mb-8"
      >
        {/* Container that maintains desktop proportions but scaled for mobile */}
        {/* Desktop: 1074x686px, Mobile: Scale to fit screen width */}
        <div className="relative w-full" style={{ paddingBottom: "63.87%" }}>
          {/* 686/1074 = 0.6387 aspect ratio */}
          <div className="absolute inset-0">
            {/* All positions are percentages of container to maintain proportions */}

            {/* Image 1: Top-left small square */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.1,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.34%", // 154/1074
                height: "13.56%", // 93/686
                left: "0%",
                top: "0%",
              }}
            >
              <ImageZoom src="/images/bento/About image-7.png" alt="About 1">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-7.png"
                    alt="About 1"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 2: Tall vertical - power lines */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.15,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.43%", // 155/1074
                height: "63.27%", // 434/686
                left: "14.9%", // 160/1074
                top: "0%",
              }}
            >
              <ImageZoom src="/images/bento/About image-9.png" alt="About 2">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-9.png"
                    alt="About 2"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 3: Top small square - sunflower */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.2,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "9.22%", // 99/1074
                height: "27.99%", // 192/686
                left: "30.17%", // 324/1074
                top: "0%",
              }}
            >
              <ImageZoom src="/images/bento/About image-11.png" alt="About 3">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-11.png"
                    alt="About 3"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 4: Wide horizontal - soju bottles */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.25,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "44.69%", // 480/1074
                height: "27.99%", // 192/686
                left: "40.32%", // 433/1074
                top: "0%",
              }}
            >
              <ImageZoom src="/images/bento/About image-10.png" alt="About 4">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-10.png"
                    alt="About 4"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 5: Small square top-right */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.3,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.25%", // 153/1074
                height: "13.41%", // 92/686
                left: "85.75%", // 921/1074
                top: "0%",
              }}
            >
              <ImageZoom src="/images/bento/About image-12.png" alt="About 5">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-12.png"
                    alt="About 5"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 6: Tall vertical right - building/ceiling */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.35,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.25%", // 153/1074
                height: "56.71%", // 389/686
                left: "85.75%", // 921/1074
                top: "14.43%", // 99/686
              }}
            >
              <ImageZoom src="/images/bento/About image-8.png" alt="About 6">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-8.png"
                    alt="About 6"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 7: Medium vertical left */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.4,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.34%", // 154/1074
                height: "20.70%", // 142/686
                left: "0%",
                top: "15.16%", // 104/686
              }}
            >
              <ImageZoom src="/images/bento/About image-6.png" alt="About 7">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-6.png"
                    alt="About 7"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 8: Bottom left */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.45,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.34%", // 154/1074
                height: "24.78%", // 170/686
                left: "0%",
                top: "37.46%", // 257/686
              }}
            >
              <ImageZoom src="/images/bento/About image-5.png" alt="About 8">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-5.png"
                    alt="About 8"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 9: Wide middle horizontal - selfie */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.5,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "39.57%", // 425/1074
                height: "41.84%", // 287/686
                left: "30.17%", // 324/1074
                top: "29.30%", // 201/686
              }}
            >
              <ImageZoom src="/images/bento/About image-14.png" alt="About 9">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-14.png"
                    alt="About 9"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 10: Medium right side */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.55,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "14.24%", // 153/1074
                height: "41.84%", // 287/686
                left: "70.58%", // 758/1074
                top: "29.30%", // 201/686
              }}
            >
              <ImageZoom src="/images/bento/About image-13.png" alt="About 10">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-13.png"
                    alt="About 10"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 11: Bottom wide horizontal */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.6,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "29.24%", // 314/1074
                height: "34.99%", // 240/686
                left: "0%",
                top: "65.01%", // 446/686
              }}
            >
              <ImageZoom src="/images/bento/About image-4.png" alt="About 11">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-4.png"
                    alt="About 11"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 12: Bottom middle small */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.65,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "19.46%", // 209/1074
                height: "27.70%", // 190/686
                left: "30.17%", // 324/1074
                top: "72.74%", // 499/686
              }}
            >
              <ImageZoom src="/images/bento/About image-3.png" alt="About 12">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-3.png"
                    alt="About 12"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 13: Wide bottom horizontal */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.7,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "49.53%", // 532/1074
                height: "13.12%", // 90/686
                left: "50.47%", // 542/1074
                top: "72.74%", // 499/686
              }}
            >
              <ImageZoom src="/images/bento/About image-2.png" alt="About 13">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-2.png"
                    alt="About 13"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 14: Bottom small */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.75,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "24.39%", // 262/1074
                height: "13.12%", // 90/686
                left: "50.47%", // 542/1074
                top: "86.88%", // 596/686
              }}
            >
              <ImageZoom src="/images/bento/About image-1.png" alt="About 14">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image-1.png"
                    alt="About 14"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>

            {/* Image 15: Bottom right */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 30, scale: 0.9 }
              }
              transition={{
                duration: 0.6,
                delay: 0.8,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="absolute rounded-[8px] md:rounded-[26px] overflow-hidden group cursor-pointer"
              style={{
                width: "24.49%", // 263/1074
                height: "13.12%", // 90/686
                left: "75.60%", // 812/1074
                top: "86.88%", // 596/686
              }}
            >
              <ImageZoom src="/images/bento/About image.png" alt="About 15">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/bento/About image.png"
                    alt="About 15"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </ImageZoom>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Text Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.4,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="flex flex-col items-center gap-2 max-w-md mx-auto px-4"
      >
        {/* Greeting Text with Gradient */}
        <h2
          className="text-[29px] font-bold leading-[1.2] tracking-[-1.16px] text-center mb-2"
          style={{
            fontFamily: "Inter, SF Pro Display, sans-serif",
            background:
              "linear-gradient(90deg, #22337B 0%, #AF64BA 50%, #CA3247 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Hi again, I&apos;m John.
        </h2>

        {/* Location Badge */}
        <div className="flex items-center gap-1 mb-2">
          <svg
            className="w-3 h-3"
            viewBox="0 0 36 37"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.24647 36.1281H29.0925C33.1675 36.1281 35.2804 34.0152 35.2804 29.9968V7.03756C35.2804 3.00035 33.1675 0.906281 29.0925 0.906281H6.24647C2.17153 0.906281 0.0585938 3.00035 0.0585938 7.03756V29.9968C0.0585938 34.034 2.17153 36.1281 6.24647 36.1281ZM7.71797 20.0925C5.94462 20.0925 5.60504 18.1116 7.09541 17.4324L24.8478 9.05616C26.4702 8.30154 27.8852 9.71645 27.1305 11.3389L18.8297 29.1101C18.1506 30.5817 16.1697 30.2798 16.1697 28.4687V20.7527C16.1697 20.3566 15.9056 20.0925 15.5283 20.0925H7.71797Z"
              fill="#1C1C1E"
            />
          </svg>
          <span
            className="text-xs leading-[1.588] tracking-[-0.48px] text-black"
            style={{
              fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
            }}
          >
            Cavite, Philippines
          </span>
        </div>

        {/* Description */}
        <p
          className="text-sm font-normal leading-[1.588] tracking-[-0.56px] text-black text-center"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          Greetings! I am a Computer Engineer residing in the Philippines. My
          interests lie in Hardware, Software, and UI/UX Design, and I am
          currently searching for fresh opportunities to apply my expertise in
          the tech industry.
        </p>
      </motion.div>
    </div>
  );
}
