"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

// Helper function to calculate duration from start date to now
const calculateDuration = (startYear: number): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const yearsDiff = currentYear - startYear;
  const months = currentMonth + 1; // Convert to 1-indexed

  if (yearsDiff === 0) {
    return `${months}m`;
  }

  return `${yearsDiff}y ${months}m`;
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  return (
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
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="flex justify-center gap-3 mb-[40px]"
      >
        {/* Grid View Button */}
        <button
          onClick={() => setViewMode("grid")}
          className={`w-[48px] h-[48px] rounded-full backdrop-blur-[20px] border shadow-lg hover:scale-105 transition-all flex items-center justify-center ${
            viewMode === "grid"
              ? "bg-white border-white"
              : "bg-[#697668]/60 border-[rgba(117,117,117,0.3)]"
          }`}
          aria-label="Grid view"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={viewMode === "grid" ? "text-[#657a62]" : "text-white"}
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
        {/* List View Button */}
        <button
          onClick={() => setViewMode("list")}
          className={`w-[48px] h-[48px] rounded-full backdrop-blur-[20px] border shadow-lg hover:scale-105 transition-all flex items-center justify-center ${
            viewMode === "list"
              ? "bg-white border-white"
              : "bg-[#697668]/60 border-[rgba(117,117,117,0.3)]"
          }`}
          aria-label="List view"
        >
          <svg
            width="24"
            height="18"
            viewBox="0 0 30 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={viewMode === "list" ? "text-[#657a62]" : "text-white"}
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
      </motion.div>

      {/* Work Experience Content - Smooth Height Transition Container */}
      <motion.div
        className="w-full mb-[40px] overflow-hidden"
        initial={false}
        animate={{
          height: "auto",
        }}
        transition={{
          height: {
            duration: 0.5,
            ease: [0.32, 0.72, 0, 1], // Custom easing for smooth height
          },
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "list" ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableHead
                      className="text-[12px] font-semibold leading-[10.4px] tracking-[-0.496px] text-[#f0f0f0] uppercase px-[14px] h-auto pb-[18px]"
                      style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                    >
                      Company Name
                    </TableHead>
                    <TableHead
                      className="text-[12px] font-semibold leading-[10.4px] tracking-[-0.496px] text-[#f0f0f0] uppercase px-[14px] h-auto pb-[18px]"
                      style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                    >
                      Location
                    </TableHead>
                    <TableHead
                      className="text-[12px] font-semibold leading-[10.4px] tracking-[-0.496px] text-[#f0f0f0] uppercase px-[14px] h-auto pb-[18px]"
                      style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                    >
                      Position
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workExperiences.map((work, index) => (
                    <TableRow
                      key={index}
                      className="border-white/20 hover:bg-transparent"
                    >
                      <TableCell className="px-[14px] py-[22px] align-top">
                        <div className="flex items-start gap-[8px]">
                          {/* Company Logo */}
                          <a
                            href={work.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-[32px] h-[32px] bg-white/10 rounded-[4px] flex-shrink-0 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-all"
                          >
                            <img
                              src={work.logo}
                              alt={`${work.companyName} logo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML = `
                              <span class="text-[10px] text-white/50" style="font-family: Inter, SF Pro Text, sans-serif">
                                ${work.companyName.charAt(0)}
                              </span>
                            `;
                                }
                              }}
                            />
                          </a>
                          <div className="flex flex-col">
                            <a
                              href={work.companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold leading-[10.4px] tracking-[-0.454px] text-white mb-[8px] hover:text-[#8eb08a] transition-colors"
                              style={{
                                fontFamily: "Inter, SF Pro Text, sans-serif",
                              }}
                            >
                              {work.companyName}
                            </a>
                            <p
                              className="text-[10px] font-light leading-[10.4px] tracking-[-0.413px] text-white"
                              style={{
                                fontFamily: "Inter, SF Pro Text, sans-serif",
                              }}
                            >
                              {work.duration}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-[14px] py-[22px] align-middle">
                        <a
                          href={work.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-light leading-[10.4px] tracking-[-0.454px] text-white hover:text-[#8eb08a] transition-colors"
                          style={{
                            fontFamily: "Inter, SF Pro Text, sans-serif",
                          }}
                        >
                          {work.location}
                        </a>
                      </TableCell>
                      <TableCell className="px-[14px] py-[22px] align-middle">
                        <p
                          className="text-[11px] font-light leading-[15px] tracking-[-0.454px] text-white"
                          style={{
                            fontFamily: "Inter, SF Pro Text, sans-serif",
                          }}
                        >
                          {work.position}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="w-full space-y-4"
            >
              {workExperiences.map((work, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-lg rounded-[16px] p-[20px] border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-[12px] mb-[16px]">
                    <a
                      href={work.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-[48px] h-[48px] bg-white/10 rounded-[8px] flex-shrink-0 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-all"
                    >
                      <img
                        src={work.logo}
                        alt={`${work.companyName} logo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = `
                            <span class="text-[16px] text-white/50 font-semibold" style="font-family: Inter, SF Pro Text, sans-serif">
                              ${work.companyName.charAt(0)}
                            </span>
                          `;
                          }
                        }}
                      />
                    </a>
                    <div className="flex-1">
                      <a
                        href={work.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[16px] font-semibold leading-[20px] tracking-[-0.5px] text-white mb-[4px] hover:text-[#8eb08a] transition-colors block"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {work.companyName}
                      </a>
                      <p
                        className="text-[12px] font-light leading-[16px] tracking-[-0.4px] text-white/60"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {work.duration}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-[12px]">
                    <div>
                      <p
                        className="text-[11px] font-semibold leading-[14px] tracking-[-0.4px] text-white/50 uppercase mb-[4px]"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        Position
                      </p>
                      <p
                        className="text-[14px] font-medium leading-[18px] tracking-[-0.4px] text-white"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {work.position}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[11px] font-semibold leading-[14px] tracking-[-0.4px] text-white/50 uppercase mb-[4px]"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        Location
                      </p>
                      <a
                        href={work.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-medium leading-[18px] tracking-[-0.4px] text-white hover:text-[#8eb08a] transition-colors"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {work.location}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* View All Button */}
      <div className="flex justify-center">
        <button className="bg-[#8eb08a] rounded-[12.456px] px-[8.897px] py-[6.228px] h-[41.373px] w-[117px] shadow-md hover:scale-105 transition-transform">
          <span className="text-[11.344px] font-semibold leading-[9.787px] tracking-[-0.182px] text-white text-center">
            View All
          </span>
        </button>
      </div>
    </div>
  );
}
