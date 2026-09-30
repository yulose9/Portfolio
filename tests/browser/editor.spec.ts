import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { changeFolders, type Folders } from "../../cms/folders";
const id = "abcdefghijkl";
async function navigatorFixture(page: Page) {
  const { post: current } = await page.evaluate(async () =>
    (await fetch("/api/admin/posts/abcdefghijkl")).json(),
  );
  const pages = [
    { ...current, parentId: null, navigationOrder: 0, pinned: true },
    {
      ...current,
      id: "123456789abc",
      title: "Related page",
      parentId: null,
      navigationOrder: 1,
      pinned: false,
    },
    {
      ...current,
      id: "cccccccccccc",
      title: "Café research",
      parentId: id,
      navigationOrder: 0,
      pinned: false,
    },
  ];
  await page.route("**/api/admin/posts", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { posts: pages } })
      : route.fallback(),
  );
  return { current, pages };
}
async function openNavigator(page: Page) {
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Browse pages", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Pages", exact: true });
  await expect(
    dialog.getByRole("navigation", { name: "Page navigator" }),
  ).toBeVisible();
  return dialog;
}
const codeSource = 'const longValue = "' + 'a'.repeat(140) + '";\n  console.log(longValue);';
test.beforeEach(async ({ page }, info) => {
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
  if (info.title.startsWith("code controls") || info.title.startsWith("code copy")) {
    draft.body = '```js\n' + codeSource + '\n```\n\n```customlang\nraw source\n```';
  }
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
    else if (url.pathname.endsWith("/folders"))
      body = { value: { folders: [], assignments: {} }, base: null };
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
test("code controls preserve source, save language, and keep view state out of Markdown", async ({ page }, info) => {
  const source = codeSource;
  const block = page.locator('.editor-code-block').first();
  await expect(block.locator('pre')).toHaveText(source);
  await expect(block.locator('pre code')).toHaveCSS('white-space', 'pre');
  await expect(block.getByRole('combobox', { name: 'Code language' })).toHaveText('js');
  await expect(page.locator('.editor-code-block').nth(1).getByRole('combobox')).toHaveText('customlang');
  await block.getByRole('button', { name: 'Wrap code' }).click();
  await expect(block.locator('pre')).toHaveCSS('white-space', 'pre-wrap');
  await expect(block.locator('pre code')).toHaveCSS('white-space', 'pre-wrap');
  await expect.poll(() => block.locator('pre').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await block.screenshot({ path: info.outputPath('code-controls.png') });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { document.documentElement.dataset.copiedCode = text; },
    } });
  });
  await block.getByRole('button', { name: 'Copy code' }).click();
  await expect(block.getByRole('button', { name: 'Copy code' })).toHaveText('Copied');
  await expect(page.locator('html')).toHaveAttribute('data-copied-code', source);
  await block.getByRole('combobox', { name: 'Code language' }).click();
  await page.getByRole('option', { name: 'TypeScript', exact: true }).click();
  await expect.poll(async () => page.evaluate(async () =>
    (await (await fetch('/api/admin/posts/abcdefghijkl')).json()).post.body,
  )).toContain('```typescript\n' + source + '\n```');
  const saved = await page.evaluate(async () => (await (await fetch('/api/admin/posts/abcdefghijkl')).json()).post);
  expect(saved.body).not.toMatch(/Wrap|Copied|editor-code-tools|data-wrapped/);
  expect(saved.body).toContain('```customlang');
  const savedBlock = saved.editorDocument.doc.content.find((node: { type: string }) => node.type === 'codeBlock');
  expect(savedBlock.attrs.blockId).toBeTruthy();
  await page.reload();
  await expect(block.getByRole('combobox')).toHaveText('TypeScript');
  await expect(block.getByRole('button', { name: 'Wrap code' })).toHaveAttribute('aria-pressed', 'false');
  await block.locator('pre code').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' // edited');
  await expect(block.locator('pre')).toContainText('// edited');
});

test("code copy does not claim success when clipboard access fails", async ({ page }) => {
  const block = page.locator('.editor-code-block').first();
  await expect(block).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } });
    document.execCommand = () => false;
  });
  await block.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect(page.locator('.toast-title').filter({ hasText: 'Couldn’t copy' })).toBeVisible();
  await expect(block.getByRole('button', { name: 'Copy code', exact: true })).toHaveText('Copy');
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
    document.querySelector(".editor-body")!.dispatchEvent(
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
  await expect(
    page.getByRole("textbox", { name: "Body", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Control+z");
  await expect(page.locator(".editor-body")).not.toContainText(
    "Imported block 13",
  );
});

test("completed upload survives reload and does not attach to a removed target", async ({
  page,
}) => {
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/admin/posts/${id}`) &&
      response.request().method() === "PUT",
  );
  await page.keyboard.press("Control+s");
  await saved;
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

test("navigator preserves expansion, filters with ancestors and saves sibling order", async ({
  page,
}, info) => {
  const { pages } = await navigatorFixture(page);
  const orders: string[][] = [];
  await page.route("**/api/admin/page-order", async (route) => {
    const input = route.request().postDataJSON();
    orders.push(input.ids);
    for (const p of pages)
      if (p.parentId === input.parentId)
        p.navigationOrder = input.ids.indexOf(p.id);
    await route.fulfill({ json: { ids: input.ids } });
  });
  let dialog = await openNavigator(page);
  await expect(
    dialog.getByRole("region", { name: "Pinned pages" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Expand Editor regression", exact: true })
    .click();
  await expect(dialog.locator('[data-page-id="cccccccccccc"]')).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  dialog = await openNavigator(page);
  await expect(dialog.locator('[data-page-id="cccccccccccc"]')).toBeVisible();
  await dialog.getByRole("searchbox").fill("cafe");
  await expect(dialog.locator(".page-tree-row")).toHaveCount(2);
  await expect(dialog.locator('[data-page-id="abcdefghijkl"]')).toBeVisible();
  await dialog.getByRole("searchbox").fill("");
  await dialog
    .getByRole("button", { name: "Actions for Editor regression", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Move down", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("position 2 of 2");
  expect(orders).toEqual([["123456789abc", id]]);
  await dialog.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    dialog.locator("nav > ul > li > .page-tree-row").first(),
  ).toHaveAttribute("data-page-id", "123456789abc");
  await page.screenshot({
    path: `.audit/notion-navigator-${info.project.name}.png`,
  });
});

test("navigator supports native dragging and keyboard sibling moves", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Touch uses the separately tested row move actions.",
  );
  await navigatorFixture(page);
  const orders: string[][] = [];
  await page.route("**/api/admin/page-order", async (route) => {
    const input = route.request().postDataJSON();
    orders.push(input.ids);
    await route.fulfill({ json: { ids: input.ids } });
  });
  const dialog = await openNavigator(page);
  const grip = dialog.getByRole("button", {
    name: "Reorder Editor regression",
    exact: true,
  });
  await grip.dragTo(dialog.locator('[data-page-id="123456789abc"]'));
  await expect(dialog.getByRole("status")).toContainText("position 2 of 2");
  await grip.focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(dialog.getByRole("status")).toContainText("position 1 of 2");
  expect(orders).toEqual([
    ["123456789abc", id],
    [id, "123456789abc"],
  ]);
  await expect(grip).toBeFocused();
});

test("pinning the current page advances the next edit save version", async ({
  page,
}) => {
  const { current, pages } = await navigatorFixture(page);
  let stored = { ...current, pinned: true };
  let version = 0;
  const conflicts: string[] = [];
  await page.route(`**/api/admin/posts/${id}`, async (route) => {
    if (route.request().method() === "PUT") {
      const input = route.request().postDataJSON();
      if (input.base !== stored.updatedAt) {
        conflicts.push(input.base);
        return route.fulfill({ status: 409, json: { error: "Stale base" } });
      }
      stored = {
        ...stored,
        ...input,
        updatedAt: new Date(
          Date.UTC(2026, 8, 29, 0, 0, ++version),
        ).toISOString(),
      };
      pages[0].pinned = stored.pinned;
    }
    await route.fulfill({ json: { post: stored, snapshotted: false } });
  });
  const dialog = await openNavigator(page);
  await dialog
    .getByRole("button", { name: "Actions for Editor regression", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Unpin page", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Page pin updated");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("textbox", { name: "Body", exact: true }).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Edit after pinning");
  await page.keyboard.press("Control+s");
  await expect.poll(() => stored.body).toContain("Edit after pinning");
  expect(stored.pinned).toBe(false);
  expect(conflicts).toEqual([]);
});

test("navigator refuses to leave when saving fails", async ({ page }) => {
  await navigatorFixture(page);
  await page.route(`**/api/admin/posts/${id}`, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 503,
          json: { error: "Fixture save unavailable" },
        })
      : route.fallback(),
  );
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Unsaved note");
  const dialog = await openNavigator(page);
  await dialog
    .locator('[data-page-id="123456789abc"]')
    .getByRole("button", { name: "Related page", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Save or recover");
  await expect(page).toHaveURL(/post=abcdefghijkl/);
  await expect(page.locator(".editor-body")).toContainText("Unsaved note");
});

test("new subpage retries use one identity and open only after success", async ({
  page,
}) => {
  const { current } = await navigatorFixture(page),
    requests: string[] = [];
  const child = {
    ...current,
    id: "dddddddddddd",
    title: "New subpage",
    body: "",
    parentId: id,
  };
  await page.route("**/api/admin/posts", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const data = route.request().postDataJSON();
    expect(data.parentId).toBe(id);
    requests.push(data.requestId);
    if (requests.length === 1)
      await route.fulfill({ status: 503, json: { error: "Retry the create" } });
    else await route.fulfill({ json: { post: child } });
  });
  await page.route("**/api/admin/posts/dddddddddddd", (route) =>
    route.fulfill({ json: { post: child } }),
  );
  const dialog = await openNavigator(page);
  for (let attempt = 0; attempt < 2; attempt++) {
    await dialog
      .getByRole("button", {
        name: "Actions for Editor regression",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "New subpage", exact: true })
      .click();
    if (attempt === 0) {
      await expect(dialog.getByRole("alert")).toContainText("Retry the create");
      await expect(page).toHaveURL(/post=abcdefghijkl/);
    }
  }
  await expect(page).toHaveURL(/post=dddddddddddd/);
  await expect(page).toHaveTitle("New subpage · Writing admin");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toBe(requests[0]);
});

test("slash previews follow keyboard choices and restore editor accessibility", async ({
  page,
}, info) => {
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/hea");
  const list = page.getByRole("listbox", { name: "Insert block", exact: true });
  await expect(list).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option", { selected: true })).toContainText(
    "Heading 2",
  );
  await expect(
    page.getByRole("complementary", { name: "Block preview" }),
  ).toContainText("Subsection");
  const popup = await page.locator(".slash-menu").boundingBox(),
    viewport = page.viewportSize()!;
  expect(popup!.x).toBeGreaterThanOrEqual(0);
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(viewport.width);
  expect(popup!.y).toBeGreaterThanOrEqual(0);
  expect(popup!.y + popup!.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({
    path: `.audit/notion-block-preview-${info.project.name}.png`,
  });
  await page.keyboard.press("Enter");
  await page.keyboard.type("A subsection");
  await expect(body.locator("h3")).toContainText("A subsection");
  await expect(body).not.toHaveAttribute("aria-controls", /.+/);
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await expect(list).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list).not.toBeVisible();
  await expect(body).toBeFocused();
});

test("writing dashboard groups workspace tools and keeps filtering accessible", async ({
  page,
}, info) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Writing", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Media library", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Tag pages", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("searchbox", { name: "Filter posts by title" })
    .fill("regression");
  await expect(
    page.getByRole("button", { name: /Editor regression Draft/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `.audit/polish-dashboard-${info.project.name}.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Pages", exact: true }),
  ).toBeVisible();
});

test("move page chooses a destination and saves before the move", async ({
  page,
}, info) => {
  const { pages } = await navigatorFixture(page);
  // PageLocation fetched before the fixture was installed. Reopen with the same saved content.
  await page.keyboard.press("Control+s");
  await expect(page.locator(".save-state")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await page.reload();
  const moves: unknown[] = [];
  await page.route(`**/api/admin/posts/${id}/parent`, async (route) => {
    moves.push(route.request().postDataJSON());
    pages[0].parentId = "123456789abc";
    await route.fulfill({ json: { parentId: "123456789abc" } });
  });
  await page.getByRole("button", { name: "Move page", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Move page", exact: true });
  await expect(
    dialog.getByRole("button", { name: /Editor regression/ }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: /Café research/ }),
  ).toHaveCount(0);
  await dialog
    .getByRole("searchbox", { name: "Find destination" })
    .fill("Related");
  await dialog.getByRole("button", { name: /Related page/ }).click();
  await page.screenshot({
    path: `.audit/polish-move-${info.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Move here", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Page breadcrumbs" }),
  ).toContainText("Related page");
  expect(moves).toHaveLength(1);
});

test("slash options scroll independently and pointer previews keep their size", async ({
  page,
}, info) => {
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  const list = page.getByRole("listbox", { name: "Insert block", exact: true });
  await expect(list).toBeVisible();
  const box = await page.locator(".block-suggestion").boundingBox();
  await list.hover();
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => list.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100);
  expect(await page.evaluate(() => scrollY)).toBe(y);
  const scrolled = await list.evaluate((el) => el.scrollTop);
  await page.mouse.move(
    (await list.boundingBox())!.x + 80,
    (await list.boundingBox())!.y + 80,
  );
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(scrolled);
  expect((await page.locator(".block-suggestion").boundingBox())!.height).toBe(
    box!.height,
  );
  await page.screenshot({
    path: `.audit/polish-slash-${info.project.name}.png`,
  });
  await page.keyboard.press("End");
  await expect(list.getByRole("option").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.type("h");
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(0);
  await expect(list.getByRole("option").first()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
});

test("mention options stay contained after scrolling and open the date form", async ({
  page,
}, info) => {
  const { current } = await navigatorFixture(page);
  const posts = Array.from({ length: 6 }, (_, i) => ({
    ...current,
    id: `abcdefghijk${i}`,
    title: `Reference ${i + 1}`,
    page: true,
  }));
  await page.route("**/api/admin/posts", (route) =>
    route.fulfill({ json: { posts } }),
  );
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("@");
  const list = page.getByRole("listbox", { name: "Mention a date or page" });
  await expect(list).toBeVisible();
  await list.hover();
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => list.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(y);
  await page.setViewportSize({
    width: info.project.name === "mobile" ? 390 : 1000,
    height: 500,
  });
  const menu = page.locator(".mention-suggestion");
  await page.evaluate(() => window.scrollBy(0, -100));
  await expect
    .poll(async () => (await menu.boundingBox())!.y)
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(async () => {
      const b = await menu.boundingBox();
      return b!.y + b!.height;
    })
    .toBeLessThanOrEqual(500);
  await page.screenshot({
    path: `.audit/polish-mention-${info.project.name}.png`,
  });
  await list.getByRole("option", { name: /Choose date and time/ }).click();
  await page.getByLabel("Date", { exact: true }).fill("2026-10-12");
  await page.getByLabel("Time (optional)", { exact: true }).fill("14:30");
  await page.getByRole("button", { name: "Insert date", exact: true }).click();
  await expect(body.locator(".mention-trigger")).toHaveAttribute(
    "aria-label",
    /14:30|2:30/,
  );
});

test("text appearance preserves selection through font color and opacity", async ({
  page,
}, info) => {
  if(info.project.name === "mobile") {
    // Mobile Chromium does not emulate desktop word-selection keys reliably.
    // Seed the native range that touch selection would create; exercise the UI below.
    await page.locator(".editor-body").evaluate((body)=>{
      (body as HTMLElement).focus();
      const text=body.querySelector("p")!.firstChild!;
      const range=document.createRange();range.setStart(text,0);range.setEnd(text,1);
      const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
  } else {
    await page.locator(".editor-body p").first().click({position:{x:4,y:8}});
    await page.keyboard.press("Home");
    await page.keyboard.press("Control+Shift+ArrowRight");
  }
  await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString().trim())).toBe("A");
  await page
    .getByRole("button", { name: "Text appearance: font, color and opacity" })
    .filter({ visible: true })
    .first()
    .click();
  const panel = page.locator(".color-panel");
  await expect(panel).toBeVisible();
  const height = await panel.evaluate((el) => el.clientHeight);
  await panel.getByRole("combobox", { name: "Font", exact: true }).click();
  await page.getByRole("option", { name: "Geist", exact: true }).click();
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((el) => el.clientHeight)).toBe(height);
  await panel.getByRole("button", { name: "Blue", exact: true }).click();
  await panel.getByRole("slider", { name: "Text opacity" }).focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 6; i++) await page.keyboard.press("PageUp");
  await panel.getByLabel("Hex text color").fill("#166534");
  await panel.getByLabel("Hex text color").press("Enter");
  await expect
    .poll(async () => (await panel.boundingBox())!.y)
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(async () => {
      const box = (await panel.boundingBox())!;
      return box.y + box.height;
    })
    .toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({
    path: `.audit/polish-appearance-${info.project.name}.png`,
  });
  await panel.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.locator(
      '.editor-body [style*="166534"], .editor-body [style*="22, 101, 52"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator('.editor-body [style*="opacity: 0.6"]'),
  ).toBeVisible();
});

test("heading icon has a staged preview and explicit completion", async ({
  page,
}, info) => {
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/heading");
  await page.getByRole("option", { name: /Heading with icon/ }).click();
  await page.keyboard.type("A heading");
  await page
    .getByRole("button", { name: "Edit heading icon", exact: true })
    .click();
  const panel = page.locator(".heading-icon-panel");
  await panel.getByLabel("Emoji or symbol").fill("★");
  await expect(panel.locator(".heading-icon-preview")).toContainText("★");
  await expect(body.locator(".heading-icon-trigger")).not.toContainText("★");
  await page.screenshot({
    path: `.audit/polish-heading-${info.project.name}.png`,
  });
  await panel.getByRole("button", { name: "Done", exact: true }).click();
  await expect(body.locator(".heading-icon-trigger")).toContainText("★");
  await body.locator(".heading-icon-trigger").click();
  await panel.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(body.locator(".heading-icon-trigger")).toHaveCount(0);
  await expect(body).toContainText("A heading");
});

test("outline exposes a heading icon upload and preserves the heading", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "The outline is shown in the desktop margin; mobile tests the same icon picker in the heading.",
  );
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("## First section");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("## Second section");
  const outline = page.getByRole("navigation", {
    name: "Outline",
    exact: true,
  });
  await expect(outline).toBeVisible();
  await outline
    .getByRole("button", { name: "First section", exact: true })
    .hover();
  const trigger = outline.getByRole("button", {
    name: "Customize icon for First section",
    exact: true,
  });
  await expect(trigger).toHaveCSS("opacity", "1");
  await trigger.click();
  await page.route("**/api/admin/uploads?*", (route) =>
    route.fulfill({ json: { src: "/avatar-96.webp", width: 96, height: 96 } }),
  );
  const panel = page.locator(".heading-icon-panel");
  await panel
    .getByLabel("Upload heading icon")
    .setInputFiles("public/avatar-96.webp");
  await expect(panel.locator(".heading-icon-preview img")).toHaveAttribute(
    "src",
    "/avatar-96.webp",
  );
  await panel.getByRole("button", { name: "Done", exact: true }).click();
  await expect(outline.locator("img")).toHaveAttribute(
    "src",
    "/avatar-96.webp",
  );
  await expect(
    body.locator("h2").filter({ hasText: "First section" }),
  ).toContainText("First section");
  await expect(panel).not.toBeVisible();
  await page.screenshot({ path: ".audit/polish-outline-desktop.png" });
});

test("move failure retains the destination and reduced motion removes popup transforms", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigatorFixture(page);
  await page.keyboard.press("Control+s");
  await expect(page.locator(".save-state")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await page.reload();
  await page.route(`**/api/admin/posts/${id}/parent`, (route) =>
    route.fulfill({
      status: 409,
      json: { error: "Another tab moved this page. Refresh and retry." },
    }),
  );
  await page.getByRole("button", { name: "Move page", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Move page", exact: true });
  await dialog.getByRole("button", { name: /Related page/ }).click();
  await dialog.getByRole("button", { name: "Move here", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Another tab moved");
  await expect(
    dialog.getByRole("button", { name: /Related page/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator(".editor-body p").first().click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Control+Shift+ArrowRight");
  await page
    .getByRole("button", { name: "Text appearance: font, color and opacity" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator(".color-panel")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page
    .locator(".color-panel")
    .getByRole("button", { name: "Done", exact: true })
    .click();
});

test("search sidebar exposes clickable references and replaces the selected match", async ({
  page,
}, info) => {
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Needle first.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Needle second.");
  await page.keyboard.press("Control+h");
  const search = page.getByRole("search", { name: "Find and replace" });
  await expect(search).toBeVisible();
  await search
    .getByRole("textbox", { name: "Find in this post", exact: true })
    .fill("Needle");
  const results = search.locator(".find-results button");
  await expect(results).toHaveCount(2);
  await results.last().click();
  await expect(results.last()).toHaveAttribute("aria-current", "true");
  await search
    .getByRole("textbox", { name: "Replace with", exact: true })
    .fill("Thread");
  await search.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(body).toContainText("Needle first.");
  await expect(body).toContainText("Thread second.");
  await page.screenshot({
    path: `.audit/workspace-search-${info.project.name}.png`,
  });
});

test("folder CRUD supports page moves without changing its parent hierarchy", async ({
  page,
}, info) => {
  await navigatorFixture(page);
  let value: Folders = { folders: [], assignments: {} };
  let base = 0;
  await page.route("**/api/admin/folders", (route) => {
    if (route.request().method() === "PUT") {
      value = changeFolders(value, route.request().postDataJSON().action);
      base++;
    }
    return route.fulfill({ json: { value, base: String(base) } });
  });
  const dialog = await openNavigator(page);
  await dialog.getByText("Folders", { exact: true }).click();
  const folders = dialog.getByRole("region", { name: "Folders" });
  await folders.getByRole("textbox", { name: "Folder name" }).fill("Research");
  await folders.getByRole("button", { name: "Create", exact: true }).click();
  await expect(
    folders.getByRole("button", { name: "Research", exact: true }),
  ).toBeVisible();
  if (info.project.name === "desktop")
    await folders
      .locator(".folder-page")
      .filter({ hasText: "Related page" })
      .dragTo(folders.getByRole("button", { name: "Research", exact: true }));
  else {
    await folders
      .getByRole("combobox", { name: "Folder for Related page", exact: true })
      .click();
    await page.getByRole("option", { name: "Research", exact: true }).click();
  }
  await folders.getByRole("button", { name: "Research", exact: true }).click();
  await expect(folders.locator(".folder-page")).toContainText("Related page");
  await folders
    .getByRole("button", { name: "Rename Research", exact: true })
    .click();
  await folders.getByRole("textbox", { name: "Folder name" }).fill("Reading");
  await folders.getByRole("button", { name: "Save", exact: true }).click();
  await page.screenshot({
    path: `.audit/workspace-folders-${info.project.name}.png`,
  });
  await folders
    .getByRole("button", { name: "Delete folder Reading", exact: true })
    .click();
  await expect(
    folders.locator(".folder-page").filter({ hasText: "Related page" }),
  ).toBeVisible();
  expect(value.assignments).toEqual({});
});

test("media gallery list details and trash preserve asset URLs", async ({
  page,
}, info) => {
  let asset = {
    src: "/avatar-96.webp",
    size: 1024,
    type: "image/webp",
    uploadedAt: "2026-09-29T00:00:00Z",
    usedIn: [],
    title: "Portrait", digest:"same",
    alt: "",
    trashed: false,
    base: "v1",
  };
  await page.route("**/api/admin/media", (route) => {
    if (route.request().method() === "PUT") {
      asset = { ...asset, ...route.request().postDataJSON(), base: "v2" };
      return route.fulfill({ json: { base: "v2" } });
    }
    return route.fulfill({
      json: {
        assets: [
          asset,
          {
            ...asset,
            src: "/avatar-128.webp",
            title: "Duplicate",
            digest: "same",
          },
        ],
        cursor: null,
      },
    });
  });
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Media library", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Media library",
    exact: true,
  });
  await expect(dialog.locator(".asset-card")).toHaveCount(1);
  await dialog.getByRole("button", { name: "List view" }).click();
  await expect(dialog.locator(".asset-grid")).toHaveAttribute(
    "data-view",
    "list",
  );
  await dialog
    .getByRole("button", { name: "Details", exact: true })
    .first()
    .click();
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Author portrait");
  await dialog
    .getByRole("textbox", { name: "Default alt text" })
    .fill("Author portrait");
  await dialog.getByRole("button", { name: "Save details" }).click();
  await expect(dialog).toContainText("Author portrait");
  await dialog
    .getByRole("button", { name: "Move asset to trash" })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Trash", exact: true }).click();
  await expect(dialog.locator(".asset-card")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Restore asset" }).click();
  await expect(dialog.locator(".asset-card")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Trash", exact: true }).click();
  await page.screenshot({
    path: `.audit/workspace-media-${info.project.name}.png`,
  });
  expect(asset.src).toBe("/avatar-96.webp");
});

test("editable shortcuts persist reject collisions and trigger their editor action", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.keyboard.press("Control+s");
  await expect(page.locator(".save-state")).toHaveAttribute("data-status", "saved");
  await page.goto("/admin/shortcuts");
  const field = page.getByRole("textbox", {
    name: "Find in page shortcut",
    exact: true,
  });
  await field.press("Control+s");
  await expect(page.locator(".shortcuts-page").getByRole("alert")).toContainText("already assigned");
  await field.press("Control+Shift+f");
  await expect(field).toHaveValue("Mod+Shift+f");
  await page.reload();
  await expect(field).toHaveValue("Mod+Shift+f");
  await page.screenshot({
    path: `.audit/workspace-shortcuts-${info.project.name}.png`,
  });
  await page.goto(`/admin?post=${id}`);
  await page.getByRole("textbox", { name: "Body", exact: true }).click();
  await page.keyboard.press("Control+Shift+f");
  await expect(
    page.getByRole("search", { name: "Find and replace" }),
  ).toBeVisible();
});
