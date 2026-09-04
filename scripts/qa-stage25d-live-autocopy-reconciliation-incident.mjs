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
const readinessHelper = read("src/lib/crypto-execution/broad-live-autocopy-readiness.ts");
const readinessComponent = read("src/components/crypto-execution/broad-live-autocopy-readiness.tsx");
const adminPanel = read("src/components/admin/crypto-execution-ops-panel.tsx");
const liveProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage25d:qa"] === "node scripts/qa-stage25d-live-autocopy-reconciliation-incident.mjs",
  "package.json must expose stage25d:qa"
);

[
  "BroadLiveAutoCopyIncidentPostureStatus",
  "\"ready\"",
  "\"watch\"",
  "\"needs_review\"",
  "\"blocked\"",
  "BroadLiveAutoCopyIncidentStreamSummary",
  "BroadLiveAutoCopySupportNotePolicy",
  "BroadLiveAutoCopyIncidentReadiness",
  "incidentReadiness?: BroadLiveAutoCopyIncidentReadiness",
  "record_incident_note",
  "record_rollback_note",
  "mark_support_review_needed",
  "super_admin_only"
].forEach((needle) => assertIncludes(types, needle, "Stage 25D incident readiness types"));

[
  "buildIncidentReadiness",
  "combineIncidentStatus",
  "streamStatus",
  "INCIDENT_NOTE_MAX_LENGTH",
  "cryptoProduction",
  "cryptoCohortDryRun",
  "forexLiveCanary",
  "rollbackChecklist",
  "incidentChecklist",
  "auditSummary",
  "supportNotePolicy",
  "live_production.cohort.dry_run",
  "live_production.cohort.blocked",
  "Stage 25D adds incident/reconciliation hardening only; it does not execute orders or enable broad live AutoCopy."
].forEach((needle) => assertIncludes(readinessHelper, needle, "Stage 25D readiness helper"));

const incidentHelperSlice = sliceBetween(
  readinessHelper,
  "function buildIncidentReadiness",
  "function deriveCohortStatus",
  "Stage 25D incident helper"
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
].forEach((needle) => assertNotIncludes(incidentHelperSlice, needle, "Stage 25D incident helper must not add provider/execution behavior"));

[
  "Live AutoCopy support, incident, and rollback posture",
  "IncidentStreamCard",
  "Rollback checklist",
  "Incident checklist",
  "supportNotePolicy.safeMessage",
  "readiness.incidentReadiness.cryptoProduction",
  "readiness.incidentReadiness.cryptoCohortDryRun",
  "readiness.incidentReadiness.forexLiveCanary"
].forEach((needle) => assertIncludes(readinessComponent, needle, "Stage 25D incident UI"));

[
  "BroadLiveAutoCopyReadinessCard",
  "previewOverview.summary.broadLiveReadiness"
].forEach((needle) => assertIncludes(adminPanel, needle, "Admin panel must render readiness card with incident posture"));

[
  "platform_live_incident_notes",
  "platform_live_rollback_notes",
  "live_incidents",
  "live_support_review_notes",
  "live_rollback_notes",
  "allow read, write: if false"
].forEach((needle) => assertIncludes(rules, needle, "Firestore incident/rollback deny-by-default rules"));

[
  "runCryptoLiveCohortRolloutWorker",
  "runLiveProductionReconciliation",
  "runLiveProductionCanaryReconciliation",
  "runLiveProductionCanaryWorker"
].forEach((needle) => assertIncludes(liveProduction, needle, "Existing live support workers remain present"));

[
  "Stage 25D",
  "TH-2026-08-22-STAGE25D-LIVE-AUTOCOPY-RECONCILIATION-INCIDENT-HANDOFF",
  "Live AutoCopy Reconciliation, Incident, And Rollback Hardening"
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
].forEach((needle) => assertIncludes(promptSummary, needle, "frozen foundations"));

console.log("Stage 25D live AutoCopy reconciliation, incident, and rollback hardening QA passed.");
