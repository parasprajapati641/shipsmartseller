import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright config for Meesho shipping automation.
 * Used primarily for browser installation and optional test runs.
 * The automation module uses playwright directly (not @playwright/test runner).
 */
export default defineConfig({
  testDir: "./automation",
  testMatch: "**/*.spec.ts",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    headless: process.env.MEESHO_HEADED !== "1",
    viewport: { width: 1280, height: 900 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  outputDir: path.join(__dirname, "automation", ".screenshots", "playwright"),
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
