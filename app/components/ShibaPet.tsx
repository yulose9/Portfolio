"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * A small shiba that lives beside the clock: a kaomoji face, /\ /\ ( •ᴥ• ),
 * drawn as strokes so it sits in the text like a glyph, with the curled tail
 * that makes it a shiba.
 *
 * It keeps Manila hours, like the clock it sits next to. Awake, it glances
 * around, blinks, flicks an ear, wags, tilts its head and now and then sticks
 * its tongue out. From 10pm to 7am it sleeps: ears relaxed, eyes shut, z's drifting
 * up. Hover or tap it and it's happy to see you.
 *
 * Every loop is a CSS keyframe (globals.css, .shiba-*). The loops share a 12s
 * cycle and are staggered, so the tilt, the ear flicks and the tongue never
 * land on top of each other.
 */

const hourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  hourCycle: "h23",
});

type Mood = "awake" | "asleep";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function getSnapshot(): Mood {
  const hour = Number(hourFormat.format(new Date()));
  return hour >= 22 || hour < 7 ? "asleep" : "awake";
}

// The prerender can't know the hour, so the dog waits to appear until the
// client knows whether it should be asleep, instead of switching after load.
function getServerSnapshot(): Mood | null {
  return null;
}

const HAPPY_MS = 1600;

export default function ShibaPet() {
  const mood = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [happy, setHappy] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cheer = () => {
    if (mood !== "awake") return; // let it sleep
    setHappy(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHappy(false), HAPPY_MS);
  };

  return (
    <span
      className="shiba"
      data-mood={mood ?? undefined}
      data-happy={happy || undefined}
      data-clickable={mood === "awake" || undefined}
      role="img"
      aria-label={mood === "asleep" ? "A shiba inu, asleep" : "A shiba inu"}
      onPointerEnter={cheer}
      onClick={cheer}
    >
      <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
        <g className="shiba-breath">
          {/* The curl a shiba carries over its back. */}
          <path className="shiba-line shiba-tail" d="M31.6 31.4 C36.6 31.4 38.2 25.6 35.2 24 C33 23 31.7 25.6 33.9 26.5" />
          <g className="shiba-tilt">
            <path className="shiba-line shiba-ear shiba-ear-l" d="M10 18.6 L12.2 9 L17.4 15.6" />
            <path className="shiba-line shiba-ear shiba-ear-r" d="M20.6 15.6 L25.8 9 L28 18.6" />

            <path className="shiba-line" d="M9 20 Q3.5 27 9 34" />
            <path className="shiba-line" d="M29 20 Q34.5 27 29 34" />

            {/* The two tan dots over a shiba's eyes. */}
            <g className="shiba-brows">
              <circle cx="13.4" cy="20.5" r="0.95" />
              <circle cx="24.6" cy="20.5" r="0.95" />
            </g>

            <g className="shiba-eyes shiba-eyes-open">
              <g className="shiba-glance">
                <rect className="shiba-eye" x="11.6" y="22.8" width="3.6" height="3.6" rx="1.8" />
                <rect className="shiba-eye" x="22.8" y="22.8" width="3.6" height="3.6" rx="1.8" />
              </g>
            </g>
            <g className="shiba-eyes shiba-eyes-happy">
              <path className="shiba-line" d="M11.6 25.6 Q13.4 22.6 15.2 25.6" />
              <path className="shiba-line" d="M22.8 25.6 Q24.6 22.6 26.4 25.6" />
            </g>
            <g className="shiba-eyes shiba-eyes-closed">
              <path className="shiba-line" d="M11.6 24.6 Q13.4 26.4 15.2 24.6" />
              <path className="shiba-line" d="M22.8 24.6 Q24.6 26.4 26.4 24.6" />
            </g>

            {/* ᴥ: the nose, then the mouth hanging off it. */}
            <path className="shiba-nose" d="M17.1 27.2 H20.9 L19 29.2 Z" />
            <path className="shiba-tongue" d="M18.3 30.3 H21 V32.1 A1.35 1.35 0 0 1 18.3 32.1 Z" />
            <path
              className="shiba-line shiba-mouth"
              d="M19 29.2 V30 M15.8 29.6 Q17.4 31.8 19 30 Q20.6 31.8 22.2 29.6"
            />
          </g>
        </g>

        <g className="shiba-z">
          <path className="shiba-z1" d="M32 5 L36 5 L32 9 L36 9" />
          <path className="shiba-z2" d="M34 3 L37 3 L34 6 L37 6" />
          <path className="shiba-z3" d="M36 1 L38.5 1 L36 3.5 L38.5 3.5" />
        </g>
      </svg>
    </span>
  );
}
