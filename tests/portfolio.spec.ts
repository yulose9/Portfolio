import { test, expect } from "@playwright/test";

test("hero is server-rendered and uses responsive optimized images", async ({ request, page }) => {
  const response = await request.get("/");
  const html = await response.text();
  expect(html).toContain('<main id="main-content"');
  expect(html).toContain('alt="John Nazarene Dela Pisa"');
  await page.goto("/");
  await expect(page.locator("#home h1:visible")).toBeVisible();
  expect(await page.locator("#home img:visible").first().getAttribute("srcset")).toContain("/optimized/");
  expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");
});

test("menu closes with Escape, restores focus and keeps navigation usable", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById("about-mobile")!.getBoundingClientRect().top))).toBeLessThan(50);
});

test("photo dialog returns focus and scroll position after closing", async ({ page }) => {
  await page.goto("/");
  const photo = page.getByRole("button", { name: "Enlarge About 1", exact: true }).filter({ visible: true });
  await photo.scrollIntoViewIfNeeded();
  await photo.click();
  const position = await page.evaluate(() => window.scrollY);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(photo).toBeFocused();
  expect(Math.abs(await page.evaluate(() => window.scrollY) - position)).toBeLessThan(5);
});

test("swiping certificates scrolls the page and does not leave a lock", async ({ page, context }) => {
  await page.goto("/");
  const card = page.getByRole("link", { name: "View Azure Fundamentals" }).filter({ visible: true });
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const start = await page.evaluate(() => scrollY);
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height - 20, 150);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  // A long hold must not activate the removed drag behavior or lock scrolling.
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - i * 20 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(start + 30);
  expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");
});

test("layout fits narrow phones, tablets and laptops", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const title = await page.locator("#home h1:visible").boundingBox();
    expect(title!.x).toBeGreaterThanOrEqual(-1);
    expect(title!.x + title!.width).toBeLessThanOrEqual(width + 1);
  }
});

test("contact links are actionable and reduced-motion navigation works", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('a[href="mailto:jannazarene09@gmail.com"]:visible').first()).toHaveAttribute("href", "mailto:jannazarene09@gmail.com");
  await expect(page.locator('a[href="tel:+639454178422"]:visible')).toHaveCount(1);
  await page.getByRole("button", { name: "Scroll to portfolio" }).click();
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById("portfolio")!.getBoundingClientRect().top))).toBeLessThan(30);
});
