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
const envExample = read(".env.example");
const rules = read("firestore.rules");
const types = read("src/types/crypto-execution.ts");
const readinessHelper = read("src/lib/crypto-execution/broad-live-autocopy-readiness.ts");
const liveProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const repository = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const readinessComponent = read("src/components/crypto-execution/broad-live-autocopy-readiness.tsx");
const adminPanel = read("src/components/admin/crypto-execution-ops-panel.tsx");
const workspacePanel = read("src/components/workspace/crypto-execution-ops-section.tsx");
const studentCopier = read("src/components/student-app/student-copier-client.tsx");
const externalPreview = read("src/components/workspace/external-signal-preview-section.tsx");
const externalIngestionTypes = read("src/types/external-signal-ingestion.ts");
const qa25a = read("scripts/qa-stage25a-live-autocopy-readiness.mjs");
const qa25b = read("scripts/qa-stage25b-live-autocopy-cohort-gate.mjs");
const qa25c = read("scripts/qa-stage25c-crypto-live-autocopy-cohort-rollout.mjs");
const qa25d = read("scripts/qa-stage25d-live-autocopy-reconciliation-incident.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage25e:qa"] === "node scripts/qa-stage25e-live-autocopy-final-acceptance.mjs",
  "package.json must expose stage25e:qa"
);

[
  "stage25a:qa",
  "stage25b:qa",
  "stage25c:qa",
  "stage25d:qa",
  "stage24c:qa",
  "stage23d:qa",
  "stage22b:qa",
  "stage21d:qa",
  "stage20d:qa",
  "stage19i:qa",
  "stage18x:qa",
  "stage15y:qa"
].forEach((scriptName) => assert(packageJson.scripts?.[scriptName], `package.json must keep ${scriptName}`));

[
  "BroadLiveAutoCopyLaunchGateState",
  "BroadLiveAutoCopyCohortGatePreview",
  "BroadLiveAutoCopyIncidentReadiness",
  "CryptoLiveCohortRolloutWorkerRunResponse",
  "StudentBroadLiveAutoCopyStatus",
  "\"broad_live_blocked\"",
  "\"dry_run_only\"",
  "\"canary_only\"",
  "\"approved_for_cohort\"",
  "\"cohort_removed\"",
  "\"needs_review\""
].forEach((needle) => assertIncludes(types, needle, "Stage 25 acceptance types"));

[
  "BROAD_LIVE_AUTOCOPY_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_DRY_RUN=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=true"
].forEach((needle) => assertIncludes(envExample, needle, ".env.example fail-closed live AutoCopy defaults"));

[
  "BROAD_LIVE_AUTOCOPY_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_DRY_RUN=false",
  "BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=true",
  "BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=false"
].forEach((needle) => assertNotIncludes(envExample, needle, ".env.example must not enable live AutoCopy defaults"));

[
  "buildBroadLiveAutoCopyReadinessOverview",
  "buildStudentBroadLiveAutoCopyStatus",
  "buildCohortGatePreview",
  "buildIncidentReadiness",
  "Before enabling live cohort",
  "Before broad rollout",
  "Emergency disable",
  "Reconciliation review",
  "Rollback",
  "External signal ingestion remains preview-only and is not connected to AutoCopy execution",
  "External signal preview records remain non-executable and cannot seed cohort AutoCopy routing.",
  "Stage 25D adds incident/reconciliation hardening only; it does not execute orders or enable broad live AutoCopy."
].forEach((needle) => assertIncludes(readinessHelper, needle, "Stage 25 readiness helper"));

const readinessSensitiveSlice = sliceBetween(
  readinessHelper,
  "export function buildBroadLiveAutoCopyReadinessOverview",
  "export function buildStudentBroadLiveAutoCopyStatus",
  "Stage 25 readiness overview helper"
);

[
  "getExchangeOrderPlacementAdapter",
  "getExchangeOrderCancelAdapter",
  "getExchangeOrderStatusAdapter",
  "getExchangeBalancePrecheckAdapter",
  "loadExchangeCredential",
  "getForexLiveCanaryOrderPlacementAdapter",
  "loadForexMetaApiToken",
  "routeWorkspaceSignalForAutoCopy",
  "createWorkspaceSignal",
  "fetch(",
  "axios",
  "providerPayload",
  "vaultRef",
  "apiSecret",
  "apiKey",
  "brokerPassword",
  "MetaAPI token",
  "telegram",
  "webhook"
].forEach((needle) => assertNotIncludes(readinessSensitiveSlice, needle, "Stage 25 readiness helper must remain non-executing"));

const cohortWorker = sliceBetween(
  liveProduction,
  "export async function runCryptoLiveCohortRolloutWorker",
  "export async function runLiveProductionCanaryWorker",
  "Stage 25 crypto cohort worker"
);

[
  "CRYPTO_LIVE_COHORT_CANDIDATE_LIMIT = 2",
  "CRYPTO_LIVE_COHORT_CONFIRMATION",
  "liveCohortEnv",
  "safeCandidateRef",
  "runCryptoLiveCohortRolloutWorker",
  "runLiveProductionCanaryWorker",
  "runLiveProductionReconciliation",
  "runLiveProductionCanaryReconciliation"
].forEach((needle) => assertIncludes(liveProduction, needle, "Stage 25 live production support module"));

[
  "cohort_confirmation_required",
  "crypto_live_cohort_gate_closed",
  "mode === \"submit\"",
  "submittedCount",
  "rollbackNote",
  "External signal preview candidates remain non-executable and cannot seed this cohort path.",
  "Forex and broad live rollout remain separate",
  "no exchange endpoint was called"
].forEach((needle) => assertIncludes(cohortWorker, needle, "Stage 25 crypto cohort worker"));

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
].forEach((needle) => assertNotIncludes(cohortWorker, needle, "Stage 25 crypto cohort worker must stay bounded/support-safe"));

[
  "BroadLiveAutoCopyReadinessCard",
  "Live AutoCopy support, incident, and rollback posture",
  "Controlled live cohort gate",
  "Rollback checklist",
  "Incident checklist",
  "readiness.incidentReadiness.cryptoProduction",
  "readiness.incidentReadiness.cryptoCohortDryRun",
  "readiness.incidentReadiness.forexLiveCanary"
].forEach((needle) => assertIncludes(readinessComponent, needle, "Stage 25 readiness UI"));

[
  "Run crypto cohort dry-run",
  "Stage 25C checks a tiny crypto-only cohort candidate window in dry-run by default",
  "does not broaden live execution",
  "does not include Forex",
  "cannot use external preview signals",
  "Last crypto cohort dry-run",
  "cryptoLiveCohortResult.rollbackNote",
  "BroadLiveAutoCopyReadinessCard"
].forEach((needle) => assertIncludes(adminPanel, needle, "Super Admin crypto execution panel"));

[
  "audit-only",
  "does not enable broad live order execution",
  "BroadLiveAutoCopyReadinessCard",
  "overview.summary.broadLiveReadiness"
].forEach((needle) => assertIncludes(workspacePanel, needle, "workspace live AutoCopy status-only panel"));

[
  "student-copier-workspace",
  "Trade Copier",
  "Purchase Trade Copier",
  "copier-crypto-setup-panel",
  "copier-forex-setup-panel"
].forEach((needle) => assertIncludes(studentCopier, needle, "student live AutoCopy status-only copy"));
[
  "BroadLiveAutoCopyStatusCard",
  "broadLiveStatus",
  "live order execution",
  "provider payload"
].forEach((needle) => assertNotIncludes(studentCopier, needle, "student live AutoCopy status-only copy"));

[
  "Not a TradeHub signal",
  "Not student-visible",
  "Not AutoCopy executable",
  "Only approved Telegram previews can be published as moderated TradeHub signals",
  "Publishing never bypasses",
  "approved_for_workspace_preview"
].forEach((needle) => assertIncludes(externalPreview, needle, "external signal preview must remain non-executable"));

[
  "ExternalSignalCandidateStatus",
  "\"approved_for_workspace_preview\"",
  "maskedSourceRef",
  "WorkspaceExternalSignalPreviewResponse"
].forEach((needle) => assertIncludes(externalIngestionTypes, needle, "external signal ingestion frozen preview types"));

[
  "buildBroadLiveAutoCopyReadinessOverview",
  "buildStudentBroadLiveAutoCopyStatus",
  "broadLiveReadiness",
  "broadLiveStatus",
  "scope: \"workspace\"",
  "scope: \"platform\""
].forEach((needle) => assertIncludes(repository, needle, "crypto execution repository Stage 25 wiring"));

[
  "platform_broad_live_autocopy_cohort_controls",
  "broad_live_autocopy_cohort_controls",
  "broad_live_autocopy_cohort_audit_events",
  "platform_live_incident_notes",
  "platform_live_rollback_notes",
  "live_incidents",
  "live_support_review_notes",
  "live_rollback_notes",
  "external_signal_sources",
  "external_signal_candidates",
  "allow read, write: if false"
].forEach((needle) => assertIncludes(rules, needle, "Firestore deny-by-default Stage 25/external signal rules"));

[
  [qa25a, "Stage 25A broad live AutoCopy readiness audit and launch gates QA passed."],
  [qa25b, "Stage 25B controlled live AutoCopy cohort gate QA passed."],
  [qa25c, "Stage 25C controlled crypto live AutoCopy cohort rollout QA passed."],
  [qa25d, "Stage 25D live AutoCopy reconciliation, incident, and rollback hardening QA passed."]
].forEach(([content, needle]) => assertIncludes(content, needle, "prior Stage 25 QA script"));

[
  "TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF",
  "Stage 25E",
  "Controlled Live AutoCopy MVP Final Acceptance Freeze",
  "source-QA frozen"
].forEach((needle) => {
  assertIncludes(plan, needle, "plan.md Stage 25E freeze docs");
  assertIncludes(backlog, needle, "manual-test-backlog.md Stage 25E freeze docs");
  assertIncludes(promptSummary, needle, "prompt/promptsumary.md Stage 25E freeze docs");
});

[
  "Practice 18X",
  "Courses 19I",
  "Ops 20D",
  "Manual Journal 21D",
  "Forex/CFD History 22B",
  "Messaging 23D",
  "External Signal Ingestion 24C"
].forEach((needle) => {
  assertIncludes(plan, needle, "plan.md frozen foundation references");
  assertIncludes(promptSummary, needle, "prompt/promptsumary.md frozen foundation references");
});

const browserVisibleBundle = [
  readinessComponent,
  adminPanel,
  workspacePanel,
  externalPreview
].join("\n");

[
  "apiSecret",
  "brokerPassword",
  "MetaAPI token",
  "vaultRef",
  "providerPayload",
  "exchange response payload",
  "raw student",
  "raw order",
  "webhook payload"
].forEach((needle) => assertNotIncludes(browserVisibleBundle, needle, "browser-visible Stage 25 surfaces must stay support-safe"));

console.log("Stage 25E controlled live AutoCopy MVP final acceptance freeze QA passed.");
