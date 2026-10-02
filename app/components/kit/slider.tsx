"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's slider, with its gooey thumb. The real thumb (Base UI's, holding
 * the range input) is transparent: it is the hit area and the focus target.
 * What you see is painted in an SVG layer under a goo filter, which blurs
 * the shapes and then cuts the blur back to a hard edge, so shapes near each
 * other melt together rather than overlap.
 *
 * Two shapes are painted: the thumb, exactly where the value is, and a
 * smaller drop that follows it on a spring. At rest the drop hides inside
 * the thumb. Drag quickly, or click far along the track, and the drop is
 * left behind for a moment, drawn out of the thumb like a bead of liquid,
 * then pulled back in. Reduced motion paints the thumb alone.
 */

const THUMB = 26;
const DROP = 7;
// How far the drop may trail; the filter region below is sized to hold it.
const REACH = 34;

export type SliderProps = Omit<ComponentProps<typeof BaseSlider.Root>, "className" | "value" | "defaultValue" | "onValueChange"> & {
  className?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number, details: BaseSlider.Root.ChangeEventDetails) => void;
  /** Labels the thumb's range input, when no visible label does. */
  "aria-label"?: string;
};

export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  // Held here as well as in Base UI: the painted thumb needs the value to place itself.
  const [inner, setInner] = useState(defaultValue ?? min);
  const current = value ?? inner;

  const control = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<{ x: number; y: number } | null>(null);

  const reduced = useReducedMotion();
  const follow = useSpring(0, { stiffness: 420, damping: 30, mass: 0.6 });
  const lead = useRef(0);
  const trail = useTransform(follow, (x) => Math.max(-REACH, Math.min(REACH, x - lead.current)));

  // Read where Base UI actually put the thumb, so alignment and RTL stay its business.
  useLayoutEffect(() => {
    const box = control.current;
    const knob = thumb.current;
    if (!box || !knob) return;

    const place = (jump: boolean) => {
      const outer = box.getBoundingClientRect();
      const inner = knob.getBoundingClientRect();
      if (outer.width === 0) return;
      const x = inner.left + inner.width / 2 - outer.left;
      const y = inner.top + inner.height / 2 - outer.top;
      lead.current = x;
      setGeometry({ x, y });
      if (jump) follow.jump(x);
      else follow.set(x);
    };

    place(geometry === null);
    // A resize moves the thumb without the value changing; nothing should trail.
    const observer = new ResizeObserver(() => place(true));
    observer.observe(box);
    return () => observer.disconnect();
    // geometry is read only to tell the first placement from the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, min, max, follow]);

  const id = useId().replace(/:/g, "");
  const filter = `kit-goo-${id}`;

  return (
    <BaseSlider.Root
      data-slot="slider"
      thumbAlignment="edge"
      min={min}
      max={max}
      value={current}
      onValueChange={(next, details) => {
        const number = Array.isArray(next) ? next[0] : next;
        setInner(number);
        onValueChange?.(number, details);
      }}
      className={cn("kit-slider", className)}
      {...props}
    >
      <BaseSlider.Control ref={control} className="kit-slider-control">
        <BaseSlider.Track data-slot="slider-track" className="kit-slider-track">
          <BaseSlider.Indicator data-slot="slider-range" className="kit-slider-range" />
        </BaseSlider.Track>

        <div className="kit-slider-goo" aria-hidden="true">
          <svg focusable="false">
            <defs>
              <filter
                id={filter}
                filterUnits="userSpaceOnUse"
                x={-REACH - THUMB}
                y={-THUMB * 1.75}
                width={(REACH + THUMB) * 2}
                height={THUMB * 3.5}
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
                <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 44 -17.83" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </defs>
            {geometry ? (
              <g transform={`translate(${geometry.x} ${geometry.y})`} filter={`url(#${filter})`} style={{ fill: "var(--primary)" }}>
                {reduced ? null : <motion.circle r={DROP} cx={0} cy={0} style={{ x: trail }} />}
                <circle className="kit-slider-blob" r={THUMB / 2} cx={0} cy={0} />
              </g>
            ) : null}
          </svg>
        </div>

        <BaseSlider.Thumb
          ref={thumb}
          data-slot="slider-thumb"
          getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
          className="kit-slider-thumb"
        />
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
