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
    <footer ref={ref} className="bg-[#869384] px-5 pt-7 pb-[max(24px,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex max-w-sm flex-col gap-5"
      >
        {/* Top Row: Resume Button and Social Icons */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Resume & CV Button */}
          <a
            href="https://nazarene-resume-bucket.s3.us-east-1.amazonaws.com/DelaPisa_Resume_v1.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="pressable bg-[#374136] hover:bg-[#2c352b] rounded-xl px-5 h-11 w-full flex items-center justify-center"
          >
            <span
              className="text-sm font-semibold text-white leading-5 text-center"
              style={{
                fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
              }}
            >
              Resume & CV
            </span>
          </a>

          {/* Social Media Links */}
          <div className="flex gap-3 items-center justify-center">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/xcszan"
              target="_blank"
              rel="noopener noreferrer"
              className="pressable bg-[#374136]/15 hover:bg-[#374136]/25 rounded-full w-11 h-11 flex items-center justify-center"
              aria-label="Facebook"
            >
              <FaFacebookF className="w-4 h-4 text-[#243022]" />
            </a>

            {/* Twitter/X */}
            <a
              href="https://x.com/xcszan"
              target="_blank"
              rel="noopener noreferrer"
              className="pressable bg-[#374136]/15 hover:bg-[#374136]/25 rounded-full w-11 h-11 flex items-center justify-center"
              aria-label="Twitter"
            >
              <FaTwitter className="w-4 h-4 text-[#243022]" />
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/nazarenexcsz/"
              target="_blank"
              rel="noopener noreferrer"
              className="pressable bg-[#374136]/15 hover:bg-[#374136]/25 rounded-full w-11 h-11 flex items-center justify-center"
              aria-label="Instagram"
            >
              <FaInstagram className="w-[18px] h-[18px] text-[#243022]" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/jannazarene/"
              target="_blank"
              rel="noopener noreferrer"
              className="pressable bg-[#374136]/15 hover:bg-[#374136]/25 rounded-full w-11 h-11 flex items-center justify-center"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn className="w-4 h-4 text-[#243022]" />
            </a>
          </div>
        </div>

        {/* Copyright Text - Single Line */}
        <p
          className="text-xs font-normal text-[#243022] leading-5 text-center text-balance"
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
