"use client";

import { Popover } from "@base-ui/react/popover";
import { Eyedropper } from "@phosphor-icons/react";
import { useId, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { cn } from "../../../lib/cn";
import { playSound } from "../../ui/sound";

/*
 * A colour picker in the manner of Kobra's and cult-ui's: a saturation area
 * with a hue rail (react-colorful, which the admin's text-colour popover
 * already ships), a hex field, a row of named swatches, and the system
 * eyedropper where the browser has one. HSL is shown beside the hex because
 * that is how people adjust a colour by hand ("a bit lighter"), and the field
 * accepts both.
 *
 * Values are always lower-case six-digit hex, the format cms/inline.ts stores.
 */

export type Swatch = string | { name: string; color: string };

const named = (s: Swatch) => (typeof s === "string" ? { name: s, color: s } : s);

/** The EyeDropper API (Chromium only, for now), detected without a hydration mismatch. */
function useEyeDropper() {
  return useSyncExternalStore(
    () => () => {},
    () => "EyeDropper" in window,
    () => false,
  );
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

export function toHsl(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function fromHsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => l / 100 - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** Any of #abc, #aabbcc or hsl(…) to #aabbcc; null when it is none of them. */
export function normalizeColor(input: string): string | null {
  const v = input.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return `#${h}`;
  }
  const hsl = /^hsl\(\s*(\d+(?:\.\d+)?)(?:deg)?[\s,]+(\d+(?:\.\d+)?)%[\s,]+(\d+(?:\.\d+)?)%\s*\)$/.exec(v);
  if (hsl) return fromHsl(Number(hsl[1]) % 360, Math.min(100, Number(hsl[2])), Math.min(100, Number(hsl[3])));
  return null;
}

export type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  /** Named presets. Plain strings are named by their own hex. */
  swatches?: readonly Swatch[];
  /** The control's accessible name, e.g. "Text color". */
  label?: string;
  className?: string;
};

/** The panel itself, for inline use or inside any popover. */
export function ColorPicker({ value, onChange, swatches = [], label = "Color", className }: ColorPickerProps) {
  const id = useId();
  const canPick = useEyeDropper();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<{ base: string; text: string } | null>(null);
  const hex = normalizeColor(value) ?? "#000000";
  const { h, s, l } = toHsl(hex);
  const hslText = `hsl(${h} ${s}% ${l}%)`;
  // A typed value only lives while the colour it was typed against does.
  const typed = draft && draft.base === hex ? draft.text : hslText;
  const [invalid, setInvalid] = useState(false);

  const list = swatches.map(named);
  const active = list.findIndex((sw) => normalizeColor(sw.color) === hex);

  const pick = async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) return;
    setPicking(true);
    try {
      const { sRGBHex } = await new Ctor().open();
      const next = normalizeColor(sRGBHex);
      if (next) onChange(next);
    } catch {
      // Escape closes the dropper with a rejection; that is a cancel, not an error.
    } finally {
      setPicking(false);
    }
  };

  const commitTyped = () => {
    if (!draft) return;
    const next = normalizeColor(draft.text);
    setInvalid(!next);
    if (next) {
      onChange(next);
      setDraft(null);
    } else playSound("blocked");
  };

  // Swatches are one tab stop with arrow keys between them, like a radio group.
  const onSwatchKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const from = active < 0 ? 0 : active;
    const to =
      e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (from + keys[e.key] + list.length) % list.length;
    onChange(normalizeColor(list[to].color) ?? hex);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    buttons[to]?.focus();
  };

  return (
    <div
      data-slot="color-picker"
      data-picking={picking || undefined}
      role="group"
      aria-label={label}
      className={cn("ki-color-picker", className)}
    >
      <HexColorPicker color={hex} onChange={(c) => onChange(c.toLowerCase())} className="ki-color-area" />

      <div className="ki-color-row">
        <span className="ki-color-preview" style={{ backgroundColor: hex }} aria-hidden="true" />
        <label className="ki-color-field" htmlFor={`${id}-hex`}>
          <span className="ki-color-field-label">Hex</span>
          <HexColorInput
            id={`${id}-hex`}
            color={hex}
            prefixed
            onChange={(c) => onChange(c.toLowerCase())}
            aria-label={`Hex ${label.toLowerCase()}`}
            spellCheck={false}
          />
        </label>
        {canPick ? (
          <button
            type="button"
            data-slot="color-picker-eyedropper"
            className="ki-icon-button"
            onClick={pick}
            aria-label="Pick a color from the screen"
            title="Pick from screen"
          >
            <Eyedropper size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <label className="ki-color-field ki-color-field-wide" htmlFor={`${id}-hsl`}>
        <span className="ki-color-field-label">HSL</span>
        <input
          id={`${id}-hsl`}
          value={typed}
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) => {
            setDraft({ base: hex, text: e.target.value });
            setInvalid(false);
          }}
          onBlur={commitTyped}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTyped();
            }
          }}
        />
      </label>
      {invalid ? (
        <p id={`${id}-error`} role="alert" className="ki-field-error">
          Enter a color such as hsl(210 40% 50%) or #52525b.
        </p>
      ) : null}

      {list.length ? (
        <div role="radiogroup" aria-label={`${label} presets`} className="ki-color-swatches" onKeyDown={onSwatchKeys}>
          {list.map((sw, i) => (
            <button
              key={sw.color}
              type="button"
              role="radio"
              aria-checked={i === active}
              aria-label={sw.name}
              title={sw.name}
              tabIndex={i === (active < 0 ? 0 : active) ? 0 : -1}
              data-slot="color-picker-swatch-option"
              className="ki-color-swatch"
              style={{ backgroundColor: sw.color }}
              onClick={() => onChange(normalizeColor(sw.color) ?? hex)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type ColorPickerPopoverProps = ColorPickerProps & {
  /** Replaces the default swatch-and-hex trigger. */
  children?: ReactNode;
  triggerClassName?: string;
};

/** A swatch button that opens the picker in a popover. */
export function ColorPickerPopover({ children, triggerClassName, ...props }: ColorPickerPopoverProps) {
  const label = props.label ?? "Color";
  return (
    <Popover.Root>
      <Popover.Trigger
        data-slot="color-picker-trigger"
        className={cn("ki-color-trigger", triggerClassName)}
        aria-label={children ? undefined : `${label}: ${props.value}`}
      >
        {children ?? (
          <>
            <span className="ki-color-preview" style={{ backgroundColor: props.value }} aria-hidden="true" />
            <span className="ki-color-trigger-text">{props.value}</span>
          </>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" collisionPadding={8} className="ki-positioner">
          <Popover.Popup className="ki-popup" data-lenis-prevent>
            <Popover.Title className="sr-only">{label}</Popover.Title>
            <ColorPicker {...props} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default ColorPicker;
