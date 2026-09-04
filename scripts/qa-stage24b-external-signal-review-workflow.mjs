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
const types = read("src/types/external-signal-ingestion.ts");
const contract = read("src/lib/signals/external-signal-ingestion-contract.ts");
const repository = read("src/lib/signals/external-signal-ingestion-repository.ts");
const candidatesRoute = read("src/app/api/admin/signals/external-ingestion/candidates/route.ts");
const reviewRoute = read("src/app/api/admin/signals/external-ingestion/candidates/[candidateId]/review/route.ts");
const sourcesRoute = read("src/app/api/admin/signals/external-ingestion/sources/route.ts");
const overviewRoute = read("src/app/api/admin/signals/external-ingestion/overview/route.ts");
const panel = read("src/components/admin/external-signal-ingestion-panel.tsx");
const adminClient = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const rules = read("firestore.rules");

assert(
  packageJson.scripts?.["stage24b:qa"] === "node scripts/qa-stage24b-external-signal-review-workflow.mjs",
  "package.json must expose stage24b:qa"
);

[
  "ExternalSignalReviewStatus",
  "ExternalSignalReviewAction",
  "ExternalSignalRiskFlag",
  "ExternalSignalCandidateReviewPayload",
  "ExternalSignalCandidateReviewResponse",
  "ExternalSignalSourceAllowlistUpsertInput",
  "ExternalSignalSourceAllowlistMutationResponse",
  "reviewedBy",
  "reviewedAt",
  "reviewStatus",
  "reviewReason",
  "parserVersion",
  "riskFlags",
  "adminNote",
  "approved_for_workspace_preview"
].forEach((needle) => assertIncludes(types, needle, "external ingestion review types"));

[
  "EXTERNAL_SIGNAL_PARSER_VERSION",
  "EXTERNAL_SIGNAL_MAX_TAKE_PROFITS",
  "unsupported_symbol",
  "unsupported_asset_class",
  "missing_or_invalid_entry",
  "missing_stop_loss",
  "missing_take_profit",
  "too_many_take_profits",
  "suspicious_text_pattern",
  "hasSuspiciousTextPattern",
  "safeTextHint"
].forEach((needle) => assertIncludes(contract, needle, "external ingestion parser contract"));

[
  "createManualMockExternalSignalCandidateResponse",
  "reviewExternalSignalCandidate",
  "upsertExternalSignalSourceAllowlistRecord",
  "sourceScopeRiskFlags",
  "workspace_scope_mismatch",
  "duplicate_fingerprint",
  "safeAdminRef",
  "approved_for_workspace_preview",
  "external_signal_preview_only",
  "sourceId: sanitizeText(data.sourceId",
  "maskedSourceRef: safeSourceId",
  "serverUpdatedAt: FieldValue.serverTimestamp()"
].forEach((needle) => assertIncludes(repository, needle, "external ingestion repository"));

[
  candidatesRoute,
  reviewRoute,
  sourcesRoute,
  overviewRoute
].forEach((route, index) => {
  assertIncludes(route, "requireSuperAdmin", `external ingestion admin route ${index + 1}`);
  assertNotIncludes(route, "requireInfluencer", `external ingestion admin route ${index + 1}`);
  assertNotIncludes(route, "requireStudent", `external ingestion admin route ${index + 1}`);
});

assertIncludes(candidatesRoute, "createManualMockExternalSignalCandidateResponse", "candidate create route");
assertIncludes(reviewRoute, "reviewExternalSignalCandidate", "candidate review route");
assertIncludes(sourcesRoute, "upsertExternalSignalSourceAllowlistRecord", "source allowlist route");

[
  "Mock candidate parser",
  "Source allowlist controls",
  "Safe candidate moderation queue",
  "Preview only",
  "Needs review",
  "Quarantine",
  "Reject",
  "Candidate filter",
  "No AutoCopy execution",
  "do not publish workspace signals",
  "Do not paste raw Telegram messages",
  "/api/admin/signals/external-ingestion/candidates",
  "/api/admin/signals/external-ingestion/sources",
  "/review"
].forEach((needle) => assertIncludes(panel, needle, "external ingestion admin panel"));

assertIncludes(adminClient, "onRefresh={loadExternalSignalIngestionOverview}", "admin page refresh wiring");

[
  "match /external_signal_sources/{documentId}",
  "match /external_signal_candidates/{documentId}",
  "allow read, write: if false"
].forEach((needle) => assertIncludes(rules, needle, "firestore rules"));

const sourceBundle = [
  types,
  contract,
  repository,
  candidatesRoute,
  reviewRoute,
  sourcesRoute,
  overviewRoute,
  panel,
  adminClient
].join("\n");

[
  "node-telegram-bot-api",
  "new Telegraf",
  "TelegramBot",
  "twilio",
  "sendgrid",
  "mailgun",
  "openai",
  "createWorkspaceSignal(",
  "patchWorkspaceSignal(",
  "routeWorkspaceSignalForAutoCopy",
  "runCryptoExecution",
  "placeOrder",
  "rawMessage",
  "chatId",
  "username",
  "phoneNumber",
  "botToken",
  "webhookSecret",
  "providerPayload",
  "vaultRef"
].forEach((needle) => assertNotIncludes(sourceBundle, needle, "Stage 24B external ingestion source bundle"));

const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

[
  "Stage 24B",
  "TH-2026-08-22-STAGE24B-EXTERNAL-SIGNAL-REVIEW-WORKFLOW-HANDOFF"
].forEach((needle) => {
  assertIncludes(plan, needle, "plan.md");
  assertIncludes(backlog, needle, "manual-test-backlog.md");
  assertIncludes(promptSummary, needle, "prompt/promptsumary.md");
});

console.log("Stage 24B external signal parser/moderation/review workflow QA passed.");
