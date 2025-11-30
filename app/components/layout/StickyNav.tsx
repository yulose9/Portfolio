"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Home } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function StickyNav() {
  const [activeSection, setActiveSection] = useState("home");
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [welcomeComplete, setWelcomeComplete] = useState(false);

  // Refs for nav item measurements
  const navContainerRef = useRef<HTMLDivElement>(null);
  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const navItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Store contact/footer refs
  const contactRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  // Listen for welcome screen completion
  useEffect(() => {
    const handlePreloadComplete = () => {
      // Add a small delay for smooth transition after welcome screen lifts
      setTimeout(() => {
        setWelcomeComplete(true);
      }, 800);
    };

    // Check if preload already completed (e.g., on fast refresh)
    // The welcome screen dispatches 'preloadComplete' event
    window.addEventListener("preloadComplete", handlePreloadComplete);

    // Safety timeout - show nav after 6 seconds regardless
    const safetyTimer = setTimeout(() => {
      setWelcomeComplete(true);
    }, 6000);

    return () => {
      window.removeEventListener("preloadComplete", handlePreloadComplete);
      clearTimeout(safetyTimer);
    };
  }, []);

  const findElements = useCallback(() => {
    // Find the visible contact section (desktop)
    const contactElements = document.querySelectorAll("#contact");
    contactRef.current = Array.from(contactElements).find((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        (el as HTMLElement).offsetHeight > 0
      );
    }) as HTMLElement | null;

    // Find the visible footer
    const footerElements = document.querySelectorAll("footer");
    footerRef.current = Array.from(footerElements).find((footer) => {
      const style = window.getComputedStyle(footer);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        (footer as HTMLElement).offsetHeight > 0
      );
    }) as HTMLElement | null;
  }, []);

  useEffect(() => {
    // Mark as mounted
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Wait a frame for DOM to be ready before finding elements
    const initTimeout = setTimeout(() => {
      findElements();
    }, 100);

    window.addEventListener("resize", findElements);

    // Use requestAnimationFrame for smooth scroll handling
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Position logic: top or bottom based on hero scroll
          const heroElement = document.getElementById("home");
          if (heroElement) {
            const heroHeight = heroElement.offsetHeight;
            const scrolledPastHalfHero = window.scrollY > heroHeight * 0.5;
            setIsAtBottom(scrolledPastHalfHero);
          }

          // Active section detection using "most visible" approach
          const sections = ["home", "portfolio", "work", "about"];
          const viewportHeight = window.innerHeight;
          let maxVisibility = 0;
          let mostVisibleSection = "home";

          for (const sectionId of sections) {
            const element = document.getElementById(sectionId);
            if (element) {
              const rect = element.getBoundingClientRect();

              // Calculate how much of the section is visible
              const visibleTop = Math.max(0, rect.top);
              const visibleBottom = Math.min(viewportHeight, rect.bottom);
              const visibleHeight = Math.max(0, visibleBottom - visibleTop);
              const visibilityRatio = visibleHeight / viewportHeight;

              if (visibilityRatio > maxVisibility) {
                maxVisibility = visibilityRatio;
                mostVisibleSection = sectionId;
              }
            }
          }

          setActiveSection(mostVisibleSection);

          // Hide logic: check if contact or footer is in view
          // Re-find elements on each scroll to ensure we have the correct refs
          if (!contactRef.current || !footerRef.current) {
            findElements();
          }

          let hide = false;

          if (contactRef.current) {
            const rect = contactRef.current.getBoundingClientRect();
            // Start hiding when contact section enters the viewport
            if (rect.top < viewportHeight * 0.8) {
              hide = true;
            }
          }

          if (footerRef.current) {
            const rect = footerRef.current.getBoundingClientRect();
            // Also hide when footer is visible
            if (rect.top < viewportHeight) {
              hide = true;
            }
          }

          setShouldHide(hide);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Delay initial scroll check to ensure DOM is ready
    const scrollTimeout = setTimeout(() => {
      handleScroll();
    }, 150);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(scrollTimeout);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", findElements);
    };
  }, [isMounted, findElements]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) {
      console.warn(`Section "${sectionId}" not found`);
      return;
    }

    // Use Lenis if available, otherwise fallback
    if (window.lenis) {
      window.lenis.scrollTo(element, {
        offset: 0,
        duration: 1.5,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const navItems = [
    { id: "portfolio", label: "Portfolio" },
    { id: "work", label: "Experience" },
    { id: "about", label: "About" },
  ];

  // Don't render anything until mounted and welcome screen is complete
  if (!isMounted || !welcomeComplete) return null;

  return (
    <AnimatePresence mode="wait">
      {!shouldHide && (
        <motion.div
          key="sticky-nav"
          ref={navContainerRef}
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: isAtBottom ? 40 : -40 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.2 },
          }}
          className={`fixed z-[9999] hidden md:flex items-center justify-center gap-[18px] inset-x-0 mx-auto w-fit ${
            isAtBottom ? "bottom-8" : "top-8"
          }`}
        >
          <LayoutGroup id="sticky-nav">
            {/* Home Button */}
            <button
              ref={homeButtonRef}
              onClick={() => scrollToSection("home")}
              aria-label="Navigate to home section"
              className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg overflow-hidden"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-[#374136]/50 backdrop-blur-lg" />

              {/* Active indicator for home */}
              {activeSection === "home" && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 bg-[#374136]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <Home
                className="w-6 h-6 text-white relative z-10"
                aria-hidden="true"
              />
            </button>

            {/* Navigation Pills Container */}
            <div className="relative flex items-center bg-[#374136]/50 backdrop-blur-lg rounded-full px-2 py-1 shadow-lg border border-white/10">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (el) navItemRefs.current.set(item.id, el);
                  }}
                  onClick={() => scrollToSection(item.id)}
                  className="relative px-4 py-2 text-base lg:px-6 lg:text-lg font-medium rounded-full text-white z-10"
                >
                  {/* Active indicator */}
                  {activeSection === item.id && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-[#374136] rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
