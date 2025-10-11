"use client";

import { motion } from "framer-motion";

// Sample certificates data
const certificates = [
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
  },
  {
    title: "Title",
    issuingOrg: "Issuing Org",
    date: "MMM yyyy",
  },
];

export default function MobileCertificates() {
  return (
    <div className="relative w-full px-[14px] py-[80px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="text-center mb-[20px]"
      >
        <h2
          className="text-[36px] font-medium leading-[33.77px] tracking-[-1.44px] text-white"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          Certificates &
        </h2>
        <h2
          className="text-[36px] font-medium leading-[33.77px] tracking-[-1.44px] text-white mt-[3.8px]"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          Licenses
        </h2>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.2,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="text-[16px] font-normal leading-[25.4px] tracking-[-0.64px] text-white text-center mb-[95px] px-[41px]"
        style={{ fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif" }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.
      </motion.p>

      {/* Certificates Grid - 2 Columns */}
      <div className="grid grid-cols-2 gap-[13px] mb-[111px]">
        {certificates.map((cert, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.21, 0.47, 0.32, 0.98],
              delay: index * 0.1 + 0.3,
            }}
            viewport={{ once: true, margin: "-50px" }}
            className="relative w-full h-[238.732px] rounded-[10.141px] bg-white/50 backdrop-blur-[17.512px] border-[0.146px] border-[rgba(117,117,117,0.4)] shadow-[0px_4.673px_9.346px_0px_rgba(0,0,0,0.28),0px_0.292px_3.067px_0px_rgba(0,0,0,0.22)] overflow-hidden"
          >
            {/* Date Badge */}
            <div className="absolute top-[9.3px] left-[106.48px] bg-[#d9d9d9] rounded-[41.831px] px-[4.225px] py-[4.225px] shadow-sm">
              <p
                className="text-[11.724px] font-normal leading-[5.917px] tracking-[-0.4842px] text-black whitespace-nowrap"
                style={{
                  fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
                }}
              >
                {cert.date}
              </p>
            </div>

            {/* Certificate Image Placeholder */}
            <div className="absolute left-[40.56px] top-[42.25px] w-[98.873px] h-[98.873px] rounded-[2.535px] bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9] overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 blur-lg" />
                <div className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/30 blur-xl" />
              </div>

              {/* Certificate icon */}
              <div className="relative z-10 flex items-center justify-center h-full">
                <div className="absolute w-12 h-12 rounded-full bg-[#657a62]/10 blur-md" />
                <svg
                  className="relative w-10 h-10 text-gray-400/80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-white/40 rounded-tl-[2.535px]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-white/40 rounded-br-[2.535px]" />
            </div>

            {/* Certificate Info */}
            <div className="absolute bottom-[46px] left-[20.28px] right-[20.28px]">
              <p
                className="text-[18.474px] font-semibold leading-[5.917px] tracking-[-0.763px] text-black mb-[20px]"
                style={{
                  fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
                }}
              >
                {cert.title}
              </p>
              <p
                className="text-[11.724px] font-normal leading-[5.917px] tracking-[-0.4842px] text-black"
                style={{
                  fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
                }}
              >
                {cert.issuingOrg}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View All Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: 0.6,
        }}
        viewport={{ once: true, margin: "-50px" }}
        className="flex justify-center"
      >
        <button className="bg-[#8eb08a] rounded-[12.456px] px-[8.897px] py-[6.228px] h-[41.373px] w-[117px] shadow-md hover:scale-105 transition-transform">
          <span
            className="text-[11.344px] font-semibold leading-[9.787px] tracking-[-0.182px] text-white text-center"
            style={{
              fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
            }}
          >
            View All
          </span>
        </button>
      </motion.div>
    </div>
  );
}
