"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, type ReactNode } from "react";
import { senecaFont } from "./font";
import { SCRIM_CLASS } from "./SenecaPortal";
import { useHoverSounds } from "./useHoverSounds";

/** A centered desktop workspace and a reachable bottom sheet on phones. */
export default function ResponsiveDialog({ open, onClose, label, children, className = "", backdropClassName = SCRIM_CLASS, zIndex = 60 }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  zIndex?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const remember = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a, [role="button"]') : null;
      if (target) opener.current = target;
    };
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("keydown", remember, true);
    return () => { document.removeEventListener("pointerdown", remember, true); document.removeEventListener("keydown", remember, true); };
  }, [open]);
  useHoverSounds(panel, open);
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <Dialog.Portal className={`seneca-root sn-portal ${senecaFont.variable}`}>
      <Dialog.Backdrop className={`${backdropClassName} sn-dialog-backdrop`} style={{ zIndex }} />
      <Dialog.Popup ref={panel} finalFocus={() => opener.current?.isConnected ? opener.current : true} className={`${className} sn-responsive-dialog`} style={{ zIndex }}>
        <Dialog.Title className="sr-only">{label}</Dialog.Title>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
