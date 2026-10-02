"use client";

import { X } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";

import { Button } from "../../components/kit/button";

/**
 * A side sheet (Details, Revisions) or a centred dialog (Publish), on Base UI's
 * Dialog for focus trapping, Escape and scroll lock. Motion lives in
 * admin.css, keyed off Base UI's data-starting-style / data-ending-style.
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
  return (
    <Dialog.Root open={open} disablePointerDismissal={!dismissible} onOpenChange={(next) => !next && dismissible && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" data-variant={variant} />
        <Dialog.Popup className={`sheet ${className}`} data-variant={variant} finalFocus={finalFocus}>
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
