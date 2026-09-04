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
const workspaceAdminSpec = read("tests/browser/workspace-admin-e2e.spec.mjs");
const workspaceAdminHelper = read("tests/browser/helpers/workspace-admin-flows.mjs");
const authHelper = read("tests/browser/helpers/auth.mjs");
const assertionsHelper = read("tests/browser/helpers/assertions.mjs");
const config = read("playwright.config.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const manualDemo = read("manual-demo-qa.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts["browser:qa:workspace-admin"] ===
    "playwright test tests/browser/workspace-admin-e2e.spec.mjs --config=playwright.config.mjs",
  "browser:qa:workspace-admin package script is wired"
);
assert(
  packageJson.scripts["stage28d:qa"] === "node scripts/qa-stage28d-workspace-admin-browser-e2e.mjs",
  "stage28d QA package script is wired"
);
assert(packageJson.scripts.build !== packageJson.scripts["browser:qa:workspace-admin"], "workspace/admin browser QA is not wired into npm run build");

[
  "stage28c:qa",
  "stage28b:qa",
  "stage28a:qa",
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
  "tests/browser/workspace-admin-e2e.spec.mjs",
  "tests/browser/helpers/workspace-admin-flows.mjs",
  "tests/browser/helpers/auth.mjs",
  "tests/browser/helpers/assertions.mjs",
  "tests/browser/student-e2e.spec.mjs",
  "scripts/seed-demo-data.mjs",
  "playwright.config.mjs"
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists`);
});

[
  "signInAs(page, \"workspace\", \"/workspace\")",
  "signInAs(page, \"admin\", \"/admin\")",
  "assertOpsPageSafe",
  "assertWorkspaceBlockedFromAdmin",
  "openOpsPage",
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
  "Broad live AutoCopy readiness"
].forEach((needle) => {
  assertIncludes(`${workspaceAdminSpec}\n${workspaceAdminHelper}`, needle, `workspace/admin browser E2E covers ${needle}`);
});

[
  "private quote",
  "Trade Copier remains a separate optional add-on",
  "safe operational summaries only",
  "Aggregate simulated-practice activity only",
  "Not a TradeHub signal",
  "No adapter, provider call, credential collection, or automation",
  "does not upload logos, change DNS, provision SSL, or call hosting providers",
  "External sending remains disabled",
  "does not enable broad live order execution",
  "Wrong role"
].forEach((needle) => {
  assertIncludes(`${workspaceAdminSpec}\n${workspaceAdminHelper}`, needle, `workspace/admin browser E2E asserts ${needle}`);
});

[
  "providerPayload",
  "vaultRef",
  "rawProvider",
  "brokerPassword",
  "metaapiToken",
  "paystackReference",
  "solanaSignature",
  "telegramToken",
  "apiKey",
  "rawPayment",
  "full external order id"
].forEach((needle) => {
  assertIncludes(workspaceAdminHelper, needle, `workspace/admin helper guards against ${needle}`);
});

[
  "publicPackagePricePatterns",
  "seedRawIdPatterns",
  "secretLikePatterns",
  "nextjs-portal",
  "Server Error",
  "Unhandled Runtime Error"
].forEach((needle) => {
  assertIncludes(assertionsHelper, needle, `shared browser assertions still guard ${needle}`);
});

[
  "demo.pro.influencer@example.test",
  "demo.superadmin@example.test",
  "TradeHubDemo!123",
  "/login?next="
].forEach((needle) => {
  assertIncludes(authHelper, needle, `auth helper still supports seeded workspace/admin ${needle}`);
});

assertIncludes(config, "TRADEHUB_BROWSER_BASE_URL", "Playwright config remains local/dev-server configurable");
assertIncludes(config, "TRADEHUB_BROWSER_REUSE_SERVER", "Playwright config can reuse local dev server");
assertIncludes(config, "npm run dev:stage15f", "Playwright config starts existing emulator-aware dev server command");

[
  "browser:qa:workspace-admin",
  "Stage 28D Workspace And Super Admin End-to-End Browser QA",
  "Workspace/Super Admin",
  "Workspace cannot access /admin",
  "Super Admin wrong-role check for /app/journal"
].forEach((needle) => {
  assertIncludes(`${backlog}\n${manualDemo}`, needle, `manual QA docs record ${needle}`);
});

assertIncludes(plan, "Stage 28D - Workspace And Super Admin End-to-End Browser QA", "plan documents Stage 28D");
assertIncludes(plan, "TH-2026-08-24-STAGE28D-WORKSPACE-ADMIN-BROWSER-E2E-HANDOFF", "plan has Stage 28D handoff");
assertIncludes(promptSummary, "Stage 28D - Workspace And Super Admin End-to-End Browser QA", "prompt summary documents Stage 28D");
assertIncludes(promptSummary, "TH-2026-08-24-STAGE28D-WORKSPACE-ADMIN-BROWSER-E2E-HANDOFF", "prompt summary has Stage 28D handoff");

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
  assertNotIncludes(`${workspaceAdminSpec}\n${authHelper}\n${config}`, forbidden, `workspace/admin browser QA source does not call/expose ${forbidden}`);
});

if (process.exitCode) {
  console.error("Stage 28D workspace/admin browser E2E source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28D workspace/admin browser E2E source guard passed.");
