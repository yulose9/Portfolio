"use client";

import { MagicTextReveal } from "@/app/components/animations";
import { trackEvent } from "@/app/utils/analytics";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MobileContact } from "./";

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <>
      {/* Mobile Version */}
      <div className="block md:hidden">
        <MobileContact />
      </div>

      {/* Desktop Version */}
      <section
        id="contact"
        ref={ref}
        className="hidden md:flex relative min-h-screen flex-col justify-center items-center px-8 py-20 bg-white"
      >
        <div className="max-w-[1280px] mx-auto w-full relative z-10">
          {/* Main centered container */}
          <div className="flex flex-col items-center">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center mb-12"
            >
              <h2
                className="text-[64px] md:text-[80px] font-semibold leading-tight tracking-[-3.2px] text-black"
                style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
              >
                Want to collaborate
              </h2>
              <h2
                className="text-[64px] md:text-[80px] font-semibold leading-tight tracking-[-3.2px] text-black mt-4"
                style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
              >
                on something?
              </h2>
            </motion.div>

            {/* Get in touch button with lines */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={
                isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
              }
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-0 mb-16"
            >
              {/* Left line */}
              <div className="w-[300px] md:w-[400px] h-[2px] bg-black" />

              {/* Button */}
              <button className="bg-brand-accent hover:bg-brand-accent-hover transition-colors rounded-[20px] px-[16px] py-[10px] h-[80px] w-[280px] flex items-center justify-center">
                <span
                  className="text-[28px] font-semibold text-white tracking-[-0.408px] leading-tight"
                  style={{ fontFamily: "Inter, SF Pro Text, sans-serif" }}
                >
                  Get in touch
                </span>
              </button>

              {/* Right line */}
              <div className="w-[300px] md:w-[400px] h-[2px] bg-black" />
            </motion.div>

            {/* Contact information */}
            <div className="flex flex-col gap-8">
              {/* Email */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={
                  isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }
                }
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center gap-4"
              >
                {/* Fluent Envelope Emoji */}
                <div className="w-[48px] h-[48px] flex items-center justify-center">
                  <span className="text-[48px] leading-none">📧</span>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    trackEvent("Clicked Contact Email (Desktop)");
                  }}
                >
                  <MagicTextReveal
                    text="con***********.dev"
                    hiddenText="contact@nazarene.dev"
                    color="#000000"
                    fontSize={24}
                    fontWeight={400}
                    spread={16}
                    speed={0.5}
                    density={4}
                  />
                </a>
              </motion.div>

              {/* Phone */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={
                  isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }
                }
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex items-center gap-4"
              >
                {/* Phone Emoji */}
                <div className="w-[48px] h-[48px] flex items-center justify-center">
                  <span className="text-[48px] leading-none">📞</span>
                </div>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <MagicTextReveal
                    text="+639 *** *** **22"
                    hiddenText="+639 454 178 422"
                    color="#000000"
                    fontSize={24}
                    fontWeight={400}
                    spread={16}
                    speed={0.5}
                    density={4}
                  />
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
