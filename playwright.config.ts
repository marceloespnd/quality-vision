import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://127.0.0.1:3101", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 3101 --strictPort", url: "http://127.0.0.1:3101", reuseExistingServer: false,
    env: { VITE_FIREBASE_API_KEY: "", VITE_FIREBASE_AUTH_DOMAIN: "", VITE_FIREBASE_PROJECT_ID: "", VITE_FIREBASE_STORAGE_BUCKET: "", VITE_FIREBASE_MESSAGING_SENDER_ID: "", VITE_FIREBASE_APP_ID: "" } },
});
