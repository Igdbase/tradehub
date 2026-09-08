import "server-only";

import crypto from "node:crypto";
import { FieldValue, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import {
  EXTERNAL_SIGNAL_ALLOWED_ASSET_CLASSES,
  EXTERNAL_SIGNAL_MAX_TAKE_PROFITS,
  EXTERNAL_SIGNAL_PARSER_MODES,
  EXTERNAL_SIGNAL_PARSER_VERSION,
  EXTERNAL_SIGNAL_SOURCE_TYPES,
  createExternalSignalFingerprint,
  createExternalSignalSafeRef,
  getExternalSignalIngestionReadiness,
  parseManualMockExternalSignalCandidate
} from "@/lib/signals/external-signal-ingestion-contract";
import { createTelegramSignalOpaqueIdentity } from "@/lib/signals/telegram-signal-ingestion";
import type {
  ExternalSignalAssetClass,
  ExternalSignalCandidateRecord,
  ExternalSignalCandidateReviewPayload,
  ExternalSignalCandidateReviewResponse,
  ExternalSignalCandidateCreateResponse,
  ExternalSignalCandidateStatus,
  ExternalSignalIngestionOverviewResponse,
  ExternalSignalManualMockParseInput,
  ExternalSignalParserMode,
  ExternalSignalReviewStatus,
  ExternalSignalRiskFlag,
  ExternalSignalSourceAllowlistRecord,
  ExternalSignalSourceAllowlistMutationResponse,
  ExternalSignalSourceAllowlistUpsertInput,
  ExternalSignalSourceStatus,
  ExternalSignalSourceType,
  WorkspaceExternalSignalPreviewRecord,
  WorkspaceExternalSignalPreviewResponse
} from "@/types/external-signal-ingestion";
import type { WorkspaceSignalDirection } from "@/types/workspace-dashboard";

const EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID = "external_signal_sources";
const EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID = "external_signal_candidates";
const EXTERNAL_SIGNAL_OVERVIEW_LIMIT = 25;
const EXTERNAL_SIGNAL_WORKSPACE_PREVIEW_LIMIT = 25;
const SAFE_TEXT_MAX_LENGTH = 180;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function safeDate(value: unknown) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  return new Date(0).toISOString();
}

function sanitizeText(value: unknown, maxLength = SAFE_TEXT_MAX_LENGTH) {
  return asString(value)
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};

    Object.entries(value).forEach(([key, entry]) => {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    });

    return cleaned as T;
  }

  return value;
}

function asSourceType(value: unknown): ExternalSignalSourceType {
  const sourceType = asString(value) as ExternalSignalSourceType;

  return EXTERNAL_SIGNAL_SOURCE_TYPES.includes(sourceType) ? sourceType : "manual_admin_seed";
}

function asParserMode(value: unknown): ExternalSignalParserMode {
  const parserMode = asString(value) as ExternalSignalParserMode;

  return EXTERNAL_SIGNAL_PARSER_MODES.includes(parserMode) ? parserMode : "disabled";
}

function asAssetClass(value: unknown): ExternalSignalAssetClass {
  const assetClass = asString(value) as ExternalSignalAssetClass;

  return EXTERNAL_SIGNAL_ALLOWED_ASSET_CLASSES.includes(assetClass) ? assetClass : "other";
}

function asDirection(value: unknown): WorkspaceSignalDirection {
  return asString(value) === "sell" ? "sell" : "buy";
}

function asStatus(value: unknown): ExternalSignalCandidateStatus {
  const status = asString(value) as ExternalSignalCandidateStatus;

  if (
    status === "received" ||
    status === "parsed" ||
    status === "rejected" ||
    status === "quarantined" ||
    status === "duplicate" ||
    status === "needs_review" ||
    status === "approved_for_workspace_preview"
  ) {
    return status;
  }

  return "quarantined";
}

function asSourceStatus(value: unknown): ExternalSignalSourceStatus {
  return asString(value) === "enabled" ? "enabled" : "disabled";
}

function asReviewStatus(value: unknown): ExternalSignalReviewStatus {
  const status = asString(value) as ExternalSignalReviewStatus;

  if (
    status === "unreviewed" ||
    status === "needs_review" ||
    status === "rejected" ||
    status === "quarantined" ||
    status === "approved_for_workspace_preview"
  ) {
    return status;
  }

  return "unreviewed";
}

function safeStringArray(value: unknown, maxEntries = 10) {
  return Array.isArray(value)
    ? value.map((entry) => sanitizeText(entry, 48)).filter(Boolean).slice(0, maxEntries)
    : [];
}

function safeAssetClassArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(asAssetClass).filter((entry) => entry !== "other").slice(0, 10)
    : [];
}

function safeRiskFlagArray(value: unknown) {
  const allowed: ExternalSignalRiskFlag[] = [
    "unsupported_symbol",
    "unsupported_asset_class",
    "missing_or_invalid_entry",
    "missing_stop_loss",
    "missing_take_profit",
    "too_many_take_profits",
    "duplicate_fingerprint",
    "suspicious_text_pattern",
    "workspace_scope_mismatch"
  ];

  return Array.isArray(value)
    ? value.filter((entry): entry is ExternalSignalRiskFlag => allowed.includes(entry as ExternalSignalRiskFlag)).slice(0, 12)
    : [];
}

function safeAdminRef(actor: VerifiedSuperAdmin) {
  return createExternalSignalSafeRef(actor.uid || actor.email || "super_admin", "admin");
}

function assertCandidateId(candidateId: string) {
  if (!/^extsig_[a-f0-9]{12,32}$/i.test(candidateId)) {
    throw new AdminApiError(400, "external_signal_candidate_id_invalid", "Choose a valid external signal candidate.");
  }
}

function candidateDocPath(candidateId: string) {
  assertCandidateId(candidateId);

  return `${EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID}/${candidateId}`;
}

function mapExternalSignalSource(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): ExternalSignalSourceAllowlistRecord {
  const data = snapshot.data() ?? {};
  const sourceType = asSourceType(data.sourceType);
  const parserMode = asParserMode(data.parserMode);

  return {
    sourceId: sanitizeText(data.sourceId, 64) || createExternalSignalSafeRef(snapshot.id, "source"),
    sourceType,
    workspaceId: sanitizeText(data.workspaceId, 96) || undefined,
    status: asSourceStatus(data.status),
    parserMode,
    allowedSymbols: safeStringArray(data.allowedSymbols, 25),
    allowedAssetClasses: safeAssetClassArray(data.allowedAssetClasses),
    riskLimits: {
      maxTakeProfitCount: Math.max(1, Math.min(5, Number(data.riskLimits?.maxTakeProfitCount) || 3)),
      requiresStopLoss: asBoolean(data.riskLimits?.requiresStopLoss, true),
      maxEntryRangePercent: Math.max(0, Math.min(20, Number(data.riskLimits?.maxEntryRangePercent) || 2)),
      maxRiskLabel:
        data.riskLimits?.maxRiskLabel === "low" ||
        data.riskLimits?.maxRiskLabel === "medium" ||
        data.riskLimits?.maxRiskLabel === "high"
          ? data.riskLimits.maxRiskLabel
          : undefined
    },
    maskedSourceRef: sanitizeText(data.maskedSourceRef, 64) || createExternalSignalSafeRef(snapshot.id, "source"),
    safeLabel: sanitizeText(data.safeLabel, 96) || `${sourceType} source`,
    createdAt: safeDate(data.createdAt),
    updatedAt: safeDate(data.updatedAt)
  };
}

function mapExternalSignalCandidate(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): ExternalSignalCandidateRecord {
  const data = snapshot.data() ?? {};
  const normalized = data.normalized && typeof data.normalized === "object"
    ? data.normalized as Record<string, unknown>
    : null;
  const entryRange = normalized?.entryRange && typeof normalized.entryRange === "object"
    ? normalized.entryRange as Record<string, unknown>
    : {};

  return stripUndefined({
    candidateId: snapshot.id,
    workspaceId: sanitizeText(data.workspaceId, 96) || undefined,
    status: asStatus(data.status),
    sourceType: asSourceType(data.sourceType),
    parserMode: asParserMode(data.parserMode),
    parserVersion: sanitizeText(data.parserVersion, 48) || EXTERNAL_SIGNAL_PARSER_VERSION,
    maskedSourceRef: sanitizeText(data.maskedSourceRef, 64),
    sourceSafeRef: sanitizeText(data.sourceSafeRef, 64) || undefined,
    deliverySafeRef: sanitizeText(data.deliverySafeRef, 80) || undefined,
    immutableModerationProofRef: sanitizeText(data.immutableModerationProofRef, 80) || undefined,
    publishedSignalRef: sanitizeText(data.publishedSignalRef, 80) || undefined,
    fingerprint: sanitizeText(data.fingerprint, 80),
    normalized: normalized ? {
      symbol: sanitizeText(normalized.symbol, 24),
      assetClass: asAssetClass(normalized.assetClass),
      side: asDirection(normalized.side),
      entryRange: {
        min: sanitizeText(entryRange.min, 32),
        max: sanitizeText(entryRange.max, 32) || undefined
      },
      stopLoss: sanitizeText(normalized.stopLoss, 32) || undefined,
      takeProfits: safeStringArray(normalized.takeProfits, 5),
      confidence:
        normalized.confidence === "low" ||
        normalized.confidence === "medium" ||
        normalized.confidence === "high" ||
        normalized.confidence === "unknown"
          ? normalized.confidence
          : "unknown"
    } : undefined,
    parseWarnings: safeStringArray(data.parseWarnings, 8),
    riskFlags: safeRiskFlagArray(data.riskFlags),
    safeReason: sanitizeText(data.safeReason),
    reviewStatus: asReviewStatus(data.reviewStatus),
    reviewReason: sanitizeText(data.reviewReason) || undefined,
    adminNote: sanitizeText(data.adminNote) || undefined,
    reviewedBy: sanitizeText(data.reviewedBy, 64) || undefined,
    reviewedAt: data.reviewedAt ? safeDate(data.reviewedAt) : undefined,
    promotedAt: data.promotedAt ? safeDate(data.promotedAt) : undefined,
    receivedAt: safeDate(data.receivedAt),
    createdAt: safeDate(data.createdAt),
    updatedAt: safeDate(data.updatedAt)
  });
}

function mapWorkspaceExternalSignalPreview(
  actor: VerifiedInfluencer,
  candidate: ExternalSignalCandidateRecord,
  sourceLabels: Map<string, string>
): WorkspaceExternalSignalPreviewRecord | null {
  if (
    candidate.status !== "approved_for_workspace_preview" ||
    candidate.reviewStatus !== "approved_for_workspace_preview" ||
    candidate.workspaceId !== actor.workspaceId ||
    !candidate.normalized
  ) {
    return null;
  }

  return stripUndefined({
    previewId: createExternalSignalSafeRef(candidate.candidateId, "preview"),
    symbol: candidate.normalized.symbol,
    assetClass: candidate.normalized.assetClass,
    side: candidate.normalized.side,
    entryRange: candidate.normalized.entryRange,
    stopLoss: candidate.normalized.stopLoss,
    takeProfits: candidate.normalized.takeProfits,
    confidence: candidate.normalized.confidence,
    sourceType: candidate.sourceType,
    sourceLabel: sourceLabels.get(candidate.maskedSourceRef) ?? `${candidate.sourceType.replace(/_/g, " ")} source`,
    maskedSourceRef: candidate.maskedSourceRef,
    status: "approved_for_workspace_preview",
    reviewStatus: "approved_for_workspace_preview",
    publishable: candidate.sourceType === "telegram_channel" && !candidate.publishedSignalRef,
    publishedSignalRef: candidate.publishedSignalRef,
    safeReason: candidate.safeReason || "external_signal_preview_only",
    parseWarnings: candidate.parseWarnings,
    riskFlags: candidate.riskFlags,
    receivedAt: candidate.receivedAt,
    reviewedAt: candidate.reviewedAt,
    updatedAt: candidate.updatedAt
  });
}

async function findSourceAllowlistBySafeRef(maskedSourceRef: string): Promise<ExternalSignalSourceAllowlistRecord | null> {
  const { db } = getFirebaseAdminClients();
  const sourceSnapshot = await db
    .collection(EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID)
    .where("maskedSourceRef", "==", maskedSourceRef)
    .limit(1)
    .get();

  return sourceSnapshot.empty ? null : mapExternalSignalSource(sourceSnapshot.docs[0]);
}

function sourceScopeRiskFlags(
  source: ExternalSignalSourceAllowlistRecord | null,
  input: ExternalSignalManualMockParseInput
): ExternalSignalRiskFlag[] {
  if (!source) {
    return [];
  }

  const flags: ExternalSignalRiskFlag[] = [];
  const workspaceId = sanitizeText(input.workspaceId, 96);

  if (source.workspaceId && workspaceId && source.workspaceId !== workspaceId) {
    flags.push("workspace_scope_mismatch");
  }

  if (source.allowedAssetClasses.length > 0 && !source.allowedAssetClasses.includes(input.assetClass)) {
    flags.push("unsupported_asset_class");
  }

  const symbol = sanitizeText(input.symbol, 24).toUpperCase();

  if (
    source.allowedSymbols.length > 0 &&
    !source.allowedSymbols.map((entry) => entry.toUpperCase()).includes(symbol)
  ) {
    flags.push("unsupported_symbol");
  }

  if ((input.takeProfits ?? []).length > (source.riskLimits.maxTakeProfitCount || EXTERNAL_SIGNAL_MAX_TAKE_PROFITS)) {
    flags.push("too_many_take_profits");
  }

  if (source.riskLimits.requiresStopLoss && !sanitizeText(input.stopLoss, 32)) {
    flags.push("missing_stop_loss");
  }

  return [...new Set(flags)];
}

export async function createManualMockExternalSignalCandidate(
  actor: VerifiedSuperAdmin,
  input: ExternalSignalManualMockParseInput
): Promise<ExternalSignalCandidateRecord> {
  void actor;

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const sourceRef = input.sourceRef || input.sourceId;
  const fingerprint = createExternalSignalFingerprint({
    sourceRef,
    symbol: input.symbol,
    side: input.side,
    entryMin: input.entryMin,
    entryMax: input.entryMax,
    stopLoss: input.stopLoss,
    takeProfits: input.takeProfits
  });
  const duplicateSnapshot = await db
    .collection(EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID)
    .where("fingerprint", "==", fingerprint)
    .limit(1)
    .get();
  const parsed = parseManualMockExternalSignalCandidate(input);
  const maskedSourceRef = createExternalSignalSafeRef(input.sourceId, "source");
  const source = await findSourceAllowlistBySafeRef(maskedSourceRef);
  const riskFlags = [
    ...new Set([
      ...parsed.riskFlags,
      ...sourceScopeRiskFlags(source, input),
      ...(duplicateSnapshot.empty ? [] : ["duplicate_fingerprint" as const])
    ])
  ];
  const parseWarnings = [
    ...new Set([
      ...parsed.parseWarnings,
      ...riskFlags.filter((flag) => !parsed.parseWarnings.includes(flag))
    ])
  ].slice(0, 12);
  const candidateStatus = duplicateSnapshot.empty
    ? riskFlags.length > 0 && parsed.status === "parsed"
      ? "needs_review" as const
      : parsed.status
    : "duplicate" as const;
  const candidateId = `extsig_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const candidate: ExternalSignalCandidateRecord = stripUndefined({
    candidateId,
    workspaceId: sanitizeText(input.workspaceId, 96) || undefined,
    status: candidateStatus,
    sourceType: "manual_admin_seed",
    parserMode: "manual_mock",
    parserVersion: EXTERNAL_SIGNAL_PARSER_VERSION,
    maskedSourceRef,
    sourceSafeRef: createExternalSignalSafeRef(sourceRef, "source"),
    fingerprint,
    normalized: parsed.normalized,
    parseWarnings,
    riskFlags,
    safeReason: duplicateSnapshot.empty ? parsed.safeReason : "external_signal_duplicate",
    reviewStatus: candidateStatus === "parsed" ? "unreviewed" : "needs_review",
    receivedAt: now,
    createdAt: now,
    updatedAt: now
  });

  await db.doc(`${EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID}/${candidateId}`).set({
    ...candidate,
    serverCreatedAt: FieldValue.serverTimestamp(),
    serverUpdatedAt: FieldValue.serverTimestamp()
  });

  return candidate;
}

export async function createManualMockExternalSignalCandidateResponse(
  actor: VerifiedSuperAdmin,
  input: ExternalSignalManualMockParseInput
): Promise<ExternalSignalCandidateCreateResponse> {
  return {
    ok: true,
    candidate: await createManualMockExternalSignalCandidate(actor, input)
  };
}

export async function reviewExternalSignalCandidate(
  actor: VerifiedSuperAdmin,
  candidateId: string,
  payload: ExternalSignalCandidateReviewPayload
): Promise<ExternalSignalCandidateReviewResponse> {
  const { db } = getFirebaseAdminClients();
  const docRef = db.doc(candidateDocPath(candidateId));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "external_signal_candidate_not_found", "That external signal candidate was not found.");
  }

  const current = mapExternalSignalCandidate(snapshot);
  const now = new Date().toISOString();
  const action = payload.action;
  const reviewReason = sanitizeText(payload.reviewReason, 180) || "external_signal_admin_review";
  const adminNote = sanitizeText(payload.adminNote, 180) || undefined;
  let status: ExternalSignalCandidateStatus;
  let reviewStatus: ExternalSignalReviewStatus;
  let safeReason = reviewReason;

  if (action === "approve_for_workspace_preview") {
    if (!current.normalized || current.status === "duplicate" || current.status === "rejected") {
      throw new AdminApiError(
        409,
        "external_signal_preview_not_allowed",
        "Only normalized non-duplicate candidates can be marked for non-executable workspace preview."
      );
    }

    status = "approved_for_workspace_preview";
    reviewStatus = "approved_for_workspace_preview";
    safeReason = "external_signal_preview_only";
  } else if (action === "reject") {
    status = "rejected";
    reviewStatus = "rejected";
  } else if (action === "quarantine") {
    status = "quarantined";
    reviewStatus = "quarantined";
  } else {
    status = "needs_review";
    reviewStatus = "needs_review";
  }

  await docRef.set(
    stripUndefined({
      status,
      reviewStatus,
      reviewReason,
      adminNote,
      reviewedBy: safeAdminRef(actor),
      reviewedAt: now,
      previewSafeRef: status === "approved_for_workspace_preview" ? createExternalSignalSafeRef(candidateId, "preview") : undefined,
      moderationSnapshotHash: status === "approved_for_workspace_preview" ? createModerationSnapshotHash(snapshot.data() ?? {}) : undefined,
      safeReason,
      updatedAt: now,
      serverUpdatedAt: FieldValue.serverTimestamp()
    }),
    { merge: true }
  );

  const nextSnapshot = await docRef.get();

  return {
    ok: true,
    candidate: mapExternalSignalCandidate(nextSnapshot)
  };
}

async function findSourceDocBySafeSourceId(sourceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID)
    .where("sourceId", "==", sourceId)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0];
}

function normalizeAllowedSymbols(value: unknown) {
  return safeStringArray(value, 25).map((entry) => entry.toUpperCase());
}

function sanitizeTelegramIdentity(value: unknown) {
  return asString(value).trim().replace(/[<>]/g, "").slice(0, 96);
}

function deterministicSourceDocId(value: string) {
  return `extsrc_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
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

function createSourceRecordVersion(value: Record<string, unknown>) {
  return `srcver_${crypto.createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 24)}`;
}

function createSourceConfigurationVersion(value: Record<string, unknown>) {
  return createSourceRecordVersion({
    sourceId: value.sourceId,
    sourceType: value.sourceType,
    workspaceId: value.workspaceId,
    parserMode: value.parserMode,
    expectedSourceIdentity: value.expectedSourceIdentity,
    allowedSymbols: value.allowedSymbols,
    allowedAssetClasses: value.allowedAssetClasses,
    riskLimits: value.riskLimits
  });
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

function assertTelegramSourceConfiguration(payload: ExternalSignalSourceAllowlistUpsertInput) {
  const workspaceId = sanitizeText(payload.workspaceId, 96);
  const parserMode = asParserMode(payload.parserMode);
  const rawTelegramIdentity = sanitizeTelegramIdentity(payload.telegramChatIdentity);
  const existingOpaqueIdentity = sanitizeText((payload as { expectedSourceIdentity?: unknown }).expectedSourceIdentity, 96);

  if (!workspaceId) {
    throw new AdminApiError(400, "telegram_source_workspace_required", "Choose one workspace before enabling a Telegram source.");
  }

  if (parserMode !== "telegram_like_mock") {
    throw new AdminApiError(400, "telegram_source_parser_required", "Choose the Telegram signal parser before enabling this source.");
  }

  if (!rawTelegramIdentity && !existingOpaqueIdentity.startsWith("tgsrc_")) {
    throw new AdminApiError(400, "telegram_source_identity_required", "Add the expected Telegram chat or channel identity.");
  }

  return {
    workspaceId,
    parserMode,
    expectedSourceIdentity: rawTelegramIdentity
      ? createTelegramSignalOpaqueIdentity(rawTelegramIdentity, "tgsrc")
      : existingOpaqueIdentity
  };
}

export async function upsertExternalSignalSourceAllowlistRecord(
  actor: VerifiedSuperAdmin,
  payload: ExternalSignalSourceAllowlistUpsertInput
): Promise<ExternalSignalSourceAllowlistMutationResponse> {
  void actor;

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const action = payload.action ?? "upsert";
  const sourceType = asSourceType(payload.sourceType);
  const telegramConfig = sourceType === "telegram_channel" && action !== "disable"
    ? assertTelegramSourceConfiguration(payload)
    : null;
  const sourceId = sanitizeText(payload.sourceId, 64);
  const sourceRef = sanitizeText(payload.sourceRef, 96);
  const safeSourceId = sourceId ||
    (telegramConfig?.expectedSourceIdentity
      ? createExternalSignalSafeRef(telegramConfig.expectedSourceIdentity, "source")
      : sourceRef
        ? createExternalSignalSafeRef(sourceRef, "source")
        : "");

  if (!safeSourceId) {
    throw new AdminApiError(400, "external_signal_source_required", "Add a source reference before updating the allowlist.");
  }

  const current = telegramConfig ? null : await findSourceDocBySafeSourceId(safeSourceId);
  const telegramDocRef = telegramConfig
    ? db.doc(`${EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID}/${deterministicSourceDocId(telegramConfig.expectedSourceIdentity)}`)
    : null;

  if (action === "disable") {
    const disableCurrent = current ?? (telegramDocRef ? await telegramDocRef.get() : null);

    if (!disableCurrent?.exists) {
      throw new AdminApiError(404, "external_signal_source_not_found", "That external signal source was not found.");
    }

    await disableCurrent.ref.set(
      {
        status: "disabled",
        updatedAt: now,
        serverUpdatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    const nextSnapshot = await disableCurrent.ref.get();

    return {
      ok: true,
      source: mapExternalSignalSource(nextSnapshot)
    };
  }

  const parserMode = telegramConfig?.parserMode ?? asParserMode(payload.parserMode);
  const allowedAssetClasses = safeAssetClassArray(payload.allowedAssetClasses);
  const docRef = telegramDocRef ?? current?.ref ?? db.doc(`${EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID}/extsrc_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`);
  const sourceCore = stripUndefined({
    sourceId: safeSourceId,
    sourceType,
    workspaceId: telegramConfig?.workspaceId ?? (sanitizeText(payload.workspaceId, 96) || undefined),
    status: asSourceStatus(payload.status),
    parserMode,
    expectedSourceIdentity: telegramConfig?.expectedSourceIdentity,
    allowedSymbols: normalizeAllowedSymbols(payload.allowedSymbols),
    allowedAssetClasses,
    riskLimits: {
      maxTakeProfitCount: Math.max(1, Math.min(EXTERNAL_SIGNAL_MAX_TAKE_PROFITS, Number(payload.riskLimits?.maxTakeProfitCount) || 3)),
      requiresStopLoss: typeof payload.riskLimits?.requiresStopLoss === "boolean" ? payload.riskLimits.requiresStopLoss : true,
      maxEntryRangePercent: Math.max(0, Math.min(20, Number(payload.riskLimits?.maxEntryRangePercent) || 2)),
      maxRiskLabel:
        payload.riskLimits?.maxRiskLabel === "low" ||
        payload.riskLimits?.maxRiskLabel === "medium" ||
        payload.riskLimits?.maxRiskLabel === "high"
          ? payload.riskLimits.maxRiskLabel
          : undefined
    },
    maskedSourceRef: safeSourceId,
    safeLabel: sanitizeText(payload.safeLabel, 96) || `${sourceType} source`,
  });
  const sourceRecord = stripUndefined({
    ...sourceCore,
    sourceRecordVersion: createSourceConfigurationVersion(sourceCore),
    createdAt: current ? undefined : now,
    updatedAt: now,
    serverCreatedAt: current ? undefined : FieldValue.serverTimestamp(),
    serverUpdatedAt: FieldValue.serverTimestamp()
  });

  if (telegramConfig) {
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(docRef);
      const existingData = existing.data() ?? {};

      if (
        existing.exists &&
        existingData.workspaceId &&
        existingData.workspaceId !== telegramConfig.workspaceId
      ) {
        throw new AdminApiError(
          409,
          "telegram_source_identity_workspace_conflict",
          "That Telegram source is already bound to another workspace."
        );
      }

      transaction.set(docRef, {
        ...sourceRecord,
        createdAt: existing.exists ? existingData.createdAt : now,
        serverCreatedAt: existing.exists ? existingData.serverCreatedAt : FieldValue.serverTimestamp()
      }, { merge: true });
    });
  } else {
    await docRef.set(sourceRecord, { merge: true });
  }

  const nextSnapshot = await docRef.get();

  return {
    ok: true,
    source: mapExternalSignalSource(nextSnapshot)
  };
}

export async function getAdminExternalSignalIngestionOverview(
  actor: VerifiedSuperAdmin
): Promise<ExternalSignalIngestionOverviewResponse> {
  void actor;

  const readiness = getExternalSignalIngestionReadiness();
  const warnings = [
    "Telegram source setup is Admin-controlled and webhook ingestion is disabled unless the server is explicitly configured.",
    "Candidates remain quarantined/reviewed until approved and published through the controlled workspace bridge. Existing Copier gates still apply."
  ];
  let latestSources: ExternalSignalSourceAllowlistRecord[] = [];
  let latestCandidates: ExternalSignalCandidateRecord[] = [];

  try {
    const { db } = getFirebaseAdminClients();
    const [sourceSnapshot, candidateSnapshot] = await Promise.all([
      db
        .collection(EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID)
        .orderBy("updatedAt", "desc")
        .limit(EXTERNAL_SIGNAL_OVERVIEW_LIMIT)
        .get(),
      db
        .collection(EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID)
        .orderBy("updatedAt", "desc")
        .limit(EXTERNAL_SIGNAL_OVERVIEW_LIMIT)
        .get()
    ]);

    latestSources = sourceSnapshot.docs.map(mapExternalSignalSource);
    latestCandidates = candidateSnapshot.docs.map(mapExternalSignalCandidate);
  } catch {
    warnings.push("External signal ingestion preview is unavailable; no external provider call was attempted.");
  }

  return {
    ok: true,
    readiness,
    summary: {
      sourceCount: latestSources.length,
      enabledSourceCount: latestSources.filter((source) => source.status === "enabled").length,
      candidateCount: latestCandidates.length,
      receivedCount: latestCandidates.filter((candidate) => candidate.status === "received").length,
      parsedCount: latestCandidates.filter((candidate) => candidate.status === "parsed").length,
      rejectedCount: latestCandidates.filter((candidate) => candidate.status === "rejected").length,
      quarantinedCount: latestCandidates.filter((candidate) => candidate.status === "quarantined").length,
      duplicateCount: latestCandidates.filter((candidate) => candidate.status === "duplicate").length,
      needsReviewCount: latestCandidates.filter((candidate) => candidate.status === "needs_review").length,
      workspacePreviewCount: latestCandidates.filter((candidate) => candidate.status === "approved_for_workspace_preview").length,
      sampledCandidateCount: latestCandidates.length,
      reviewedCount: latestCandidates.filter((candidate) => candidate.reviewStatus !== "unreviewed").length,
      riskFlaggedCount: latestCandidates.filter((candidate) => candidate.riskFlags.length > 0).length
    },
    latestSources,
    latestCandidates,
    warnings
  };
}

export async function getWorkspaceExternalSignalPreview(
  actor: VerifiedInfluencer
): Promise<WorkspaceExternalSignalPreviewResponse> {
  const warnings = [
    "External signal previews are read-only. They are not TradeHub signals, not student-visible, and not AutoCopy executable."
  ];
  let previews: WorkspaceExternalSignalPreviewRecord[] = [];

  try {
    const { db } = getFirebaseAdminClients();
    const [sourceSnapshot, candidateSnapshot] = await Promise.all([
      db
        .collection(EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID)
        .limit(EXTERNAL_SIGNAL_OVERVIEW_LIMIT * 2)
        .get(),
      db
        .collection(EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID)
        .where("status", "==", "approved_for_workspace_preview")
        .limit(EXTERNAL_SIGNAL_OVERVIEW_LIMIT * 2)
        .get()
    ]);
    const sourceLabels = new Map(
      sourceSnapshot.docs
        .map(mapExternalSignalSource)
        .map((source) => [source.maskedSourceRef, source.safeLabel] as const)
    );

    previews = candidateSnapshot.docs
      .map(mapExternalSignalCandidate)
      .map((candidate) => mapWorkspaceExternalSignalPreview(actor, candidate, sourceLabels))
      .filter((preview): preview is WorkspaceExternalSignalPreviewRecord => Boolean(preview))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, EXTERNAL_SIGNAL_WORKSPACE_PREVIEW_LIMIT);
  } catch {
    warnings.push("Workspace external signal preview is unavailable; no external provider call was attempted.");
  }

  const symbols = new Set(previews.map((preview) => preview.symbol));
  const sources = new Set(previews.map((preview) => preview.maskedSourceRef));

  return {
    ok: true,
    workspaceId: actor.workspaceId,
    summary: {
      previewCount: previews.length,
      sampledCount: previews.length,
      riskFlaggedCount: previews.filter((preview) => preview.riskFlags.length > 0).length,
      symbolCount: symbols.size,
      sourceCount: sources.size
    },
    previews,
    warnings
  };
}
