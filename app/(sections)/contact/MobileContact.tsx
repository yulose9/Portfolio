"use client";

import { useHaptics } from "@/app/hooks/use-haptics";
import { trackEvent } from "@/app/utils/analytics";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function MobileContact() {
  const haptic = useHaptics();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      ref={ref}
      id="contact"
      className="relative min-h-screen flex flex-col justify-center items-center px-4 bg-white"
    >
      <div className="max-w-[402px] mx-auto w-full relative z-10">
        {/* Main centered container */}
        <div className="flex flex-col items-center justify-center">
          {/* Header */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-[clamp(32px,8vw,48px)] font-medium leading-[1.07] tracking-[-0.48px] text-black text-center mb-[40px] max-w-[90%] mx-auto"
            style={{
              fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
            }}
          >
            Want to collaborate on something?
          </motion.h2>

          {/* Get in touch button with lines */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={
              isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }
            }
            transition={{ duration: 0.35, delay: 0.1 }}
            className="relative flex items-center justify-center w-full mb-[53px]"
          >
            {/* Horizontal line */}
            <div className="absolute left-0 right-0 h-[1px] bg-black" />

            {/* Button */}
            <a href="mailto:contact@nazarene.dev" onClick={() => haptic("medium")} className="relative z-10 bg-[#42ad77] hover:bg-[#3a9667] active:scale-[0.96] transition-[color,background-color,border-color,box-shadow,opacity,transform] rounded-full px-6 py-3 flex items-center justify-center shadow-sm">
              <span
                className="text-base font-semibold text-white tracking-[-0.1815px] leading-none"
                style={{
                  fontFamily: "Inter, SF Pro Display, SF Pro Text, sans-serif",
                }}
              >
                Get in touch
              </span>
            </a>
          </motion.div>

          {/* Contact information */}
          <div className="flex flex-col gap-[21px] items-center w-full">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="flex items-center gap-[11px]"
            >
              {/* Envelope Emoji/Icon */}
              <div className="w-[27.261px] h-[27.261px] flex items-center justify-center">
                <span className="text-[27px] leading-none">📧</span>
              </div>
              <a
                href="mailto:contact@nazarene.dev"
                onClick={(e) => {
                  trackEvent("Clicked Contact Email (Mobile)");
                }}
              >
                <span className="text-base md:text-2xl underline-offset-4 hover:underline">contact@nazarene.dev</span>
              </a>
            </motion.div>

            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="flex items-center gap-[11px]"
            >
              {/* Phone Emoji/Icon */}
              <div className="w-[27.261px] h-[27.261px] flex items-center justify-center">
                <span className="text-[27px] leading-none">📞</span>
              </div>
              <a href="tel:+639454178422">
                <span className="text-base md:text-2xl underline-offset-4 hover:underline">+639 454 178 422</span>
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
