"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";
import { Button } from "./button";

/*
 * Kobra's dialog: a white card with a hairline ring over a faint, lightly
 * blurred backdrop. It comes in from .96 on the site's ease-out and leaves
 * a little faster on an exit curve; a dialog opened over it steps the one
 * beneath back a few percent, so the stack has depth. Focus trap, Escape,
 * outside press and focus return are Base UI's.
 */

type Classy<T> = Omit<T, "className"> & { className?: string };

export const Dialog = BaseDialog.Root;
export const createDialogHandle = BaseDialog.createHandle;

/** The trigger. Unstyled by default; `render={<Button variant="outline" />}` gives it Kobra's look. */
export function DialogTrigger(props: ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="dialog-close" {...props} />;
}

export function DialogContent({
  className,
  children,
  size = "sm",
  showClose = true,
  ...props
}: Classy<ComponentProps<typeof BaseDialog.Popup>> & {
  /** Width from 640px up: 24, 28 or 32rem. */
  size?: "sm" | "md" | "lg";
  /** The × in the corner. */
  showClose?: boolean;
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop data-slot="dialog-overlay" className="kit-backdrop" />
      <BaseDialog.Popup data-slot="dialog-content" data-size={size} className={cn("kit-dialog", className)} {...props}>
        {children}
        {showClose ? (
          <BaseDialog.Close
            data-slot="dialog-close"
            className="kit-dialog-close"
            aria-label="Close"
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <CloseGlyph />
          </BaseDialog.Close>
        ) : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("kit-dialog-header", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("kit-dialog-footer", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: Classy<ComponentProps<typeof BaseDialog.Title>>) {
  return <BaseDialog.Title data-slot="dialog-title" className={cn("kit-dialog-title", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: Classy<ComponentProps<typeof BaseDialog.Description>>) {
  return <BaseDialog.Description data-slot="dialog-description" className={cn("kit-dialog-description", className)} {...props} />;
}

export function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
