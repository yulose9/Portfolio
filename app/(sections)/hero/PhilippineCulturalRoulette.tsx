"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// Philippine cultural images in sequence with Wikipedia links
const culturalImages = [
  {
    src: "/images/ph-roullete/ph-flag.png",
    alt: "Philippine Flag",
    wikiUrl: "https://en.wikipedia.org/wiki/Flag_of_the_Philippines",
  },
  {
    src: "/images/ph-roullete/ph-eagle.png",
    alt: "Philippine Eagle",
    wikiUrl: "https://en.wikipedia.org/wiki/Philippine_eagle",
  },
  {
    src: "/images/ph-roullete/kubo.png",
    alt: "Bahay Kubo",
    wikiUrl: "https://en.wikipedia.org/wiki/Bahay_kubo",
  },
  {
    src: "/images/ph-roullete/ph-map.png",
    alt: "Philippine Map",
    wikiUrl: "https://en.wikipedia.org/wiki/Philippines",
  },
  {
    src: "/images/ph-roullete/jeepney.png",
    alt: "Jeepney",
    wikiUrl: "https://en.wikipedia.org/wiki/Jeepney",
  },
  {
    src: "/images/ph-roullete/barong.png",
    alt: "Barong Tagalog",
    wikiUrl: "https://en.wikipedia.org/wiki/Barong_tagalog",
  },
  {
    src: "/images/ph-roullete/sampaguita.png",
    alt: "Sampaguita",
    wikiUrl: "https://en.wikipedia.org/wiki/Jasminum_sambac",
  },
];

export default function PhilippineCulturalRoulette() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Auto-rotate through images every 4.5 seconds (optimal for engagement)
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % culturalImages.length);
    }, 4500); // 4.5 seconds - sweet spot between appreciation and dynamism

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    window.open(
      culturalImages[currentIndex].wikiUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className="w-[100px] h-[100px] rounded-full relative flex-shrink-0 cursor-pointer shadow-lg shadow-[#a2daf2]/30 flex items-center justify-center p-0 hover:scale-105 transition-transform duration-300"
            style={{ backgroundColor: "#a2daf2" }}
          >
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ y: 100, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -100, opacity: 0, scale: 0.8 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94], // GSAP-like "power2.out" easing
                  }}
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                >
                  <img
                    src={culturalImages[currentIndex].src}
                    alt={culturalImages[currentIndex].alt}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "contain",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium z-[9999]">
          <p>{culturalImages[currentIndex].alt}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
