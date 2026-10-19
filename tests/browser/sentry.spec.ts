import { test, expect } from '@playwright/test';

test('public layout and Sentry example do not initialize Replay twice', async ({ page }) => {
  const replayErrors: string[] = [];
  const record = (message: string) => {
    if (/Multiple Sentry Session Replay instances/i.test(message)) replayErrors.push(message);
  };
  page.on('pageerror', error => record(error.message));
  page.on('console', message => record(message.text()));
  // Keep verification traffic out of the production Sentry project.
  await page.route('**/*.ingest.*.sentry.io/**', route => route.abort());
  for (const path of ['/']) {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForTimeout(1500);
  }
  expect(replayErrors).toEqual([]);
});
