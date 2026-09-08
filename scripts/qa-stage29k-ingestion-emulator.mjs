import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import ts from "typescript";

const root = process.cwd();
const projectId = process.env.FIREBASE_PROJECT_ID || "trade-hub-4d8df";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= projectId;
process.env.GCLOUD_PROJECT ||= projectId;
process.env.TELEGRAM_SIGNAL_WEBHOOK_ENABLED = "true";
process.env.TELEGRAM_SIGNAL_WEBHOOK_SECRET = "stage29k_local_webhook_secret";
process.env.TELEGRAM_SIGNAL_IDENTITY_SECRET = "stage29k_local_identity_secret_minimum_32_chars";
process.env.EXTERNAL_SIGNAL_SOURCE_ALLOWLIST_ENABLED = "true";

const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const routingCalls = {
  cryptoPaper: 0,
  cryptoSandbox: 0,
  cryptoProduction: 0,
  forexPaper: 0,
  forexDemo: 0,
  forexCanary: 0,
  failOnce: new Set(),
  failTimes: new Map()
};

class AdminApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const moduleCache = new Map();
function loadTsModule(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath);

  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};
  const module = { exports };
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "node:crypto" || specifier === "crypto") return crypto;
    if (specifier === "firebase-admin/firestore") return { FieldValue };
    if (specifier === "@/lib/firebase/admin") return { getFirebaseAdminClients: () => ({ db }) };
    if (specifier === "@/lib/firebase/admin-errors") return { AdminApiError };
    if (specifier === "@/lib/admin/admin-api") {
      return {
        apiJson: (body, init) => Response.json(body, init),
        apiError: (error) => Response.json(
          { ok: false, code: error?.code ?? "internal_error", message: error?.message ?? "Request failed." },
          { status: error?.status ?? 500 }
        )
      };
    }
    if (specifier === "@/lib/firebase/admin-auth") {
      return {
        requireSuperAdmin: async () => ({ uid: "stage29k_admin", email: "admin29k@example.test", token: { role: "super_admin" } })
      };
    }
    if (specifier === "@/lib/firebase/influencer-auth") {
      return {
        requireInfluencer: async () => actor
      };
    }
    if (specifier === "@/lib/workspace/signal-symbols") {
      return {
        canonicalSignalPair: (value) => String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
        isSupportedCryptoSpotSymbol: (value) => ["BTCUSDT", "ETHUSDT", "LINKUSDT"].includes(String(value).toUpperCase()),
        isSupportedForexDemoProofSymbol: (value) => ["XAUUSD", "EURUSD", "GBPJPY"].includes(String(value).toUpperCase()),
        isSupportedForexPair: (value) => ["EURUSD", "GBPJPY", "XAUUSD"].includes(String(value).toUpperCase()),
        normalizeSignalPairForMarket: (value) => String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
      };
    }
    if (specifier === "@/lib/signals/external-signal-ingestion-contract") {
      return loadTsModule("src/lib/signals/external-signal-ingestion-contract.ts");
    }
    if (specifier === "@/lib/signals/external-signal-ingestion-repository") {
      return loadTsModule("src/lib/signals/external-signal-ingestion-repository.ts");
    }
    if (specifier === "@/lib/signals/telegram-signal-ingestion") {
      return loadTsModule("src/lib/signals/telegram-signal-ingestion.ts");
    }
    if (specifier === "@/lib/signals/telegram-signal-bridge") {
      return loadTsModule("src/lib/signals/telegram-signal-bridge.ts");
    }
    if (specifier === "@/lib/signals/tradehub-signal-source-guards") {
      return loadTsModule("src/lib/signals/tradehub-signal-source-guards.ts");
    }
    if (specifier === "@/lib/workspace/dashboard-mappers") {
      return {
        recordFromSnapshot: (snapshot, idField = "id") => ({ ...snapshot.data(), [idField]: snapshot.data()?.[idField] ?? snapshot.id }),
        mapSignalRecord: (record, workspaceId) => ({
          signalId: String(record.signalId ?? ""),
          workspaceId: String(record.workspaceId ?? workspaceId),
          source: record.source === "telegram_channel" ? "telegram_channel" : record.source === "in_app" ? "in_app" : "unknown",
          status: record.status === "published" ? "published" : "unknown",
          market: record.market === "forex" ? "forex" : "crypto",
          pair: String(record.pair ?? ""),
          direction: record.direction === "sell" ? "sell" : "buy",
          entry: String(record.entry ?? ""),
          takeProfit: String(record.takeProfit ?? ""),
          stopLoss: String(record.stopLoss ?? ""),
          riskLabel: "medium",
          deliveryMode: "alerts_only",
          externalSignalProof: record.externalSignalProof,
          createdAt: String(record.createdAt ?? new Date(0).toISOString()),
          updatedAt: String(record.updatedAt ?? new Date(0).toISOString()),
          publishedAt: typeof record.publishedAt === "string" ? record.publishedAt : undefined
        })
      };
    }
    if (specifier === "@/lib/workspace/onboarding-mappers") {
      return {
        buildAuditEvent: ({ actor, action, targetType, targetId, after, now }) => ({
          eventId: `audit_${crypto.createHash("sha256").update(`${action}|${targetId}|${now}`).digest("hex").slice(0, 18)}`,
          actorRef: `workspace_user_${crypto.createHash("sha256").update(actor.uid).digest("hex").slice(0, 8)}`,
          action,
          targetType,
          targetId,
          after,
          createdAt: now
        })
      };
    }
    const routeStub = (name) => async () => {
      routingCalls[name] += 1;
      const remainingFailures = Number(routingCalls.failTimes.get(name) ?? 0);
      if (remainingFailures > 0) {
        if (remainingFailures === 1) routingCalls.failTimes.delete(name);
        else routingCalls.failTimes.set(name, remainingFailures - 1);
        throw new Error("stage29k_injected_repeated_routing_failure");
      }
      if (routingCalls.failOnce.has(name)) {
        routingCalls.failOnce.delete(name);
        throw new Error("stage29k_injected_routing_failure");
      }
      return { routed: false, warnings: [`${name} deterministic no-provider stub`] };
    };
    if (specifier === "@/lib/crypto-execution/crypto-signal-routing") return { routePublishedCryptoSignalForPaperExecution: routeStub("cryptoPaper") };
    if (specifier === "@/lib/crypto-execution/crypto-live-sandbox") return { routePublishedCryptoSignalForLiveSandboxExecution: routeStub("cryptoSandbox") };
    if (specifier === "@/lib/crypto-execution/crypto-live-production") return { routePublishedCryptoSignalForLiveProductionExecution: routeStub("cryptoProduction") };
    if (specifier === "@/lib/crypto-execution/forex-paper-execution") return { routePublishedForexSignalForPaperExecution: routeStub("forexPaper") };
    if (specifier === "@/lib/crypto-execution/forex-demo-execution") return { routePublishedForexSignalForDemoExecution: routeStub("forexDemo") };
    if (specifier === "@/lib/crypto-execution/forex-live-canary-execution") return { routePublishedForexSignalForLiveCanaryExecution: routeStub("forexCanary") };
    throw new Error(`Unsupported module import in Stage 29K QA: ${specifier}`);
  };

  const wrapper = new Function("require", "module", "exports", compiled);
  wrapper(localRequire, module, exports);
  moduleCache.set(relativePath, module.exports);
  return module.exports;
}

async function clearCollection(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
}

const ingress = loadTsModule("src/lib/signals/telegram-signal-ingestion.ts");
const bridge = loadTsModule("src/lib/signals/telegram-signal-bridge.ts");
const guards = loadTsModule("src/lib/signals/tradehub-signal-source-guards.ts");
const repository = loadTsModule("src/lib/signals/external-signal-ingestion-repository.ts");
const webhookRoute = loadTsModule("src/app/api/integrations/telegram/signals/webhook/route.ts");

const workspaceId = "stage29k_workspace";
const actor = { uid: "stage29k_influencer", email: "stage29k@example.test", workspaceId, token: {} };
const adminActor = { uid: "stage29k_admin", email: "stage29k-admin@example.test", token: { role: "super_admin" } };
const rawChatIdentity = "-1002900000001";
const chatIdentity = ingress.createTelegramSignalOpaqueIdentity(rawChatIdentity, "tgsrc");

await clearCollection("external_signal_candidates");
await clearCollection("external_signal_sources");
await clearCollection("external_signal_delivery_markers");
await clearCollection("external_signal_fingerprint_markers");
await clearCollection("external_signal_ingress_rate");
await clearCollection("external_signal_bridge_attestations");
await clearCollection("external_signal_routing_outbox");
await clearCollection(`workspaces/${workspaceId}/signals`);
await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Stage 29K Workspace", updatedAt: new Date().toISOString() });

const createdSource = await repository.upsertExternalSignalSourceAllowlistRecord(adminActor, {
  sourceType: "telegram_channel",
  status: "enabled",
  parserMode: "telegram_like_mock",
  workspaceId,
  telegramChatIdentity: rawChatIdentity,
  safeLabel: "Telegram source",
  allowedSymbols: ["BTCUSDT", "EURUSD"],
  allowedAssetClasses: ["crypto", "forex"],
  riskLimits: { maxTakeProfitCount: 3, requiresStopLoss: true, maxEntryRangePercent: 2 }
});
assert(createdSource.ok && createdSource.source.status === "enabled", "Protected Admin source setup creates an enabled Telegram source.");
assert(!JSON.stringify(createdSource).includes(rawChatIdentity), "Admin source setup response never returns the raw Telegram identity.");
const [sameSourceA, sameSourceB] = await Promise.all([
  repository.upsertExternalSignalSourceAllowlistRecord(adminActor, {
    sourceType: "telegram_channel",
    status: "enabled",
    parserMode: "telegram_like_mock",
    workspaceId,
    telegramChatIdentity: rawChatIdentity,
    safeLabel: "Telegram source",
    allowedSymbols: ["BTCUSDT", "EURUSD"],
    allowedAssetClasses: ["crypto", "forex"],
    riskLimits: { maxTakeProfitCount: 3, requiresStopLoss: true, maxEntryRangePercent: 2 }
  }),
  repository.upsertExternalSignalSourceAllowlistRecord(adminActor, {
    sourceType: "telegram_channel",
    status: "enabled",
    parserMode: "telegram_like_mock",
    workspaceId,
    telegramChatIdentity: rawChatIdentity,
    safeLabel: "Telegram source",
    allowedSymbols: ["BTCUSDT", "EURUSD"],
    allowedAssetClasses: ["crypto", "forex"],
    riskLimits: { maxTakeProfitCount: 3, requiresStopLoss: true, maxEntryRangePercent: 2 }
  })
]);
assert(sameSourceA.ok && sameSourceB.ok, "Concurrent same-workspace Telegram source setup is idempotent.");
await repository.upsertExternalSignalSourceAllowlistRecord(adminActor, {
  sourceType: "telegram_channel",
  status: "enabled",
  parserMode: "telegram_like_mock",
  workspaceId: "stage29k_other_workspace",
  telegramChatIdentity: rawChatIdentity,
  safeLabel: "Conflicting Telegram source",
  allowedSymbols: ["BTCUSDT"],
  allowedAssetClasses: ["crypto"],
  riskLimits: { maxTakeProfitCount: 3, requiresStopLoss: true, maxEntryRangePercent: 2 }
}).then(
  () => assert(false, "Telegram source identity cannot be rebound to another workspace."),
  (error) => assert(error.code === "telegram_source_identity_workspace_conflict", "Telegram source identity cannot be rebound to another workspace.")
);
const sourceSnapshot = await db.collection("external_signal_sources").limit(2).get();
assert(sourceSnapshot.size === 1, "Admin source setup writes exactly one source record.");
const sourceRecord = sourceSnapshot.docs[0].data();
assert(sourceRecord.expectedSourceIdentity === chatIdentity, "Admin source setup stores the keyed opaque Telegram identity for webhook matching.");
assert(sourceRecord.sourceRecordVersion?.startsWith("srcver_"), "Telegram source setup records a server-only source configuration version.");
assert(!JSON.stringify(sourceRecord).includes(rawChatIdentity), "Admin source setup does not persist the raw Telegram identity.");

const update = {
  update_id: 29001,
  channel_post: {
    message_id: 101,
    date: Math.floor(Date.now() / 1000),
    chat: { id: rawChatIdentity, type: "channel" },
    text: "BTCUSDT BUY\nEntry 68000\nSL 67000\nTP 70000"
  }
};

async function postWebhook(updateBody, secret = process.env.TELEGRAM_SIGNAL_WEBHOOK_SECRET) {
  const response = await webhookRoute.POST(new Request("http://127.0.0.1/api/integrations/telegram/signals/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret
    },
    body: typeof updateBody === "string" ? updateBody : JSON.stringify(updateBody)
  }));

  return { status: response.status, body: await response.json() };
}

const malformed = await postWebhook("{", process.env.TELEGRAM_SIGNAL_WEBHOOK_SECRET);
assert(malformed.status === 400 && malformed.body.code === "telegram_webhook_malformed_json", "Webhook route returns a safe 400 for malformed JSON.");

const invalidSecret = await postWebhook(update, "wrong_secret");
assert(invalidSecret.status === 401, "Webhook route rejects invalid Telegram secret before processing.");

const [acceptedA, acceptedB] = await Promise.all([postWebhook(update), postWebhook(update)]);
const accepted = acceptedA.body.status === "duplicate" ? acceptedB.body : acceptedA.body;
const duplicateConcurrent = acceptedA.body.status === "duplicate" ? acceptedA.body : acceptedB.body;
assert(
  accepted.ok && accepted.accepted && ["parsed", "needs_review"].includes(accepted.status),
  "Valid allowlisted Telegram update is normalized into a safe moderation candidate."
);
assert(duplicateConcurrent.status === "duplicate", "Concurrent duplicate Telegram delivery is atomically deduplicated.");
const duplicate = (await postWebhook(update)).body;
assert(duplicate.status === "duplicate", "Duplicate Telegram delivery is an idempotent no-op.");

const buyFirst = await postWebhook({
  update_id: 29011,
  channel_post: {
    message_id: 111,
    date: Math.floor(Date.now() / 1000),
    chat: { id: rawChatIdentity, type: "channel" },
    text: "BUY EURUSD\nEntry 1.0872\nSL 1.0800\nTP 1.1000"
  }
});
assert(["parsed", "needs_review"].includes(buyFirst.body.status), "Telegram parser supports BUY before symbol safely.");

const ambiguous = await postWebhook({
  update_id: 29012,
  channel_post: {
    message_id: 112,
    date: Math.floor(Date.now() / 1000),
    chat: { id: rawChatIdentity, type: "channel" },
    text: "BTCUSDT BUY SELL\nEntry 68000\nSL 67000\nTP 70000"
  }
});
assert(ambiguous.body.status === "quarantined", "Telegram parser rejects conflicting directions.");

const unknown = (await postWebhook({
  update_id: 29002,
  channel_post: {
    message_id: 102,
    date: Math.floor(Date.now() / 1000),
    chat: { id: "-1002900000002", type: "channel" },
    text: "BTCUSDT BUY Entry 68000 SL 67000 TP 70000"
  }
})).body;
assert(!unknown.accepted && unknown.status === "quarantined", "Unknown Telegram source stays quarantined and non-executable.");

const stale = (await postWebhook({
  update_id: 29003,
  channel_post: {
    message_id: 103,
    date: Math.floor((Date.now() - 7 * 60 * 60 * 1000) / 1000),
    chat: { id: rawChatIdentity, type: "channel" },
    text: "BTCUSDT BUY Entry 68000 SL 67000 TP 70000"
  }
})).body;
assert(stale.status === "rejected" && stale.safeReason === "telegram_update_stale", "Stale Telegram updates fail closed.");

const future = (await postWebhook({
  update_id: 29004,
  channel_post: {
    message_id: 104,
    date: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
    chat: { id: rawChatIdentity, type: "channel" },
    text: "BTCUSDT BUY Entry 68000 SL 67000 TP 70000"
  }
})).body;
assert(future.status === "rejected" && future.safeReason === "telegram_update_future_timestamp", "Unreasonable future Telegram timestamps fail closed.");

const malformedTimestamp = (await postWebhook({
  update_id: 29005,
  channel_post: {
    message_id: 105,
    date: 1e309,
    chat: { id: rawChatIdentity, type: "channel" },
    text: "BTCUSDT BUY Entry 68000 SL 67000 TP 70000"
  }
})).body;
assert(malformedTimestamp.status === "quarantined" && malformedTimestamp.safeReason === "telegram_update_invalid_timestamp", "Out-of-range Telegram Unix timestamps fail closed without server errors.");

const candidateSnapshot = await db.collection("external_signal_candidates").where("normalized.symbol", "==", "BTCUSDT").limit(5).get();
assert(candidateSnapshot.size === 1, "Exactly one actionable BTCUSDT Telegram candidate was stored before approval.");
const candidateDoc = candidateSnapshot.docs[0];
const candidate = candidateDoc.data();
assert(candidate.normalized?.symbol === "BTCUSDT" && candidate.normalized?.assetClass === "crypto", "Stored Telegram candidate preserves normalized safe trade fields.");
assert(candidate.workspaceId === workspaceId && candidate.sourceType === "telegram_channel", "Stored Telegram candidate is workspace-scoped and source typed.");
assert(candidate.normalized?.side === "buy" && candidate.normalized?.entryRange?.min === "68000", "Stored Telegram candidate preserves side and entry.");
assert(candidate.normalized?.stopLoss === "67000" && candidate.normalized?.takeProfits?.[0] === "70000", "Stored Telegram candidate preserves SL and TP.");
assert(candidate.immutableModerationProofRef && candidate.sourceSafeRef, "Stored Telegram candidate has safe proof refs for promotion.");
assert(candidate.sourceRecordId === sourceSnapshot.docs[0].id && candidate.sourceRecordVersion === sourceRecord.sourceRecordVersion, "Stored Telegram candidate binds the exact source record and version.");
assert(candidate.rawPayloadStored === false && !("rawText" in candidate) && !("chatId" in candidate), "Stored Telegram candidate omits raw payload, message text, and chat identifiers.");

const approved = await repository.reviewExternalSignalCandidate(adminActor, candidateDoc.id, {
  action: "approve_for_workspace_preview",
  reviewReason: "Stage 29K browser-safe moderation approval."
});
assert(approved.candidate.status === "approved_for_workspace_preview", "Protected Admin review API approves the Telegram candidate for workspace preview.");
const approvedSnapshot = await candidateDoc.ref.get();
assert(approvedSnapshot.data()?.moderationSnapshotHash?.startsWith("modsnap_"), "Admin approval stores an immutable moderation snapshot hash.");

const previewId = `preview_${crypto.createHash("sha256").update(candidateDoc.id).digest("hex").slice(0, 12)}`;
await candidateDoc.ref.set({
  normalized: {
    ...candidate.normalized,
    entryRange: { min: "68100" }
  }
}, { merge: true });
await bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId }).then(
  () => assert(false, "Publication rejects stale candidate snapshots after preview approval."),
  (error) => assert(error.code === "telegram_publication_preview_stale", "Publication rejects stale candidate snapshots after preview approval.")
);
await candidateDoc.ref.set({ normalized: candidate.normalized }, { merge: true });
await repository.reviewExternalSignalCandidate(adminActor, candidateDoc.id, {
  action: "approve_for_workspace_preview",
  reviewReason: "Stage 29K refreshed moderation approval."
});

const [promotedA, promotedB] = await Promise.all([
  bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId }),
  bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId })
]);
const promoted = promotedA.promoted ? promotedA : promotedB;
assert(promoted.ok && promoted.promoted, "Workspace promotion creates one canonical published Telegram TradeHub signal.");
assert(
  routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 1 && routingCalls.cryptoProduction === 1,
  `Promotion invokes existing crypto routing paths once through deterministic no-provider adapters. Counts: paper=${routingCalls.cryptoPaper}, sandbox=${routingCalls.cryptoSandbox}, production=${routingCalls.cryptoProduction}.`
);
assert(routingCalls.forexPaper === 0 && routingCalls.forexDemo === 0 && routingCalls.forexCanary === 0, "Crypto Telegram signal does not route to Forex execution paths.");

const signals = await db.collection(`workspaces/${workspaceId}/signals`).get();
assert(signals.size === 1, "Promotion is transactionally idempotent and creates exactly one workspace signal.");
const signal = signals.docs[0].data();
assert(signal.source === "telegram_channel" && signal.status === "published", "Promoted signal has canonical Telegram source and published status.");
assert(signal.externalSignalProof?.proofStatus === "moderated_published", "Promoted signal stores safe immutable moderation proof.");
assert(signal.externalSignalProof?.bridgeAttestationRef, "Promoted signal stores a safe bridge attestation ref for execution revalidation.");
assert(!("rawTelegram" in signal) && !("chatId" in signal) && !("messageText" in signal), "Promoted signal omits raw Telegram content and identifiers.");
const initialOutbox = await db.collection("external_signal_routing_outbox").limit(1).get();
const initialOutboxData = initialOutbox.docs[0].data();
assert(initialOutboxData.destinationProgress?.crypto_paper?.status === "completed", "Routing outbox records Crypto Paper destination completion separately.");
assert(initialOutboxData.destinationProgress?.crypto_sandbox?.status === "completed", "Routing outbox records Crypto Sandbox destination completion separately.");
assert(initialOutboxData.destinationProgress?.crypto_production?.status === "completed", "Routing outbox records Crypto Production destination completion separately.");
assert(initialOutboxData.destinationProgress?.forex_paper?.status === "not_applicable", "Routing outbox records non-applicable Forex destinations separately.");

const sourceAllowed = await guards.isSignalSourceStillAllowedForExecution(signal, workspaceId);
assert(sourceAllowed === true, "Final execution source guard accepts enabled moderated Telegram source with attestation.");
await candidateDoc.ref.set({ status: "rejected", reviewStatus: "rejected" }, { merge: true });
const rejectedCandidateAllowed = await guards.isSignalSourceStillAllowedForExecution(signal, workspaceId);
assert(rejectedCandidateAllowed === false, "Final execution source guard blocks if the approved candidate is later rejected.");
await candidateDoc.ref.set({ status: "approved_for_workspace_preview", reviewStatus: "approved_for_workspace_preview" }, { merge: true });
await sourceSnapshot.docs[0].ref.set({ status: "disabled" }, { merge: true });
const disabledSourceAllowed = await guards.isSignalSourceStillAllowedForExecution(signal, workspaceId);
assert(disabledSourceAllowed === false, "Final execution source guard blocks disabled Telegram source before provider access.");

const promotedAgain = await bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId });
assert(promotedAgain.ok && promotedAgain.promoted === false, "Repeated preview publication is an idempotent no-op.");

await clearCollection("external_signal_routing_outbox");
routingCalls.cryptoPaper = 0;
routingCalls.cryptoSandbox = 0;
routingCalls.cryptoProduction = 0;
routingCalls.failOnce.add("cryptoSandbox");
await bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId: "preview_missing" }).catch(() => undefined);
await sourceSnapshot.docs[0].ref.set({ status: "enabled" }, { merge: true });
await db.doc(`workspaces/${workspaceId}/signals/${signal.signalId}`).delete();
await candidateDoc.ref.set({ publishedSignalId: FieldValue.delete(), publishedSignalRef: FieldValue.delete(), promotedAt: FieldValue.delete() }, { merge: true });
const retryPromotion = await bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId });
assert(retryPromotion.dispatchStatus === "retry_scheduled", "Routing dispatch failure leaves a retryable outbox state without undoing publication.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 1 && routingCalls.cryptoProduction === 0, "Failure after first destination does not invoke later destinations.");
const repaired = await bridge.processDueTelegramSignalRoutingOutbox(5);
assert(repaired.completed === 1, "Routing dispatch repair retries unfinished idempotent bridge work.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 2 && routingCalls.cryptoProduction === 1, "Routing repair skips destinations already confirmed complete.");

await clearCollection("external_signal_routing_outbox");
routingCalls.cryptoPaper = 0;
routingCalls.cryptoSandbox = 0;
routingCalls.cryptoProduction = 0;
routingCalls.failOnce.add("cryptoProduction");
await db.doc(`workspaces/${workspaceId}/signals/${signal.signalId}`).delete();
await candidateDoc.ref.set({ publishedSignalId: FieldValue.delete(), publishedSignalRef: FieldValue.delete(), promotedAt: FieldValue.delete() }, { merge: true });
const secondRouteFailure = await bridge.promoteTelegramPreviewToWorkspaceSignal(actor, { previewId });
assert(secondRouteFailure.dispatchStatus === "retry_scheduled", "Routing dispatch records retry state after a later destination failure.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 1 && routingCalls.cryptoProduction === 1, "Failure after second destination records all attempted destinations exactly once.");
const repairedSecond = await bridge.processDueTelegramSignalRoutingOutbox(5);
assert(repairedSecond.completed === 1, "Routing repair completes after later destination failure.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 1 && routingCalls.cryptoProduction === 2, "Routing repair retries only the unfinished later destination.");

const expiredOutboxId = "tgroute_expired_stage29k";
const expiredNow = new Date().toISOString();
routingCalls.cryptoPaper = 0;
routingCalls.cryptoSandbox = 0;
routingCalls.cryptoProduction = 0;
await db.doc(`external_signal_routing_outbox/${expiredOutboxId}`).set({
  outboxId: expiredOutboxId,
  status: "in_progress",
  workspaceId,
  signalRef: `signal_${crypto.createHash("sha256").update(signal.signalId).digest("hex").slice(0, 12)}`,
  signalPath: `workspaces/${workspaceId}/signals/${signal.signalId}`,
  market: "crypto",
  destinationProgress: {
    crypto_paper: { status: "pending", attempts: 0, updatedAt: expiredNow },
    crypto_sandbox: { status: "pending", attempts: 0, updatedAt: expiredNow },
    crypto_production: { status: "pending", attempts: 0, updatedAt: expiredNow },
    forex_paper: { status: "not_applicable", attempts: 0, updatedAt: expiredNow },
    forex_demo: { status: "not_applicable", attempts: 0, updatedAt: expiredNow },
    forex_live_canary: { status: "not_applicable", attempts: 0, updatedAt: expiredNow }
  },
  attempts: 1,
  ownerToken: "abandoned_owner",
  leaseExpiresAt: new Date(Date.now() - 60_000).toISOString(),
  nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
  createdAt: expiredNow,
  updatedAt: expiredNow
});
const recoveredExpired = await bridge.processDueTelegramSignalRoutingOutbox(1);
assert(recoveredExpired.completed === 1 && recoveredExpired.attempted === 1, "Routing worker recovers expired in-progress outbox leases.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 1 && routingCalls.cryptoProduction === 1, "Expired lease recovery invokes every unfinished applicable destination once.");

function resetCryptoRoutingCalls() {
  routingCalls.cryptoPaper = 0;
  routingCalls.cryptoSandbox = 0;
  routingCalls.cryptoProduction = 0;
  routingCalls.failOnce.clear();
  routingCalls.failTimes.clear();
}

async function seedCryptoRoutingOutbox(outboxId) {
  const now = new Date().toISOString();
  await db.doc(`external_signal_routing_outbox/${outboxId}`).set({
    outboxId,
    status: "pending",
    workspaceId,
    signalRef: `signal_${crypto.createHash("sha256").update(signal.signalId).digest("hex").slice(0, 12)}`,
    signalPath: `workspaces/${workspaceId}/signals/${signal.signalId}`,
    market: "crypto",
    destinationProgress: {
      crypto_paper: { status: "pending", attempts: 0, updatedAt: now },
      crypto_sandbox: { status: "pending", attempts: 0, updatedAt: now },
      crypto_production: { status: "pending", attempts: 0, updatedAt: now },
      forex_paper: { status: "not_applicable", attempts: 0, updatedAt: now },
      forex_demo: { status: "not_applicable", attempts: 0, updatedAt: now },
      forex_live_canary: { status: "not_applicable", attempts: 0, updatedAt: now }
    },
    dispatchAttempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now
  });
}

async function readRoutingOutbox(outboxId) {
  const snapshot = await db.doc(`external_signal_routing_outbox/${outboxId}`).get();
  return snapshot.data();
}

await clearCollection("external_signal_routing_outbox");
resetCryptoRoutingCalls();
routingCalls.failTimes.set("cryptoSandbox", 5);
const middleFailureOutboxId = "tgroute_middle_destination_exhaustion_stage29k";
await seedCryptoRoutingOutbox(middleFailureOutboxId);
const firstMiddleAttempt = await bridge.processDueTelegramSignalRoutingOutbox(5);
const firstMiddleState = await readRoutingOutbox(middleFailureOutboxId);
assert(firstMiddleAttempt.retryScheduled === 1 && firstMiddleAttempt.skipped === 0, "A retryable middle-destination failure is reported as retry scheduled, not skipped.");
assert(firstMiddleState.status === "retry_scheduled", "Outbox does not become terminal while a destination remains retryable.");
assert(firstMiddleState.destinationProgress?.crypto_paper?.status === "completed", "Completed destinations are checkpointed before a later retryable failure.");
assert(firstMiddleState.destinationProgress?.crypto_sandbox?.status === "retry_scheduled", "Retryable destination failures remain explicitly retry scheduled.");
assert(firstMiddleState.destinationProgress?.crypto_production?.status === "pending", "Later destinations remain pending until the failing destination reaches a terminal state.");
await bridge.processDueTelegramSignalRoutingOutbox(5);
await bridge.processDueTelegramSignalRoutingOutbox(5);
await bridge.processDueTelegramSignalRoutingOutbox(5);
const finalMiddleAttempt = await bridge.processDueTelegramSignalRoutingOutbox(5);
const finalMiddleState = await readRoutingOutbox(middleFailureOutboxId);
assert(finalMiddleAttempt.completedWithFailures === 1 && finalMiddleAttempt.skipped === 0 && finalMiddleAttempt.retryScheduled === 0, "Final destination exhaustion is counted as completed with failures, not skipped or retry scheduled.");
assert(finalMiddleState.status === "completed_with_failures", "Persisted outbox status agrees with the completed-with-failures worker counter.");
assert(finalMiddleState.destinationProgress?.crypto_sandbox?.status === "final_failed", "A destination has its own bounded final-failed state.");
assert(finalMiddleState.destinationProgress?.crypto_sandbox?.attempts === 5, "The exhausted destination consumes only its own retry budget.");
assert(finalMiddleState.destinationProgress?.crypto_production?.status === "completed", "A destination after a final-failed destination is still attempted and can complete.");
assert(finalMiddleState.destinationProgress?.crypto_production?.attempts === 1, "Different destinations keep independent retry budgets.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 5 && routingCalls.cryptoProduction === 1, "First destination completes once, second fails five times, and third is still attempted exactly once.");

await clearCollection("external_signal_routing_outbox");
resetCryptoRoutingCalls();
routingCalls.failTimes.set("cryptoProduction", 5);
const finalDestinationFailureOutboxId = "tgroute_final_destination_exhaustion_stage29k";
await seedCryptoRoutingOutbox(finalDestinationFailureOutboxId);
let finalDestinationResult = await bridge.processDueTelegramSignalRoutingOutbox(5);
for (let index = 0; index < 4; index += 1) {
  finalDestinationResult = await bridge.processDueTelegramSignalRoutingOutbox(5);
}
const finalDestinationState = await readRoutingOutbox(finalDestinationFailureOutboxId);
assert(finalDestinationResult.completedWithFailures === 1 && finalDestinationResult.skipped === 0, "A final destination exhausting retries is reported as completed with failures.");
assert(finalDestinationState.status === "completed_with_failures", "Outbox terminal status waits for all applicable destinations to complete or final-fail.");
assert(finalDestinationState.destinationProgress?.crypto_paper?.attempts === 1 && finalDestinationState.destinationProgress?.crypto_sandbox?.attempts === 1, "Already completed destinations are never called again during destination retries.");
assert(finalDestinationState.destinationProgress?.crypto_production?.status === "final_failed" && finalDestinationState.destinationProgress?.crypto_production?.attempts === 5, "Final destination owns its independent bounded retry budget.");
assert(routingCalls.cryptoPaper === 1 && routingCalls.cryptoSandbox === 1 && routingCalls.cryptoProduction === 5, "First and second destinations complete once while the third consumes only its own retries.");

await clearCollection("external_signal_routing_outbox");
resetCryptoRoutingCalls();
const infrastructureFailureOutboxId = "tgroute_infrastructure_exhaustion_stage29k";
const infrastructureNow = new Date().toISOString();
const initialInfrastructureProgress = {
  crypto_paper: { status: "pending", attempts: 0, updatedAt: infrastructureNow },
  crypto_sandbox: { status: "pending", attempts: 0, updatedAt: infrastructureNow },
  crypto_production: { status: "pending", attempts: 0, updatedAt: infrastructureNow },
  forex_paper: { status: "not_applicable", attempts: 0, updatedAt: infrastructureNow },
  forex_demo: { status: "not_applicable", attempts: 0, updatedAt: infrastructureNow },
  forex_live_canary: { status: "not_applicable", attempts: 0, updatedAt: infrastructureNow }
};
await db.doc(`external_signal_routing_outbox/${infrastructureFailureOutboxId}`).set({
  outboxId: infrastructureFailureOutboxId,
  status: "pending",
  workspaceId,
  signalRef: "signal_missing_stage29k",
  signalPath: `workspaces/${workspaceId}/signals/signal_missing_stage29k`,
  market: "crypto",
  destinationProgress: initialInfrastructureProgress,
  dispatchAttempts: 0,
  nextAttemptAt: infrastructureNow,
  createdAt: infrastructureNow,
  updatedAt: infrastructureNow
});

for (let attempt = 1; attempt <= 4; attempt += 1) {
  const result = await bridge.processDueTelegramSignalRoutingOutbox(5);
  const state = await readRoutingOutbox(infrastructureFailureOutboxId);
  assert(result.attempted === 1 && result.retryScheduled === 1 && result.failed === 0, `Infrastructure failure attempt ${attempt} returns retry_scheduled.`);
  assert(state.status === "retry_scheduled" && state.dispatchAttempts === attempt, `Infrastructure failure attempt ${attempt} persists retry_scheduled with the matching dispatch attempt.`);
  assert(typeof state.nextAttemptAt === "string", `Infrastructure failure attempt ${attempt} retains a due retry timestamp.`);
  assert(JSON.stringify(state.destinationProgress) === JSON.stringify(initialInfrastructureProgress), `Infrastructure failure attempt ${attempt} does not corrupt destination progress.`);
  assert(routingCalls.cryptoPaper === 0 && routingCalls.cryptoSandbox === 0 && routingCalls.cryptoProduction === 0, `Infrastructure failure attempt ${attempt} invokes no destination routes.`);
}

const exhaustedInfrastructure = await bridge.processDueTelegramSignalRoutingOutbox(5);
const exhaustedInfrastructureState = await readRoutingOutbox(infrastructureFailureOutboxId);
assert(exhaustedInfrastructure.attempted === 1 && exhaustedInfrastructure.failed === 1 && exhaustedInfrastructure.retryScheduled === 0 && exhaustedInfrastructure.skipped === 0, "Exhausting infrastructure failure increments failed, not retry scheduled.");
assert(exhaustedInfrastructureState.status === "failed" && exhaustedInfrastructureState.dispatchAttempts === 5, "Exhausting infrastructure failure persists failed with the matching dispatch attempt.");
assert(!("nextAttemptAt" in exhaustedInfrastructureState), "A final failed infrastructure record does not retain a future nextAttemptAt.");
assert(JSON.stringify(exhaustedInfrastructureState.destinationProgress) === JSON.stringify(initialInfrastructureProgress), "Infrastructure exhaustion does not corrupt destination progress.");
assert(routingCalls.cryptoPaper === 0 && routingCalls.cryptoSandbox === 0 && routingCalls.cryptoProduction === 0, "Infrastructure exhaustion invokes no destination routes.");
const rediscoveredInfrastructure = await bridge.processDueTelegramSignalRoutingOutbox(5);
assert(rediscoveredInfrastructure.attempted === 0 && rediscoveredInfrastructure.failed === 0 && rediscoveredInfrastructure.retryScheduled === 0, "A later worker run does not rediscover the failed infrastructure outbox.");

await clearCollection(`workspaces/${workspaceId}/signals`);
await clearCollection("external_signal_candidates");
await clearCollection("external_signal_sources");
await clearCollection("external_signal_delivery_markers");
await clearCollection("external_signal_fingerprint_markers");
await clearCollection("external_signal_ingress_rate");
await clearCollection("external_signal_bridge_attestations");
await clearCollection("external_signal_routing_outbox");

console.log("Stage 29K Telegram ingestion emulator QA passed.");
