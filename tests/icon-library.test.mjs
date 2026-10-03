import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_SETS,
  defaultStyle,
  filterNames,
  ICON_SETS,
  iconLabel,
  iconSvgUrl,
  readCollection,
  searchUrl,
  splitIcon,
  styleOf,
} from "../app/admin/ui/iconify.ts";

test("the library offers the requested sets and never SF Symbols", () => {
  const prefixes = ICON_SETS.map((s) => s.prefix);
  for (const p of ["fluent", "fluent-emoji", "fluent-emoji-flat", "fluent-color", "material-symbols", "mdi", "ph", "lucide", "tabler", "heroicons", "ri", "carbon", "bi", "fa6-solid", "fa6-regular", "fa6-brands", "simple-icons", "noto", "openmoji", "twemoji", "streamline"]) {
    assert.ok(prefixes.includes(p), p);
  }
  assert.equal(new Set(prefixes).size, prefixes.length);
  assert.ok(!prefixes.some((p) => /sf-?symbols/i.test(p)));
});

test("icon ids are validated before they reach a URL", () => {
  assert.deepEqual(splitIcon("ph:house-fill"), { prefix: "ph", name: "house-fill" });
  assert.equal(splitIcon("ph:../../x"), null);
  assert.equal(splitIcon("ph:house?x=1"), null);
  assert.equal(splitIcon("house"), null);
  assert.equal(iconSvgUrl("ph:../x"), "");
});

test("colour applies only to monochrome sets, only as a hex", () => {
  assert.equal(iconSvgUrl("ph:house", "#B91C1C"), "https://api.iconify.design/ph/house.svg?color=%23b91c1c");
  assert.equal(iconSvgUrl("ph:house", "red"), "https://api.iconify.design/ph/house.svg");
  assert.equal(iconSvgUrl("fluent-emoji:rocket", "#b91c1c", 256), "https://api.iconify.design/fluent-emoji/rocket.svg?height=256");
});

test("search targets one set, or every offered set", () => {
  const one = new URL(searchUrl(" rocket ", "lucide"));
  assert.equal(one.searchParams.get("query"), "rocket");
  assert.equal(one.searchParams.get("prefix"), "lucide");
  const all = new URL(searchUrl("rocket", ALL_SETS));
  assert.equal(all.searchParams.get("prefixes"), ICON_SETS.map((s) => s.prefix).join(","));
});

test("collections read into names, categories and one style at a time", () => {
  const c = readCollection({
    prefix: "material-symbols",
    categories: { Actions: ["home", "home-rounded", "search"], Social: ["home", "group"] },
    uncategorized: ["star-outline-rounded"],
    suffixes: { "": "Regular", rounded: "Rounded", "outline-rounded": "Outline Rounded" },
  });
  assert.deepEqual(c.names, ["home", "home-rounded", "search", "group", "star-outline-rounded"]);
  assert.equal(defaultStyle(c.styles), "");
  assert.equal(styleOf("star-outline-rounded", c.styles), "outline-rounded");
  assert.deepEqual(filterNames(c, "", null), ["home", "search", "group"]);
  assert.deepEqual(filterNames(c, "", "Social"), ["home", "group"]);
  assert.deepEqual(filterNames(c, "rounded", null), ["home-rounded"]);
  assert.equal(iconLabel("star-outline-rounded", c.styles), "star");
});

test("Fluent shows its 24px icons only, by weight", () => {
  const c = readCollection({ prefix: "fluent", uncategorized: ["add-16-regular", "add-24-regular", "add-24-filled", "add-20-filled"], suffixes: { "16-regular": "16 Regular" } });
  assert.equal(defaultStyle(c.styles), "24-regular");
  assert.deepEqual(filterNames(c, "24-regular", null), ["add-24-regular"]);
  assert.deepEqual(filterNames(c, "24-filled", null), ["add-24-filled"]);
});
