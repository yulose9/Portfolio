"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { motion } from "framer-motion";
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
        className="text-center mb-[121px]"
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

      {/* Work Experience Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.2,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="w-full mb-[40px]"
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
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                      >
                        {work.companyName}
                      </a>
                      <p
                        className="text-[10px] font-light leading-[10.4px] tracking-[-0.413px] text-white"
                        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
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
                    style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                  >
                    {work.location}
                  </a>
                </TableCell>
                <TableCell className="px-[14px] py-[22px] align-middle">
                  <p
                    className="text-[11px] font-light leading-[10.4px] tracking-[-0.454px] text-white"
                    style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                  >
                    {work.position}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

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
        <button className="bg-[#8eb08a] rounded-[12.456px] px-[8.897px] py-[6.228px] h-[41.373px] w-[117px] shadow-md hover:scale-105 transition-transform">
          <span className="text-[11.344px] font-semibold leading-[9.787px] tracking-[-0.182px] text-white text-center">
            View All
          </span>
        </button>
      </motion.div>
    </div>
  );
}
