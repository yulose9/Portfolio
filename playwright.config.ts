import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: ".audit/test-results",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", channel: "chrome", trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: { command: "node scripts/serve-static.mjs out 3000", url: "http://127.0.0.1:3000", reuseExistingServer: true },
});
