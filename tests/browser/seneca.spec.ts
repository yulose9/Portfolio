import { test, expect } from "@playwright/test";
import website from "../../content/website.json";

test.use({ actionTimeout: 15000 });

type Page = import("@playwright/test").Page;

async function setHorizonTime(page: Page, label: string, time: string) {
  const [hour, minute] = time.split(':').map(Number);
  for (const [part, value] of [['hour', String(hour % 12 || 12).padStart(2, '0')], ['minute', String(minute).padStart(2, '0')], ['period', hour >= 12 ? 'PM' : 'AM']]) {
    await page.getByRole('combobox', { name: `${label} ${part}`, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  }
}

// Below 900px the five views live in the bottom tab bar instead of the top tab strip
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 900;
const tabFor = (page: Page, name: string) =>
  isPhone(page)
    ? page.getByRole("navigation", { name: "Seneca views" }).getByRole("button", { name, exact: true })
    : page.getByRole("tab", { name });
const expectTab = (page: Page, name: string, options?: { timeout?: number }) =>
  isPhone(page)
    ? expect(tabFor(page, name)).toHaveAttribute("aria-current", "page", options)
    : expect(tabFor(page, name)).toHaveAttribute("aria-selected", "true", options);

const browserErrors = new WeakMap<import("@playwright/test").Page, string[]>();

test('horizon shows every scheduled habit in full and compact views', async ({ page }, info) => {
  await page.addInitScript(() => {
    const sample = [
      ['Sleep', 1380, 420, 'sage'], ['Morning walk', 420, 465, 'apricot'],
      ['Read a chapter', 480, 510, 'butter'], ['Deep work', 540, 720, 'sage'],
      ['Learn something new', 780, 870, 'coral'], ['Workout', 1080, 1140, 'apricot'],
    ];
    localStorage.setItem('seneca_time_blocks', JSON.stringify(Object.fromEntries(sample.map(([title, start, end, tone], index) => [String(index), { id: String(index), category: 'personal', title, start, end, tone, taskKey: '' }]))));
  });
  await page.goto('/admin?section=seneca');
  const horizon = page.getByRole('region', { name: 'Your daily rhythm', exact: true });
  await expect(horizon.locator('.hz-row')).toHaveCount(6);
  await horizon.screenshot({ path: info.outputPath('horizon-six-habits.png') });
  await horizon.getByRole('button', { name: 'Compact timeline' }).click();
  await expect(horizon.locator('.hz-compact-track')).toHaveCount(1);
  await expect(horizon.locator('.hz-row')).toHaveCount(0);
  await expect(horizon.locator('.hz-compact-block')).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await horizon.screenshot({ path: info.outputPath('horizon-six-habits-compact-dark.png') });
});

test('horizon drag from protocol, resize, cancel, and keyboard changes persist', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Mouse path; touch has a separate test');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin?section=seneca');
  const horizon = page.getByRole('region', { name: 'Your daily rhythm', exact: true });
  await expect(horizon.getByRole('button', { name: /Protocol tasks without a time/ })).toHaveAttribute('aria-expanded', 'true');
  const grip = horizon.getByRole('button', { name: 'Drag Pray onto timeline', exact: true });
  await grip.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const origin = await grip.boundingBox();
  const track = await horizon.locator('.hz-row-track').boundingBox();
  if (!origin || !track) throw new Error('Timeline not laid out');
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width / 3, track.y + 25, { steps: 12 });
  await expect(horizon.locator('.is-preview')).toHaveCount(1);
  await page.mouse.up();
  await expect(horizon.locator('.hz-row:not(.hz-empty-row)')).toHaveCount(1);
  const reschedule = horizon.getByRole('button', { name: 'Reschedule Pray onto timeline' });
  await reschedule.scrollIntoViewIfNeeded();
  const pill = await reschedule.boundingBox();
  const destination = await horizon.locator('.hz-row-track').boundingBox();
  if (!pill || !destination) throw new Error('Missing scheduled pill');
  const firstSaved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('seneca_time_blocks') || '{}')).filter(Boolean) as { id: string; start: number; end: number }[]);
  await page.mouse.move(pill.x + pill.width / 2, pill.y + pill.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 5, destination.y + 25, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => {
    const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('seneca_time_blocks') || '{}')).filter(Boolean) as { id: string; start: number; end: number }[]);
    return saved.length === 1 && saved[0].id === firstSaved[0].id && saved[0].start !== firstSaved[0].start && saved[0].end - saved[0].start === 30;
  }).toBe(true);
  await horizon.getByRole('button', { name: /Protocol tasks without a time/ }).click();
  const read = () => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('seneca_time_blocks') || '{}')).filter(Boolean) as { start: number; end: number }[]);
  const before = (await read())[0];
  const end = horizon.getByRole('button', { name: 'Resize end of Pray' });
  await end.scrollIntoViewIfNeeded();
  const box = await end.boundingBox();
  const ruler = await horizon.locator('.hz-ruler').boundingBox();
  if (!box || !ruler) throw new Error('Missing resize handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + ruler.width / 24, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await read())[0].end).toBe(before.end + 60);
  const moved = horizon.getByRole('button', { name: /^Move Pray,/ });
  await moved.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await read())[0].start).toBe(before.start + 5);
  const saved = (await read())[0];
  const mb = await moved.boundingBox();
  if (!mb) throw new Error('Missing block');
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await page.mouse.down();
  await page.mouse.move(mb.x + mb.width / 2 + 30, mb.y + mb.height / 2, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await read())[0]).toEqual(saved);
  await horizon.getByRole('button', { name: 'Compact timeline' }).click();
  await expect(horizon).toHaveClass(/is-compact/);
  await page.reload();
  await expect(horizon).toHaveClass(/is-compact/, { timeout: 30000 });
  expect((await read())[0]).toEqual(saved);
  await horizon.getByRole('button', { name: 'Expand timeline' }).click();
  await horizon.locator('.hz-ruler').scrollIntoViewIfNeeded();
  const axis = await horizon.locator('.hz-ruler').boundingBox();
  if (!axis) throw new Error('Missing ruler');
  await page.mouse.move(axis.x + axis.width / 3, axis.y + 10);
  await expect(horizon.locator('.hz-readout')).toContainText('8 AM');
  await expect(horizon.locator('.hz-inspect-line').first()).toBeVisible();
  await horizon.screenshot({ path: info.outputPath('horizon-gantt.png') });
});

test('horizon touch resize and narrow layout', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Touch viewport only');
  await page.addInitScript(() => localStorage.setItem('seneca_time_blocks', JSON.stringify({ touch: { id: 'touch', category: 'personal', title: 'Early focus', start: 60, end: 180, taskKey: '', tone: 'apricot' } })));
  await page.goto('/admin?section=seneca');
  const horizon = page.getByRole('region', { name: 'Your daily rhythm', exact: true });
  const handle = horizon.getByRole('button', { name: 'Resize end of Early focus' });
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  const ruler = await horizon.locator('.hz-ruler').boundingBox();
  if (!box || !ruler) throw new Error('Missing touch handle');
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 6; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + ruler.width / 24 * step / 6, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('seneca_time_blocks') || '{}').touch.end)).toBe(240);
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await horizon.getByRole('button', { name: 'Compact timeline' }).click();
  await horizon.screenshot({ path: info.outputPath('horizon-compact-mobile.png') });
});

test('horizon links protocol completion and keeps short overlapping blocks accessible', async ({ page }, info) => {
  await page.goto('/admin?section=seneca');
  const horizon = page.getByRole('region', { name: 'Your daily rhythm' });
  await horizon.getByRole('button', { name: 'Plan time', exact: true }).click();
  await page.getByRole('combobox', { name: 'Activity', exact: true }).click();
  await page.getByRole('option', { name: 'Pray', exact: true }).click();
  await setHorizonTime(page, 'Starts', '08:00');
  await setHorizonTime(page, 'Ends', '08:05');
  await page.getByRole('button', { name: 'Save time block' }).click();
  await horizon.getByRole('button', { name: /Daily agenda/ }).click();
  const done = horizon.getByRole('checkbox', { name: 'Complete Pray', exact: true });
  await done.click();
  await expect(done).toHaveAttribute('aria-checked', 'true');
  await expect(horizon.locator('.sn-time-block.is-done')).toHaveCount(1);
  await done.click();
  await expect(done).toHaveAttribute('aria-checked', 'false');
  await horizon.getByRole('button', { name: 'Plan time', exact: true }).click();
  await page.getByLabel('Block name', { exact: true }).fill('Morning focus');
  await setHorizonTime(page, 'Starts', '08:00');
  await setHorizonTime(page, 'Ends', '10:00');
  await page.getByRole('button', { name: 'Save time block' }).click();
  await expect(horizon.getByText('0h 5m overlapping')).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await horizon.screenshot({ path: info.outputPath('horizon-dark.png') });
});

test('day horizon saves, edits, and removes an overnight routine without page overflow', async ({ page }, info) => {
  test.setTimeout(90000);
  await page.goto('/admin?section=seneca');
  const horizon = page.getByRole('region', { name: 'Your daily rhythm' });
  await expect(horizon).toBeVisible({ timeout: 30000 });
  await horizon.getByRole('button', { name: 'Plan time', exact: true }).click();
  await page.getByLabel('Block name', { exact: true }).fill('Sleep and recover');
  await setHorizonTime(page, 'Starts', '23:00');
  await setHorizonTime(page, 'Ends', '07:00');
  await page.getByRole('button', { name: 'Save time block' }).click();
  await expect(horizon.locator('.hz-stats')).toContainText('Left open');
  await page.reload();
  await expect(horizon.getByRole('button', { name: /Move Sleep and recover/ }).first()).toBeVisible({ timeout: 30000 });
  await horizon.getByRole('button', { name: /Daily agenda/ }).click();
  await horizon.getByRole('button', { name: 'Edit block Sleep and recover', exact: true }).click();
  await page.getByLabel('Block name', { exact: true }).fill('Night rest');
  await page.getByRole('button', { name: 'Save time block' }).click();
  await expect(horizon.getByText('Night rest', { exact: true }).last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('horizon.png'), fullPage: false });
  await horizon.getByRole('button', { name: 'Edit block Night rest', exact: true }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.reload();
  await expect(horizon.getByText('Drop a habit here, or choose Plan time.')).toBeVisible({ timeout: 30000 });
});

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem("seneca_local_session", "true");
  });

  // Mock Admin API
  await page.route("**/api/admin/posts", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/admin/projects/posts", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/admin/website", (route) =>
    route.fulfill({ json: { content: website, version: null, source: JSON.stringify(website) } })
  );
  await page.route("**/api/admin/me", (route) =>
    route.fulfill({ json: { email: "owner@example.com", github: true, storage: true } })
  );
  await page.route("**/api/admin/analytics?**", (route) => route.fulfill({ json: { configured: false } }));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test("seneca workspace renders cleanly inside admin dashboard with cloudflare styling", async ({ page }, info) => {
  await page.goto("/admin?section=seneca");

  // Seneca workspace header and cloud sync badge should be visible
  await expect(page.getByRole("heading", { name: "Seneca" }).first()).toBeVisible({ timeout: 30000 });
  // Local session: the badge says so honestly instead of claiming cloud sync
  await expect(page.getByRole("status").filter({ hasText: "On this device only" })).toBeVisible();

  // Seneca tabs should be visible in the toolbar
  const homeTab = tabFor(page, "Home");
  const protocolTab = tabFor(page, "Protocol");
  const growthTab = tabFor(page, "Growth");
  const wealthTab = tabFor(page, "Wealth");
  const journalTab = tabFor(page, "Journal");

  await expect(homeTab).toBeVisible();
  await expect(protocolTab).toBeVisible();
  await expect(growthTab).toBeVisible();
  await expect(wealthTab).toBeVisible();
  await expect(journalTab).toBeVisible();

  // Switch between tabs
  await protocolTab.click();
  await expect(page.getByRole("heading", { name: /Protocol/i })).toBeVisible();

  await growthTab.click();
  await expect(page.getByRole("heading", { name: /Growth/i })).toBeVisible();

  await wealthTab.click();
  await expect(page.getByRole("heading", { name: /Wealth/i })).toBeVisible();

  // The development indicator overlaps the far-right edge on phones.
  await journalTab.click({ position: { x: 12, y: 20 } });
  await expect(page.getByRole("heading", { name: /Journal/i })).toBeVisible();

  await page.screenshot({ path: info.outputPath("seneca-workspace.png"), fullPage: true });
});

test("seneca tabs are history entries: Back and Forward walk through them and reloads keep the tab", async ({ page }) => {
  await page.goto("/admin?section=seneca");
  await expect(page.getByRole("heading", { name: /Happy/ })).toBeVisible({ timeout: 30000 });
  await expect(page).toHaveURL(/view=home/);

  // "View details" on Today's protocol is an in-app link to the Protocol tab
  await page.getByRole("region", { name: "Today's protocol" }).getByRole("button", { name: "View details" }).click();
  await expectTab(page, "Protocol");
  await expect(page).toHaveURL(/view=protocol/);

  await tabFor(page, "Wealth").click();
  await expect(page).toHaveURL(/view=wealth/);

  await page.goBack();
  await expectTab(page, "Protocol");
  await page.goBack();
  await expect(page.getByRole("heading", { name: /Happy/ })).toBeVisible();
  await page.goForward();
  await expectTab(page, "Protocol");

  await page.reload();
  await expectTab(page, "Protocol", { timeout: 30000 });
});

test("seneca home dashboard: tasks tick from Home and the calendar pages through months", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-10-08T04:00:00Z'));
  await page.addInitScript(() => {
    const history: Record<string, Record<string, boolean>> = {};
    for (const phase of ['morningIgnition', 'arena', 'maintenance', 'shutdown']) {
      for (let id = 1; id <= 40; id++) history[`${phase}-${id}`] = { '2026-10-01': true, '2026-10-02': phase === 'morningIgnition' };
    }
    localStorage.setItem('protocol_task_history', JSON.stringify(history));
  });
  await page.goto("/admin?section=seneca");
  await expect(page.getByRole("heading", { name: /Happy/ })).toBeVisible({ timeout: 30000 });

  // Every section of the desk layout is present
  for (const name of ["Weather", "Today's protocol", "Keep going", "Analytics"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  // Next month is disabled on the current month; back then forward again
  const next = page.getByRole("button", { name: "Next month" });
  await expect(next).toBeDisabled();
  const month = page.locator("#sn-month .sn-month-name");
  const current = (await month.textContent())?.trim() ?? "";
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(month).not.toHaveText(current);
  await expect(next).toBeEnabled();
  await next.click();
  await expect(month).toHaveText(current);

  // Ticking a task on Home flips it, and the Protocol tab agrees
  const pray = page.getByRole("checkbox", { name: /^Pray/ });
  await expect(pray).toHaveAttribute("aria-checked", "false");
  await pray.click();
  await expect(pray).toHaveAttribute("aria-checked", "true");
  const calendar = page.locator('section[aria-labelledby="sn-month"]');
  await expect(calendar.locator('.sn-day.is-full .sn-day-pie.is-complete')).toHaveCount(1);
  await expect(calendar.locator('.sn-day.is-partial .sn-day-pie')).toHaveCount(1);
  await expect(calendar.locator('.sn-day.is-today .sn-day-pie')).toHaveCount(1);
  await calendar.screenshot({ path: info.outputPath('calendar-pies.png'), style: '.control-topbar,.sn-tabbar,nextjs-portal{visibility:hidden!important}' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await calendar.locator('.sn-day.is-today').evaluate(el => getComputedStyle(el, '::before').animationName)).toBe('none');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await calendar.screenshot({ path: info.outputPath('calendar-pies-dark.png'), style: '.control-topbar,.sn-tabbar,nextjs-portal{visibility:hidden!important}' });
  await tabFor(page, "Protocol").click();
  await expect(page.locator(".ios-checkbox.checked")).toHaveCount(1);
  await tabFor(page, "Home").click();

  // New task opens the add-task sheet without leaving Home
  await page.getByRole("button", { name: "New task" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Happy/ })).toBeVisible();
});

test("finishing a phase on Home celebrates, then brings in the next phase", async ({ page }) => {
  await page.goto("/admin?section=seneca");
  const todos = page.getByRole("region", { name: "Today's protocol" });
  await expect(todos.getByRole("checkbox").first()).toBeVisible({ timeout: 30000 });
  // Tick exactly this phase's open tasks; the next phase arrives after the cheer
  const open = todos.locator('[role="checkbox"][aria-checked="false"]');
  const count = await open.count();
  for (let i = 0; i < count; i++) await open.first().click();

  await expect(todos.getByRole("status")).toContainText("Morning Ignition done");
  await todos.getByRole("button", { name: /Next up: The Arena/ }).click();
  await expect(todos.getByText("The Arena")).toBeVisible();
  await expect(todos.getByRole("checkbox", { name: /^Reflect on your day/ })).toBeVisible();
});

test("keep going goals can be edited from Home, and a goal links into Growth", async ({ page }) => {
  await page.goto("/admin?section=seneca");
  const card = page.getByRole("region", { name: "Keep going" });
  await expect(card.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 30000 });

  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: /^Edit No Porn/ }).click();
  const name = page.getByRole("dialog").getByLabel("Name");
  await name.fill("No doomscrolling");
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "One day more" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await expect(card.getByText("No doomscrolling")).toBeVisible();
  await card.getByRole("button", { name: /No doomscrolling: open in Growth/ }).click();
  await expect(page).toHaveURL(/view=growth/);
  await expect(page.locator('[data-nav-focus="goal-noPorn"]')).toBeInViewport();
  await expect(page.locator('[data-nav-focus="goal-noPorn"]')).toContainText("No doomscrolling");
});

test('goal manager reorders, uploads an icon, picks a date and saves an animated streak', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  test.setTimeout(90000);
  const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  await page.route('**/api/admin/uploads?**', route => route.fulfill({ json: { src: icon } }));
  await page.goto('/admin?section=seneca');
  const card = page.getByRole('region', { name: 'Keep going', exact: true });
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  const manager = page.getByRole('dialog', { name: 'Keep going on Home' });
  const grip = manager.getByRole('button', { name: 'Reorder Exercise', exact: true });
  await grip.focus();
  await page.keyboard.press('ArrowUp');
  await expect(manager.locator('.sn-manage-row').first()).toContainText('Exercise');
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(manager.locator('.sn-manage-row').first()).toContainText('Exercise');
  {
    const handle = manager.getByRole('button', { name: 'Reorder Exercise' });
    await handle.click({ trial: true });
    const from = await handle.boundingBox();
    const target = await manager.locator('.sn-manage-row').last().boundingBox();
    if (!from || !target) throw new Error('Missing reorder rows');
    if (info.project.name === 'desktop') {
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2, target.y + target.height, { steps: 25 });
      await expect(manager.locator('.sn-manage-row').first()).toContainText('No Porn');
      await page.mouse.up();
    } else {
      const client = await page.context().newCDPSession(page);
      const x = from.x + from.width / 2, y = from.y + from.height / 2;
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 12; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (target.y + target.height - y) * step / 12 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await expect(manager.locator('.sn-manage-row').first()).toContainText('No Porn');
  }
  await manager.screenshot({ path: info.outputPath('goal-manager.png') });
  await manager.getByRole('button', { name: 'New goal', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'New goal', exact: true });
  await editor.getByLabel('Name', { exact: true }).fill('A little fresh air');
  await editor.getByRole('button', { name: 'Choose emoji, icon or upload' }).click();
  await editor.getByRole('tab', { name: 'Custom', exact: true }).click();
  await editor.locator('input[type=file]').setInputFiles({ name: 'leaf.png', mimeType: 'image/png', buffer: Buffer.from(icon.split(',')[1], 'base64') });
  await expect(editor.locator('.sn-goal-face img')).toHaveAttribute('src', icon);
  await editor.getByRole('button', { name: 'Tracking since', exact: true }).click();
  await expect(editor.locator('.ki-calendar')).toBeVisible();
  await editor.locator('.ki-calendar button').filter({ hasText: /^1$/ }).first().click();
  await editor.getByRole('button', { name: /Streak in days:/ }).click();
  await editor.getByRole('spinbutton', { name: 'Streak in days' }).fill('99');
  await editor.getByRole('spinbutton', { name: 'Streak in days' }).press('Escape');
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: /Streak in days: 0/ })).toBeVisible();
  await editor.getByRole('button', { name: /Streak in days:/ }).click();
  await editor.getByRole('spinbutton', { name: 'Streak in days' }).fill('9');
  await editor.getByRole('spinbutton', { name: 'Streak in days' }).press('Enter');
  await editor.getByRole('button', { name: 'One day more' }).click();
  await expect(editor.getByRole('button', { name: /Streak in days: 10/ })).toBeVisible();
  await editor.screenshot({ path: info.outputPath('goal-editor.png') });
  expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await editor.getByRole('button', { name: 'Add goal', exact: true }).click();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('personal_goals_config') || '{}')).find((g: any) => g.title === 'A little fresh air') as { iconSrc: string; startDate: string });
  expect(saved.iconSrc).toBe(icon);
  expect(saved.startDate).toMatch(/-01$/);
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(manager.locator('.sn-manage-row').first()).toContainText('No Porn');
  await manager.getByRole('button', { name: 'Edit A little fresh air', exact: true }).click();
  await expect(page.getByRole('button', { name: /Streak in days: 10/ })).toBeVisible();
});

test('study controls and prominent life circles work on desktop and phones', async ({ page }, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const thisYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()));
  await page.addInitScript(() => {
    const year = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date());
    if (!localStorage.getItem('study_goal_active')) localStorage.setItem('study_goal_active', JSON.stringify({ id: 'test-study', name: 'Cloud certification', target: `Dec ${year}`, routeWeeks: 2 }));
  });
  await page.goto('/admin?section=seneca');
  const life = page.getByRole('region', { name: 'Life calendar', exact: true });
  await expect(life.locator('.sn-life-grid>span')).toHaveCount(90, { timeout: 30000 });
  expect((await life.locator('.sn-life-grid>span').first().boundingBox())!.width).toBeGreaterThan(20);
  await life.screenshot({ path: info.outputPath('life-circles.png'), style: '.control-topbar,.sn-tabbar,nextjs-portal{visibility:hidden!important}' });
  await page.getByRole('button', { name: 'Edit study goal', exact: true }).click({ timeout: 30000 });
  const sheet = page.getByRole('dialog', { name: 'Edit study goal', exact: true });
  await sheet.getByRole('combobox', { name: 'Target month' }).click();
  await page.getByRole('option', { name: 'March', exact: true }).click();
  await sheet.getByRole('button', { name: 'Year later' }).click();
  await expect(sheet.getByRole('button', { name: `Year: ${thisYear + 1}. Edit number` })).toBeVisible();
  await sheet.getByRole('button', { name: `Year: ${thisYear + 1}. Edit number` }).click();
  await sheet.getByRole('spinbutton', { name: 'Year', exact: true }).fill(String(thisYear + 4));
  await sheet.getByRole('spinbutton', { name: 'Year', exact: true }).press('Enter');
  await sheet.getByRole('button', { name: 'One day more' }).click();
  await expect(sheet.getByRole('button', { name: 'Streak in days: 1. Edit number' })).toContainText('day');
  await sheet.getByRole('button', { name: 'One day more' }).click();
  await sheet.getByRole('button', { name: '4 weeks', exact: true }).click();
  await sheet.screenshot({ path: info.outputPath('study-controls.png'), style: 'nextjs-portal{visibility:hidden!important}' });
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Edit study goal', exact: true }).click({ timeout: 30000 });
  await expect(sheet.getByRole('combobox', { name: 'Target month' })).toContainText('March');
  await expect(sheet.getByRole('button', { name: `Year: ${thisYear + 4}. Edit number` })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Streak in days: 2. Edit number' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: '4 weeks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await sheet.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.sn-scrim')).toHaveCount(0);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await life.screenshot({ path: info.outputPath('life-circles-dark-mobile.png'), style: '.control-topbar,.sn-tabbar,nextjs-portal{visibility:hidden!important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("an empty study goal sends you to certifications; the export dialog covers the whole screen", async ({ page }) => {
  await page.goto("/admin?section=seneca");
  await expect(page.getByRole("button", { name: "Export data" })).toBeVisible({ timeout: 30000 });

  // Export: the dialog and its scrim live on <body>, not inside a card
  await page.getByRole("button", { name: "Export data" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Edge to edge, including the reserved scrollbar gutter
  const scrim = await page.locator(".sn-scrim").first().boundingBox();
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  expect(Math.round(scrim?.width ?? 0)).toBe(viewport.width);
  expect(Math.round(scrim?.height ?? 0)).toBe(viewport.height);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Choose a certification", exact: true }).click();
  await expect(page).toHaveURL(/view=growth/);
  await expect(page.locator('[data-nav-focus="certifications"]')).toBeInViewport();
});

test("journal works like Writing: write an entry, edit it in place, and Back returns to the list", async ({ page }) => {
  await page.goto("/admin?section=seneca&view=journal");
  const create = page.getByRole("button", { name: "New entry" }).first();
  await expect(create).toBeVisible({ timeout: 30000 });

  await create.click();
  await expect(page).toHaveURL(/entry=new/);
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Evening review");
  await page.locator(".sn-doc-editor .ProseMirror").click();
  await page.keyboard.type("Kept the protocol and walked at dusk.");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("dialog", { name: "Journal logged" })).toBeVisible();
  await page.getByRole("button", { name: "Read the entry" }).click();

  // Existing entries save as you type
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Evening review, revised");
  await expect(page.locator(".sn-doc-saved")).toHaveText("Saved");

  // Back closes the entry (not into a blank "new" page) and the list shows the edit
  await page.goBack();
  await expect(page).not.toHaveURL(/entry=/);
  const row = page.getByRole("button", { name: /Evening review, revised/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Today");
  await expect(row).toContainText("7 words");
});

test("goals can be hidden from Home, and the life calendar follows your settings", async ({ page }) => {
  await page.goto("/admin?section=seneca");
  const card = page.getByRole("region", { name: "Keep going" });
  await expect(card.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 30000 });
  await expect(card.getByText("No Porn")).toBeVisible();

  // Hide is separate from pinning: a hidden goal isn't even suggested
  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Hide No Porn from Home" }).click();
  await expect(page.getByRole("button", { name: "Pin No Porn to Home" })).toBeDisabled();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(card.getByText("No Porn")).toHaveCount(0);

  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Show No Porn on Home" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(card.getByText("No Porn")).toBeVisible();

  // Today is highlighted
  await expect(page.locator("button.sn-day.is-today")).toHaveAttribute("aria-current", "date");
  await expect(page.locator("button.sn-day.is-today")).toHaveCSS("font-weight", "750");

  // Life calendar: the default counts to 90, and the target can change
  const life = page.getByRole("region", { name: "Life calendar" });
  await expect(life).toContainText("to age 90");
  await expect(life.locator(".sn-life-grid > span")).toHaveCount(90);
  await life.getByRole("button", { name: "Set birthday and target age" }).click();
  await page.getByRole("button", { name: /Target age: 90/ }).click();
  await page.getByRole("spinbutton", { name: "Target age" }).fill("76");
  await page.getByRole("spinbutton", { name: "Target age" }).press("Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(life).toContainText("to age 76");
  await expect(life.locator(".sn-life-grid > span")).toHaveCount(76);
  await expect(life).toContainText("d left");
});

test("journal entries survive a reload, and the list says where they came from", async ({ page }) => {
  await page.goto("/admin?section=seneca&view=journal");
  await expect(page.getByRole("button", { name: "New entry" }).first()).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: "New entry" }).first().click();
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Kept across reloads");
  await page.locator(".sn-doc-editor .ProseMirror").click();
  await page.keyboard.type("Still here after a refresh.");
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.getByRole("button", { name: "Read the entry" }).click();
  await page.getByRole("button", { name: "Back to all entries" }).click();

  await page.reload();
  await expect(page.getByRole("button", { name: /Kept across reloads/ })).toBeVisible({ timeout: 30000 });
  // No Firebase user in this session: the list says so instead of pretending to sync
  await expect(page.locator(".sn-sync")).toContainText("on this device only");
});

test('journal mobile rows, filters, selection and editor stay usable at narrow widths', async ({ page }, info) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    if (localStorage.getItem('journal_entries')) return;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    localStorage.setItem('journal_entries', JSON.stringify([
      { id: 'mobile-journal', title: 'Making room for the things that matter most', preview: 'A long walk, a difficult conversation, and a little space to think about tomorrow.', mood: '🌱', isoDate: today, date: today, time: '7:30 AM', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A long walk, a difficult conversation, and a little space to think about tomorrow.' }] }] } },
      { id: 'older-journal', title: 'A quieter evening', preview: 'I put the phone away and finished my book.', mood: '🌙', isoDate: '2025-01-09', date: 'January 9, 2025', time: '8:00 PM', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'I put the phone away and finished my book.' }] }] } },
    ]));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin?section=seneca&view=journal');
  const list = page.locator('.sn-journal');
  await expect(list.getByRole('tab', { name: /This month/ })).toBeVisible({ timeout: 30000 });
  for (const width of [320, 390, 600, 834]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of await list.getByRole('tab').all()) await expect(tab).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Journal list at ${width}`).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await list.getByRole('tab', { name: /^Today/ }).click();
  await expect(list.getByRole('button', { name: /A quieter evening/ })).toHaveCount(0);
  await list.getByRole('tab', { name: /^All/ }).click();
  await list.getByRole('searchbox', { name: 'Filter entries by title or text' }).fill('quieter');
  await expect(list.locator('.admin-row')).toHaveCount(1);
  await list.getByRole('searchbox', { name: 'Filter entries by title or text' }).fill('');
  await list.getByRole('checkbox', { name: 'Select “A quieter evening”' }).click();
  await expect(page.getByRole('toolbar', { name: 'Selected entries' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await list.getByRole('button', { name: /This month.*entry/ }).click();
  await expect(list.getByText('Days written', { exact: true })).toBeVisible();
  await list.getByRole('button', { name: /This month.*entry/ }).click();
  await list.screenshot({ path: info.outputPath('journal-mobile-list.png'), style: '.control-topbar,.sn-tabbar{visibility:hidden!important}' });
  await list.getByRole('button', { name: /Making room for the things/ }).click();
  await expect(page.locator('.sn-doc-saved')).toBeVisible();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A mobile edit kept when I tap Done immediately');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(list.getByRole('button', { name: /A mobile edit kept/ })).toBeVisible();
  await list.getByRole('button', { name: /A mobile edit kept/ }).click();
  await page.getByRole('button', { name: 'Version history', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Version history' })).toBeInViewport();
  await page.getByRole('button', { name: 'Close versions', exact: true }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Delete entry?' })).toBeInViewport();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  for (const width of [320, 390, 600, 834]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Journal document at ${width}`).toBe(true);
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.sn-doc').screenshot({ path: info.outputPath('journal-mobile-editor.png'), style: '.control-topbar,.sn-tabbar{visibility:hidden!important}' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.locator('.sn-doc').screenshot({ path: info.outputPath('journal-mobile-dark.png'), style: '.control-topbar,.sn-tabbar{visibility:hidden!important}' });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await list.screenshot({ path: info.outputPath('journal-desktop-list.png'), style: '.control-topbar,.sn-tabbar{visibility:hidden!important}' });
});

test("phones get a bottom tab bar that never covers the page's last content", async ({ page }) => {
  test.skip(!isPhone(page), "the bottom bar only exists below 900px");
  await page.goto("/admin?section=seneca");
  await expect(page.getByRole("heading", { name: /Happy/ })).toBeVisible({ timeout: 30000 });

  const bar = page.getByRole("navigation", { name: "Seneca views" });
  await expect(bar).toBeVisible();
  await expect(page.getByRole("tab", { name: "Protocol" })).toBeHidden();

  // Every destination is a full thumb target
  for (const button of await bar.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }

  // No sideways scroll on a phone
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  // At the very bottom, the last control sits above the bar
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const barTop = (await bar.boundingBox())!.y;
  const lastBottom = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".seneca-root button, .seneca-root a")].filter((el) => el.getBoundingClientRect().height > 0);
    return Math.max(...items.map((el) => el.getBoundingClientRect().bottom));
  });
  expect(lastBottom).toBeLessThanOrEqual(barTop);

  await tabFor(page, "Wealth").click();
  await expect(page).toHaveURL(/view=wealth/);
  await expectTab(page, "Wealth");
});




test('compact overlaps stay accessible and Now completes the linked habit', async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('seneca_horizon_compact', 'true');
    if (localStorage.getItem('seneca_time_blocks')) return;
    localStorage.setItem('seneca_time_blocks', JSON.stringify({
      pray: { id: 'pray', category: 'personal', title: 'Pray', taskKey: 'morningIgnition-1', start: 0, end: 1440, tone: 'sage' },
      focus: { id: 'focus', category: 'personal', title: 'Quiet focus', taskKey: '', start: 0, end: 1440, tone: 'butter' },
    }));
  });
  await page.goto('/admin?section=seneca');
  const horizon = page.getByRole('region', { name: 'Your daily rhythm', exact: true });
  await expect(horizon.locator('.hz-compact-track')).toBeVisible();
  await expect(horizon.locator('.hz-overlap-list button')).toHaveCount(2);
  const done = horizon.getByRole('checkbox', { name: 'Complete current habit Pray' });
  await done.click();
  await expect(done).toBeChecked();
  await done.click();
  await expect(done).not.toBeChecked();
  const customDone = horizon.getByRole('checkbox', { name: 'Complete current habit Quiet focus' });
  await customDone.click();
  await expect(customDone).toBeChecked();
  await page.reload();
  await expect(customDone).toBeChecked();
  await customDone.click();
  await expect(customDone).not.toBeChecked();
  await horizon.locator('.hz-overlap-list').getByRole('button', { name: /Quiet focus/ }).click();
  await expect(horizon.getByRole('textbox', { name: /name/i })).toBeVisible();
  await horizon.screenshot({ path: info.outputPath('compact-overlap-editor.png') });
});

test('Protocol and Wealth boards reflow and keep their actions', async ({ page }, info) => {
  await page.goto('/admin?section=seneca&view=protocol');
  await page.screenshot({ path: info.outputPath('protocol-initial.png'), fullPage: true });
  await expect(page.getByRole('heading', { name: 'One good habit at a time.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible();
  await page.getByRole('button', { name: 'Add a habit', exact: true }).click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('protocol-board.png'), fullPage: true });
  await tabFor(page, 'Wealth').click();
  await expect(page.getByRole('heading', { name: 'Money movement' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('wealth-board.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
});


test('Wealth chart uses saved transactions and supports touch inspection', async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('wealth_assets', JSON.stringify([{ id: 'bank', name: 'Everyday savings', amount: 24500, category: 'Savings', platform: 'Savings account', icon: '₱' }]));
    localStorage.setItem('wealth_transactions', JSON.stringify([
      { id: 'in', bank: 'Everyday savings', type: 'deposit', amount: 5000, date: new Date().toISOString(), note: 'Monthly savings' },
      { id: 'out', bank: 'Everyday savings', type: 'withdrawal', amount: 500, date: new Date().toISOString(), note: 'Groceries' },
    ]));
  });
  await page.goto('/admin?section=seneca&view=wealth');
  const flow = page.getByRole('region', { name: 'Monthly money movement' });
  await expect(flow.getByRole('button', { name: /5000 pesos in, 500 pesos out/ })).toBeVisible();
  await flow.getByRole('slider', { name: 'Inspect day of month' }).fill('1');
  await expect(flow.getByRole('slider')).toHaveValue('1');
  await page.screenshot({ path: info.outputPath('wealth-populated.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: info.outputPath('wealth-populated-dark.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('boards fit narrow phones, tablets, and wide desktops', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Viewport sweep uses desktop emulation');
  test.setTimeout(90000);
  for (const width of [320, 600, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['protocol', 'wealth']) {
      await page.goto(`/admin?section=seneca&view=${view}`);
      await expect(page.locator(view === 'protocol' ? '.sn-protocol-welcome' : '.sn-money-flow')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} at ${width}px`).toBe(true);
    }
  }
});

test('Home money widget inspects slices, recorded accumulation, period filters and compact preference', async ({ page }, info) => {
  test.setTimeout(90000);
  if (info.project.name === 'desktop') await page.setViewportSize({ width: 1600, height: 1100 });
  await page.addInitScript(() => {
    if (localStorage.getItem('wealth_assets')) return;
    localStorage.setItem('wealth_assets', JSON.stringify([
      { id: 'savings', name: 'Everyday savings', category: 'Savings', amount: 28500 },
      { id: 'reserve', name: 'Emergency fund', category: 'Savings', amount: 12000 },
    ]));
    localStorage.setItem('wealth_transactions', JSON.stringify([
      { id: 'pay', type: 'deposit', amount: 35000, bank: 'Everyday savings', date: '2026-10-01T01:00:00Z', note: 'October salary' },
      { id: 'rent', type: 'withdrawal', amount: 8500, bank: 'Everyday savings', date: '2026-10-02T01:00:00Z', note: 'Monthly rent', category: 'Housing', location: 'Home' },
      { id: 'food', type: 'withdrawal', amount: 1250, bank: 'Everyday savings', date: '2026-10-03T03:00:00Z', note: 'Weekly groceries', category: 'Groceries', location: 'Market' },
      { id: 'work', type: 'deposit', amount: 8000, bank: 'Everyday savings', date: '2026-10-04T08:00:00Z', note: 'Freelance project' },
      { id: 'debt', type: 'payment', amount: 2000, bank: 'Family loan', date: '2026-10-05T01:00:00Z', note: 'Debt payment', category: 'Debt payments' },
      { id: 'book', type: 'withdrawal', amount: 640, bank: 'Everyday savings', date: '2026-10-06T09:00:00Z', note: 'Books for study' },
    ]));
  });
  await page.goto('/admin?section=seneca');
  const widget = page.getByRole('region', { name: 'Your money story', exact: true });
  await expect(widget.getByRole('heading', { name: 'How recorded money adds up' })).toBeVisible({ timeout: 30000 });
  await expect(widget.locator('.mh-head')).toContainText('Recorded income is ahead of spending.');
  await expect(widget.getByRole('region', { name: 'Spending breakdown' })).toContainText('Uncategorized');
  await expect(widget.locator('.mh-cashflow')).toContainText('of recorded income went out');
  await widget.getByRole('button', { name: 'Money in: view income in Wealth' }).hover();
  expect(await widget.locator('.mh-summary>button').evaluateAll(els => els.every(el => getComputedStyle(el).borderRadius === '0px'))).toBe(true);
  const rent = widget.getByRole('button', { name: /Monthly rent,.*8,500/ });
  await rent.hover();
  await expect(widget.locator('.mh-inspector')).toContainText('Monthly rent');
  await expect(widget.locator('.mh-inspector')).toContainText('Oct 2, 2026');
  await expect(widget.locator('.mh-inspector')).toContainText('Home');
  await rent.focus();
  await page.keyboard.press('End');
  await expect(widget.locator('.mh-inspector')).toContainText('Books for study');
  await widget.getByRole('slider', { name: 'Inspect recorded transaction' }).focus();
  await page.keyboard.press('Home');
  await expect(widget.locator('.mh-inspector')).toContainText('October salary');
  await widget.getByRole('combobox', { name: 'Money period', exact: true }).click();
  await page.getByRole('option', { name: 'This month', exact: true }).click();
  await expect(widget.getByRole('combobox', { name: 'Money period', exact: true })).toContainText('This month');
  await widget.getByRole('combobox', { name: 'Money period', exact: true }).click();
  await page.getByRole('option', { name: 'This year', exact: true }).click();
  await expect(widget.getByRole('combobox', { name: 'Money period', exact: true })).toContainText('This year');
  await widget.getByRole('button', { name: /Monthly rent,.*8,500/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(widget.locator('.mh-inspector')).toContainText('Weekly groceries');
  const inspectorHeight = await widget.locator('.mh-inspector').evaluate(el => el.getBoundingClientRect().height);
  await widget.getByRole('slider', { name: 'Inspect recorded transaction' }).focus();
  await page.keyboard.press('Home');
  await expect(widget.locator('.mh-inspector')).toContainText('October salary');
  expect(await widget.locator('.mh-inspector').evaluate(el => el.getBoundingClientRect().height)).toBe(inspectorHeight);
  await expect(widget.locator('input[type=range]')).toHaveCount(0);
  if (info.project.name === 'desktop') {
    const heights = await page.locator('.sn-resource-slot').evaluateAll(elements => elements.map(el => el.firstElementChild!.getBoundingClientRect().height));
    expect(Math.abs(heights[0] - heights[1])).toBeLessThan(2);
  }
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  const screenshotStyle = '.control-topbar,.sn-tabbar{visibility:hidden!important}';
  await widget.screenshot({ path: info.outputPath('money-home-full.png'), style: screenshotStyle });
  await page.locator('.sn-resource-grid').screenshot({ path: info.outputPath('time-and-money-home.png'), style: screenshotStyle });
  await widget.getByRole('button', { name: 'Compact money view' }).click();
  await expect(widget.getByRole('heading', { name: 'How recorded money adds up' })).toHaveCount(0);
  await widget.screenshot({ path: info.outputPath('money-home-compact.png'), style: screenshotStyle });
  await page.reload();
  await expect(widget.getByRole('button', { name: 'Expand money view' })).toBeVisible();
  await widget.getByRole('button', { name: 'Expand money view' }).click();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await widget.screenshot({ path: info.outputPath('money-home-dark.png'), style: screenshotStyle });
  for (const width of [320, 600, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Money at ${width}px`).toBe(true);
  }
  for (const [label, title] of [['Money in: view income in Wealth', 'Income'], ['Money out: view expenses in Wealth', 'Expenses'], ['Held now: view accounts in Wealth', 'Assets']]) {
    await widget.getByRole('button', { name: label, exact: true }).click();
    await expectTab(page, 'Wealth');
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    if (title === 'Income') { await expect(page.locator('.sn-wealth-transactions')).toContainText('October salary'); await expect(page.locator('.sn-wealth-transactions')).not.toContainText('Monthly rent'); await page.getByRole('navigation', { name: 'Money records' }).getByRole('button', { name: 'Expenses', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible(); await page.getByRole('navigation', { name: 'Money records' }).getByRole('button', { name: 'Income', exact: true }).click(); await page.reload(); await expect(page.getByRole('heading', { name: 'Income', exact: true })).toBeVisible(); }
    if (title === 'Expenses') { await expect(page.locator('.sn-wealth-transactions')).toContainText('Monthly rent'); await expect(page.locator('.sn-wealth-transactions')).not.toContainText('October salary'); }
    await page.goBack();
    await expectTab(page, 'Home');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await widget.getByRole('button', { name: 'Review expenses', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
  await page.goBack();
  await widget.getByRole('button', { name: 'Open Wealth', exact: true }).click();
  await expectTab(page, 'Wealth');
});

test('Home money widget has honest empty and negative-flow states without overflow', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/admin?section=seneca');
  const widget = page.getByRole('region', { name: 'Your money story', exact: true });
  await expect(widget.getByText('Start with your account balances, then record what comes in and goes out.')).toBeVisible();
  await widget.screenshot({ path: info.outputPath('money-home-empty.png') });
  await widget.getByRole('button', { name: 'Open Wealth', exact: true }).click();
  await expectTab(page, 'Wealth');
  await page.evaluate(() => {
    localStorage.setItem('wealth_transactions', JSON.stringify([{ id: 'expense', type: 'withdrawal', amount: 150, date: '2026-10-02T01:00:00Z', note: 'Transport' }]));
  });
  await page.goto('/admin?section=seneca&view=home');
  await expect(widget.locator('.mh-chart-heading > strong')).toHaveAttribute('aria-label', 'Net recorded movement -₱150.00');
  await widget.getByRole('slider', { name: 'Inspect recorded transaction' }).focus();
  await page.keyboard.press('Home');
  await expect(widget.locator('.mh-inspector')).toContainText('Transport');
  await widget.screenshot({ path: info.outputPath('money-home-negative.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('home refinements: life tooltip and editor, compact route art and ranked habits', async ({ page }, info) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    localStorage.setItem('study_goal_active', JSON.stringify({ id: 'test-study', name: 'Cloud certification', target: 'Dec 2026', routeWeeks: 2 }));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const history: Record<string, Record<string, boolean>> = {};
    for (const phase of ['morningIgnition','arena','maintenance','shutdown']) for (let id = 1; id <= 40; id++) history[`${phase}-${id}`] = { [today]: true };
    localStorage.setItem('protocol_task_history', JSON.stringify(history));
  });
  await page.goto('/admin?section=seneca');
  await expect(page.getByRole('button', { name: 'Sign out of Seneca', exact: true })).toHaveCount(0);
  const life = page.getByRole('region', { name: 'Life calendar', exact: true });
  const dot = life.locator('.sn-life-grid .is-now');
  await dot.focus();
  await expect(dot).toHaveAttribute('data-tip', /2026 · [\d.]+% complete/);
  await expect.poll(() => dot.evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('1');
  await life.getByRole('button', { name: 'Set birthday and target age' }).click();
  const sheet = page.getByRole('dialog', { name: 'Life calendar', exact: true });
  await sheet.getByRole('button', { name: 'Birth date', exact: true }).click();
  await expect(sheet.locator('.ki-calendar')).toBeVisible();
  await sheet.locator('.ki-calendar button').filter({ hasText: /^10$/ }).click();
  await expect(sheet.getByRole('button', { name: 'Birth date', exact: true })).toContainText('January 10, 2001');
  await sheet.getByRole('button', { name: 'One year less', exact: true }).click();
  await expect(sheet.getByRole('button', { name: /Target age: 89/ })).toContainText('years');
  await sheet.screenshot({ path: info.outputPath('life-editor.png'), style: 'nextjs-portal{visibility:hidden!important}' });
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(life).toContainText('to age 89', { timeout: 30000 });
  const route = page.locator('.sn-study-card');
  for (const weeks of [1,2,4,8]) {
    await route.getByRole('button', { name: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`, exact: true }).click();
    const gap = await route.evaluate(el => {
      const art = el.querySelector('.sn-map')!.getBoundingClientRect();
      const toggle = el.querySelector('.sn-studied')!.getBoundingClientRect();
      return toggle.top - art.bottom;
    });
    expect(gap).toBeLessThan(30);
  }
  await route.screenshot({ path: info.outputPath('study-route.png') });
  const podium = page.getByRole('list', { name: 'Top kept habits' });
  await expect(podium.getByRole('listitem')).toHaveCount(3);
  for (const width of [320,390,834,1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 390 : 1440, height: 1000 });
  await page.locator('.sn-analytics-section').screenshot({ path: info.outputPath('analytics.png'), style: '.sn-tabbar,.control-topbar,nextjs-portal{visibility:hidden!important}' });
  await life.screenshot({ path: info.outputPath('life.png') });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));
  await page.locator('.sn-analytics-section').screenshot({ path: info.outputPath('analytics-dark.png'), style: '.sn-tabbar,.control-topbar,nextjs-portal{visibility:hidden!important}' });
});


