import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT || "3000";
const baseURL = process.env.TRADEHUB_BROWSER_BASE_URL || `http://127.0.0.1:${port}`;
const startWebServer = process.env.TRADEHUB_BROWSER_REUSE_SERVER !== "true";
const requireColdServer = process.env.TRADEHUB_BROWSER_COLD_SERVER === "true";
const browserEngine = process.env.TRADEHUB_BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  projects: [
    {
      name: browserEngine,
      use: { ...devices[browserEngine === "webkit" ? "Desktop Safari" : "Desktop Chrome"] }
    }
  ],
  ...(startWebServer
    ? {
        webServer: {
          command: `npm run dev:stage15f -- --hostname 127.0.0.1 --port ${port}`,
          url: baseURL,
          reuseExistingServer: !requireColdServer,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe"
        }
      }
    : {})
});
