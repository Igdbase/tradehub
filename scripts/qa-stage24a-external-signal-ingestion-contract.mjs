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
const route = read("src/app/api/admin/signals/external-ingestion/overview/route.ts");
const panel = read("src/components/admin/external-signal-ingestion-panel.tsx");
const adminClient = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const rules = read("firestore.rules");
const envExample = read(".env.example");

assert(
  packageJson.scripts?.["stage24a:qa"] === "node scripts/qa-stage24a-external-signal-ingestion-contract.mjs",
  "package.json must expose stage24a:qa"
);

[
  "manual_admin_seed",
  "telegram_channel",
  "webhook_source",
  "master_trader_feed",
  "ExternalSignalSourceAllowlistRecord",
  "ExternalSignalCandidateRecord",
  "ExternalSignalIngestionOverviewResponse",
  "received",
  "parsed",
  "rejected",
  "quarantined",
  "duplicate",
  "needs_review",
  "approved_for_workspace_preview",
  "maskedSourceRef",
  "sourceSafeRef",
  "parseWarnings"
].forEach((needle) => assertIncludes(types, needle, "external signal ingestion types"));

[
  "import \"server-only\"",
  "EXTERNAL_SIGNAL_INGESTION_ENABLED",
  "EXTERNAL_SIGNAL_INGESTION_DRY_RUN",
  "EXTERNAL_SIGNAL_INGESTION_PROVIDER",
  "EXTERNAL_SIGNAL_SOURCE_ALLOWLIST_ENABLED",
  "externalFetchAvailable: false",
  "webhookIngestionAvailable: false",
  "createExternalSignalFingerprint",
  "createExternalSignalSafeRef",
  "parseManualMockExternalSignalCandidate",
  "isSupportedCryptoSpotSymbol",
  "isSupportedForexPair",
  "isSupportedForexDemoProofSymbol",
  "cannot trigger AutoCopy or live execution"
].forEach((needle) => assertIncludes(contract, needle, "external signal ingestion contract"));

[
  "import \"server-only\"",
  "external_signal_sources",
  "external_signal_candidates",
  "createManualMockExternalSignalCandidate",
  "getAdminExternalSignalIngestionOverview",
  "createExternalSignalFingerprint",
  "sourceId: sanitizeText(data.sourceId, 64) || createExternalSignalSafeRef(snapshot.id, \"source\")",
  ".where(\"fingerprint\", \"==\", fingerprint)",
  "external_signal_duplicate",
  "maskedSourceRef",
  "sourceSafeRef",
  "safeReason",
  "createTelegramSignalOpaqueIdentity"
].forEach((needle) => assertIncludes(repository, needle, "external signal ingestion repository"));

[
  "rawMessage",
  "telegramUsername",
  "phoneNumber",
  "botToken",
  "webhookSecret",
  "providerPayload",
  "publishWorkspaceSignal",
  "routeWorkspaceSignalForAutoCopy"
].forEach((needle) => assertNotIncludes(repository, needle, "external signal ingestion repository"));

assertIncludes(route, "requireSuperAdmin", "external signal ingestion admin route");
assertIncludes(route, "getAdminExternalSignalIngestionOverview", "external signal ingestion admin route");

[
  "ExternalSignalIngestionPanel",
  "Stage 24A external signal ingestion",
  "Telegram source setup",
  "No AutoCopy execution",
  "maskedSourceRef",
  "No external signal candidates are visible yet",
  "converted server-side into a keyed opaque identity"
].forEach((needle) => assertIncludes(panel, needle, "external signal ingestion panel"));

assertIncludes(adminClient, "ExternalSignalIngestionPanel", "admin page client");
assertIncludes(adminClient, "/api/admin/signals/external-ingestion/overview", "admin page client");
assertIncludes(adminClient, "externalSignalIngestion", "admin page client");

[
  "EXTERNAL_SIGNAL_INGESTION_ENABLED=false",
  "EXTERNAL_SIGNAL_INGESTION_DRY_RUN=true",
  "EXTERNAL_SIGNAL_INGESTION_PROVIDER=disabled",
  "EXTERNAL_SIGNAL_SOURCE_ALLOWLIST_ENABLED=false",
  "EXTERNAL_SIGNAL_TELEGRAM_ENABLED=false",
  "EXTERNAL_SIGNAL_WEBHOOKS_ENABLED=false"
].forEach((needle) => assertIncludes(envExample, needle, ".env.example"));

[
  "match /external_signal_sources/{documentId}",
  "match /external_signal_candidates/{documentId}",
  "match /external_signal_ingestion_audit_events/{documentId}",
  "match /external_signal_provider_status/{documentId}",
  "match /workspaces/{workspaceId}/external_signal_sources/{documentId}",
  "match /workspaces/{workspaceId}/external_signal_candidates/{documentId}"
].forEach((needle) => assertIncludes(rules, needle, "firestore.rules"));

const denyBlockCount = (rules.match(/external_signal_[\s\S]{0,140}allow read, write: if false;/g) ?? []).length;
assert(denyBlockCount >= 4, "external signal ingestion Firestore paths must be deny-by-default");

const newSourceBundle = [
  types,
  contract,
  repository,
  route,
  panel,
  adminClient,
  envExample
].join("\n");

[
  "node-telegram-bot-api",
  "telegraf",
  "grammy",
  "twilio",
  "whatsapp",
  "resend",
  "sendgrid",
  "mailgun"
].forEach((needle) => {
  assertNotIncludes(JSON.stringify(packageJson.dependencies ?? {}), needle, "dependencies");
  assertNotIncludes(JSON.stringify(packageJson.devDependencies ?? {}), needle, "devDependencies");
});

[
  "TelegramBot",
  "new Telegraf",
  "fetch(",
  "axios.",
  "binance.",
  "bybit.",
  "metaapi",
  "createWorkspaceSignal"
].forEach((needle) => assertNotIncludes(newSourceBundle, needle, "Stage 24A new source bundle"));

const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

[
  "Stage 24A",
  "TH-2026-08-22-STAGE24A-EXTERNAL-SIGNAL-INGESTION-CONTRACT-HANDOFF"
].forEach((needle) => {
  assertIncludes(plan, needle, "plan.md");
  assertIncludes(backlog, needle, "manual-test-backlog.md");
  assertIncludes(promptSummary, needle, "prompt/promptsumary.md");
});

console.log("Stage 24A external signal ingestion contract QA passed.");
