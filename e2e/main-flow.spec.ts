import { test, expect, type Page } from "@playwright/test";

// One end-to-end story, two real browser contexts (Owner / Member),
// covering: group creation, non-member visibility, join request ->
// approval -> membership, dashboard status badges, task creation +
// assignee validation + status change, and cleanup via the real
// deleteGroup flow. Runs against the same real Supabase project the app
// itself uses (see playwright.config.ts) -- no mocking.

const EMAIL_A = process.env.TEST_USER_A_EMAIL!;
const PASSWORD_A = process.env.TEST_USER_A_PASSWORD!;
const EMAIL_B = process.env.TEST_USER_B_EMAIL!;
const PASSWORD_B = process.env.TEST_USER_B_PASSWORD!;

const GROUP_NAME = `TEST_ E2E Group ${Date.now()}`;
const COURSE_NAME = `TEST_ E2E Course ${Date.now()}`;
const TASK_TITLE = "TEST_ E2E Task";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForTimeout(500); // let the Client Component hydrate
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe.configure({ mode: "serial" });

test("group creation, join request, approval, tasks, dashboard status, deletion", async ({ browser }) => {
  test.setTimeout(120_000);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await login(pageA, EMAIL_A, PASSWORD_A);
  await login(pageB, EMAIL_B, PASSWORD_B);

  // --- 1. Owner creates a group -----------------------------------
  await pageA.goto("/groups/new");
  await pageA.waitForTimeout(500);
  await pageA.locator("#name").fill(GROUP_NAME);

  const courseInput = pageA.getByPlaceholder("Search or add a course...");
  await courseInput.fill(COURSE_NAME);
  const createCourseButton = pageA.getByRole("button", { name: `Create "${COURSE_NAME}"` });
  await expect(createCourseButton).toBeVisible({ timeout: 10_000 });
  await createCourseButton.click();
  // findOrCreateCourse is async (server round-trip); only once the
  // picker has switched to its "selected" state (course name + "Change"
  // button) is courseId actually set on the form -- clicking submit
  // before that races react-hook-form's validation and silently blocks
  // submission (no server error, since onSubmit never runs at all).
  await expect(pageA.getByRole("button", { name: "Change" })).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "Create group" }).click();
  await expect(pageA).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  // Find the newly created group's id via its card link.
  const groupLink = pageA.locator("a", { hasText: GROUP_NAME }).first();
  await expect(groupLink).toBeVisible({ timeout: 10_000 });
  const href = await groupLink.getAttribute("href");
  expect(href).toBeTruthy();
  const groupUrl = href!;

  // --- 2. Non-member (B) sees only basic info, no member-only tabs -
  await pageB.goto(groupUrl);
  await expect(pageB.getByRole("heading", { name: GROUP_NAME })).toBeVisible();
  await expect(pageB.getByRole("tab", { name: "Tasks" })).toHaveCount(0);
  await expect(pageB.getByRole("tab", { name: "Chat" })).toHaveCount(0);

  // --- 3. B requests to join ---------------------------------------
  await pageB.getByRole("button", { name: "Request to join" }).click();
  await expect(pageB.getByText("Request pending")).toBeVisible();

  // --- 4. Owner (A) approves the request ---------------------------
  await pageA.goto(groupUrl);
  await pageA.getByRole("tab", { name: "Join Requests" }).click();
  await pageA.getByRole("button", { name: "Approve" }).click();
  await expect(pageA.getByText("No pending requests")).toBeVisible({ timeout: 10_000 });

  // --- 5. B is now a member: Tasks tab appears, content visible ----
  await pageB.reload();
  const tasksTab = pageB.getByRole("tab", { name: "Tasks" });
  await expect(tasksTab).toBeVisible({ timeout: 10_000 });
  await tasksTab.click();

  // --- 6. Dashboard status badges -----------------------------------
  await pageA.goto("/dashboard?scope=mine");
  const ownerCard = pageA.locator("a", { hasText: GROUP_NAME }).first();
  await expect(ownerCard.getByText("Owner", { exact: true })).toBeVisible();

  await pageB.goto("/dashboard?scope=mine");
  const memberCard = pageB.locator("a", { hasText: GROUP_NAME }).first();
  // exact:true -- "Member" would otherwise also substring-match the
  // card's "Members" count label.
  await expect(memberCard.getByText("Member", { exact: true })).toBeVisible();

  // --- 7. Member (B) creates a task, assignee list = real members --
  await pageB.goto(groupUrl);
  await pageB.getByRole("tab", { name: "Tasks" }).click();
  await pageB.getByRole("button", { name: "Create task" }).click();
  await pageB.locator("#task-title").fill(TASK_TITLE);

  const assigneeTrigger = pageB.locator('[data-slot="select-trigger"]').first();
  await assigneeTrigger.click();
  // Both real members must be offered -- proves the assignee list is
  // built from actual group membership, not an arbitrary/free value.
  await expect(pageB.locator('[data-slot="select-item"]', { hasText: "TEST_ Owner Account" })).toBeVisible();
  const memberOption = pageB.locator('[data-slot="select-item"]', { hasText: "TEST_ Member Account" });
  await expect(memberOption).toBeVisible();
  await memberOption.click();

  await pageB.getByRole("button", { name: "Create task" }).click();
  await expect(pageB.getByText(TASK_TITLE)).toBeVisible({ timeout: 10_000 });

  // --- 8. Change the task's status -----------------------------------
  // Only one task exists on this fresh board, so its status trigger is
  // unambiguous by its current displayed value ("To do", the default) --
  // simpler and more robust than trying to scope by a DOM ancestor.
  const statusTrigger = pageB.locator('[data-slot="select-trigger"]').filter({ hasText: "To do" });
  await statusTrigger.click();
  await pageB.locator('[data-slot="select-item"]', { hasText: "In progress" }).click();
  // Assert via the trigger's own displayed value, not a page-wide text
  // search -- "In progress" is also the (always-present) column header
  // in TasksTab, which would otherwise make this locator ambiguous.
  await expect(pageB.locator('[data-slot="select-trigger"]').filter({ hasText: "In progress" })).toBeVisible({
    timeout: 10_000,
  });

  // --- 9. Cleanup: owner deletes the group (also exercises deleteGroup) --
  await pageA.goto(groupUrl);
  await pageA.getByRole("button", { name: "Delete group" }).click();
  await pageA.getByRole("button", { name: "Delete group" }).click();
  await expect(pageA).toHaveURL(/\/dashboard\?scope=mine/, { timeout: 15_000 });
  await expect(pageA.getByText(GROUP_NAME)).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});
