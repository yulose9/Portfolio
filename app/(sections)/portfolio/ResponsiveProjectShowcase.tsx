"use client";

import { DesktopProjectCarousel, MobileProjectCarousel } from "./";

interface Project {
    image: string;
    title: string;
    description: string;
    blogUrl: string;
    githubUrl: string;
    isPlaceholder?: boolean;
}

interface ResponsiveProjectShowcaseProps {
    projects: Project[];
}

export default function ResponsiveProjectShowcase({ projects }: ResponsiveProjectShowcaseProps) {
    return (
        <div className="w-full">
            {/* Mobile: Mobile Project Carousel */}
            <div className="block md:hidden">
                <MobileProjectCarousel projects={projects} />
            </div>

            {/* Desktop: Original Carousel */}
            <div className="hidden md:block">
                <DesktopProjectCarousel projects={projects} />
            </div>
        </div>
    );
}
