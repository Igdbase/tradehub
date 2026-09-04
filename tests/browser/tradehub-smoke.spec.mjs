import { expect, test } from "@playwright/test";
import { assertTradeHubPageHealthy } from "./helpers/assertions.mjs";
import { signInAs } from "./helpers/auth.mjs";

test.describe("TradeHub browser smoke", () => {
  test("public landing loads safely", async ({ page }) => {
    await page.goto("/");
    await assertTradeHubPageHealthy(page);
    await expect(page.locator("body")).toContainText(/Launch-hardened|Influencer|TradeHub/i);
  });

  const studentRoutes = [
    { path: "/app", label: /Student|TradeHub|Practice|Courses|Journal/i },
    { path: "/app/practice", label: /Practice|Backtesting|simulated|TradeHub/i },
    { path: "/app/courses", label: /Courses|Continue learning|TradeHub/i },
    { path: "/app/journal", label: /Journal|Manual trading|Practice|TradeHub/i }
  ];

  for (const route of studentRoutes) {
    test(`student route loads safely: ${route.path}`, async ({ page }) => {
      await signInAs(page, "student", route.path);
      await expect(page.locator("body")).toContainText(route.label);
    });
  }

  test("workspace route loads safely for seeded influencer", async ({ page }) => {
    await signInAs(page, "workspace", "/workspace");
    await expect(page.locator("body")).toContainText(/Workspace|licence|students|TradeHub/i);
  });

  test("super admin route loads safely for seeded operator", async ({ page }) => {
    await signInAs(page, "admin", "/admin");
    await expect(page.locator("body")).toContainText(/Super Admin|operator|support|TradeHub/i);
  });
});
