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

/** The local cursor: tight enough to feel attached to the pointer. */
export const POINTER_SPRING = { stiffness: 400, damping: 45 } as const;

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

/* ----------------------------------------------------------- hover grow -- */

/** Anything the cursor grows over, standing in for the native hand. */
export const INTERACTIVE = "a, button, [role='button'], input, textarea, select, summary";

export const HOVER_SCALE = 1.6;

/** Exponential approach, for scale: a spring's overshoot would read as a wobble. */
export function approach(current: number, target: number, dt: number): number {
  return current + (target - current) * Math.min(dt * 12, 1);
}

/** The one transform both cursors use, so they pivot and scale identically. */
export function cursorTransform(x: number, y: number, rotation: number, scale: number): string {
  return (
    `translate3d(${x}px, ${y}px, 0) ` +
    `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`
  );
}
