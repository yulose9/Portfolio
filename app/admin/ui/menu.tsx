"use client";

import { CaretRight } from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";

/*
 * Menu parts for the admin, on Base UI (the primitives shadcn's new menus are
 * built on) and in the site's own menu material (.menu-popup in globals.css).
 * Base UI's ContextMenu and Menu share these parts, so one list of items can
 * be a right-click menu, a "⋯" menu or a block-handle menu.
 */

export function MenuSurface({ children, side, align }: { children: React.ReactNode; side?: "top" | "bottom" | "left" | "right"; align?: "start" | "center" | "end" }) {
  return (
    <Menu.Portal>
      <Menu.Positioner className="menu-positioner" sideOffset={6} side={side} align={align} collisionPadding={8}>
        <Menu.Popup className="menu-popup admin-menu">{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function MItem({
  icon,
  children,
  keys,
  onSelect,
  danger,
  disabled,
  closeOnClick = true,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  keys?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  closeOnClick?: boolean;
}) {
  return (
    <Menu.Item className="menu-item" data-danger={danger || undefined} disabled={disabled} closeOnClick={closeOnClick} onClick={onSelect}>
      {icon ? (
        <span className="menu-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="menu-item-text">{children}</span>
      {keys ? <kbd className="menu-keys">{keys}</kbd> : null}
    </Menu.Item>
  );
}

export const MSep = () => <Menu.Separator className="menu-separator" />;

export function MLabel({ children }: { children: React.ReactNode }) {
  return (
    <Menu.Group>
      <Menu.GroupLabel className="menu-label">{children}</Menu.GroupLabel>
    </Menu.Group>
  );
}

export function MSub({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className="menu-item">
        {icon ? (
          <span className="menu-item-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="menu-item-text">{label}</span>
        <CaretRight size={12} weight="bold" className="menu-caret" aria-hidden="true" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner className="menu-positioner" sideOffset={-4} alignOffset={-4} collisionPadding={8}>
          <Menu.Popup className="menu-popup admin-menu">{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

/** ⌘ on Apple keyboards, Ctrl elsewhere, for shortcut hints. */
export const MOD = typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl ";
export const keys = (k: string) => k.replace("⌘", MOD).replace("⇧", MOD === "⌘" ? "⇧" : "Shift ");
