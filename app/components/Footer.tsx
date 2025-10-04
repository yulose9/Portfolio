"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
} from "react-icons/fa";

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <footer ref={ref} className="bg-[#869384] py-6 px-8">
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between gap-8"
        >
          {/* Resume & CV Button */}
          <a
            href="#"
            className="bg-[#8eb08a] hover:bg-[#7a9d76] transition-colors rounded-[21px] px-[15px] py-[11px] h-[71px] w-[201px] flex items-center justify-center shrink-0"
          >
            <span
              className="text-[19.5px] font-semibold text-white tracking-[-0.31px] leading-[17px] text-center whitespace-nowrap"
              style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
            >
              Resume & CV
            </span>
          </a>

          {/* Copyright Text */}
          <p
            className="text-[24px] font-normal text-white tracking-[-0.98px] leading-[1.07] text-center"
            style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
          >
            Copyright © 2023 John Dela Pisa. All rights reserved.
          </p>

          {/* Social Media Links */}
          <div className="flex gap-[10px] items-center shrink-0">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] transition-colors rounded-full w-[53px] h-[53px] flex items-center justify-center"
              aria-label="Facebook"
            >
              <FaFacebookF className="w-[20px] h-[20px] text-white" />
            </a>

            {/* Twitter/X */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] transition-colors rounded-full w-[53px] h-[53px] flex items-center justify-center"
              aria-label="Twitter"
            >
              <FaTwitter className="w-[20px] h-[20px] text-white" />
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] transition-colors rounded-full w-[53px] h-[53px] flex items-center justify-center"
              aria-label="Instagram"
            >
              <FaInstagram className="w-[22px] h-[22px] text-white" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#8eb08a] hover:bg-[#7a9d76] transition-colors rounded-full w-[53px] h-[53px] flex items-center justify-center"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn className="w-[20px] h-[20px] text-white" />
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
