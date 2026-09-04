import fs from "node:fs";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const preferences = read("src/lib/crypto-execution/auto-copy-preferences.ts");
const repository = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const riskEngine = read("src/lib/crypto-execution/crypto-risk-engine.ts");
const paperRouting = read("src/lib/crypto-execution/crypto-signal-routing.ts");
const sandbox = read("src/lib/crypto-execution/crypto-live-sandbox.ts");
const production = read("src/lib/crypto-execution/crypto-live-production.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const signalUi = read("src/components/workspace/signal-management-section.tsx");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");

check(
  "stage15n script registered",
  packageJson.scripts?.["stage15n:qa"] === "node scripts/qa-stage15n-cross-asset-auto-copy.mjs",
  "package.json must expose npm run stage15n:qa."
);
check(
  "shared Auto-Copy model exists",
  types.includes('export type AutoCopyMarket = "crypto" | "forex"') &&
    types.includes("CrossAssetAutoCopyPreferencesRecord") &&
    types.includes("CrossAssetAutoCopyConfirmationRecord") &&
    types.includes("CrossAssetStaleSignalDecisionRecord") &&
    types.includes("AutoCopyRoutingPostureSummary"),
  "Shared cross-asset preferences, confirmation, stale-decision, and posture types must exist."
);
check(
  "execution mode and stale policy enums exist",
  types.includes('"full_auto"') &&
    types.includes('"confirm_before_execute"') &&
    types.includes('"alerts_only"') &&
    types.includes('"expire_after_seconds"') &&
    types.includes('"confirm_if_stale"'),
  "The foundation must model full-auto, confirmation-required, alerts-only, and stale policy states."
);
check(
  "forex foundation remains no-live-execution while later stages may add paper simulation",
  preferences.includes("forexFoundationOnly") &&
    !preferences.includes('executionMode: market === "forex" ? "alerts_only" : executionMode') &&
    preferences.includes("forexFoundationOnly"),
  "Forex shared preferences must remain marked as no-live-execution even after Stage 15O allows paper simulation modes."
);
check(
  "student shared preference API is server-side",
  repository.includes("updateStudentAutoCopyPreferences") &&
    repository.includes("resolveStudentEntitlements") &&
    repository.includes("auto_copy_preferences") &&
    read("src/app/api/student/crypto-execution/auto-copy/preferences/route.ts").includes("requireStudent"),
  "Shared preference writes must go through authenticated Admin SDK API routes and Stage 16 entitlements."
);
check(
  "paper routing requires confirmation instead of direct intent",
  riskEngine.includes('"execution_mode"') &&
    riskEngine.includes('"stale_signal"') &&
    riskEngine.includes('"requires_review"') &&
    paperRouting.includes("auto_copy_confirmations") &&
    paperRouting.includes("stale_signal_decisions"),
  "Confirm-before-execute and stale confirmation must produce review/confirmation records, not direct executable intents."
);
check(
  "live sandbox gate honors shared mode and stale signal",
  sandbox.includes("autoCopyPreferences") &&
    sandbox.includes('"execution_mode"') &&
    sandbox.includes('"stale_signal"') &&
    sandbox.includes("Student requires confirmation before sandbox/testnet live execution"),
  "Live sandbox routing must not create ready_for_live intents when shared confirmation/stale policy blocks it."
);
check(
  "production gate honors shared mode and stale signal",
  production.includes("autoCopyPreferences") &&
    production.includes('"execution_mode"') &&
    production.includes('"stale_signal"') &&
    production.includes("Student requires confirmation before production live execution"),
  "Production dry-run/canary routing must remain blocked by shared confirmation/stale policy."
);
check(
  "student UI is a cross-asset control center",
  studentUi.includes("Auto-Copy control center") &&
    studentUi.includes("Forex Auto-Copy is paper simulation only") &&
    studentUi.includes("Confirm-before-execute") &&
    studentUi.includes("Stale signal policy"),
  "Student copier must expose shared execution mode, risk sizing, stale policy, and no-live forex copy."
);
check(
  "influencer publish review shows routing posture",
  signalUi.includes("Full auto") &&
  signalUi.includes("Needs confirm") &&
  signalUi.includes("Alerts only") &&
  signalUi.includes("Blocked prefs") &&
    signalUi.includes("forex paper simulation"),
  "Influencer publish review must show safe full-auto/confirmation/alerts/blocked posture."
);
check(
  "Firestore rules deny shared Auto-Copy internals",
  rules.includes("auto_copy_preferences") &&
    rules.includes("auto_copy_confirmations") &&
    rules.includes("stale_signal_decisions") &&
    rulesTest.includes("auto_copy_preferences/crypto") &&
    rulesTest.includes("auto_copy_confirmations") &&
    rulesTest.includes("stale_signal_decisions"),
  "Shared Auto-Copy protected paths must remain client-denied and covered by rules tests."
);
check(
  "browser/client code does not import execution adapters",
  !studentUi.includes("getExchangeOrderPlacementAdapter") &&
    !signalUi.includes("getExchangeOrderPlacementAdapter") &&
    !studentUi.includes("MetaApi") &&
    !signalUi.includes("MetaApi"),
  "Client surfaces must not import exchange or future MetaAPI execution adapters."
);
check(
  "no forex or Telegram execution added",
  !repository.includes("metaapi.cloud") &&
    !sandbox.includes("metaapi") &&
    !production.includes("metaapi") &&
    !paperRouting.includes("telegramBotToken"),
  "Stage 15N is foundation only: no MetaAPI execution or Telegram ingestion runtime should be added."
);

const failed = checks.filter((entry) => !entry.ok);

for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
