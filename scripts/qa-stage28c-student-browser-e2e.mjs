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
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const studentHelper = read("tests/browser/helpers/student-flows.mjs");
const authHelper = read("tests/browser/helpers/auth.mjs");
const assertionsHelper = read("tests/browser/helpers/assertions.mjs");
const config = read("playwright.config.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const manualDemo = read("manual-demo-qa.md");
const promptSummary = read("prompt/promptsumary.md");

assert(packageJson.scripts["browser:qa"] === "playwright test --config=playwright.config.mjs", "browser:qa remains wired");
assert(packageJson.scripts["browser:qa:student"] === "playwright test tests/browser/student-e2e.spec.mjs --config=playwright.config.mjs", "browser:qa:student package script is wired");
assert(packageJson.scripts["stage28c:qa"] === "node scripts/qa-stage28c-student-browser-e2e.mjs", "stage28c QA package script is wired");
assert(packageJson.scripts.build !== packageJson.scripts["browser:qa:student"], "student browser QA is not wired into npm run build");

[
  "stage28b:qa",
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
  "tests/browser/student-e2e.spec.mjs",
  "tests/browser/helpers/student-flows.mjs",
  "tests/browser/helpers/auth.mjs",
  "tests/browser/helpers/assertions.mjs",
  "scripts/seed-demo-data.mjs",
  "playwright.config.mjs"
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists`);
});

[
  "signInAs(page, \"student\", \"/app\")",
  "assertStudentPageSafe",
  "assertTradeHubPageHealthy",
  "assertWrongRoleBlocked",
  "demoStudentIds",
  "practiceSessionId",
  "courseId",
  "manualTradeId"
].forEach((needle) => {
  assertIncludes(`${studentSpec}\n${studentHelper}`, needle, `student browser E2E uses ${needle}`);
});

[
  "/app",
  "/app/practice",
  "/app/practice/${demoStudentIds.practiceSessionId}/terminal",
  "/app/practice/${demoStudentIds.practiceSessionId}/report",
  "/app/courses",
  "/app/courses/${demoStudentIds.courseId}",
  "/app/courses/${demoStudentIds.courseId}/proof",
  "/app/journal",
  "/app/journal/trades/${demoStudentIds.manualTradeId}",
  "/workspace",
  "/admin"
].forEach((routeNeedle) => {
  assertIncludes(studentSpec, routeNeedle, `student browser E2E covers ${routeNeedle}`);
});

[
  "student app home",
  "practice-terminal-chart-first-shell",
  "browser-printable practice review",
  "Demo Trading Foundations",
  "Notes and bookmarks",
  "Knowledge check",
  "Private manual trade journal",
  "Manual analytics",
  "Trade review chart",
  "student app home loads without reminder preferences",
  "Wrong role"
].forEach((copyNeedle) => {
  assertIncludes(`${studentSpec}\n${studentHelper}`, copyNeedle, `student browser E2E asserts ${copyNeedle}`);
});

[
  "not.toContainText(/Reminder preferences/i)",
  "assertStudentCourseCopySimplified",
  "studentCourseEngineeringCopyPatterns"
].forEach((needle) => {
  assertIncludes(`${studentSpec}\n${studentHelper}`, needle, `student browser E2E locks in Stage 29A simplification: ${needle}`);
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
  "correctIndex",
  "answerKey"
].forEach((needle) => {
  assertIncludes(studentHelper, needle, `student helper guards against ${needle}`);
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
  "demo.student.active@example.test",
  "TradeHubDemo!123",
  "/login?next="
].forEach((needle) => {
  assertIncludes(authHelper, needle, `auth helper still supports seeded student ${needle}`);
});

assertIncludes(config, "TRADEHUB_BROWSER_BASE_URL", "Playwright config remains local/dev-server configurable");
assertIncludes(config, "TRADEHUB_BROWSER_REUSE_SERVER", "Playwright config can reuse local dev server");
assertIncludes(config, "npm run dev:stage15f", "Playwright config starts existing emulator-aware dev server command");

[
  "browser:qa:student",
  "Stage 28C Student End-to-End Browser QA",
  "practice terminal order placement remains manual follow-up",
  "student cannot access /workspace",
  "student cannot access /admin"
].forEach((needle) => {
  assertIncludes(`${backlog}\n${manualDemo}`, needle, `manual QA docs record ${needle}`);
});

assertIncludes(plan, "Stage 28C - Student End-to-End Browser QA", "plan documents Stage 28C");
assertIncludes(plan, "TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF", "plan has Stage 28C handoff");
assertIncludes(promptSummary, "Stage 28C - Student End-to-End Browser QA", "prompt summary documents Stage 28C");
assertIncludes(promptSummary, "TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF", "prompt summary has Stage 28C handoff");

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
  "vaultRef",
  "fetch("
].forEach((forbidden) => {
  assertNotIncludes(`${studentSpec}\n${authHelper}\n${config}`, forbidden, `student browser QA source does not call/expose ${forbidden}`);
});

if (process.exitCode) {
  console.error("Stage 28C student browser E2E source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28C student browser E2E source guard passed.");
