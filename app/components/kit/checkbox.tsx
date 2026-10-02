"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import type { ComponentProps, CSSProperties } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's checkbox: a 16px box that fills as the tick draws itself in
 * (kit.css's t-check: the box colours in .15s, the stroke runs .35s on a
 * strong ease-out) and un-draws faster than it drew. The indicator stays
 * mounted so the stroke has somewhere to run back to.
 */

export type CheckboxProps = Omit<ComponentProps<typeof BaseCheckbox.Root>, "className"> & {
  className?: string;
};

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root data-slot="checkbox" data-shape="square" className={cn("kit-checkbox t-check peer", className)} {...props}>
      <BaseCheckbox.Indicator
        keepMounted
        data-slot="checkbox-indicator"
        className="kit-checkbox-indicator"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            <svg
              viewBox="-0.3 -0.3 11 8.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {state.indeterminate ? (
                <path d="M2 4h6.4" style={{ "--check-len": 7 } as CSSProperties} />
              ) : (
                <path d="M1 4L3.8 7L9.4 1" />
              )}
            </svg>
          </span>
        )}
      />
    </BaseCheckbox.Root>
  );
}
