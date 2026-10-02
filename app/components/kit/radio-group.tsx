"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's radio: a 16px ring whose dot springs in from a quarter of its size
 * when chosen (radio-dot-in, .22s with a little overshoot). The dot mounts
 * with the choice, so the spring plays once per selection and leaving a
 * choice is instant, which is what lets the eye follow the new one.
 * Arrow keys move the choice, as Base UI's group handles them.
 */

export type RadioGroupProps = Omit<ComponentProps<typeof BaseRadioGroup>, "className"> & { className?: string };

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <BaseRadioGroup data-slot="radio-group" className={cn("kit-radio-group", className)} {...props} />;
}

export type RadioGroupItemProps = Omit<ComponentProps<typeof Radio.Root>, "className"> & { className?: string };

export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <Radio.Root data-slot="radio-group-item" className={cn("kit-radio peer", className)} {...props}>
      <Radio.Indicator data-slot="radio-group-indicator" className="kit-radio-indicator" />
    </Radio.Root>
  );
}
