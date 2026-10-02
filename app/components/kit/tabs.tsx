"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { createContext, useContext, type ComponentProps } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's sliding tabs: a pill-shaped well, and a white pill that slides to
 * the chosen tab on a strong ease-out (--tabs-duration, --tabs-ease).
 *
 * The pill carries its own copy of the labels, drawn in the active colour
 * and translated back by exactly as far as the pill travels, so they stay
 * put while the pill moves over them. The effect is that the active colour
 * is wiped across by the pill's edges, in step with it, instead of one label
 * fading down while another fades up. The copy is the list's own children
 * rendered a second time as inert spans, so it always matches.
 */

const Echo = createContext(false);

export type TabsProps = Omit<ComponentProps<typeof BaseTabs.Root>, "className"> & { className?: string };

export function Tabs({ className, ...props }: TabsProps) {
  return <BaseTabs.Root data-slot="tabs" className={cn("kit-tabs", className)} {...props} />;
}

export type TabsListProps = Omit<ComponentProps<typeof BaseTabs.List>, "className"> & { className?: string };

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <BaseTabs.List data-slot="tabs-list" className={cn("kit-tabs-list t-well", className)} {...props}>
      {children}
      <BaseTabs.Indicator data-slot="tabs-indicator" className="kit-tabs-indicator">
        <span className="kit-tabs-labels" aria-hidden="true" inert>
          <Echo.Provider value={true}>{children}</Echo.Provider>
        </span>
      </BaseTabs.Indicator>
    </BaseTabs.List>
  );
}

export type TabsTriggerProps = Omit<ComponentProps<typeof BaseTabs.Tab>, "className"> & { className?: string };

export function TabsTrigger({ className, children, ...props }: TabsTriggerProps) {
  const echo = useContext(Echo);
  // Inside the pill: the same box and label, but nothing to press or announce.
  if (echo) return <span className={cn("kit-tabs-trigger", className)}>{children}</span>;
  return (
    <BaseTabs.Tab data-slot="tabs-trigger" className={cn("kit-tabs-trigger", className)} {...props}>
      {children}
    </BaseTabs.Tab>
  );
}

export type TabsContentProps = Omit<ComponentProps<typeof BaseTabs.Panel>, "className"> & { className?: string };

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <BaseTabs.Panel data-slot="tabs-content" className={cn("kit-tabs-panel", className)} {...props} />;
}
