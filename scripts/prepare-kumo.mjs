import fs from "node:fs";
import { createRequire } from "node:module";
import postcss from "postcss";
const require = createRequire(import.meta.url);
const input = require.resolve("@cloudflare/kumo/styles/standalone");
// The app uses Tailwind 3. Keep Kumo's Tailwind 4 property registrations and
// shadow/ring state independent from the existing editor's utility styles.
const root = postcss.parse(
  fs.readFileSync(input, "utf8").replaceAll("--tw-", "--kumo-tw-"),
);
// Tailwind 3 treats @layer base/utilities as compiler directives. Kumo ships
// already compiled CSS: retain its cascade layers with distinct names.
root.walkAtRules("layer", (rule) => {
  rule.params = rule.params.replace(
    /\b(theme|base|components|utilities|properties)\b/g,
    "kumo-$1",
  );
});
root.walkRules((rule) => {
  let parent = rule.parent;
  while (parent) {
    if (
      parent.type === "rule" ||
      (parent.type === "atrule" && /keyframes$/.test(parent.name))
    )
      return;
    parent = parent.parent;
  }
  rule.selectors = rule.selectors.map((selector) => {
    // The portfolio's theme is resolved on html before paint. Map Kumo's
    // token scope directly to it instead of maintaining a second preference.
    if (selector === ":root[data-mode=dark]")
      return 'html[data-theme="dark"] .admin-body';
    const scoped = selector.replace(
      /:root|:host\b|(?<![\w.\\#-])(?:html|body)(?![\w-])/g,
      ".admin-body",
    );
    return scoped.includes(".admin-body") ? scoped : `.admin-body ${scoped}`;
  });
});
// Existing Tailwind 3 utilities are unlayered. Emit the already-scoped Kumo
// utilities at that same cascade level so a generic ring-1/shadow-sm class
// cannot replace Kumo's semantic border with Tailwind 3's default blue ring.
root.walkAtRules("layer", (rule) => {
  if (rule.params === "kumo-utilities" && rule.nodes)
    rule.replaceWith(...rule.nodes);
});
fs.writeFileSync(
  "app/admin/kumo.generated.css",
  `/* Generated from @cloudflare/kumo. Run npm run kumo:styles. */\n${root.toString()}\n`,
);
