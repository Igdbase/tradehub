import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (condition) {
    pass(message);
  } else {
    fail(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

const packageJson = JSON.parse(read("package.json"));
const config = read("playwright.config.mjs");
const smokeSpec = read("tests/browser/tradehub-smoke.spec.mjs");
const authHelper = read("tests/browser/helpers/auth.mjs");
const assertionsHelper = read("tests/browser/helpers/assertions.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(packageJson.scripts["browser:qa"] === "playwright test --config=playwright.config.mjs", "browser:qa package script is wired");
assert(packageJson.scripts["stage28b:qa"] === "node scripts/qa-stage28b-browser-qa-foundation.mjs", "stage28b QA package script is wired");
assert(packageJson.devDependencies?.["@playwright/test"], "@playwright/test dev dependency is declared");
assert(packageJson.scripts.build !== packageJson.scripts["browser:qa"], "browser QA is not wired into npm run build");

[
  "stage28a:qa",
  "stage28a:seed",
  "seed:demo",
  "stage27j:qa",
  "stage26a:qa",
  "stage25e:qa",
  "stage24c:qa",
  "stage23d:qa",
  "stage22b:qa",
  "stage21d:qa",
  "stage20d:qa",
  "stage19i:qa",
  "stage18x:qa",
  "stage15y:qa"
].forEach((scriptName) => {
  assert(Boolean(packageJson.scripts[scriptName]), `${scriptName} remains wired`);
});

[
  "playwright.config.mjs",
  "tests/browser/tradehub-smoke.spec.mjs",
  "tests/browser/helpers/auth.mjs",
  "tests/browser/helpers/assertions.mjs",
  "scripts/seed-demo-data.mjs"
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists`);
});

assertIncludes(config, "defineConfig", "Playwright config uses Playwright test config");
assertIncludes(config, "TRADEHUB_BROWSER_BASE_URL", "Playwright config supports local base URL override");
assertIncludes(config, "TRADEHUB_BROWSER_REUSE_SERVER", "Playwright config can reuse an existing dev server");
assertIncludes(config, "npm run dev:stage15f", "Playwright config starts the existing local dev server command");
assertIncludes(config, "127.0.0.1", "Playwright config is local-only by default");
assertIncludes(config, "Desktop Chrome", "Playwright config defines a Chromium smoke project");

[
  "/",
  "/app",
  "/app/practice",
  "/app/courses",
  "/app/journal",
  "/workspace",
  "/admin"
].forEach((route) => {
  assertIncludes(smokeSpec, `"${route}"`, `browser smoke covers ${route}`);
});

[
  "demo.student.active@example.test",
  "demo.pro.influencer@example.test",
  "demo.superadmin@example.test",
  "TradeHubDemo!123",
  "signInAs",
  "/login?next="
].forEach((needle) => {
  assertIncludes(authHelper, needle, `auth helper includes ${needle}`);
});

[
  "assertTradeHubPageHealthy",
  "Server Error",
  "Unhandled Runtime Error",
  "nextjs-portal",
  "data-nextjs-dialog-overlay",
  "publicPackagePricePatterns",
  "seedRawIdPatterns",
  "secretLikePatterns",
  "TradeHubDemo!123",
  "vault:\\/\\/",
  "api[_-]?key",
  "webhook[_-]?secret",
  "broker[_-]?password"
].forEach((needle) => {
  assertIncludes(assertionsHelper, needle, `browser assertion guard includes ${needle}`);
});

[
  "assertTradeHubPageHealthy",
  "signInAs",
  "student route loads safely",
  "workspace route loads safely",
  "super admin route loads safely"
].forEach((needle) => {
  assertIncludes(smokeSpec, needle, `browser smoke uses ${needle}`);
});

[
  "MetaAPI",
  "Binance",
  "Bybit",
  "Paystack",
  "Solana",
  "Telegram",
  "Twilio",
  "Resend",
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "createLiveOrder",
  "placeOrder",
  "providerPayload",
  "vaultRef"
].forEach((forbidden) => {
  assertNotIncludes(`${config}\n${smokeSpec}\n${authHelper}`, forbidden, `browser QA source does not call/expose ${forbidden}`);
});

assertIncludes(backlog, "npm run browser:qa", "manual backlog documents browser QA command");
assertIncludes(backlog, "Stage 28B Playwright Browser QA Foundation", "manual backlog documents Stage 28B");
assertIncludes(backlog, "Start Firebase emulators", "manual backlog records emulator prerequisite");
assertIncludes(backlog, "npm run seed:demo", "manual backlog records seed prerequisite");
assertIncludes(plan, "Stage 28B - Playwright Browser QA Foundation", "plan documents Stage 28B");
assertIncludes(plan, "TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF", "plan has Stage 28B handoff");
assertIncludes(promptSummary, "Stage 28B - Playwright Browser QA Foundation", "prompt summary documents Stage 28B");
assertIncludes(promptSummary, "TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF", "prompt summary has Stage 28B handoff");

if (process.exitCode) {
  console.error("Stage 28B browser QA foundation source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28B browser QA foundation source guard passed.");
