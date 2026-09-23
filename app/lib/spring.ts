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
