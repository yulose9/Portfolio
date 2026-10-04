"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type KbdSize = "sm" | "md" | "lg" | "xl";
export type KbdVariant = "default" | "outline" | "subtle" | "plain";

export interface KbdProps extends ComponentPropsWithoutRef<"kbd"> {
  /**
   * Visual size of the keyboard key cap.
   * - `sm`: 20px tall, compact (for tooltips, table rows, inline menus)
   * - `md`: 22px tall (default for toolbars and command palettes)
   * - `lg`: 24px tall (for headers and forms)
   * - `xl`: 28px tall (for featured shortcut cards, hero states, modal dialogs)
   */
  size?: KbdSize;
  /**
   * Surface variant of the key cap.
   * - `default`: Raised keycap with authentic subtle bevel and depth
   * - `outline`: Clean flat border without bottom bevel
   * - `subtle`: Ultra low-contrast wash (great for saturated backgrounds)
   * - `plain`: Borderless inline badge
   */
  variant?: KbdVariant;
  children?: ReactNode;
}

/**
 * Kobra Kbd: Keyboard input and shortcut hints component.
 *
 * Implements Kobra's exact design language (https://kobra.systems/components/kbd)
 * with tactile keycap bevels, dark/light token integration, optical alignment,
 * and seamless contextual adaptation inside tooltips and dropdown menus.
 */
export function Kbd({
  size = "sm",
  variant = "default",
  className,
  children,
  ...props
}: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      data-size={size}
      data-variant={variant}
      className={cn(
        "kit-kbd pointer-events-none inline-flex w-fit items-center justify-center font-mono font-medium select-none text-center",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

export interface KbdGroupProps extends ComponentPropsWithoutRef<"kbd"> {
  children?: ReactNode;
  /** Spacing between keycaps */
  gap?: "tight" | "normal" | "loose";
}

/**
 * KbdGroup: Arranges shortcut key chords (e.g. ⌘ + K or Ctrl + Shift + P).
 */
export function KbdGroup({
  gap = "normal",
  className,
  children,
  ...props
}: KbdGroupProps) {
  return (
    <kbd
      data-slot="kbd-group"
      data-gap={gap}
      className={cn(
        "kit-kbd-group inline-flex items-center select-none",
        gap === "tight" ? "gap-0.5" : gap === "loose" ? "gap-1.5" : "gap-1",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

/**
 * Maps standard symbols to their canonical glyphs or accessible text.
 */
export function normalizeKey(key: string): string {
  const trimmed = key.trim();
  switch (trimmed.toLowerCase()) {
    case "mod":
    case "cmd":
    case "command":
      return "⌘";
    case "shift":
      return "⇧";
    case "alt":
    case "option":
      return "⌥";
    case "ctrl":
    case "control":
      return "Ctrl";
    case "enter":
    case "return":
      return "↵";
    case "backspace":
    case "delete":
      return "⌫";
    case "escape":
    case "esc":
      return "Esc";
    case "space":
      return "Space";
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    case "tab":
      return "⇥";
    default:
      return trimmed;
  }
}

export interface ShortcutProps extends Omit<KbdProps, "children"> {
  /**
   * The shortcut keys to display.
   * Can be a string like "⌘K", "Ctrl+Shift+P", "Esc", or an array of keys.
   */
  keys: string | string[];
}

/**
 * Helper component that parses shortcut expressions and renders them as
 * individual Kobra Kbd keycaps inside a KbdGroup.
 */
export function Shortcut({ keys, size = "sm", variant = "default", className, ...props }: ShortcutProps) {
  let keyList: string[] = [];
  if (Array.isArray(keys)) {
    keyList = keys.map(normalizeKey);
  } else if (typeof keys === "string") {
    // If it contains plus signs (e.g. "Ctrl+Shift+P" or "Mod+K")
    if (keys.includes("+")) {
      keyList = keys.split("+").map(normalizeKey);
    } else if (keys.length > 1 && !["esc", "tab", "enter", "space", "del"].includes(keys.toLowerCase())) {
      // Split glyphs if it's like "⌘K" or "⌥⇧B"
      keyList = Array.from(keys).map(normalizeKey);
    } else {
      keyList = [normalizeKey(keys)];
    }
  }

  if (keyList.length === 1) {
    return (
      <Kbd size={size} variant={variant} className={className} {...props}>
        {keyList[0]}
      </Kbd>
    );
  }

  return (
    <KbdGroup className={className}>
      {keyList.map((k, index) => (
        <Kbd key={index} size={size} variant={variant} {...props}>
          {k}
        </Kbd>
      ))}
    </KbdGroup>
  );
}
