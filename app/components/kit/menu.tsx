"use client";

import { Menu } from "@base-ui/react/menu";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's dropdown menu: a white panel with a hairline ring and a soft drop
 * shadow, that tips in from the side it opens on (kit-popover: a slight
 * perspective tilt toward the trigger while it scales up from .94) and
 * drops straight out. Items highlight with a flat tint as the pointer or the
 * arrow keys reach them; checkbox items draw their tick in, radio items
 * spring their dot in, the same marks as the standalone controls.
 *
 * Keyboard, typeahead, submenus and focus return are Base UI's.
 */

type Classy<T> = Omit<T, "className"> & { className?: string };

export const DropdownMenu = Menu.Root;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuRadioGroup = Menu.RadioGroup;
export const DropdownMenuSub = Menu.SubmenuRoot;

/**
 * The trigger. Unstyled by default; give it a look with
 * `render={<Button variant="outline" />}`.
 */
export function DropdownMenuTrigger(props: ComponentProps<typeof Menu.Trigger>) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

type Placement = Pick<ComponentProps<typeof Menu.Positioner>, "side" | "align" | "sideOffset" | "alignOffset">;

export function DropdownMenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  ...props
}: Classy<ComponentProps<typeof Menu.Popup>> & Placement) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} className="kit-menu-positioner">
        <Menu.Popup data-slot="dropdown-menu-content" className={cn("kit-menu kit-popover", className)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: Classy<ComponentProps<typeof Menu.Item>> & {
  /** Lines the label up with items that have an icon or a mark. */
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={cn("kit-menu-item", className)}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: Classy<ComponentProps<typeof Menu.CheckboxItem>>) {
  return (
    <Menu.CheckboxItem data-slot="dropdown-menu-checkbox-item" data-checkable="" className={cn("kit-menu-item", className)} {...props}>
      {children}
      {/* Kept mounted so the tick can un-draw as well as draw. */}
      <Menu.CheckboxItemIndicator keepMounted className="kit-menu-indicator">
        <svg viewBox="-0.3 -0.3 11 8.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
          <path d="M1 4L3.8 7L9.4 1" />
        </svg>
      </Menu.CheckboxItemIndicator>
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: Classy<ComponentProps<typeof Menu.RadioItem>>) {
  return (
    <Menu.RadioItem data-slot="dropdown-menu-radio-item" data-checkable="" className={cn("kit-menu-item", className)} {...props}>
      {children}
      <Menu.RadioItemIndicator className="kit-menu-indicator">
        <span className="kit-menu-dot" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: Classy<ComponentProps<typeof Menu.GroupLabel>> & { inset?: boolean }) {
  return (
    <Menu.GroupLabel data-slot="dropdown-menu-label" data-inset={inset || undefined} className={cn("kit-menu-label", className)} {...props} />
  );
}

export function DropdownMenuSeparator({ className, ...props }: Classy<ComponentProps<typeof Menu.Separator>>) {
  return <Menu.Separator data-slot="dropdown-menu-separator" className={cn("kit-menu-separator", className)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("kit-menu-shortcut", className)} {...props} />;
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Classy<ComponentProps<typeof Menu.SubmenuTrigger>> & { inset?: boolean; children?: ReactNode }) {
  return (
    <Menu.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      className={cn("kit-menu-item", className)}
      {...props}
    >
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="kit-menu-chevron" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Menu.SubmenuTrigger>
  );
}

/** A submenu's panel: the same as the menu's, opening to the inline end. */
export function DropdownMenuSubContent(props: Parameters<typeof DropdownMenuContent>[0]) {
  return <DropdownMenuContent side="inline-end" align="start" sideOffset={2} alignOffset={-4} {...props} />;
}
