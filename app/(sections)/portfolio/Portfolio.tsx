"use client";

import { BlogCard, MobileBlogCarousel } from "@/app/(sections)/blog";
import { GsapBouncyText } from "@/app/(sections)/hero";
import { SectionHeader } from "@/app/components/shared";
import { Inter } from "next/font/google";
import { DesktopProjectCarousel, MobileProjectCarousel } from "./";

const inter = Inter({ subsets: ["latin"] });

// Sample data - replace with your actual data
const projects = [
  {
    image: "/images/carousell-item1.png",
    title: "Project 1",
    description: "A full-stack application built with Next.js",
    blogUrl: "#",
    githubUrl: "#",
  },
  {
    image: "/images/carousell-item2.png",
    title: "Project 2",
    description: "E-commerce platform with React",
    blogUrl: "#",
    githubUrl: "#",
  },
  {
    image: "/images/carousell-item3.png",
    title: "Project 3",
    description: "Mobile-first web application",
    blogUrl: "#",
    githubUrl: "#",
  },
  {
    image: "/images/carousell-item4.png",
    title: "Project 4",
    description: "Real-time collaboration tool",
    blogUrl: "#",
    githubUrl: "#",
  },
];

const blogs = [
  {
    image: "/images/image-blogcard.png",
    tag: "DEVELOPMENT",
    tagColor: "#d28314",
    title: "Building Modern Web Applications",
    date: "January 15, 2024",
  },
  {
    image: "/images/image-blogcard.png",
    tag: "DESIGN",
    tagColor: "#5a54ff",
    title: "UI/UX Best Practices",
    date: "February 20, 2024",
  },
  {
    image: "/images/image-blogcard.png",
    tag: "TUTORIAL",
    tagColor: "#17d440",
    title: "Getting Started with TypeScript",
    date: "March 10, 2024",
  },
];

export default function Portfolio() {
  return (
    <div
      id="portfolio"
      className={`relative w-screen bg-gradient-to-br from-[#faf9f6] via-[#f5f3f0] to-[#fae8e8] ${inter.className}`}
    >
      {/* Projects Section - Full Screen */}
      <section className="relative min-h-screen flex flex-col justify-center px-4 md:px-8 py-8 md:py-8">
        {/* Project Header */}
        <div className="flex flex-col gap-2 md:gap-4 mb-4 md:mb-6 max-w-[1280px] mx-auto w-full">
          <SectionHeader
            title="Projects"
            onArrowClick={() => {
              // Add your navigation logic here
              console.log("Navigate to projects");
            }}
          />
          <GsapBouncyText
            text="Works I’ve done across different areas, from web and software development to research and hardware builds. Each project represents how I think, solve problems, and turn ideas into something useful. It’s a mix of technical skill and curiosity, showing both the process and the purpose behind what I create."
            className="text-[14px] md:text-[20px] leading-[1.588] tracking-[-0.56px] md:tracking-[-0.8px] text-black max-w-[1280px] whitespace-pre-wrap"
            style={{ fontFamily: "Inter, SF Pro Display, sans-serif" }}
            delay={0.3}
          />
        </div>

        {/* Carousel - Responsive */}

        {/* Mobile: Mobile Project Carousel */}
        <div className="block md:hidden">
          <MobileProjectCarousel projects={projects} />
        </div>

        {/* Desktop: Original Carousel */}
        <div className="hidden md:block">
          <DesktopProjectCarousel projects={projects} />
        </div>
      </section>

      {/* Blogs Section - Full Screen */}
      <section className="relative min-h-screen flex flex-col justify-center px-4 md:px-8 py-8 md:py-8">
        {/* Blogs Header */}
        <div className="flex flex-col gap-2 md:gap-4 mb-4 md:mb-6 max-w-[1280px] mx-auto w-full">
          <SectionHeader
            title="Blogs"
            onArrowClick={() => {
              // Add your navigation logic here
              console.log("Navigate to blogs");
            }}
          />
          <GsapBouncyText
            text="A space where I share my thoughts, insights, and lessons from the things I learn and experience. Some entries are reflections, others are guides or deep dives into topics that caught my interest. It’s where I explore ideas, connect concepts, and document what I find meaningful or useful along the way."
            className="text-[14px] md:text-[20px] leading-[1.588] tracking-[-0.56px] md:tracking-[-0.8px] text-black max-w-[1280px] whitespace-pre-wrap"
            style={{ fontFamily: "Inter, SF Pro Display, sans-serif" }}
            delay={0.3}
          />
        </div>

        {/* Blog Cards - Responsive */}
        <div className="max-w-[1280px] mx-auto w-full">
          {/* Mobile: Mobile Blog Carousel */}
          <div className="block md:hidden">
            <MobileBlogCarousel blogs={blogs} />
          </div>

          {/* Desktop: 3-column grid */}
          <div className="hidden md:grid grid-cols-3 gap-[47px]">
            {blogs.map((blog, index) => (
              <BlogCard key={index} {...blog} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
