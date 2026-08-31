import { test, expect } from "@playwright/test";

const EMAIL_A = process.env.TEST_USER_A_EMAIL!;
const PASSWORD_A = process.env.TEST_USER_A_PASSWORD!;

test("logged-out user is redirected away from a protected page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login fails with a wrong password", async ({ page }) => {
  await page.goto("/login");
  // The login form only becomes interactive once React hydrates the
  // Client Component -- without waiting, a fast Playwright click can
  // land before the "use client" onSubmit handler is attached, and the
  // browser falls back to a native form GET (visible as ?email=...
  // &password=... in the URL). Next dev mode keeps a persistent HMR
  // WebSocket open, so networkidle never reliably settles; a short fixed
  // wait is the pragmatic fix here (test-file only, no app change).
  await page.waitForTimeout(1000);
  await page.locator("#email").fill(EMAIL_A);
  await page.locator("#password").fill("definitely-the-wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("login succeeds for a valid, confirmed user", async ({ page }) => {
  await page.goto("/login");
  // The login form only becomes interactive once React hydrates the
  // Client Component -- without waiting, a fast Playwright click can
  // land before the "use client" onSubmit handler is attached, and the
  // browser falls back to a native form GET (visible as ?email=...
  // &password=... in the URL). Next dev mode keeps a persistent HMR
  // WebSocket open, so networkidle never reliably settles; a short fixed
  // wait is the pragmatic fix here (test-file only, no app change).
  await page.waitForTimeout(1000);
  await page.locator("#email").fill(EMAIL_A);
  await page.locator("#password").fill(PASSWORD_A);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
