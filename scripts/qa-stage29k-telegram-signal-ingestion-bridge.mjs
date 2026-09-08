import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};
const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/external-signal-ingestion.ts");
const workspaceTypes = read("src/types/workspace-dashboard.ts");
const telegramIngress = read("src/lib/signals/telegram-signal-ingestion.ts");
const telegramRoute = read("src/app/api/integrations/telegram/signals/webhook/route.ts");
const adminSourceRoute = read("src/app/api/admin/signals/external-ingestion/sources/route.ts");
const adminRoutingWorkerRoute = read("src/app/api/admin/signals/telegram-routing/worker/run/route.ts");
const telegramBridge = read("src/lib/signals/telegram-signal-bridge.ts");
const sourceGuards = read("src/lib/signals/tradehub-signal-source-guards.ts");
const studentSignals = read("src/lib/student-app/student-signals-repository.ts");
const adminPanel = read("src/components/admin/external-signal-ingestion-panel.tsx");
const workspacePreview = read("src/components/workspace/external-signal-preview-section.tsx");
const workspaceAdminBrowser = read("tests/browser/workspace-admin-e2e.spec.mjs");
const cryptoProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const forexCanary = read("src/lib/crypto-execution/forex-live-canary-execution.ts");
const indexes = read("firestore.indexes.json");
const rules = read("firestore.rules");
const envExample = read(".env.example");
const docs = [
  "plan.md",
  "complaint-resolution-roadmap.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md"
].map(read).join("\n");

assert(packageJson.scripts?.["stage29k:qa"] === "node scripts/qa-stage29k-telegram-signal-ingestion-bridge.mjs", "package.json exposes npm run stage29k:qa.");
assert(packageJson.scripts?.["stage29k:ingestion:qa"] === "node scripts/qa-stage29k-ingestion-emulator.mjs", "package.json exposes npm run stage29k:ingestion:qa.");
assert(packageJson.scripts?.["stage29k:closure:qa"] === "node scripts/qa-stage29k-owner-acceptance-closure.mjs", "package.json exposes npm run stage29k:closure:qa.");
assert(packageJson.scripts?.["stage29j:closure:qa"], "Stage 29J closure remains wired.");

includesAll(types, [
  "TelegramSignalWebhookReceiptResponse",
  "WorkspaceExternalSignalPromotionResponse",
  "telegram_channel"
], "Stage 29K extends the existing external-signal and workspace-signal contracts.");
includesAll(workspaceTypes, [
  "WorkspaceSignalExternalProof",
  "externalSignalProof",
  "moderated_published",
  "candidateSafeRef"
], "Stage 29K adds safe workspace signal moderation proof metadata.");

includesAll(telegramIngress, [
  "import \"server-only\"",
  "X-Telegram-Bot-Api-Secret-Token",
  "TELEGRAM_SIGNAL_WEBHOOK_ENABLED",
  "TELEGRAM_SIGNAL_WEBHOOK_SECRET",
  "TELEGRAM_SIGNAL_IDENTITY_SECRET",
  "timingSafeEqual",
  "createHmac(\"sha256\"",
  "content-type",
  "content-length",
  "MAX_WEBHOOK_BYTES",
  "MAX_UPDATE_AGE_MS",
  "expectedSourceIdentity",
  "EXTERNAL_SIGNAL_DELIVERY_MARKER_COLLECTION_ID",
  "EXTERNAL_SIGNAL_FINGERPRINT_MARKER_COLLECTION_ID",
  "EXTERNAL_SIGNAL_INGRESS_RATE_COLLECTION_ID",
  "runTransaction",
  "deliverySafeRef",
  "rawPayloadStored: false",
  "telegram_delivery_duplicate_noop",
  "telegram_signal_parse_ambiguous_or_missing",
  "telegram_update_future_timestamp",
  "telegram_update_invalid_timestamp",
  "MAX_SOURCE_UPDATES_PER_MINUTE",
  "telegram_source_unknown_or_ambiguous",
  "telegram_update_stale",
  "parseManualMockExternalSignalCandidate"
], "Telegram ingress is bounded, header-verified, keyed, allowlisted, idempotent, and quarantined.");

assert(!telegramIngress.includes(".where(\"deliverySafeRef\""), "Telegram webhook deduplication does not use query-then-write delivery lookup.");

includesAll(telegramRoute, [
  "POST(request: Request)",
  "assertTelegramWebhookRequestBoundary",
  "request.text()",
  "telegram_webhook_malformed_json",
  "receiveTelegramSignalWebhookUpdate",
  "GET()",
  "method_not_allowed"
], "Telegram webhook route accepts POST only and delegates to server-only validation before writes.");

includesAll(`${adminSourceRoute}\n${adminPanel}`, [
  "requireSuperAdmin",
  "upsertExternalSignalSourceAllowlistRecord",
  "telegramChatIdentity",
  "converted server-side into a keyed opaque identity"
], "Super Admin Telegram source setup is protected and accepts raw identity only for server-side conversion.");

includesAll(read("src/lib/signals/external-signal-ingestion-repository.ts"), [
  "deterministicSourceDocId",
  "sourceRecordVersion",
  "telegram_source_identity_workspace_conflict",
  "createModerationSnapshotHash",
  "moderationSnapshotHash"
], "Telegram source setup is deterministic, workspace-bound, versioned, and approval snapshots are immutable.");

includesAll(telegramBridge, [
  "promoteTelegramPreviewToWorkspaceSignal",
  "processDueTelegramSignalRoutingOutbox",
  "approved_for_workspace_preview",
  "telegram_channel",
  "moderated_published",
  "EXTERNAL_SIGNAL_BRIDGE_ATTESTATION_COLLECTION_ID",
  "EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID",
  "runTransaction",
  "bridgeAttestationRef",
  "publishedSignalId",
  "publishedSignalRef",
  "destinationProgress",
  "crypto_paper",
  "crypto_sandbox",
  "crypto_production",
  "forex_paper",
  "forex_demo",
  "forex_live_canary",
  "final_failed",
  "completed_with_failures",
  "completedWithFailures",
  "dispatchAttempts",
  "infrastructureOutcome",
  "telegram_routing_infrastructure_attempts_exhausted",
  "telegram_routing_destination_completed_with_failures",
  "leaseExpiresAt",
  "expiredSnapshot",
  "sourceRecordId",
  "sourceRecordVersion",
  "moderationSnapshotHash",
  "telegram_publication_preview_stale",
  "dispatchStatus",
  "routePublishedCryptoSignalForLiveProductionExecution",
  "routePublishedForexSignalForLiveCanaryExecution",
  "Existing Copier gates still apply"
], "Workspace promotion is explicit, idempotent, proof-bearing, and routes only through existing Stage 29J gates.");

assert(!telegramBridge.includes("if (dueSnapshot.size >= boundedLimit) return dueSnapshot.docs"), "Routing outbox repair does not let normal due work starve expired leases.");
assert(!telegramBridge.includes("const attempts = Math.max(0, Number(data.attempts ?? 0));"), "Routing outbox does not use a global destination-interfering attempt counter.");
assert(!telegramBridge.includes("return finalStatus === \"completed\" ? \"completed\" as const : finalStatus === \"retry_scheduled\" ? \"retry_scheduled\" as const : \"skipped\" as const"), "Routing outbox returns explicit completed-with-failures outcomes instead of reporting final destination failure as skipped.");
assert(!telegramBridge.includes("return \"retry_scheduled\" as const;\n  }\n}"), "Infrastructure dispatch exhaustion cannot persist failed and then unconditionally return retry_scheduled.");
assert(telegramBridge.includes("return infrastructureOutcome;"), "Infrastructure dispatch failure returns the same outcome persisted by the transaction.");

includesAll(adminRoutingWorkerRoute, [
  "requireSuperAdmin",
  "processDueTelegramSignalRoutingOutbox"
], "Telegram routing outbox repair has a protected Super Admin worker route.");

includesAll(sourceGuards, [
  "hasModeratedTelegramSignalProof",
  "isRoutableTradeHubSignalSource",
  "isPublishedRoutableTradeHubSignalForMarket",
  "isSignalSourceStillAllowedForExecution",
  "external_signal_bridge_attestations",
  "external_signal_candidates",
  "sourceRecordId",
  "sourceRecordVersion",
  "db.doc(`external_signal_sources/${sourceRecordId}`)",
  "source.status === \"enabled\"",
  "source.workspaceId === workspaceId",
  "candidate.status === \"approved_for_workspace_preview\"",
  "candidate.publishedSignalId === signal.signalId"
], "Routing source guard admits Telegram only with immutable moderation proof, bridge attestation, current approval, and final source allowlist recheck.");

assert(!sourceGuards.includes(".where(\"sourceId\""), "Final execution source guard reloads the exact attested source record instead of selecting an arbitrary source.");

includesAll(workspacePreview, [
  "publishable",
  "/api/workspace/signals/external-preview/publish",
  "window.confirm",
  "Publish"
], "Workspace preview exposes a confirmed Publish action only for approved publishable Telegram previews.");

includesAll(`${cryptoProduction}\n${forexCanary}`, [
  "isSignalSourceStillAllowedForExecution",
  "!signalSourceAllowed"
], "Crypto production and Forex live-canary workers revalidate Telegram source posture before credential/provider access.");

includesAll(studentSignals, [
  "hasModeratedTelegramSignalProof",
  "studentVisibleSignalSourceLabel",
  "record.source === \"legacy_in_app\"",
  "copiedState",
  "authoritativePnl"
], "Student feed remains allowlisted and only shows moderated Telegram signals with safe labels.");

includesAll(indexes, [
  "\"collectionGroup\": \"external_signal_sources\"",
  "\"fieldPath\": \"expectedSourceIdentity\"",
  "\"collectionGroup\": \"external_signal_candidates\"",
  "\"fieldPath\": \"deliverySafeRef\"",
  "\"fieldPath\": \"previewSafeRef\"",
  "\"collectionGroup\": \"external_signal_routing_outbox\"",
  "\"fieldPath\": \"leaseExpiresAt\""
], "Firestore indexes cover Telegram source, duplicate delivery, preview publication, and routing outbox lookup.");

includesAll(rules, [
  "match /external_signal_sources/{documentId}",
  "match /external_signal_candidates/{documentId}",
  "match /external_signal_delivery_markers/{documentId}",
  "match /external_signal_fingerprint_markers/{documentId}",
  "match /external_signal_bridge_attestations/{documentId}",
  "match /external_signal_routing_outbox/{documentId}",
  "allow read, write: if false"
], "Firestore browser rules remain deny-by-default for external ingestion paths.");

includesAll(envExample, [
  "TELEGRAM_SIGNAL_WEBHOOK_ENABLED=false",
  "TELEGRAM_SIGNAL_WEBHOOK_SECRET=",
  "TELEGRAM_SIGNAL_IDENTITY_SECRET="
], ".env.example documents default-disabled Telegram placeholders only.");

excludesAll(`${telegramIngress}\n${telegramBridge}\n${telegramRoute}`, [
  "node-telegram-bot-api",
  "telegraf",
  "grammy",
  "botToken",
  "console.log",
  "rawTelegram",
  "rawUpdateStored: true",
  "providerPayload",
  "placeOrder",
  "setWebhook("
], "Stage 29K code does not add Telegram clients, tokens, raw payload storage, provider calls, or order engines.");

includesAll(workspaceAdminBrowser, [
  "Visible Admin source setup form should accept the Telegram source",
  "getByLabel(\"Source type\").selectOption(\"telegram_channel\")",
  "getByLabel(\"Telegram channel identity\").fill(\"-1002999000001\")",
  "getByRole(\"button\", { name: /^Save source$/i }).click()",
  "sourceResponse.request().postDataJSON().parserMode",
  "/api/integrations/telegram/signals/webhook",
  "Admin review API should approve the Telegram candidate",
  "/api/workspace/signals/external-preview/publish",
  "Stage 29K Partner",
  "BTCUSDT"
], "Browser coverage exercises visible Admin source setup, webhook receipt, Admin approval, workspace Publish, student display, privacy, and cleanup.");

assert(
  !workspaceAdminBrowser.includes("page.request.post(\"/api/admin/signals/external-ingestion/sources\"") &&
    !workspaceAdminBrowser.includes("page.request.post('/api/admin/signals/external-ingestion/sources'") &&
    !workspaceAdminBrowser.includes("page.request.post(`/api/admin/signals/external-ingestion/sources`"),
  "Browser coverage does not bypass visible Telegram source setup with direct page.request.post source creation."
);

includesAll(read("scripts/qa-stage29k-ingestion-emulator.mjs"), [
  "telegram_source_identity_workspace_conflict",
  "telegram_update_invalid_timestamp",
  "moderationSnapshotHash",
  "telegram_publication_preview_stale",
  "destinationProgress?.crypto_paper?.status === \"completed\"",
  "Failure after first destination does not invoke later destinations.",
  "Routing repair skips destinations already confirmed complete.",
  "Routing worker recovers expired in-progress outbox leases.",
  "Expired lease recovery invokes every unfinished applicable destination once.",
  "First destination completes once, second fails five times, and third is still attempted exactly once.",
  "Different destinations keep independent retry budgets.",
  "completedWithFailures === 1",
  "final_failed",
  "Outbox does not become terminal while a destination remains retryable.",
  "Infrastructure failure attempt ${attempt} returns retry_scheduled.",
  "Exhausting infrastructure failure increments failed, not retry scheduled.",
  "A later worker run does not rediscover the failed infrastructure outbox.",
  "Infrastructure exhaustion invokes no destination routes."
], "Emulator QA covers source uniqueness, stale publication, malformed timestamps, destination-specific routing checkpoints, expired lease recovery, independent repeated-failure budgets, and infrastructure exhaustion truthfulness.");

includesAll(docs, [
  "Stage 29K",
  "Telegram Signal Ingestion And Controlled Bridge",
  "TH-2026-09-08-STAGE29K-TELEGRAM-SIGNAL-BRIDGE-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
  "8 September 2026",
  "owner-accepted",
  "closed",
  "frozen",
  "Real Telegram/provider acceptance remains deferred",
  "Stage 29J remains owner-accepted, closed, and frozen",
  "Stage 29L is implemented/source-QA ready",
  "Stage 29M remains unstarted and next"
], "Stage 29K documentation records implementation, owner acceptance closure, preserved frozen stages, and deferred real-provider acceptance.");

excludesAll(docs, [
  "Stage 29K Telegram Signal Ingestion And Controlled Bridge is implemented/source-QA ready for adviser review",
  "Stage 29K is implemented/source-QA ready",
  "Stage 29K owner acceptance remains pending"
], "Stage 29K documentation no longer describes owner acceptance as pending.");

console.log("Stage 29K Telegram Signal Ingestion And Controlled Bridge source QA passed.");
