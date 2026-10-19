import { test, expect } from '@playwright/test';
import website from '../../content/website.json';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('seneca_local_session', 'true');
    if (!localStorage.getItem('study_goal_active')) localStorage.setItem('study_goal_active', JSON.stringify({ id: 'first', name: 'First study subject', target: 'Dec 2026', routeWeeks: 2 }));
    if (!localStorage.getItem('seneca_custom_certifications')) localStorage.setItem('seneca_custom_certifications', JSON.stringify([{ id: 'first', name: 'First study subject', status: 'progress' }, { id: 'second', name: 'Second study subject', status: 'locked' }]));
  });
  await page.route('**/api/admin/me', route => route.fulfill({ json: { email: 'test@example.com', github: true, storage: true } }));
  await page.route('**/api/admin/posts', route => route.fulfill({ json: { posts: [] } }));
  await page.route('**/api/admin/projects/posts', route => route.fulfill({ json: { posts: [] } }));
  await page.route('**/api/admin/website', route => route.fulfill({ json: { content: website, version: null, source: JSON.stringify(website) } }));
  await page.route('**/api/admin/analytics?**', route => route.fulfill({ json: { configured: false } }));
});

test('study subjects switch, keep histories, and require confirmation to pass', async ({ page }, info) => {
  await page.goto('/admin?section=seneca');
  await page.getByRole('button', { name: 'Edit study goal', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit study goal', exact: true });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  if (!bounds) throw new Error('Missing dialog');
  const viewport = page.viewportSize()!;
  expect(bounds.width).toBeLessThanOrEqual(viewport.width);
  if (info.project.name === 'desktop') {
    expect(bounds.width).toBeLessThan(700);
    expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(12); // reserved scrollbar gutter
    expect(bounds.y).toBeGreaterThan(20);
  }
  await dialog.getByRole('switch', { name: /Study more than one subject/ }).check();
  await dialog.getByRole('combobox', { name: 'Currently studying' }).click();
  await page.getByRole('option', { name: 'Second study subject', exact: true }).click();
  await expect(dialog).toContainText('2 active subjects');
  await dialog.screenshot({ path: info.outputPath('study-editor.png') });
  await dialog.getByRole('button', { name: 'I passed this', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Confirm study completion' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Keep studying' }).click();
  await expect(confirmation).toBeHidden();
  await dialog.getByRole('button', { name: 'I passed this', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Yes, I passed' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.sn-study-card')).toContainText('First study subject', { timeout: 30000 });
  const portfolio = await page.evaluate(() => JSON.parse(localStorage.getItem('study_portfolio_v1')!));
  expect(portfolio.subjects.second.passedAt).toBeTruthy();
  expect(portfolio.subjects.first.active).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('seneca_custom_certifications')!).find((c: { id: string }) => c.id === 'second').status)).toBe('done');
  await page.reload();
  await expect(page.locator('.sn-study-card')).toContainText('First study subject', { timeout: 30000 });
});

test('Protocol overview stays hidden and new-task dialog uses Fluent and restores focus', async ({ page }, info) => {
  await page.goto('/admin?section=seneca&view=protocol');
  await page.getByRole('button', { name: 'Hide overview', exact: true }).click();
  await expect(page.getByRole('region', { name: "Today's focus" })).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show overview' })).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Add a habit', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'New Task', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.fluent-img').first()).toBeVisible();
  await dialog.screenshot({ path: info.outputPath('new-task-dialog.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await trigger.click();
  await dialog.getByRole('textbox', { name: 'Task name', exact: true }).fill('Intentional test habit');
  await dialog.getByRole('textbox', { name: /Details/ }).fill('A small, specific next step.');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await dialog.screenshot({ path: info.outputPath('new-task-dark.png'), style: 'nextjs-portal{visibility:hidden!important}' });
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('protocol_custom_tasks'))).toContain('Intentional test habit');
});
