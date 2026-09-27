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
  className,
}: {
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  keys?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  closeOnClick?: boolean;
}) {
  return (
    <Menu.Item className={className ? `menu-item ${className}` : "menu-item"} data-danger={danger || undefined} disabled={disabled} closeOnClick={closeOnClick} onClick={onSelect}>
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

/* Click-open submenus stay put while crossing the gap or using touch. */
export function MSub({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return <Menu.SubmenuRoot>
    <Menu.SubmenuTrigger className="menu-item" openOnHover={false}>
      {icon ? <span className="menu-item-icon" aria-hidden="true">{icon}</span> : null}
      <span className="menu-item-text">{label}</span><CaretRight size={12} className="menu-caret" aria-hidden="true" />
    </Menu.SubmenuTrigger>
    <Menu.Portal><Menu.Positioner className="menu-positioner" side="right" align="start" sideOffset={2} collisionPadding={12}>
      <Menu.Popup className="menu-popup admin-menu">{children}</Menu.Popup>
    </Menu.Positioner></Menu.Portal>
  </Menu.SubmenuRoot>;
}

/** ⌘ on Apple keyboards, Ctrl elsewhere, for shortcut hints. */
export const MOD = typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl ";
/** Every modifier in a hint, for this keyboard: "⌘⇧P" is "Ctrl Shift P" on Windows. */
export const keys = (k: string) =>
  MOD === "⌘" ? k : k.replaceAll("⌘", "Ctrl ").replaceAll("⇧", "Shift ").replaceAll("⌥", "Alt ").replaceAll("↵", "Enter");
