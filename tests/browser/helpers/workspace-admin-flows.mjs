import { expect } from "@playwright/test";
import {
  assertNoForbiddenRenderedText,
  assertSafeRoleBoundary,
  assertTradeHubPageHealthy
} from "./assertions.mjs";

export const workspaceAdminForbiddenTextPatterns = [
  /providerPayload/i,
  /vaultRef/i,
  /rawPayment/i,
  /rawProvider/i,
  /webhookSecret/i,
  /brokerPassword/i,
  /metaapiToken/i,
  /paystackReference/i,
  /solanaSignature/i,
  /telegramToken/i,
  /apiKey/i,
  /privateKey/i,
  /accountId/i,
  /full external order id/i,
  /manual_aaaaaaaaaaaaaaaaaaaaaaaa/i,
  /student_demo_(active|pending_onboarding|payment_access_issue)/i,
  /ws_demo_(launch|pro|enterprise)/i,
  /influencer_demo_(launch|pro|enterprise)/i,
  /super_admin_demo_tradehub/i
];

export async function assertOpsPageSafe(page, expectedText) {
  await assertTradeHubPageHealthy(page);

  if (expectedText) {
    await expect(page.locator("body")).toContainText(expectedText);
  }

  await assertNoForbiddenRenderedText(page, workspaceAdminForbiddenTextPatterns, "workspace/admin browser flow");
}

export async function openOpsPage(page, path, expectedText) {
  await page.goto(path);
  await assertOpsPageSafe(page, expectedText);
}

export async function assertWorkspaceBlockedFromAdmin(page) {
  await page.goto("/admin");
  await assertOpsPageSafe(page);
  await assertSafeRoleBoundary(page, { allowedRedirectPaths: ["/workspace"] });
}

export async function assertAdminBlockedFromStudentPrivatePage(page, path = "/app/journal") {
  await page.goto(path);
  await assertOpsPageSafe(page);
  await assertSafeRoleBoundary(page, { allowedRedirectPaths: ["/admin"] });
}
