"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Code, Home, Mail, User, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

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
  { id: "about", label: "About", icon: User, section: "about" },
];

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;

      // Prevent scrolling
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

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
        window.removeEventListener("wheel", preventWheel);
        window.removeEventListener("touchmove", preventTouch);
      };
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";

      // Restore the scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  const handleNavigate = (sectionId: string) => {
    onClose();

    // Smooth scroll to section using Lenis
    setTimeout(() => {
      const section = document.getElementById(sectionId);
      if (section && (window as any).lenis) {
        (window as any).lenis.scrollTo(section, {
          offset: 0,
          duration: 1.5,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]"
            onClick={onClose}
          />

          {/* Slide-in Menu - Full Screen from Right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: 0.6,
              ease: [0.32, 0.72, 0, 1], // Custom cubic-bezier for smooth, professional animation
            }}
            className="mobile-nav-content fixed inset-0 bg-[#374136]/50 backdrop-blur-lg z-[1000] overflow-hidden"
          >
            <div className="flex flex-col h-full p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.15,
                      duration: 0.5,
                      ease: [0.34, 1.56, 0.64, 1], // Bouncy ease
                    }}
                    className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/10"
                  >
                    JN
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.25,
                      duration: 0.5,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                  >
                    <p className="text-base font-semibold text-white">
                      John Nazarene
                    </p>
                    <p className="text-xs text-white/60 font-medium tracking-wider uppercase">
                      Developer
                    </p>
                  </motion.div>
                </div>
                <motion.button
                  initial={{ opacity: 0, scale: 0, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.35,
                    duration: 0.4,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  onClick={onClose}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-colors border border-white/10 active:scale-95"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  delay: 0.45,
                  duration: 0.6,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="h-[1px] bg-white/20 mb-6 origin-right"
              />

              {/* Navigation Section */}
              <div className="flex-1 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.55,
                    duration: 0.5,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="mb-4"
                >
                  <p className="text-xs font-semibold text-white/50 tracking-widest uppercase px-2">
                    Navigation
                  </p>
                </motion.div>

                <div className="space-y-2">
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.65 + 0.08 * index,
                          duration: 0.5,
                          ease: [0.32, 0.72, 0, 1],
                        }}
                        onClick={() => handleNavigate(item.section)}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left group hover:bg-white/10 active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
                      >
                        {/* Hover effect background */}
                        <div className="absolute inset-0 bg-[#374136] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                        <div className="relative z-10 flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all duration-300">
                          <Icon className="w-6 h-6 text-white/70 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <span className="relative z-10 font-semibold text-lg text-white/90 group-hover:text-white transition-colors duration-300">
                          {item.label}
                        </span>

                        {/* Arrow indicator */}
                        <div className="relative z-10 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  delay: 0.97,
                  duration: 0.6,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="h-[1px] bg-white/20 my-6 origin-right"
              />

              {/* Contact Section */}
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 1.05,
                  duration: 0.6,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#374136] hover:bg-[#374136]/70 active:scale-[0.98] transition-all duration-300 shadow-lg hover:shadow-xl group border border-white/20"
                onClick={() => {
                  handleNavigate("contact");
                }}
              >
                <Mail className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
                <span className="font-bold text-base text-white">
                  Get in Touch
                </span>
              </motion.button>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 1.15,
                  duration: 0.6,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="mt-6 pt-6 border-t border-white/10"
              >
                <p className="text-xs text-center text-white/50 font-medium">
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
