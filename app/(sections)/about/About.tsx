"use client";

import { GsapBouncyText } from "@/app/(sections)/hero";
import { BentoImageZoom } from "@/app/components/shared";
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
      <div className="md:hidden">
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
          <div className="absolute top-[20%] left-[10%] w-[46.555%] h-[72.886%] bg-[#dfffd9] rounded-full blur-[120px] opacity-30 animate-pulse" />
          <div
            className="absolute bottom-[10%] right-[15%] w-[55.866%] h-[87.464%] bg-[#ffcae7] rounded-full blur-[140px] opacity-25 animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="max-w-[1280px] mx-auto w-full relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <GsapBouncyText
              text="About"
              as="h2"
              className="text-[clamp(36px,5vw,64px)] font-medium leading-[0.938] tracking-[-2.56px] text-black"
              style={{ fontFamily: "Inter, sans-serif" }}
            />

          </div>

          {/* Bento Grid - Exact Figma Layout - Centered */}
          <div className="flex justify-center">
            <div
              className="relative w-full max-w-[1074px] aspect-[1074/686] my-8"

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
                  duration: 0.3,
                  delay: 0.1,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[14.339%] h-[13.557%] left-0 top-0 rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/20240505_002215.jpg"
                  alt="About 1"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/20240505_002215.jpg"
                      alt="About 1"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[14.432%] h-[63.265%] left-[14.898%] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/20241103_174110.jpg"
                  alt="About 2"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/20241103_174110.jpg"
                      alt="About 2"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[9.218%] h-[27.988%] left-[30.168%] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/20241217_214653.jpg"
                  alt="About 3"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/20241217_214653.jpg"
                      alt="About 3"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[44.693%] h-[27.988%] left-[40.317%] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/20250122_180802.jpg"
                  alt="About 4"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/20250122_180802.jpg"
                      alt="About 4"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[14.246%] h-[13.411%] left-[85.754%] top-0 rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/20250429_151140.jpg"
                  alt="About 5"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/20250429_151140.jpg"
                      alt="About 5"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[14.246%] h-[56.706%] left-[85.754%] top-[14.431%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/20250429_152858.jpg"
                  alt="About 6"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/20250429_152858.jpg"
                      alt="About 6"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[14.339%] h-[20.700%] left-0 top-[15.160%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20230623_134358.jpg"
                  alt="About 7"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20230623_134358.jpg"
                      alt="About 7"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[14.339%] h-[24.781%] left-0 top-[37.464%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20210208_172445.jpg"
                  alt="About 8"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20210208_172445.jpg"
                      alt="About 8"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[39.572%] h-[41.837%] left-[30.168%] top-[29.300%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom src="/new_images/IMG_0142.JPG" alt="About 9">
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_0142.JPG"
                      alt="About 9"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[9.5983rem] h-[41.837%] left-[70.577%] top-[29.300%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20211209_161208.jpg"
                  alt="About 10"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20211209_161208.jpg"
                      alt="About 10"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[29.236%] h-[34.985%] left-0 top-[65.015%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20211216_162442.jpg"
                  alt="About 11"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20211216_162442.jpg"
                      alt="About 11"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[19.460%] h-[27.697%] left-[30.168%] top-[72.741%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20220724_065655.jpg"
                  alt="About 12"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20220724_065655.jpg"
                      alt="About 12"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[49.534%] h-[13.120%] left-[50.466%] top-[72.741%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20230209_191600.jpg"
                  alt="About 13"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20230209_191600.jpg"
                      alt="About 13"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[24.395%] h-[13.120%] left-[50.466%] top-[86.880%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20230313_134905.jpg"
                  alt="About 14"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20230313_134905.jpg"
                      alt="About 14"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
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
                  duration: 0.3,
                  delay: 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="absolute w-[24.488%] h-[13.120%] left-[75.605%] top-[86.880%] rounded-[26px] overflow-hidden group cursor-pointer"
              >
                <BentoImageZoom
                  src="/new_images/IMG_20230316_161832.jpg"
                  alt="About 15"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src="/new_images/IMG_20230316_161832.jpg"
                      alt="About 15"
                      fill
                      sizes="(max-width: 767px) 35vw, 320px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </BentoImageZoom>
              </motion.div>
            </div>
          </div>

          {/* Greeting Text with Linear Gradient */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
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
            transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
            className="flex items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-[2.607%] h-[4.082%]"
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
            transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
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
