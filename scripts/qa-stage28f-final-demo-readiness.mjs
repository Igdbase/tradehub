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
const seed = read("scripts/seed-demo-data.mjs");
const config = read("playwright.config.mjs");
const browserSmoke = read("tests/browser/tradehub-smoke.spec.mjs");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const workspaceAdminSpec = read("tests/browser/workspace-admin-e2e.spec.mjs");
const assertionsHelper = read("tests/browser/helpers/assertions.mjs");
const authHelper = read("tests/browser/helpers/auth.mjs");
const studentHelper = read("tests/browser/helpers/student-flows.mjs");
const workspaceAdminHelper = read("tests/browser/helpers/workspace-admin-flows.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const manualDemo = read("manual-demo-qa.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts["stage28f:qa"] === "node scripts/qa-stage28f-final-demo-readiness.mjs",
  "stage28f QA package script is wired"
);
assert(packageJson.scripts["stage28a:seed"] === "node scripts/seed-demo-data.mjs", "stage28a seed command remains wired");
assert(packageJson.scripts["seed:demo"] === "npm run stage28a:seed", "seed:demo command remains wired");
assert(packageJson.scripts["browser:qa"] === "playwright test --config=playwright.config.mjs", "browser:qa command remains wired");
assert(
  packageJson.scripts["browser:qa:student"] === "playwright test tests/browser/student-e2e.spec.mjs --config=playwright.config.mjs",
  "browser:qa:student command remains wired"
);
assert(
  packageJson.scripts["browser:qa:workspace-admin"] === "playwright test tests/browser/workspace-admin-e2e.spec.mjs --config=playwright.config.mjs",
  "browser:qa:workspace-admin command remains wired"
);
assert(packageJson.scripts.build !== packageJson.scripts["browser:qa"], "browser QA remains separate from npm run build");

[
  "stage28e:qa",
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
  assert(Boolean(packageJson.scripts[scriptName]), `${scriptName} remains wired for final demo readiness`);
});

[
  "scripts/seed-demo-data.mjs",
  "playwright.config.mjs",
  "tests/browser/tradehub-smoke.spec.mjs",
  "tests/browser/student-e2e.spec.mjs",
  "tests/browser/workspace-admin-e2e.spec.mjs",
  "tests/browser/helpers/auth.mjs",
  "tests/browser/helpers/assertions.mjs",
  "tests/browser/helpers/student-flows.mjs",
  "tests/browser/helpers/workspace-admin-flows.mjs",
  "manual-demo-qa.md"
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists`);
});

[
  "ws_demo_launch",
  "ws_demo_pro",
  "ws_demo_enterprise",
  "super_admin_demo_tradehub",
  "student_demo_active",
  "student_demo_pending_onboarding",
  "student_demo_payment_access_issue",
  "course_demo_foundations",
  "practice_demo_closed_session",
  "manual_aaaaaaaaaaaaaaaaaaaaaaaa",
  "assignment_demo_btc_replay",
  "cohort_demo_core_students",
  "feedback_demo_assignment_review",
  "notificationStateId",
  "enterprise_request_demo_crm_sync",
  "packageLicense",
  "enterpriseDeployment",
  "branding"
].forEach((needle) => {
  assertIncludes(seed, needle, `demo seed covers ${needle}`);
});

[
  "tier === \"launch\" ? 50",
  "tier === \"pro\" ? 500",
  "custom_review",
  "Trade Copier remains a separate optional add-on",
  "configureEmulatorSafety",
  "TRADEHUB_ALLOW_LIVE_DEMO_SEED",
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "merge: true"
].forEach((needle) => {
  assertIncludes(seed, needle, `demo seed keeps deterministic/local safety marker ${needle}`);
});

[
  "15000000",
  "45000000",
  "70000000",
  "150000000",
  "Launch price",
  "Pro price",
  "Enterprise price",
  "public package price"
].forEach((forbidden) => {
  assertNotIncludes(seed, forbidden, `demo seed does not include public package price marker ${forbidden}`);
});

[
  "defineConfig",
  "testDir: \"./tests/browser\"",
  "TRADEHUB_BROWSER_BASE_URL",
  "TRADEHUB_BROWSER_REUSE_SERVER",
  "npm run dev:stage15f",
  "trace: \"retain-on-failure\"",
  "screenshot: \"only-on-failure\"",
  "video: \"retain-on-failure\"",
  "Desktop Chrome"
].forEach((needle) => {
  assertIncludes(config, needle, `Playwright config retains ${needle}`);
});

[
  "assertTradeHubPageHealthy",
  "assertNoNextErrorOverlay",
  "assertNoRouteCrashText",
  "assertNoPublicPackagePrices",
  "assertNoRawDemoIds",
  "assertNoSecretLikeText",
  "assertNoForbiddenRenderedText",
  "assertSafeRoleBoundary",
  "Server Error",
  "Unhandled Runtime Error",
  "nextjs-portal",
  "publicPackagePricePatterns",
  "secretLikePatterns"
].forEach((needle) => {
  assertIncludes(assertionsHelper, needle, `browser assertion helper retains ${needle}`);
});

[
  "demo.student.active@example.test",
  "demo.pro.influencer@example.test",
  "demo.superadmin@example.test",
  "TradeHubDemo!123",
  "signInAs",
  "Seeded ${persona} login did not settle on",
  "npm run seed:demo completed"
].forEach((needle) => {
  assertIncludes(authHelper, needle, `browser auth helper retains ${needle}`);
});

[
  "/",
  "/app",
  "/app/practice",
  "/app/courses",
  "/app/journal",
  "/workspace",
  "/admin",
  "signInAs",
  "assertTradeHubPageHealthy"
].forEach((needle) => {
  assertIncludes(browserSmoke, needle, `browser smoke suite covers ${needle}`);
});

[
  "/app/practice",
  "/terminal",
  "/report",
  "/app/courses",
  "/proof",
  "/app/journal",
  "Crypto Journal Sync is independent",
  "student app home loads without reminder preferences",
  "not.toContainText(/Reminder preferences/i)",
  "assertStudentCourseCopySimplified",
  "Wrong role",
  "assertWrongRoleBlocked(page, \"/workspace\")",
  "assertWrongRoleBlocked(page, \"/admin\")"
].forEach((needle) => {
  assertIncludes(studentSpec, needle, `student browser suite covers ${needle}`);
});

[
  "Workspace licence",
  "Student management",
  "Practice Insights",
  "Workspace drills",
  "Course visibility",
  "Workspace brand",
  "Enterprise readiness",
  "Package licences",
  "Branding and domains",
  "Enterprise deployment and SLA",
  "Enterprise integration queue",
  "External reminders contract",
  "External signal ingestion",
  "Broad live AutoCopy readiness",
  "Wrong role",
  "assertWorkspaceBlockedFromAdmin",
  "assertAdminBlockedFromStudentPrivatePage"
].forEach((needle) => {
  assertIncludes(workspaceAdminSpec, needle, `workspace/admin browser suite covers ${needle}`);
});

assertIncludes(studentHelper, "assertSafeRoleBoundary", "student helper uses safe role-boundary assertion");
assertIncludes(workspaceAdminHelper, "assertSafeRoleBoundary", "workspace/admin helper uses safe role-boundary assertion");
assertIncludes(studentHelper, "assertNoForbiddenRenderedText", "student helper reuses shared forbidden-rendered-text assertion");
assertIncludes(workspaceAdminHelper, "assertNoForbiddenRenderedText", "workspace/admin helper reuses shared forbidden-rendered-text assertion");

[
  "Must Run Before Any Sales Demo",
  "If Browser QA Fails",
  "Known External Setup Still Required",
  "Later Regression",
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
  "TH-2026-08-24-STAGE28F-FINAL-DEMO-READINESS-HANDOFF"
].forEach((needle) => {
  assertIncludes(`${manualDemo}\n${backlog}`, ` ${needle}`.trim(), `final runbook documents ${needle}`);
});

[
  "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
  "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
  "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF",
  "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF",
  "TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF",
  "TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF",
  "TH-2026-08-24-STAGE28F-FINAL-DEMO-READINESS-HANDOFF"
].forEach((reference) => {
  assertIncludes(`${plan}\n${backlog}\n${manualDemo}\n${promptSummary}`, reference, `frozen/current handoff remains documented: ${reference}`);
});

[
  "Stage 28F - Final Demo Readiness Freeze",
  "internal build/demo readiness is source-QA frozen",
  "Do not claim browser QA passed unless it actually ran"
].forEach((needle) => {
  assertIncludes(`${plan}\n${backlog}\n${manualDemo}\n${promptSummary}`, needle, `docs mark final demo readiness freeze: ${needle}`);
});

[
  "fetch(",
  "axios",
  "MetaApi",
  "binance.",
  "bybit.",
  "paystack.",
  "solana.",
  "telegram.",
  "twilio",
  "resend",
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "createLiveOrder",
  "placeOrder",
  "providerPayload",
  "vaultRef",
  "apiKey",
  "webhookSecret",
  "brokerPassword",
  "rawPayment",
  "rawWorkspaceId",
  "rawStudentId"
].forEach((forbidden) => {
  assertNotIncludes(
    `${seed}\n${config}\n${browserSmoke}\n${workspaceAdminSpec}\n${authHelper}`,
    forbidden,
    `Stage 28 final demo path does not add forbidden behavior/secret marker ${forbidden}`
  );
});

if (process.exitCode) {
  console.error("Stage 28F final demo readiness source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28F final demo readiness source guard passed.");
