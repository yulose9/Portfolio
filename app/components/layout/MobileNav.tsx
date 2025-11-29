"use client";

import { scrollToSection } from "@/app/utils/navigation";
import { lockScroll, unlockScroll } from "@/app/utils/scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Code, Home, Mail, User, X } from "lucide-react";
import { useEffect, useState } from "react";

// Unique lock ID for this component
const SCROLL_LOCK_ID = "mobile-nav";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { id: "home", label: "Home", icon: Home, section: "home" },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
    section: "portfolio",
  },
  { id: "experience", label: "Experience", icon: Code, section: "work" },
  { id: "about", label: "About", icon: User, section: "about-mobile" },
];

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const [activeSection, setActiveSection] = useState<string>("home");

  // Detect which section is currently in view - More aggressive detection
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "portfolio", "work", "about-mobile", "contact"];

      // Use a smaller offset for more accurate detection
      const scrollPosition = window.scrollY + 150; // 150px from top

      // Find which section is most visible
      let currentSection = "home";
      let maxVisibility = 0;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementBottom = elementTop + rect.height;

          // Check if section is in viewport
          if (
            scrollPosition >= elementTop - 200 &&
            scrollPosition < elementBottom + 200
          ) {
            // Calculate how much of the section is visible
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(window.innerHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);

            if (visibleHeight > maxVisibility) {
              maxVisibility = visibleHeight;
              currentSection = sectionId;
            }
          }
        }
      }

      setActiveSection(currentSection);
    };

    // Initial check
    handleScroll();

    // Add scroll listener with throttle for performance
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", scrollListener, { passive: true });

    // Also check on resize
    window.addEventListener("resize", handleScroll);

    // Check periodically to catch any missed updates
    const interval = setInterval(handleScroll, 500);

    return () => {
      window.removeEventListener("scroll", scrollListener);
      window.removeEventListener("resize", handleScroll);
      clearInterval(interval);
    };
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      // Use centralized scroll lock
      lockScroll(SCROLL_LOCK_ID, true);

      // Prevent wheel scrolling
      const preventWheel = (e: WheelEvent) => {
        e.preventDefault();
      };

      // Prevent touch scrolling
      const preventTouch = (e: TouchEvent) => {
        // Only prevent if it's not within the menu itself
        const target = e.target as HTMLElement;
        if (!target.closest(".mobile-nav-content")) {
          e.preventDefault();
        }
      };

      window.addEventListener("wheel", preventWheel, { passive: false });
      window.addEventListener("touchmove", preventTouch, { passive: false });

      return () => {
        // Cleanup event listeners
        window.removeEventListener("wheel", preventWheel);
        window.removeEventListener("touchmove", preventTouch);

        // Use centralized scroll unlock
        unlockScroll(SCROLL_LOCK_ID, true);
      };
    }
  }, [isOpen]);

  const handleNavigate = (sectionId: string) => {
    // Immediately update active section for instant feedback
    setActiveSection(sectionId);

    onClose();

    // Smooth scroll to section after menu closes
    setTimeout(() => {
      scrollToSection(sectionId);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Simplified animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]"
            onClick={onClose}
          />

          {/* Slide-in Menu - Simplified animation */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: 0.3,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="mobile-nav-content fixed inset-0 bg-[#374136]/50 backdrop-blur-lg z-[1000] overflow-hidden"
          >
            <div className="flex flex-col h-full p-6">
              {/* Header - No staggered animations */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/10">
                    JN
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">
                      John Nazarene
                    </p>
                    <p className="text-sm text-white/60 font-medium tracking-wider uppercase">
                      Developer
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close navigation menu"
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-colors border border-white/10 active:scale-95"
                >
                  <X className="w-5 h-5 text-white" aria-hidden="true" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-white/20 mb-6" />

              {/* Navigation Section - Improved animations */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="mb-4">
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-semibold text-white/50 tracking-widest uppercase px-2"
                  >
                    Navigation
                  </motion.p>
                </div>

                <div className="space-y-2">
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.section;

                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        onClick={() => handleNavigate(item.section)}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left group active:scale-[0.98] transition-all duration-200 relative overflow-hidden ${
                          isActive
                            ? "bg-[#2d3a2c] border-2 border-[#4a6349]/50"
                            : "hover:bg-white/10"
                        }`}
                      >
                        {/* Active state background - Only animate layout */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-[#2d3a2c] via-[#374136] to-[#2d3a2c] rounded-2xl"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}

                        {/* Hover effect background */}
                        {!isActive && (
                          <div className="absolute inset-0 bg-[#374136] opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl" />
                        )}

                        {/* Icon container */}
                        <div
                          className={`relative z-10 flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
                            isActive
                              ? "bg-[#4a6349] shadow-lg shadow-[#4a6349]/50"
                              : "bg-white/5 group-hover:bg-white/10"
                          }`}
                        >
                          <Icon
                            className={`w-6 h-6 transition-all duration-200 ${
                              isActive
                                ? "text-white scale-110"
                                : "text-white/70 group-hover:text-white"
                            }`}
                          />
                        </div>

                        {/* Label */}
                        <span
                          className={`relative z-10 font-semibold text-lg transition-colors duration-200 ${
                            isActive
                              ? "text-white"
                              : "text-white/90 group-hover:text-white"
                          }`}
                        >
                          {item.label}
                        </span>

                        {/* Active indicator dot */}
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="relative z-10 ml-auto w-2 h-2 rounded-full bg-[#6b9b6a] shadow-lg shadow-[#6b9b6a]/50"
                          />
                        )}

                        {/* Arrow indicator */}
                        {!isActive && (
                          <div className="relative z-10 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-white"
                            >
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-white/20 my-6" />

              {/* Contact Section */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#374136] hover:bg-[#374136]/70 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl group border border-white/20"
                onClick={() => handleNavigate("contact")}
              >
                <Mail className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" />
                <span className="font-bold text-base text-white">
                  Get in Touch
                </span>
              </motion.button>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-6 pt-6 border-t border-white/10"
              >
                <p className="text-sm text-center text-white/50 font-medium">
                  Located in the Philippines 🇵🇭
                </p>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
