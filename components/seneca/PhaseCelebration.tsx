// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { playSound } from "@/app/components/ui/sound";
import { burst, PHASE_COMPLETE } from "@/lib/seneca/celebrate";
import { useSenecaNav } from "@/lib/seneca/context/SenecaNavContext";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import SenecaPortal from "./SenecaPortal";

const EASE_OUT = [0.23, 1, 0.32, 1];

/**
 * Answers a finished phase, wherever it was finished: the "accomplish" chord,
 * palette confetti from the card that completed (bigger when the whole day is
 * done, at most once a day per category), and — away from Home, whose card
 * celebrates in place — a small toast that points at what's next.
 */
export default function PhaseCelebration() {
  const { tab } = useSenecaNav();
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const onComplete = (event) => {
      const d = event.detail;
      let big = d.allDone;
      if (big) {
        const key = `seneca_celebrated_${getPhDateKey()}_${d.category}`;
        try {
          if (localStorage.getItem(key)) big = false;
          else localStorage.setItem(key, "1");
        } catch {
          /* storage blocked: celebrate anyway */
        }
      }
      playSound("accomplish");
      const from =
        document.querySelector(`[data-celebrate-origin="${d.phaseId}"]`) ||
        document.querySelector('[data-celebrate-origin="today"]');
      burst(from, big);
      if (tabRef.current !== "home") {
        clearTimeout(timer);
        setToast({ ...d, at: Date.now() });
        timer = setTimeout(() => setToast(null), 3600);
      }
    };
    window.addEventListener(PHASE_COMPLETE, onComplete);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(PHASE_COMPLETE, onComplete);
    };
  }, []);

  return (
    <SenecaPortal>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.at}
            role="status"
            className="sn-celebrate-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", duration: 0.5, bounce: 0.25 } }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18, ease: EASE_OUT } }}
          >
            <span className="sn-celebrate-toast-emoji" aria-hidden="true">
              {toast.allDone ? "🏆" : toast.emoji}
            </span>
            <span className="min-w-0">
              <strong>{toast.allDone ? "Protocol complete" : `${toast.title} done`}</strong>
              <small>
                {toast.allDone
                  ? "Every phase, every task. Rest well tonight."
                  : toast.nextTitle
                    ? `Next up: ${toast.nextEmoji ?? ""} ${toast.nextTitle}`
                    : "That's the last open phase."}
              </small>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </SenecaPortal>
  );
}
