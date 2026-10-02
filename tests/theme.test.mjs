import assert from "node:assert/strict";
import test from "node:test";

import { nextSetting, parseSetting, resolveTheme, THEME_KEY, THEME_SCRIPT } from "../app/lib/theme.ts";

test("System follows the OS; Light and Dark ignore it", () => {
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("system", true), "dark");
  for (const prefersDark of [false, true]) {
    assert.equal(resolveTheme("light", prefersDark), "light");
    assert.equal(resolveTheme("dark", prefersDark), "dark");
  }
});

test("anything stored that isn't Light or Dark reads as System", () => {
  assert.equal(parseSetting("light"), "light");
  assert.equal(parseSetting("dark"), "dark");
  for (const junk of [null, undefined, "", "system", "DARK", "auto", 1]) assert.equal(parseSetting(junk), "system");
});

test("the toggle steps System, Light, Dark and round again", () => {
  assert.equal(nextSetting("system"), "light");
  assert.equal(nextSetting("light"), "dark");
  assert.equal(nextSetting("dark"), "system");
});

/** Runs the pre-paint script against a stand-in browser and returns what it wrote. */
function runScript(stored, prefersDark, { storageThrows = false } = {}) {
  const root = { dataset: {}, style: {} };
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error("blocked");
      return key === THEME_KEY ? stored : null;
    },
  };
  const matchMedia = (query) => ({ matches: query === "(prefers-color-scheme: dark)" && prefersDark });
  new Function("localStorage", "matchMedia", "document", THEME_SCRIPT)(localStorage, matchMedia, { documentElement: root });
  return { theme: root.dataset.theme, scheme: root.style.colorScheme };
}

test("the pre-paint script agrees with resolveTheme for every case", () => {
  for (const stored of [null, "light", "dark", "nonsense"]) {
    for (const prefersDark of [false, true]) {
      const expected = resolveTheme(parseSetting(stored), prefersDark);
      assert.deepEqual(runScript(stored, prefersDark), { theme: expected, scheme: expected });
    }
  }
});

test("the pre-paint script never throws when storage is blocked", () => {
  assert.doesNotThrow(() => runScript(null, true, { storageThrows: true }));
});
