"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's switch. The thumb is not a circle that moves: it is a pill as wide
 * as the whole travel, clipped down to a circle (kit.css's t-toggle-thumb).
 * Switching slides the clip across, so the thumb travels without a transform
 * and without layout; hovering opens the clip a few pixels towards the far
 * side, so the thumb leans the way it would go. The track changes colour at
 * once, as Kobra's does, and the thumb carries the motion.
 */

export type SwitchProps = Omit<ComponentProps<typeof BaseSwitch.Root>, "className"> & { className?: string };

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root data-slot="switch" className={cn("kit-switch t-toggle peer", className)} {...props}>
      <BaseSwitch.Thumb data-slot="switch-thumb" aria-hidden="true" className="kit-switch-thumb t-toggle-thumb" />
    </BaseSwitch.Root>
  );
}
