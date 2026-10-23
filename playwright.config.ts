import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3127", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3127",
    url: "http://127.0.0.1:3127/api/health",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
