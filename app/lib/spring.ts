/**
 * A damped harmonic oscillator, stepped per frame.
 *
 * Shared by the local cursor and the remote ones, and that sharing is the whole
 * trick for multiplayer: peer positions arrive over the network at 20Hz, which
 * on its own would look like teleporting. Feeding each one into a spring turns
 * chunky network updates into 60fps motion, and makes a remote cursor move with
 * exactly the same weight as the local one.
 */
export type Spring = { value: number; velocity: number };

export function makeSpring(value = 0): Spring {
  return { value, velocity: 0 };
}

/**
 * @param dt seconds since the last step. Clamp it before calling: a
 *   backgrounded tab resumes with a huge delta and would fling the spring.
 */
export function advance(
  spring: Spring,
  target: number,
  dt: number,
  stiffness: number,
  damping: number,
  mass = 1
): void {
  const force = -stiffness * (spring.value - target);
  const damper = -damping * spring.velocity;
  spring.velocity += ((force + damper) / mass) * dt;
  spring.value += spring.velocity * dt;
}

/** Largest single integration step. Stiff springs need it; see advanceStable. */
const MAX_STEP = 1 / 240;

/**
 * advance(), in sub-steps of at most 1/240s.
 *
 * Semi-implicit Euler goes unstable once damping × dt passes 2 — for the
 * pointer spring below that is any frame longer than ~14ms, which includes
 * every frame on a 60Hz screen. Unstepped, the cursor would not wobble, it
 * would fly off the page. Stepping at 240Hz keeps it exact at any refresh
 * rate, down to a struggling 30fps, for a handful of multiplies a frame.
 */
export function advanceStable(
  spring: Spring,
  target: number,
  dt: number,
  stiffness: number,
  damping: number
): void {
  const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) advance(spring, target, h, stiffness, damping);
}

/**
 * The local cursor: critically damped (damping = 2√stiffness), so it closes
 * the gap as fast as a spring can without overshooting.
 *
 * It trails a moving pointer by damping ÷ stiffness: ~28ms, about 30px at a
 * brisk 1000px/s. The old 400/45 was slightly overdamped and trailed by
 * 112ms — 110px behind at that speed — and crept the last pixels in over
 * half a second. This keeps the glide and loses the float.
 *
 * Needs advanceStable(): at this stiffness a plain per-frame step diverges.
 */
export const POINTER_SPRING = { stiffness: 5000, damping: 141 } as const;

/**
 * The soft spring the old cursor used, kept only to *steer* the arrow.
 *
 * Heading comes from velocity, and a tight spring's velocity follows every
 * jitter in the raw mouse input. Steering from this unseen, softer twin keeps
 * the arrow's turn exactly as smooth as it was while the position tracks
 * tightly.
 */
export const HEADING_SPRING = { stiffness: 400, damping: 45 } as const;

/**
 * Remote cursors, deliberately softer. Their input is already a quantised
 * 20Hz sample, so a stiffer spring would faithfully reproduce the stepping.
 * A looser one reads the samples as a path rather than a sequence of points.
 */
export const PEER_SPRING = { stiffness: 220, damping: 34 } as const;

export const ROTATION_SPRING = { stiffness: 300, damping: 60 } as const;

/* ------------------------------------------------------------ heading -- */

/** Below this speed (px/ms) the direction of travel is noise; hold the angle. */
const MIN_HEADING_SPEED = 0.08;

/**
 * Which way an arrow cursor points: the direction of travel, sprung, so a turn
 * sweeps round rather than snapping.
 *
 * `turns` tracks whole revolutions so the target can be unwrapped — crossing
 * 180deg takes the short way round instead of spinning the arrow a full turn.
 */
export type Heading = { spring: Spring; target: number; turns: number };

export function makeHeading(): Heading {
  return { spring: makeSpring(0), target: 0, turns: 0 };
}

/** @param vx, vy the position springs' velocities, in px/s. */
export function steer(heading: Heading, vx: number, vy: number, dt: number): void {
  if (Math.hypot(vx, vy) / 1000 > MIN_HEADING_SPEED) {
    const angle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
    const delta = ((angle - (heading.target - heading.turns * 360) + 540) % 360) - 180;
    heading.target += delta;
    heading.turns = Math.round((heading.target - angle) / 360);
  }
  advance(
    heading.spring,
    heading.target,
    dt,
    ROTATION_SPRING.stiffness,
    ROTATION_SPRING.damping
  );
}
