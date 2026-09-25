"use client";

import { CaretRight } from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { useEffect, useRef, useState } from "react";

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

/*
 * Submenus that don't vanish on the way to them.
 *
 * Base UI closes a hover-opened submenu the moment the pointer, on its way
 * over, pauses for 40ms or moves "slowly" (its safe triangle wants intent),
 * and neither can be turned off. A hand heading diagonally for "Turn into →
 * Quote" pauses all the time. So the open state is ours: a hover close is
 * only believed if, a beat later, the pointer is on neither the row nor the
 * submenu. Every other close (Esc, a click, another submenu opening) is
 * immediate.
 *
 * And it stays level with its row: a tall submenu that doesn't fit below
 * would flip to end-aligned and hang wholly above the row; shifting keeps it
 * beside the row it came from.
 */
const SUB_COLLISION = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const;
/** How long the pointer may rest off the row and the submenu before it closes. */
const HOVER_GRACE = 300;

/** The submenu the pointer is on its way to, if any: siblings don't open on hover meanwhile. */
let approaching: symbol | null = null;

/** Distance from a point to a rectangle (0 inside it). */
function distanceTo(r: DOMRect, x: number, y: number) {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

export function MSub({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const [me] = useState(() => Symbol(label));
  useEffect(() => () => pending.current?.(), []);

  /*
   * A hover close waits while the pointer is still closing in on the
   * submenu; it goes through once the pointer rests elsewhere for a beat or
   * heads away. That's intent read the way a person means it, whatever the
   * speed or the pauses.
   */
  const deferClose = () => {
    pending.current?.();
    let last = Infinity;
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove, true);
      pending.current = null;
      if (approaching === me) approaching = null;
    };
    const settle = () => {
      if (popup.current?.matches(":hover") || trigger.current?.matches(":hover")) return stop();
      stop();
      setOpen(false);
    };
    const onMove = (e: PointerEvent) => {
      const rect = popup.current?.getBoundingClientRect();
      if (!rect) return settle();
      const d = distanceTo(rect, e.clientX, e.clientY);
      if (d === 0) return stop(); // landed
      if (d > last + 2) return settle(); // turned away
      last = Math.min(last, d);
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, HOVER_GRACE);
    };
    window.addEventListener("pointermove", onMove, true);
    timer = window.setTimeout(settle, HOVER_GRACE);
    pending.current = stop;
    approaching = me;
  };

  const onOpenChange = (next: boolean, details: { reason: string }) => {
    // Crossing this row on the way to another submenu: not an intent to open it.
    if (next && details.reason === "trigger-hover" && approaching && approaching !== me) return;
    // Rows the pointer crosses get highlighted, and Base UI closes this for
    // them ("sibling-open"); while a hover close is already waiting, that waits too.
    if (!next && details.reason === "sibling-open" && pending.current) return;
    if (next || details.reason !== "trigger-hover") {
      pending.current?.();
      setOpen(next);
      return;
    }
    deferClose();
  };

  return (
    <Menu.SubmenuRoot open={open} onOpenChange={onOpenChange}>
      <Menu.SubmenuTrigger ref={trigger} className="menu-item">
        {icon ? (
          <span className="menu-item-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="menu-item-text">{label}</span>
        <CaretRight size={12} weight="bold" className="menu-caret" aria-hidden="true" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner className="menu-positioner" sideOffset={-4} alignOffset={-4} collisionPadding={8} collisionAvoidance={SUB_COLLISION}>
          <Menu.Popup
            ref={popup}
            className="menu-popup admin-menu"
            // Landing on it, or leaving it and coming back, cancels a pending close.
            onPointerEnter={() => pending.current?.()}
            onPointerLeave={deferClose}
          >
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

/** ⌘ on Apple keyboards, Ctrl elsewhere, for shortcut hints. */
export const MOD = typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl ";
/** Every modifier in a hint, for this keyboard: "⌘⇧P" is "Ctrl Shift P" on Windows. */
export const keys = (k: string) =>
  MOD === "⌘" ? k : k.replaceAll("⌘", "Ctrl ").replaceAll("⇧", "Shift ").replaceAll("⌥", "Alt ").replaceAll("↵", "Enter");
