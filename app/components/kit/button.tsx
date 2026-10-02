"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";
import { Spinner } from "./spinner";

/*
 * Kobra's button: a lit surface (kit.css's t-surface, painted on ::before)
 * that gives a little under the press, with a busy and a done face that turn
 * over in place of the label. Built on Base UI's Button, so a `render`
 * element (a link, say) keeps button semantics and keyboard behaviour.
 */

export type ButtonVariant = "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const SURFACE: Record<ButtonVariant, string | null> = {
  default: "t-surface t-surface-primary",
  secondary: "t-surface t-surface-secondary",
  outline: "t-surface t-surface-outline",
  destructive: "t-surface t-surface-destructive",
  ghost: null,
  link: null,
};

/**
 * The button's classes on their own, for an element that should look like a
 * button without being this component (a toast's action, a menu trigger).
 * Pair it with `data-variant` and `data-size` attributes of the same values:
 * the sizes and text colours key on those.
 */
export function buttonClassName(variant: ButtonVariant = "default", className?: string) {
  return cn("kit-button", SURFACE[variant], className);
}

export type ButtonProps = Omit<ComponentProps<typeof BaseButton>, "className"> & {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Turns the label over to a spinner. The button keeps its width and its
   * accessible name, is marked aria-busy, and ignores presses until it ends.
   */
  loading?: boolean;
  /** Turns the label over to a check that draws itself in. */
  success?: boolean;
};

export function Button({
  variant = "default",
  size = "default",
  loading,
  success,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  // Only buttons that can be busy or done carry the faces; the rest stay a plain label.
  const faced = loading !== undefined || success !== undefined;
  const busy = !!loading;
  const done = !busy && !!success;

  return (
    <BaseButton
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={faced ? busy : undefined}
      className={buttonClassName(variant, className)}
      onClick={(event) => {
        // A press while busy would submit twice; swallow it rather than disable,
        // which would drop focus and make the button skip in the tab order.
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {faced ? (
        <span className="kit-button-faces" data-busy={busy || undefined} data-done={done || undefined}>
          <span className="busy-face busy-label">{children}</span>
          <span aria-hidden="true" className="busy-face busy-spinner">
            <Spinner role="presentation" aria-label={undefined} />
          </span>
          <span aria-hidden="true" className="busy-face busy-done">
            <span className="t-success-check" data-state={done ? "in" : undefined}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </span>
        </span>
      ) : (
        children
      )}
    </BaseButton>
  );
}
