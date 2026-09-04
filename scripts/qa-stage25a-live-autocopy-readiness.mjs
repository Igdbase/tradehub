import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} is missing ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

const packageJson = JSON.parse(read("package.json"));
const envExample = read(".env.example");
const types = read("src/types/crypto-execution.ts");
const readinessHelper = read("src/lib/crypto-execution/broad-live-autocopy-readiness.ts");
const repository = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const readinessComponent = read("src/components/crypto-execution/broad-live-autocopy-readiness.tsx");
const adminPanel = read("src/components/admin/crypto-execution-ops-panel.tsx");
const workspacePanel = read("src/components/workspace/crypto-execution-ops-section.tsx");
const studentCopier = read("src/components/student-app/student-copier-client.tsx");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage25a:qa"] === "node scripts/qa-stage25a-live-autocopy-readiness.mjs",
  "package.json must expose stage25a:qa"
);

[
  "BroadLiveAutoCopyLaunchGateState",
  "\"blocked\"",
  "\"dry_run_only\"",
  "\"canary_only\"",
  "\"cohort_ready\"",
  "\"broad_live_blocked\"",
  "\"broad_live_ready\"",
  "BroadLiveAutoCopyReadinessOverview",
  "StudentBroadLiveAutoCopyStatus",
  "broadLiveReadiness?: BroadLiveAutoCopyReadinessOverview",
  "broadLiveStatus?: StudentBroadLiveAutoCopyStatus"
].forEach((needle) => assertIncludes(types, needle, "crypto execution broad live readiness types"));

[
  "import \"server-only\"",
  "BROAD_LIVE_AUTOCOPY_ENABLED",
  "BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED",
  "BROAD_LIVE_AUTOCOPY_DRY_RUN",
  "BROAD_LIVE_AUTOCOPY_COHORT_ENABLED",
  "buildBroadLiveAutoCopyReadinessOverview",
  "buildStudentBroadLiveAutoCopyStatus",
  "Before enabling live cohort",
  "Before broad rollout",
  "Emergency disable",
  "Reconciliation review",
  "Rollback",
  "External signal ingestion remains preview-only and is not connected to AutoCopy execution"
].forEach((needle) => assertIncludes(readinessHelper, needle, "broad live readiness helper"));

[
  "getExchangeOrderPlacementAdapter",
  "getForexLiveCanaryOrderPlacementAdapter",
  "loadExchangeCredential",
  "loadForexMetaApiToken",
  "routeWorkspaceSignalForAutoCopy",
  "createWorkspaceSignal",
  "fetch(",
  "axios",
  "providerPayload",
  "vaultRef",
  "apiSecret",
  "brokerPassword",
  "accountId"
].forEach((needle) => assertNotIncludes(readinessHelper, needle, "broad live readiness helper"));

[
  "BROAD_LIVE_AUTOCOPY_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_DRY_RUN=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_ENABLED=false"
].forEach((needle) => assertIncludes(envExample, needle, ".env.example broad live defaults"));

[
  "BROAD_LIVE_AUTOCOPY_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_DRY_RUN=false"
].forEach((needle) => assertNotIncludes(envExample, needle, ".env.example must keep broad live disabled"));

[
  "buildBroadLiveAutoCopyReadinessOverview",
  "buildStudentBroadLiveAutoCopyStatus",
  "broadLiveStatus",
  "broadLiveReadiness",
  "scope: \"workspace\"",
  "scope: \"platform\""
].forEach((needle) => assertIncludes(repository, needle, "crypto execution repository broad live wiring"));

[
  "BroadLiveAutoCopyReadinessCard",
  "StudentBroadLiveAutoCopyStatusCard",
  "Stage 25A launch gates",
  "Launch status"
].forEach((needle) => assertIncludes(readinessComponent, needle, "broad live readiness UI component"));

assertIncludes(
  adminPanel + workspacePanel,
  "does not enable broad live order execution",
  "broad live consuming panels"
);

[
  "BroadLiveAutoCopyReadinessCard",
  "previewOverview.summary.broadLiveReadiness",
  "Load a workspace for bounded student and workspace readiness checks"
].forEach((needle) => assertIncludes(adminPanel, needle, "admin crypto execution panel broad live card"));

[
  "BroadLiveAutoCopyReadinessCard",
  "overview.summary.broadLiveReadiness",
  "audit-only"
].forEach((needle) => assertIncludes(workspacePanel, needle, "workspace execution panel broad live card"));

[
  "StudentBroadLiveAutoCopyStatusCard",
  "response.broadLiveStatus"
].forEach((needle) => assertIncludes(studentCopier, needle, "student copier broad live status"));

const readinessUiBundle = [readinessComponent, adminPanel, workspacePanel].join("\n");
[
  "apiSecret",
  "apiKey",
  "brokerPassword",
  "MetaAPI token",
  "vaultRef",
  "providerPayload",
  "accountId",
  "webhook payload",
  "full order"
].forEach((needle) => assertNotIncludes(readinessUiBundle, needle, "broad live readiness UI bundle"));

[
  "Stage 25A",
  "TH-2026-08-22-STAGE25A-BROAD-LIVE-AUTOCOPY-READINESS-HANDOFF",
  "broad live AutoCopy readiness"
].forEach((needle) => {
  assertIncludes(plan, needle, "plan.md");
  assertIncludes(backlog, needle, "manual-test-backlog.md");
  assertIncludes(promptSummary, needle, "prompt/promptsumary.md");
});

[
  "Practice/backtesting MVP",
  "Course/lesson MVP",
  "Ops/CRM/payments/support MVP",
  "Manual Journal MVP",
  "Messaging/reminders MVP",
  "External master-trader / Telegram-style ingestion"
].forEach((needle) => assertIncludes(promptSummary, needle, "prompt/promptsumary.md frozen foundations"));

console.log("Stage 25A broad live AutoCopy readiness audit and launch gates QA passed.");
