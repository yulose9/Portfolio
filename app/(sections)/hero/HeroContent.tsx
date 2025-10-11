import { Highlighter } from "@/app/components/icons";
import Image from "next/image";

export default function HeroContent() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="flex flex-row items-center justify-center">
        {/* Hero Text Container */}
        <div className="flex flex-col items-start gap-[23px] w-[411px] z-10">
          <Highlighter />
          <div
            className="w-full text-[49px] font-medium leading-[107%] tracking-[-0.08em] text-left"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            Freelance
            <br />
            Full Stack Developer
            <br />
            Computer Engineer
          </div>
        </div>

        {/* Main Image */}
        <div className="w-full max-w-lg -ml-48 transform translate-y-32">
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
  );
}
