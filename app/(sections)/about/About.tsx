"use client";

import { GsapBouncyText } from "@/app/(sections)/hero";
import { ImageZoom } from "@/app/components/shared";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { MobileAbout } from "./";

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <>
      {/* Mobile Version */}
      <div className="block md:hidden">
        <MobileAbout />
      </div>

      {/* Desktop Version */}
      <section
        id="about"
        ref={ref}
        className="hidden md:flex relative min-h-screen flex-col justify-center px-8 py-12 bg-gradient-to-br from-[#dfffd9] via-[#f5f5f5] to-[#ffcae7] overflow-hidden"
      >
        {/* Animated gradient orbs in background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#dfffd9] rounded-full blur-[120px] opacity-30 animate-pulse" />
          <div
            className="absolute bottom-[10%] right-[15%] w-[600px] h-[600px] bg-[#ffcae7] rounded-full blur-[140px] opacity-25 animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="max-w-[1280px] mx-auto w-full relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <GsapBouncyText
              text="About"
              as="h2"
              className="text-[64px] font-medium leading-[0.938] tracking-[-2.56px] text-black"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
            <button className="p-1 hover:scale-110 transition-transform">
              <svg
                className="w-12 h-12 text-black"
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
          </div>

          {/* Bento Grid - Exact Figma Layout - Centered */}
          <div className="flex justify-center">
            <div
              className="relative w-[1074px] h-[686px]"
              style={{ transform: "scale(0.85)", transformOrigin: "center" }}
            >
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
                className="absolute w-[154px] h-[93px] left-0 top-0 rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[155px] h-[434px] left-[160px] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[99px] h-[192px] left-[324px] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[480px] h-[192px] left-[433px] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[153px] h-[92px] left-[921px] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[153px] h-[389px] left-[921px] top-[99px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[154px] h-[142px] left-0 top-[104px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[154px] h-[170px] left-0 top-[257px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[425px] h-[287px] left-[324px] top-[201px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[9.5983rem] h-[287px] left-[758px] top-[201px] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <ImageZoom
                  src="/images/bento/About image-13.png"
                  alt="About 10"
                >
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
                className="absolute w-[314px] h-[240px] left-0 top-[446px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[209px] h-[190px] left-[324px] top-[499px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[532px] h-[90px] left-[542px] top-[499px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[262px] h-[90px] left-[542px] top-[596px] rounded-[26px] overflow-hidden group cursor-pointer"
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
                className="absolute w-[263px] h-[90px] left-[812px] top-[596px] rounded-[26px] overflow-hidden group cursor-pointer"
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

          {/* Greeting Text with Linear Gradient */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-center"
          >
            <h2
              className="text-[72px] font-bold leading-[1.2] tracking-[-2.88px]"
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
          </motion.div>

          {/* Location Badge - Simple flex with icon + text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-[28px] h-[28px]"
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
                className="text-[28px] leading-[1.588] tracking-[-1.12px] text-black"
                style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
              >
                Cavite, Philippines
              </span>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="text-[24px] font-normal leading-[1.588] tracking-[-0.96px] text-black text-center max-w-[900px] mx-auto"
            style={{ fontFamily: "Inter, SF Pro Display, sans-serif" }}
          >
            Greetings! I am a Computer Engineer residing in the Philippines. My
            interests lie in Hardware, Software, and UI/UX Design, and I am
            currently searching for fresh opportunities to apply my expertise in
            the tech industry.
          </motion.p>
        </div>
      </section>
    </>
  );
}
