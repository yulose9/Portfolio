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
import BusinessCardStage, { loadTiltedCard } from "./BusinessCardStage";

export type Badge = NonNullable<Entry["lanyard"]>;
export type Card = NonNullable<Entry["card"]>;

/** The key a row's showcase (badge or card) is shown under, if it has one. */
export const showcaseKey = (entry: Entry | undefined) =>
  entry?.lanyard?.front ?? entry?.card?.front ?? null;

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
export const useShowcase = () => useContext(LanyardContext);

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
function usePreload(badges: Badge[], cards: Card[], room: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!room || (!badges.length && !cards.length)) return;
    let live = true;
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 600));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      const sources = [
        ...badges.flatMap((b) => [b.front, b.back, b.strap]),
        ...cards.flatMap((c) => [c.front, c.back]),
      ];
      const images = sources.map(
        (src) => {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
          return img.decode().catch(() => undefined);
        }
      );
      const modules = [
        ...(badges.length ? [loadLanyard()] : []),
        ...(cards.length ? [loadTiltedCard()] : []),
      ];
      Promise.all([...modules, ...images]).then(() => live && setReady(true));
    });
    return () => {
      live = false;
      cancel(handle as number);
    };
  }, [badges, cards, room]);
  return ready;
}

/**
 * Owns every row showcase on the index (ID badges and business cards), so
 * each is mounted once at page level, warm before the Work tab is even
 * opened, and one controller decides which is up.
 */
export function ShowcaseProvider({
  badges,
  cards,
  children,
}: {
  badges: Badge[];
  cards: Card[];
  children: React.ReactNode;
}) {
  const controller = useController();
  const room = useRoom();
  const ready = usePreload(badges, cards, room);

  /*
   * One scene for every badge. Only one is ever up, and each WebGL scene is
   * its own GPU context with its own buffers and shader compile, none of it
   * shareable; two IDs as two scenes doubled the start-up freeze. So the one
   * scene keeps the last badge it showed and swaps the faces and strap when a
   * different one is asked for (the images are already decoded, see
   * usePreload).
   */
  const activeBadge = badges.find((b) => b.front === controller.shown);
  const [lastBadge, setLastBadge] = useState<string | undefined>(undefined);
  if (activeBadge && activeBadge.front !== lastBadge) setLastBadge(activeBadge.front);
  const badge = activeBadge ?? badges.find((b) => b.front === lastBadge) ?? badges[0];

  return (
    <LanyardContext.Provider value={controller}>
      {children}
      {ready && room && badge
        ? (
            <Stage
              badge={badge}
              shown={activeBadge !== undefined}
              onEnter={controller.engage}
              onLeave={controller.disengage}
            />
          )
        : null}
      {ready && room
        ? cards.map((card) => (
            <BusinessCardStage
              key={card.front}
              card={card}
              shown={controller.shown === card.front}
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
 * top edge so it reads as hanging from the browser's own chrome. Each time it
 * comes up it is dropped from above the frame by the simulation itself, while
 * CSS (.lanyard-stage.is-shown) dissolves it out of a blur; hiding is the
 * dissolve alone.
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
  // A new drop each time it comes up, and each time it switches to a
  // different badge while up (so going Trends -> FEAREX swaps the faces and
  // drops the new one in, rather than repainting a hanging card in place).
  const up = shown && painted;
  const [drop, setDrop] = useState(0);
  const [dropped, setDropped] = useState<string | null>(null);
  const want = up ? badge.front : null;
  if (want !== dropped) {
    setDropped(want);
    if (want) setDrop(drop + 1);
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
