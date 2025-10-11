"use client";

import { GsapBouncyText } from "@/app/(sections)/hero";

interface SectionHeaderProps {
  title: string;
  onArrowClick?: () => void;
  textColor?: string;
  arrowColor?: string;
  delay?: number;
}

export default function SectionHeader({
  title,
  onArrowClick,
  textColor = "text-black",
  arrowColor = "text-black",
  delay = 0,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <GsapBouncyText
        text={title}
        as="h2"
        className={`text-[64px] font-medium leading-[0.938] tracking-[-2.56px] ${textColor}`}
        style={{ fontFamily: "Inter, sans-serif" }}
        delay={delay}
      />
      {onArrowClick && (
        <button
          onClick={onArrowClick}
          className="p-1 hover:scale-110 transition-transform"
          aria-label="View more"
        >
          <svg
            className={`w-12 h-12 ${arrowColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
