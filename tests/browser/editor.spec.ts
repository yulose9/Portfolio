import { test, expect } from "@playwright/test";
const id = "abcdefghijkl";
test.beforeEach(async ({ page }) => {
  let draft = {
    id,
    title: "Editor regression",
    slug: "editor-regression",
    dek: "",
    icon: null,
    authors: [],
    fonts: null,
    page: true,
    ogImage: null,
    tags: [],
    cover: null,
    body: 'A [sample link](https://example.com) to edit.\n\n<img src="/avatar-96.webp" alt="Test image" width="160" height="160" />\n\nA second block.\n\n[Related page](#page=123456789abc)',
    status: "draft",
    dirty: true,
    publishAt: null,
    publishedAt: null,
    liveSlug: null,
    redirectFrom: [],
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  };
  await page.route("**/api/admin/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let body: unknown = {};
    if (url.pathname.endsWith("/me"))
      body = { email: "editor@example.com", github: true, storage: true };
    else if (url.pathname.endsWith("/pulse"))
      body = { at: null, id: null, version: draft.updatedAt };
    else if (url.pathname.endsWith("/references"))
      body = {
        incoming: [
          {
            id: "123456789abc",
            title: "Related page",
            snippet: "Research context",
          },
        ],
        outgoing: [],
      };
    else if (url.pathname.endsWith("/research")) body = { items: [] };
    else if (url.pathname.endsWith("/posts")) body = { posts: [draft] };
    else if (url.pathname.endsWith(`/posts/${id}`)) {
      if (req.method() === "PUT")
        draft = {
          ...draft,
          ...req.postDataJSON(),
          updatedAt: new Date().toISOString(),
        };
      body = { post: draft, snapshotted: false };
    } else if (url.pathname.endsWith("/posts/123456789abc"))
      body = {
        post: {
          ...draft,
          id: "123456789abc",
          title: "Related page",
          body: "Reference content",
        },
      };
    await route.fulfill({ json: body });
  });
  await page.goto(`/admin?post=${id}`);
  await expect(
    page.getByRole("textbox", { name: "Body", exact: true }),
  ).toBeEditable();
});
test("link editing retains focus, accepts text/address, and commits together", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Hover regression is desktop-specific; mobile still covers mentions and resizing.",
  );
  await page.locator('.editor-body a[href="https://example.com"]').hover();
  await page.getByRole("button", { name: "Edit link", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Link", exact: true });
  await dialog.getByLabel("Text", { exact: true }).fill("Revised label");
  await dialog.getByLabel("Link address").fill("https://example.org/new");
  await page.mouse.move(20, 20);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Save link" }).click();
  await expect(
    page.locator('.editor-body a[href="https://example.org/new"]'),
  ).toHaveText("Revised label");
});
test("saved image dimensions survive reopening and the reader preview", async ({
  page,
}) => {
  await page.locator('.editor-body img[alt="Test image"]').click();
  await page.getByLabel("Width (px)").fill("120");
  await expect
    .poll(async () =>
      page
        .locator('.editor-body img[alt="Test image"]')
        .evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    )
    .toBe(120);
  await expect(page.locator(".save-state")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await page.reload();
  await expect(
    page.locator('.editor-body img[alt="Test image"]'),
  ).toHaveAttribute("width", "120");
  await page.keyboard.press("Control+Shift+E");
  await expect(page.locator('.page-view img[alt="Test image"]')).toBeVisible();
  await expect
    .poll(async () =>
      page
        .locator('.page-view img[alt="Test image"]')
        .evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    )
    .toBeLessThanOrEqual(120);
});
test("page mention preview returns to the same editor", async ({ page }) => {
  await page.locator(".editor-body .page-mention").click();
  await expect(
    page.getByRole("dialog", { name: "Related page" }),
  ).toBeVisible();
  await expect(
    page.getByText("Reference content", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to writing" }).click();
  await expect(
    page.getByRole("textbox", { name: "Body", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`post=${id}`));
});
test("turn-into submenu stays open for pointer travel and selection", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Block drag handle uses a fine pointer.",
  );
  await page.locator(".editor-body p").first().hover();
  await page
    .getByRole("button", { name: "Drag to move, click for options" })
    .click();
  await page.getByRole("menuitem", { name: "Turn into", exact: true }).click();
  const heading = page.getByRole("menuitem", {
    name: "Heading 1",
    exact: true,
  });
  await heading.hover();
  await expect(heading).toBeVisible();
  await heading.click();
  await expect(page.locator(".editor-body h2").first()).toContainText(
    "sample link",
  );
});
test("marquee selects intersecting blocks and deletion is undoable", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Marquee is a mouse gesture.");
  const first = page.locator(".editor-body p").first();
  const a = await first.boundingBox();
  const image = await page
    .locator('.editor-body img[alt="Test image"]')
    .boundingBox();
  if (!a || !image) throw new Error("Editor blocks are not visible");
  await page.keyboard.down("Alt");
  await page.mouse.move(a.x + 2, a.y + 2);
  await page.mouse.down();
  await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2, {
    steps: 12,
  });
  await expect(page.locator(".block-marquee")).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await page.keyboard.press("Backspace");
  await expect(page.locator('.editor-body img[alt="Test image"]')).toHaveCount(
    0,
  );
  await page.keyboard.press("Control+z");
  await expect(
    page.locator('.editor-body img[alt="Test image"]'),
  ).toBeVisible();
});
