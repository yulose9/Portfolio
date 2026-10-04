"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { X } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";

import { Button } from "../../components/kit/button";
import { Tooltip } from "../../components/kit/tooltip";

const STORAGE_KEY = "admin-right-sheet-width";

function readSavedWidth(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const num = parseInt(raw, 10);
    return Number.isFinite(num) && num >= 320 ? num : null;
  } catch {
    return null;
  }
}

/**
 * A side sheet (Details, Revisions, Research, Media) or a centred dialog (Publish), on Base UI's
 * Dialog for focus trapping, Escape and scroll lock. Motion lives in
 * admin.css, keyed off Base UI's data-starting-style / data-ending-style.
 *
 * When variant="side", the border between content and the sheet is an interactive
 * handle: hovering shows a Kobra tooltip ("Drag to resize · Click to collapse"),
 * dragging resizes the right sidebar, and clicking immediately collapses it.
 */
export default function Sheet({
  open,
  onClose,
  title,
  description,
  variant = "side",
  className = "",
  finalFocus,
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: "side" | "center";
  className?: string;
  finalFocus?: React.ComponentProps<typeof Dialog.Popup>["finalFocus"];
  /**
   * False for a choice that has to be made (recovering unsaved work): no ✕,
   * and Escape or a click outside does nothing, rather than a close button
   * that silently refuses.
   */
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(() => (variant === "side" ? readSavedWidth() : null));
  const [isResizing, setIsResizing] = useState(false);

  // Drag interaction tracking
  const dragRef = useRef<{
    startX: number;
    startWidth: number;
    pointerId: number;
    hasMoved: boolean;
    startTime: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const popup = popupRef.current;
    if (!popup) return;

    const startWidth = popup.getBoundingClientRect().width;
    dragRef.current = {
      startX: e.clientX,
      startWidth,
      pointerId: e.pointerId,
      hasMoved: false,
      startTime: Date.now(),
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const deltaX = drag.startX - e.clientX; // Dragging left expands the right sheet
    if (!drag.hasMoved && Math.abs(deltaX) > 3) {
      drag.hasMoved = true;
      setIsResizing(true);
      document.body.setAttribute("data-resizing-sheet", "true");
    }

    if (drag.hasMoved) {
      const minWidth = 320;
      const maxWidth = Math.max(minWidth, window.innerWidth - 24);
      const nextWidth = Math.max(minWidth, Math.min(drag.startWidth + deltaX, maxWidth));
      setWidth(nextWidth);
    }
  }, []);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const elapsed = Date.now() - drag.startTime;
    const hasMoved = drag.hasMoved;
    dragRef.current = null;
    setIsResizing(false);
    document.body.removeAttribute("data-resizing-sheet");

    if (!hasMoved && elapsed < 400 && dismissible) {
      // User cleanly clicked the border: collapse right sidebar
      onClose();
    } else if (hasMoved) {
      setWidth((cur) => {
        if (cur) {
          try {
            localStorage.setItem(STORAGE_KEY, String(Math.round(cur)));
          } catch {}
        }
        return cur;
      });
    }
  }, [dismissible, onClose]);

  const handlePointerCancel = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setIsResizing(false);
      document.body.removeAttribute("data-resizing-sheet");
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Reset to default CSS width
    setWidth(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (dismissible) onClose();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setWidth((prev) => {
        const cur = prev || (popupRef.current?.getBoundingClientRect().width ?? 400);
        const next = Math.min(cur + 24, window.innerWidth - 24);
        try { localStorage.setItem(STORAGE_KEY, String(Math.round(next))); } catch {}
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setWidth((prev) => {
        const cur = prev || (popupRef.current?.getBoundingClientRect().width ?? 400);
        const next = Math.max(cur - 24, 320);
        try { localStorage.setItem(STORAGE_KEY, String(Math.round(next))); } catch {}
        return next;
      });
    }
  }, [dismissible, onClose]);

  // Clean up body flag if component unmounts mid-drag
  useEffect(() => {
    return () => {
      document.body.removeAttribute("data-resizing-sheet");
    };
  }, []);

  const popupStyle: CSSProperties | undefined =
    variant === "side" && width
      ? {
          width: `${width}px`,
          maxWidth: "calc(100vw - 16px)",
        }
      : undefined;

  return (
    <Dialog.Root open={open} disablePointerDismissal={!dismissible} onOpenChange={(next) => !next && dismissible && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" data-variant={variant} />
        <Dialog.Popup
          ref={popupRef}
          className={`sheet ${className}`}
          data-variant={variant}
          data-resizing={isResizing ? "true" : undefined}
          style={popupStyle}
          finalFocus={finalFocus}
        >
          {variant === "side" && dismissible ? (
            <Tooltip content="Drag to resize · Click to collapse" side="left" sideOffset={8} delay={120}>
              <button
                type="button"
                role="separator"
                aria-orientation="vertical"
                aria-label="Sidebar border: Drag to resize · Click to collapse"
                className="sheet-resize-handle"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onDoubleClick={handleDoubleClick}
                onKeyDown={handleKeyDown}
              >
                <span className="sheet-resize-line" />
              </button>
            </Tooltip>
          ) : null}
          <header className="sheet-header">
            <div>
              <Dialog.Title className="sheet-title">{title}</Dialog.Title>
              {description ? <Dialog.Description className="sheet-description">{description}</Dialog.Description> : null}
            </div>
            {dismissible ? (
              <Dialog.Close data-slot="sheet-close" aria-label="Close" render={<Button variant="ghost" size="icon-sm" />}>
                <X size={14} weight="bold" />
              </Dialog.Close>
            ) : null}
          </header>
          <div className="sheet-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
