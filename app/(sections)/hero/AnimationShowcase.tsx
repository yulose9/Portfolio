"use client";

import { AdvancedSplitText } from "@/app/components/animations";
import { useState } from "react";
import GsapBouncyText from "./GsapBouncyText";

/**
 * Animation showcase component
 * Demonstrates all available text animations
 * Can be used for testing or as a reference
 */
export function AnimationShowcase() {
  const [selectedAnimation, setSelectedAnimation] = useState<string>("bouncy");

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 to-slate-800 p-12 rounded-2xl">
      <h1 className="text-4xl font-bold text-white mb-12 text-center">
        Text Animation Showcase
      </h1>

      {/* GsapBouncyText Styles */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-blue-400 mb-8">
          GsapBouncyText Animations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { style: "bouncy", label: "Bouncy" },
            { style: "smooth", label: "Smooth" },
            { style: "elastic", label: "Elastic" },
            { style: "pop", label: "Pop" },
            { style: "wave", label: "Wave" },
            { style: "smooth-wave", label: "Smooth Wave" },
          ].map(({ style, label }) => (
            <div key={style} className="bg-slate-700 p-6 rounded-lg">
              <p className="text-xs text-slate-400 mb-4">{label}</p>
              <GsapBouncyText
                text={`${label} Animation`}
                animationStyle={style as any}
                className="text-xl font-semibold text-white"
              />
            </div>
          ))}
        </div>
      </section>

      {/* AdvancedSplitText Word Animations */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-purple-400 mb-8">
          Word-Level Animations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { type: "slideUp", label: "Slide Up" },
            { type: "slideDown", label: "Slide Down" },
            { type: "fadeSlide", label: "Fade Slide" },
            { type: "scaleReveal", label: "Scale Reveal" },
            { type: "elasticSlide", label: "Elastic Slide" },
            { type: "rotateIn", label: "Rotate In" },
            { type: "charWave", label: "Char Wave" },
            { type: "letterPress", label: "Letter Press" },
            { type: "bounce", label: "Bounce" },
            { type: "blur", label: "Blur Fade" },
          ].map(({ type, label }) => (
            <div key={type} className="bg-slate-700 p-6 rounded-lg">
              <p className="text-xs text-slate-400 mb-4">{label}</p>
              <AdvancedSplitText
                animationType={type as any}
                staggerDelay={0.1}
                className="text-lg font-semibold text-white"
              >
                {label}
              </AdvancedSplitText>
            </div>
          ))}
        </div>
      </section>

      {/* Character-Level Animations */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-green-400 mb-8">
          Character-Level Animations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { type: "slideUp", label: "Slide Up" },
            { type: "rotateIn", label: "Rotate In" },
            { type: "bounce", label: "Bounce" },
            { type: "blur", label: "Blur" },
          ].map(({ type, label }) => (
            <div key={`char-${type}`} className="bg-slate-700 p-6 rounded-lg">
              <p className="text-xs text-slate-400 mb-4">{label} (Chars)</p>
              <AdvancedSplitText
                splitType="chars"
                animationType={type as any}
                staggerDelay={0.05}
                className="text-lg font-semibold text-white tracking-widest"
              >
                {label}
              </AdvancedSplitText>
            </div>
          ))}
        </div>
      </section>

      {/* Timing Variations */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-orange-400 mb-8">
          Duration Variations
        </h2>
        <div className="space-y-6">
          {[
            { duration: 0.3, label: "Fast (0.3s)" },
            { duration: 0.6, label: "Normal (0.6s)" },
            { duration: 1.0, label: "Slow (1.0s)" },
          ].map(({ duration, label }) => (
            <div key={duration} className="bg-slate-700 p-6 rounded-lg">
              <p className="text-xs text-slate-400 mb-4">{label}</p>
              <GsapBouncyText
                text={`This animation is ${label}`}
                duration={duration}
                staggerDelay={0.08}
                className="text-lg font-semibold text-white"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Stagger Variations */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-pink-400 mb-8">
          Stagger Variations
        </h2>
        <div className="space-y-6">
          {[
            { stagger: 0.02, label: "Tight (0.02s)" },
            { stagger: 0.08, label: "Normal (0.08s)" },
            { stagger: 0.15, label: "Loose (0.15s)" },
          ].map(({ stagger, label }) => (
            <div key={stagger} className="bg-slate-700 p-6 rounded-lg">
              <p className="text-xs text-slate-400 mb-4">{label}</p>
              <AdvancedSplitText
                animationType="slideUp"
                staggerDelay={stagger}
                className="text-lg font-semibold text-white"
              >
                Stagger timing affects timing
              </AdvancedSplitText>
            </div>
          ))}
        </div>
      </section>

      {/* Hover Effect */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-cyan-400 mb-8">Hover Effects</h2>
        <div className="bg-slate-700 p-6 rounded-lg cursor-pointer">
          <p className="text-xs text-slate-400 mb-4">Hover to replay</p>
          <AdvancedSplitText
            animationType="elasticSlide"
            hover={true}
            staggerDelay={0.08}
            className="text-xl font-semibold text-white"
          >
            Hover me to replay
          </AdvancedSplitText>
        </div>
      </section>

      {/* Combined Usage Example */}
      <section>
        <h2 className="text-2xl font-bold text-indigo-400 mb-8">
          Combined Usage
        </h2>
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-8 rounded-lg space-y-4">
          <GsapBouncyText
            text="Your Amazing Portfolio"
            as="h1"
            animationStyle="bouncy"
            delay={0}
            className="text-4xl font-bold text-white"
          />
          <AdvancedSplitText
            animationType="slideUp"
            staggerDelay={0.05}
            delay={0.5}
            className="text-lg text-slate-200"
          >
            Showcase your work with engaging animations
          </AdvancedSplitText>
          <div className="pt-4">
            <AdvancedSplitText
              splitType="words"
              animationType="fadeSlide"
              staggerDelay={0.12}
              delay={1.2}
              className="text-base text-slate-300 italic"
            >
              Built with GSAP and inspired by industry best practices
            </AdvancedSplitText>
          </div>
        </div>
      </section>
    </div>
  );
}
