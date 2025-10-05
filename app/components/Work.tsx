"use client";

import { motion, useInView } from "framer-motion";
import { Inter } from "next/font/google";
import { useRef, useState } from "react";
import MobileCertificates from "./MobileCertificates";
import MobileWorkExperiences from "./MobileWorkExperiences";
import SectionHeader from "./SectionHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

// Helper function to calculate duration from startYear to current date
const calculateDuration = (startYear: number): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const years = currentYear - startYear;
  const months = currentMonth;

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
    duration: `2023-${new Date().getFullYear()}`,
    startYear: 2023,
    companyName: "Company Name",
    location: "Company Location",
    position: "Job Position",
  },
  {
    duration: `2023-${new Date().getFullYear()}`,
    startYear: 2023,
    companyName: "Company Name",
    location: "Company Location",
    position: "Job Position",
  },
  {
    duration: `2023-${new Date().getFullYear()}`,
    startYear: 2023,
    companyName: "Company Name",
    location: "Company Location",
    position: "Job Position",
  },
];

// Sample certificates data
const certificates = [
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
    image: "/images/cert-placeholder.png",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
    image: "/images/cert-placeholder.png",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
    image: "/images/cert-placeholder.png",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
    image: "/images/cert-placeholder.png",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
    image: "/images/cert-placeholder.png",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
    image: "/images/cert-placeholder.png",
  },
];

export default function Work() {
  return (
    <TooltipProvider>
      <div
        id="work"
        className={`relative w-screen bg-[#657a62] ${inter.className}`}
      >
        {/* Mobile View - Work & Experiences */}
        <div className="block md:hidden">
          <MobileWorkExperiences />
        </div>

        {/* Desktop View - Work & Experiences Section - Full Screen */}
        <section className="hidden md:flex relative min-h-screen flex-col justify-center px-8 py-16">
          <div className="max-w-[1280px] mx-auto w-full">
            {/* Work Header */}
            <div className="flex items-center justify-between mb-10">
              <SectionHeader
                title="Work & Experiences"
                textColor="text-white"
              />
              <div className="flex gap-4">
                {/* Grid View Button */}
                <button
                  className="w-[60px] h-[60px] rounded-full bg-[#697668]/80 backdrop-blur-[23.49px] border border-[rgba(117,117,117,0.4)] shadow-[0px_32px_64px_0px_rgba(0,0,0,0.19),0px_2px_21px_0px_rgba(0,0,0,0.15)] hover:scale-110 transition-transform flex items-center justify-center"
                  aria-label="Grid view"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M15.0436 9.72797H18.7042C20.5265 9.72797 21.623 8.61441 21.623 6.68205V3.11209C21.623 1.1961 20.5265 0.0661621 18.7042 0.0661621H15.0436C13.2052 0.0661621 12.1248 1.1961 12.1248 3.11209V6.68205C12.1248 8.61441 13.2052 9.72797 15.0436 9.72797Z"
                      fill="white"
                    />
                    <path
                      d="M3.40052 9.72797H7.06115C8.89953 9.72797 9.97998 8.61441 9.97998 6.68205V3.11209C9.97998 1.1961 8.89953 0.0661621 7.06115 0.0661621H3.40052C1.56215 0.0661621 0.481695 1.1961 0.481695 3.11209V6.68205C0.481695 8.61441 1.56215 9.72797 3.40052 9.72797Z"
                      fill="white"
                    />
                    <path
                      d="M15.0436 21.2075H18.7042C20.5265 21.2075 21.623 20.1103 21.623 18.1943V14.5916C21.623 12.6756 20.5265 11.5785 18.7042 11.5785H15.0436C13.2052 11.5785 12.1248 12.6756 12.1248 14.5916V18.1943C12.1248 20.1103 13.2052 21.2075 15.0436 21.2075Z"
                      fill="white"
                    />
                    <path
                      d="M3.40052 21.2075H7.06115C8.89953 21.2075 9.97998 20.1103 9.97998 18.1943V14.5916C9.97998 12.6756 8.89953 11.5785 7.06115 11.5785H3.40052C1.56215 11.5785 0.481695 12.6756 0.481695 14.5916V18.1943C0.481695 20.1103 1.56215 21.2075 3.40052 21.2075Z"
                      fill="white"
                    />
                  </svg>
                </button>
                {/* List View Button */}
                <button
                  className="w-[60px] h-[60px] rounded-full bg-[#697668]/80 backdrop-blur-[23.49px] border border-[rgba(117,117,117,0.4)] shadow-[0px_32px_64px_0px_rgba(0,0,0,0.19),0px_2px_21px_0px_rgba(0,0,0,0.15)] hover:scale-110 transition-transform flex items-center justify-center"
                  aria-label="List view"
                >
                  <svg
                    width="30"
                    height="22"
                    viewBox="0 0 30 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M2.29705 17.4165H27.6078C28.9371 17.4165 29.8677 18.2449 29.8677 19.4617C29.8677 20.6784 28.9371 21.481 27.6078 21.481H2.29705C0.994295 21.481 0.0637531 20.6784 0.0637531 19.4617C0.0637531 18.2449 0.994295 17.4165 2.29705 17.4165Z"
                      fill="white"
                    />
                    <path
                      d="M2.29705 8.87345H27.6078C28.9371 8.87345 29.8677 9.70187 29.8677 10.9186C29.8677 12.1354 28.9371 12.9379 27.6078 12.9379H2.29705C0.994295 12.9379 0.0637531 12.1354 0.0637531 10.9186C0.0637531 9.70187 0.994295 8.87345 2.29705 8.87345Z"
                      fill="white"
                    />
                    <path
                      d="M2.29705 0.304487H27.6078C28.9371 0.304487 29.8677 1.13291 29.8677 2.34965C29.8677 3.56639 28.9371 4.36892 27.6078 4.36892H2.29705C0.994295 4.36892 0.0637531 3.56639 0.0637531 2.34965C0.0637531 1.13291 0.994295 0.304487 2.29705 0.304487Z"
                      fill="white"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Work Experience Table */}
            <div className="w-full">
              {/* Table Header */}
              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-8 pb-4 border-b-[1.57px] border-white/20">
                <div></div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.21, 0.47, 0.32, 0.98],
                    delay: 0,
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="text-[14px] font-semibold leading-[24px] tracking-[-0.56px] text-[#f0f0f0]"
                  style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                >
                  COMPANY NAME
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.21, 0.47, 0.32, 0.98],
                    delay: 0.1,
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="text-[14px] font-semibold leading-[24px] tracking-[-0.56px] text-[#f0f0f0]"
                  style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                >
                  LOCATION
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.21, 0.47, 0.32, 0.98],
                    delay: 0.2,
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="text-[14px] font-semibold leading-[24px] tracking-[-0.56px] text-[#f0f0f0]"
                  style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                >
                  JOB POSITION
                </motion.p>
              </div>

              {/* Table Rows */}
              {workExperiences.map((work, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.21, 0.47, 0.32, 0.98],
                    delay: index * 0.1 + 0.3,
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="grid grid-cols-[100px_1fr_1fr_1fr] gap-8 py-6 border-b-[1.57px] border-white/20 last:border-0"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p
                        className="text-[14px] font-light leading-[24px] tracking-[-0.56px] text-white whitespace-nowrap cursor-help"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {work.duration}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p
                        className="text-[12px] font-semibold"
                        style={{
                          fontFamily: "Inter, SF Pro Text, sans-serif",
                        }}
                      >
                        {calculateDuration(work.startYear)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <p
                    className="text-[20px] font-light leading-[24px] tracking-[-0.8px] text-white"
                    style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                  >
                    {work.companyName}
                  </p>
                  <p
                    className="text-[20px] font-light leading-[24px] tracking-[-0.8px] text-white"
                    style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                  >
                    {work.location}
                  </p>
                  <p
                    className="text-[20px] font-light leading-[24px] tracking-[-0.8px] text-white"
                    style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                  >
                    {work.position}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile View - Certificates & Licenses */}
        <div className="block md:hidden">
          <MobileCertificates />
        </div>

        {/* Desktop View - Certificates & Licenses Section - Full Screen */}
        <section className="hidden md:flex relative min-h-screen flex-col justify-center px-8 py-16">
          <div className="max-w-[1280px] mx-auto w-full">
            {/* Certificates Header */}
            <div className="flex items-center justify-between mb-16">
              <SectionHeader
                title="Certificates & Licenses"
                textColor="text-white"
                arrowColor="text-white"
                onArrowClick={() => {}}
              />
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-3 gap-[80px] w-full mb-16">
              {certificates.map((cert, index) => {
                const ref = useRef(null);
                const isInView = useInView(ref, {
                  once: true,
                  margin: "-50px",
                });

                return (
                  <div
                    key={index}
                    ref={ref}
                    className="group relative w-full h-[495px] rounded-[21px] bg-[rgba(243,243,243,0.5)] backdrop-blur-[36.31px] border-[0.303px] border-[rgba(117,117,117,0.4)] cursor-pointer transition-all duration-500 ease-out hover:scale-[1.03] hover:shadow-[0px_20px_60px_0px_rgba(0,0,0,0.4),0px_8px_30px_0px_rgba(0,0,0,0.3)] hover:bg-[rgba(255,255,255,0.7)] hover:-translate-y-2"
                  >
                    {/* Date Badge - Issued Date */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={
                        isInView
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.8 }
                      }
                      transition={{
                        duration: 0.5,
                        ease: [0.21, 0.47, 0.32, 0.98],
                        delay: index * 0.1 + 0.2,
                      }}
                      className="absolute top-[19px] right-[20px] bg-[#d9d9d9] rounded-full px-[12px] py-[9px] shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-105 group-hover:bg-[#e8e8e8]"
                    >
                      <p
                        className="text-[24px] font-normal leading-[12px] tracking-[-1px] text-black"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {cert.date}
                      </p>
                    </motion.div>

                    {/* Certificate Image */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={
                        isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                      }
                      transition={{
                        duration: 0.6,
                        ease: [0.21, 0.47, 0.32, 0.98],
                        delay: index * 0.1 + 0.3,
                      }}
                      className="absolute left-[84px] top-[88px] w-[205px] h-[205px] rounded-[5px] overflow-hidden transition-all duration-500 group-hover:shadow-xl group-hover:scale-105 group-hover:rounded-[8px]"
                    >
                      {/* Animated gradient background */}
                      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9] group-hover:from-[#8eb08a]/30 group-hover:via-[#7a9677]/25 group-hover:to-[#657a62]/30 transition-all duration-500">
                        {/* Decorative circles in background */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" />
                          <div className="absolute bottom-6 left-6 w-20 h-20 rounded-full bg-white/30 blur-2xl" />
                        </div>

                        {/* Main certificate icon with glow effect */}
                        <div className="relative z-10 flex items-center justify-center">
                          <div className="absolute w-24 h-24 rounded-full bg-[#657a62]/10 blur-lg group-hover:bg-[#657a62]/20 transition-all duration-500" />
                          <svg
                            className="relative w-20 h-20 text-gray-400/80 group-hover:text-[#657a62] transition-all duration-300 drop-shadow-sm"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>

                        {/* Subtle corner accents */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/40 rounded-tl-[5px] transition-all duration-300 group-hover:border-[#8eb08a]/60" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/40 rounded-br-[5px] transition-all duration-300 group-hover:border-[#8eb08a]/60" />
                      </div>
                    </motion.div>

                    {/* Certificate Info */}
                    <div className="absolute bottom-[110px] left-[42px] right-[42px] transition-all duration-300 group-hover:bottom-[115px]">
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={
                          isInView
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 20 }
                        }
                        transition={{
                          duration: 0.6,
                          ease: [0.21, 0.47, 0.32, 0.98],
                          delay: index * 0.1 + 0.4,
                        }}
                        className="text-[38px] font-semibold leading-[12px] tracking-[-1.58px] text-black mb-10 transition-colors duration-300 group-hover:text-[#657a62]"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {cert.title}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={
                          isInView
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 20 }
                        }
                        transition={{
                          duration: 0.6,
                          ease: [0.21, 0.47, 0.32, 0.98],
                          delay: index * 0.1 + 0.5,
                        }}
                        className="text-[24px] font-normal leading-[12px] tracking-[-1px] text-black/80 transition-colors duration-300 group-hover:text-black"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {cert.issuingOrg}
                      </motion.p>
                    </div>

                    {/* Hover Effect - Shine Animation */}
                    <div className="absolute inset-0 rounded-[21px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Button */}
            <div className="flex justify-center">
              <button className="bg-[#8eb08a] rounded-[24px] px-[24px] py-[16px] h-[70px] w-[220px] shadow-md hover:scale-105 transition-transform hover:shadow-lg">
                <span
                  className="text-[22px] font-semibold leading-[22px] tracking-[-0.4px] text-white text-center"
                  style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                >
                  View All
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
