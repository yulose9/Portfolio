import { test, expect } from "@playwright/test";

test("review queue reschedules, undoes and handles conflicts", async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date("2026-10-04T00:00:00.000Z"));
  let draft = {
    id: "abcdefghijkl",
    title: "Review this draft",
    slug: "review-this",
    dek: "",
    tags: [],
    icon: null,
    cover: null,
    status: "draft",
    dirty: true,
    page: false,
    pinned: false,
    minutes: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishAt: null,
    publishedAt: null,
    liveSlug: null,
    trashedAt: null,
    editorial: {
      stage: "drafting",
      reviewAt: "2026-01-01T01:00:00.000Z",
      timezone: "UTC",
    },
  };
  const original = draft.editorial.reviewAt;
  let conflict = false;
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (
      path.endsWith("/posts/abcdefghijkl") &&
      route.request().method() === "PUT"
    ) {
      const patch = route.request().postDataJSON();
      writes.push(patch);
      if (conflict)
        return route.fulfill({ status: 409, json: { error: "Conflict" } });
      expect(patch.base).toBe(draft.updatedAt);
      expect(Object.keys(patch).sort()).toEqual(["base", "editorial"]);
      draft = {
        ...draft,
        editorial: patch.editorial,
        updatedAt: new Date(Date.parse(draft.updatedAt) + 1000).toISOString(),
      };
      return route.fulfill({ json: { post: draft } });
    }
    const body = path.endsWith("/me")
      ? { email: "test@example.com", github: true, storage: true }
      : path.endsWith("/posts")
        ? { posts: [draft] }
        : path.endsWith("/folders")
          ? { value: { folders: [], assignments: {} }, base: null }
          : { items: [] };
    await route.fulfill({ json: body });
  });
  await page.goto("/admin?section=writing");
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page.getByRole("menuitem", { name: "Research", exact: true }).click();
  await page.getByRole("combobox", { name: "Workspace view" }).click();
  await page.getByRole("option", { name: "Review queue", exact: true }).click();
  const queue = page.getByRole("region", { name: "Review queue" });
  await expect(queue.getByRole("button", { name: "Due 1" })).toBeVisible();
  await queue.getByRole("button", { name: "Reschedule" }).click();
  await queue.getByRole("button", { name: "Tomorrow · 9 am" }).click();
  await expect(queue.getByRole("button", { name: "Due 0" })).toBeVisible();
  expect(draft.editorial.stage).toBe("drafting");
  await queue.getByRole("button", { name: "Later 1" }).click();
  await expect(
    queue.getByRole("button", { name: "Review this draft" }),
  ).toBeVisible();
  await queue.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(queue.getByRole("button", { name: "Due 1" })).toBeVisible();
  expect(draft.editorial.reviewAt).toBe(original);
  await queue.getByRole("button", { name: "Due 1" }).click();
  conflict = true;
  await queue.getByRole("button", { name: "Reviewed", exact: true }).click();
  await expect(queue.getByRole("alert")).toContainText("changed elsewhere");
  await expect(
    queue.getByRole("button", { name: "Review this draft" }),
  ).toBeVisible();
  conflict = false;
  await queue.getByRole("button", { name: "Reload queue" }).click();
  await queue.getByRole("button", { name: "Reviewed", exact: true }).click();
  await expect(queue.getByRole("button", { name: "Due 0" })).toBeVisible();
  expect(draft.editorial.reviewAt).toBeNull();
  expect(writes.length).toBe(4);
  await queue.getByRole("button", { name: "Undo", exact: true }).click();
  await queue.getByRole("button", { name: "Reschedule" }).click();
  await queue.getByRole("button", { name: "Go to the Next Month" }).click();
  await queue.getByRole("button", { name: "Sunday, November 1st, 2026", exact: true }).click();
  await queue.getByRole("combobox", { name: "Time", exact: true }).click();
  await page.getByRole("option", { name: "9:30 AM", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("review-queue.png"),
    fullPage: true,
  });
  await queue.getByRole("button", { name: "Set review date" }).click();
  await expect(queue.getByRole("button", { name: "Later 1" })).toBeVisible();
  expect(draft.editorial.reviewAt).toBe("2026-11-01T01:30:00.000Z");
  await expect(queue.getByRole("button", { name: "Due 0" })).toBeFocused();
});
