import "server-only";

import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  createExternalSignalFingerprint,
  createExternalSignalSafeRef,
  parseManualMockExternalSignalCandidate
} from "@/lib/signals/external-signal-ingestion-contract";
import type {
  ExternalSignalCandidateRecord,
  ExternalSignalRiskFlag,
  ExternalSignalSourceAllowlistRecord,
  TelegramSignalWebhookReceiptResponse
} from "@/types/external-signal-ingestion";

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";
const MAX_WEBHOOK_BYTES = 12_000;
const MAX_MESSAGE_TEXT_LENGTH = 1_200;
const MAX_UPDATE_AGE_MS = 6 * 60 * 60 * 1000;
const EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID = "external_signal_sources";
const EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID = "external_signal_candidates";
const EXTERNAL_SIGNAL_DELIVERY_MARKER_COLLECTION_ID = "external_signal_delivery_markers";
const EXTERNAL_SIGNAL_FINGERPRINT_MARKER_COLLECTION_ID = "external_signal_fingerprint_markers";
const EXTERNAL_SIGNAL_INGRESS_RATE_COLLECTION_ID = "external_signal_ingress_rate";
const TELEGRAM_PARSER_VERSION = "stage29k_telegram_deterministic_v1";
const MAX_UPDATE_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_SOURCE_UPDATES_PER_MINUTE = 30;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeSingleLine(value: unknown, maxLength = 180) {
  return asString(value).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeDateFromUnix(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false as const, safeReason: "telegram_update_invalid_timestamp" };
  }

  const milliseconds = value * 1000;

  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > 8.64e15) {
    return { ok: false as const, safeReason: "telegram_update_invalid_timestamp" };
  }

  return { ok: true as const, date: new Date(milliseconds).toISOString() };
}

function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => omitUndefinedDeep(entry)).filter((entry) => entry !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, omitUndefinedDeep(entry)])
    ) as T;
  }

  return value;
}

function readBooleanEnv(name: string, fallback = false) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function requireIdentitySecret() {
  const secret = process.env.TELEGRAM_SIGNAL_IDENTITY_SECRET?.trim();

  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new AdminApiError(503, "telegram_identity_secret_required", "Telegram signal ingestion is not configured.");
  }

  return secret || "local_stage29k_telegram_identity_secret_for_emulator_only";
}

export function createTelegramSignalOpaqueIdentity(value: string, prefix = "tgsrc") {
  const secret = requireIdentitySecret();
  const digest = crypto.createHmac("sha256", secret).update(value.trim()).digest("hex").slice(0, 24);

  return `${prefix}_${digest}`;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertTelegramWebhookRequestBoundary(request: Request) {
  if (request.method !== "POST") {
    throw new AdminApiError(405, "method_not_allowed", "Telegram signal webhook accepts POST only.");
  }

  const configuredSecret = process.env.TELEGRAM_SIGNAL_WEBHOOK_SECRET?.trim();
  const receivedSecret = request.headers.get(TELEGRAM_SECRET_HEADER)?.trim() ?? "";
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (!readBooleanEnv("TELEGRAM_SIGNAL_WEBHOOK_ENABLED", false)) {
    throw new AdminApiError(503, "telegram_webhook_disabled", "Telegram signal ingestion is disabled.");
  }

  if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 16)) {
    throw new AdminApiError(503, "telegram_webhook_secret_required", "Telegram signal ingestion is not configured.");
  }

  if (!configuredSecret || !receivedSecret || !safeEqual(receivedSecret, configuredSecret)) {
    throw new AdminApiError(401, "telegram_webhook_secret_invalid", "Telegram signal webhook could not be verified.");
  }

  if (!contentType.includes("application/json")) {
    throw new AdminApiError(415, "telegram_webhook_json_required", "Telegram signal webhook requires JSON.");
  }

  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    throw new AdminApiError(413, "telegram_webhook_body_too_large", "Telegram signal webhook payload is too large.");
  }
}

function extractTelegramMessage(update: Record<string, unknown>) {
  const updateId = typeof update.update_id === "number" && Number.isFinite(update.update_id)
    ? String(Math.trunc(update.update_id))
    : "";
  const message = asRecord(update.channel_post) ?? asRecord(update.message);
  const unsupportedEdit = Boolean(update.edited_message || update.edited_channel_post);

  if (!updateId || !message || unsupportedEdit) {
    return { ok: false as const, safeReason: unsupportedEdit ? "telegram_update_edit_quarantined" : "telegram_update_unsupported" };
  }

  if (message.forward_origin || message.forward_from || message.forward_sender_name || message.forward_from_chat) {
    return { ok: false as const, safeReason: "telegram_forwarded_update_quarantined" };
  }

  const chat = asRecord(message.chat);
  const sourceIdentityValue = chat && (typeof chat.id === "number" || typeof chat.id === "string")
    ? String(chat.id)
    : "";
  const messageId = typeof message.message_id === "number" && Number.isFinite(message.message_id)
    ? String(Math.trunc(message.message_id))
    : "";
  const text = asString(message.text || message.caption).trim();
  const dateResult = safeDateFromUnix(message.date);

  if (!sourceIdentityValue || !messageId || !text) {
    return { ok: false as const, safeReason: "telegram_update_missing_message_fields" };
  }

  if (!dateResult.ok) {
    return { ok: false as const, safeReason: dateResult.safeReason };
  }

  if (text.length > MAX_MESSAGE_TEXT_LENGTH) {
    return { ok: false as const, safeReason: "telegram_update_text_too_large" };
  }

  if (Date.now() - Date.parse(dateResult.date) > MAX_UPDATE_AGE_MS) {
    return { ok: false as const, safeReason: "telegram_update_stale" };
  }

  if (Date.parse(dateResult.date) - Date.now() > MAX_UPDATE_FUTURE_SKEW_MS) {
    return { ok: false as const, safeReason: "telegram_update_future_timestamp" };
  }

  return {
    ok: true as const,
    updateId,
    sourceIdentity: createTelegramSignalOpaqueIdentity(sourceIdentityValue, "tgsrc"),
    deliveryIdentity: createTelegramSignalOpaqueIdentity(`${sourceIdentityValue}|${messageId}|${updateId}`, "tgmsg"),
    text,
    date: dateResult.date
  };
}

function parseTelegramSignalText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
  const joined = lines.join(" ");
  const sideMatches = [...joined.matchAll(/\b(BUY|SELL)\b/gi)].map((match) => match[1].toUpperCase());
  const uniqueSides = [...new Set(sideMatches)];
  const side = uniqueSides.length === 1
    ? uniqueSides[0] === "SELL" ? "sell" as const : "buy" as const
    : undefined;
  const ignoredSymbols = new Set([
    "BUY",
    "SELL",
    "ENTRY",
    "ENT",
    "SL",
    "STOP",
    "LOSS",
    "TP",
    "TAKE",
    "PROFIT"
  ]);
  const symbolMatches = [...joined.matchAll(/\b([A-Z]{3,12})\b/gi)]
    .map((match) => sanitizeSingleLine(match[1], 24).toUpperCase())
    .filter((candidate) => !ignoredSymbols.has(candidate))
    .filter((candidate) => candidate.endsWith("USDT") || /^[A-Z]{6}$/.test(candidate));
  const uniqueSymbols = [...new Set(symbolMatches)];
  const entryMatches = [
    ...[...joined.matchAll(/\b(?:ENTRY|ENT)\s*[:@]?\s*([0-9]+(?:\.[0-9]+)?)/gi)].map((match) => match[1]),
    ...[...joined.matchAll(/\b(?:BUY|SELL)\s+[A-Z]{3,12}\s*[:@]?\s*([0-9]+(?:\.[0-9]+)?)/gi)].map((match) => match[1]),
    ...[...joined.matchAll(/\b[A-Z]{3,12}\s+(?:BUY|SELL)\s*[:@]?\s*([0-9]+(?:\.[0-9]+)?)/gi)].map((match) => match[1])
  ].filter(Boolean);
  const uniqueEntries = [...new Set(entryMatches)];
  const stopLossMatches = [...joined.matchAll(/\b(?:SL|STOP LOSS|STOP)\s*[:@]?\s*([0-9]+(?:\.[0-9]+)?)/gi)].map((match) => match[1]);
  const uniqueStopLosses = [...new Set(stopLossMatches.filter(Boolean))];
  const takeProfitMatches = [...joined.matchAll(/\b(?:TP\d*|TAKE PROFIT\s*\d*)\s*[:@]?\s*([0-9]+(?:\.[0-9]+)?)/gi)];
  const uniqueTakeProfits = [...new Set(takeProfitMatches.map((match) => match[1]).filter(Boolean))];
  const symbol = uniqueSymbols.length === 1 ? uniqueSymbols[0] : "";
  const assetClass = symbol.endsWith("USDT") ? "crypto" as const : "forex" as const;

  if (!symbol || !side || uniqueEntries.length !== 1 || uniqueStopLosses.length > 1 || sideMatches.length !== uniqueSides.length) {
    return {
      status: "quarantined" as const,
      normalizedInput: null,
      safeReason: "telegram_signal_parse_ambiguous_or_missing"
    };
  }

  return {
    status: "parsed" as const,
    normalizedInput: {
      sourceId: "telegram_webhook",
      symbol,
      assetClass,
      side,
      entryMin: uniqueEntries[0],
      stopLoss: uniqueStopLosses[0],
      takeProfits: uniqueTakeProfits.slice(0, 5),
      confidence: "unknown" as const,
      safeTextHint: joined
    },
    safeReason: "telegram_signal_parsed_for_quarantine"
  };
}

async function findTelegramSource(sourceIdentity: string): Promise<{
  id: string;
  path: string;
  sourceRecordVersion: string;
  source: ExternalSignalSourceAllowlistRecord;
} | null> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(EXTERNAL_SIGNAL_SOURCE_COLLECTION_ID)
    .where("sourceType", "==", "telegram_channel")
    .where("expectedSourceIdentity", "==", sourceIdentity)
    .limit(2)
    .get();

  if (snapshot.size !== 1) {
    return null;
  }

  const data = snapshot.docs[0].data();

  return {
    id: snapshot.docs[0].id,
    path: snapshot.docs[0].ref.path,
    sourceRecordVersion: sanitizeSingleLine(data.sourceRecordVersion, 80),
    source: {
    sourceId: sanitizeSingleLine(data.sourceId, 64) || createExternalSignalSafeRef(snapshot.docs[0].id, "source"),
    sourceType: "telegram_channel",
    workspaceId: sanitizeSingleLine(data.workspaceId, 96) || undefined,
    status: data.status === "enabled" ? "enabled" : "disabled",
    parserMode: data.parserMode === "telegram_like_mock" ? "telegram_like_mock" : "disabled",
    allowedSymbols: Array.isArray(data.allowedSymbols) ? data.allowedSymbols.map((entry) => sanitizeSingleLine(entry, 24).toUpperCase()).filter(Boolean).slice(0, 25) : [],
    allowedAssetClasses: Array.isArray(data.allowedAssetClasses) ? data.allowedAssetClasses.filter((entry) => entry === "crypto" || entry === "forex").slice(0, 4) : [],
    riskLimits: {
      maxTakeProfitCount: Math.max(1, Math.min(5, Number(data.riskLimits?.maxTakeProfitCount) || 3)),
      requiresStopLoss: data.riskLimits?.requiresStopLoss !== false,
      maxEntryRangePercent: Math.max(0, Math.min(20, Number(data.riskLimits?.maxEntryRangePercent) || 2))
    },
    maskedSourceRef: sanitizeSingleLine(data.maskedSourceRef, 64) || createExternalSignalSafeRef(snapshot.docs[0].id, "source"),
    safeLabel: sanitizeSingleLine(data.safeLabel, 80) || "Telegram source",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date(0).toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date(0).toISOString()
    }
  };
}

function deterministicDocSafeRef(value: string, prefix: string) {
  return `${prefix}_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function sourceAllowsCandidate(source: ExternalSignalSourceAllowlistRecord, parsed: NonNullable<ReturnType<typeof parseTelegramSignalText>["normalizedInput"]>) {
  const riskFlags: ExternalSignalRiskFlag[] = [];
  const parseWarnings: string[] = [];

  if (source.status !== "enabled" || source.parserMode !== "telegram_like_mock" || !source.workspaceId) {
    parseWarnings.push("telegram_source_disabled_or_unbound");
  }

  if (source.allowedSymbols.length > 0 && !source.allowedSymbols.includes(parsed.symbol.toUpperCase())) {
    riskFlags.push("unsupported_symbol");
  }

  if (source.allowedAssetClasses.length > 0 && !source.allowedAssetClasses.includes(parsed.assetClass)) {
    riskFlags.push("unsupported_asset_class");
  }

  if (source.riskLimits.requiresStopLoss && !parsed.stopLoss) {
    riskFlags.push("missing_stop_loss");
  }

  if ((parsed.takeProfits ?? []).length === 0) {
    riskFlags.push("missing_take_profit");
  }

  if ((parsed.takeProfits ?? []).length > source.riskLimits.maxTakeProfitCount) {
    riskFlags.push("too_many_take_profits");
  }

  return { riskFlags, parseWarnings };
}

export async function receiveTelegramSignalWebhookUpdate(update: unknown): Promise<TelegramSignalWebhookReceiptResponse> {
  const record = asRecord(update);

  if (!record) {
    throw new AdminApiError(400, "telegram_update_invalid", "Telegram signal update was not accepted.");
  }

  if (!readBooleanEnv("EXTERNAL_SIGNAL_SOURCE_ALLOWLIST_ENABLED", false)) {
    throw new AdminApiError(503, "telegram_sources_disabled", "Telegram signal sources are disabled.");
  }

  const extracted = extractTelegramMessage(record);
  const now = new Date().toISOString();

  if (!extracted.ok) {
    return {
      ok: true,
      accepted: false,
      status: extracted.safeReason.includes("stale") || extracted.safeReason.includes("future") ? "rejected" : "quarantined",
      safeReason: extracted.safeReason
    };
  }

  const { db } = getFirebaseAdminClients();
  const sourceResult = await findTelegramSource(extracted.sourceIdentity);

  if (!sourceResult) {
    return {
      ok: true,
      accepted: false,
      status: "quarantined",
      safeReason: "telegram_source_unknown_or_ambiguous"
    };
  }

  const source = sourceResult.source;

  const parsedText = parseTelegramSignalText(extracted.text);
  const parsed = parsedText.normalizedInput
    ? parseManualMockExternalSignalCandidate({
        ...parsedText.normalizedInput,
        sourceId: source.sourceId,
        workspaceId: source.workspaceId,
        sourceRef: extracted.deliveryIdentity
      })
    : null;
  const sourceWarnings = parsedText.normalizedInput
    ? sourceAllowsCandidate(source, parsedText.normalizedInput)
    : { riskFlags: [], parseWarnings: [] };
  const status = !parsed || parsedText.status !== "parsed"
    ? "quarantined" as const
    : sourceWarnings.riskFlags.length > 0 || sourceWarnings.parseWarnings.length > 0 || parsed.riskFlags.length > 0
      ? "needs_review" as const
      : "parsed" as const;
  const fingerprint = createExternalSignalFingerprint({
    sourceRef: extracted.sourceIdentity,
    symbol: parsedText.normalizedInput?.symbol ?? "UNKNOWN",
    side: parsedText.normalizedInput?.side ?? "unknown",
    entryMin: parsedText.normalizedInput?.entryMin ?? "0",
    stopLoss: parsedText.normalizedInput?.stopLoss,
    takeProfits: parsedText.normalizedInput?.takeProfits
  });
  const candidateId = deterministicDocSafeRef(fingerprint, "extsig");
  const deliveryMarkerRef = db.doc(`${EXTERNAL_SIGNAL_DELIVERY_MARKER_COLLECTION_ID}/${extracted.deliveryIdentity}`);
  const fingerprintMarkerRef = db.doc(`${EXTERNAL_SIGNAL_FINGERPRINT_MARKER_COLLECTION_ID}/${fingerprint}`);
  const candidateRef = db.doc(`${EXTERNAL_SIGNAL_CANDIDATE_COLLECTION_ID}/${candidateId}`);
  const rateBucket = new Date(now).toISOString().slice(0, 16).replace(/[^0-9T]/g, "");
  const rateRef = db.doc(`${EXTERNAL_SIGNAL_INGRESS_RATE_COLLECTION_ID}/${source.sourceId}_${rateBucket}`);
  const riskFlags = [...new Set([...(parsed?.riskFlags ?? []), ...sourceWarnings.riskFlags])].slice(0, 12);
  const parseWarnings = [...new Set([...(parsed?.parseWarnings ?? []), ...sourceWarnings.parseWarnings, ...sourceWarnings.riskFlags])].slice(0, 12);
  const candidateStatus = status;
  const candidate: ExternalSignalCandidateRecord = omitUndefinedDeep({
    candidateId,
    workspaceId: source.workspaceId,
    status: candidateStatus,
    sourceType: "telegram_channel",
    parserMode: "telegram_like_mock",
    parserVersion: TELEGRAM_PARSER_VERSION,
    maskedSourceRef: source.maskedSourceRef,
    sourceSafeRef: source.sourceId,
    sourceRecordId: sourceResult.id,
    sourceRecordVersion: sourceResult.sourceRecordVersion,
    deliverySafeRef: extracted.deliveryIdentity,
    immutableModerationProofRef: createTelegramSignalOpaqueIdentity(`${candidateId}|${source.sourceId}|${now}`, "tgproof"),
    previewSafeRef: createExternalSignalSafeRef(candidateId, "preview"),
    fingerprint,
    normalized: parsed?.normalized,
    parseWarnings,
    riskFlags,
    safeReason: parsed?.safeReason ?? parsedText.safeReason,
    reviewStatus: candidateStatus === "parsed" ? "unreviewed" : "needs_review",
    receivedAt: extracted.date,
    createdAt: now,
    updatedAt: now
  });

  const transactionResult = await db.runTransaction(async (transaction) => {
    const [deliveryMarker, fingerprintMarker, rateMarker] = await Promise.all([
      transaction.get(deliveryMarkerRef),
      transaction.get(fingerprintMarkerRef),
      transaction.get(rateRef)
    ]);

    if (deliveryMarker.exists) {
      return {
        status: "duplicate" as const,
        safeReason: "telegram_delivery_duplicate_noop",
        candidateRef: sanitizeSingleLine(deliveryMarker.data()?.candidateRef, 80)
      };
    }

    if (fingerprintMarker.exists) {
      transaction.set(deliveryMarkerRef, {
        deliverySafeRef: extracted.deliveryIdentity,
        candidateRef: sanitizeSingleLine(fingerprintMarker.data()?.candidateRef, 80),
        status: "duplicate",
        sourceSafeRef: source.sourceId,
        createdAt: now,
        serverCreatedAt: FieldValue.serverTimestamp()
      });

      return {
        status: "duplicate" as const,
        safeReason: "external_signal_duplicate",
        candidateRef: sanitizeSingleLine(fingerprintMarker.data()?.candidateRef, 80)
      };
    }

    const currentRateCount = Number(rateMarker.data()?.count ?? 0);

    if (Number.isFinite(currentRateCount) && currentRateCount >= MAX_SOURCE_UPDATES_PER_MINUTE) {
      transaction.set(deliveryMarkerRef, {
        deliverySafeRef: extracted.deliveryIdentity,
        status: "rate_limited",
        sourceSafeRef: source.sourceId,
        createdAt: now,
        serverCreatedAt: FieldValue.serverTimestamp()
      });

      return {
        status: "rejected" as const,
        safeReason: "telegram_source_rate_limited"
      };
    }

    transaction.set(rateRef, {
      sourceSafeRef: source.sourceId,
      bucket: rateBucket,
      count: FieldValue.increment(1),
      updatedAt: now,
      serverUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(candidateRef, {
      ...candidate,
      rawPayloadStored: false,
      serverCreatedAt: FieldValue.serverTimestamp(),
      serverUpdatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(deliveryMarkerRef, {
      deliverySafeRef: extracted.deliveryIdentity,
      candidateRef: createExternalSignalSafeRef(candidateId, "candidate"),
      status: "stored",
      sourceSafeRef: source.sourceId,
      createdAt: now,
      serverCreatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(fingerprintMarkerRef, {
      fingerprint,
      candidateRef: createExternalSignalSafeRef(candidateId, "candidate"),
      status: "stored",
      sourceSafeRef: source.sourceId,
      createdAt: now,
      serverCreatedAt: FieldValue.serverTimestamp()
    });

    return {
      status: candidateStatus,
      safeReason: candidate.safeReason,
      candidateRef: createExternalSignalSafeRef(candidateId, "candidate")
    };
  });

  return {
    ok: true,
    accepted: transactionResult.status !== "rejected",
    status: transactionResult.status,
    safeReason: transactionResult.safeReason,
    candidateRef: transactionResult.candidateRef
  };
}

export const telegramSignalWebhookLimits = {
  header: TELEGRAM_SECRET_HEADER,
  maxWebhookBytes: MAX_WEBHOOK_BYTES,
  maxMessageTextLength: MAX_MESSAGE_TEXT_LENGTH,
  maxUpdateAgeMs: MAX_UPDATE_AGE_MS,
  parserVersion: TELEGRAM_PARSER_VERSION,
  officialWebhookSecretHeader: "X-Telegram-Bot-Api-Secret-Token"
} as const;
