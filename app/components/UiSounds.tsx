"use client";

import { useEffect } from "react";

/*
 * Two sounds:
 *  - keycap: a left press on anything marked data-keycap (the tool badges,
 *    the tabs, the portrait) — paired with the keycap press in globals.css.
 *  - mouse: every other mouse click, left or right, anywhere on the page.
 */
type SoundName = "keycap" | "mouse";

type Sound = {
  src: string;
  gain: number;
  /** Filled at decode: where the audible part starts and how long it runs. */
  offset: number;
  duration: number;
  buffer: AudioBuffer | null;
};

/*
 * Quiet by design: a UI sound should sit under the page, not on top of it.
 * The mouse click is a touch quieter: it fires on every click, where the
 * keycap only answers the three things built to be pressed.
 */
const SOUNDS: Record<SoundName, Sound> = {
  keycap: { src: "/sounds/keycap.wav", gain: 0.35, offset: 0, duration: 0, buffer: null },
  mouse: { src: "/sounds/mouse-click.mp3", gain: 0.3, offset: 0, duration: 0, buffer: null },
};

/**
 * Per-press variation. A real switch never makes the same sound twice, and
 * one sample replayed identically is exactly what reads as a cheap effect.
 */
const PITCH_JITTER = 0.04; // playbackRate 0.96–1.04
const GAIN_JITTER = 0.15; // ±15% loudness

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Finds the audible span of a decoded sample.
 *
 * The mouse click is an MP3, and MP3 encoders pad the start with silence —
 * this one does not make a sound until 86ms in, which played as-is would put
 * every click a very audible beat behind the finger. Trimming at decode time
 * means each press starts on the transient itself.
 */
function audibleSpan(buffer: AudioBuffer): { offset: number; duration: number } {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (!peak) return { offset: 0, duration: buffer.duration };
  let first = 0;
  while (first < data.length && Math.abs(data[first]) < peak * 0.02) first++;
  let last = data.length - 1;
  while (last > first && Math.abs(data[last]) < peak * 0.01) last--;
  // 1ms of lead-in so the transient's own attack is not clipped.
  const lead = Math.round(buffer.sampleRate * 0.001);
  const start = Math.max(0, first - lead);
  return {
    offset: start / buffer.sampleRate,
    duration: (last - start + 1) / buffer.sampleRate + 0.01,
  };
}

/**
 * Click sounds for the whole page, from one delegated listener.
 *
 * Web Audio rather than <audio>: each sample is decoded once and every press
 * is a fresh buffer source, so playback starts immediately and rapid clicks
 * overlap the way real switches do instead of restarting one another.
 *
 * Sounds start on pointerdown — a switch sounds as it closes, not when it is
 * let go. Keyboard activation is silent: that visitor is already hearing
 * their own keyboard.
 */
export default function UiSounds() {
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let pending: SoundName | null = null;
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
        const decoder = new OfflineAudioContext(1, 1, 44100);
        await Promise.all(
          Object.values(SOUNDS).map(async (sound) => {
            try {
              const data = await (await fetch(sound.src)).arrayBuffer();
              const buffer = await decoder.decodeAudioData(data);
              if (cancelled) return;
              Object.assign(sound, audibleSpan(buffer));
              sound.buffer = buffer;
            } catch {
              /* no sound is a fine failure mode */
            }
          })
        );
      })());
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleHandle = idle(() => void load(), { timeout: 3000 } as never);

    const play = (name: SoundName) => {
      const sound = SOUNDS[name];
      if (!ctx || !sound.buffer || ctx.state !== "running") return false;
      const source = ctx.createBufferSource();
      source.buffer = sound.buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * PITCH_JITTER;
      const gain = ctx.createGain();
      gain.gain.value = sound.gain * (1 + (Math.random() * 2 - 1) * GAIN_JITTER);
      source.connect(gain).connect(ctx.destination);
      source.start(0, sound.offset, sound.duration);
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
      if (pending && play(pending)) pending = null;
      return !pending;
    };

    /** Which sound a press should make, or none. */
    const soundFor = (event: PointerEvent): SoundName | null => {
      const target = event.target as Element | null;
      const onKeycap = !!target?.closest?.("[data-keycap]");
      // Left press on a key: the keycap, for mouse and touch alike.
      if (event.button === 0 && onKeycap) return "keycap";
      // Every other left or right click — but only from a mouse. A finger on
      // a phone is not a mouse click, and a click sound on every tap while
      // scrolling would be noise.
      if (event.pointerType === "mouse" && (event.button === 0 || event.button === 2)) {
        return "mouse";
      }
      return null;
    };

    const onPointerDown = (event: PointerEvent) => {
      // Any press starts the fetch if idle has not got to it yet.
      if (!SOUNDS.keycap.buffer) void load();
      const name = soundFor(event);
      if (!name) return;

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
        pending = name;
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
      if (!play(name)) pending = name;
    };

    // Touch unlocks on release. resume() settles asynchronously, so the press
    // stays pending for its flush — but only briefly: a click that sounds a
    // quarter-second after the finger lifted is worse than none.
    const onPointerUp = () => {
      if (!pending) return;
      unlock();
      if (!flush()) window.setTimeout(() => (pending = null), 250);
    };
    const onPointerCancel = () => {
      pending = null;
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
