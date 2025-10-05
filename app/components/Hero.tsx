"use client";

import { motion } from "framer-motion";
import { ArrowDown, Mail, Menu } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import { useEffect, useState } from "react";
import Highlighter from "./icons/Highlighter";
import MobileNav from "./MobileNav";
import StickyNav from "./StickyNav";
import TextFadeIn from "./TextFadeIn";

const inter = Inter({ subsets: ["latin"] });

export default function Hero() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Disable zoom on mobile devices
  useEffect(() => {
    // Prevent pinch zoom
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("touchmove", preventZoom, { passive: false });
    document.addEventListener("touchend", preventDoubleTapZoom, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", preventZoom);
      document.removeEventListener("touchend", preventDoubleTapZoom);
    };
  }, []);

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
      style={{ touchAction: "pan-x pan-y" }}
    >
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <nav className="flex items-center justify-between p-4 md:p-6 lg:p-8">
          {/* Left: made by nazarene */}
          <div
            className="text-base md:text-xl lg:text-2xl font-semibold tracking-[-0.08em]"
            style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
          >
            made by nazarene
          </div>

          {/* Right: Get in touch button (desktop only) */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-3 bg-[#374136]/50 backdrop-blur-lg rounded-full text-base lg:text-lg font-semibold hover:bg-[#374136]/70 hover:scale-105 transition-all duration-300">
              <Mail className="w-5 h-5" />
              Get in touch
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Hamburger - Fixed/Sticky position (always on screen) */}
      <button
        onClick={() => setIsMobileNavOpen(true)}
        className="md:hidden fixed top-4 right-4 z-[100] flex items-center justify-center w-11 h-11 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition-all duration-300 shadow-lg"
      >
        <Menu className="w-5 h-5 text-white rotate-180" />
      </button>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Sticky Floating Navigation - Desktop Only */}
      <div className="hidden md:block">
        <StickyNav />
      </div>

      {/* Main Content - Mobile Layout */}
      <main className="flex-1 relative">
        {/* Mobile Layout (base to md) */}
        <div className="md:hidden absolute inset-0">
          {/* Hero Portrait - Mobile - Bottom Right */}
          <div className="absolute right-0 bottom-0 w-[687px] h-[639px] overflow-hidden">
            <Image
              src="/7a97f9ff1efd6be56501753f1f090d23d760914c.png"
              alt="John Nazarene Dela Pisa"
              width={687}
              height={639}
              priority
              quality={90}
              className="w-full h-full object-cover object-left"
            />
          </div>

          {/* Hero Text Container - Mobile */}
          <div className="absolute left-[15px] top-[342px] w-[192px] flex flex-col gap-[11px]">
            <div className="w-[12px] h-[12px]">
              <Highlighter />
            </div>
            <div
              className="text-[23px] font-medium leading-[1.068] tracking-[-0.08em] text-white"
              style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
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

          {/* Hero Title - Mobile */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 5.3, ease: [0.33, 1, 0.68, 1] }}
            className="absolute bottom-[250px] left-[10px] right-[10px] text-[clamp(24px,8vw,35px)] font-bold leading-[1] tracking-[-0.041em] text-center whitespace-nowrap"
            style={{
              background:
                "linear-gradient(to right, #1173FC, #9DB1D3, #CDC6C6, #F9DAB9, #F9DAB8)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              textShadow: "0px 0px 4.35px rgba(0, 0, 0, 0.25)",
              fontFamily: "SF Pro Display, Inter, sans-serif",
            }}
          >
            John Nazarene Dela Pisa
          </motion.h1>

          {/* Scroll Prompt - Mobile - Pointing Down */}
          {isVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                y: [0, 10, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 0.5,
                  delay: 5.4,
                },
                y: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 5.4,
                },
              }}
              className="absolute bottom-[40px] right-[34px] z-10 cursor-pointer"
              onClick={handleScrollToPortfolio}
            >
              <ArrowDown className="w-[21px] h-[18px]" />
            </motion.div>
          )}
        </div>

        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex flex-col items-center justify-center text-center absolute inset-0">
          {/* Location Badge - Desktop Only */}
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

          {/* Grouped Hero Content - Desktop */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-row items-center justify-center">
              {/* Hero Text Container - Desktop */}
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

              {/* Main Image - Desktop */}
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

          {/* Main Title - Desktop */}
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 5.3, ease: [0.33, 1, 0.68, 1] }}
            className="absolute bottom-20 inset-x-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[110px] font-bold z-[100] whitespace-nowrap text-center"
            style={{
              background:
                "linear-gradient(to right, #1173FC, #9DB1D3, #CDC6C6, #F9DAB9, #F9DAB8)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              textShadow: "0px 0px 12px rgba(0, 0, 0, 0.25)",
            }}
          >
            John Nazarene Dela Pisa
          </motion.h1>

          {/* Scroll to Discover - Desktop */}
          {isVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                y: [0, 10, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 0.5,
                  delay: 5.4,
                },
                y: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 5.4,
                },
              }}
              className="absolute bottom-8 right-8 z-10 cursor-pointer hover:scale-105 transition-transform"
              onClick={handleScrollToPortfolio}
            >
              <div className="flex items-center gap-3">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 5.4 }}
                  className="text-[20px] font-semibold leading-[1.068] tracking-[-0.08em] text-white"
                  style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
                >
                  Scroll to Discover
                </motion.p>
                <div className="flex items-center justify-center">
                  <ArrowDown className="w-[20px] h-[20px]" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
