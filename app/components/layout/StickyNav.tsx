"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";

export default function StickyNav() {
  const [activeSection, setActiveSection] = useState("home");
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInContactOrFooter, setIsInContactOrFooter] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "portfolio", "work", "about"];
      const scrollPosition = window.scrollY + 200;

      // Check if we're past 50% of the hero section
      const heroElement = document.getElementById("home");
      if (heroElement) {
        const heroHeight = heroElement.offsetHeight;
        const scrolledPastHalfHero = window.scrollY > heroHeight * 0.5;

        // Update position with transition animation
        if (scrolledPastHalfHero !== isAtBottom) {
          setIsTransitioning(true);
          // Delay the position change to allow fade out animation
          setTimeout(() => {
            setIsAtBottom(scrolledPastHalfHero);
            setIsTransitioning(false);
          }, 300); // Half of the total animation duration
        }
      }

      // Detect active section
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(sectionId);
            break;
          }
        }
      }

      // Check if we're approaching or in Contact or Footer sections
      const contactElement = document.getElementById("contact");
      // Select only visible footer (desktop version has .hidden.md:block)
      const footerElement = Array.from(
        document.querySelectorAll("footer")
      ).find((footer) => {
        const display = window.getComputedStyle(footer).display;
        return display !== "none";
      });
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;

      let inContactOrFooter = false;

      if (contactElement) {
        const contactTop = contactElement.offsetTop;
        const contactBottom = contactTop + contactElement.offsetHeight;
        // Hide nav when we're 200px before entering the contact section
        const triggerPoint = contactTop - 200;
        if (scrollTop >= triggerPoint && scrollTop < contactBottom) {
          inContactOrFooter = true;
        }
      }

      if (footerElement && !inContactOrFooter) {
        const footerTop = footerElement.offsetTop;
        const footerBottom = footerTop + footerElement.offsetHeight;
        // Hide nav when we're 200px before entering the footer section
        const triggerPoint = footerTop - 200;
        if (scrollTop >= triggerPoint && scrollTop < footerBottom) {
          inContactOrFooter = true;
        }
      }

      setIsInContactOrFooter(inContactOrFooter);
    };

    // Set initial section
    handleScroll();

    // Add scroll listener
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isAtBottom]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Check if Lenis is available for smooth scroll
      if ((window as any).lenis) {
        (window as any).lenis.scrollTo(element, {
          offset: 0,
          duration: 1.5,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        // Fallback to standard smooth scroll
        window.scrollTo({
          top: element.offsetTop,
          behavior: "smooth",
        });
      }
    }
  };

  // Variants for the scale + fade animation
  const navVariants = {
    initial: {
      opacity: 0,
      scale: 0.8,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1] as const, // Custom spring-like easing
        opacity: { duration: 0.3 },
        scale: { type: "spring" as const, stiffness: 400, damping: 25 },
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.3,
        ease: [0.43, 0.13, 0.23, 0.96] as const, // Smooth ease out
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isAtBottom ? "bottom" : "top"}
        className={`fixed z-50 hidden md:flex items-center gap-2 ${
          isAtBottom ? "bottom-8" : "top-8"
        }`}
        style={{
          left: "50%",
          x: "-50%",
        }}
        variants={navVariants}
        initial="initial"
        animate={
          isInContactOrFooter
            ? {
                opacity: 0,
                scale: 0.8,
                transition: {
                  duration: 0.3,
                  ease: [0.43, 0.13, 0.23, 0.96],
                },
              }
            : "animate"
        }
        exit="exit"
      >
        {/* Home Button - Active when on Hero section */}
        <button
          onClick={() => scrollToSection("home")}
          className={`flex items-center justify-center w-12 h-12 backdrop-blur-lg rounded-full hover:scale-110 transition-all duration-300 shadow-lg ${
            activeSection === "home"
              ? "bg-[#374136] text-white"
              : "bg-[#374136]/50 text-white hover:bg-[#374136]/70"
          }`}
        >
          <Home className="w-6 h-6" />
        </button>

        {/* Navigation Pills */}
        <div className="flex items-center bg-[#374136]/50 backdrop-blur-lg rounded-full px-2 py-1 shadow-lg border border-white/10">
          <button
            onClick={() => scrollToSection("portfolio")}
            className={`px-4 py-2 text-base lg:px-6 lg:text-lg font-medium rounded-full transition-all duration-300 ${
              activeSection === "portfolio"
                ? "bg-[#374136] text-white"
                : "hover:bg-white/10 text-white"
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => scrollToSection("work")}
            className={`px-4 py-2 text-base lg:px-6 lg:text-lg font-medium rounded-full transition-all duration-300 ${
              activeSection === "work"
                ? "bg-[#374136] text-white"
                : "hover:bg-white/10 text-white"
            }`}
          >
            Experience
          </button>
          <button
            onClick={() => scrollToSection("about")}
            className={`px-4 py-2 text-base lg:px-6 lg:text-lg font-medium rounded-full transition-all duration-300 ${
              activeSection === "about"
                ? "bg-[#374136] text-white"
                : "hover:bg-white/10 text-white"
            }`}
          >
            About
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
