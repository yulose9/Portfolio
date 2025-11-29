"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

interface Certificate {
  title: string;
  issuingOrg: string;
  date: string;
  image: string;
  credentialUrl: string;
}

interface CertificateCardProps {
  cert: Certificate;
  index: number;
}

/**
 * Certificate card component for desktop view.
 * Extracted to avoid Rules of Hooks violation (no useRef inside map loops).
 * Uses React state for error handling instead of innerHTML manipulation.
 */
export default function CertificateCard({ cert, index }: CertificateCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px",
  });
  const [imageError, setImageError] = useState(false);

  return (
    <div
      ref={ref}
      onClick={() =>
        cert.credentialUrl &&
        window.open(cert.credentialUrl, "_blank", "noopener,noreferrer")
      }
      className="group relative w-full h-[495px] rounded-[21px] bg-[rgba(243,243,243,0.5)] backdrop-blur-[36.31px] border-[0.303px] border-[rgba(117,117,117,0.4)] cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0px_20px_60px_0px_rgba(0,0,0,0.4),0px_8px_30px_0px_rgba(0,0,0,0.3)] hover:bg-[rgba(255,255,255,0.7)] hover:-translate-y-2"
    >
      {/* Date Badge - Issued Date */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
        }
        transition={{
          duration: 0.5,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: index * 0.1 + 0.2,
        }}
        className="absolute top-[19px] right-[20px] bg-[#d9d9d9] rounded-full px-[12px] py-[9px] shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-105 group-hover:bg-[#e8e8e8]"
      >
        <p
          className="text-[24px] font-normal leading-[12px] tracking-[-1px] text-black"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.date}
        </p>
      </motion.div>

      {/* Certificate Image */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{
          duration: 0.6,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: index * 0.1 + 0.3,
        }}
        className="absolute left-[84px] top-[88px] w-[205px] h-[205px] rounded-[5px] overflow-hidden"
      >
        {imageError ? (
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] via-[#e8e8e8] to-[#d9d9d9]">
            <svg
              className="w-20 h-20 text-gray-400/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        ) : (
          <img
            src={cert.image}
            alt={`${cert.title} certification badge from ${cert.issuingOrg}`}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        )}
      </motion.div>

      {/* Certificate Info */}
      <div className="absolute bottom-[80px] left-[42px] right-[42px]">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.6,
            ease: [0.21, 0.47, 0.32, 0.98],
            delay: index * 0.1 + 0.4,
          }}
          className="text-[32px] font-semibold leading-[1.3] tracking-[-0.02em] text-black mb-4 transition-colors duration-300 group-hover:text-[#657a62]"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.title}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.6,
            ease: [0.21, 0.47, 0.32, 0.98],
            delay: index * 0.1 + 0.5,
          }}
          className="text-[20px] font-normal leading-[1.3] tracking-normal text-black/80 transition-colors duration-300 group-hover:text-black"
          style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
        >
          {cert.issuingOrg}
        </motion.p>
      </div>

      {/* Hover Effect - Shine Animation */}
      <div className="absolute inset-0 rounded-[21px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
      </div>
    </div>
  );
}
