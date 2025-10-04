"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

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

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, projects.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col items-end gap-8">
      {/* Main Carousel Container */}
      <div className="relative w-full h-[480px] bg-[#5c5c5c] rounded-[20px] overflow-hidden">
        {/* Carousel Track */}
        <div
          className="flex transition-transform duration-500 ease-out h-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {projects.map((project, index) => (
            <div
              key={index}
              className="relative min-w-full h-full flex-shrink-0"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        {/* Carousel Controls (Bottom Center) */}
        <div className="absolute bottom-[50px] left-1/2 -translate-x-1/2 flex items-center gap-5">
          {/* Pagination Dots */}
          <div className="bg-[#323234] rounded-full px-5 py-4 flex items-center gap-3">
            {projects.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`rounded-full transition-all ${
                  index === currentIndex
                    ? "w-[50px] h-1.5 bg-[#ceced0]"
                    : "w-1.5 h-1.5 bg-white hover:bg-gray-300"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="relative w-10 h-10 bg-[#323234] rounded-full flex items-center justify-center hover:bg-[#424244] transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white fill-white" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            )}
          </button>
        </div>

        {/* Action Icons (Bottom Right) - Always Visible */}
        <div className="absolute bottom-[52px] right-[14px] flex items-center gap-2">
          <a
            href={projects[currentIndex].blogUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full w-12 h-12 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="View blog post"
          >
            <Image
              src="/images/blog-icon.svg"
              alt="Blog"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </a>
          <a
            href={projects[currentIndex].githubUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full w-12 h-12 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="View on GitHub"
          >
            <Image
              src="/images/view-github.svg"
              alt="GitHub"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </a>
        </div>
      </div>

      {/* Navigation Arrows (Bottom Right) */}
      <div className="flex items-center gap-3">
        <button
          onClick={goToPrevious}
          className="w-7 h-7 bg-[#333336] rounded-full flex items-center justify-center hover:bg-[#434346] transition-colors opacity-36 hover:opacity-100"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={goToNext}
          className="w-7 h-7 bg-[#333336] rounded-full flex items-center justify-center hover:bg-[#434346] transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
