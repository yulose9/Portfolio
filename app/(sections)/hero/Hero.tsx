"use client";

import { useHaptics } from "@/app/hooks/use-haptics";
import { scrollToSection } from "@/app/utils/navigation";
import { Highlighter } from "@/app/components/icons";
import { MobileNav } from "@/app/components/layout";
import { AnimatePresence } from "framer-motion";
import { Mail, Menu } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  GradientText,
  GsapBouncyText,
  HeroRoles,
  PhilippineCulturalRoulette,
  ScrollPrompt,
} from "./";

const inter = Inter({ subsets: ["latin"] });

export default function Hero() {
  const haptic = useHaptics();
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isOnLightSection, setIsOnLightSection] = useState(false);
  const [isInHeroSection, setIsInHeroSection] = useState(true);

  // Note: Zoom prevention is handled via CSS touch-action in globals.css
  // No JavaScript event listeners needed - this prevents scroll blocking issues

  // Detect section for hamburger color and hero section
  useEffect(() => {
    const handleScroll = () => {
      // Check if we're in the hero section (near top of page)
      const inHero = window.scrollY < 100;
      setIsInHeroSection(inHero);

      // Hide scroll indicator when scrolled past hero section
      if (window.scrollY > 100) {
        setIsVisible(false);
      }

      const sections = [
        { id: "home", isLight: false },
        { id: "portfolio", isLight: true },
        { id: "work", isLight: false },
        { id: "about", isLight: true },
        { id: "contact", isLight: true },
      ];

      const scrollPosition = window.scrollY + 100;
      let currentSection = sections[0];

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            currentSection = section;
            break;
          }
        }
      }

      // Check footer
      const footerElement = Array.from(
        document.querySelectorAll("footer")
      ).find((footer) => {
        const display = window.getComputedStyle(footer).display;
        return display !== "none";
      });

      if (footerElement) {
        const footerTop = footerElement.offsetTop;
        const footerBottom = footerTop + footerElement.offsetHeight;
        if (scrollPosition >= footerTop && scrollPosition < footerBottom) {
          setIsOnLightSection(true);
          return;
        }
      }

      setIsOnLightSection(currentSection.isLight);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Timer to reappear "Scroll to Discover" after 7 seconds when in hero section
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isInHeroSection && !isVisible) {
      timeoutId = setTimeout(() => {
        setIsVisible(true);
      }, 7000); // 7 seconds
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isInHeroSection, isVisible]);

  const handleScrollToPortfolio = () => {
    setIsVisible(false);
    scrollToSection("portfolio");
  };

  const handleScrollToContact = () => { haptic("light"); scrollToSection("contact"); };

  return (
    <div
      id="home"
      className={`hero-section relative w-full bg-brand-primary text-white ${inter.className} overflow-hidden flex flex-col`}
      style={{
        height: "100svh",
        minHeight: "640px",
      }}
    >
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <nav className="hero-header flex items-center justify-between">
          {/* Left: made by nazarene */}
          <div
            className="hero-brand font-semibold tracking-[-0.045em]"
            style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
          >
            made by nazarene
          </div>

          {/* Right: Get in touch button (desktop only) */}
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={handleScrollToContact}
              className="hero-contact hidden md:flex items-center gap-2 px-4 py-2 bg-brand-secondary/50 backdrop-blur-lg rounded-full text-sm lg:text-base font-semibold hover:bg-brand-secondary/70 hover:scale-105 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300"
            >
              <Mail className="w-5 h-5" />
              Get in touch
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Hamburger - Fixed/Sticky position (always on screen) */}
      <button
        aria-label="Open navigation menu"
        aria-expanded={isMobileNavOpen}
        aria-controls="mobile-navigation"
        onClick={() => { haptic("light"); setIsMobileNavOpen(true); }}
        className={`md:hidden fixed top-4 right-4 z-[100] flex items-center justify-center w-11 h-11 backdrop-blur-lg rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 shadow-lg ${
          isOnLightSection
            ? "bg-black hover:bg-black/80"
            : "bg-white/10 hover:bg-white/20"
        }`}
      >
        <Menu
          className={`w-5 h-5 rotate-180 transition-colors duration-300 ${
            isOnLightSection ? "text-white" : "text-white"
          }`}
        />
      </button>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content - Mobile Layout */}
      <div className="flex-1 relative">
        {/* Mobile Layout (base to md) */}
        <div className="md:hidden absolute inset-0">
          {/* Hero Portrait - Mobile - Bottom Right */}
          <div className="hero-portrait-mobile absolute overflow-hidden">
            <Image
              src="/image 1-final.png"
              alt="John Nazarene Dela Pisa"
              width={687}
              height={639}
              loading="eager"
              fetchPriority="high"
              quality={82}
              sizes="(max-width: 767px) 100vw, 672px"
              className="w-full h-full object-contain object-bottom"
            />
          </div>

          {/* Hero Text Container - Mobile */}
          <div className="hero-roles-mobile absolute flex flex-col gap-3 z-10">
            <div className="w-[24px] h-[24px]">
              <Highlighter />
            </div>
            <div
              className="text-[clamp(20px,5.2vw,30px)] font-medium leading-[1.068] tracking-normal text-white whitespace-nowrap"
              style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
            >
              <HeroRoles useWelcomeEvent welcomeEventDelay={0.1} />
            </div>
          </div>

          {/* Hero Title - Mobile */}
          <GradientText
            text="John Nazarene Dela Pisa"
            className="hero-name-mobile absolute left-4 right-4 text-[clamp(22px,6.4vw,46px)] font-bold leading-[1] tracking-[-0.041em] text-center whitespace-nowrap"
            style={{
              textShadow: "0px 0px 4.35px rgba(0, 0, 0, 0.25)",
              fontFamily: "SF Pro Display, Inter, sans-serif",
            }}
            animationDuration={10}
            useWelcomeEvent
            welcomeEventDelay={0.3}
          />
        </div>

        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex flex-col items-center justify-center text-center absolute inset-0">
          {/* Location Badge - Desktop Only */}
          <div className="hero-location hidden 2xl:flex absolute top-1/2 -translate-y-1/2 left-0 w-[250px] h-[120px] bg-white/10 backdrop-blur-lg rounded-r-3xl flex items-center justify-center z-[150]">
            <div className="flex items-center gap-5 px-6">
              <GsapBouncyText
                text="Located in the Philippines"
                as="div"
                className="text-xl font-semibold leading-[107%] tracking-[-0.02em] text-left"
                style={{ fontFamily: "Inter, SF UI Text, sans-serif" }}
                useWelcomeEvent
                welcomeEventDelay={0}
                staggerDelay={0.03}
              />
              <PhilippineCulturalRoulette />
            </div>
          </div>

          {/* Grouped Hero Content - Desktop */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="hero-composition relative w-full h-full">
              {/* Hero Text Container - Desktop */}
              <div className="hero-roles-desktop absolute flex flex-col items-start gap-5 z-10">
                <Highlighter />
                <div
                  className="w-full text-[clamp(24px,2.6vw,40px)] font-medium leading-[1.15] tracking-[-0.045em] text-left flex flex-col gap-2"
                  style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                >
                  <HeroRoles useWelcomeEvent welcomeEventDelay={0.2} />
                </div>
              </div>

              {/* Main Image - Desktop */}
              <div className="hero-portrait-desktop absolute">
                <Image
                  src="/image 1-final.png"
                  alt="John Nazarene Dela Pisa"
                  width={981}
                  height={913}
                  loading="eager"
                  fetchPriority="high"
                  quality={82}
              sizes="(max-width: 767px) 100vw, 672px"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTgxIiBoZWlnaHQ9IjkxMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOTgxIiBoZWlnaHQ9IjkxMyIgZmlsbD0iIzY1N0E2MiIvPjwvc3ZnPg=="
                  className="w-full h-full object-contain object-bottom"
                />
              </div>
            </div>
          </div>

          {/* Main Title - Desktop */}
          <GradientText
            text="John Nazarene Dela Pisa"
            className="hero-name-desktop absolute inset-x-0 text-[clamp(44px,6.2vw,100px)] font-bold z-[100] whitespace-nowrap text-center"
            style={{
              textShadow: "0px 0px 12px rgba(0, 0, 0, 0.25)",
            }}
            animationDuration={10}
            useWelcomeEvent
            welcomeEventDelay={0.4}
          />
        </div>

        {/* Shared Scroll Prompt (Handles its own responsive visibility) */}
        <ScrollPrompt isVisible={isVisible} onClick={handleScrollToPortfolio} />
      </div>
    </div>
  );
}
