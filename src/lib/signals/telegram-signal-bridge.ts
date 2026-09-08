import "server-only";

import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { routePublishedCryptoSignalForLiveProductionExecution } from "@/lib/crypto-execution/crypto-live-production";
import { routePublishedCryptoSignalForLiveSandboxExecution } from "@/lib/crypto-execution/crypto-live-sandbox";
import { routePublishedCryptoSignalForPaperExecution } from "@/lib/crypto-execution/crypto-signal-routing";
import { routePublishedForexSignalForDemoExecution } from "@/lib/crypto-execution/forex-demo-execution";
import { routePublishedForexSignalForLiveCanaryExecution } from "@/lib/crypto-execution/forex-live-canary-execution";
import { routePublishedForexSignalForPaperExecution } from "@/lib/crypto-execution/forex-paper-execution";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import { createExternalSignalSafeRef } from "@/lib/signals/external-signal-ingestion-contract";
import {
  mapSignalRecord,
  recordFromSnapshot
} from "@/lib/workspace/dashboard-mappers";
import { buildAuditEvent } from "@/lib/workspace/onboarding-mappers";
import type { WorkspaceExternalSignalPromotionResponse } from "@/types/external-signal-ingestion";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

const EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID = "external_signal_candidates";
const EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID = "external_signal_sources";
const EXTERNAL_SIGNAL_BRIDGE_ATTESTATION_COLLECTION_ID = "external_signal_bridge_attestations";
const EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID = "external_signal_routing_outbox";
const PROMOTION_SCAN_LIMIT = 80;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeSafeRef(value: unknown, maxLength = 96) {
  return asString(value).replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, maxLength);
}

function sanitizeDocPath(value: unknown, maxLength = 180) {
  return asString(value).replace(/[^a-zA-Z0-9_./-]/g, "").slice(0, maxLength);
}

function sanitizeLabel(value: unknown) {
  return asString(value).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function deterministicSafeId(value: string, prefix: string) {
  return `${prefix}_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function withoutUndefinedFields<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createModerationSnapshotHash(value: Record<string, unknown>) {
  return `modsnap_${crypto.createHash("sha256").update(stableJson({
    normalized: value.normalized,
    parserVersion: value.parserVersion,
    sourceType: value.sourceType,
    sourceSafeRef: value.sourceSafeRef,
    sourceRecordId: value.sourceRecordId,
    sourceRecordVersion: value.sourceRecordVersion,
    immutableModerationProofRef: value.immutableModerationProofRef
  })).digest("hex").slice(0, 24)}`;
}

function approvedCandidateToSignal(
  actor: VerifiedInfluencer,
  candidateId: string,
  candidate: Record<string, unknown>,
  sourceLabel: string,
  now: string,
  signalId: string,
  bridgeAttestationRef: string
): WorkspaceSignalRecord {
  const normalized = asRecord(candidate.normalized);
  const entryRange = asRecord(normalized?.entryRange);
  const market = normalized?.assetClass === "crypto" ? "crypto" : normalized?.assetClass === "forex" ? "forex" : null;
  const takeProfits = Array.isArray(normalized?.takeProfits) ? normalized.takeProfits.map(asString).filter(Boolean) : [];
  const proofRef = sanitizeSafeRef(candidate.immutableModerationProofRef);
  const sourceSafeRef = sanitizeSafeRef(candidate.sourceSafeRef || candidate.maskedSourceRef);

  if (
    candidate.workspaceId !== actor.workspaceId ||
    candidate.sourceType !== "telegram_channel" ||
    candidate.status !== "approved_for_workspace_preview" ||
    candidate.reviewStatus !== "approved_for_workspace_preview" ||
    !normalized ||
    !market ||
    !proofRef ||
    !sourceSafeRef ||
    !asString(normalized.symbol) ||
    (normalized.side !== "buy" && normalized.side !== "sell") ||
    !asString(entryRange?.min) ||
    !asString(normalized.stopLoss) ||
    takeProfits.length === 0
  ) {
    throw new AdminApiError(
      409,
      "telegram_candidate_not_publishable",
      "Only approved Telegram previews with complete moderated signal details can be published."
    );
  }

  return {
    signalId,
    workspaceId: actor.workspaceId,
    source: "telegram_channel",
    status: "published",
    market,
    pair: asString(normalized.symbol).toUpperCase().slice(0, 24),
    direction: normalized.side,
    entry: asString(entryRange?.min).slice(0, 32),
    takeProfit: takeProfits[0].slice(0, 32),
    stopLoss: asString(normalized.stopLoss).slice(0, 32),
    riskLabel: "medium",
    deliveryMode: "alerts_only",
    externalSignalProof: {
      sourceType: "telegram_channel",
      proofStatus: "moderated_published",
      sourceLabel,
      sourceSafeRef,
      candidateSafeRef: createExternalSignalSafeRef(candidateId, "candidate"),
      bridgeAttestationRef,
      moderationVersion: sanitizeSafeRef(candidate.parserVersion, 48) || "stage29k_telegram_deterministic_v1",
      approvedAt: asString(candidate.reviewedAt) || now,
      publishedAt: now
    },
    createdAt: now,
    updatedAt: now,
    publishedAt: now
  };
}

function sourceRecordVersion(value: unknown) {
  return sanitizeSafeRef(value, 80);
}

function sourceRecordId(value: unknown) {
  return sanitizeSafeRef(value, 96);
}

async function findCandidateByPreviewId(previewId: string) {
  const { db } = getFirebaseAdminClients();
  const directSnapshot = await db
    .collection(EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID)
    .where("previewSafeRef", "==", previewId)
    .limit(2)
    .get();

  if (directSnapshot.size === 1) {
    return directSnapshot.docs[0];
  }

  const snapshot = await db
    .collection(EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID)
    .where("status", "==", "approved_for_workspace_preview")
    .limit(PROMOTION_SCAN_LIMIT)
    .get();

  return snapshot.docs.find((doc) => createExternalSignalSafeRef(doc.id, "preview") === previewId) ?? null;
}

const TELEGRAM_ROUTING_DESTINATIONS = [
  "crypto_paper",
  "crypto_sandbox",
  "crypto_production",
  "forex_paper",
  "forex_demo",
  "forex_live_canary"
] as const;

type TelegramRoutingDestination = typeof TELEGRAM_ROUTING_DESTINATIONS[number];

type TelegramRoutingDestinationState = {
  status: "pending" | "in_progress" | "completed" | "retry_scheduled" | "final_failed" | "not_applicable";
  attempts: number;
  updatedAt?: string;
  completedAt?: string;
  safeReason?: string;
};

function applicableTelegramRoutingDestinations(market: string): TelegramRoutingDestination[] {
  if (market === "crypto") {
    return ["crypto_paper", "crypto_sandbox", "crypto_production"];
  }

  if (market === "forex") {
    return ["forex_paper", "forex_demo", "forex_live_canary"];
  }

  return [];
}

function createInitialDestinationProgress(market: string, now: string) {
  const applicable = new Set(applicableTelegramRoutingDestinations(market));

  return Object.fromEntries(
    TELEGRAM_ROUTING_DESTINATIONS.map((destination) => [
      destination,
      {
        status: applicable.has(destination) ? "pending" : "not_applicable",
        attempts: 0,
        updatedAt: now
      }
    ])
  );
}

function sanitizeDestinationProgress(value: unknown, market: string) {
  const record = asRecord(value) ?? {};
  const applicable = new Set(applicableTelegramRoutingDestinations(market));

  return Object.fromEntries(
    TELEGRAM_ROUTING_DESTINATIONS.map((destination) => {
      const current = asRecord(record[destination]) ?? {};
      const rawStatus = asString(current.status);
      const status = (
        rawStatus === "pending" ||
        rawStatus === "in_progress" ||
        rawStatus === "completed" ||
        rawStatus === "retry_scheduled" ||
        rawStatus === "final_failed" ||
        rawStatus === "failed"
      )
        ? rawStatus === "failed" ? "final_failed" : rawStatus as TelegramRoutingDestinationState["status"]
        : applicable.has(destination)
          ? "pending"
          : "not_applicable";

      return [
        destination,
        withoutUndefinedFields({
          status: applicable.has(destination) ? status : "not_applicable",
          attempts: Math.max(0, Math.min(20, Math.trunc(Number(current.attempts ?? 0) || 0))),
          updatedAt: asString(current.updatedAt) || undefined,
          completedAt: asString(current.completedAt) || undefined,
          safeReason: sanitizeSafeRef(current.safeReason, 96) || undefined
        })
      ];
    })
  ) as Record<TelegramRoutingDestination, TelegramRoutingDestinationState>;
}

async function routeTelegramDestination(
  destination: TelegramRoutingDestination,
  actor: VerifiedInfluencer,
  signal: WorkspaceSignalRecord
) {
  if (destination === "crypto_paper") {
    return routePublishedCryptoSignalForPaperExecution({ actor, signal, trigger: "created_published" });
  }

  if (destination === "crypto_sandbox") {
    return routePublishedCryptoSignalForLiveSandboxExecution({ actor, signal });
  }

  if (destination === "crypto_production") {
    return routePublishedCryptoSignalForLiveProductionExecution({ actor, signal });
  }

  if (destination === "forex_paper") {
    return routePublishedForexSignalForPaperExecution({ actor, signal, trigger: "created_published" });
  }

  if (destination === "forex_demo") {
    return routePublishedForexSignalForDemoExecution({ actor, signal, trigger: "created_published" });
  }

  if (destination === "forex_live_canary") {
    return routePublishedForexSignalForLiveCanaryExecution({ actor, signal, trigger: "created_published" });
  }
}

async function updateDestinationProgress(
  outboxId: string,
  ownerToken: string,
  destination: TelegramRoutingDestination,
  nextState: Partial<TelegramRoutingDestinationState>,
  market: string
) {
  const { db } = getFirebaseAdminClients();
  const outboxRef = db.doc(`${EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID}/${outboxId}`);
  const now = new Date().toISOString();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(outboxRef);
    const data = snapshot.data() ?? {};

    if (data.status !== "in_progress" || data.ownerToken !== ownerToken) {
      return false;
    }

    const progress = sanitizeDestinationProgress(data.destinationProgress, market);
    const current = progress[destination];
    progress[destination] = withoutUndefinedFields({
      ...current,
      ...nextState,
      updatedAt: now
    }) as TelegramRoutingDestinationState;
    transaction.set(outboxRef, {
      destinationProgress: progress,
      updatedAt: now,
      serverUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return true;
  });
}

async function finalizeRoutingOutbox(
  outboxId: string,
  ownerToken: string,
  market: string
) {
  const { db } = getFirebaseAdminClients();
  const outboxRef = db.doc(`${EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID}/${outboxId}`);
  const now = new Date().toISOString();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(outboxRef);
    const data = snapshot.data() ?? {};

    if (data.status !== "in_progress" || data.ownerToken !== ownerToken) {
      return "skipped" as const;
    }

    const progress = sanitizeDestinationProgress(data.destinationProgress, market);
    const applicable = applicableTelegramRoutingDestinations(market);
    const anyFinalFailed = applicable.some((destination) => progress[destination].status === "final_failed");
    const allCompleted = applicable.length > 0 && applicable.every((destination) => progress[destination].status === "completed");
    const allTerminal = applicable.length > 0 && applicable.every((destination) => (
      progress[destination].status === "completed" ||
      progress[destination].status === "final_failed"
    ));
    const status = allCompleted ? "completed" : allTerminal && anyFinalFailed ? "completed_with_failures" : "retry_scheduled";
    const retryScheduled = status === "retry_scheduled";

    transaction.set(outboxRef, withoutUndefinedFields({
      status,
      safeReason: retryScheduled ? "telegram_routing_dispatch_retry_scheduled" : status === "completed_with_failures" ? "telegram_routing_destination_completed_with_failures" : FieldValue.delete(),
      nextAttemptAt: retryScheduled ? now : FieldValue.delete(),
      completedAt: allCompleted ? now : undefined,
      terminalAt: allTerminal ? now : undefined,
      updatedAt: now,
      ownerToken: FieldValue.delete(),
      leaseExpiresAt: FieldValue.delete(),
      serverUpdatedAt: FieldValue.serverTimestamp()
    }), { merge: true });

    return status;
  });
}

async function dispatchTelegramRoutingOutbox(outboxId: string) {
  const { db } = getFirebaseAdminClients();
  const outboxRef = db.doc(`${EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID}/${outboxId}`);
  const ownerToken = deterministicSafeId(`${outboxId}|${Date.now()}|${Math.random()}`, "routeowner");
  const now = new Date().toISOString();
  const claim = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(outboxRef);

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() ?? {};

    if (data.status === "completed" || data.status === "completed_with_failures" || data.status === "failed") {
      return null;
    }

    if (data.status === "in_progress" && typeof data.leaseExpiresAt === "string" && Date.parse(data.leaseExpiresAt) > Date.now()) {
      return null;
    }

    const dispatchAttempts = Math.max(0, Number(data.dispatchAttempts ?? data.attempts ?? 0));

    if (dispatchAttempts >= 5) {
      transaction.set(outboxRef, {
        status: "failed",
        safeReason: "telegram_routing_infrastructure_attempts_exhausted",
        nextAttemptAt: FieldValue.delete(),
        ownerToken: FieldValue.delete(),
        leaseExpiresAt: FieldValue.delete(),
        updatedAt: now,
        serverUpdatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        outcome: "failed" as const
      };
    }

    transaction.set(outboxRef, {
      status: "in_progress",
      ownerToken,
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      updatedAt: now,
      serverUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      outcome: "claimed" as const,
      signalPath: sanitizeDocPath(data.signalPath, 180),
      workspaceId: sanitizeSafeRef(data.workspaceId, 96),
      market: sanitizeSafeRef(data.market, 24),
      destinationProgress: data.destinationProgress,
      dispatchAttempts
    };
  });

  if (claim?.outcome === "failed") {
    return "failed" as const;
  }

  if (!claim?.signalPath || !claim.workspaceId) {
    return "skipped" as const;
  }

  try {
    const signalSnapshot = await db.doc(claim.signalPath).get();

    if (!signalSnapshot.exists) {
      throw new Error("signal_missing_for_routing_dispatch");
    }

    const signal = mapSignalRecord(recordFromSnapshot(signalSnapshot, "signalId"), claim.workspaceId);
    const actor = { uid: "telegram_bridge_dispatch", email: "telegram-bridge@tradehub.local", workspaceId: claim.workspaceId, token: {} } as VerifiedInfluencer;
    const progress = sanitizeDestinationProgress(claim.destinationProgress, signal.market);
    const applicable = applicableTelegramRoutingDestinations(signal.market);

    for (const destination of applicable) {
      const current = progress[destination];

      if (current.status === "completed" || current.status === "final_failed") {
        continue;
      }

      const nextAttempt = current.attempts + 1;
      const markedInProgress = await updateDestinationProgress(outboxId, ownerToken, destination, {
        status: "in_progress",
        attempts: nextAttempt,
        safeReason: undefined
      }, signal.market);

      if (!markedInProgress) {
        return "skipped" as const;
      }

      try {
        await routeTelegramDestination(destination, actor, signal);
        const markedCompleted = await updateDestinationProgress(outboxId, ownerToken, destination, {
          status: "completed",
          attempts: nextAttempt,
          completedAt: new Date().toISOString(),
          safeReason: undefined
        }, signal.market);

        if (!markedCompleted) {
          return "skipped" as const;
        }
      } catch {
        const finalFailed = nextAttempt >= 5;
        await updateDestinationProgress(outboxId, ownerToken, destination, {
          status: finalFailed ? "final_failed" : "retry_scheduled",
          attempts: nextAttempt,
          safeReason: finalFailed ? "telegram_routing_destination_attempts_exhausted" : "telegram_routing_destination_retry_scheduled"
        }, signal.market);

        if (!finalFailed) {
          break;
        }
      }
    }

    const finalStatus = await finalizeRoutingOutbox(outboxId, ownerToken, signal.market);

    return finalStatus === "completed" ? "completed" as const : finalStatus === "completed_with_failures" ? "completed_with_failures" as const : finalStatus === "retry_scheduled" ? "retry_scheduled" as const : "skipped" as const;
  } catch {
    const infrastructureOutcome = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(outboxRef);
      const data = snapshot.data() ?? {};

      if (data.status !== "in_progress" || data.ownerToken !== ownerToken) {
        return "skipped" as const;
      }

      const dispatchAttempts = Math.max(0, Number(data.dispatchAttempts ?? data.attempts ?? 0)) + 1;
      const exhausted = dispatchAttempts >= 5;

      transaction.set(outboxRef, {
        status: exhausted ? "failed" : "retry_scheduled",
        safeReason: exhausted ? "telegram_routing_infrastructure_attempts_exhausted" : "telegram_routing_dispatch_retry_scheduled",
        nextAttemptAt: exhausted ? FieldValue.delete() : new Date().toISOString(),
        dispatchAttempts,
        updatedAt: new Date().toISOString(),
        ownerToken: FieldValue.delete(),
        leaseExpiresAt: FieldValue.delete(),
        serverUpdatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return exhausted ? "failed" as const : "retry_scheduled" as const;
    });

    return infrastructureOutcome;
  }
}

export async function processDueTelegramSignalRoutingOutbox(limit = 10) {
  const { db } = getFirebaseAdminClients();
  const boundedLimit = Math.max(1, Math.min(25, Math.trunc(limit)));
  const now = new Date().toISOString();
  const [dueSnapshot, expiredSnapshot] = await Promise.all([
    db
    .collection(EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID)
    .where("status", "in", ["pending", "retry_scheduled"])
    .where("nextAttemptAt", "<=", now)
    .orderBy("nextAttemptAt", "asc")
    .orderBy("updatedAt", "asc")
    .limit(boundedLimit)
      .get(),
    db
      .collection(EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID)
      .where("status", "==", "in_progress")
      .where("leaseExpiresAt", "<=", now)
      .orderBy("leaseExpiresAt", "asc")
      .orderBy("updatedAt", "asc")
      .limit(boundedLimit)
      .get()
  ]);
  const candidates = [
    ...dueSnapshot.docs.map((doc) => ({ doc, eligibleAt: asString(doc.data().nextAttemptAt), updatedAt: asString(doc.data().updatedAt) })),
    ...expiredSnapshot.docs.map((doc) => ({ doc, eligibleAt: asString(doc.data().leaseExpiresAt), updatedAt: asString(doc.data().updatedAt) }))
  ]
    .sort((left, right) => (
      Date.parse(left.eligibleAt || new Date(0).toISOString()) - Date.parse(right.eligibleAt || new Date(0).toISOString()) ||
      Date.parse(left.updatedAt || new Date(0).toISOString()) - Date.parse(right.updatedAt || new Date(0).toISOString()) ||
      left.doc.id.localeCompare(right.doc.id)
    ))
    .slice(0, boundedLimit);
  let completed = 0;
  let completedWithFailures = 0;
  let failed = 0;
  let retryScheduled = 0;
  let skipped = 0;

  for (const { doc } of candidates) {
    const outcome = await dispatchTelegramRoutingOutbox(doc.id);

    if (outcome === "completed") completed += 1;
    else if (outcome === "completed_with_failures") completedWithFailures += 1;
    else if (outcome === "failed") failed += 1;
    else if (outcome === "retry_scheduled") retryScheduled += 1;
    else skipped += 1;
  }

  return {
    ok: true as const,
    attempted: candidates.length,
    completed,
    completedWithFailures,
    failed,
    retryScheduled,
    skipped
  };
}

export async function promoteTelegramPreviewToWorkspaceSignal(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspaceExternalSignalPromotionResponse> {
  const previewId = sanitizeSafeRef(asRecord(payload)?.previewId);

  if (!previewId.startsWith("preview_")) {
    throw new AdminApiError(400, "preview_ref_invalid", "Choose a valid external signal preview.");
  }

  const { db } = getFirebaseAdminClients();
  const candidateDoc = await findCandidateByPreviewId(previewId);

  if (!candidateDoc) {
    throw new AdminApiError(404, "preview_not_found", "That approved external preview was not found.");
  }

  const candidate = candidateDoc.data();
  const existingSignalId = sanitizeSafeRef(candidate.publishedSignalId, 80);

  if (existingSignalId) {
    const existing = await db.doc(`workspaces/${actor.workspaceId}/signals/${existingSignalId}`).get();

    if (existing.exists) {
      const signal = mapSignalRecord(recordFromSnapshot(existing, "signalId"), actor.workspaceId);

      return {
        ok: true,
        promoted: false,
        signalRef: createExternalSignalSafeRef(signal.signalId, "signal"),
        sourceLabel: signal.externalSignalProof?.sourceLabel || "Telegram source",
        safeMessage: "This approved Telegram preview was already published as one TradeHub signal."
      };
    }
  }

  const now = new Date().toISOString();
  const proofRef = sanitizeSafeRef(candidate.immutableModerationProofRef);
  const signalId = deterministicSafeId(`${actor.workspaceId}|${candidateDoc.id}|${proofRef}`, "sig_tg");
  const bridgeAttestationRef = deterministicSafeId(`${signalId}|${candidateDoc.id}|${proofRef}`, "tgatt");
  const outboxId = deterministicSafeId(`${signalId}|routing`, "tgroute");
  let promotedSourceLabel = "Telegram source";
  const promoted = await db.runTransaction(async (transaction) => {
    const candidateSnapshot = await transaction.get(candidateDoc.ref);
    const currentCandidate = candidateSnapshot.data() ?? {};
    const currentProofRef = sanitizeSafeRef(currentCandidate.immutableModerationProofRef);
    const currentSourceRecordId = sourceRecordId(currentCandidate.sourceRecordId);
    const currentSourceVersion = sourceRecordVersion(currentCandidate.sourceRecordVersion);
    const currentSnapshotHash = sourceRecordVersion(currentCandidate.moderationSnapshotHash);

    if (
      !currentSourceRecordId ||
      !currentSourceVersion ||
      currentProofRef !== proofRef ||
      !currentSnapshotHash ||
      createModerationSnapshotHash(currentCandidate) !== currentSnapshotHash
    ) {
      throw new AdminApiError(409, "telegram_publication_preview_stale", "Refresh this preview before publishing it.");
    }

    const sourceRef = db.doc(`${EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID}/${currentSourceRecordId}`);
    const [signalSnapshot, sourceSnapshot] = await Promise.all([
      transaction.get(db.doc(`workspaces/${actor.workspaceId}/signals/${signalId}`)),
      transaction.get(sourceRef)
    ]);
    const currentSource = sourceSnapshot?.data() ?? {};
    const signal = approvedCandidateToSignal(
      actor,
      candidateDoc.id,
      currentCandidate,
      sanitizeLabel(currentSource.safeLabel) || "Telegram source",
      now,
      signalId,
      bridgeAttestationRef
    );

    if (
      currentCandidate.workspaceId !== actor.workspaceId ||
      currentCandidate.status !== "approved_for_workspace_preview" ||
      currentCandidate.reviewStatus !== "approved_for_workspace_preview"
    ) {
      throw new AdminApiError(409, "telegram_candidate_not_publishable", "This preview is no longer approved for publication.");
    }

    if (
      !sourceSnapshot.exists ||
      currentSource.status !== "enabled" ||
      currentSource.sourceType !== "telegram_channel" ||
      currentSource.workspaceId !== actor.workspaceId ||
      currentSource.sourceId !== currentCandidate.sourceSafeRef ||
      sourceRecordVersion(currentSource.sourceRecordVersion) !== currentSourceVersion
    ) {
      throw new AdminApiError(409, "telegram_source_disabled", "This Telegram source is no longer enabled for publication.");
    }

    if (signalSnapshot.exists) {
      return false;
    }

    const auditEvent = buildAuditEvent({
      actor,
      action: "workspace.signal.telegram_promote_published",
      targetType: "workspace",
      targetId: createExternalSignalSafeRef(actor.workspaceId, "workspace"),
      after: {
        signalRef: createExternalSignalSafeRef(signal.signalId, "signal"),
        status: signal.status,
        pair: signal.pair,
        source: signal.source
      },
      now
    });
    const auditRecord = withoutUndefinedFields(auditEvent as unknown as Record<string, unknown>);
    promotedSourceLabel = signal.externalSignalProof?.sourceLabel || "Telegram source";

    transaction.set(db.doc(`workspaces/${actor.workspaceId}/signals/${signal.signalId}`), signal);
    transaction.set(candidateDoc.ref, {
      publishedSignalId: signal.signalId,
      publishedSignalRef: createExternalSignalSafeRef(signal.signalId, "signal"),
      previewSafeRef: previewId,
      promotedAt: now,
      updatedAt: now,
      serverUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(db.doc(`${EXTERNAL_SIGNAL_BRIDGE_ATTESTATION_COLLECTION_ID}/${bridgeAttestationRef}`), {
      bridgeAttestationRef,
      signalId: signal.signalId,
      candidateId: candidateDoc.id,
      workspaceId: actor.workspaceId,
      sourceSafeRef: signal.externalSignalProof?.sourceSafeRef,
      sourceRecordId: currentSourceRecordId,
      sourceRecordVersion: currentSourceVersion,
      candidateSafeRef: signal.externalSignalProof?.candidateSafeRef,
      immutableModerationProofRef: proofRef,
      moderationVersion: signal.externalSignalProof?.moderationVersion,
      market: signal.market,
      symbol: signal.pair,
      direction: signal.direction,
      status: "published",
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: FieldValue.serverTimestamp(),
      serverUpdatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(db.doc(`${EXTERNAL_SIGNAL_ROUTING_OUTBOX_COLLECTION_ID}/${outboxId}`), {
      outboxId,
      status: "pending",
      workspaceId: actor.workspaceId,
      signalRef: createExternalSignalSafeRef(signal.signalId, "signal"),
      signalPath: `workspaces/${actor.workspaceId}/signals/${signal.signalId}`,
      market: signal.market,
      destinationProgress: createInitialDestinationProgress(signal.market, now),
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: FieldValue.serverTimestamp(),
      serverUpdatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(db.doc(`audit_log/${auditEvent.eventId}`), auditRecord);

    return true;
  });

  const dispatchStatus = promoted ? await dispatchTelegramRoutingOutbox(outboxId) : "skipped";
  return {
    ok: true,
    promoted,
    dispatchStatus: dispatchStatus === "completed" ? "completed" : dispatchStatus === "completed_with_failures" ? "completed_with_failures" : dispatchStatus === "retry_scheduled" ? "retry_scheduled" : "pending",
    signalRef: createExternalSignalSafeRef(signalId, "signal"),
    sourceLabel: promotedSourceLabel,
    safeMessage: "Approved Telegram preview was published as one moderated TradeHub signal. Existing Copier gates still apply."
  };
}
