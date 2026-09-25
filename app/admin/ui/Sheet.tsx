"use client";

import { X } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";

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
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: "side" | "center";
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" data-variant={variant} />
        <Dialog.Popup className="sheet" data-variant={variant}>
          <header className="sheet-header">
            <div>
              <Dialog.Title className="sheet-title">{title}</Dialog.Title>
              {description ? <Dialog.Description className="sheet-description">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="admin-icon-button" aria-label="Close">
              <X size={14} weight="bold" />
            </Dialog.Close>
          </header>
          <div className="sheet-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
