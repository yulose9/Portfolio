"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** The logical screen every demo is laid out on: an iPhone's 393 × 852 points. */
export const SCREEN = { width: 393, height: 852 } as const;

/*
 * A live demo inside a ring card. The demo is laid out at a real phone size
 * and scaled to whatever size the card is, so it reads the same on a laptop
 * and a phone. Pointer-downs stop here: inside a live screen, dragging means
 * using the demo (a slider, a list), not turning the ring.
 */
export default function PhoneDemo({
  label,
  autoFocus = false,
  onFocused,
  children,
}: {
  label: string;
  /** Move focus into the demo on mount (when it was opened from a button). */
  autoFocus?: boolean;
  onFocused?: () => void;
  children: React.ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!autoFocus) return;
    const first = host.current?.querySelector<HTMLElement>("input, button, [tabindex='0']");
    (first ?? host.current)?.focus({ preventScroll: true });
    onFocused?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / SCREEN.width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={host}
      className="phone-demo"
      role="group"
      aria-label={label}
      tabIndex={-1}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      // Arrow keys belong to the demo's slider and tabs, not the ring; Escape
      // still bubbles so it can close the demo.
      onKeyDown={(event) => {
        if (event.key !== "Escape") event.stopPropagation();
      }}
    >
      <div
        className="phone-demo-screen"
        style={{ width: SCREEN.width, height: SCREEN.height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
