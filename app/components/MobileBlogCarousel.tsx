"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

interface Blog {
  image: string;
  tag: string;
  tagColor: string;
  title: string;
  date: string;
  url?: string;
}

interface MobileBlogCarouselProps {
  blogs: Blog[];
}

export default function MobileBlogCarousel({ blogs }: MobileBlogCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to trigger a slide change
  const minSwipeDistance = 50;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? blogs.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === blogs.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left - go to next
      setCurrentIndex((prev) => (prev === blogs.length - 1 ? 0 : prev + 1));
    } else if (isRightSwipe) {
      // Swipe right - go to previous
      setCurrentIndex((prev) => (prev === 0 ? blogs.length - 1 : prev - 1));
    }
  }, [touchStart, touchEnd, blogs.length]);

  return (
    <div className="w-full max-w-[366px] mx-auto px-6 py-10">
      {/* Main Card */}
      <div
        ref={cardRef}
        className="relative w-full aspect-[360.5/450.625] mb-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <a
          href={blogs[currentIndex].url || "#"}
          className="block relative w-full h-full rounded-3xl overflow-hidden bg-white cursor-pointer group"
        >
          {/* Image Container with Gradient Overlay */}
          <div className="absolute inset-0">
            <Image
              src={blogs[currentIndex].image}
              alt={blogs[currentIndex].title}
              fill
              className="object-cover transition-transform duration-400 ease-out group-hover:scale-105"
            />

            {/* Gradient Overlay - from transparent to black */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent" />
          </div>

          {/* Content Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            {/* Category Badge */}
            <div
              className="inline-block px-[6px] py-[2px] rounded-2xl mb-2"
              style={{ backgroundColor: blogs[currentIndex].tagColor }}
            >
              <span className="text-white text-xs font-bold uppercase tracking-tight">
                {blogs[currentIndex].tag}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-white text-2xl font-bold leading-7 tracking-wide mb-3">
              {blogs[currentIndex].title}
            </h3>

            {/* Date */}
            <div className="flex items-center text-white text-sm font-semibold tracking-tight">
              {blogs[currentIndex].date}
            </div>
          </div>
        </a>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {blogs.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`rounded-full transition-all ${
              index === currentIndex
                ? "bg-gray-800 w-6 h-1.5"
                : "bg-gray-800/30 w-1.5 h-1.5"
            }`}
            aria-label={`Go to blog ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <div className="flex justify-center gap-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center transition-all hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous blog"
        >
          <ChevronLeft className="w-7 h-7 text-gray-700" strokeWidth={2.5} />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === blogs.length - 1}
          className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center transition-all hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next blog"
        >
          <ChevronRight className="w-7 h-7 text-gray-700" strokeWidth={2.5} />
        </button>
      </div>

      {/* View All Button */}
      <div className="mt-6 text-center">
        <a
          href="#all-blogs"
          className="inline-block px-6 py-3 rounded-full bg-gray-100 text-gray-900 text-[17px] font-semibold tracking-tight transition-all hover:bg-gray-200"
        >
          View All
        </a>
      </div>
    </div>
  );
}
