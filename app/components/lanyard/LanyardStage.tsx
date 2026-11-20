"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import type { Entry } from "../../site-content";

export type Badge = NonNullable<Entry["lanyard"]>;

const loadLanyard = () => import("./Lanyard");
const Lanyard = dynamic(loadLanyard, { ssr: false });

/** Same room the preview rail needs: a real pointer and a wide screen. */
const ROOM = "(hover: hover) and (pointer: fine) and (min-width: 1280px)";
const hasRoom = () => window.matchMedia(ROOM).matches;
const subscribeRoom = (onChange: () => void) => {
  const query = window.matchMedia(ROOM);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useRoom = () => useSyncExternalStore(subscribeRoom, hasRoom, () => false);

/** Time to cross from the row to the card before the badge gives up. */
const CROSSING_MS = 500;
/** Grace after the pointer leaves the card, so a slip off its edge is free. */
const RELEASE_MS = 250;

/*
 * Who decides whether the badge is up.
 *
 * The row and the card are two separate hover targets with empty page between
 * them, so "hovered" is a small state machine rather than a boolean:
 *  - pointing at a row with a badge shows it, any other row hides it at once;
 *  - leaving the list from that row starts a crossing window, and reaching the
 *    card inside it keeps the badge up for as long as the pointer stays on it
 *    (dragging included: the canvas captures the pointer while it is held);
 *  - leaving the card, or the window running out, lets go, and `release`
 *    hands the row's highlight back so it fades with the badge.
 */
type Controller = {
  shown: string | null;
  hoverRow: (key: string | null) => void;
  leaveList: (key: string, release: () => void) => void;
  engage: () => void;
  disengage: () => void;
};

const LanyardContext = createContext<Controller | null>(null);
export const useLanyard = () => useContext(LanyardContext);

function useController(): Controller {
  const [shown, setShown] = useState<string | null>(null);
  const onRow = useRef(false);
  const engaged = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const release = useRef<(() => void) | null>(null);

  const hide = useCallback(() => {
    setShown(null);
    release.current?.();
    release.current = null;
  }, []);

  const hoverRow = useCallback((key: string | null) => {
    clearTimeout(timer.current);
    onRow.current = key !== null;
    release.current = null;
    setShown(key);
  }, []);

  const leaveList = useCallback(
    (key: string, onRelease: () => void) => {
      clearTimeout(timer.current);
      onRow.current = false;
      release.current = onRelease;
      setShown(key);
      timer.current = setTimeout(() => {
        if (!engaged.current) hide();
      }, CROSSING_MS);
    },
    [hide]
  );

  const engage = useCallback(() => {
    engaged.current = true;
    clearTimeout(timer.current);
  }, []);

  const disengage = useCallback(() => {
    engaged.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!onRow.current && !engaged.current) hide();
    }, RELEASE_MS);
  }, [hide]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useMemo(
    () => ({ shown, hoverRow, leaveList, engage, disengage }),
    [shown, hoverRow, leaveList, engage, disengage]
  );
}

/*
 * Warm everything before anyone hovers: the three.js chunk, the three PNGs,
 * and then the WebGL scene itself (mounted hidden, so the shaders compile and
 * the textures upload off the hover path). Waits for the browser to go idle
 * after load so none of it competes with the page's own first paint.
 */
function usePreload(badges: Badge[], room: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!room || !badges.length) return;
    let live = true;
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 600));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      const images = badges.flatMap((b) => [b.front, b.back, b.strap]).map(
        (src) => {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
          return img.decode().catch(() => undefined);
        }
      );
      Promise.all([loadLanyard(), ...images]).then(() => live && setReady(true));
    });
    return () => {
      live = false;
      cancel(handle as number);
    };
  }, [badges, room]);
  return ready;
}

/**
 * Owns the badges for the whole index, so the scene is mounted once at page
 * level (warm before the Work tab is even opened) instead of per list.
 */
export function LanyardProvider({
  badges,
  children,
}: {
  badges: Badge[];
  children: React.ReactNode;
}) {
  const controller = useController();
  const room = useRoom();
  const ready = usePreload(badges, room);

  return (
    <LanyardContext.Provider value={controller}>
      {children}
      {ready && room
        ? badges.map((badge) => (
            <Stage
              key={badge.front}
              badge={badge}
              shown={controller.shown === badge.front}
              onEnter={controller.engage}
              onLeave={controller.disengage}
            />
          ))
        : null}
    </LanyardContext.Provider>
  );
}

/**
 * The hanging ID badge.
 *
 * Fixed to the strip right of the content column, its strap running off the
 * top edge so it reads as hanging from the browser's own chrome. Showing it is
 * CSS (.lanyard-stage.is-shown): lowered in on an overshooting curve, as if
 * the strap caught its weight, while it dissolves out of a blur. Hiding is the
 * dissolve alone, and it jumps back up only once invisible.
 *
 * Shown, it takes the pointer: drag it, throw it, click to flip, exactly as on
 * React Bits. Hidden, it lets every click through and the breeze stops, so the
 * physics settles and the render loop goes to sleep.
 */
function Stage({
  badge,
  shown,
  onEnter,
  onLeave,
}: {
  badge: Badge;
  shown: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  // Always paint the hidden state first so even the first hover has a drop.
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPainted(true))
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  // Every time it comes up it is dropped in afresh: bumping `drop` tells the
  // simulation to lift the card above the frame and let it fall (see
  // dropFromAbove in Lanyard.tsx). Counted during render, on the edge.
  const up = shown && painted;
  const [drop, setDrop] = useState(0);
  const [wasUp, setWasUp] = useState(false);
  if (up !== wasUp) {
    setWasUp(up);
    if (up) setDrop(drop + 1);
  }

  // Portalled to <body>: the tab panels animate with transforms, and a fixed
  // element inside a transformed ancestor is fixed to that ancestor instead.
  return createPortal(
    <div
      aria-hidden="true"
      className={`lanyard-stage fixed right-0 top-0 z-30 h-dvh ${
        up ? "is-shown" : ""
      }`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <Lanyard
        frontImage={badge.front}
        backImage={badge.back}
        strapImage={badge.strap}
        cardColor="#ffffff"
        strapColor="#0b3d20"
        finish="glossy"
        metal="silver"
        cornerRadius={0.3}
        strapWidth={0.9}
        size={0.46}
        anchor="center"
        breeze={shown ? 0.5 : 0}
        drop={drop}
        elasticity={0.72}
        interactive
        intro={false}
      />
    </div>,
    document.body
  );
}
