"use client";

import { useEffect } from "react";
// Type-only, so it is erased at build and the library stays a lazy chunk.
import type ReconnectingWebSocket from "partysocket/ws";
import { cursorMarkup, cursorTransform, shapeAt, type CursorShape } from "../lib/cursor";
import {
  PEER_SPRING,
  advance,
  makeHeading,
  makeSpring,
  steer,
  type Heading,
  type Spring,
} from "../lib/spring";

/** Set to the deployed Worker, e.g. wss://portfolio-cursors.<name>.workers.dev/cursors */
const ENDPOINT = process.env.NEXT_PUBLIC_CURSORS_URL;

const POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";

/** 20Hz. Outgoing messages bill 20:1, so this is one billed request per second. */
const SEND_MS = 50;

/** Ignore sub-pixel jitter; no point paying to broadcast a stationary pointer. */
const MIN_DELTA = 0.002;

/** A peer that has said nothing for this long is treated as gone. */
const STALE_MS = 15_000;

/**
 * Close codes the server uses to say *stop*, rather than *try again*.
 *
 * Reconnecting after one of these would repeat whatever caused it, and every
 * attempt is a billed request — a rejected client retrying forever is the one
 * way this feature could actually cost money.
 */
const PERMANENT_CLOSE = new Set([4002, 4003]);

type Peer = {
  hue: number;
  x: Spring;
  y: Spring;
  targetX: number;
  targetY: number;
  heading: Heading;
  shape: CursorShape;
  seen: number;
  node: HTMLDivElement;
  /** The arrow's wrapper: the only part that turns with the heading. */
  spin: HTMLElement | null;
};

/**
 * Other people's cursors.
 *
 * Positions are normalised against the text column rather than the viewport, so
 * a cursor sits on the same *word* for everyone — otherwise someone on a 2560px
 * monitor would appear far off to the side of someone on a laptop.
 *
 * Nothing renders through React after mount. Peers arrive at 20Hz and move at
 * 60, so React state would mean a re-render per peer per frame for what is
 * ultimately one transform. The nodes are created on join, mutated in the RAF
 * loop, and removed on leave.
 *
 * Off entirely without a fine pointer: a touch visitor has no cursor to
 * broadcast, and would be paying for a connection they cannot participate in.
 */
export default function PeerCursors() {
  useEffect(() => {
    if (!ENDPOINT) return;

    const media = window.matchMedia(POINTER_QUERY);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!media.matches || calm.matches) return;

    const column = document.querySelector<HTMLElement>("[data-cursor-frame]");
    if (!column) return;

    const layer = document.createElement("div");
    layer.className = "peer-cursor-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    const peers = new Map<string, Peer>();
    let socket: ReconnectingWebSocket | null = null;
    let frame = 0;
    let idleHandle = 0;
    let disposed = false;

    let lastSent = 0;
    let lastX = -1;
    let lastY = -1;
    let pending: { x: number; y: number } | null = null;

    /* ------------------------------------------------------------ send -- */

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = column.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Relative to the column, so the same value lands on the same content
      // regardless of viewport width or how far the page is scrolled.
      pending = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    };

    const flush = (now: number) => {
      if (!socket || !pending || now - lastSent < SEND_MS) return;
      const { x, y } = pending;
      // Never queue: a stale position is worthless once a newer one exists, and
      // a pointer that has not moved is not worth a billed message.
      if (Math.abs(x - lastX) < MIN_DELTA && Math.abs(y - lastY) < MIN_DELTA) {
        return;
      }
      lastX = x;
      lastY = y;
      lastSent = now;
      try {
        socket.send(JSON.stringify({ x, y }));
      } catch {
        /* the socket will reconnect on its own */
      }
    };

    /* --------------------------------------------------------- receive -- */

    const spawn = (id: string, hue: number): Peer => {
      const node = document.createElement("div");
      node.className = "peer-cursor";
      node.style.color = `hsl(${hue} 65% 45%)`;
      node.dataset.shape = "arrow";
      // The local cursor's own glyphs, so a remote pointer reads as the same
      // kind of object — only the colour says whose it is. Static markup;
      // the hue is a server-assigned number, never text from a peer.
      node.innerHTML = cursorMarkup("currentColor");
      layer.appendChild(node);

      const peer: Peer = {
        hue,
        x: makeSpring(0),
        y: makeSpring(0),
        targetX: 0,
        targetY: 0,
        heading: makeHeading(),
        shape: "arrow",
        seen: performance.now(),
        node,
        spin: node.querySelector<HTMLElement>(".cursor-spin"),
      };
      peers.set(id, peer);
      return peer;
    };

    const onMessage = (raw: string) => {
      let data: { t?: string; i?: string; h?: number; x?: number; y?: number };
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }
      if (typeof data.i !== "string") return;

      if (data.t === "l") {
        peers.get(data.i)?.node.remove();
        peers.delete(data.i);
        return;
      }
      if (data.t !== "m") return;
      if (typeof data.x !== "number" || typeof data.y !== "number") return;

      const rect = column.getBoundingClientRect();
      const existing = peers.get(data.i);
      const peer =
        existing ?? spawn(data.i, typeof data.h === "number" ? data.h : 0);

      const px = rect.left + data.x * rect.width;
      const py = rect.top + data.y * rect.height;

      if (!existing) {
        // First sighting: place it outright, otherwise the spring would drag it
        // across the whole page from the top-left corner on the way in.
        peer.x.value = px;
        peer.y.value = py;
      }
      peer.targetX = px;
      peer.targetY = py;
      peer.seen = performance.now();

      // Hand, I-beam or arrow for whatever is under their pointer *here*, on
      // this page. Nothing about it is sent, so it costs no bandwidth, and it
      // stays right even if their layout differs. Hit-tested per update
      // (≤20Hz), not per frame.
      const next = shapeAt(px, py);
      if (next !== peer.shape) {
        peer.shape = next;
        peer.node.dataset.shape = next;
      }
      peer.node.style.opacity = "1";
    };

    /* ------------------------------------------------------------ loop -- */

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      flush(now);

      for (const [id, peer] of peers) {
        if (now - peer.seen > STALE_MS) {
          peer.node.remove();
          peers.delete(id);
          continue;
        }
        advance(peer.x, peer.targetX, dt, PEER_SPRING.stiffness, PEER_SPRING.damping);
        advance(peer.y, peer.targetY, dt, PEER_SPRING.stiffness, PEER_SPRING.damping);
        // Heading comes from the spring's velocity, not the network samples, so
        // it turns smoothly along the path instead of jumping at each update.
        steer(peer.heading, peer.x.velocity, peer.y.velocity, dt);
        peer.node.style.transform = cursorTransform(peer.x.value, peer.y.value);
        if (peer.spin) peer.spin.style.transform = `rotate(${peer.heading.spring.value}deg)`;
      }

      frame = requestAnimationFrame(tick);
    };

    /* --------------------------------------------------------- connect -- */

    const connect = async () => {
      if (disposed) return;
      // The /ws subpath, not the PartyKit client: this endpoint is a plain
      // Durable Object at a path I chose, not a PartyKit room, so what is
      // wanted is just the reconnecting-WebSocket half of the library.
      // Imported here rather than at module scope so it stays a lazy chunk.
      const { default: Socket } = await import("partysocket/ws");
      if (disposed) return;

      const ws = new Socket(ENDPOINT!, [], {
        // Positions are worthless the moment a newer one exists, so nothing is
        // held while offline to be flushed on reconnect.
        maxEnqueuedMessages: 0,
        minReconnectionDelay: 1000,
        maxReconnectionDelay: 30_000,
        // A room that is full refuses the upgrade outright. Backoff plus a
        // hard ceiling means a visitor who cannot get in gives up quietly
        // instead of knocking indefinitely.
        maxRetries: 10,
        shouldReconnectOnClose: (event) => !PERMANENT_CLOSE.has(event.code),
      });
      ws.addEventListener("message", (event) => onMessage(String(event.data)));
      socket = ws;

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    /*
     * Deferred to idle, like the analytics.
     *
     * This is a feature that does nothing at all unless a second person happens
     * to be on the page, so it has no business competing with first paint for
     * the common case where nobody is.
     */
    const schedule = window.requestIdleCallback ?? window.setTimeout;
    idleHandle = schedule(() => void connect(), { timeout: 4000 } as never);

    return () => {
      disposed = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(idleHandle);
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
      socket?.close();
      layer.remove();
    };
  }, []);

  return null;
}
