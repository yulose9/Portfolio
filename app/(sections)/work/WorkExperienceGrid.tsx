"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

interface WorkExperience {
  duration: string;
  startYear: number;
  startMonth?: number;
  companyName: string;
  companyUrl: string;
  location: string;
  locationUrl: string;
  position: string;
  customDuration?: string;
  logo: string;
  linkedinUrl: string;
}

interface WorkExperienceGridProps {
  workExperiences: WorkExperience[];
  calculateDuration: (startYear: number, startMonth?: number) => string;
}

export default function WorkExperienceGrid({
  workExperiences,
  calculateDuration,
}: WorkExperienceGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <TooltipProvider>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {workExperiences.map((work, idx) => (
          <motion.div
            key={idx}
            className="relative group block p-2 w-full"
            style={{ aspectRatio: "5 / 7" }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: idx * 0.08,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <AnimatePresence>
              {hoveredIndex === idx && (
                <motion.span
                  className="absolute inset-0 h-full w-full bg-[#8eb08a]/30 block rounded-3xl"
                  layoutId="hoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.1 },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.1, delay: 0.1 },
                  }}
                />
              )}
            </AnimatePresence>
            <Card work={work} calculateDuration={calculateDuration}>
              <CardHeader work={work} calculateDuration={calculateDuration} />
              <CardBody work={work} />
              <CardFooter work={work} />
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </TooltipProvider>
  );
}

const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
  work?: WorkExperience;
  calculateDuration?: (startYear: number, startMonth?: number) => string;
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full p-4 overflow-hidden bg-[rgba(243,243,243,0.5)] backdrop-blur-[36.31px] border border-[rgba(117,117,117,0.4)] relative z-20 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)] hover:shadow-[0px_20px_60px_0px_rgba(0,0,0,0.4)] transition-all duration-200 group-hover:border-[#8eb08a]/60 flex flex-col justify-between",
        className
      )}
    >
      <div className="relative z-50 flex flex-col justify-between h-full">
        {children}
      </div>
    </div>
  );
};

const CardHeader = ({
  work,
  calculateDuration,
}: {
  work: WorkExperience;
  calculateDuration: (startYear: number, startMonth?: number) => string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center my-8">
      {/* Logo and Duration Badge - Grouped and Centered */}
      <div className="flex flex-col items-center gap-3">
        {/* Company Logo */}
        <a
          href={work.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-32 h-32 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <img
            src={work.logo}
            alt={`${work.companyName} logo`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.innerHTML = `
                <svg class="w-14 h-14 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              `;
            }}
          />
        </a>

        {/* Duration Badge with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-[#8eb08a] rounded-full px-4 py-1.5 shadow-sm group-hover:shadow-md transition-all duration-300 cursor-help">
              <p
                className="text-xs font-semibold text-white whitespace-nowrap"
                style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
              >
                {work.duration}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p
              className="text-sm font-semibold"
              style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
            >
              {work.customDuration ||
                calculateDuration(work.startYear, work.startMonth)}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

const CardBody = ({ work }: { work: WorkExperience }) => {
  return (
    <div className="space-y-1.5 flex flex-col justify-center py-2">
      {/* Company Name */}
      <a
        href={work.companyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <h4
          className="text-base font-bold text-black hover:text-[#657a62] transition-colors duration-300 text-center leading-tight"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {work.companyName}
        </h4>
      </a>

      {/* Position */}
      <p
        className="text-xs font-semibold text-black/70 text-center leading-snug"
        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
      >
        {work.position}
      </p>
    </div>
  );
};

const CardFooter = ({ work }: { work: WorkExperience }) => {
  return (
    <div className="flex flex-col items-center pt-2 border-t border-black/10 mt-auto">
      {/* Location */}
      <a
        href={work.locationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[13px] font-medium text-black/60 hover:text-[#657a62] transition-colors duration-200"
        style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
      >
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {work.location}
      </a>
    </div>
  );
};
