import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth.mjs";
import {
  assertAdminBlockedFromStudentPrivatePage,
  assertOpsPageSafe,
  assertWorkspaceBlockedFromAdmin
} from "./helpers/workspace-admin-flows.mjs";

test.describe("TradeHub seeded workspace browser E2E", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "workspace", "/workspace");
  });

  test("workspace shell and package sales surfaces load safely", async ({ page }) => {
    await assertOpsPageSafe(page, /Workspace|Pro Demo Academy|Workspace licence/i);
    await expect(page.locator("body")).toContainText(/Workspace licence|Pro Workspace|Seat cap|Seats left/i);
    await expect(page.locator("body")).toContainText(/Pricing is handled by private quote\/contact sales/i);
    await expect(page.locator("body")).toContainText(/Trade Copier remains a separate optional add-on/i);
    await expect(page.locator("body")).toContainText(/Launch|Pro|Enterprise|custom-reviewed|contact/i);
  });

  test("workspace CRM and operations sections expose safe summaries only", async ({ page }) => {
    await assertOpsPageSafe(page, /Student management|Workspace-scoped students/i);
    await expect(page.locator("body")).toContainText(/Lifecycle|Search loaded page|support ref/i);
    await expect(page.locator("body")).toContainText(/Course ready|Practice ready|AutoCopy blocked/i);
    await expect(page.locator("body")).toContainText(/safe operational summaries only|limited to operational summaries/i);
  });

  test("workspace practice, assignment, course, and external preview surfaces load safely", async ({ page }) => {
    await assertOpsPageSafe(page, /Practice Insights|Workspace drills|Course visibility/i);
    await expect(page.locator("body")).toContainText(/Aggregate simulated-practice activity only/i);
    await expect(page.locator("body")).toContainText(/Workspace progress is aggregate only/i);
    await expect(page.locator("body")).toContainText(/Drafts and published courses|Open Course Hub/i);
    await expect(page.locator("body")).toContainText(/External preview only|Not a TradeHub signal|inspection-only/i);
  });

  test("workspace branding, enterprise, and integration posture is metadata-only", async ({ page }) => {
    await assertOpsPageSafe(page, /Workspace brand|Enterprise readiness|Deployment and SLA scope/i);
    await expect(page.locator("body")).toContainText(/Logo values are HTTPS metadata only/i);
    await expect(page.locator("body")).toContainText(/custom domains are admin-reviewed/i);
    await expect(page.locator("body")).toContainText(/contract-scoped|does not provision cloud infrastructure/i);
    await expect(page.locator("body")).toContainText(/Launch and Pro packages stay on standard TradeHub integrations|Enterprise integration/i);
    await expect(page.locator("body")).toContainText(/No adapter, provider call, credential collection, or automation/i);
  });

  test("workspace persona is safely blocked from Super Admin", async ({ page }) => {
    await assertWorkspaceBlockedFromAdmin(page);
  });
});

test.describe("TradeHub seeded Super Admin browser E2E", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "admin", "/admin");
  });

  test("admin shell and package ops panels load safely", async ({ page }) => {
    await assertOpsPageSafe(page, /Super Admin|Package licences|Workspace package/i);
    await expect(page.locator("body")).toContainText(/Launch supports 50 active students/i);
    await expect(page.locator("body")).toContainText(/Pro supports 500/i);
    await expect(page.locator("body")).toContainText(/Enterprise is custom-reviewed/i);
    await expect(page.locator("body")).toContainText(/Trade Copier remains a separate optional add-on/i);
    await expect(page.locator("body")).toContainText(/masked|support status only|do not collect payment|trigger money movement/i);
  });

  test("admin branding, enterprise, and integration panels render masked metadata", async ({ page }) => {
    await assertOpsPageSafe(page, /Branding and domains|Enterprise deployment and SLA|Enterprise integration queue/i);
    await expect(page.locator("body")).toContainText(/does not upload logos, change DNS, provision SSL, or call hosting providers/i);
    await expect(page.locator("body")).toContainText(/metadata only|does not provision cloud infrastructure/i);
    await expect(page.locator("body")).toContainText(/No CRM, payment, analytics, broker/i);
    await expect(page.locator("body")).toContainText(/raw source IDs|credentials|private URLs|provider payloads/i);
  });

  test("admin support, payments, messaging, signals, and AutoCopy readiness load safely", async ({ page }) => {
    await assertOpsPageSafe(page, /Support overview|Payment operations|External reminders contract/i);
    await expect(page.locator("body")).toContainText(/Messaging readiness|External sending remains disabled|dry-run/i);
    await expect(page.locator("body")).toContainText(/External signal ingestion|No AutoCopy execution|Ingestion remains disabled/i);
    await expect(page.locator("body")).toContainText(/Broad live AutoCopy readiness|Live AutoCopy support, incident, and rollback posture/i);
    await expect(page.locator("body")).toContainText(/does not enable broad live order execution|dry-run|kill-switch/i);
  });

  test("Wrong role admin does not get student private route context by accident", async ({ page }) => {
    await assertAdminBlockedFromStudentPrivatePage(page, "/app/journal");
  });
});
