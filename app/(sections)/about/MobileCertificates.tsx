"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Certificates data matching desktop version
const certificates = [
  {
    title: "Azure Fundamentals",
    issuingOrg: "Microsoft",
    date: "Oct 2024",
    image: "/images/certifications/microsoft-certified-fundamentals-badge.svg",
    credentialUrl:
      "https://learn.microsoft.com/api/credentials/share/en-us/JohnNazareneDelaPisa-8958/D57215FE29EAA434?sharingId",
  },
  {
    title: "Cloud Digital Leader",
    issuingOrg: "Google",
    date: "Jan 2025",
    image: "/images/certifications/googlecloudpractitioner.png",
    credentialUrl:
      "https://www.credly.com/badges/95d75765-13fa-4c81-802c-834c0217da8a/linked_in_profile",
  },
  {
    title: "Terraform Associate",
    issuingOrg: "HashiCorp",
    date: "Feb 2025",
    image: "/images/certifications/TerraformAssociate.png",
    credentialUrl:
      "https://www.credly.com/badges/bebd520f-8e29-4ec4-9f11-22a35b047349/linked_in_profile",
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
        className="text-[16px] font-normal leading-[25.4px] tracking-[-0.64px] text-white text-center mb-[95px] px-[20px]"
        style={{ fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif" }}
      >
        Professional certifications and credentials that validate my technical
        expertise and continuous learning journey.
      </motion.p>

      {/* Certificates Grid - 2 Columns */}
      <div className="grid grid-cols-2 gap-[13px] mb-[111px]">
        {certificates.map((cert, index) => {
          const ref = useRef(null);
          const isInView = useInView(ref, {
            once: true,
            margin: "-50px",
          });

          return (
            <motion.div
              key={index}
              ref={ref}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.21, 0.47, 0.32, 0.98],
                delay: index * 0.1 + 0.3,
              }}
              viewport={{ once: true, margin: "-50px" }}
              onClick={() =>
                cert.credentialUrl &&
                window.open(cert.credentialUrl, "_blank", "noopener,noreferrer")
              }
              className="relative w-full h-[238.732px] rounded-[10.141px] bg-white/50 backdrop-blur-[17.512px] border-[0.146px] border-[rgba(117,117,117,0.4)] shadow-[0px_4.673px_9.346px_0px_rgba(0,0,0,0.28),0px_0.292px_3.067px_0px_rgba(0,0,0,0.22)] overflow-hidden cursor-pointer active:scale-95 transition-transform"
            >
              {/* Date Badge */}
              <div className="absolute top-[9.3px] left-[106.48px] bg-[#d9d9d9] rounded-[41.831px] px-[4.225px] py-[4.225px] shadow-sm">
                <p
                  className="text-[11.724px] font-normal leading-[5.917px] tracking-[-0.4842px] text-black whitespace-nowrap"
                  style={{
                    fontFamily:
                      "Inter, SF Pro Display, SF Pro Text, sans-serif",
                  }}
                >
                  {cert.date}
                </p>
              </div>

              {/* Certificate Image Placeholder */}
              <div className="absolute left-[40.56px] top-[42.25px] w-[98.873px] h-[98.873px] rounded-[2.535px] overflow-hidden">
                {/* Certificate Badge Image */}
                <img
                  src={cert.image}
                  alt={cert.title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to placeholder icon if image fails to load
                    const target = e.currentTarget;
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `
                      <div class="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9]">
                        <div class="absolute inset-0 overflow-hidden">
                          <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 blur-lg" />
                          <div class="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/30 blur-xl" />
                        </div>
                        <div class="relative z-10 flex items-center justify-center h-full">
                          <div class="absolute w-12 h-12 rounded-full bg-[#657a62]/10 blur-md" />
                          <svg class="relative w-10 h-10 text-gray-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div class="absolute top-0 left-0 w-4 h-4 border-l border-t border-white/40 rounded-tl-[2.535px]" />
                        <div class="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-white/40 rounded-br-[2.535px]" />
                      </div>
                    `;
                    }
                  }}
                />
              </div>

              {/* Certificate Info */}
              <div className="absolute bottom-[46px] left-[20.28px] right-[20.28px]">
                <p
                  className="text-[18.474px] font-semibold leading-[5.917px] tracking-[-0.763px] text-black mb-[20px]"
                  style={{
                    fontFamily:
                      "Inter, SF Pro Display, SF Pro Text, sans-serif",
                  }}
                >
                  {cert.title}
                </p>
                <p
                  className="text-[11.724px] font-normal leading-[5.917px] tracking-[-0.4842px] text-black"
                  style={{
                    fontFamily:
                      "Inter, SF Pro Display, SF Pro Text, sans-serif",
                  }}
                >
                  {cert.issuingOrg}
                </p>
              </div>
            </motion.div>
          );
        })}
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
