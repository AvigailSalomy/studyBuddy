import { defineConfig } from "@playwright/test";
import "./tests/env";

// Deliberately points at the same real Supabase project the app itself
// uses (via .env.local, loaded by tests/env.ts) -- per the explicit
// decision not to stand up a separate Supabase project for testing.
// The two dedicated test accounts (TEST_USER_A_*/TEST_USER_B_*) are
// supplied via .env.test.local (gitignored, never committed) and are
// read directly from process.env inside the e2e test files.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    // "localhost", not "127.0.0.1": Next.js 16 dev mode blocks
    // cross-origin requests to its own JS chunks/HMR endpoint unless the
    // origin is in allowedDevOrigins, and treats 127.0.0.1 as a
    // different origin from localhost even on the same machine. Hitting
    // that block means the page never hydrates -- every form submits as
    // a plain HTML GET instead of running the "use client" handler.
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
