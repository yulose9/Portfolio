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
  ).toBeEditable({ timeout: 30000 });
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
  await first.scrollIntoViewIfNeeded();
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

test("editorial stage and UTC review date survive reload without publishing", async ({
  page,
}, info) => {
  await page.getByRole("button", { name: "Details", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Details", exact: true });
  await sheet.getByRole("combobox", { name: "Editorial stage" }).click();
  await page.getByRole("option", { name: "In review", exact: true }).click();
  await sheet.getByLabel("Review due (UTC)").fill("2026-10-08T09:30");
  await expect(page.locator(".save-state")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await page.reload();
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Editorial stage" }),
  ).toContainText("In review");
  await expect(page.getByLabel("Review due (UTC)")).toHaveValue(
    "2026-10-08T09:30",
  );
  await page.screenshot({
    path: `.audit/appflowy-editorial-${info.project.name}.png`,
  });
});

test("large internal paste has a cancellable preview and one insertion", async ({
  page,
}) => {
  await page.getByRole("textbox", { name: "Body", exact: true }).click();
  await page.evaluate(() => {
    const content = Array.from({ length: 13 }, (_, i) => ({
      type: "paragraph",
      content: [{ type: "text", text: `Imported block ${i + 1}` }],
    }));
    const data = new DataTransfer();
    data.setData(
      "application/x-nazarene-writing+json",
      JSON.stringify({ version: 1, openStart: 0, openEnd: 0, content }),
    );
    data.setData("text/plain", "Imported text");
    document
      .querySelector(".editor-body")!
      .dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      );
  });
  const dialog = page.getByRole("dialog", { name: "Review pasted blocks" });
  await expect(dialog).toBeVisible();
  await expect(page.locator(".editor-body")).not.toContainText(
    "Imported block 13",
  );
  await dialog
    .getByRole("button", { name: "Insert blocks", exact: true })
    .click();
  await expect(page.locator(".editor-body")).toContainText("Imported block 13");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "Body", exact: true })).toBeFocused();
  await page.keyboard.press("Control+z");
  await expect(page.locator(".editor-body")).not.toContainText(
    "Imported block 13",
  );
});

test("completed upload survives reload and does not attach to a removed target", async ({
  page,
}) => {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("writing-media-jobs", 3);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("jobs", {
          keyPath: "id",
        });
        store.createIndex("documentId", "documentId");
        request.result.createObjectStore("parts", { keyPath: "key" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction("jobs", "readwrite");
        tx.objectStore("jobs").put({
          version: 1,
          id: "recovery-upload",
          documentId: "abcdefghijkl",
          blockId: "removed-block",
          name: "Recovered image",
          mime: "image/webp",
          state: "complete",
          attempts: 1,
          updatedAt: Date.now(),
          result: {
            kind: "image",
            src: "/avatar-96.webp",
            width: 96,
            height: 96,
          },
        });
        tx.oncomplete = () => {
          request.result.close();
          resolve();
        };
      };
    });
  });
  await page.reload();
  const uploads = page.getByRole("region", { name: "Media uploads" });
  await uploads.getByRole("button", { name: "Attach / finish" }).click();
  await expect(uploads.getByRole("alert")).toContainText(
    "placeholder changed or was removed",
  );
  await expect(
    page.locator('.editor-body img[alt="Recovered image"]'),
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "Body", exact: true }).click();
  await uploads.getByRole("button", { name: "Insert at cursor" }).click();
  await expect(
    page.locator('.editor-body img[alt="Recovered image"]'),
  ).toBeVisible();
  await expect(
    uploads.getByText("Recovered image", { exact: true }),
  ).toHaveCount(0);
});
