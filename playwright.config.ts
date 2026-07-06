import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression against the built Storybook (`npm run build-storybook` first).
 * Stories under test are deterministic (seeded data, no random/time-dependent
 * rendering) and reduced motion is emulated, so shots are stable per platform.
 * Snapshots are platform-suffixed; `--update-snapshots missing` bootstraps a new
 * platform without failing.
 */
export default defineConfig({
  testDir: "./playwright",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://127.0.0.1:6007",
  },
  webServer: {
    command: "npx http-server storybook-static -p 6007 -s",
    url: "http://127.0.0.1:6007/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1200, height: 720 } },
    },
  ],
});
