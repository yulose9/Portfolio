"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

// Helper function to calculate duration from start date to now
const calculateDuration = (startYear: number, startMonth?: number): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed (0 = January)

  let years = currentYear - startYear;
  let months = currentMonth - (startMonth ?? 0);

  // Adjust for negative months
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years === 0) {
    return `${months}m`;
  } else if (months === 0) {
    return `${years}y`;
  } else {
    return `${years}y ${months}m`;
  }
};

// Sample work experience data
const workExperiences = [
  {
    duration: `Nov 2024-present`,
    startYear: 2024,
    startMonth: 10, // November (0-indexed: 0 = Jan, 10 = Nov)
    companyName: "Trends and Technologies Inc.",
    companyUrl: "https://www.trends.com.ph/",
    location: "Makati, Metro Manila",
    locationUrl: "https://maps.app.goo.gl/JS5rtf9FL29xoCv67",
    position: "Solutions Architect (AWS & RHEL)",
    customDuration: undefined, // Will auto-calculate
    logo: "/images/company-logos/trends-and-technologies.png",
    linkedinUrl: "https://www.linkedin.com/company/trendsandtechnologiesinc/",
  },
  {
    duration: `Oct 2023-Mar 2024`,
    startYear: 2023,
    startMonth: 9, // October
    companyName: "Archicoders",
    companyUrl: "https://archicoders.com/",
    location: "City of Imus, Cavite",
    locationUrl: "https://maps.app.goo.gl/mcTySuATDX7x8CV89",
    position: "Design Intern (UI/UX)",
    customDuration: "6m",
    logo: "/images/company-logos/archicoders.jpg",
    linkedinUrl: "https://www.linkedin.com/company/archicoders/",
  },
];

export default function MobileWorkExperiences() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  return (
    <TooltipProvider>
      <div className="relative w-full px-[15px] py-[113px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.21, 0.47, 0.32, 0.98],
          }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-[60px]"
        >
          <h2
            className="text-[36px] font-medium leading-[33.77px] tracking-[-1.44px] text-white"
            style={{ fontFamily: "Inter, SF Pro Display, sans-serif" }}
          >
            Work &
          </h2>
          <h2
            className="text-[36px] font-medium leading-[33.77px] tracking-[-1.44px] text-white mt-[3.8px]"
            style={{ fontFamily: "Inter, SF Pro Display, sans-serif" }}
          >
            Experiences
          </h2>
        </motion.div>

        {/* View Toggle Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.21, 0.47, 0.32, 0.98],
            delay: 0.1,
          }}
          viewport={{ once: true, margin: "-50px" }}
          className="flex justify-center gap-3 mb-[50px]"
        >
          {/* List View Button */}
          <button
            onClick={() => setViewMode("list")}
            className={`w-[50px] h-[50px] rounded-full backdrop-blur-[20px] border shadow-[0px_16px_32px_0px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center ${
              viewMode === "list"
                ? "bg-white border-white scale-105"
                : "bg-white/10 border-white/20"
            }`}
            aria-label="List view"
          >
            <svg
              width="24"
              height="18"
              viewBox="0 0 30 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-colors duration-200 ${
                viewMode === "list" ? "text-[#657a62]" : "text-white"
              }`}
            >
              <path
                d="M2.29705 17.4165H27.6078C28.9371 17.4165 29.8677 18.2449 29.8677 19.4617C29.8677 20.6784 28.9371 21.481 27.6078 21.481H2.29705C0.994295 21.481 0.0637531 20.6784 0.0637531 19.4617C0.0637531 18.2449 0.994295 17.4165 2.29705 17.4165Z"
                fill="currentColor"
              />
              <path
                d="M2.29705 8.87345H27.6078C28.9371 8.87345 29.8677 9.70187 29.8677 10.9186C29.8677 12.1354 28.9371 12.9379 27.6078 12.9379H2.29705C0.994295 12.9379 0.0637531 12.1354 0.0637531 10.9186C0.0637531 9.70187 0.994295 8.87345 2.29705 8.87345Z"
                fill="currentColor"
              />
              <path
                d="M2.29705 0.304487H27.6078C28.9371 0.304487 29.8677 1.13291 29.8677 2.34965C29.8677 3.56639 28.9371 4.36892 27.6078 4.36892H2.29705C0.994295 4.36892 0.0637531 3.56639 0.0637531 2.34965C0.0637531 1.13291 0.994295 0.304487 2.29705 0.304487Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {/* Grid View Button */}
          <button
            onClick={() => setViewMode("grid")}
            className={`w-[50px] h-[50px] rounded-full backdrop-blur-[20px] border shadow-[0px_16px_32px_0px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center ${
              viewMode === "grid"
                ? "bg-white border-white scale-105"
                : "bg-white/10 border-white/20"
            }`}
            aria-label="Grid view"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-colors duration-200 ${
                viewMode === "grid" ? "text-[#657a62]" : "text-white"
              }`}
            >
              <path
                d="M15.0436 9.72797H18.7042C20.5265 9.72797 21.623 8.61441 21.623 6.68205V3.11209C21.623 1.1961 20.5265 0.0661621 18.7042 0.0661621H15.0436C13.2052 0.0661621 12.1248 1.1961 12.1248 3.11209V6.68205C12.1248 8.61441 13.2052 9.72797 15.0436 9.72797Z"
                fill="currentColor"
              />
              <path
                d="M3.40052 9.72797H7.06115C8.89953 9.72797 9.97998 8.61441 9.97998 6.68205V3.11209C9.97998 1.1961 8.89953 0.0661621 7.06115 0.0661621H3.40052C1.56215 0.0661621 0.481695 1.1961 0.481695 3.11209V6.68205C0.481695 8.61441 1.56215 9.72797 3.40052 9.72797Z"
                fill="currentColor"
              />
              <path
                d="M15.0436 21.2075H18.7042C20.5265 21.2075 21.623 20.1103 21.623 18.1943V14.5916C21.623 12.6756 20.5265 11.5785 18.7042 11.5785H15.0436C13.2052 11.5785 12.1248 12.6756 12.1248 14.5916V18.1943C12.1248 20.1103 13.2052 21.2075 15.0436 21.2075Z"
                fill="currentColor"
              />
              <path
                d="M3.40052 21.2075H7.06115C8.89953 21.2075 9.97998 20.1103 9.97998 18.1943V14.5916C9.97998 12.6756 8.89953 11.5785 7.06115 11.5785H3.40052C1.56215 11.5785 0.481695 12.6756 0.481695 14.5916V18.1943C0.481695 20.1103 1.56215 21.2075 3.40052 21.2075Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </motion.div>

        {/* Conditional Rendering: List or Grid View */}
        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            /* List View - Clean Row Layout */
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="w-full mb-[40px] flex flex-col gap-3"
            >
              {workExperiences.map((work, index) => (
                <div
                  key={index}
                  className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={work.logo}
                      alt={work.companyName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">
                      {work.companyName}
                    </h3>
                    <p className="text-sm text-white/70 truncate">
                      {work.position}
                    </p>
                  </div>

                  {/* Date & Location (Hidden on very small screens, visible on larger mobile) */}
                  <div className="text-right hidden xs:block">
                    <p className="text-xs text-white/50">{work.duration}</p>
                    <p className="text-xs text-white/50">{work.location}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            /* Grid View - Card Layout */
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="grid grid-cols-2 gap-4 mb-[40px]"
            >
              {workExperiences.map((work, idx) => (
                <motion.div
                  key={idx}
                  className="relative group aspect-square"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: idx * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  onTouchStart={() => setHoveredCardIndex(idx)}
                  onTouchEnd={() => setHoveredCardIndex(null)}
                >
                  {/* Card Container with Glassmorphism - Improved */}
                  <div className="relative w-full h-full rounded-[24px] overflow-hidden bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col p-4">
                    {/* Hover Gradient Background */}
                    <AnimatePresence>
                      {hoveredCardIndex === idx && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br from-[#8eb08a]/20 to-transparent"
                          layoutId="cardHover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Card Content - Optimized for Square */}
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      {/* Header: Logo */}
                      <div className="w-12 h-12 rounded-xl bg-white/10 p-1 shadow-inner">
                        <div className="w-full h-full rounded-lg overflow-hidden relative">
                          <img
                            src={work.logo}
                            alt={work.companyName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Footer: Company Name & Role */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                          {work.companyName}
                        </h3>
                        <p className="text-xs text-white/60 font-medium line-clamp-1">
                          {work.position}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.21, 0.47, 0.32, 0.98],
            delay: 0.4,
          }}
          viewport={{ once: true, margin: "-50px" }}
          className="flex justify-center"
        >
          <button className="bg-[#8eb08a] rounded-full px-6 py-3 shadow-md hover:scale-105 transition-transform flex items-center justify-center">
            <span className="text-base font-semibold leading-none tracking-[-0.182px] text-white text-center">
              View All
            </span>
          </button>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
