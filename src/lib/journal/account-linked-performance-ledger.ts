import "server-only";

import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { normalizeIsoDate, recordFromSnapshot } from "@/lib/crypto-execution/crypto-execution-mappers";
import { getPracticeInstrumentSpec, practiceNotionalForInstrument } from "@/lib/practice/practice-instrument-specs";
import type {
  AccountLinkedLedgerAssetClass,
  AccountLinkedLedgerExecutionMode,
  AccountLinkedLedgerSource,
  AccountLinkedLedgerStatus,
  AccountLinkedReadinessSummary,
  AccountLinkedTradeLedgerRecord,
  AccountLinkedTradeLedgerSummary,
  AdminAccountLinkedLedgerDiagnostics,
  CryptoOrderAttemptSummary,
  ForexDemoOrderAttemptSummary,
  ForexLiveCanaryOrderAttemptSummary,
  ForexPaperAttemptSummary,
  LiveProductionOrderAttemptSummary,
  LiveSandboxOrderAttemptSummary,
  StudentAccountLinkedPerformancePreview,
  WorkspaceAccountLinkedPerformanceSummary
} from "@/types/crypto-execution";
import type { PracticeAnnotationSummary, PracticeChallengeSummary, PracticeInstructorFeedbackSummary, PracticeInstrumentSpecSummary, PracticeOrderCloseEvent, PracticeOrderSummary, PracticeSessionReflection, PracticeSessionSummary } from "@/types/practice";
import type { StudentJournalSummary } from "@/types/student-app";

const STUDENT_LEDGER_VISIBLE_LIMIT = 6;
const WORKSPACE_LEDGER_VISIBLE_LIMIT = 8;
const WORKSPACE_LEDGER_STUDENT_SAMPLE_LIMIT = 50;

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeSide(value: unknown): "buy" | "sell" | "unknown" {
  return value === "buy" || value === "sell" ? value : "unknown";
}

function safeStatus(value: unknown): AccountLinkedLedgerStatus {
  return value === "open" ||
    value === "closed" ||
    value === "filled" ||
    value === "partial" ||
    value === "failed" ||
    value === "blocked" ||
    value === "cancelled" ||
    value === "dry_run"
    ? value
    : "zero_safe";
}

function safeAuthoritativePnl(value: unknown): AccountLinkedTradeLedgerRecord["authoritativePnl"] | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const kind = record.kind === "floating" || record.kind === "realized" ? record.kind : undefined;
  const source = record.source === "provider_valuation" || record.source === "provider_closure" ? record.source : undefined;
  const currency = safeString(record.currency).replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 8);
  const amount = safeNumber(record.value);
  const valuedAt = safeString(record.valuedAt);

  if (!kind || !source || record.authoritative !== true || amount === undefined || !currency) {
    return undefined;
  }

  return stripUndefined({
    kind,
    value: amount,
    currency,
    authoritative: true,
    source,
    valuedAt: valuedAt && Number.isFinite(Date.parse(valuedAt)) ? normalizeIsoDate(valuedAt) : undefined
  });
}

function mapLedgerPracticeInstrument(value: unknown, symbol: string, assetClass: AccountLinkedLedgerAssetClass) {
  if (assetClass !== "crypto" && assetClass !== "forex_cfd") {
    return undefined;
  }

  const fallback = getPracticeInstrumentSpec(assetClass, symbol);

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const canonicalSymbol = safeString(record.canonicalSymbol).replace(/[^A-Z0-9]/gi, "").toUpperCase();

  if (!canonicalSymbol || canonicalSymbol !== symbol || record.assetClass !== assetClass) {
    return fallback;
  }

  const numberOr = (entry: unknown, defaultValue: number) => safeNumber(entry) ?? defaultValue;
  const quantityPrecision = Math.max(0, Math.min(Math.floor(numberOr(record.quantityPrecision, fallback?.quantityPrecision ?? 8)), 8));
  const precisionStep = 10 ** -quantityPrecision;
  const category = record.category === "forex_major" || record.category === "forex_cross" ||
    record.category === "metals_cfd" || record.category === "indices_cfd" ||
    record.category === "energy_cfd" || record.category === "crypto_spot"
    ? record.category
    : fallback?.category ?? "crypto_spot";

  return {
    canonicalSymbol,
    assetClass,
    displayName: safeString(record.displayName).slice(0, 80) || fallback?.displayName || canonicalSymbol,
    category,
    pricePrecision: Math.max(0, Math.min(Math.floor(numberOr(record.pricePrecision, fallback?.pricePrecision ?? 2)), 8)),
    quantityPrecision,
    quantityStep: Math.max(precisionStep, Math.min(numberOr(record.quantityStep, fallback?.quantityStep ?? precisionStep), 1_000_000_000)),
    quantityLabel: safeString(record.quantityLabel).slice(0, 24) || fallback?.quantityLabel || "Qty",
    tickSize: Math.max(0.00000001, numberOr(record.tickSize, fallback?.tickSize ?? fallback?.pipSize ?? 0.01)),
    pipSize: Math.max(0.00000001, numberOr(record.pipSize, fallback?.pipSize ?? 0.01)),
    pipLabel: safeString(record.pipLabel).slice(0, 16) || fallback?.pipLabel || "tick",
    contractMultiplier: Math.max(0.00000001, numberOr(record.contractMultiplier, fallback?.contractMultiplier ?? 1)),
    minSimulatedSize: Math.max(0, numberOr(record.minSimulatedSize, fallback?.minSimulatedSize ?? precisionStep)),
    maxSimulatedSize: Math.max(0, numberOr(record.maxSimulatedSize, fallback?.maxSimulatedSize ?? 1_000_000)),
    minSimulatedNotional: Math.max(0, numberOr(record.minSimulatedNotional, fallback?.minSimulatedNotional ?? 0)),
    maxSimulatedNotional: Math.max(0, numberOr(record.maxSimulatedNotional, fallback?.maxSimulatedNotional ?? 10_000_000)),
    safeMessage: safeString(record.safeMessage).slice(0, 180) || fallback?.safeMessage || "Simulated practice instrument metadata."
  } satisfies PracticeInstrumentSpecSummary;
}

function maskedRef(value: unknown, prefix = "ref") {
  const clean = safeString(value).replace(/[^a-zA-Z0-9._:-]/g, "");

  if (!clean) {
    return `${prefix}:not_recorded`;
  }

  return clean.length <= 8 ? `${prefix}:...${clean.slice(-4)}` : `${prefix}:${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function latestIso(values: string[]) {
  return values
    .filter((value) => value && Number.isFinite(Date.parse(value)))
    .sort((left, right) => right.localeCompare(left))[0];
}

function practicePlaybookLabel(order: PracticeOrderSummary) {
  const playbookName = safeString(order.playbookName).slice(0, 40);

  return playbookName ? ` · ${playbookName}` : "";
}

function mapPracticeReflection(value: unknown): PracticeSessionReflection | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const confidenceScore = safeNumber(record.confidenceScore);
  const reflection: PracticeSessionReflection = stripUndefined({
    whatWentWell: safeString(record.whatWentWell).slice(0, 700) || undefined,
    whatWentWrong: safeString(record.whatWentWrong).slice(0, 700) || undefined,
    improveNextTime: safeString(record.improveNextTime).slice(0, 700) || undefined,
    confidenceScore: confidenceScore === undefined ? undefined : Math.max(1, Math.min(Math.floor(confidenceScore), 5)),
    updatedAt: record.updatedAt ? normalizeIsoDate(record.updatedAt) : undefined
  });

  return Object.keys(reflection).length > 0 ? reflection : undefined;
}

function mapPracticeChallengeResult(value: unknown): PracticeChallengeSummary | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (record.enabled !== true) {
    return undefined;
  }

  const status = record.status === "passed" || record.status === "failed" || record.status === "active" || record.status === "not_started"
    ? record.status
    : "not_started";

  return stripUndefined({
    enabled: true,
    status,
    challengeName: safeString(record.challengeName).replace(/\s+/g, " ").slice(0, 80) || "Practice challenge",
    startingBalance: safeNumber(record.startingBalance) ?? 0,
    currentEquity: safeNumber(record.currentEquity) ?? 0,
    netPnl: safeNumber(record.netPnl) ?? 0,
    profitTargetAmount: safeNumber(record.profitTargetAmount) ?? 0,
    profitTargetProgress: safeNumber(record.profitTargetProgress) ?? 0,
    maxDailyLossAmount: safeNumber(record.maxDailyLossAmount) ?? 0,
    dailyLossUsage: safeNumber(record.dailyLossUsage) ?? 0,
    maxTotalDrawdownAmount: safeNumber(record.maxTotalDrawdownAmount) ?? 0,
    drawdownUsage: safeNumber(record.drawdownUsage) ?? 0,
    openTrades: safeNumber(record.openTrades) ?? 0,
    maxOpenSimulatedTrades: safeNumber(record.maxOpenSimulatedTrades) ?? 0,
    tradesUsed: safeNumber(record.tradesUsed) ?? 0,
    maxTradesPerSession: safeNumber(record.maxTradesPerSession) ?? 0,
    tradesToday: safeNumber(record.tradesToday) ?? 0,
    maxTradesPerDay: safeNumber(record.maxTradesPerDay),
    tradingDays: safeNumber(record.tradingDays) ?? 0,
    minimumTradingDays: safeNumber(record.minimumTradingDays),
    breachCodes: Array.isArray(record.breachCodes) ? record.breachCodes.map(safeString).filter(Boolean).slice(0, 10) : [],
    breachMessages: Array.isArray(record.breachMessages) ? record.breachMessages.map((entry) => safeString(entry).replace(/\s+/g, " ").slice(0, 180)).filter(Boolean).slice(0, 10) : [],
    safeMessage: safeString(record.safeMessage).replace(/\s+/g, " ").slice(0, 180) || "Practice challenge result is a simulated summary.",
    evaluatedAt: record.evaluatedAt ? normalizeIsoDate(record.evaluatedAt) : new Date().toISOString()
  });
}

function mapPracticeInstructorFeedback(value: unknown): PracticeInstructorFeedbackSummary | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const rubric = typeof record.rubric === "object" && record.rubric !== null && !Array.isArray(record.rubric)
    ? record.rubric as Record<string, unknown>
    : {};
  const score = (entry: unknown) => {
    const value = safeNumber(entry) ?? 0;

    return Math.max(1, Math.min(Math.round(value), 5));
  };

  return stripUndefined({
    feedbackId: safeString(record.feedbackId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180) || "practice_feedback",
    assignmentId: safeString(record.assignmentId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180),
    feedbackTargetRef: safeString(record.feedbackTargetRef).slice(0, 80),
    maskedStudentId: safeString(record.maskedStudentId).slice(0, 80),
    maskedSessionRef: safeString(record.maskedSessionRef).slice(0, 80),
    reviewerDisplayLabel: safeString(record.reviewerDisplayLabel).replace(/\s+/g, " ").slice(0, 80) || "Workspace instructor",
    status: record.status === "reviewed" ? "reviewed" : "not_reviewed",
    publicationStatus: record.publicationStatus === "published" ? "published" : "draft",
    rubric: {
      setupQuality: score(rubric.setupQuality),
      riskManagement: score(rubric.riskManagement),
      executionDiscipline: score(rubric.executionDiscipline),
      reviewQuality: score(rubric.reviewQuality),
      overallScore: score(rubric.overallScore)
    },
    feedbackNote: safeString(record.feedbackNote).replace(/\s+/g, " ").slice(0, 900),
    recommendedNextDrill: safeString(record.recommendedNextDrill).replace(/\s+/g, " ").slice(0, 160) || undefined,
    reviewedAt: record.reviewedAt ? normalizeIsoDate(record.reviewedAt) : undefined,
    publishedAt: record.publishedAt ? normalizeIsoDate(record.publishedAt) : undefined,
    createdAt: record.createdAt ? normalizeIsoDate(record.createdAt) : new Date().toISOString(),
    updatedAt: record.updatedAt ? normalizeIsoDate(record.updatedAt) : new Date().toISOString(),
    safeMessage: safeString(record.safeMessage).replace(/\s+/g, " ").slice(0, 180) || "Instructor feedback is a bounded practice assignment rubric."
  });
}

function mapPracticeMainLesson(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  annotationId: string;
}): PracticeAnnotationSummary {
  const kind = record.kind === "entry_note" ||
    record.kind === "mistake_note" ||
    record.kind === "structure_note" ||
    record.kind === "support_resistance_zone" ||
    record.kind === "chart_marker_note" ||
    record.kind === "horizontal_line" ||
    record.kind === "vertical_marker" ||
    record.kind === "zone" ||
    record.kind === "text_note" ||
    record.kind === "measurement_placeholder"
    ? record.kind
    : "chart_marker_note";
  const annotationId = safeString(record.annotationId) || ids.annotationId;

  return {
    annotationId,
    drawingId: safeString(record.drawingId) || annotationId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    sessionId: safeString(record.sessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180),
    orderId: safeString(record.orderId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180) || undefined,
    eventId: safeString(record.eventId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180) || undefined,
    candleIndex: safeNumber(record.candleIndex),
    secondCandleIndex: safeNumber(record.secondCandleIndex),
    priceLevel: safeNumber(record.priceLevel),
    secondPriceLevel: safeNumber(record.secondPriceLevel),
    kind,
    label: safeString(record.label).replace(/\s+/g, " ").slice(0, 120) || undefined,
    text: safeString(record.text).replace(/\s+/g, " ").slice(0, 700) || "Practice main lesson",
    colorToken: record.colorToken === "green" || record.colorToken === "amber" || record.colorToken === "red" || record.colorToken === "blue" || record.colorToken === "neutral" ? record.colorToken : "accent",
    isMainLesson: record.isMainLesson === true,
    createdAt: record.createdAt ? normalizeIsoDate(record.createdAt) : new Date().toISOString(),
    updatedAt: record.updatedAt ? normalizeIsoDate(record.updatedAt) : new Date().toISOString()
  };
}

function increment<T extends string>(counts: Partial<Record<T, number>>, key: T) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function mapLedgerRecord(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  ledgerEntryId: string;
}): AccountLinkedTradeLedgerRecord {
  const source: AccountLinkedLedgerSource =
    record.source === "manual_journal" ||
    record.source === "crypto_autocopy" ||
    record.source === "forex_autocopy" ||
    record.source === "practice_backtest" ||
    record.source === "connected_provider"
      ? record.source
      : "manual_journal";
  const assetClass: AccountLinkedLedgerAssetClass =
    record.assetClass === "crypto" || record.assetClass === "forex_cfd"
      ? record.assetClass
      : "forex";
  const executionMode: AccountLinkedLedgerExecutionMode =
    record.executionMode === "manual" ||
    record.executionMode === "paper" ||
    record.executionMode === "testnet" ||
    record.executionMode === "demo" ||
    record.executionMode === "live_canary" ||
    record.executionMode === "production_gated" ||
    record.executionMode === "practice" ||
    record.executionMode === "provider_history"
      ? record.executionMode
      : "manual";

  return {
    ledgerEntryId: safeString(record.ledgerEntryId) || ids.ledgerEntryId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    source,
    assetClass,
    executionMode,
    sourceRecordId: maskedRef(record.sourceRecordId, "source"),
    symbol: safeString(record.symbol).slice(0, 24) || "UNKNOWN",
    side: safeSide(record.side),
    openedAt: record.openedAt ? normalizeIsoDate(record.openedAt) : undefined,
    closedAt: record.closedAt ? normalizeIsoDate(record.closedAt) : undefined,
    status: safeStatus(record.status),
    notional: safeNumber(record.notional),
    volume: safeNumber(record.volume),
    authoritativePnl: safeAuthoritativePnl(record.authoritativePnl),
    pnl: safeNumber(record.pnl),
    rMultiple: safeNumber(record.rMultiple),
    riskAmount: safeNumber(record.riskAmount),
    practiceInstrument: mapLedgerPracticeInstrument(record.practiceInstrument, safeString(record.symbol).slice(0, 24).toUpperCase(), assetClass),
    safeBrokerOrExchangeLabel: safeString(record.safeBrokerOrExchangeLabel).slice(0, 80) || undefined,
    maskedConnectionRef: maskedRef(record.maskedConnectionRef ?? record.connectionId, "acct"),
    visibility:
      record.visibility === "workspace_summary" || record.visibility === "support_only"
        ? record.visibility
        : "private",
    sanitizedFailureCode: safeString(record.sanitizedFailureCode).slice(0, 80) || undefined,
    sanitizedFailureReason: safeString(record.sanitizedFailureReason).slice(0, 180) || undefined,
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

function baseMappedLedgerEntry(input: {
  workspaceId: string;
  studentId: string;
  ledgerEntryId: string;
  source: AccountLinkedLedgerSource;
  assetClass: AccountLinkedLedgerAssetClass;
  executionMode: AccountLinkedLedgerExecutionMode;
  sourceRecordId: string;
  providerExecutionIdentity?: string;
  providerExecutionIdentities?: string[];
  tradeHubSignalId?: string;
  providerStatus?: string;
  journalLifecycle?: "open" | "partial" | "closed" | "execution_only";
  tradeOrigin?: "copied" | "provider_manual";
  providerConfirmed?: boolean;
  confirmationState?: "provider_confirmed" | "unconfirmed";
  providerClosureConfirmed?: boolean;
  performanceEligible?: boolean;
  ineligibilityReason?: string;
  symbol?: string;
  side?: string;
  status?: string;
  notional?: number;
  volume?: number;
  authoritativePnl?: AccountLinkedTradeLedgerRecord["authoritativePnl"];
  pnl?: number;
  rMultiple?: number;
  riskAmount?: number;
  practiceInstrument?: PracticeInstrumentSpecSummary;
  safeBrokerOrExchangeLabel?: string;
  maskedConnectionRef?: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  openedAt?: string;
  closedAt?: string;
  updatedAt?: string;
}): AccountLinkedTradeLedgerRecord {
  const now = new Date().toISOString();

  return stripUndefined({
    ledgerEntryId: input.ledgerEntryId,
    workspaceId: input.workspaceId,
    studentId: input.studentId,
    source: input.source,
    assetClass: input.assetClass,
    executionMode: input.executionMode,
    sourceRecordId: maskedRef(input.sourceRecordId, "source"),
    providerExecutionIdentity: safeString(input.providerExecutionIdentity).slice(0, 80) || undefined,
    providerExecutionIdentities: Array.isArray(input.providerExecutionIdentities)
      ? input.providerExecutionIdentities.map((entry) => safeString(entry).slice(0, 80)).filter(Boolean).slice(0, 8)
      : undefined,
    tradeHubSignalId: safeString(input.tradeHubSignalId).slice(0, 120) || undefined,
    providerStatus: safeString(input.providerStatus).slice(0, 32) || undefined,
    journalLifecycle: input.journalLifecycle,
    tradeOrigin: input.tradeOrigin,
    providerConfirmed: input.providerConfirmed,
    confirmationState: input.confirmationState,
    providerClosureConfirmed: input.providerClosureConfirmed,
    performanceEligible: input.performanceEligible,
    ineligibilityReason: safeString(input.ineligibilityReason).slice(0, 80) || undefined,
    symbol: safeString(input.symbol).slice(0, 24) || "UNKNOWN",
    side: safeSide(input.side),
    openedAt: input.openedAt ? normalizeIsoDate(input.openedAt) : undefined,
    closedAt: input.closedAt ? normalizeIsoDate(input.closedAt) : undefined,
    status: safeStatus(input.status),
    notional: input.notional,
    volume: input.volume,
    authoritativePnl: safeAuthoritativePnl(input.authoritativePnl),
    pnl: input.pnl,
    rMultiple: input.rMultiple,
    riskAmount: input.riskAmount,
    practiceInstrument: input.practiceInstrument,
    safeBrokerOrExchangeLabel: input.safeBrokerOrExchangeLabel,
    maskedConnectionRef: maskedRef(input.maskedConnectionRef, "acct"),
    visibility: "private",
    sanitizedFailureCode: input.sanitizedFailureCode,
    sanitizedFailureReason: input.sanitizedFailureReason,
    createdAt: now,
    updatedAt: input.updatedAt ? normalizeIsoDate(input.updatedAt) : now
  });
}

export function mapCryptoPaperAttemptToLedgerEntry(
  attempt: CryptoOrderAttemptSummary & { workspaceId?: string }
): AccountLinkedTradeLedgerRecord {
  return baseMappedLedgerEntry({
    workspaceId: safeString(attempt.workspaceId) || "unknown_workspace",
    studentId: attempt.studentId,
    ledgerEntryId: `crypto_paper_${attempt.orderAttemptId}`,
    source: "crypto_autocopy",
    assetClass: "crypto",
    executionMode: "paper",
    sourceRecordId: attempt.orderAttemptId,
    tradeHubSignalId: attempt.signalId,
    symbol: attempt.symbol,
    side: attempt.side,
    status: attempt.status,
    safeBrokerOrExchangeLabel: "Crypto Paper AutoCopy",
    maskedConnectionRef: attempt.connectionId,
    sanitizedFailureCode: attempt.sanitizedFailureCode,
    sanitizedFailureReason: attempt.sanitizedFailureReason,
    updatedAt: attempt.updatedAt
  });
}

export function mapCryptoTestnetAttemptToLedgerEntry(
  attempt: LiveSandboxOrderAttemptSummary & { workspaceId?: string; connectionId?: string }
): AccountLinkedTradeLedgerRecord {
  return baseMappedLedgerEntry({
    workspaceId: safeString(attempt.workspaceId) || "unknown_workspace",
    studentId: attempt.studentId,
    ledgerEntryId: `crypto_testnet_${attempt.orderAttemptId}`,
    source: "crypto_autocopy",
    assetClass: "crypto",
    executionMode: "testnet",
    sourceRecordId: attempt.orderAttemptId,
    tradeHubSignalId: attempt.signalId,
    symbol: attempt.symbol,
    side: attempt.side,
    status: attempt.status,
    safeBrokerOrExchangeLabel: "Crypto Testnet AutoCopy",
    maskedConnectionRef: attempt.connectionId,
    updatedAt: attempt.updatedAt
  });
}

export function mapCryptoProductionAttemptToLedgerEntry(
  attempt: LiveProductionOrderAttemptSummary & {
    workspaceId?: string;
    connectionId?: string;
    providerExecutionIdentity?: string;
    authoritativePnl?: AccountLinkedTradeLedgerRecord["authoritativePnl"];
  }
): AccountLinkedTradeLedgerRecord {
  const providerConfirmed = attempt.status === "filled_live" || attempt.status === "partially_filled_live";
  const journalLifecycle = attempt.status === "partially_filled_live" ? "partial" : "open";
  return baseMappedLedgerEntry({
    workspaceId: safeString(attempt.workspaceId) || "unknown_workspace",
    studentId: attempt.studentId,
    ledgerEntryId: `crypto_production_${attempt.orderAttemptId}`,
    source: "crypto_autocopy",
    assetClass: "crypto",
    executionMode: "production_gated",
    sourceRecordId: attempt.orderAttemptId,
    providerExecutionIdentity: safeString(attempt.providerExecutionIdentity) || undefined,
    providerExecutionIdentities: safeString(attempt.providerExecutionIdentity) ? [safeString(attempt.providerExecutionIdentity)] : undefined,
    tradeHubSignalId: attempt.signalId,
    providerStatus: providerConfirmed ? "filled" : attempt.status,
    journalLifecycle: providerConfirmed ? journalLifecycle : undefined,
    tradeOrigin: "copied",
    providerConfirmed: providerConfirmed || undefined,
    confirmationState: providerConfirmed ? "provider_confirmed" : undefined,
    providerClosureConfirmed: false,
    performanceEligible: false,
    ineligibilityReason: providerConfirmed ? "open_position" : undefined,
    symbol: attempt.symbol,
    side: attempt.side,
    status: providerConfirmed ? "filled" : attempt.status,
    authoritativePnl: attempt.authoritativePnl,
    safeBrokerOrExchangeLabel: "Crypto Production-gated AutoCopy",
    maskedConnectionRef: attempt.connectionId,
    sanitizedFailureCode: attempt.sanitizedFailureCode,
    sanitizedFailureReason: attempt.sanitizedFailureReason,
    updatedAt: attempt.updatedAt
  });
}

export function mapForexPaperAttemptToLedgerEntry(
  attempt: ForexPaperAttemptSummary & { workspaceId?: string }
): AccountLinkedTradeLedgerRecord {
  return baseMappedLedgerEntry({
    workspaceId: safeString(attempt.workspaceId) || "unknown_workspace",
    studentId: attempt.studentId,
    ledgerEntryId: `forex_paper_${attempt.attemptId}`,
    source: "forex_autocopy",
    assetClass: "forex",
    executionMode: "paper",
    sourceRecordId: attempt.attemptId,
    tradeHubSignalId: attempt.signalId,
    symbol: attempt.pair,
    side: attempt.side,
    status: attempt.status,
    notional: attempt.simulatedNotional,
    safeBrokerOrExchangeLabel: "Forex Paper AutoCopy",
    updatedAt: attempt.updatedAt
  });
}

export function mapForexDemoAttemptToLedgerEntry(
  attempt: ForexDemoOrderAttemptSummary & { workspaceId?: string; connectionId?: string }
): AccountLinkedTradeLedgerRecord {
  return baseMappedLedgerEntry({
    workspaceId: safeString(attempt.workspaceId) || "unknown_workspace",
    studentId: attempt.studentId,
    ledgerEntryId: `forex_demo_${attempt.attemptId}`,
    source: "forex_autocopy",
    assetClass: attempt.providerSymbol?.includes("XAU") || attempt.providerSymbol?.includes("BTC") ? "forex_cfd" : "forex",
    executionMode: "demo",
    sourceRecordId: attempt.attemptId,
    tradeHubSignalId: attempt.signalId,
    symbol: attempt.pair,
    side: attempt.side,
    status: attempt.status,
    volume: attempt.volume,
    safeBrokerOrExchangeLabel: "MetaAPI Demo AutoCopy",
    maskedConnectionRef: attempt.connectionId,
    sanitizedFailureCode: attempt.sanitizedFailureCode,
    sanitizedFailureReason: attempt.sanitizedFailureReason,
    updatedAt: attempt.updatedAt
  });
}

export function mapForexLiveCanaryAttemptToLedgerEntry(
  attempt: ForexLiveCanaryOrderAttemptSummary & {
    workspaceId?: string;
    connectionId?: string;
    providerExecutionIdentity?: string;
    authoritativePnl?: AccountLinkedTradeLedgerRecord["authoritativePnl"];
  }
): AccountLinkedTradeLedgerRecord {
  const providerConfirmed = attempt.status === "filled_live_forex_canary" ||
    attempt.status === "partially_filled_live_forex_canary";
  const journalLifecycle = attempt.status === "partially_filled_live_forex_canary" ? "partial" : "open";

  return baseMappedLedgerEntry({
    workspaceId: safeString(attempt.workspaceId) || "unknown_workspace",
    studentId: attempt.studentId,
    ledgerEntryId: `forex_live_canary_${attempt.attemptId}`,
    source: "forex_autocopy",
    assetClass: attempt.providerSymbol?.includes("XAU") || attempt.providerSymbol?.includes("BTC") ? "forex_cfd" : "forex",
    executionMode: "live_canary",
    sourceRecordId: attempt.attemptId,
    providerExecutionIdentity: safeString(attempt.providerExecutionIdentity) || undefined,
    providerExecutionIdentities: safeString(attempt.providerExecutionIdentity) ? [safeString(attempt.providerExecutionIdentity)] : undefined,
    tradeHubSignalId: attempt.signalId,
    providerStatus: providerConfirmed
      ? attempt.status === "partially_filled_live_forex_canary" ? "partially_filled" : "filled"
      : attempt.status,
    journalLifecycle: providerConfirmed ? journalLifecycle : undefined,
    tradeOrigin: "copied",
    providerConfirmed: providerConfirmed || undefined,
    confirmationState: providerConfirmed ? "provider_confirmed" : undefined,
    providerClosureConfirmed: false,
    performanceEligible: false,
    ineligibilityReason: providerConfirmed ? "open_position" : undefined,
    symbol: attempt.pair,
    side: attempt.side,
    status: providerConfirmed
      ? attempt.status === "partially_filled_live_forex_canary" ? "partial" : "filled"
      : attempt.status,
    volume: attempt.volume,
    authoritativePnl: attempt.authoritativePnl,
    safeBrokerOrExchangeLabel: "Tiny live Forex canary",
    maskedConnectionRef: attempt.connectionId,
    sanitizedFailureCode: attempt.sanitizedFailureCode,
    sanitizedFailureReason: attempt.sanitizedFailureReason,
    updatedAt: attempt.updatedAt
  });
}

export function mapManualJournalSummaryToLedgerEntry(
  journal: StudentJournalSummary
): AccountLinkedTradeLedgerRecord {
  return baseMappedLedgerEntry({
    workspaceId: journal.workspaceId,
    studentId: journal.studentId,
    ledgerEntryId: `manual_journal_${journal.studentId}_summary`,
    source: "manual_journal",
    assetClass: "forex",
    executionMode: "manual",
    sourceRecordId: "journal_summary_current",
    symbol: journal.mostActivePair ?? journal.bestPair ?? "SUMMARY",
    side: "unknown",
    status: journal.summaryState === "live" ? "closed" : "zero_safe",
    pnl: journal.pnl30dNgn,
    safeBrokerOrExchangeLabel: "Manual journal summary",
    updatedAt: journal.updatedAt
  });
}

export function mapPracticeBacktestOrderToLedgerEntry(input: {
  session: PracticeSessionSummary;
  order: PracticeOrderSummary;
}): AccountLinkedTradeLedgerRecord {
  const instrument = input.order.instrument
    ?? input.session.instrument
    ?? getPracticeInstrumentSpec(input.session.assetClass, input.session.symbol);

  return baseMappedLedgerEntry({
    workspaceId: input.session.workspaceId,
    studentId: input.session.studentId,
    ledgerEntryId: `practice_backtest_${input.order.orderId}`,
    source: "practice_backtest",
    assetClass: input.session.assetClass,
    executionMode: "practice",
    sourceRecordId: input.order.orderId,
    symbol: input.session.symbol,
    side: input.order.direction,
    status: input.order.status === "closed" ? "closed" : input.order.status === "cancelled" ? "cancelled" : "open",
    notional: input.order.notional,
    volume: input.order.size,
    pnl: input.order.pnl,
    rMultiple: input.order.rMultiple,
    riskAmount: input.order.riskAmount,
    practiceInstrument: instrument,
    safeBrokerOrExchangeLabel: `Practice backtesting${practicePlaybookLabel(input.order)}`,
    maskedConnectionRef: "practice_simulated",
    openedAt: input.order.openedAtCandleTime,
    closedAt: input.order.closedAtCandleTime,
    updatedAt: input.order.updatedAt
  });
}

export function mapPracticeBacktestCloseEventToLedgerEntry(input: {
  session: PracticeSessionSummary;
  order: PracticeOrderSummary;
  event: PracticeOrderCloseEvent;
}): AccountLinkedTradeLedgerRecord {
  const instrument = input.event.instrument
    ?? input.order.instrument
    ?? input.session.instrument
    ?? getPracticeInstrumentSpec(input.session.assetClass, input.session.symbol);

  return baseMappedLedgerEntry({
    workspaceId: input.session.workspaceId,
    studentId: input.session.studentId,
    ledgerEntryId: `practice_backtest_${input.event.eventId}`,
    source: "practice_backtest",
    assetClass: input.session.assetClass,
    executionMode: "practice",
    sourceRecordId: input.event.eventId,
    symbol: input.session.symbol,
    side: input.order.direction,
    status: input.event.eventType === "partial_close" ? "partial" : "closed",
    notional: input.event.notional ?? practiceNotionalForInstrument(instrument, input.event.exitPrice, input.event.closedSize),
    volume: input.event.closedSize,
    pnl: input.event.pnl,
    rMultiple: input.event.rMultiple,
    riskAmount: input.order.riskAmount,
    practiceInstrument: instrument,
    safeBrokerOrExchangeLabel: input.event.eventType === "partial_close"
      ? `Practice backtesting partial close${practicePlaybookLabel(input.order)}`
      : `Practice backtesting full close${practicePlaybookLabel(input.order)}`,
    maskedConnectionRef: "practice_simulated",
    openedAt: input.order.openedAtCandleTime,
    closedAt: input.event.candleTime,
    updatedAt: input.event.createdAt
  });
}

export async function writeAccountLinkedLedgerEntry(entry: AccountLinkedTradeLedgerRecord) {
  const { db } = getFirebaseAdminClients();

  await db
    .doc(`workspaces/${entry.workspaceId}/students/${entry.studentId}/account_linked_trade_ledger/${entry.ledgerEntryId}`)
    .set(stripUndefined(entry), { merge: true });
}

export async function writeJournalPerformanceSummary(input: {
  workspaceId: string;
  studentId: string;
  summaryId?: string;
  safeSummary: Record<string, unknown>;
}) {
  const { db } = getFirebaseAdminClients();

  await db
    .doc(`workspaces/${input.workspaceId}/students/${input.studentId}/journal_performance_summaries/${input.summaryId ?? "current"}`)
    .set(stripUndefined({
      workspaceId: input.workspaceId,
      studentId: input.studentId,
      ...input.safeSummary,
      updatedAt: new Date().toISOString()
    }), { merge: true });
}

export async function writeJournalActivityLink(input: {
  workspaceId: string;
  studentId: string;
  linkId: string;
  source: AccountLinkedLedgerSource;
  sourceRecordId: string;
  ledgerEntryId: string;
}) {
  const { db } = getFirebaseAdminClients();

  await db
    .doc(`workspaces/${input.workspaceId}/students/${input.studentId}/journal_activity_links/${input.linkId}`)
    .set(stripUndefined({
      workspaceId: input.workspaceId,
      studentId: input.studentId,
      source: input.source,
      sourceRecordId: maskedRef(input.sourceRecordId, "source"),
      ledgerEntryId: maskedRef(input.ledgerEntryId, "ledger"),
      createdAt: new Date().toISOString()
    }), { merge: true });
}

function emptyReadiness(): AccountLinkedReadinessSummary {
  return {
    crypto: {
      linked: false,
      verifiedCount: 0,
      status: "not_connected",
      safeMessage: "No verified crypto AutoCopy connection metadata is visible."
    },
    forex: {
      linked: false,
      brokerSetupActive: false,
      status: "not_connected",
      safeMessage: "No active Forex AutoCopy broker setup metadata is visible."
    }
  };
}

async function loadReadiness(workspaceId: string, studentId: string): Promise<AccountLinkedReadinessSummary> {
  const { db } = getFirebaseAdminClients();
  const [cryptoConnections, forexProvisioning] = await Promise.all([
    db.collection(`workspaces/${workspaceId}/students/${studentId}/exchange_connections`).limit(10).get(),
    db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_provisioning/current`).get()
  ]);
  const readiness = emptyReadiness();
  const verifiedCrypto = cryptoConnections.docs.filter((doc) => doc.data().status === "verified");

  readiness.crypto = {
    linked: verifiedCrypto.length > 0,
    verifiedCount: verifiedCrypto.length,
    status: verifiedCrypto.length > 0 ? "verified" : "not_connected",
    safeMessage: verifiedCrypto.length > 0
      ? "Verified crypto connection metadata is available; secrets and raw account identifiers are hidden."
      : readiness.crypto.safeMessage
  };

  if (forexProvisioning.exists) {
    const record = forexProvisioning.data() ?? {};
    const active = record.active === true;

    readiness.forex = {
      linked: active,
      brokerSetupActive: active,
      status: safeString(record.status) || "unknown",
      safeMessage: active
        ? "Forex broker setup metadata is active and support-safe; broker password is not returned."
        : "Forex broker setup metadata exists but is not active."
    };
  }

  return readiness;
}

export async function loadStudentAccountLinkedPerformancePreview({
  workspaceId,
  studentId,
  journal
}: {
  workspaceId: string;
  studentId: string;
  journal: StudentJournalSummary;
}): Promise<StudentAccountLinkedPerformancePreview> {
  const { db } = getFirebaseAdminClients();
  const [ledgerSnapshot, readiness, completedSessionSnapshot, feedbackSnapshot] = await Promise.all([
    db.collection(`workspaces/${workspaceId}/students/${studentId}/account_linked_trade_ledger`)
      .orderBy("updatedAt", "desc")
      .limit(STUDENT_LEDGER_VISIBLE_LIMIT)
      .get(),
    loadReadiness(workspaceId, studentId),
    db.collection(`workspaces/${workspaceId}/students/${studentId}/practice_sessions`)
      .orderBy("completedAt", "desc")
      .limit(3)
      .get(),
    db.collection(`workspaces/${workspaceId}/students/${studentId}/practice_instructor_feedback`)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get()
  ]);
  const entries = ledgerSnapshot.docs.map((doc) =>
    mapLedgerRecord(recordFromSnapshot(doc, "ledgerEntryId"), { workspaceId, studentId, ledgerEntryId: doc.id })
  );
  const autoCopyItems = entries.filter((entry) => entry.source === "crypto_autocopy" || entry.source === "forex_autocopy");
  const practiceItems = entries.filter((entry) => entry.source === "practice_backtest");
  const practiceClosedItems = practiceItems.filter((entry) => entry.status === "closed");
  const practicePartialItems = practiceItems.filter((entry) => entry.status === "partial");
  const practiceRValues = practiceItems
    .map((entry) => entry.rMultiple)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const practiceWins = practiceItems.filter((entry) => (entry.pnl ?? 0) > 0);
  const practicePlaybookLabels = [...new Set(practiceItems
    .map((entry) => {
      const parts = safeString(entry.safeBrokerOrExchangeLabel).split("·").map((part) => part.trim()).filter(Boolean);

      return parts[parts.length - 1];
    })
    .filter((label): label is string => Boolean(label) && label !== "Practice backtesting" && label !== "Practice backtesting partial close" && label !== "Practice backtesting full close"))]
    .slice(0, 4);
  const latestCompletedSession = completedSessionSnapshot.docs.find((doc) => doc.data().status === "completed");
  const latestCompletedReflection = latestCompletedSession
    ? mapPracticeReflection(latestCompletedSession.data().reflection)
    : undefined;
  const latestChallengeResult = latestCompletedSession
    ? mapPracticeChallengeResult(latestCompletedSession.data().challengeResult)
    : undefined;
  const latestInstructorFeedback = feedbackSnapshot.docs[0]
    ? mapPracticeInstructorFeedback({ feedbackId: feedbackSnapshot.docs[0].id, ...feedbackSnapshot.docs[0].data() })
    : undefined;
  const publishedInstructorFeedback = latestInstructorFeedback?.publicationStatus === "published"
    ? latestInstructorFeedback
    : undefined;
  let latestMainLesson: PracticeAnnotationSummary | undefined;
  let latestEventLinkedNote: PracticeAnnotationSummary | undefined;

  if (latestCompletedSession) {
    const annotationSnapshot = await db
      .collection(`workspaces/${workspaceId}/students/${studentId}/practice_annotations`)
      .where("sessionId", "==", latestCompletedSession.id)
      .limit(24)
      .get();
    const mainLessonDoc = annotationSnapshot.docs.find((doc) => doc.data().isMainLesson === true);
    const eventLinkedDoc = annotationSnapshot.docs.find((doc) => Boolean(safeString(doc.data().eventId)));

    latestMainLesson = mainLessonDoc
      ? mapPracticeMainLesson({ annotationId: mainLessonDoc.id, ...mainLessonDoc.data() }, {
        workspaceId,
        studentId,
        annotationId: mainLessonDoc.id
      })
      : undefined;
    latestEventLinkedNote = eventLinkedDoc
      ? mapPracticeMainLesson({ annotationId: eventLinkedDoc.id, ...eventLinkedDoc.data() }, {
        workspaceId,
        studentId,
        annotationId: eventLinkedDoc.id
      })
      : undefined;
  }
  const statusCounts: Partial<Record<AccountLinkedLedgerStatus, number>> = {};

  for (const entry of autoCopyItems) {
    increment(statusCounts, entry.status);
  }

  return {
    visibleLimit: STUDENT_LEDGER_VISIBLE_LIMIT,
    manual: {
      privacyState: journal.privacyState,
      summaryState: journal.summaryState,
      totalTrades30d: journal.totalTrades30d,
      pnl30dNgn: journal.pnl30dNgn,
      winRate30d: journal.winRate30d
    },
    autoCopy: {
      totalLedgerItems: autoCopyItems.length,
      recentItems: autoCopyItems,
      statusCounts
    },
    practice: {
      status: practiceItems.length > 0 ? "active" : "placeholder",
      safeMessage: practiceItems.length > 0
        ? "Practice/backtesting activity is shown separately from AutoCopy."
        : "Practice/backtesting performance will appear here.",
      totalLedgerItems: practiceItems.length,
      recentItems: practiceItems,
      closedCount: practiceClosedItems.length,
      partialCloseCount: practicePartialItems.length,
      fullCloseCount: practiceClosedItems.length,
      pnl: practiceItems.reduce((total, entry) => total + (entry.pnl ?? 0), 0),
      averageR: practiceRValues.length > 0 ? practiceRValues.reduce((total, value) => total + value, 0) / practiceRValues.length : 0,
      winRate: practiceItems.length > 0 ? practiceWins.length / practiceItems.length : 0,
      playbookLabels: practicePlaybookLabels,
      latestCompletedReflection,
      latestMainLesson,
      latestEventLinkedNote,
      latestChallengeResult,
      latestInstructorFeedback: publishedInstructorFeedback
    },
    linkedAccountReadiness: readiness,
    warnings: entries.length === 0
      ? ["No account-linked AutoCopy ledger entries are visible yet; this preview is zero-safe."]
      : [],
    updatedAt: latestIso([
      journal.updatedAt,
      ...entries.map((entry) => entry.updatedAt)
    ]) ?? new Date().toISOString()
  };
}

export async function loadWorkspaceAccountLinkedPerformanceSummary(
  workspaceId: string
): Promise<WorkspaceAccountLinkedPerformanceSummary> {
  const { db } = getFirebaseAdminClients();
  const studentSnapshot = await db.collection(`workspaces/${workspaceId}/students`).limit(WORKSPACE_LEDGER_STUDENT_SAMPLE_LIMIT).get();
  let activeJournalSummaryCount = 0;
  let autoCopyActivityStudentCount = 0;
  const copiedSignalOutcomeCounts: Partial<Record<AccountLinkedLedgerStatus, number>> = {};
  const recentCopiedSignalItems: AccountLinkedTradeLedgerSummary[] = [];

  await Promise.all(studentSnapshot.docs.map(async (studentDoc) => {
    const [journalSnapshot, ledgerSnapshot] = await Promise.all([
      db.doc(`workspaces/${workspaceId}/students/${studentDoc.id}/journal_summary/current`).get(),
      db.collection(`workspaces/${workspaceId}/students/${studentDoc.id}/account_linked_trade_ledger`)
        .orderBy("updatedAt", "desc")
        .limit(3)
        .get()
    ]);

    if (journalSnapshot.exists && journalSnapshot.data()?.summaryState !== "zero_safe") {
      activeJournalSummaryCount += 1;
    }

    const ledgerEntries = ledgerSnapshot.docs
      .map((doc) => mapLedgerRecord(recordFromSnapshot(doc, "ledgerEntryId"), {
        workspaceId,
        studentId: studentDoc.id,
        ledgerEntryId: doc.id
      }))
      .filter((entry) => entry.source === "crypto_autocopy" || entry.source === "forex_autocopy");

    if (ledgerEntries.length > 0) {
      autoCopyActivityStudentCount += 1;
    }

    for (const entry of ledgerEntries) {
      increment(copiedSignalOutcomeCounts, entry.status);
      recentCopiedSignalItems.push({ ...entry, visibility: "workspace_summary" });
    }
  }));

  const recentItems = recentCopiedSignalItems
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, WORKSPACE_LEDGER_VISIBLE_LIMIT);

  return {
    visibleLimit: WORKSPACE_LEDGER_VISIBLE_LIMIT,
    activeJournalSummaryCount,
    autoCopyActivityStudentCount,
    copiedSignalOutcomeCounts,
    studentsNeedingAttention: {
      failedAutoCopyAttempts: copiedSignalOutcomeCounts.failed ?? 0,
      missingConsent: 0,
      missingBilling: 0,
      lockedSetup: 0
    },
    recentCopiedSignalItems: recentItems,
    bounded: studentSnapshot.docs.length === WORKSPACE_LEDGER_STUDENT_SAMPLE_LIMIT ||
      recentCopiedSignalItems.length > WORKSPACE_LEDGER_VISIBLE_LIMIT,
    warnings: [
      "Workspace journal performance is aggregate and bounded; private journal notes and raw trade tables are not returned."
    ],
    updatedAt: latestIso(recentItems.map((entry) => entry.updatedAt)) ?? new Date().toISOString()
  };
}

export async function loadAdminAccountLinkedLedgerDiagnostics(
  workspaceId?: string
): Promise<AdminAccountLinkedLedgerDiagnostics> {
  const workspaceSummary = workspaceId
    ? await loadWorkspaceAccountLinkedPerformanceSummary(workspaceId)
    : null;
  const sourceCounts: Partial<Record<AccountLinkedLedgerSource, number>> = {};
  const statusCounts: Partial<Record<AccountLinkedLedgerStatus, number>> = {};

  for (const entry of workspaceSummary?.recentCopiedSignalItems ?? []) {
    increment(sourceCounts, entry.source);
    increment(statusCounts, entry.status);
  }

  return {
    visibleLimit: WORKSPACE_LEDGER_VISIBLE_LIMIT,
    sourceCounts,
    statusCounts,
    failureCount: statusCounts.failed ?? 0,
    accountReadinessCounts: {
      cryptoLinked: 0,
      forexLinked: 0,
      lockedSetup: workspaceSummary?.studentsNeedingAttention.lockedSetup ?? 0
    },
    recentEntries: workspaceSummary?.recentCopiedSignalItems ?? [],
    bounded: workspaceSummary?.bounded ?? false,
    warnings: [
      workspaceId
        ? "Super Admin account-linked ledger diagnostics are support-safe and workspace-scoped."
        : "Select a workspace to load support-safe account-linked ledger diagnostics."
    ],
    updatedAt: workspaceSummary?.updatedAt ?? new Date().toISOString()
  };
}
