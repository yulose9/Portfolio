import { ArrowRight } from "lucide-react";
import { Inter } from "next/font/google";
import BlogCard from "./BlogCard";
import Carousel from "./Carousel";

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
      <section className="relative min-h-screen flex flex-col justify-center px-8 py-8">
        {/* Project Header */}
        <div className="flex flex-col gap-6 mb-6 max-w-[1280px] mx-auto w-full">
          <div className="flex items-center justify-between h-[90px]">
            <h2
              className="text-[96px] font-medium leading-[0.938] tracking-[-3.84px] text-black"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Project/s Title
            </h2>
            <button className="p-1 hover:scale-110 transition-transform">
              <ArrowRight className="w-8 h-8 text-black" strokeWidth={2} />
            </button>
          </div>
          <p
            className="text-[32px] leading-[1.588] tracking-[-1.28px] text-black max-w-[1280px] whitespace-pre-wrap"
            style={{ fontFamily: "SF Pro Display, sans-serif" }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa
            mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien
            fringilla, mattis ligula consectetur, ultrices mauris. Maecenas
            vitae mattis tellus. Nullam quis imperdiet augue.
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-[1280px] mx-auto w-full">
          <Carousel projects={projects} />
        </div>
      </section>

      {/* Blogs Section - Full Screen */}
      <section className="relative min-h-screen flex flex-col justify-center px-8 py-8">
        {/* Blogs Header */}
        <div className="flex flex-col gap-6 mb-6 max-w-[1280px] mx-auto w-full">
          <div className="flex items-center justify-between h-[90px]">
            <h2
              className="text-[96px] font-medium leading-[0.938] tracking-[-3.84px] text-black"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Blogs
            </h2>
            <button className="p-1 hover:scale-110 transition-transform">
              <ArrowRight className="w-8 h-8 text-black" strokeWidth={2} />
            </button>
          </div>
          <p
            className="text-[32px] leading-[1.588] tracking-[-1.28px] text-black max-w-[1280px] whitespace-pre-wrap"
            style={{ fontFamily: "SF Pro Display, sans-serif" }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa
            mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien
            fringilla, mattis ligula consectetur, ultrices mauris. Maecenas
            vitae mattis tellus. Nullam quis imperdiet augue.
          </p>
        </div>

        {/* Blog Cards */}
        <div className="max-w-[1280px] mx-auto grid grid-cols-3 gap-[47px] w-full">
          {blogs.map((blog, index) => (
            <BlogCard key={index} {...blog} />
          ))}
        </div>
      </section>
    </div>
  );
}
