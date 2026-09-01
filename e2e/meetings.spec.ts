import { test, expect, type Page } from "@playwright/test";

// Verifies the fix for the "1-2 minutes ahead intermittently rejected"
// bug (see lib/datetime.ts: isMeetingTimeInFuture / MEETING_TIME_
// SUBMISSION_GRACE_MS). Runs against the real Supabase project (see
// playwright.config.ts) using TEST_USER_A.

const EMAIL_A = process.env.TEST_USER_A_EMAIL!;
const PASSWORD_A = process.env.TEST_USER_A_PASSWORD!;

const GROUP_NAME = `TEST_ Meetings Group ${Date.now()}`;
const COURSE_NAME = `TEST_ Meetings Course ${Date.now()}`;

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function scheduleMeeting(page: Page, title: string, when: Date) {
  await page.locator("#meeting-title").fill(title);
  await page.locator("#meeting-time").fill(toDatetimeLocal(when));
  await page.getByRole("button", { name: "Schedule meeting" }).click();
}

test("meeting scheduling: 1/2/3 minutes ahead, later today, another date, and editing", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/login");
  await page.waitForTimeout(500);
  await page.locator("#email").fill(EMAIL_A);
  await page.locator("#password").fill(PASSWORD_A);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // --- Create a fresh TEST_ group to schedule meetings in ---------
  await page.goto("/groups/new");
  await page.waitForTimeout(500);
  await page.locator("#name").fill(GROUP_NAME);
  await page.getByPlaceholder("Search or add a course...").fill(COURSE_NAME);
  const createCourseButton = page.getByRole("button", { name: `Create "${COURSE_NAME}"` });
  await expect(createCourseButton).toBeVisible({ timeout: 10_000 });
  await createCourseButton.click();
  await expect(page.getByRole("button", { name: "Change" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const groupLink = page.locator("a", { hasText: GROUP_NAME }).first();
  await expect(groupLink).toBeVisible({ timeout: 10_000 });
  const groupUrl = await groupLink.getAttribute("href");

  await page.goto(groupUrl!);
  await page.getByRole("tab", { name: "Meetings" }).click();
  await page.getByRole("button", { name: "Schedule meeting" }).click();

  // --- The real repro: pick "+1 minute", then wait ~75s (simulating
  // realistic form-filling + network latency) before actually
  // submitting -- exactly the race that used to fail intermittently.
  const oneMinuteAhead = new Date(Date.now() + 60_000);
  await page.locator("#meeting-title").fill("TEST_ Meeting +1min (delayed submit)");
  await page.locator("#meeting-time").fill(toDatetimeLocal(oneMinuteAhead));
  await page.waitForTimeout(75_000);
  await page.getByRole("button", { name: "Schedule meeting" }).click();
  await expect(page.getByText("Meeting scheduled.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("TEST_ Meeting +1min (delayed submit)")).toBeVisible();

  // --- +2 minutes, +3 minutes: quick, no artificial delay ---------
  await page.getByRole("button", { name: "Schedule meeting" }).click();
  await scheduleMeeting(page, "TEST_ Meeting +2min", new Date(Date.now() + 2 * 60_000));
  await expect(page.getByText("TEST_ Meeting +2min")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Schedule meeting" }).click();
  await scheduleMeeting(page, "TEST_ Meeting +3min", new Date(Date.now() + 3 * 60_000));
  await expect(page.getByText("TEST_ Meeting +3min")).toBeVisible({ timeout: 10_000 });

  // --- Later today, and another date -------------------------------
  await page.getByRole("button", { name: "Schedule meeting" }).click();
  await scheduleMeeting(page, "TEST_ Meeting later today", new Date(Date.now() + 3 * 60 * 60_000));
  await expect(page.getByText("TEST_ Meeting later today")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Schedule meeting" }).click();
  const anotherDate = new Date(Date.now() + 3 * 24 * 60 * 60_000);
  await scheduleMeeting(page, "TEST_ Meeting another date", anotherDate);
  await expect(page.getByText("TEST_ Meeting another date")).toBeVisible({ timeout: 10_000 });

  // The rendered date should show that day's actual date, not today's --
  // confirms display isn't stuck on "now" and correctly reflects a
  // different calendar day (MeetingTimeDisplay renders e.g. "4 Sept
  // 2026, 14:16", matching en-GB toLocaleString formatting).
  const expectedDay = String(anotherDate.getDate());
  await expect(page.getByText(new RegExp(`^${expectedDay} `))).toBeVisible();

  // --- Editing an existing meeting ---------------------------------
  const editRow = page.locator("div", { hasText: "TEST_ Meeting +3min" }).last();
  await editRow.getByRole("button", { name: "Edit meeting" }).click();
  const newTime = new Date(Date.now() + 10 * 60_000);
  await page.locator('input[type="datetime-local"]').last().fill(toDatetimeLocal(newTime));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText("TEST_ Meeting +3min")).toBeVisible();

  // --- Cleanup: delete the group (cascades all meetings) -----------
  await page.goto(groupUrl!);
  await page.getByRole("button", { name: "Delete group" }).click();
  await page.getByRole("button", { name: "Delete group" }).click();
  await expect(page).toHaveURL(/\/dashboard\?scope=mine/, { timeout: 15_000 });
});
