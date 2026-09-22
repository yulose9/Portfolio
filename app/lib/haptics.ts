/**
 * Haptic feedback on iOS Safari.
 *
 * Safari 17.4+ vibrates the device when a `<input type="checkbox" switch>` is
 * toggled, and that is currently the only way to reach the Taptic Engine from
 * a web page — the Vibration API is not implemented on iOS.
 *
 * The usual packaging of this trick appends the switch *inside* the element you
 * want to buzz, so the user taps the input rather than your control. That is
 * not usable here: an <input> inside a <button> or an <a> is invalid HTML, and
 * it takes over as the tap target. Instead one switch lives offscreen for the
 * whole page and is clicked from inside the real handler, so the markup and the
 * click target are untouched.
 *
 * Everything else — Chrome on iOS, Android, desktop — silently does nothing.
 */

let control: HTMLInputElement | null = null;

function ensureControl(): HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  if (control?.isConnected) return control;

  const input = document.createElement("input");
  input.type = "checkbox";
  // The `switch` attribute is what Safari attaches the haptic to.
  input.setAttribute("switch", "");
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;

  // Kept in the layout and paintable — a display:none or visibility:hidden
  // control is not interactive, and Safari skips the haptic for it. Clipping
  // to a single transparent pixel hides it without removing it from the
  // rendering tree. pointer-events stays off so it can never be hit directly.
  Object.assign(input.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    margin: "0",
    padding: "0",
    border: "0",
    pointerEvents: "none",
    appearance: "none",
  } satisfies Partial<CSSStyleDeclaration>);

  document.body.appendChild(input);
  control = input;
  return input;
}

/**
 * Fire one haptic tick.
 *
 * Must be called synchronously from a real user gesture — Safari will not
 * honour it from a timer or a promise continuation.
 */
export function haptic(): void {
  const input = ensureControl();
  if (!input) return;
  try {
    input.click();
  } catch {
    // Never let feedback break the interaction it is decorating.
  }
}
