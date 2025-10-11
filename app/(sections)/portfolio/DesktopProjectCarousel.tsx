"use client";

import { GsapBouncyText } from "@/app/(sections)/hero";
import { SectionHeader } from "@/app/components/shared";
import { Carousel } from "./";

interface Project {
  image: string;
  title: string;
  description: string;
  blogUrl?: string;
  githubUrl?: string;
}

interface DesktopProjectCarouselProps {
  projects: Project[];
}

export default function DesktopProjectCarousel({
  projects,
}: DesktopProjectCarouselProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center px-4 md:px-8">
      {/* Carousel */}
      <div className="max-w-[1280px] mx-auto w-full">
        <Carousel projects={projects} />
      </div>
    </section>
  );
}
