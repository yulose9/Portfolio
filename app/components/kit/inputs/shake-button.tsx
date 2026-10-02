"use client";

import { useCallback, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";

import { cn } from "../../../lib/cn";
import { playSound } from "../../ui/sound";

/*
 * A button that shakes its head. When the press is refused (the form isn't
 * valid, the limit is reached) it shakes, sounds "blocked" and says why, so
 * a refusal is never silent. The shake is Kobra's input shake (`ki-shake`
 * in kit-inputs.css); with reduced motion it is a brief outline flash.
 *
 * `useShake` is the same thing for any element: a field, a chip, a card.
 */

export function useShake<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const shake = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("data-shake");
    // Reading layout restarts the animation when it is already running.
    void el.offsetWidth;
    el.setAttribute("data-shake", "");
    el.addEventListener("animationend", () => el.removeAttribute("data-shake"), { once: true });
  }, []);
  return { ref, shake };
}

export type ShakeButtonProps = Omit<ComponentProps<"button">, "onClick"> & {
  /** Return false (or a string, the reason) to refuse the press. */
  onPress: (e: MouseEvent<HTMLButtonElement>) => boolean | string | void | Promise<boolean | string | void>;
  variant?: "primary" | "outline" | "ghost";
  children: ReactNode;
};

export function ShakeButton({ onPress, variant = "primary", className, children, ...props }: ShakeButtonProps) {
  const { ref, shake } = useShake<HTMLButtonElement>();
  const [reason, setReason] = useState("");

  return (
    <>
      <button
        ref={ref}
        type="button"
        data-slot="shake-button"
        data-variant={variant}
        className={cn("ki-button ki-button-md ki-shakeable", className)}
        onClick={async (e) => {
          const result = await onPress(e);
          if (result === false || typeof result === "string") {
            shake();
            playSound("blocked");
            setReason(typeof result === "string" ? result : "");
          } else setReason("");
        }}
        {...props}
      >
        {children}
      </button>
      <span className="sr-only" role="alert">
        {reason}
      </span>
    </>
  );
}

export default ShakeButton;
