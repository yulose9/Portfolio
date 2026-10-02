"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactElement, ReactNode } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's tooltip: a small dark label (foreground on background, inverted),
 * that scales in from its anchor and is instant when moving between
 * tooltips in quick succession, as Base UI's provider arranges.
 *
 * Two shapes:
 *   <Tooltip content="Save"><button …/></Tooltip>        one trigger, one tip
 *   const tips = createTooltipHandle()                   a row of triggers
 *   <TooltipTrigger handle={tips} payload="Search">…     sharing one tip that
 *   <GlidingTooltip handle={tips} />                     glides between them
 */

export const TooltipProvider = BaseTooltip.Provider;
export const createTooltipHandle = BaseTooltip.createHandle<ReactNode>;

type Side = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

export function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  delay,
  className,
  ...props
}: Omit<ComponentProps<typeof BaseTooltip.Root>, "children"> & {
  /** What the tip says. */
  content: ReactNode;
  /** The trigger: one element, which receives the trigger's props. */
  children: ReactElement;
  side?: Side;
  sideOffset?: number;
  /** Hover delay in ms before it opens. */
  delay?: number;
  className?: string;
}) {
  return (
    <BaseTooltip.Root {...props}>
      <BaseTooltip.Trigger data-slot="tooltip-trigger" delay={delay} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={sideOffset} className="kit-tooltip-positioner">
          <BaseTooltip.Popup data-slot="tooltip-content" className={cn("kit-tooltip", className)}>
            {content}
            <BaseTooltip.Arrow className="kit-tooltip-arrow" />
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

/** A trigger for a shared tooltip; its `payload` is what the tip says while it is the anchor. */
export function TooltipTrigger(props: ComponentProps<typeof BaseTooltip.Trigger>) {
  return <BaseTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * One tooltip for every trigger sharing `handle`. Moving from one trigger
 * to the next slides it across and resizes it on the navtip curve, and the
 * new label comes in from the side the pointer travelled towards.
 */
export function GlidingTooltip({
  handle,
  side = "top",
  sideOffset = 8,
  className,
}: {
  handle: ReturnType<typeof createTooltipHandle>;
  side?: Side;
  sideOffset?: number;
  className?: string;
}) {
  return (
    <BaseTooltip.Root handle={handle}>
      {({ payload }) => (
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={side} sideOffset={sideOffset} className="kit-tooltip-positioner" data-glide="">
            <BaseTooltip.Popup data-slot="tooltip-content" data-glide="" className={cn("kit-tooltip", className)}>
              <BaseTooltip.Arrow className="kit-tooltip-arrow" />
              <BaseTooltip.Viewport className="kit-tooltip-viewport">{payload as ReactNode}</BaseTooltip.Viewport>
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      )}
    </BaseTooltip.Root>
  );
}
