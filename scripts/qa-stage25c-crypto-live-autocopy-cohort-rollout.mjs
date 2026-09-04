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

function sliceBetween(content, start, end, label) {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `${label} is missing start marker ${start}`);
  assert(endIndex > startIndex, `${label} is missing end marker ${end}`);

  return content.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const liveProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const route = read("src/app/api/admin/crypto-execution/live-production/cohort/run/route.ts");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminPanel = read("src/components/admin/crypto-execution-ops-panel.tsx");
const envExample = read(".env.example");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

const cohortWorker = sliceBetween(
  liveProduction,
  "export async function runCryptoLiveCohortRolloutWorker",
  "export async function runLiveProductionCanaryWorker",
  "crypto live cohort rollout worker"
);

assert(
  packageJson.scripts?.["stage25c:qa"] === "node scripts/qa-stage25c-crypto-live-autocopy-cohort-rollout.mjs",
  "package.json must expose stage25c:qa"
);

[
  "CryptoLiveCohortRolloutMode",
  "\"dry_run\"",
  "\"submit\"",
  "CryptoLiveCohortRolloutCandidateSummary",
  "candidateRef: string",
  "CryptoLiveCohortRolloutWorkerRunResponse",
  "cohortStatus: BroadLiveAutoCopyCohortStatus",
  "rollbackNote: string",
  "warnings: string[]"
].forEach((needle) => assertIncludes(types, needle, "Stage 25C crypto execution types"));

const candidateSummaryType = sliceBetween(
  types,
  "export interface CryptoLiveCohortRolloutCandidateSummary",
  "export interface CryptoLiveCohortRolloutWorkerRunResponse",
  "crypto cohort candidate summary type"
);

[
  "studentId",
  "workspaceStudentId",
  "connectionId",
  "providerOrderId",
  "externalOrderId",
  "vaultRef",
  "providerPayload"
].forEach((needle) => assertNotIncludes(candidateSummaryType, needle, "browser-visible cohort candidate summary"));

[
  "CRYPTO_LIVE_COHORT_CONFIRMATION",
  "RUN_CRYPTO_LIVE_COHORT",
  "CRYPTO_LIVE_COHORT_CANDIDATE_LIMIT = 2",
  "function liveCohortEnv()",
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN",
  "function safeCandidateRef",
  "function cohortRuntimeGatesOpen",
  "function cohortCandidateSummary",
  "runCryptoLiveCohortRolloutWorker",
  "mode === \"submit\"",
  "cohort_confirmation_required",
  "crypto_live_cohort_gate_closed",
  "buildProductionPreflight",
  "isCryptoAutoCopyBillingActive",
  "appendProductionAuditEvent",
  "External signal preview candidates remain non-executable and cannot seed this cohort path.",
  "Forex and broad live rollout remain separate",
  "no exchange endpoint was called",
  "submittedCount"
].forEach((needle) => assertIncludes(liveProduction, needle, "crypto live cohort rollout implementation"));

[
  "getExchangeOrderPlacementAdapter",
  "getExchangeOrderCancelAdapter",
  "getExchangeOrderStatusAdapter",
  "getExchangeBalancePrecheckAdapter",
  "loadExchangeCredential",
  "writeAttemptForIntent",
  "exchangeAdapter",
  "routeWorkspaceSignalForAutoCopy",
  "createWorkspaceSignal",
  "providerPayload",
  "vaultRef",
  "apiSecret",
  "apiKey",
  "brokerPassword",
  "MetaAPI",
  "telegram",
  "webhook",
  "fetch("
].forEach((needle) => assertNotIncludes(cohortWorker, needle, "Stage 25C cohort worker must stay dry-run/non-provider"));

[
  "requireSuperAdmin",
  "runCryptoLiveCohortRolloutWorker",
  "apiJson(response)",
  "apiError(error)"
].forEach((needle) => assertIncludes(route, needle, "Super Admin crypto cohort route"));

[
  "CryptoLiveCohortRolloutWorkerRunResponse",
  "cryptoLiveCohortResult",
  "isRunningCryptoLiveCohort",
  "runCryptoLiveCohortDryRun",
  "/api/admin/crypto-execution/live-production/cohort/run",
  "mode: \"dry_run\""
].forEach((needle) => assertIncludes(adminPage, needle, "Super Admin admin page cohort wiring"));

[
  "Run crypto cohort dry-run",
  "Controlled crypto live cohort",
  "Stage 25C checks a tiny crypto-only cohort candidate window in dry-run by default",
  "does not broaden live execution",
  "does not include Forex",
  "cannot use external preview signals",
  "Last crypto cohort dry-run",
  "candidate.candidateRef",
  "cryptoLiveCohortResult.rollbackNote"
].forEach((needle) => assertIncludes(adminPanel, needle, "Super Admin cohort UI"));

[
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=true"
].forEach((needle) => assertIncludes(envExample, needle, ".env.example Stage 25C fail-closed defaults"));

[
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=false"
].forEach((needle) => assertNotIncludes(envExample, needle, ".env.example must not enable cohort live defaults"));

const stage25cDocs = [
  "Stage 25C",
  "TH-2026-08-22-STAGE25C-CRYPTO-LIVE-AUTOCOPY-COHORT-ROLLOUT-HANDOFF",
  "Controlled Crypto Live AutoCopy Cohort Rollout"
];

stage25cDocs.forEach((needle) => {
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
].forEach((needle) => assertIncludes(promptSummary, needle, "frozen foundation prompt summary"));

console.log("Stage 25C controlled crypto live AutoCopy cohort rollout QA passed.");
