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

function assertExcludesAll(source, needles, message) {
  const found = needles.filter((needle) => source.includes(needle));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

function assertIncludesAll(source, needles, message) {
  const missing = needles.filter((needle) => !source.includes(needle));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const studentHome = read("src/app/(student)/app/student-app-page-client.tsx");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const courseList = read("src/components/student-courses/student-course-list-client.tsx");
const courseReader = read("src/components/student-courses/student-course-reader-client.tsx");
const courseProof = read("src/components/student-courses/student-course-proof-client.tsx");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const studentHelper = read("tests/browser/helpers/student-flows.mjs");
const stage23dQa = read("scripts/qa-stage23d-messaging-final-acceptance.mjs");
const stage28cQa = read("scripts/qa-stage28c-student-browser-e2e.mjs");
const stage28fQa = read("scripts/qa-stage28f-final-demo-readiness.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const roadmap = read("complaint-resolution-roadmap.md");
const promptSummary = read("prompt/promptsumary.md");

[
  "complaint.md",
  "complaint-resolution-roadmap.md",
  "manual-demo-qa.md",
  "src/components/student-app/student-messaging-preferences-card.tsx"
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists for Stage 29A context/compatibility.`);
});

assert(
  packageJson.scripts["stage29a:qa"] === "node scripts/qa-stage29a-student-home-course-simplification.mjs",
  "package.json exposes npm run stage29a:qa."
);

// Stage 30D retired stage15y:qa (see docs/legacy-guard-triage.md).
[
  "stage28f:qa",
  "stage28e:qa",
  "stage19i:qa",
  "stage23d:qa"
].forEach((scriptName) => {
  assert(Boolean(packageJson.scripts[scriptName]), `${scriptName} remains wired for Stage 29A verification.`);
});

assertExcludesAll(
  studentHome,
  [
    "StudentMessagingPreferencesCard",
    "Reminder preferences",
    "/api/student/messaging/preferences",
    "External email",
    "WhatsApp",
    "SMS",
    "messaging provider",
    "dry-run",
    "suppression",
    "contact verification",
    "reminder delivery"
  ],
  "Student home no longer exposes reminder preferences or external messaging copy."
);

assertIncludesAll(
  studentHome,
  [
    "Courses",
    "View signals",
    "Copier safety",
    "Journal summary",
    "Practice",
    "Billing and access",
    "Pick up where you left off or open your next lesson.",
    "Contact your instructor if access is unavailable."
  ],
  "Student home stays focused on Courses, Signals, Copier, Journal, Practice, and Billing."
);

assertExcludesAll(
  practiceClient,
  [
    "No external messaging or push service is used.",
    "External messaging",
    "push service",
    "dry-run only"
  ],
  "Ordinary student Practice task-alert copy no longer explains messaging-provider internals."
);

const courseStudentCopySource = `${courseList}\n${courseReader}\n${courseProof}`;

assertExcludesAll(
  courseStudentCopySource,
  [
    "Course Hub API",
    "student API",
    "student APIs",
    "Student API filtered",
    "server-owned",
    "server-derived",
    "server-verified",
    "server-side",
    "HTTPS metadata",
    "metadata only",
    "Firestore",
    "repository",
    "implementation boundary",
    "source-QA",
    "Stage 09",
    "stage name",
    "safe YouTube video ID",
    "signed-in student account",
    "Workspace users only see aggregate counts.",
    "Proof ref",
    "Safe ref",
    "payment details, practice data, Copier records, or credentials"
  ],
  "Student Course components remove visible engineering/security implementation wording."
);

assertIncludesAll(
  courseStudentCopySource,
  [
    "Continue learning",
    "Lesson progress",
    "Resources",
    "Knowledge check",
    "Notes and bookmarks",
    "Complete lesson",
    "Course completion",
    "Proof",
    "Contact your instructor",
    "This lesson video is not available yet.",
    "Only you can see the notes you save here.",
    "Keep this proof for your records."
  ],
  "Student Course components use plain learning language."
);

assertIncludesAll(
  studentHelper,
  [
    "assertStudentCourseCopySimplified",
    "studentCourseEngineeringCopyPatterns",
    "/\\bAPI\\b/i",
    "/metadata/i",
    "/Firestore/i",
    "/Stage\\s+\\d+/i"
  ],
  "Student browser helpers include focused Course-copy guard."
);

assertIncludesAll(
  studentSpec,
  [
    "student app home loads without reminder preferences",
    "not.toContainText(/Reminder preferences/i)",
    "Courses|Signals|Copier|Journal|Practice|Billing",
    "assertStudentCourseCopySimplified(page)",
    "Notes and bookmarks",
    "Knowledge check",
    "not.toContainText(/answer key|correctIndex/i)",
    "assertWrongRoleBlocked(page, \"/workspace\")",
    "assertWrongRoleBlocked(page, \"/admin\")"
  ],
  "Student browser E2E reflects Stage 29A home and Course expectations."
);

assertNotIncludes(
  studentSpec,
  "student reminder preferences show dry-run/no-send posture",
  "Student browser E2E no longer expects the removed reminder preference card."
);

assertIncludesAll(
  `${stage23dQa}\n${stage28cQa}\n${stage28fQa}`,
  [
    "Normal student home no longer exposes dormant reminder preferences",
    "student app home loads without reminder preferences",
    "assertStudentCourseCopySimplified"
  ],
  "Compatibility QA scripts have been updated for the Stage 29A student UX decision."
);

assertIncludesAll(
  `${plan}\n${backlog}\n${roadmap}\n${promptSummary}`,
  [
    "Stage 29A - Student Home And Course Copy Simplification",
    "TH-2026-08-24-STAGE29A-STUDENT-HOME-COURSE-SIMPLIFICATION-HANDOFF",
    "Stage 29B",
    "Practice Hub And Sessions Navigation"
  ],
  "Docs record Stage 29A completion posture and keep Stage 29B pending."
);

assertIncludesAll(
  backlog,
  [
    "Student Home And Course Copy Manual QA - Must Test Before Demo",
    "Confirm Reminder Preferences and messaging-provider language are absent.",
    "Confirm Courses, Signals, Copier, Journal, Practice, and Billing remain reachable.",
    "Confirm no API/server/metadata/Firestore/stage/source-QA wording appears.",
    "Confirm answer keys remain hidden before submission.",
    "Confirm student cannot access `/workspace` or `/admin`."
  ],
  "manual-test-backlog.md records Stage 29A manual QA without claiming owner browser testing is complete."
);

// Scoped like the Stage 29D.5 guard: the student product surfaces (home + Course
// components) must never contain forbidden providers/markers at all.
[
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "createLiveOrder",
  "placeOrder",
  "MetaAPI",
  "Binance",
  "Bybit",
  "Paystack",
  "Solana",
  "Telegram",
  "providerPayload",
  "vaultRef",
  "apiKey",
  "brokerPassword",
  "webhookSecret"
].forEach((forbidden) => {
  assertNotIncludes(
    `${studentHome}\n${courseStudentCopySource}`,
    forbidden,
    `Stage 29A student/course product surfaces do not add forbidden behavior/secret marker ${forbidden}.`
  );
});

// The student browser spec legitimately contains provider names/secret markers inside
// its own safety assertions (negated not.toMatch/not.toContainText forbidden-text
// checks, forbidden-terms constants, and visible product copy matchers). Every spec
// occurrence must sit on such a safe line so the spec still cannot gain real provider
// calls, credentials, or live execution.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function specMarkerOccurrencesAreSafe(marker) {
  const lines = studentSpec.split("\n");
  const markerPattern = new RegExp(escapeRegExp(marker));
  for (let index = 0; index < lines.length; index += 1) {
    if (!markerPattern.test(lines[index])) continue;
    const line = lines[index];
    const context = `${lines.slice(Math.max(0, index - 3), index).join("\n")}\n${line}`;
    const negatedContext =
      /\.not\.to(Match|Contain\w*|Have\w*)\(/.test(context) || /forbidden\w*(Terms|CopyPatterns|TextPatterns|patterns)/.test(context);
    const uiCopyMatcher =
      /(toContainText|getBy(Label|Role|TestId|Text)|openStudentPage|test\(|expect\(|route\.fetch\()/.test(line);
    if (!negatedContext && !uiCopyMatcher) {
      return false;
    }
  }
  return true;
}

[
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "createLiveOrder",
  "placeOrder",
  "MetaAPI",
  "Binance",
  "Bybit",
  "Paystack",
  "Solana",
  "Telegram",
  "providerPayload",
  "vaultRef",
  "apiKey",
  "brokerPassword",
  "webhookSecret"
].forEach((forbidden) => {
  assert(
    specMarkerOccurrencesAreSafe(forbidden),
    `Stage 29A student browser spec mentions ${forbidden} only inside its own safety assertions.`
  );
});

if (process.exitCode) {
  console.error("Stage 29A student home and Course simplification source guard failed.");
  process.exit(process.exitCode);
}

console.log("Stage 29A student home and Course simplification source guard passed.");
