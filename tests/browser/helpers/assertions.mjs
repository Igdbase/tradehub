import { expect } from "@playwright/test";

const routeErrorPatterns = [
  /Server Error/i,
  /Unhandled Runtime Error/i,
  /Application error/i,
  /Hydration failed/i,
  /ChunkLoadError/i,
  /Firebase client config is incomplete/i
];

const publicPackagePricePatterns = [
  /₦\s*15,?000,?000/i,
  /NGN\s*15,?000,?000/i,
  /₦\s*70,?000,?000/i,
  /NGN\s*70,?000,?000/i,
  /₦\s*150,?000,?000/i,
  /NGN\s*150,?000,?000/i
];

const seedRawIdPatterns = [
  /ws_demo_(launch|pro|enterprise)/i,
  /student_demo_(active|pending_onboarding|payment_access_issue)/i,
  /super_admin_demo_tradehub/i,
  /influencer_demo_(launch|pro|enterprise)/i
];

const secretLikePatterns = [
  /TradeHubDemo!123/i,
  /AKIA[0-9A-Z]{16}/,
  /sk_(live|test)_[0-9A-Za-z]+/,
  /pk_(live|test)_[0-9A-Za-z]+/,
  /whsec_[0-9A-Za-z]+/,
  /xox[baprs]-[0-9A-Za-z-]+/,
  /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /vault:\/\//i,
  /api[_-]?key\s*[:=]\s*["']?[0-9A-Za-z_-]{12,}/i,
  /webhook[_-]?secret\s*[:=]\s*["']?[0-9A-Za-z_-]{12,}/i,
  /broker[_-]?password\s*[:=]\s*["']?[^"'\s]{8,}/i
];

export async function waitForTradeHubPage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "visible" });

  if (/\/app\/practice\/[^/]+\/terminal\/?$/.test(new URL(page.url()).pathname)) {
    await expect(page.getByTestId("practice-terminal-chart-first-shell")).toBeVisible();
    return;
  }

  await expect(page.locator("body")).toContainText(/TradeHub/i);
}

export async function assertNoNextErrorOverlay(page) {
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  await expect(page.locator("[data-nextjs-dialog-overlay]")).toHaveCount(0);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
}

export async function assertNoRouteCrashText(page) {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of routeErrorPatterns) {
    expect(bodyText, `route should not render ${pattern}`).not.toMatch(pattern);
  }
}

export async function assertNoPublicPackagePrices(page) {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of publicPackagePricePatterns) {
    expect(bodyText, `route should not expose package price ${pattern}`).not.toMatch(pattern);
  }
}

export async function assertNoRawDemoIds(page) {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of seedRawIdPatterns) {
    expect(bodyText, `route should not expose raw seeded id ${pattern}`).not.toMatch(pattern);
  }
}

export async function assertNoSecretLikeText(page) {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of secretLikePatterns) {
    expect(bodyText, `route should not expose secret-shaped text ${pattern}`).not.toMatch(pattern);
  }
}

export async function assertNoForbiddenRenderedText(page, patterns, contextLabel = "browser flow") {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of patterns) {
    expect(bodyText, `${contextLabel} should not expose ${pattern}`).not.toMatch(pattern);
  }
}

export async function assertSafeRoleBoundary(page, {
  allowedRedirectPaths = [],
  boundaryText = /Wrong role|different account type|Open my surface|This TradeHub route belongs to a different account type|Access pending|needs to assign its role|workspace access/i
} = {}) {
  await assertTradeHubPageHealthy(page);

  const pathname = new URL(page.url()).pathname;
  const bodyText = await page.locator("body").innerText();
  const renderedBlockedState = boundaryText.test(bodyText);
  const safelyRedirected = allowedRedirectPaths.includes(pathname);

  expect(
    renderedBlockedState || safelyRedirected,
    `expected safe role boundary, got path "${pathname}" with body: ${bodyText.slice(0, 500)}`
  ).toBeTruthy();
}

export async function assertTradeHubPageHealthy(page) {
  await waitForTradeHubPage(page);
  await assertNoNextErrorOverlay(page);
  await assertNoRouteCrashText(page);
  await assertNoPublicPackagePrices(page);
  await assertNoRawDemoIds(page);
  await assertNoSecretLikeText(page);
}
