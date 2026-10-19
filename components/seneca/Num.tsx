"use client";
import NumberFlow, { continuous, type Format } from "@number-flow/react";
import React from "react";

/**
 * Every number Seneca shows, rolled by NumberFlow: digits slide to their new
 * value instead of snapping, so a streak ticking up or a balance changing
 * reads as movement. Honours reduced motion; tabular so columns never jitter.
 */
export default function Num({
  value,
  format,
  prefix,
  suffix,
  className,
  spin = false,
}: {
  value: number;
  format?: Format;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Pass through in-between values (counting feel) — for small counts. */
  spin?: boolean;
}) {
  return (
    <NumberFlow
      value={Number.isFinite(value) ? value : 0}
      format={format}
      prefix={prefix}
      suffix={suffix}
      locales="en-PH"
      plugins={spin ? [continuous] : undefined}
      respectMotionPreference
      transformTiming={{ duration: 650, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      spinTiming={{ duration: 650, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      opacityTiming={{ duration: 280, easing: "ease-out" }}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    />
  );
}

/** ₱ amounts: whole pesos below ₱100k, compact (₱254.8K) above. */
export const pesoFormat = (value: number): Format =>
  Math.abs(value) >= 100_000
    ? { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }
    : { style: "currency", currency: "PHP", maximumFractionDigits: 0 };
