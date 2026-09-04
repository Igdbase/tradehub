import { expect } from "@playwright/test";
import { assertTradeHubPageHealthy } from "./assertions.mjs";

export const demoUsers = {
  student: {
    email: "demo.student.active@example.test",
    password: "TradeHubDemo!123"
  },
  workspace: {
    email: "demo.pro.influencer@example.test",
    password: "TradeHubDemo!123"
  },
  admin: {
    email: "demo.superadmin@example.test",
    password: "TradeHubDemo!123"
  }
};

export async function waitForSettledApplicationPath(page, expectedPath, {
  timeout = 45_000,
  stableFor = 1_000
} = {}) {
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout });

  const stableUntil = Date.now() + stableFor;
  while (Date.now() < stableUntil) {
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== expectedPath) {
      throw new Error(
        `Application navigation left ${expectedPath} before settling. Current path: ${currentPath}.`
      );
    }
    await page.waitForTimeout(50);
  }
}

export async function signInAs(page, persona, nextPath) {
  const user = demoUsers[persona];

  if (!user) {
    throw new Error(`Unknown browser QA persona: ${persona}`);
  }

  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  const emailField = page.getByLabel("Email");
  await expect(emailField, "seeded login form should be visible on the first cold request").toBeVisible({ timeout: 30_000 });
  await emailField.fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await waitForSettledApplicationPath(page, nextPath).catch(async (error) => {
    const currentUrl = page.url();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(
      `Seeded ${persona} login did not settle on ${nextPath}. Current URL: ${currentUrl}. ` +
      `Make sure Firebase emulators are running and npm run seed:demo completed. ` +
      `Visible text: ${bodyText.slice(0, 500)}. Cause: ${error instanceof Error ? error.message : String(error)}`
    );
  });

  await expect(page, `seeded ${persona} should land on ${nextPath}`).toHaveURL(
    new RegExp(`${nextPath.replace(/\//g, "\\/")}$`)
  );
  await assertTradeHubPageHealthy(page);
}
