import { test, expect } from "@playwright/test";
import website from "../../content/website.json";
test.use({ actionTimeout: 15000 });
const browserErrors = new WeakMap<import("@playwright/test").Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/admin/posts", route => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/admin/projects/posts", route => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/admin/website", route => route.fulfill({ json: { content: website, version: null, source: JSON.stringify(website) } }));
  await page.route("**/api/admin/me", route => route.fulfill({ json: { email: "owner@example.com", github: true, storage: true } }));
  await page.route("**/api/admin/analytics?**", route => route.fulfill({ json: { configured: false } }));
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });
test("dashboard follows the existing dark theme", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("nazarene-theme", "dark"));
  await page.goto("/admin?section=website");
  await expect(page.getByRole("heading", { name: "Website", exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".control-shell")).toHaveCSS("background-color", "rgb(25, 25, 25)");
  await expect(page.locator("body")).not.toHaveAttribute("data-mode", "light");
  await expect(page.getByLabel("Name", { exact: true })).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.screenshot({ path: info.outputPath("website-dark.png"), fullPage: true });
});
async function navigate(page: import("@playwright/test").Page, name: string) {
  if (await page.getByRole("button", { name: "Toggle navigation" }).isVisible()) await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("button", { name, exact: true }).click();
}
test("overview has an honest setup state and accessible destination navigation", async ({ page }, info) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Your analytics, in one place.")).toBeVisible();
  await navigate(page, "Analytics");
  await expect(page).toHaveURL(/section=analytics/);
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("analytics-setup.png"), fullPage: true });
});
test("website edits autosave privately and require publication review", async ({ page }, info) => {
  let draft = { content: structuredClone(website), version: "one", source: JSON.stringify(website) };
  let published = 0;
  await page.route("**/api/admin/website", async route => {
    if (route.request().method() === "PUT") { const input = route.request().postDataJSON(); expect(input.base).toBe(draft.version); draft = { ...draft, content: input.content, version: "two" }; }
    if (route.request().method() === "POST") published++;
    await route.fulfill({ json: draft });
  });
  await page.goto("/admin?section=website");
  // An empty flush must not leave the autosave promise permanently occupied.
  await page.getByRole("button", { name: "Review changes" }).click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Portfolio Owner");
  await expect(page.getByRole("status")).toHaveText("Saved privately");
  expect(published).toBe(0);
  await page.getByRole("button", { name: "Review changes" }).click();
  await expect(page.getByRole("region", { name: "Review website publication" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("website-editing.png"), fullPage: true });
  expect(draft.content.profile.name).toBe("Portfolio Owner");
});
test("project listing uses its own API namespace", async ({ page }) => {
  await page.route("**/api/admin/projects/posts", route => route.fulfill({ json: { posts: [] } }));
  await page.goto("/admin?section=projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Make room for your best work.")).toBeVisible();
});
