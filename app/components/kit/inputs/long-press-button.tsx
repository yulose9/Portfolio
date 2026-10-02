"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { haptic } from "../../../lib/haptics";
import { cn } from "../../../lib/cn";
import { playSound } from "../../ui/sound";

/*
 * Hold to confirm, for the things that can't be undone. The fill crosses the
 * button while it is held and the action runs only when it reaches the end;
 * let go early and it drains back. It replaces a confirm dialog for a single
 * destructive act: the hold *is* the second thought, and there is no dialog
 * to click through on reflex.
 *
 * The keyboard holds too: Space or Enter, held. A plain press (mouse or key)
 * that lets go at once explains itself instead of doing nothing silently.
 *
 * The sound is the press's tap, and the destructive cue only when it fires:
 * `data-sound="tap"` keeps the sound layer from sounding "destructive" on
 * every press that might yet be let go.
 */

export type LongPressButtonProps = {
  onConfirm: () => void;
  children: ReactNode;
  /** How long to hold, in ms. */
  duration?: number;
  /** Shown while held, e.g. "Keep holding…". */
  holdingLabel?: ReactNode;
  variant?: "destructive" | "primary" | "outline";
  disabled?: boolean;
  className?: string;
};

type State = "idle" | "holding" | "done" | "hint";

export function LongPressButton({
  onConfirm,
  children,
  duration = 1200,
  holdingLabel = "Keep holding…",
  variant = "destructive",
  disabled,
  className,
}: LongPressButtonProps) {
  const id = useId();
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const started = useRef(0);
  // A ref, not the state: pointerup and lostpointercapture both arrive in the
  // same render, and only the first may end the hold.
  const held = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const begin = () => {
    if (disabled || held.current) return;
    held.current = true;
    clearTimeout(timer.current);
    started.current = performance.now();
    setState("holding");
    timer.current = setTimeout(() => {
      held.current = false;
      setState("done");
      playSound("destructive");
      onConfirm();
      timer.current = setTimeout(() => setState("idle"), 900);
    }, duration);
  };

  const end = () => {
    if (!held.current) return;
    held.current = false;
    clearTimeout(timer.current);
    // A tap, not a hold: say what it takes rather than drain silently.
    const tapped = performance.now() - started.current < Math.min(300, duration / 3);
    setState(tapped ? "hint" : "idle");
    if (tapped) timer.current = setTimeout(() => setState("idle"), 1600);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      begin();
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      end();
    }
  };

  const seconds = duration / 1000;
  return (
    <>
      <button
        type="button"
        data-slot="long-press-button"
        data-sound="tap"
        data-variant={variant}
        data-state={state}
        disabled={disabled}
        aria-describedby={`${id}-how`}
        className={cn("ki-button ki-button-md ki-long-press", className)}
        style={{ "--hold": `${duration}ms` } as CSSProperties}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          haptic();
          begin();
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={end}
        // The press is the pointer/key handlers; a click on its own does nothing.
        onClick={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="ki-long-press-fill" aria-hidden="true" />
        <span className="ki-long-press-label">{state === "holding" ? holdingLabel : state === "hint" ? "Press and hold" : children}</span>
      </button>
      <span id={`${id}-how`} className="sr-only">
        Press and hold for {seconds} {seconds === 1 ? "second" : "seconds"} to confirm.
      </span>
      <span className="sr-only" role="status">
        {state === "done" ? "Done." : ""}
      </span>
    </>
  );
}

export default LongPressButton;
