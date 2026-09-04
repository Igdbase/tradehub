import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const rules = read("firestore.rules");

assert(packageJson.scripts["stage28a:seed"] === "node scripts/seed-demo-data.mjs", "stage28a seed package script is wired");
assert(packageJson.scripts["seed:demo"] === "npm run stage28a:seed", "clear seed:demo package script is wired");
assert(packageJson.scripts["stage28a:qa"] === "node scripts/qa-stage28a-demo-seed-pack.mjs", "stage28a QA package script is wired");

[
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

assertIncludes(seed, "configureEmulatorSafety", "seed has an explicit emulator safety function");
assertIncludes(seed, "FIRESTORE_EMULATOR_HOST", "seed targets the Firestore emulator");
assertIncludes(seed, "FIREBASE_AUTH_EMULATOR_HOST", "seed targets the Auth emulator");
assertIncludes(seed, "TRADEHUB_ALLOW_LIVE_DEMO_SEED", "seed has a live-write refusal gate");
assertIncludes(seed, "stripUndefined", "seed strips undefined values before Firestore writes");
assertIncludes(seed, "{ merge: true }", "seed uses merge upserts for idempotency");
assertIncludes(seed, "getAuth", "seed includes deterministic Auth users");
assertIncludes(seed, "getFirestore", "seed includes deterministic Firestore records");

[
  "super_admin_demo_tradehub",
  "ws_demo_launch",
  "ws_demo_pro",
  "ws_demo_enterprise",
  "influencer_demo_launch",
  "influencer_demo_pro",
  "influencer_demo_enterprise",
  "student_demo_active",
  "student_demo_pending_onboarding",
  "student_demo_payment_access_issue",
  "course_demo_foundations",
  "practice_demo_closed_session",
  "practice_order_demo_closed_win",
  "assignment_demo_btc_replay",
  "cohort_demo_core_students",
  "enterprise_request_demo_crm_sync",
  "manual_aaaaaaaaaaaaaaaaaaaaaaaa",
  "manual_bbbbbbbbbbbbbbbbbbbbbbbb",
  "manual_cccccccccccccccccccccccc"
].forEach((demoId) => {
  assertIncludes(seed, demoId, `deterministic demo id exists: ${demoId}`);
});

assertIncludes(seed, "tier === \"launch\" ? 50", "Launch workspace has 50-seat posture");
assertIncludes(seed, "tier === \"pro\" ? 500", "Pro workspace has 500-seat posture");
assertIncludes(seed, "tier === \"enterprise\"", "Enterprise workspace has custom package posture");
assertIncludes(seed, "packageLicense", "package/licence demo records are seeded");
assertIncludes(seed, "maintenanceRenewalStatus", "maintenance demo state is seeded");
assertIncludes(seed, "brandingMode", "branding readiness demo state is seeded");
assertIncludes(seed, "customDomainStatus", "domain readiness demo state is seeded");
assertIncludes(seed, "enterpriseDeployment", "Enterprise deployment/SLA demo state is seeded");
assertIncludes(seed, "enterprise_integration_requests", "Enterprise integration request demo state is seeded");
assertIncludes(seed, "Trade Copier remains a separate optional add-on", "Trade Copier boundary is explicit in demo metadata");

[
  "workspaces/${proWorkspaceId}/courses",
  "course_progress",
  "lesson_progress",
  "course_lesson_bookmarks",
  "playbooks",
  "practice_sessions",
  "practice_orders",
  "practice_annotations",
  "practice_bookmarks",
  "practice_cohorts",
  "practice_assignments",
  "practice_instructor_feedback",
  "practice_notification_state",
  "manual_journal_trades",
  "subscriptions/current"
].forEach((pathNeedle) => {
  assertIncludes(seed, pathNeedle, `demo seed covers ${pathNeedle}`);
});

[
  "15000000",
  "45000000",
  "70000000",
  "150000000",
  "Creator Lifetime",
  "Launch price",
  "Pro price",
  "Enterprise price",
  "public package price"
].forEach((forbiddenPriceCopy) => {
  assertNotIncludes(seed, forbiddenPriceCopy, `no public package price copy in seed: ${forbiddenPriceCopy}`);
});

[
  "apiKey",
  "secretKey",
  "webhookSecret",
  "vaultRef",
  "providerPayload",
  "accountId",
  "brokerPassword",
  "metaapiToken",
  "paystackReference",
  "solanaSignature",
  "telegramToken",
  "privateKey"
].forEach((forbiddenField) => {
  assertNotIncludes(seed, forbiddenField, `seed does not include forbidden secret/provider field ${forbiddenField}`);
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
  "placeOrder"
].forEach((forbiddenCall) => {
  assertNotIncludes(seed, forbiddenCall, `seed does not call external/live provider behavior: ${forbiddenCall}`);
});

[
  "practice_sessions",
  "practice_orders",
  "manual_journal_trades",
  "practice_assignments",
  "enterprise_integration_requests",
  "platform_package_licences",
  "package_license_ops",
  "platform_workspace_branding_domains",
  "branding_domain_ops",
  "enterprise_deployment"
].forEach((rulesNeedle) => {
  assertIncludes(rules, rulesNeedle, `Firestore rules mention protected ${rulesNeedle} path posture`);
});

assertIncludes(plan, "Stage 28A - Demo Seed Pack", "plan documents Stage 28A");
assertIncludes(plan, "TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF", "plan has Stage 28A handoff");
assertIncludes(backlog, "Stage 28A Demo Seed Pack", "manual backlog documents Stage 28A");
assertIncludes(backlog, "npm run seed:demo", "manual backlog includes seed command");
assertIncludes(backlog, "demo.superadmin@example.test", "manual backlog includes Super Admin demo login");
assertIncludes(backlog, "demo.student.active@example.test", "manual backlog includes student demo login");
assertIncludes(promptSummary, "Stage 28A - Demo Seed Pack", "prompt summary documents Stage 28A");
assertIncludes(promptSummary, "TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF", "prompt summary has Stage 28A handoff");

if (process.exitCode) {
  console.error("Stage 28A demo seed pack QA failed.");
  process.exit(process.exitCode);
}

console.log("Stage 28A demo seed pack QA passed.");
