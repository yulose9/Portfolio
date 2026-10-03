import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_SETS,
  collectionUrl,
  defaultStyle,
  filterNames,
  ICON_SETS,
  iconDataUrl,
  iconLabel,
  iconMarkup,
  iconSvgUrl,
  readCollection,
  readIcon,
  searchUrl,
  splitIcon,
  styleOf,
} from "../app/admin/ui/iconify.ts";
import { iconifyRoute, MAX_BULK_ICONS } from "../cms/icon-sets.ts";

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
  assert.equal(iconSvgUrl("ph:house", "#B91C1C"), "/api/admin/icons/ph/house.svg?color=%23b91c1c");
  assert.equal(iconSvgUrl("ph:house", "red"), "/api/admin/icons/ph/house.svg");
  assert.equal(iconSvgUrl("fluent-emoji:rocket", "#b91c1c", 256), "/api/admin/icons/fluent-emoji/rocket.svg?height=256");
});

test("search targets one set, or every offered set", () => {
  const one = new URL(searchUrl(" rocket ", "lucide"), "https://admin.test");
  assert.equal(one.pathname, "/api/admin/icons/search");
  assert.equal(one.searchParams.get("query"), "rocket");
  assert.equal(one.searchParams.get("prefix"), "lucide");
  const all = new URL(searchUrl("rocket", ALL_SETS), "https://admin.test");
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

test("every request goes through the admin proxy, one bulk call per set", () => {
  assert.equal(iconDataUrl("ph", ["house", "house-fill"]), "/api/admin/icons/ph.json?icons=house,house-fill");
  assert.equal(new URL(collectionUrl("tabler"), "https://admin.test").pathname, "/api/admin/icons/collection");
});

test("the proxy forwards only the routes the library makes, rebuilt from checked parts", () => {
  const q = (s) => new URLSearchParams(s);
  assert.equal(iconifyRoute("collection", q("prefix=ph&x=1")), "collection?prefix=ph");
  assert.equal(iconifyRoute("collection", q("prefix=unknown-set")), null);
  assert.equal(iconifyRoute("collections", q("")), "collections");
  assert.equal(iconifyRoute("search", q("query=rocket&limit=999&prefix=lucide")), "search?query=rocket&limit=999&prefix=lucide");
  assert.equal(iconifyRoute("search", q("query=rocket&limit=999&prefixes=ph,evil")), null);
  assert.equal(iconifyRoute("ph.json", q("icons=house,house-fill")), "ph.json?icons=house,house-fill");
  assert.equal(iconifyRoute("ph.json", q("icons=house,../x")), null);
  assert.equal(iconifyRoute("ph.json", q(`icons=${Array.from({ length: MAX_BULK_ICONS + 1 }, (_, i) => `i${i}`).join(",")}`)), null);
  assert.equal(iconifyRoute("ph/house.svg", q("color=%23B91C1C&height=256")), "ph/house.svg?color=%23b91c1c&height=256");
  assert.equal(iconifyRoute("ph/house.svg", q("color=red")), null);
  assert.equal(iconifyRoute("ph/House.svg", q("")), null);
  assert.equal(iconifyRoute("ph/house.svg/x", q("")), null);
  assert.equal(iconifyRoute("last-modified", q("")), null);
  assert.equal(iconifyRoute("../ph.json", q("icons=a")), null);
});

test("IconifyJSON becomes SVG: defaults, aliases, rotation and flips", () => {
  const data = {
    prefix: "x",
    width: 24,
    icons: {
      wide: { body: '<path fill="currentColor" d="M0 0h24v16z"/>', height: 16 },
      plain: { body: "<circle r='4'/>" },
      flipped: { body: "<path d='M0 0'/>", hFlip: true },
    },
    aliases: {
      turned: { parent: "wide", rotate: 1 },
      "turned-again": { parent: "turned", rotate: 1, width: 20 },
      unflipped: { parent: "flipped", hFlip: true },
      loop: { parent: "loop" },
      orphan: { parent: "nowhere" },
    },
  };

  // Root width applies; height falls back to 16, left and top to 0.
  const plain = readIcon(data, "plain");
  assert.deepEqual({ ...plain, body: undefined }, { body: undefined, left: 0, top: 0, width: 24, height: 16, rotate: 0, hFlip: false, vFlip: false });
  assert.equal(iconMarkup(plain), `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="16" viewBox="0 0 24 16"><circle r='4'/></svg>`);
  assert.equal(readIcon({ prefix: "y", icons: { a: { body: "" } } }, "a").width, 16);

  // A quarter turn swaps the box and wraps the body.
  const turned = readIcon(data, "turned");
  assert.equal(turned.rotate, 1);
  const svg = iconMarkup(turned);
  assert.match(svg, /viewBox="0 0 16 24"/);
  assert.match(svg, /<g transform="rotate\(90 8 8\)">/);

  // Rotations add up through alias chains; the nearest alias's size wins.
  const again = readIcon(data, "turned-again");
  assert.equal(again.rotate, 2);
  assert.equal(again.width, 20);
  assert.match(iconMarkup(again), /rotate\(180 10 8\)/);

  // Flips toggle: an alias that flips a flipped icon draws it plain.
  assert.equal(readIcon(data, "flipped").hFlip, true);
  assert.match(iconMarkup(readIcon(data, "flipped")), /translate\(24 0\) scale\(-1 1\)/);
  assert.equal(readIcon(data, "unflipped").hFlip, false);
  assert.doesNotMatch(iconMarkup(readIcon(data, "unflipped")), /transform/);

  // Missing, looping and dangling names draw nothing.
  assert.equal(readIcon(data, "nope"), null);
  assert.equal(readIcon(data, "loop"), null);
  assert.equal(readIcon(data, "orphan"), null);

  // Monochrome icons take a hex colour in place of currentColor; nothing else does.
  assert.match(iconMarkup(readIcon(data, "wide"), "#B91C1C"), /fill="#b91c1c"/);
  assert.match(iconMarkup(readIcon(data, "wide"), "red"), /fill="currentColor"/);
});
