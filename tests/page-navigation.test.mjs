import test from "node:test";
import assert from "node:assert/strict";
import {
  matchingPageIds,
  siblingIds,
  withPageOrder,
} from "../cms/page-order.ts";
const a = {
  id: "aaaaaaaaaaaa",
  title: "Research",
  createdAt: "2026-01-01",
  parentId: null,
};
const b = {
  id: "bbbbbbbbbbbb",
  title: "Café observations",
  createdAt: "2026-02-01",
  parentId: a.id,
};
const c = {
  id: "cccccccccccc",
  title: "Notes",
  createdAt: "2026-03-01",
  parentId: a.id,
};
test("navigation order respects parent groups and appends newly created siblings", () => {
  const pages = withPageOrder([a, b, c], {
    [a.id]: [b.id],
    root: [c.id, a.id],
  });
  assert.deepEqual(siblingIds(pages, a.id), [b.id, c.id]);
  assert.deepEqual(siblingIds(pages, null), [a.id]);
  assert.deepEqual(siblingIds(withPageOrder([a, b, c]), a.id), [c.id, b.id]);
  assert.deepEqual(
    siblingIds(withPageOrder([a, { ...b, trashedAt: "2026-09-29" }, c]), a.id),
    [c.id],
  );
});
test("title filtering retains ancestors and normalizes diacritics", () => {
  assert.deepEqual(
    [...matchingPageIds([a, b, c], "CAFE")].sort(),
    [a.id, b.id].sort(),
  );
  assert.equal(matchingPageIds([a, b, c], "missing").size, 0);
});
test("title filtering terminates on legacy parent cycles", () => {
  assert.deepEqual(
    [...matchingPageIds([{ ...a, parentId: b.id }, b, c], "cafe")].sort(),
    [a.id, b.id].sort(),
  );
});
