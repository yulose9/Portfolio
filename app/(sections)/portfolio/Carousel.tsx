"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface CarouselProps {
  projects: {
    image: string;
    title: string;
    description: string;
    blogUrl?: string;
    githubUrl?: string;
  }[];
}

export default function Carousel({ projects }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Create extended array for infinite loop effect
  // Add clone of first slide at end, and clone of last slide at start
  const extendedProjects = [
    projects[projects.length - 1], // Clone of last slide
    ...projects,
    projects[0], // Clone of first slide
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || isTransitioning) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, isTransitioning, projects.length]);

  // Handle infinite loop transitions
  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);

      // Jump to real slide without animation
      if (currentIndex === 0) {
        // We're at the clone of last slide, jump to real last slide
        setCurrentIndex(projects.length);
      } else if (currentIndex === projects.length + 1) {
        // We're at the clone of first slide, jump to real first slide
        setCurrentIndex(1);
      }
    }, 500); // Match transition duration

    return () => clearTimeout(timer);
  }, [currentIndex, isTransitioning, projects.length]);

  // Auto-hide controls after mouse inactivity
  const resetMouseTimeout = () => {
    setShowControls(true);

    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }

    // Hide controls after 3 seconds of inactivity
    mouseTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleMouseMove = () => {
    resetMouseTimeout();
  };

  const handleMouseLeave = () => {
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }
    setShowControls(false);
  };

  const handleMouseEnter = () => {
    resetMouseTimeout();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
    };
  }, []);

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    // Add 1 to account for the cloned last slide at the beginning
    setCurrentIndex(index + 1);
    setIsTransitioning(true);
  };

  const handlePrevious = () => {
    if (isTransitioning) return;
    setCurrentIndex((prev) => prev - 1);
    setIsTransitioning(true);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    setCurrentIndex((prev) => prev + 1);
    setIsTransitioning(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Calculate the actual current index for display (0-based)
  const actualIndex =
    currentIndex === 0
      ? projects.length - 1
      : currentIndex === projects.length + 1
      ? 0
      : currentIndex - 1;

  // Animation variants for controls
  const controlsVariants = {
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1] as const,
      },
    },
    hidden: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3,
        ease: [0.43, 0.13, 0.23, 0.96] as const,
      },
    },
  };

  return (
    <div className="flex flex-col items-end gap-8">
      {/* Main Carousel Container - 16:9 Aspect Ratio */}
      <div
        ref={carouselRef}
        className="relative w-full aspect-[16/9] bg-[#5c5c5c] rounded-[20px] overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Carousel Track */}
        <div
          className={`flex h-full ${
            isTransitioning ? "transition-transform duration-500 ease-out" : ""
          }`}
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {extendedProjects.map((project, index) => (
            <div
              key={`slide-${index}`}
              className="relative min-w-full h-full flex-shrink-0"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="object-cover"
                priority={index === 1} // Prioritize first real slide
              />
            </div>
          ))}
        </div>

        {/* Carousel Controls (Bottom Center) - Auto-hide */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              variants={controlsVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ x: "-50%" }}
              className="absolute bottom-[50px] left-1/2 flex items-center gap-5"
            >
              {/* Pagination Dots - StickyNav Styling */}
              <div className="bg-[#374136]/50 backdrop-blur-lg rounded-full px-5 py-5 flex items-center gap-3 border border-white/10 shadow-lg">
                {projects.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`rounded-full transition-all duration-300 ${
                      index === actualIndex
                        ? "w-[60px] h-2 bg-[#ceced0]"
                        : "w-2 h-2 bg-white/60 hover:bg-white/90"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Play/Pause Button - StickyNav Styling */}
              <button
                onClick={togglePlayPause}
                className="relative w-14 h-14 bg-[#374136]/50 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-[#374136]/70 hover:scale-110 transition-all duration-300 shadow-lg border border-white/10"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white fill-white" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Icons (Bottom Right) - Always Visible */}
        <div className="absolute bottom-[52px] right-[14px] flex items-center gap-2">
          <a
            href={projects[actualIndex].blogUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="View blog post"
          >
            <Image
              src="/images/blog-icon.svg"
              alt="Blog"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </a>
          <a
            href={projects[actualIndex].githubUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="View on GitHub"
          >
            <Image
              src="/images/view-github.svg"
              alt="GitHub"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </a>
        </div>
      </div>

      {/* Navigation Arrows (Bottom Right) - StickyNav Styling */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePrevious}
          disabled={isTransitioning}
          className="w-10 h-10 bg-[#374136]/50 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-[#374136]/70 hover:scale-110 transition-all duration-300 shadow-lg border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleNext}
          disabled={isTransitioning}
          className="w-10 h-10 bg-[#374136]/50 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-[#374136]/70 hover:scale-110 transition-all duration-300 shadow-lg border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
