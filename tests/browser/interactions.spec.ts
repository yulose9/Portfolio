import { test, expect } from "@playwright/test";

/*
 * The site's interaction contract: keyboard reach, focus return, the tabs'
 * URL, and the sound switch. Desktop only: these are pointer-and-keyboard
 * behaviours, and the phone layout is covered by its own specs.
 */
test.skip(({ isMobile }) => isMobile, "keyboard and pointer behaviours");

test("tabs write the hash, and the hash opens the tab", async ({ page }) => {
  await page.goto("/");
  const work = page.getByRole("button", { name: "Work", exact: true });
  await work.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#work$/);
  await expect(work).toHaveAttribute("aria-current", "true");

  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(page).not.toHaveURL(/#/);

  await page.goto("/#writing");
  await expect(page.getByRole("button", { name: "Writing", exact: true })).toHaveAttribute("aria-current", "true");
});

test("the sound switch flips, persists and says what it will do", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Mute interface sounds" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  const unmute = page.getByRole("button", { name: "Unmute interface sounds" });
  await expect(unmute).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("nazarene-sound-muted"))).toBe("1");

  await page.reload();
  await expect(page.getByRole("button", { name: "Unmute interface sounds" })).toBeVisible();
  await page.getByRole("button", { name: "Unmute interface sounds" }).click();
});

test("the shiba is a button a keyboard can pet", async ({ page }) => {
  await page.goto("/");
  const shiba = page.locator("button.shiba");
  await expect(shiba).toBeVisible();
  const asleep = (await shiba.getAttribute("aria-disabled")) === "true";
  await shiba.focus();
  await page.keyboard.press("Enter");
  if (asleep) await expect(shiba).not.toHaveAttribute("data-happy");
  else await expect(shiba).toHaveAttribute("data-happy");
});

test("pressing controls never throws, sound layer included", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const name of ["Work", "Projects", "Writing", "About"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  expect(errors).toEqual([]);
});
