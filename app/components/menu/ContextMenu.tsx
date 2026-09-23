"use client";

import { ContextMenu as Base } from "@base-ui/react/context-menu";
import type { ReactNode } from "react";
import { haptic } from "../../lib/haptics";

/**
 * The portfolio's context menu.
 *
 * Base UI supplies the behaviour that is genuinely hard — collision-aware
 * placement, roving focus, typeahead, submenu timing — and none of the looks.
 * Everything visual here is the page's own surface tokens, so the menu reads as
 * the same material as the row highlight and the tab pill rather than as a
 * component library dropped on top.
 */

export function Menu({
  trigger,
  children,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode;
  /** Fired as the menu opens, so callers can read the selection first. */
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Base.Root onOpenChange={onOpenChange}>
      {/*
        render={...} composes onto the caller's element instead of wrapping it
        in another div, which would break the row layouts this sits inside.
      */}
      <Base.Trigger render={<div className="contents" />}>{trigger}</Base.Trigger>
      <Base.Portal>
        <Base.Positioner className="menu-positioner" sideOffset={6}>
          <Base.Popup className="menu-popup">{children}</Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <Base.Item
      className="menu-item"
      onClick={() => {
        // Same acknowledgement every other control on the page gives.
        haptic();
        onClick();
      }}
    >
      {icon ? (
        <span className="menu-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </Base.Item>
  );
}

export function MenuSeparator() {
  return <Base.Separator className="menu-separator" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <Base.Group>
      <Base.GroupLabel className="menu-label">{children}</Base.GroupLabel>
    </Base.Group>
  );
}
