import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/lib/updated-at.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { updatedAtLabel: label, updatedAtExact: exact } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const at = "2026-09-01T12:34:56Z";
const start = Date.parse(at);

test("relative labels switch at minute, hour, day and week boundaries", () => {
  for (const [seconds, expected] of [
    [0, "now"], [59, "now"], [60, "1 minute ago"], [3599, "59 minutes ago"],
    [3600, "1 hour ago"], [86399, "23 hours ago"], [86400, "1 day ago"],
    [604799, "6 days ago"], [604800, "Sep 1, 2026"],
  ]) assert.equal(label(at, start + seconds * 1000), expected);
});

test("static rendering, future timestamps and invalid values stay honest", () => {
  assert.equal(label(at, null), "Sep 1, 2026");
  assert.equal(label(at, start - 1000), "Sep 1, 2026");
  assert.equal(label("invalid", start), null);
});

test("exact timestamps include weekday and seconds in UTC", () => {
  assert.equal(exact(at), "Tuesday, Sep 1, 2026, 12:34:56 UTC");
  assert.equal(exact("2026-09-01T20:34:56+08:00"), exact(at));
});
