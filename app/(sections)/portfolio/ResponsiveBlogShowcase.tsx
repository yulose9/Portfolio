"use client";

import { BlogCard, MobileBlogCarousel } from "@/app/(sections)/blog";

interface Blog {
    image: string;
    tag: string;
    tagColor: string;
    title: string;
    date: string;
    isPlaceholder?: boolean;
}

interface ResponsiveBlogShowcaseProps {
    blogs: Blog[];
}

export default function ResponsiveBlogShowcase({ blogs }: ResponsiveBlogShowcaseProps) {
    return (
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
    );
}
