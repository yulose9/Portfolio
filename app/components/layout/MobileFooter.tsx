"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
} from "react-icons/fa";

export default function MobileFooter() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <footer ref={ref} className="bg-[#869384] py-[13px] px-[39px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-[24px]"
      >
        {/* Top Row: Resume Button and Social Icons */}
        <div className="flex items-center justify-between w-full">
          {/* Resume & CV Button */}
          <a
            href="#"
            className="bg-[#8eb08a] hover:bg-[#7a9d76] active:scale-95 transition-all rounded-[10.237px] px-[7.312px] py-[5.118px] h-[34px] w-[96.15px] flex items-center justify-center shrink-0"
          >
            <span
              className="text-[9.323px] font-semibold text-white tracking-[-0.1492px] leading-[8.043px] text-center whitespace-nowrap"
              style={{
                fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
              }}
            >
              Resume & CV
            </span>
          </a>

          {/* Social Media Links */}
          <div className="flex gap-[10px] items-center shrink-0">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] active:scale-95 transition-all rounded-full w-[34px] h-[34px] flex items-center justify-center"
              aria-label="Facebook"
            >
              <FaFacebookF className="w-[14px] h-[14px] text-white" />
            </a>

            {/* Twitter/X */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] active:scale-95 transition-all rounded-full w-[34px] h-[34px] flex items-center justify-center"
              aria-label="Twitter"
            >
              <FaTwitter className="w-[14px] h-[14px] text-white" />
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] active:scale-95 transition-all rounded-full w-[34px] h-[34px] flex items-center justify-center"
              aria-label="Instagram"
            >
              <FaInstagram className="w-[16px] h-[16px] text-white" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] active:scale-95 transition-all rounded-full w-[34px] h-[34px] flex items-center justify-center"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn className="w-[14px] h-[14px] text-white" />
            </a>
          </div>
        </div>

        {/* Copyright Text - Single Line */}
        <p
          className="text-[14px] font-normal text-white tracking-[-0.574px] leading-[1.068] text-center whitespace-nowrap"
          style={{
            fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
          }}
        >
          Copyright © {new Date().getFullYear()} John Dela Pisa. All rights
          reserved.
        </p>
      </motion.div>
    </footer>
  );
}
