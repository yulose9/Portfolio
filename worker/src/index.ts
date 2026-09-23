import { DurableObject } from "cloudflare:workers";

export interface Env {
  CURSOR_ROOM: DurableObjectNamespace<CursorRoom>;
  /** Comma-separated origins allowed to open a socket. */
  ALLOWED_ORIGINS: string;
}

/* ---------------------------------------------------------------- limits -- */

/**
 * Everything below is a ceiling, not a target. A portfolio will never approach
 * any of them; they exist so that someone pointing a script at this endpoint
 * cannot turn it into a bill.
 */
const LIMITS = {
  /** Sockets per room. Beyond this, upgrades are refused. */
  MAX_CONNECTIONS: 64,
  /** Bytes. A position payload is ~40; anything larger is not one. */
  MAX_MESSAGE_BYTES: 256,
  /** Sustained messages per second per socket. The client sends 20. */
  RATE_PER_SEC: 30,
  /** Burst allowance, so a brief flurry is not punished. */
  RATE_BURST: 45,
  /** Strikes before the socket is closed rather than the message dropped. */
  MAX_VIOLATIONS: 20,
} as const;

/** Close codes, for anything the client might want to distinguish. */
const CLOSE = {
  ROOM_FULL: 4001,
  RATE_LIMITED: 4002,
  BAD_PAYLOAD: 4003,
} as const;

/* ------------------------------------------------------------- the room -- */

type Identity = { id: string; hue: number };

/** Per-socket counters. In memory on purpose — see the note in the class. */
type Meter = { tokens: number; last: number; violations: number };

export class CursorRoom extends DurableObject<Env> {
  /*
   * Rate-limit state is deliberately NOT persisted.
   *
   * Hibernation evicts this object from memory, which would lose these
   * counters — but hibernation only happens when no messages are arriving, and
   * a socket that has been silent long enough to hibernate has by definition
   * earned a full bucket. Persisting it would mean a storage write per message,
   * turning the cheapest part of this into the most expensive.
   */
  private meters = new WeakMap<WebSocket, Meter>();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    // Same-origin check. Not a security boundary on its own — Origin is
    // trivially forged outside a browser — but it stops the endpoint being
    // embedded by other sites, which is the realistic abuse.
    const origin = request.headers.get("Origin") ?? "";
    const allowed = this.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    if (!allowed.includes(origin)) {
      return new Response("Forbidden origin", { status: 403 });
    }

    if (this.ctx.getWebSockets().length >= LIMITS.MAX_CONNECTIONS) {
      return new Response("Room full", { status: 503 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    /*
     * acceptWebSocket, not server.accept().
     *
     * This is the single most consequential line for cost. A plain accept()
     * pins the object in memory and bills duration for as long as the socket
     * is open — for a page people leave in a background tab, that is the whole
     * session. Hibernation bills only while a handler is actually running.
     */
    this.ctx.acceptWebSocket(server);

    // Identity is assigned here and never accepted from the client, so a peer
    // cannot impersonate another or inject anything into what others render.
    const identity: Identity = {
      id: crypto.randomUUID().slice(0, 8),
      hue: Math.floor(Math.random() * 360),
    };
    // Survives hibernation, unlike anything held in a field.
    server.serializeAttachment(identity);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string" || raw.length > LIMITS.MAX_MESSAGE_BYTES) {
      this.strike(ws, CLOSE.BAD_PAYLOAD);
      return;
    }

    if (!this.allow(ws)) return;

    const point = parsePoint(raw);
    if (!point) {
      this.strike(ws, CLOSE.BAD_PAYLOAD);
      return;
    }

    const self = ws.deserializeAttachment() as Identity | null;
    if (!self) return;

    // Re-encoded from validated numbers rather than forwarding the client's
    // string, so nothing a peer sent can reach another peer verbatim.
    const payload = JSON.stringify({
      t: "m",
      i: self.id,
      h: self.hue,
      x: point.x,
      y: point.y,
    });

    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      // Outgoing messages are not billed, so the fan-out itself is free.
      try {
        peer.send(payload);
      } catch {
        // A peer that has gone away will be cleaned up by webSocketClose.
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.announceDeparture(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.announceDeparture(ws);
  }

  private announceDeparture(ws: WebSocket) {
    const self = ws.deserializeAttachment() as Identity | null;
    if (!self) return;
    const payload = JSON.stringify({ t: "l", i: self.id });
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      try {
        peer.send(payload);
      } catch {
        /* ignore */
      }
    }
  }

  /** Token bucket. Returns false when the message should be dropped. */
  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    let meter = this.meters.get(ws);
    if (!meter) {
      meter = { tokens: LIMITS.RATE_BURST, last: now, violations: 0 };
      this.meters.set(ws, meter);
    }

    meter.tokens = Math.min(
      LIMITS.RATE_BURST,
      meter.tokens + ((now - meter.last) / 1000) * LIMITS.RATE_PER_SEC
    );
    meter.last = now;

    if (meter.tokens < 1) {
      // Drop first, disconnect only if it keeps happening. A brief overrun is
      // a slow frame; a sustained one is a script.
      meter.violations += 1;
      if (meter.violations > LIMITS.MAX_VIOLATIONS) {
        ws.close(CLOSE.RATE_LIMITED, "rate limited");
      }
      return false;
    }

    meter.tokens -= 1;
    return true;
  }

  private strike(ws: WebSocket, code: number) {
    const meter = this.meters.get(ws);
    if (meter) meter.violations += 1;
    // Malformed input is never accidental in a browser client, so it is
    // treated less patiently than a rate overrun.
    if (!meter || meter.violations > 3) ws.close(code, "invalid payload");
  }
}

/* ------------------------------------------------------------- helpers -- */

/**
 * Accepts only `{"x":<0..1>,"y":<0..1>}` and returns clamped, rounded numbers.
 *
 * Rounding to three decimals is both a precision cap and a sanitiser: whatever
 * arrives, what leaves is a small finite number. NaN and Infinity are rejected
 * by the isFinite check rather than being allowed to poison a peer's renderer.
 */
function parsePoint(raw: string): { x: number; y: number } | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;
  const { x, y } = data as Record<string, unknown>;
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const clamp = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  return { x: clamp(x), y: clamp(y) };
}

/* -------------------------------------------------------------- worker -- */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/cursors") {
      return new Response("Not found", { status: 404 });
    }

    // One room for the whole site. idFromName is deterministic, so every
    // visitor reaches the same object without any coordination.
    const id = env.CURSOR_ROOM.idFromName("portfolio");
    return env.CURSOR_ROOM.get(id).fetch(request);
  },
};
