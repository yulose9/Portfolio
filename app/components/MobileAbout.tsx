"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { ImageZoom } from "./ImageZoom";

export default function MobileAbout() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div
      id="about"
      ref={ref}
      className="relative w-full min-h-screen bg-gradient-to-r from-[#dfffd9] via-[#f5f5f5] to-[#ffcae7] px-4 py-[113px]"
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
        className="flex items-center justify-between px-[94px] mb-[64px]"
      >
        <h2
          className="text-[36px] font-medium leading-[33.77px] tracking-[-1.44px] text-black"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          About
        </h2>
        <button className="p-1">
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

      {/* Bento Grid - Scaled down uniformly */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.2,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="relative w-full mb-[20px]"
      >
        <div className="relative w-full h-[257.465px]">
          {/* Image 1: Large center selfie */}
          <div className="absolute w-[159.467px] h-[107.178px] left-[120.62px] top-[75.03px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-14.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-14.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 2: Right side */}
          <div className="absolute w-[57.626px] h-[107.134px] right-0 top-[75.07px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-13.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-13.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 3: Top left small */}
          <div className="absolute w-[37.267px] h-[71.576px] left-[120.62px] top-0 rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-11.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-11.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 4: Top wide horizontal */}
          <div className="absolute w-[179.978px] h-[71.576px] left-[161.35px] top-0 rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-10.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-10.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 5: Top right small square */}
          <div className="absolute w-[57.489px] h-[34.495px] right-[57.626px] top-0 rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-12.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-12.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 6: Right tall */}
          <div className="absolute w-[57.626px] h-[145.235px] right-0 top-[36.97px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-8.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-8.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 7: Top left corner tiny */}
          <div className="absolute w-[57.778px] h-[34.782px] left-0 top-0 rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-7.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-7.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 8: Left middle */}
          <div className="absolute w-[57.778px] h-[52.892px] left-0 top-[38.93px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-6.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-6.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 9: Left tall */}
          <div className="absolute w-[58.005px] h-[162.211px] left-[58.9px] top-0 rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-9.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-9.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 10: Left bottom small */}
          <div className="absolute w-[57.626px] h-[63.375px] left-0 top-[95.82px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-5.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-5.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 11: Bottom left wide */}
          <div className="absolute w-[117.867px] h-[89.686px] left-0 top-[166.36px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-4.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-4.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 12: Bottom middle small */}
          <div className="absolute w-[78.289px] h-[71.001px] left-[120.62px] top-[186.46px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-3.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-3.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 13: Bottom wide horizontal */}
          <div className="absolute w-[199.622px] h-[33.632px] left-[202.38px] top-[186.46px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-2.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-2.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 14: Bottom middle right */}
          <div className="absolute w-[98.222px] h-[33.632px] left-[202.38px] top-[222.68px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image-1.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image-1.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
          </div>

          {/* Image 15: Bottom right */}
          <div className="absolute w-[98.511px] h-[33.632px] left-[303.49px] top-[222.68px] rounded-[9.67px] overflow-hidden group cursor-pointer">
            <ImageZoom src="/images/bento/About image.png" alt="About">
              <div className="relative w-full h-full">
                <Image
                  src="/images/bento/About image.png"
                  alt="About"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </ImageZoom>
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
        className="flex flex-col items-center gap-[6px] max-w-[308.38px] mx-auto"
      >
        {/* Greeting Text with Gradient */}
        <h2
          className="text-[29px] font-bold leading-[1.2] tracking-[-1.16px] text-center mb-[6px]"
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
        <div className="flex items-center gap-[4px] mb-[6px]">
          <svg
            className="w-[11.339px] h-[11.339px]"
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
            className="text-[12px] leading-[1.588] tracking-[-0.48px] text-black"
            style={{
              fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
            }}
          >
            Cavite, Philippines
          </span>
        </div>

        {/* Description */}
        <p
          className="text-[14px] font-normal leading-[1.588] tracking-[-0.56px] text-black text-center"
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
