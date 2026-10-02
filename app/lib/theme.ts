/*
 * The colour theme: Light, Dark, or System (the default), shared by the site
 * and the writing admin.
 *
 * The choice lives in localStorage under one key. What the page actually
 * wears is always a resolved "light" or "dark", written to <html data-theme>,
 * so CSS only ever has two cases to handle. System is resolved through
 * prefers-color-scheme and follows the OS when it changes.
 *
 * This module is plain functions with no React, so the resolver can be unit
 * tested and the same rules can be inlined as the pre-paint script.
 */

export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "nazarene-theme";
export const THEME_SETTINGS: readonly ThemeSetting[] = ["system", "light", "dark"];

/** The page background in each theme, for the browser chrome (theme-color). */
export const THEME_PAPER: Record<ResolvedTheme, string> = { light: "#ffffff", dark: "#191919" };

/** Anything unrecognised (nothing stored, an old value, a typo) means System. */
export function parseSetting(value: unknown): ThemeSetting {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(setting: ThemeSetting, prefersDark: boolean): ResolvedTheme {
  if (setting === "system") return prefersDark ? "dark" : "light";
  return setting;
}

/** The order a single button steps through: System, then Light, then Dark. */
export function nextSetting(setting: ThemeSetting): ThemeSetting {
  const at = THEME_SETTINGS.indexOf(setting);
  return THEME_SETTINGS[(at + 1) % THEME_SETTINGS.length];
}

/*
 * The blocking script each root layout puts in <head>. It runs before the
 * first paint, so a dark-mode reader never sees a white flash. It repeats
 * parseSetting and resolveTheme in miniature because it has to be a string;
 * the tests check that the two agree.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(s!=="light"&&s!=="dark")s="system";var d=s==="dark"||(s==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

// ── Browser side ──────────────────────────────────────────────────────────

const QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

export function readSetting(): ThemeSetting {
  try {
    return parseSetting(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

function prefersDark() {
  return typeof matchMedia === "function" && matchMedia(QUERY).matches;
}

/*
 * Swapping every colour at once would otherwise set off every transition on
 * the page (buttons, borders, the hover slab) and smear the change across a
 * few hundred milliseconds. So transitions are switched off for exactly one
 * frame: add the rule, write the theme, force a style flush so the new colours
 * land with no transition, then lift the rule on the next frame.
 */
function swapWithoutTransitions(apply: () => void) {
  const style = document.createElement("style");
  // The toggle's own icons are spared, so their cross-fade still plays.
  style.textContent = '*:not([data-slot="theme-toggle"]>*),*::before,*::after{transition:none!important}';
  document.head.appendChild(style);
  apply();
  void window.getComputedStyle(document.body).opacity;
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}

/** Writes the resolved theme to <html>, the colour scheme and the browser chrome. */
export function applyTheme(setting: ThemeSetting = readSetting()) {
  const theme = resolveTheme(setting, prefersDark());
  const root = document.documentElement;
  // The layouts declare one theme-color per OS scheme; once a choice is
  // known, both carry the resolved page colour so an explicit Light or Dark
  // that disagrees with the OS still tints the browser chrome correctly.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = THEME_PAPER[theme];
  }
  if (root.dataset.theme === theme) return;
  swapWithoutTransitions(() => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  });
}

export function setThemeSetting(setting: ThemeSetting) {
  try {
    if (setting === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, setting);
  } catch {
    // Private mode or blocked storage: the choice still applies to this page.
  }
  current = setting;
  applyTheme(setting);
  for (const listener of listeners) listener();
}

let current: ThemeSetting | null = null;

/** The stored setting, cached so React's store snapshot stays stable. */
export function getThemeSetting(): ThemeSetting {
  if (current === null) current = readSetting();
  return current;
}

/*
 * One subscription for React: fires when the setting changes here, in another
 * tab (the storage event), or when the OS flips while the setting is System.
 */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    matchMedia(QUERY).addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      matchMedia(QUERY).removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    }
  };
}

function onSystemChange() {
  if (getThemeSetting() === "system") applyTheme("system");
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== THEME_KEY) return;
  current = readSetting();
  applyTheme(current);
  for (const listener of listeners) listener();
}
