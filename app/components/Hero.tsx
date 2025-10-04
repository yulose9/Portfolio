import { ArrowDown, Mail, Menu } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import Highlighter from "./icons/Highlighter";
import StickyNav from "./StickyNav";

const inter = Inter({ subsets: ["latin"] });

export default function Hero() {
  return (
    <div
      id="home"
      className={`relative w-screen h-screen bg-[#657A62] text-white ${inter.className} overflow-hidden flex flex-col`}
    >
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <nav className="flex items-center justify-between p-4 md:p-6 lg:p-8">
          {/* Left: Code by */}
          <div
            className="text-lg md:text-xl lg:text-2xl font-semibold tracking-tighter"
            style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
          >
            made by nazarene
          </div>

          {/* Right: Get in touch / Hamburger */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-3 bg-[#374136]/50 backdrop-blur-lg rounded-full text-base lg:text-lg font-semibold hover:bg-[#374136]/70 hover:scale-105 transition-all duration-300">
              <Mail className="w-5 h-5" />
              Get in touch
            </button>
            <button className="md:hidden flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition-all duration-300">
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </nav>
      </header>

      {/* Sticky Floating Navigation - With Active States */}
      <StickyNav />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center relative">
        {/* Location Badge - pushed to the very left */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[356px] h-[162px] bg-white/10 backdrop-blur-lg rounded-r-3xl flex items-center justify-center">
          <div className="flex items-center gap-[51px] px-[54px]">
            <div
              className="text-[26px] font-semibold leading-[107%] tracking-[-0.105em] text-left"
              style={{ fontFamily: "SF UI Text, Inter, sans-serif" }}
            >
              Located
              <br />
              in the
              <br />
              Philippines
            </div>
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden flex-shrink-0">
              <Image
                src="/snazzy-image.png"
                alt="Philippines Map"
                width={100}
                height={100}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Grouped Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-row items-center justify-center">
            {/* Hero Text Container */}
            <div className="flex flex-col items-start gap-[23px] w-[411px] z-10">
              <Highlighter />
              <div
                className="w-full text-[40px] font-medium leading-[107%] tracking-[-0.08em] text-left"
                style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
              >
                Developer
                <br />
                Cloud Engineer
                <br />
                Artificial Intelligence
              </div>
            </div>

            {/* Main Image */}
            <div className="w-full max-w-2xl -ml-72 transform translate-y-32">
              <Image
                src="/7a97f9ff1efd6be56501753f1f090d23d760914c.png"
                alt="John Nazarene Dela Pisa"
                width={981}
                height={913}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="absolute bottom-20 left-1/2 -translate-x-1/2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[110px] font-bold bg-clip-text text-transparent bg-hero-title-gradient z-50 whitespace-nowrap">
          John Nazarene Dela Pisa
        </h1>
      </main>

      {/* Scroll to Discover */}
      <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 flex items-center gap-2 text-base md:text-lg font-medium z-10">
        Scroll to Discover
        <ArrowDown className="w-5 h-5 md:w-6 md:h-6" />
      </div>
    </div>
  );
}
