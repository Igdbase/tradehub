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
const browserSmoke = read("tests/browser/tradehub-smoke.spec.mjs");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const workspaceAdminSpec = read("tests/browser/workspace-admin-e2e.spec.mjs");
const assertionsHelper = read("tests/browser/helpers/assertions.mjs");
const authHelper = read("tests/browser/helpers/auth.mjs");
const studentHelper = read("tests/browser/helpers/student-flows.mjs");
const workspaceAdminHelper = read("tests/browser/helpers/workspace-admin-flows.mjs");
const config = read("playwright.config.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const manualDemo = read("manual-demo-qa.md");
const promptSummary = read("prompt/promptsumary.md");

assert(packageJson.scripts["browser:qa"] === "playwright test --config=playwright.config.mjs", "browser:qa package script remains wired");
assert(
  packageJson.scripts["browser:qa:student"] === "playwright test tests/browser/student-e2e.spec.mjs --config=playwright.config.mjs",
  "browser:qa:student package script remains wired"
);
assert(
  packageJson.scripts["browser:qa:workspace-admin"] === "playwright test tests/browser/workspace-admin-e2e.spec.mjs --config=playwright.config.mjs",
  "browser:qa:workspace-admin package script remains wired"
);
assert(
  packageJson.scripts["stage28e:qa"] === "node scripts/qa-stage28e-browser-qa-polish.mjs",
  "stage28e QA package script is wired"
);
assert(packageJson.scripts.build !== packageJson.scripts["browser:qa"], "browser QA is not wired into npm run build");

[
  "stage28d:qa",
  "stage28c:qa",
  "stage28b:qa",
  "stage28a:qa",
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
  "tests/browser/student-e2e.spec.mjs",
  "tests/browser/workspace-admin-e2e.spec.mjs",
  "tests/browser/helpers/auth.mjs",
  "tests/browser/helpers/assertions.mjs",
  "tests/browser/helpers/student-flows.mjs",
  "tests/browser/helpers/workspace-admin-flows.mjs",
  "scripts/seed-demo-data.mjs"
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists`);
});

[
  "assertNoForbiddenRenderedText",
  "assertSafeRoleBoundary",
  "expected safe role boundary",
  "assertTradeHubPageHealthy",
  "assertNoNextErrorOverlay",
  "assertNoRouteCrashText",
  "assertNoPublicPackagePrices",
  "assertNoRawDemoIds",
  "assertNoSecretLikeText"
].forEach((needle) => {
  assertIncludes(assertionsHelper, needle, `shared assertion helper includes ${needle}`);
});

[
  "Seeded ${persona} login did not reach",
  "Make sure Firebase emulators are running and npm run seed:demo completed",
  "demo.student.active@example.test",
  "demo.pro.influencer@example.test",
  "demo.superadmin@example.test"
].forEach((needle) => {
  assertIncludes(authHelper, needle, `auth helper has reliable seeded-login diagnostic: ${needle}`);
});

[
  "assertNoForbiddenRenderedText",
  "assertSafeRoleBoundary",
  "assertWrongRoleBlocked",
  "allowedRedirectPaths: [\"/app\"]"
].forEach((needle) => {
  assertIncludes(studentHelper, needle, `student flow helper reuses shared guard/boundary: ${needle}`);
});

[
  "assertNoForbiddenRenderedText",
  "assertSafeRoleBoundary",
  "assertWorkspaceBlockedFromAdmin",
  "assertAdminBlockedFromStudentPrivatePage",
  "allowedRedirectPaths: [\"/workspace\"]",
  "allowedRedirectPaths: [\"/admin\"]"
].forEach((needle) => {
  assertIncludes(workspaceAdminHelper, needle, `workspace/admin helper reuses shared guard/boundary: ${needle}`);
});

[
  "signInAs",
  "assertTradeHubPageHealthy",
  "/app/practice",
  "/workspace",
  "/admin"
].forEach((needle) => {
  assertIncludes(browserSmoke, needle, `full browser smoke still covers ${needle}`);
});

[
  "assertWrongRoleBlocked(page, \"/workspace\")",
  "assertWrongRoleBlocked(page, \"/admin\")",
  "assertStudentPageSafe",
  "openStudentPage"
].forEach((needle) => {
  assertIncludes(studentSpec, needle, `student browser suite keeps ${needle}`);
});

[
  "assertWorkspaceBlockedFromAdmin",
  "assertAdminBlockedFromStudentPrivatePage",
  "assertOpsPageSafe",
  "Workspace licence",
  "Student management",
  "Enterprise readiness",
  "External signal ingestion",
  "Broad live AutoCopy readiness"
].forEach((needle) => {
  assertIncludes(workspaceAdminSpec, needle, `workspace/admin browser suite keeps ${needle}`);
});

assertIncludes(config, "TRADEHUB_BROWSER_BASE_URL", "Playwright config supports base URL override");
assertIncludes(config, "TRADEHUB_BROWSER_REUSE_SERVER", "Playwright config supports reuse-server mode");
assertIncludes(config, "trace: \"retain-on-failure\"", "Playwright config retains traces on failure");
assertIncludes(config, "screenshot: \"only-on-failure\"", "Playwright config captures failure screenshots");
assertIncludes(config, "video: \"retain-on-failure\"", "Playwright config retains failure video");

[
  "npm run firebase:emulators",
  "npm run seed:demo",
  "npm run clean:next",
  "npm run dev:stage15f",
  "npx playwright install chromium",
  "npm run browser:qa",
  "npm run browser:qa:student",
  "npm run browser:qa:workspace-admin",
  "test-results",
  "playwright-report",
  "If seeded sign-in fails"
].forEach((needle) => {
  assertIncludes(`${manualDemo}\n${backlog}`, needle, `manual runbook documents ${needle}`);
});

assertIncludes(plan, "Stage 28E - Browser QA Bug-Fix And UX Polish Pass", "plan documents Stage 28E");
assertIncludes(plan, "TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF", "plan has Stage 28E handoff");
assertIncludes(promptSummary, "Stage 28E - Browser QA Bug-Fix And UX Polish Pass", "prompt summary documents Stage 28E");
assertIncludes(promptSummary, "TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF", "prompt summary has Stage 28E handoff");

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
  "fetch("
].forEach((forbidden) => {
  assertNotIncludes(`${browserSmoke}\n${studentSpec}\n${workspaceAdminSpec}\n${authHelper}\n${config}`, forbidden, `browser QA polish source does not call/expose ${forbidden}`);
});

if (process.exitCode) {
  console.error("Stage 28E browser QA polish source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28E browser QA polish source guard passed.");

