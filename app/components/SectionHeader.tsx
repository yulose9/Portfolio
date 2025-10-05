"use client";

import { ArrowRight } from "lucide-react";
import TextPullUp from "./TextPullUp";

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
    <div className="flex items-center justify-between min-h-[40px] md:min-h-[60px]">
      <TextPullUp
        text={title}
        className={`text-[36px] md:text-[64px] font-medium leading-[0.938] tracking-[-1.44px] md:tracking-[-2.56px] ${textColor}`}
        style={{ fontFamily: "Inter, sans-serif" }}
        delay={delay}
      />
      {onArrowClick && (
        <button
          onClick={onArrowClick}
          className="p-1 hover:scale-110 transition-transform"
          aria-label="View more"
        >
          <ArrowRight
            className={`w-4 h-4 md:w-6 md:h-6 ${arrowColor}`}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}
