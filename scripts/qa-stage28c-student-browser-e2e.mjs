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
  "stage20d:qa",
  "stage19i:qa"
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

// Stage 29A made the journal read-only provider history (no manual CRUD), so the
// spec deliberately no longer visits /app/journal/trades/<manualTradeId>.
[
  "/app",
  "/app/practice",
  "/app/practice/${demoStudentIds.practiceSessionId}/terminal",
  "/app/practice/${demoStudentIds.practiceSessionId}/report",
  "/app/courses",
  "/app/courses/${demoStudentIds.courseId}",
  "/app/courses/${demoStudentIds.courseId}/proof",
  "/app/journal",
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
  "Read-only crypto history",
  "Copier setup and practice results stay separate",
  "journal-crypto-sync-panel",
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

// Scoped like the Stage 29D.5 guard: helpers and Playwright config must never
// reference forbidden providers/markers at all.
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
  assertNotIncludes(`${authHelper}\n${config}`, forbidden, `student browser QA helper/config does not call/expose ${forbidden}`);
});

// The browser spec legitimately contains these strings inside its own safety
// assertions: negated not.toMatch/not.toContainText forbidden-text checks (including
// multiline regex arguments and forbidden-terms constants), visible UI-copy matchers
// for provider branding, and Playwright's route.fetch interception API. Assert every
// spec occurrence sits on such a safe line so the spec still cannot gain real
// provider calls, credentials, or page-level fetches.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function specMarkerOccurrencesAreSafe(marker) {
  const lines = studentSpec.split("\n");
  const markerPattern = new RegExp(escapeRegExp(marker));
  for (let index = 0; index < lines.length; index += 1) {
    if (!markerPattern.test(lines[index])) continue;
    const context = `${lines.slice(Math.max(0, index - 3), index).join("\n")}\n${lines[index]}`;
    const negatedContext =
      /\.not\.to(Match|Contain\w*|Have\w*)\(/.test(context) || /forbidden\w*Terms/.test(context);
    const routeApi = /route\.fetch\(/.test(lines[index]);
    const uiCopyMatcher =
      ["Binance", "Bybit"].includes(marker) &&
      /(toContainText|openStudentPage)\(/.test(lines[index]) &&
      new RegExp(`/[^/\\n]*${escapeRegExp(marker)}[^/\\n]*/`).test(lines[index]);
    if (!negatedContext && !routeApi && !uiCopyMatcher) {
      return false;
    }
  }
  return true;
}

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
  assert(specMarkerOccurrencesAreSafe(forbidden), `student browser spec mentions ${forbidden} only inside its own safety assertions`);
});

if (process.exitCode) {
  console.error("Stage 28C student browser E2E source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28C student browser E2E source guard passed.");
