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
const rules = read("firestore.rules");
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
  packageJson.scripts?.["stage25b:qa"] === "node scripts/qa-stage25b-live-autocopy-cohort-gate.mjs",
  "package.json must expose stage25b:qa"
);

[
  "BroadLiveAutoCopyCohortStatus",
  "\"not_configured\"",
  "\"blocked\"",
  "\"dry_run_only\"",
  "\"canary_required\"",
  "\"eligible_for_review\"",
  "\"approved_for_cohort\"",
  "\"cohort_paused\"",
  "\"cohort_removed\"",
  "BroadLiveAutoCopyCohortGatePreview",
  "BroadLiveAutoCopyCohortAuditEventSummary",
  "cohortGate?: BroadLiveAutoCopyCohortGatePreview",
  "cohortStatus?: BroadLiveAutoCopyCohortStatus",
  "cohortStatusLabel?: string"
].forEach((needle) => assertIncludes(types, needle, "crypto execution cohort types"));

[
  "import \"server-only\"",
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN",
  "deriveCohortStatus",
  "buildCohortGatePreview",
  "cohort_vault_readiness",
  "cohort_preflight_readiness",
  "cohort_eligible_sample",
  "cohort_no_external_preview_execution",
  "liveProduction?.env.productionVaultReady",
  "liveProduction.preflightReady",
  "Stage 25B cohort approval is a review gate only and does not place live orders by itself.",
  "External signal preview records remain non-executable and cannot seed cohort AutoCopy routing."
].forEach((needle) => assertIncludes(readinessHelper, needle, "broad live cohort readiness helper"));

[
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=true"
].forEach((needle) => assertIncludes(envExample, needle, ".env.example cohort defaults"));

[
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=false"
].forEach((needle) => assertNotIncludes(envExample, needle, ".env.example must keep cohort defaults fail-closed"));

[
  "Controlled live cohort gate",
  "Approval does not place live orders by itself",
  "cohortGate",
  "cohortStatus",
  "formatCohortStatus"
].forEach((needle) => assertIncludes(readinessComponent, needle, "cohort readiness UI"));

[
  "buildBroadLiveAutoCopyReadinessOverview",
  "buildStudentBroadLiveAutoCopyStatus",
  "broadLiveReadiness",
  "broadLiveStatus"
].forEach((needle) => assertIncludes(repository, needle, "crypto execution repository cohort wiring"));

[
  "BroadLiveAutoCopyReadinessCard",
  "StudentBroadLiveAutoCopyStatusCard"
].forEach((needle) => {
  assertIncludes(adminPanel + workspacePanel + studentCopier, needle, "cohort consuming UI");
});

[
  "platform_broad_live_autocopy_cohort_controls",
  "broad_live_autocopy_cohort_controls",
  "broad_live_autocopy_cohort_audit_events",
  "allow read, write: if false"
].forEach((needle) => assertIncludes(rules, needle, "Firestore cohort deny-by-default rules"));

[
  "getExchangeOrderPlacementAdapter",
  "getForexLiveCanaryOrderPlacementAdapter",
  "routeWorkspaceSignalForAutoCopy",
  "createWorkspaceSignal",
  "fetch(",
  "axios",
  "providerPayload",
  "vaultRef",
  "apiSecret",
  "brokerPassword",
  "accountId",
  "telegram",
  "webhook"
].forEach((needle) => assertNotIncludes(readinessHelper, needle, "cohort readiness helper must not add provider/execution behavior"));

const readinessUiBundle = [readinessComponent, adminPanel, workspacePanel].join("\n");
[
  "apiSecret",
  "apiKey",
  "brokerPassword",
  "MetaAPI token",
  "vaultRef",
  "providerPayload",
  "accountId",
  "raw student",
  "raw order"
].forEach((needle) => assertNotIncludes(readinessUiBundle, needle, "cohort readiness UI must stay support-safe"));

[
  "Stage 25B",
  "TH-2026-08-22-STAGE25B-LIVE-AUTOCOPY-COHORT-GATE-HANDOFF",
  "Controlled Live AutoCopy Cohort Gate"
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

console.log("Stage 25B controlled live AutoCopy cohort gate QA passed.");
