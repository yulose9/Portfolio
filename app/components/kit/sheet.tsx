"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";
import { Button } from "./button";
import { CloseGlyph } from "./dialog";

/*
 * Kobra's sheet: a dialog that lives against an edge. It slides in on the
 * drawer curve (fast away from the edge, a long settle) and slides back out
 * faster than it came, over the same backdrop as the dialog. Reduced motion
 * fades it in place. Modal behaviour is Base UI's Dialog.
 */

type Classy<T> = Omit<T, "className"> & { className?: string };

export const Sheet = BaseDialog.Root;

/** The trigger. Unstyled by default; `render={<Button variant="outline" />}` gives it Kobra's look. */
export function SheetTrigger(props: ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="sheet-close" {...props} />;
}

export function SheetContent({
  className,
  children,
  side = "right",
  showClose = true,
  ...props
}: Classy<ComponentProps<typeof BaseDialog.Popup>> & {
  side?: "top" | "right" | "bottom" | "left";
  showClose?: boolean;
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop data-slot="sheet-overlay" className="kit-backdrop" />
      <BaseDialog.Popup data-slot="sheet-content" data-side={side} className={cn("kit-sheet", className)} {...props}>
        {children}
        {showClose ? (
          <BaseDialog.Close
            data-slot="sheet-close"
            className="kit-sheet-close"
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

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("kit-sheet-header", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("kit-sheet-footer", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: Classy<ComponentProps<typeof BaseDialog.Title>>) {
  return <BaseDialog.Title data-slot="sheet-title" className={cn("kit-sheet-title", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: Classy<ComponentProps<typeof BaseDialog.Description>>) {
  return <BaseDialog.Description data-slot="sheet-description" className={cn("kit-sheet-description", className)} {...props} />;
}
