"use client";

import { MobileCertificates } from "@/app/(sections)/about";
import { GsapBouncyText } from "@/app/(sections)/hero";
import { SectionHeader } from "@/app/components/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";
import { useState } from "react";
import {
  CompanyLogo,
  DraggableCertificateGrid,
  MobileWorkExperiences,
  WorkExperienceGrid,
} from "./";
import type { Certificate } from "./DraggableCertificateGrid";

const inter = Inter({ subsets: ["latin"] });

// Helper function to calculate duration from startYear to current date
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
    customDuration: undefined, // Will auto-calculate from startYear and startMonth
    logo: "/images/company-logos/trends-and-technologies.png", // Company logo
    linkedinUrl: "https://www.linkedin.com/company/trendsandtechnologiesinc/",
  },
  {
    duration: `Oct 2023-Mar 2024`,
    startYear: 2023,
    startMonth: 9, // October (0-indexed: 0 = Jan, 9 = Oct)
    companyName: "Archicoders",
    companyUrl: "https://archicoders.com/",
    location: "City of Imus, Cavite",
    locationUrl: "https://maps.app.goo.gl/mcTySuATDX7x8CV89",
    position: "Design Intern (UI/UX)",
    customDuration: "6m", // Custom duration for completed positions
    logo: "/images/company-logos/archicoders.jpg", // Company logo
    linkedinUrl: "https://www.linkedin.com/company/archicoders/",
  },
];

// Sample certificates data with IDs for drag and drop and enhanced metadata
const certificates: Certificate[] = [
  {
    id: "cert-azure",
    title: "Azure Fundamentals",
    issuingOrg: "Microsoft",
    date: "Oct 2024",
    image: "/images/certifications/microsoft-certified-fundamentals-badge.svg",
    credentialUrl:
      "https://learn.microsoft.com/api/credentials/share/en-us/JohnNazareneDelaPisa-8958/D57215FE29EAA434?sharingId",
    skills: ["Cloud Computing", "Azure Services", "IaaS/PaaS"],
    level: "Fundamentals",
    verified: true,
  },
  {
    id: "cert-gcp",
    title: "Cloud Digital Leader",
    issuingOrg: "Google",
    date: "Jan 2025",
    image: "/images/certifications/googlecloudpractitioner.png",
    credentialUrl:
      "https://www.credly.com/badges/95d75765-13fa-4c81-802c-834c0217da8a/linked_in_profile",
    skills: ["GCP", "Cloud Strategy", "Digital Transformation"],
    level: "Fundamentals",
    verified: true,
  },
  {
    id: "cert-terraform",
    title: "Terraform Associate",
    issuingOrg: "HashiCorp",
    date: "Feb 2025",
    image: "/images/certifications/TerraformAssociate.png",
    credentialUrl:
      "https://www.credly.com/badges/bebd520f-8e29-4ec4-9f11-22a35b047349/linked_in_profile",
    skills: ["Infrastructure as Code", "DevOps", "Automation"],
    level: "Associate",
    verified: true,
  },
  {
    id: "cert-copilot",
    title: "GitHub Copilot",
    issuingOrg: "Microsoft",
    date: "Oct 2025",
    image: "/images/certifications/Github_Copilot_badge.png",
    credentialUrl: "",
    skills: ["AI-Assisted Development", "Productivity", "Code Generation"],
    level: "Fundamentals",
    verified: false,
  },
];

export default function Work() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid"); // Default to grid view
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

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
        <section className="hidden md:flex relative min-h-screen flex-col px-8 py-16">
          <div
            className="max-w-[1280px] mx-auto w-full flex flex-col"
            style={{ minHeight: "calc(100vh - 8rem)" }}
          >
            {/* Work Header - Fixed at top */}
            <div className="flex items-center justify-between mb-10 flex-shrink-0">
              <SectionHeader
                title="Work & Experiences"
                textColor="text-white"
              />
              <div className="flex gap-4">
                {/* Grid View Button */}
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-[60px] h-[60px] rounded-full backdrop-blur-[23.49px] border shadow-[0px_32px_64px_0px_rgba(0,0,0,0.19),0px_2px_21px_0px_rgba(0,0,0,0.15)] hover:scale-110 transition-all flex items-center justify-center ${viewMode === "grid"
                    ? "bg-white border-white"
                    : "bg-[#697668]/80 border-[rgba(117,117,117,0.4)]"
                    }`}
                  aria-label="Grid view"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={
                      viewMode === "grid" ? "text-[#657a62]" : "text-white"
                    }
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
                  className={`w-[60px] h-[60px] rounded-full backdrop-blur-[23.49px] border shadow-[0px_32px_64px_0px_rgba(0,0,0,0.19),0px_2px_21px_0px_rgba(0,0,0,0.15)] hover:scale-110 transition-all flex items-center justify-center ${viewMode === "list"
                    ? "bg-white border-white"
                    : "bg-[#697668]/80 border-[rgba(117,117,117,0.4)]"
                    }`}
                  aria-label="List view"
                >
                  <svg
                    width="30"
                    height="22"
                    viewBox="0 0 30 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={
                      viewMode === "list" ? "text-[#657a62]" : "text-white"
                    }
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
              </div>
            </div>

            {/* Conditional Rendering: List View or Grid View */}
            {/* Wrapper with fixed minimum height to prevent layout shift */}
            <div className="flex-1 flex items-start">
              <AnimatePresence mode="wait">
                {viewMode === "list" ? (
                  /* List View - Table Layout */
                  <motion.div
                    key="list-view"
                    className="w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                  >
                    {/* Table Header */}
                    <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-8 pb-4 border-b-[1.57px] border-white/20">
                      <div></div>
                      <div className="flex justify-start items-center">
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
                          style={{
                            fontFamily: "Inter, SF Pro Text, sans-serif",
                          }}
                        >
                          COMPANY NAME
                        </motion.p>
                      </div>
                      <div className="flex justify-start items-center">
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
                          style={{
                            fontFamily: "Inter, SF Pro Text, sans-serif",
                          }}
                        >
                          LOCATION
                        </motion.p>
                      </div>
                      <div className="flex justify-start items-center">
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
                          style={{
                            fontFamily: "Inter, SF Pro Text, sans-serif",
                          }}
                        >
                          JOB POSITION
                        </motion.p>
                      </div>
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
                        onMouseEnter={() => setHoveredRowIndex(index)}
                        onMouseLeave={() => setHoveredRowIndex(null)}
                        className="relative grid grid-cols-[100px_1fr_1fr_1fr] gap-8 py-6 border-b-[1.57px] border-white/20 last:border-0 group"
                      >
                        {/* Glass Hover Effect Background */}
                        <motion.div
                          className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl -mx-4 px-4"
                          style={{
                            boxShadow:
                              "0px 8px 32px 0px rgba(0,0,0,0.15), inset 0px 0px 20px 0px rgba(255,255,255,0.1)",
                          }}
                          initial={false}
                          animate={{
                            opacity: hoveredRowIndex === index ? 1 : 0,
                            scale: hoveredRowIndex === index ? 1 : 0.98,
                          }}
                          transition={{
                            duration: 0.2,
                            ease: [0.21, 0.47, 0.32, 0.98],
                          }}
                        />

                        <div className="relative z-10 flex justify-center items-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className="text-[14px] font-light leading-[24px] tracking-[-0.56px] text-white whitespace-nowrap cursor-help text-left"
                                style={{
                                  fontFamily: "Inter, SF Pro Text, sans-serif",
                                }}
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
                                {work.customDuration ||
                                  calculateDuration(
                                    work.startYear,
                                    work.startMonth
                                  )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative z-10 flex items-center justify-start gap-4">
                          {/* Company Logo */}
                          <CompanyLogo
                            logo={work.logo}
                            companyName={work.companyName}
                            linkedinUrl={work.linkedinUrl}
                          />
                          {/* Company Name */}
                          <a
                            href={work.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[20px] font-light leading-[24px] tracking-[-0.8px] text-white hover:text-[#8eb08a] transition-colors duration-300 hover:underline underline-offset-4"
                            style={{
                              fontFamily: "Inter, SF Pro Text, sans-serif",
                            }}
                          >
                            {work.companyName}
                          </a>
                        </div>
                        <div className="relative z-10 flex justify-start items-center">
                          <a
                            href={work.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[20px] font-light leading-[24px] tracking-[-0.8px] text-white hover:text-[#8eb08a] transition-colors duration-300 hover:underline underline-offset-4"
                            style={{
                              fontFamily: "Inter, SF Pro Text, sans-serif",
                            }}
                          >
                            {work.location}
                          </a>
                        </div>
                        <div className="relative z-10 flex justify-start items-center">
                          <p
                            className="text-[20px] font-light leading-[24px] tracking-[-0.8px] text-white"
                            style={{
                              fontFamily: "Inter, SF Pro Text, sans-serif",
                            }}
                          >
                            {work.position}
                          </p>
                        </div>
                      </motion.div>
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
                  >
                    <WorkExperienceGrid
                      workExperiences={workExperiences}
                      calculateDuration={calculateDuration}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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
            <div className="flex flex-col gap-2 md:gap-4 mb-4 md:mb-6 max-w-[1280px] mx-auto w-full">
              <SectionHeader
                title="Certificates & Licenses"
                textColor="text-white"
                onArrowClick={() => {
                  // TODO: Add navigation to dedicated certificates page
                }}
              />
              <GsapBouncyText
                text="Professional certifications and credentials that validate my technical expertise and continuous learning journey. These represent formal recognition of skills in cloud computing, system administration, and emerging technologies. Each credential reflects a commitment to staying current and mastering industry standards."
                className="text-[14px] md:text-[20px] leading-[1.588] tracking-[-0.56px] md:tracking-[-0.8px] text-white max-w-[1280px] whitespace-pre-wrap"
                style={{ fontFamily: "Inter, SF Pro Display, sans-serif" }}
                delay={0.3}
              />
            </div>

            {/* Draggable Certificates Grid - iOS style drag and drop */}
            <div className="mb-16">
              <DraggableCertificateGrid
                certificates={certificates}
                variant="desktop"
                onReorder={(newCerts) => {
                  console.log("Certificates reordered:", newCerts.map(c => c.title));
                }}
              />
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
