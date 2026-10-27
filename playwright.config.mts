// Explicit ESM preserves the local .mjs target guard's import.meta handling.
import { defineConfig, devices } from "@playwright/test";
import { assertTestTarget } from "./scripts/assert-test-target.mjs";

const baseURL = assertTestTarget(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100/",
);
const reportPrefix = process.env.PLAYWRIGHT_REPORT_PREFIX ?? "all";
if (!["api", "e2e", "all"].includes(reportPrefix)) {
  throw new Error("PLAYWRIGHT_REPORT_PREFIX must be api, e2e or all.");
}

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  globalTimeout: 120_000,
  outputDir: `test-results/${reportPrefix}`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `playwright-report/${reportPrefix}`, open: "never" }],
    ["junit", { outputFile: `reports/${reportPrefix}-junit.xml` }],
    ["json", { outputFile: `reports/${reportPrefix}-results.json` }],
  ],
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "api", testDir: "./tests/api" },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start:test",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
