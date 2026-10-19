// @ts-nocheck
"use client";
import React from "react";
import clsx from "clsx";

/** "Weather ............ View details" — every Home section opens with one. */
export function SectionHead({ title, action, onMore, moreLabel = "View details", id }) {
  return (
    <div className="sn-head">
      <h2 id={id}>{title}</h2>
      {action ?? (onMore && (
        <button type="button" className="sn-more" onClick={onMore}>
          {moreLabel}
        </button>
      ))}
    </div>
  );
}

/** An emoji object resting in a soft tile. */
export function Tile({ children, small = false, className, style }) {
  return (
    <span className={clsx("sn-tile", small && "sn-tile-sm", className)} style={style} aria-hidden="true">
      {children}
    </span>
  );
}

/** Animated check: icon cross-fades in with scale + blur (CSS in seneca-sunlit.css). */
export function Check({ checked, onToggle, label, sound }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="sn-check"
      data-sound={sound ?? (checked ? "toggleOff" : "check")}
      onClick={onToggle}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 7.4 5.8 10 11 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const pesoCompact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** ₱12,400 below ₱100k, ₱1.2M above — big numbers stay one line in small cards. */
export const formatPeso = (value = 0) => (Math.abs(value) >= 100_000 ? pesoCompact : peso).format(value);

/** Split "Umuulan 🌧️" into its words and its emoji. */
export const splitCondition = (condition = "") => {
  const match = condition.match(/^(.*?)\s*(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)\s*$/u);
  return match ? { label: match[1].trim(), emoji: match[2] } : { label: condition.trim(), emoji: "⛅" };
};

/** Which illustration a condition gets. */
export const weatherScene = (emoji = "") => {
  if (/[🌧⛈🌦]/u.test(emoji)) return "rain";
  if (/[☀🌤]/u.test(emoji)) return "sun";
  return "cloud";
};
