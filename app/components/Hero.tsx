"use client";

import { motion } from "framer-motion";
import { ArrowDown, Mail, Menu } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import { useState } from "react";
import Highlighter from "./icons/Highlighter";
import StickyNav from "./StickyNav";
import TextFadeIn from "./TextFadeIn";

const inter = Inter({ subsets: ["latin"] });

export default function Hero() {
  const [isVisible, setIsVisible] = useState(true);

  const handleScrollToPortfolio = () => {
    // Hide the button with fade out
    setIsVisible(false);

    // Smooth scroll to portfolio section using Lenis
    setTimeout(() => {
      const portfolioSection = document.getElementById("portfolio");
      if (portfolioSection && (window as any).lenis) {
        (window as any).lenis.scrollTo(portfolioSection, {
          offset: 0,
          duration: 1.5,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
    }, 300);
  };

  return (
    <div
      id="home"
      className={`relative w-screen h-screen bg-[#657A62] text-white ${inter.className} overflow-hidden flex flex-col`}
    >
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <nav className="flex items-center justify-between p-4 md:p-6 lg:p-8">
          {/* Left: Code by */}
          <TextFadeIn
            text="made by nazarene"
            as="div"
            className="text-lg md:text-xl lg:text-2xl font-semibold tracking-tighter"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
            delay={5.0}
            staggerDelay={0.02}
          />

          {/* Right: Get in touch / Hamburger */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-3 bg-[#374136]/50 backdrop-blur-lg rounded-full text-base lg:text-lg font-semibold hover:bg-[#374136]/70 hover:scale-105 transition-all duration-300">
              <Mail className="w-5 h-5" />
              Get in touch
            </button>
            <button className="md:hidden flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition-all duration-300">
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </nav>
      </header>

      {/* Sticky Floating Navigation - With Active States */}
      <StickyNav />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center relative">
        {/* Location Badge - pushed to the very left */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[356px] h-[162px] bg-white/10 backdrop-blur-lg rounded-r-3xl flex items-center justify-center">
          <div className="flex items-center gap-[51px] px-[54px]">
            <TextFadeIn
              text="Located in the Philippines"
              as="div"
              className="text-[26px] font-semibold leading-[107%] tracking-[-0.105em] text-left"
              style={{ fontFamily: "Inter, SF UI Text, sans-serif" }}
              delay={5.05}
              staggerDelay={0.03}
            />
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden flex-shrink-0">
              <Image
                src="/snazzy-image.png"
                alt="Philippines Map"
                width={100}
                height={100}
                priority
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Grouped Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-row items-center justify-center">
            {/* Hero Text Container */}
            <div className="flex flex-col items-start gap-[23px] w-[411px] z-10">
              <Highlighter />
              <div
                className="w-full text-[40px] font-medium leading-[107%] tracking-[-0.08em] text-left flex flex-col gap-2"
                style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
              >
                <TextFadeIn
                  text="Developer"
                  as="div"
                  delay={5.1}
                  staggerDelay={0.03}
                />
                <TextFadeIn
                  text="Cloud Engineer"
                  as="div"
                  delay={5.15}
                  staggerDelay={0.03}
                />
                <TextFadeIn
                  text="Artificial Intelligence"
                  as="div"
                  delay={5.2}
                  staggerDelay={0.03}
                />
              </div>
            </div>

            {/* Main Image */}
            <div className="w-full max-w-2xl -ml-72 transform translate-y-32">
              <Image
                src="/7a97f9ff1efd6be56501753f1f090d23d760914c.png"
                alt="John Nazarene Dela Pisa"
                width={981}
                height={913}
                priority
                quality={90}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTgxIiBoZWlnaHQ9IjkxMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOTgxIiBoZWlnaHQ9IjkxMyIgZmlsbD0iIzY1N0E2MiIvPjwvc3ZnPg=="
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Main Title - Centered with Gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 5.3, ease: [0.33, 1, 0.68, 1] }}
          className="absolute bottom-20 inset-x-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[110px] font-bold z-[100] whitespace-nowrap text-center"
          style={{
            background:
              "radial-gradient(13731.17% 574.54% at 98.77% -239.38%, #1173FC 0%, #9DB1D3 12.31%, #CDC6C6 27.35%, #F9DAB9 49.66%, #F9DAB8 67.51%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          John Nazarene Dela Pisa
        </motion.h1>
      </main>

      {/* Scroll to Discover */}
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: [0, -10, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{
            y: {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 5.4,
            },
            opacity: {
              duration: 0.5,
              delay: 5.4,
            },
          }}
          className="absolute bottom-4 md:bottom-8 right-4 md:right-8 z-10 cursor-pointer hover:scale-110 transition-transform"
          onClick={handleScrollToPortfolio}
        >
          <TextFadeIn
            text="Scroll to Discover"
            as="span"
            className="text-base md:text-lg font-medium flex items-center gap-2"
            delay={5.4}
            staggerDelay={0.03}
          />
          <motion.div
            animate={{
              y: [0, 5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ArrowDown className="w-5 h-5 md:w-6 md:h-6" />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
