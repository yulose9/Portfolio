"use client";

import { useEffect } from "react";

const SRC = "/sounds/keycap.wav";

/** Quiet by design: a UI sound should sit under the page, not on top of it. */
const GAIN = 0.35;

/**
 * Per-press variation. A real keyboard never makes the same sound twice, and
 * one sample replayed identically is exactly what reads as a cheap effect.
 * Small enough to stay the same key, large enough that fast presses do not
 * machine-gun.
 */
const PITCH_JITTER = 0.04; // playbackRate 0.96–1.04
const GAIN_JITTER = 0.15; // ±15% loudness

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * The keycap click, for anything marked data-keycap: the tool badges, the
 * tabs and the portrait.
 *
 * One delegated listener instead of a handler per element, so marking a new
 * element is the whole job of opting it in.
 *
 * Web Audio rather than <audio>: the sample is decoded once and each press is
 * a fresh buffer source, so playback starts immediately and rapid presses
 * overlap the way real keys do instead of restarting one another.
 *
 * Sound starts on pointerdown — a key sounds as it bottoms out, not when it
 * is let go. Mouse and touch only: someone activating with the keyboard is
 * already hearing their own keyboard.
 */
export default function KeycapSounds() {
  useEffect(() => {
    let buffer: AudioBuffer | null = null;
    let ctx: AudioContext | null = null;
    let pending = false;
    let cancelled = false;
    let loading: Promise<void> | null = null;

    // On iOS, "ambient" follows the silent switch and mixes with whatever is
    // playing, instead of pausing the visitor's music for a click.
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = "ambient";

    /*
     * Fetched and decoded after the page settles, with an OfflineAudioContext:
     * decoding needs a context, but a real AudioContext created before any user
     * gesture starts suspended and logs a warning. An AudioBuffer is not tied
     * to the context that decoded it.
     */
    const load = () =>
      (loading ??= (async () => {
        try {
          const data = await (await fetch(SRC)).arrayBuffer();
          const decoded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
          if (!cancelled) buffer = decoded;
        } catch {
          /* no sound is a fine failure mode */
        }
      })());
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleHandle = idle(() => void load(), { timeout: 3000 } as never);

    const play = () => {
      if (!ctx || !buffer || ctx.state !== "running") return false;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * PITCH_JITTER;
      const gain = ctx.createGain();
      gain.gain.value = GAIN * (1 + (Math.random() * 2 - 1) * GAIN_JITTER);
      source.connect(gain).connect(ctx.destination);
      source.start();
      return true;
    };

    /** Creates or wakes the context. Only allowed inside a user gesture. */
    const unlock = () => {
      if (!ctx) {
        try {
          ctx = new AudioContext({ latencyHint: "interactive" });
        } catch {
          return;
        }
      }
      if (ctx.state === "suspended") void ctx.resume().then(flush);
    };

    /** Plays a press that was waiting on the context; true once it has. */
    const flush = () => {
      if (pending && play()) pending = false;
      return !pending;
    };

    const onPointerDown = (event: PointerEvent) => {
      // Any press starts the fetch if idle has not got to it yet: the next
      // keycap is then ready, 14 kB later.
      if (!buffer) void load();
      if (event.button !== 0) return; // not right-click, which opens a menu
      const target = event.target as Element | null;
      if (!target?.closest?.("[data-keycap]")) return;
      if (!ctx) {
        /*
         * The first press on the page. Constructing an AudioContext is a heavy
         * one-off, and done synchronously here it held the main thread long
         * enough that this very press started late — the key visibly lagged
         * the finger (153ms to bottom out against 90 on every later press).
         * Deferring past the next frame lets the press commit first; the
         * browser's user-activation window lasts seconds, so the context may
         * still start. Costs the first click one frame of sound latency.
         */
        pending = true;
        requestAnimationFrame(() =>
          window.setTimeout(() => {
            unlock();
            flush();
          }, 0)
        );
        return;
      }
      unlock();
      // A mouse press is a user gesture, so the context is running and this
      // plays at once. A touch press is not (it might become a scroll), so
      // the very first tap on a phone waits for pointerup to unlock audio.
      if (!play()) pending = true;
    };

    // Touch unlocks on release. resume() settles asynchronously, so the press
    // stays pending for its flush — but only briefly: a click that sounds a
    // quarter-second after the finger lifted is worse than none.
    const onPointerUp = () => {
      if (!pending) return;
      unlock();
      if (!flush()) window.setTimeout(() => (pending = false), 250);
    };
    const onPointerCancel = () => {
      pending = false;
    };

    // iOS Safari applies :active on touch only once a touchstart listener
    // exists on the page; without it the keycap never goes down on a phone.
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true, capture: true });
    document.addEventListener("pointercancel", onPointerCancel, { passive: true, capture: true });

    return () => {
      cancelled = true;
      cancelIdle(idleHandle);
      document.removeEventListener("touchstart", noop);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointerup", onPointerUp, { capture: true });
      document.removeEventListener("pointercancel", onPointerCancel, { capture: true });
      void ctx?.close();
    };
  }, []);

  return null;
}
