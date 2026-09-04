import "server-only";

import { createHash } from "node:crypto";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  mapPracticeBacktestCloseEventToLedgerEntry,
  mapPracticeBacktestOrderToLedgerEntry,
  writeAccountLinkedLedgerEntry
} from "@/lib/journal/account-linked-performance-ledger";
import {
  buildPracticeCloseEvent,
  calculatePracticeRiskSizing,
  evaluatePracticeOrderAgainstRevealedCandles,
  marketOrderFillPriceFromLatestRevealedCandle,
  pnlForPracticeOrder,
  riskAmountForPracticeQuantity,
  validateDirectionalPracticeLevels,
  validatePracticePriceTickAlignment
} from "@/lib/practice/practice-fill-engine";
import {
  fetchHistoricalCandlesWithCache,
  getPracticeAssetCatalogue,
  historicalDataLimits,
  normalizeHistoricalCandleRequest
} from "@/lib/practice/historical-data-service";
import {
  computePracticeOrderNetResult,
  computePracticePerformanceSummary,
  computePracticePlaybookPerformance,
  normalizePracticePerformanceAssumptions,
  selectBestWorstPracticePlaybooks
} from "@/lib/practice/practice-performance-analytics";
import { listVisiblePracticeEventsForRevealedCandles } from "@/lib/practice/practice-events";
import {
  getPracticeInstrumentSpec,
  practiceNotionalForInstrument,
  practiceQuantityAlignsWithStep,
  practiceQuantityFromStepCount,
  practiceQuantityStepCount,
  quantizePracticeQuantityDown,
  roundPracticeQuantity
} from "@/lib/practice/practice-instrument-specs";
import {
  assertPracticeChallengeAllowsNewOrder,
  computePracticeChallengeStatus,
  normalizePracticeChallengeConfig
} from "@/lib/practice/practice-challenge";
import type {
  HistoricalCandlesResponse,
  NormalizedCandle,
  PracticeAnnotationDeleteResponse,
  PracticeBookmarkDeleteResponse,
  PracticeBookmarkMutationResponse,
  PracticeBookmarkRecord,
  PracticeBookmarkSummary,
  PracticeDrawingColorToken,
  PracticeDrawingChartPoint,
  PracticeDrawingCoordinateVersion,
  PracticeDrawingAppearanceVersion,
  PracticeDrawingBulkDeleteResponse,
  PracticeAnnotationKind,
  PracticeAnnotationMutationResponse,
  PracticeAnnotationRecord,
  PracticeAnnotationSummary,
  PracticeAssignmentRecord,
  PracticeAssignmentReviewQueueFilter,
  PracticeAssignmentResubmissionRequest,
  PracticeAssignmentResubmissionStatus,
  PracticeAssignmentStatus,
  PracticeAssignmentSummary,
  PracticeAssignmentSuggestedPlaybook,
  PracticeChallengeConfig,
  PracticeChallengeSummary,
  PracticeCompletedSessionReview,
  PracticeCohortStatus,
  PracticeCohortSummary,
  PracticeEventMarkerSummary,
  PracticeExportDataset,
  PracticeExportResponse,
  PracticeAssetClass,
  PracticeAnalyticsCurvePoint,
  PracticeChallengeAnalyticsSummary,
  PracticeInstrumentSpecSummary,
  PracticeInstructorFeedbackRecord,
  PracticeInstructorFeedbackPublicationStatus,
  PracticeInstructorFeedbackRubric,
  PracticeInstructorFeedbackSummary,
  PracticeInstructorFeedbackStatus,
  PracticeNotificationAction,
  PracticeNotificationKind,
  PracticeNotificationUrgency,
  PracticeOrderDirection,
  PracticeOrderCloseEvent,
  PracticeOrderCloseReason,
  PracticeOrderEvaluationResponse,
  PracticeOrderMutationResponse,
  PracticeOrderRecord,
  PracticeOrderSummary,
  PracticeOrderStatus,
  PracticeOrderType,
  PracticePlaybookMutationResponse,
  PracticePlaybookImportResponse,
  PracticePlaybookRecord,
  PracticePlaybookStatus,
  PracticePlaybookSummary,
  PracticeReplayIndexMutationResponse,
  PracticeSessionFinishMutationResponse,
  PracticeSessionOrdersResponse,
  PracticeSessionDetailResponse,
  PracticeSessionReportResponse,
  PracticeSessionReflection,
  PracticeSessionReflectionMutationResponse,
  PracticeSessionAssumptionsMutationResponse,
  PracticeSessionAnalyticsSummary,
  PracticeSessionAssignmentSnapshot,
  PracticeSessionDeleteResponse,
  PracticeSessionMutationResponse,
  PracticeSessionRecord,
  PracticeSessionSummary,
  PracticeSymbolBreakdownSummary,
  RevealedPracticeCandlesResponse,
  StudentPracticeAnalyticsResponse,
  StudentPracticeAssignmentState,
  StudentPracticeAssignmentStartResponse,
  StudentPracticeAssignmentsResponse,
  StudentPracticeNotificationMutationResponse,
  StudentPracticeNotificationSummary,
  StudentPracticeNotificationsResponse,
  StudentPracticeOverviewResponse,
  StudentPracticeCandle,
  WorkspacePracticeAssignmentMutationResponse,
  WorkspacePracticeCohortMutationResponse,
  WorkspacePracticeAssignmentFeedbackCompletionSummary,
  WorkspacePracticeAssignmentFeedbackMutationResponse,
  WorkspacePracticeAssignmentFeedbackResponse,
  WorkspacePracticeAssignmentProgressSummary,
  WorkspacePracticeAssignmentNotificationCounts,
  WorkspacePracticeAssignmentsResponse,
  WorkspacePracticeAssignmentSummary,
  WorkspacePracticeInsightsFilters,
  WorkspacePracticeInsightsResponse,
  WorkspacePracticeInsightsStatusFilter
} from "@/types/practice";

const PRACTICE_VISIBLE_LIMIT = 12;
const PRACTICE_SESSION_DASHBOARD_LIMIT = 80;
const PRACTICE_ANALYTICS_SESSION_LIMIT = 120;
const PRACTICE_ANALYTICS_ORDER_LIMIT = 500;
const PRACTICE_ANNOTATION_VISIBLE_LIMIT = 24;
const PRACTICE_DRAWING_BULK_DELETE_LIMIT = 400;
const PRACTICE_DRAWING_VISUAL_INDEX_MARGIN = 500;
const PRACTICE_DRAWING_POINT_LIMIT = 8;
const PRACTICE_BOOKMARK_VISIBLE_LIMIT = 40;
const PRACTICE_CHALLENGE_ORDER_LIMIT = 250;
const PRACTICE_REPORT_ORDER_LIMIT = 250;
const PRACTICE_REPORT_ANNOTATION_LIMIT = 120;
const WORKSPACE_PRACTICE_INSIGHTS_SESSION_LIMIT = 600;
const WORKSPACE_PRACTICE_INSIGHTS_ORDER_LIMIT = 1200;
const WORKSPACE_PRACTICE_INSIGHTS_PLAYBOOK_LIMIT = 600;
const WORKSPACE_PRACTICE_INSIGHTS_RECENT_COMPLETED_LIMIT = 8;
const WORKSPACE_PRACTICE_ASSIGNMENT_LIMIT = 80;
const WORKSPACE_PRACTICE_COHORT_LIMIT = 80;
const WORKSPACE_PRACTICE_COHORT_MEMBER_LIMIT = 500;
const WORKSPACE_PRACTICE_ASSIGNMENT_STUDENT_LIMIT = 500;
const WORKSPACE_PRACTICE_ASSIGNMENT_PROGRESS_SESSION_LIMIT = 1200;
const WORKSPACE_PRACTICE_ASSIGNMENT_PROGRESS_ORDER_LIMIT = 2000;
const WORKSPACE_PRACTICE_FEEDBACK_COMPLETION_LIMIT = 120;
const WORKSPACE_PRACTICE_FEEDBACK_ORDER_LIMIT = 1500;
const WORKSPACE_PRACTICE_FEEDBACK_RECORD_LIMIT = 300;
const STUDENT_PRACTICE_FEEDBACK_LIMIT = 24;
const STUDENT_PRACTICE_NOTIFICATION_LIMIT = 24;
const STUDENT_PRACTICE_NOTIFICATION_STATE_LIMIT = 160;
const PRACTICE_EXPORT_LIMIT = 500;
const PRACTICE_PLAYBOOK_IMPORT_LIMIT = 50;

function toStudentPracticeCandle(candle: NormalizedCandle): StudentPracticeCandle {
  return {
    openTime: candle.openTime,
    closeTime: candle.closeTime,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    assetClass: candle.assetClass,
    symbol: candle.symbol,
    timeframeMinutes: candle.timeframeMinutes
  };
}

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

function safeNumber(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function safeId(value: unknown) {
  return safeString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180);
}

function deterministicId(parts: string[]) {
  const digest = createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 16);
  const label = parts
    .map((part) => safeString(part).toLowerCase().replace(/[^a-z0-9]+/g, "_"))
    .filter(Boolean)
    .join("_")
    .slice(0, 90);

  return `${label}_${digest}`.replace(/^_+|_+$/g, "");
}

function normalizeIso(value: unknown, field: string) {
  const raw = safeString(value);
  const time = Date.parse(raw);

  if (!raw || !Number.isFinite(time)) {
    throw new AdminApiError(400, `${field}_invalid`, "Choose a valid practice date.");
  }

  return new Date(time).toISOString();
}

function normalizeSymbol(value: unknown) {
  const symbol = safeString(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);

  if (!symbol) {
    throw new AdminApiError(400, "practice_symbol_required", "Choose a practice symbol.");
  }

  return symbol;
}

function normalizeAssetClass(value: unknown): PracticeAssetClass {
  if (value === "crypto" || value === "forex_cfd") {
    return value;
  }

  throw new AdminApiError(400, "practice_asset_class_invalid", "Choose Crypto or Forex-CFD for practice.");
}

function normalizeOptionalPracticeMarket(value: unknown): PracticeAssetClass {
  return value === "forex_cfd" ? "forex_cfd" : "crypto";
}

function normalizePlaybookStatus(value: unknown, archivedAt?: unknown): PracticePlaybookStatus {
  if (value === "active") {
    return "active";
  }

  if (value === "archived" || archivedAt) {
    return "archived";
  }

  return "active";
}

function normalizePracticeAssignmentStatus(value: unknown, archivedAt?: unknown): PracticeAssignmentStatus {
  if (value === "active" || value === "draft") {
    return value;
  }

  if (value === "archived" || archivedAt) {
    return "archived";
  }

  return "draft";
}

function normalizePracticeCohortStatus(value: unknown, archivedAt?: unknown): PracticeCohortStatus {
  if (value === "active") {
    return "active";
  }

  if (value === "archived" || archivedAt) {
    return "archived";
  }

  return "active";
}

function normalizeInstructorFeedbackStatus(value: unknown, reviewedAt?: unknown): PracticeInstructorFeedbackStatus {
  return value === "reviewed" || reviewedAt ? "reviewed" : "not_reviewed";
}

function normalizeInstructorFeedbackPublicationStatus(value: unknown, publishedAt?: unknown): PracticeInstructorFeedbackPublicationStatus {
  return value === "published" || publishedAt ? "published" : "draft";
}

function normalizeAssignmentResubmissionStatus(value: unknown): PracticeAssignmentResubmissionStatus {
  return value === "requested" || value === "started" || value === "completed" ? value : "none";
}

function parseWorkspaceReviewQueueFilter(value: unknown): PracticeAssignmentReviewQueueFilter {
  return value === "needs_review" ||
    value === "feedback_draft" ||
    value === "feedback_published" ||
    value === "resubmission_requested" ||
    value === "completed" ||
    value === "all"
    ? value
    : "all";
}

function normalizeStudentRefs(value: unknown) {
  const entries = Array.isArray(value)
    ? value
    : safeString(value).split(/\r?\n|,/g);

  return [...new Set(entries
    .map((entry) => safeString(entry).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80))
    .filter((entry) => entry.startsWith("student_"))
  )].slice(0, WORKSPACE_PRACTICE_COHORT_MEMBER_LIMIT);
}

function normalizeCohortIds(value: unknown) {
  const entries = Array.isArray(value)
    ? value
    : safeString(value).split(/\r?\n|,/g);

  return [...new Set(entries
    .map((entry) => safeId(entry))
    .filter(Boolean)
  )].slice(0, 12);
}

function normalizeRubricScore(value: unknown, field: string) {
  const score = Math.round(safeNumber(value, 0));

  if (score < 1 || score > 5) {
    throw new AdminApiError(400, `${field}_invalid`, "Rubric scores must be between 1 and 5.");
  }

  return score;
}

function normalizeInstructorFeedbackRubric(value: unknown): PracticeInstructorFeedbackRubric {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AdminApiError(400, "practice_feedback_rubric_required", "Add rubric scores before saving instructor feedback.");
  }

  const record = value as Record<string, unknown>;

  return {
    setupQuality: normalizeRubricScore(record.setupQuality, "practice_feedback_setup_quality"),
    riskManagement: normalizeRubricScore(record.riskManagement, "practice_feedback_risk_management"),
    executionDiscipline: normalizeRubricScore(record.executionDiscipline, "practice_feedback_execution_discipline"),
    reviewQuality: normalizeRubricScore(record.reviewQuality, "practice_feedback_review_quality"),
    overallScore: normalizeRubricScore(record.overallScore, "practice_feedback_overall_score")
  };
}

function sanitizeFeedbackText(value: unknown, limit: number) {
  return safeString(value).replace(/\s+/g, " ").slice(0, limit);
}

function normalizeResubmissionRequest(value: unknown, previousAttemptMaskedSessionRef?: string): PracticeAssignmentResubmissionRequest | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const status = normalizeAssignmentResubmissionStatus(record.status);

  if (status === "none") {
    return undefined;
  }

  const reason = sanitizeFeedbackText(record.reason, 700);

  if (!reason) {
    throw new AdminApiError(400, "practice_resubmission_reason_required", "Add a short reason before requesting resubmission.");
  }

  const rubricArea =
    record.rubricArea === "setupQuality" ||
    record.rubricArea === "riskManagement" ||
    record.rubricArea === "executionDiscipline" ||
    record.rubricArea === "reviewQuality" ||
    record.rubricArea === "overallScore"
      ? record.rubricArea
      : undefined;

  return stripUndefined({
    status,
    reason,
    dueDate: record.dueDate ? normalizeIso(record.dueDate, "practice_resubmission_due_date") : undefined,
    rubricArea,
    requestedAt: record.requestedAt ? normalizeIso(record.requestedAt, "practice_resubmission_requested_at") : new Date().toISOString(),
    requestedByLabel: sanitizeFeedbackText(record.requestedByLabel, 80) || "Workspace instructor",
    previousAttemptMaskedSessionRef
  });
}

function normalizeTimeframe(value: unknown) {
  const timeframe = safeNumber(value, 0);

  if (!historicalDataLimits.supportedTimeframes.includes(timeframe)) {
    throw new AdminApiError(400, "practice_timeframe_unsupported", "Choose M15, H1, H4, or D1 for practice.");
  }

  return timeframe;
}

function normalizeAssumptionBps(value: unknown) {
  return Math.max(0, Math.min(safeNumber(value, 0), 100));
}

function normalizeChecklist(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => safeString(entry).slice(0, 140))
      .filter(Boolean)
      .slice(0, 12);
  }

  return safeString(value)
    .split(/\r?\n|,/g)
    .map((entry) => entry.trim().slice(0, 140))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeSuggestedPlaybook(value: unknown): PracticeAssignmentSuggestedPlaybook | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const name = safeString(record.name).replace(/\s+/g, " ").slice(0, 80);

  if (!name) {
    return undefined;
  }

  return stripUndefined({
    name,
    strategyType: safeString(record.strategyType).replace(/\s+/g, " ").slice(0, 80) || undefined,
    setupRules: safeString(record.setupRules).replace(/\s+/g, " ").slice(0, 1000) || undefined,
    entryChecklist: normalizeChecklist(record.entryChecklist),
    invalidationRules: safeString(record.invalidationRules).replace(/\s+/g, " ").slice(0, 1000) || undefined,
    riskNotes: safeString(record.riskNotes).replace(/\s+/g, " ").slice(0, 1000) || undefined
  });
}

type PracticeExportRow = Record<string, string | number | boolean | null>;

function csvEscape(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}

function buildCsv(headers: string[], rows: PracticeExportRow[]) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      field += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((entry) => entry.some((cell) => cell.trim().length > 0));
}

function parseCsvObjects(csv: string) {
  const rows = parseCsvRows(csv);
  const headers = rows[0]?.map((header) => safeString(header)) ?? [];

  if (!headers.length) {
    return [];
  }

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (header) {
        record[header] = row[index] ?? "";
      }
    });

    return record;
  });
}

function parsePracticeExportDataset(value: unknown): PracticeExportDataset {
  if (
    value === "sessions" ||
    value === "orders" ||
    value === "closed_trades" ||
    value === "playbooks" ||
    value === "annotations" ||
    value === "reflections" ||
    value === "backup_json"
  ) {
    return value;
  }

  throw new AdminApiError(400, "practice_export_dataset_invalid", "Choose a supported practice export dataset.");
}

function normalizeWorkspacePracticeInsightsStatus(value: unknown): WorkspacePracticeInsightsStatusFilter {
  if (
    value === "draft" ||
    value === "active" ||
    value === "completed" ||
    value === "abandoned" ||
    value === "archived"
  ) {
    return value;
  }

  return "all";
}

function normalizeOptionalIso(value: unknown, field: string) {
  const raw = safeString(value);

  if (!raw) {
    return undefined;
  }

  return normalizeIso(raw, field);
}

export function parseWorkspacePracticeInsightsRequest(request: Request): WorkspacePracticeInsightsFilters {
  const params = new URL(request.url).searchParams;
  const timeframe = params.get("timeframeMinutes");

  return stripUndefined({
    status: normalizeWorkspacePracticeInsightsStatus(params.get("status")),
    symbol: params.get("symbol") ? normalizeSymbol(params.get("symbol")) : undefined,
    timeframeMinutes: timeframe ? normalizeTimeframe(timeframe) : undefined,
    dateStart: normalizeOptionalIso(params.get("dateStart"), "practice_insights_date_start"),
    dateEnd: normalizeOptionalIso(params.get("dateEnd"), "practice_insights_date_end")
  });
}

function safeExportDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAnnotationKind(value: unknown): PracticeAnnotationKind {
  if (
    value === "entry_note" ||
    value === "mistake_note" ||
    value === "structure_note" ||
    value === "support_resistance_zone" ||
    value === "chart_marker_note" ||
    value === "trend_line" ||
    value === "horizontal_line" ||
    value === "vertical_marker" ||
    value === "zone" ||
    value === "text_note" ||
    value === "fibonacci_retracement" ||
    value === "measurement_placeholder"
  ) {
    return value;
  }

  return "chart_marker_note";
}

function isTerminalDrawingAnnotationKind(kind: PracticeAnnotationKind) {
  return kind === "trend_line" ||
    kind === "horizontal_line" ||
    kind === "vertical_marker" ||
    kind === "zone" ||
    kind === "text_note" ||
    kind === "fibonacci_retracement" ||
    kind === "measurement_placeholder";
}

function defaultTextForAnnotationKind(kind: PracticeAnnotationKind) {
  switch (kind) {
    case "trend_line":
      return "Trend line";
    case "horizontal_line":
      return "Horizontal price line";
    case "vertical_marker":
      return "Vertical time marker";
    case "zone":
      return "Practice zone";
    case "text_note":
      return "Terminal text note";
    case "fibonacci_retracement":
      return "Fib retracement";
    case "measurement_placeholder":
      return "Measure";
    default:
      return "Practice annotation";
  }
}

function normalizeMultilineAnnotationText(value: unknown, fallback?: string) {
  return safeString(value || fallback)
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
    .slice(0, 700);
}

function normalizeAnnotationText(value: unknown, fallback: string | undefined, kind: PracticeAnnotationKind) {
  const text = kind === "text_note"
    ? normalizeMultilineAnnotationText(value, fallback)
    : safeString(value || fallback).replace(/\s+/g, " ").slice(0, 700);

  if (text.length < 2) {
    throw new AdminApiError(400, "practice_annotation_text_required", "Add a short practice annotation note.");
  }

  return text;
}

function normalizeStoredAnnotationText(value: unknown, fallback: string, kind: PracticeAnnotationKind) {
  const text = kind === "text_note"
    ? normalizeMultilineAnnotationText(value, fallback)
    : safeString(value || fallback).replace(/\s+/g, " ").slice(0, 700);

  return text.length >= 2 ? text : fallback;
}

function normalizeAnnotationLabel(value: unknown, fallback: string) {
  return safeString(value || fallback).replace(/\s+/g, " ").slice(0, 120);
}

function normalizeDrawingColorToken(value: unknown): PracticeDrawingColorToken {
  if (
    value === "accent" ||
    value === "green" ||
    value === "amber" ||
    value === "red" ||
    value === "blue" ||
    value === "neutral"
  ) {
    return value;
  }

  return "accent";
}

function normalizeDrawingAppearanceVersion(value: unknown): PracticeDrawingAppearanceVersion | undefined {
  return value === "trend_blue_v1" || value === "user_selected_v1" ? value : undefined;
}

function normalizeReflectionText(value: unknown) {
  return safeString(value).replace(/\s+/g, " ").slice(0, 700) || undefined;
}

function normalizeBookmarkText(value: unknown) {
  return safeString(value).replace(/\s+/g, " ").slice(0, 240) || undefined;
}

function mapReflection(value: unknown): PracticeSessionReflection | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const confidenceScore = record.confidenceScore === undefined
    ? undefined
    : Math.max(1, Math.min(Math.floor(safeNumber(record.confidenceScore, 0)), 5));
  const reflection = stripUndefined({
    whatWentWell: normalizeReflectionText(record.whatWentWell),
    whatWentWrong: normalizeReflectionText(record.whatWentWrong),
    improveNextTime: normalizeReflectionText(record.improveNextTime),
    confidenceScore,
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : undefined
  });

  return Object.keys(reflection).length > 0 ? reflection : undefined;
}

function mapChallengeConfig(value: unknown, fallbackStartingBalance: number): PracticeChallengeConfig | undefined {
  return normalizePracticeChallengeConfig(value, fallbackStartingBalance);
}

function mapChallengeResult(value: unknown): PracticeChallengeSummary | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const status =
    record.status === "active" ||
    record.status === "passed" ||
    record.status === "failed" ||
    record.status === "not_started"
      ? record.status
      : "not_started";

  if (record.enabled !== true) {
    return undefined;
  }

  return {
    enabled: true,
    status,
    challengeName: safeString(record.challengeName).replace(/\s+/g, " ").slice(0, 80) || "Practice challenge",
    startingBalance: safeNumber(record.startingBalance, 0),
    currentEquity: safeNumber(record.currentEquity, 0),
    netPnl: safeNumber(record.netPnl, 0),
    profitTargetAmount: safeNumber(record.profitTargetAmount, 0),
    profitTargetProgress: Math.max(0, safeNumber(record.profitTargetProgress, 0)),
    maxDailyLossAmount: safeNumber(record.maxDailyLossAmount, 0),
    dailyLossUsage: Math.max(0, safeNumber(record.dailyLossUsage, 0)),
    maxTotalDrawdownAmount: safeNumber(record.maxTotalDrawdownAmount, 0),
    drawdownUsage: Math.max(0, safeNumber(record.drawdownUsage, 0)),
    openTrades: Math.max(0, Math.floor(safeNumber(record.openTrades, 0))),
    maxOpenSimulatedTrades: Math.max(1, Math.floor(safeNumber(record.maxOpenSimulatedTrades, 3))),
    tradesUsed: Math.max(0, Math.floor(safeNumber(record.tradesUsed, 0))),
    maxTradesPerSession: Math.max(1, Math.floor(safeNumber(record.maxTradesPerSession, 20))),
    tradesToday: Math.max(0, Math.floor(safeNumber(record.tradesToday, 0))),
    maxTradesPerDay: record.maxTradesPerDay === undefined ? undefined : Math.max(1, Math.floor(safeNumber(record.maxTradesPerDay, 0))),
    tradingDays: Math.max(0, Math.floor(safeNumber(record.tradingDays, 0))),
    minimumTradingDays: record.minimumTradingDays === undefined ? undefined : Math.max(0, Math.floor(safeNumber(record.minimumTradingDays, 0))),
    breachCodes: Array.isArray(record.breachCodes) ? record.breachCodes.map(safeString).filter(Boolean).slice(0, 10) : [],
    breachMessages: Array.isArray(record.breachMessages) ? record.breachMessages.map((entry) => safeString(entry).replace(/\s+/g, " ").slice(0, 180)).filter(Boolean).slice(0, 10) : [],
    safeMessage: safeString(record.safeMessage).replace(/\s+/g, " ").slice(0, 180) || "Simulated practice challenge summary.",
    evaluatedAt: record.evaluatedAt ? new Date(String(record.evaluatedAt)).toISOString() : new Date().toISOString()
  };
}

function mapPracticeAssignmentSnapshot(value: unknown): PracticeSessionAssignmentSnapshot | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const assignmentId = safeId(record.assignmentId);

  if (!assignmentId) {
    return undefined;
  }

  const assetClass = record.assetClass === "forex_cfd" ? "forex_cfd" : "crypto";
  const title = safeString(record.title).replace(/\s+/g, " ").slice(0, 120) || "Practice assignment";

  return stripUndefined({
    assignmentId,
    title,
    assetClass,
    symbol: normalizeSymbol(record.symbol || "BTCUSDT"),
    instrument: mapInstrumentSpec(record.instrument),
    timeframeMinutes: normalizeTimeframe(record.timeframeMinutes || 60),
    dueDate: record.dueDate ? new Date(String(record.dueDate)).toISOString() : undefined,
    availabilityStartDate: record.availabilityStartDate ? new Date(String(record.availabilityStartDate)).toISOString() : undefined,
    closeDate: record.closeDate ? new Date(String(record.closeDate)).toISOString() : undefined,
    targetCohortIds: normalizeCohortIds(record.targetCohortIds),
    startedAt: record.startedAt ? new Date(String(record.startedAt)).toISOString() : new Date().toISOString(),
    attemptNumber: record.attemptNumber === undefined ? undefined : Math.max(1, Math.floor(safeNumber(record.attemptNumber, 1))),
    previousAttemptMaskedSessionRef: safeString(record.previousAttemptMaskedSessionRef).slice(0, 80) || undefined,
    resubmissionSourceFeedbackId: safeId(record.resubmissionSourceFeedbackId) || undefined,
    safeMessage: safeString(record.safeMessage).replace(/\s+/g, " ").slice(0, 180) || "Practice assignment metadata snapshot."
  });
}

function normalizeReflectionPayload(payload: unknown, updatedAt: string): PracticeSessionReflection {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_reflection_payload_invalid", "Send a valid completed-session reflection.");
  }

  const record = payload as Record<string, unknown>;
  const rawConfidenceScore = safeNumber(record.confidenceScore, Number.NaN);

  if (!Number.isFinite(rawConfidenceScore) || rawConfidenceScore < 1 || rawConfidenceScore > 5) {
    throw new AdminApiError(400, "practice_reflection_confidence_invalid", "Choose a confidence score from 1 to 5.");
  }

  const confidenceScore = Math.floor(rawConfidenceScore);

  return stripUndefined({
    whatWentWell: normalizeReflectionText(record.whatWentWell),
    whatWentWrong: normalizeReflectionText(record.whatWentWrong),
    improveNextTime: normalizeReflectionText(record.improveNextTime),
    confidenceScore,
    updatedAt
  });
}

function normalizeOrderType(value: unknown): PracticeOrderType {
  if (value === "limit" || value === "stop") {
    return value;
  }

  return "market";
}

function normalizeOrderStatus(value: unknown): PracticeOrderStatus {
  if (
    value === "draft" ||
    value === "pending" ||
    value === "open" ||
    value === "closed" ||
    value === "cancelled" ||
    value === "rejected"
  ) {
    return value;
  }

  return "draft";
}

function normalizeSessionStatus(value: unknown): PracticeSessionSummary["status"] {
  if (
    value === "active" ||
    value === "completed" ||
    value === "abandoned" ||
    value === "archived" ||
    value === "draft"
  ) {
    return value;
  }

  return "draft";
}

function normalizeRestorableSessionStatus(value: unknown): Exclude<PracticeSessionSummary["status"], "archived"> {
  if (value === "active" || value === "completed" || value === "abandoned" || value === "draft") {
    return value;
  }

  return "active";
}

function normalizeCloseReason(value: unknown): PracticeOrderCloseReason | undefined {
  return value === "manual" ||
    value === "stop_loss" ||
    value === "take_profit" ||
    value === "trailing_stop" ||
    value === "auto_breakeven" ||
    value === "session_completed" ||
    value === "cancelled" ||
    value === "rejected"
    ? value
    : undefined;
}

function mapInstrumentSpec(value: unknown): PracticeInstrumentSpecSummary | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const assetClass = record.assetClass === "forex_cfd" ? "forex_cfd" : record.assetClass === "crypto" ? "crypto" : undefined;
  const canonicalSymbol = normalizeSymbol(record.canonicalSymbol);

  if (!assetClass || !canonicalSymbol) {
    return undefined;
  }

  const fallback = getPracticeInstrumentSpec(assetClass, canonicalSymbol);

  return {
    canonicalSymbol,
    assetClass,
    displayName: safeString(record.displayName).slice(0, 80) || fallback?.displayName || canonicalSymbol,
    category: record.category === "forex_major" ||
      record.category === "forex_cross" ||
      record.category === "metals_cfd" ||
      record.category === "indices_cfd" ||
      record.category === "energy_cfd" ||
      record.category === "crypto_spot"
      ? record.category
      : fallback?.category ?? "crypto_spot",
    pricePrecision: Math.max(0, Math.min(Math.floor(safeNumber(record.pricePrecision, fallback?.pricePrecision ?? 2)), 8)),
    quantityPrecision: Math.max(0, Math.min(Math.floor(safeNumber(record.quantityPrecision, fallback?.quantityPrecision ?? 6)), 8)),
    quantityStep: Math.max(0.00000001, safeNumber(record.quantityStep, fallback?.quantityStep ?? 0.000001)),
    quantityLabel: safeString(record.quantityLabel).slice(0, 24) || fallback?.quantityLabel || "Qty",
    tickSize: Math.max(0.00000001, safeNumber(record.tickSize, fallback?.tickSize ?? fallback?.pipSize ?? 0.01)),
    pipSize: Math.max(0.00000001, safeNumber(record.pipSize, fallback?.pipSize ?? 0.01)),
    pipLabel: safeString(record.pipLabel).slice(0, 16) || fallback?.pipLabel || "tick",
    contractMultiplier: Math.max(0.00000001, safeNumber(record.contractMultiplier, fallback?.contractMultiplier ?? 1)),
    minSimulatedSize: Math.max(0, safeNumber(record.minSimulatedSize, fallback?.minSimulatedSize ?? 0.000001)),
    maxSimulatedSize: Math.max(0, safeNumber(record.maxSimulatedSize, fallback?.maxSimulatedSize ?? 1_000_000)),
    minSimulatedNotional: Math.max(0, safeNumber(record.minSimulatedNotional, fallback?.minSimulatedNotional ?? 1)),
    maxSimulatedNotional: Math.max(0, safeNumber(record.maxSimulatedNotional, fallback?.maxSimulatedNotional ?? 10_000_000)),
    safeMessage: safeString(record.safeMessage).slice(0, 180) || fallback?.safeMessage || "Practice instrument specs are safe simulation metadata."
  };
}

function mapCloseEvent(value: unknown): PracticeOrderCloseEvent | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const closeReason = normalizeCloseReason(record.closeReason);
  const eventType = record.eventType === "full_close" ? "full_close" : "partial_close";
  const candleTime = record.candleTime ? new Date(String(record.candleTime)).toISOString() : new Date().toISOString();
  const createdAt = record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString();

  if (!closeReason) {
    return null;
  }

  return {
    eventId: safeId(record.eventId) || deterministicId(["practice_close_event", candleTime, String(record.closedSize)]),
    eventType,
    closedSize: Math.max(0, safeNumber(record.closedSize, 0)),
    remainingSize: Math.max(0, safeNumber(record.remainingSize, 0)),
    exitPrice: Math.max(0, safeNumber(record.exitPrice, 0)),
    notional: record.notional === undefined ? undefined : safeNumber(record.notional, 0),
    pnl: safeNumber(record.pnl, 0),
    rMultiple: record.rMultiple === undefined ? undefined : safeNumber(record.rMultiple, 0),
    instrument: mapInstrumentSpec(record.instrument),
    closeReason,
    candleIndex: Math.max(0, Math.floor(safeNumber(record.candleIndex, 0))),
    candleTime,
    safeMessage: safeString(record.safeMessage).slice(0, 180) || "Simulated practice close event.",
    createdAt
  };
}

function normalizeReplayIndex(value: unknown) {
  const index = Math.floor(safeNumber(value, Number.NaN));

  if (!Number.isFinite(index) || index < 0) {
    throw new AdminApiError(400, "practice_replay_index_invalid", "Choose a valid candle reveal index.");
  }

  return index;
}

function mapPlaybook(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  playbookId: string;
}): PracticePlaybookSummary {
  return {
    playbookId: safeString(record.playbookId) || ids.playbookId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    name: safeString(record.name) || "Untitled playbook",
    market: normalizeOptionalPracticeMarket(record.market),
    strategyType: safeString(record.strategyType).slice(0, 80) || "general",
    setupRules: safeString(record.setupRules).slice(0, 1000),
    entryChecklist: normalizeChecklist(record.entryChecklist),
    invalidationRules: safeString(record.invalidationRules).slice(0, 1000),
    riskNotes: safeString(record.riskNotes).slice(0, 1000),
    status: normalizePlaybookStatus(record.status, record.archivedAt),
    description: safeString(record.description) || undefined,
    archivedAt: record.archivedAt ? new Date(String(record.archivedAt)).toISOString() : undefined,
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString()
  };
}

function mapPracticeCohort(record: Record<string, unknown>, ids: {
  workspaceId: string;
  cohortId: string;
}): PracticeCohortSummary {
  return stripUndefined({
    cohortId: safeString(record.cohortId) || ids.cohortId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    name: safeString(record.name).replace(/\s+/g, " ").slice(0, 120) || "Practice cohort",
    description: safeString(record.description).replace(/\s+/g, " ").slice(0, 700) || undefined,
    status: normalizePracticeCohortStatus(record.status, record.archivedAt),
    studentRefs: normalizeStudentRefs(record.studentRefs),
    archivedAt: record.archivedAt ? new Date(String(record.archivedAt)).toISOString() : undefined,
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString(),
    safeMessage: "Practice cohort stores workspace-owned opaque student refs only."
  });
}

function mapPracticeAssignment(record: Record<string, unknown>, ids: {
  workspaceId: string;
  assignmentId: string;
}): PracticeAssignmentSummary {
  const assetClass = record.assetClass === "forex_cfd" ? "forex_cfd" : "crypto";
  const startingBalance = record.startingBalance === undefined
    ? undefined
    : Math.max(1, Math.min(safeNumber(record.startingBalance, 1000), 1_000_000));

  return stripUndefined({
    assignmentId: safeString(record.assignmentId) || ids.assignmentId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    title: safeString(record.title).replace(/\s+/g, " ").slice(0, 120) || "Practice assignment",
    description: safeString(record.description).replace(/\s+/g, " ").slice(0, 1400),
    assetClass,
    symbol: normalizeSymbol(record.symbol || (assetClass === "crypto" ? "BTCUSDT" : "XAUUSD")),
    timeframeMinutes: normalizeTimeframe(record.timeframeMinutes || 60),
    dateStart: record.dateStart ? new Date(String(record.dateStart)).toISOString() : undefined,
    dateEnd: record.dateEnd ? new Date(String(record.dateEnd)).toISOString() : undefined,
    randomStartEnabled: record.randomStartEnabled === true,
    startingBalance,
    riskPct: record.riskPct === undefined ? undefined : Math.max(0.1, Math.min(safeNumber(record.riskPct, 1), 10)),
    challenge: mapChallengeConfig(record.challenge, startingBalance ?? 1000),
    suggestedPlaybook: normalizeSuggestedPlaybook(record.suggestedPlaybook),
    availabilityStartDate: record.availabilityStartDate ? new Date(String(record.availabilityStartDate)).toISOString() : undefined,
    dueDate: record.dueDate ? new Date(String(record.dueDate)).toISOString() : undefined,
    closeDate: record.closeDate ? new Date(String(record.closeDate)).toISOString() : undefined,
    targetCohortIds: normalizeCohortIds(record.targetCohortIds),
    status: normalizePracticeAssignmentStatus(record.status, record.archivedAt),
    archivedAt: record.archivedAt ? new Date(String(record.archivedAt)).toISOString() : undefined,
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString()
  });
}

function instructorFeedbackId(sessionId: string) {
  return deterministicId(["practice_instructor_feedback", sessionId]);
}

function maskFeedbackTargetRef(workspaceId: string, studentId: string, sessionId: string) {
  const digest = createHash("sha256")
    .update([workspaceId, studentId, sessionId, "practice_feedback"].join(":"))
    .digest("hex")
    .slice(0, 16);

  return `feedback_${digest}`;
}

function mapInstructorFeedback(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  sessionId: string;
  feedbackId: string;
}): PracticeInstructorFeedbackRecord {
  const now = new Date().toISOString();
  const sessionId = safeId(record.sessionId) || ids.sessionId;
  const studentId = safeString(record.studentId) || ids.studentId;
  const workspaceId = safeString(record.workspaceId) || ids.workspaceId;
  const reviewedAt = record.reviewedAt ? normalizeIso(record.reviewedAt, "practice_feedback_reviewed_at") : undefined;
  const publishedAt = record.publishedAt ? normalizeIso(record.publishedAt, "practice_feedback_published_at") : undefined;
  const maskedSessionRef = safeString(record.maskedSessionRef) || maskPracticeSessionRef(workspaceId, studentId, sessionId);

  return {
    feedbackId: safeString(record.feedbackId) || ids.feedbackId,
    workspaceId,
    studentId,
    assignmentId: safeId(record.assignmentId),
    sessionId,
    feedbackTargetRef: safeString(record.feedbackTargetRef) || maskFeedbackTargetRef(workspaceId, studentId, sessionId),
    maskedStudentId: safeString(record.maskedStudentId) || maskPracticeStudentId(studentId),
    maskedSessionRef,
    reviewerId: safeString(record.reviewerId).slice(0, 120) || "workspace_reviewer",
    reviewerDisplayLabel: sanitizeFeedbackText(record.reviewerDisplayLabel, 80) || "Workspace instructor",
    status: normalizeInstructorFeedbackStatus(record.status, reviewedAt),
    publicationStatus: normalizeInstructorFeedbackPublicationStatus(record.publicationStatus, publishedAt),
    rubric: normalizeInstructorFeedbackRubric(record.rubric),
    feedbackNote: sanitizeFeedbackText(record.feedbackNote, 900),
    recommendedNextDrill: sanitizeFeedbackText(record.recommendedNextDrill, 160) || undefined,
    resubmissionRequest: normalizeResubmissionRequest(record.resubmissionRequest, maskedSessionRef),
    reviewedAt,
    publishedAt,
    createdAt: record.createdAt ? normalizeIso(record.createdAt, "practice_feedback_created_at") : now,
    updatedAt: record.updatedAt ? normalizeIso(record.updatedAt, "practice_feedback_updated_at") : now,
    safeMessage: sanitizeFeedbackText(record.safeMessage, 180) || "Instructor feedback is a bounded rubric summary for a completed practice assignment."
  };
}

function toInstructorFeedbackSummary(feedback?: PracticeInstructorFeedbackRecord): PracticeInstructorFeedbackSummary | undefined {
  if (!feedback) {
    return undefined;
  }

  return stripUndefined({
    feedbackId: feedback.feedbackId,
    assignmentId: feedback.assignmentId,
    feedbackTargetRef: feedback.feedbackTargetRef,
    maskedStudentId: feedback.maskedStudentId,
    maskedSessionRef: feedback.maskedSessionRef,
    reviewerDisplayLabel: feedback.reviewerDisplayLabel,
    status: feedback.status,
    publicationStatus: feedback.publicationStatus,
    rubric: feedback.rubric,
    feedbackNote: feedback.feedbackNote,
    recommendedNextDrill: feedback.recommendedNextDrill,
    resubmissionRequest: feedback.resubmissionRequest,
    reviewedAt: feedback.reviewedAt,
    publishedAt: feedback.publishedAt,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    safeMessage: feedback.safeMessage
  });
}

function mapSession(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  sessionId: string;
}): PracticeSessionSummary {
  const assetClass = record.assetClass === "forex_cfd" ? "forex_cfd" : "crypto";
  const startingBalance = Math.max(1, safeNumber(record.startingBalance, 1000));
  const status = normalizeSessionStatus(record.status);

  return {
    sessionId: safeString(record.sessionId) || ids.sessionId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    sessionName: safeString(record.sessionName).slice(0, 80) || undefined,
    assetClass,
    platformSource: assetClass === "crypto" ? "binance" : "metaapi_mt5",
    symbol: normalizeSymbol(record.symbol || "BTCUSDT"),
    instrument: mapInstrumentSpec(record.instrument),
    timeframeMinutes: normalizeTimeframe(record.timeframeMinutes || 60),
    dateStart: record.dateStart ? new Date(String(record.dateStart)).toISOString() : new Date().toISOString(),
    dateEnd: record.dateEnd ? new Date(String(record.dateEnd)).toISOString() : new Date().toISOString(),
    requestedDateStart: record.requestedDateStart ? new Date(String(record.requestedDateStart)).toISOString() : undefined,
    requestedDateEnd: record.requestedDateEnd ? new Date(String(record.requestedDateEnd)).toISOString() : undefined,
    randomStartEnabled: record.randomStartEnabled === true,
    randomizedAt: record.randomizedAt ? new Date(String(record.randomizedAt)).toISOString() : undefined,
    startingBalance,
    riskPct: Math.max(0.1, Math.min(safeNumber(record.riskPct, 1), 10)),
    feeBps: normalizeAssumptionBps(record.feeBps),
    spreadBps: normalizeAssumptionBps(record.spreadBps),
    slippageBps: normalizeAssumptionBps(record.slippageBps),
    playbookId: safeString(record.playbookId) || undefined,
    assignmentId: safeId(record.assignmentId) || undefined,
    assignmentSnapshot: mapPracticeAssignmentSnapshot(record.assignmentSnapshot),
    assignmentAttemptNumber: record.assignmentAttemptNumber === undefined ? undefined : Math.max(1, Math.floor(safeNumber(record.assignmentAttemptNumber, 1))),
    previousAttemptMaskedSessionRef: safeString(record.previousAttemptMaskedSessionRef).slice(0, 80) || undefined,
    resubmissionSourceFeedbackId: safeId(record.resubmissionSourceFeedbackId) || undefined,
    resubmissionStatus: normalizeAssignmentResubmissionStatus(record.resubmissionStatus),
    challenge: mapChallengeConfig(record.challenge, startingBalance),
    challengeResult: mapChallengeResult(record.challengeResult),
    status,
    currentCandleIndex: Math.max(0, Math.floor(safeNumber(record.currentCandleIndex, 0))),
    reflection: mapReflection(record.reflection),
    archivedAt: record.archivedAt ? new Date(String(record.archivedAt)).toISOString() : undefined,
    archivedFromStatus: record.archivedFromStatus ? normalizeRestorableSessionStatus(record.archivedFromStatus) : undefined,
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString(),
    completedAt: record.completedAt ? new Date(String(record.completedAt)).toISOString() : undefined
  };
}

function mapOrder(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  orderId: string;
}): PracticeOrderSummary {
  return {
    orderId: safeString(record.orderId) || ids.orderId,
    sessionId: safeString(record.sessionId) || "unknown_session",
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    orderType: normalizeOrderType(record.orderType),
    direction: record.direction === "sell" ? "sell" : "buy",
    status: normalizeOrderStatus(record.status),
    requestedPrice: Math.max(0, safeNumber(record.requestedPrice, 0)),
    filledPrice: record.filledPrice === undefined ? undefined : safeNumber(record.filledPrice, 0),
    size: record.size === undefined ? undefined : safeNumber(record.size, 0),
    remainingSize: record.remainingSize === undefined ? undefined : safeNumber(record.remainingSize, 0),
    closedSize: record.closedSize === undefined ? undefined : safeNumber(record.closedSize, 0),
    notional: record.notional === undefined ? undefined : safeNumber(record.notional, 0),
    instrument: mapInstrumentSpec(record.instrument),
    stopDistance: record.stopDistance === undefined ? undefined : safeNumber(record.stopDistance, 0),
    stopDistanceInPips: record.stopDistanceInPips === undefined ? undefined : safeNumber(record.stopDistanceInPips, 0),
    stopLoss: record.stopLoss === undefined ? undefined : safeNumber(record.stopLoss, 0),
    takeProfit: record.takeProfit === undefined ? undefined : safeNumber(record.takeProfit, 0),
    riskAmount: record.riskAmount === undefined ? undefined : safeNumber(record.riskAmount, 0),
    playbookId: safeId(record.playbookId) || undefined,
    playbookName: safeString(record.playbookName).slice(0, 80) || undefined,
    trailingStopDistance: record.trailingStopDistance === undefined ? undefined : safeNumber(record.trailingStopDistance, 0),
    autoBreakevenTrigger: record.autoBreakevenTrigger === undefined ? undefined : safeNumber(record.autoBreakevenTrigger, 0),
    openedAtCandleTime: record.openedAtCandleTime ? new Date(String(record.openedAtCandleTime)).toISOString() : undefined,
    closedAtCandleTime: record.closedAtCandleTime ? new Date(String(record.closedAtCandleTime)).toISOString() : undefined,
    closeReason: normalizeCloseReason(record.closeReason),
    pnl: record.pnl === undefined ? undefined : safeNumber(record.pnl, 0),
    fees: record.fees === undefined ? undefined : Math.max(0, safeNumber(record.fees, 0)),
    rMultiple: record.rMultiple === undefined ? undefined : safeNumber(record.rMultiple, 0),
    mfeR: record.mfeR === undefined ? undefined : safeNumber(record.mfeR, 0),
    maeR: record.maeR === undefined ? undefined : safeNumber(record.maeR, 0),
    tags: Array.isArray(record.tags) ? record.tags.map(safeString).filter(Boolean).slice(0, 12) : [],
    checklistNotes: safeString(record.checklistNotes).slice(0, 500) || undefined,
    notes: safeString(record.notes).slice(0, 500) || undefined,
    screenshotUrls: Array.isArray(record.screenshotUrls) ? record.screenshotUrls.map(safeString).filter(Boolean).slice(0, 6) : [],
    evaluatedThroughCandleIndex: record.evaluatedThroughCandleIndex === undefined ? undefined : Math.max(0, Math.floor(safeNumber(record.evaluatedThroughCandleIndex, 0))),
    safeMessage: safeString(record.safeMessage).slice(0, 180) || undefined,
    closeEvents: Array.isArray(record.closeEvents) ? record.closeEvents.map(mapCloseEvent).filter((event): event is PracticeOrderCloseEvent => Boolean(event)).slice(0, 50) : [],
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString()
  };
}

function mapPracticeDrawingChartPoints(value: unknown): PracticeDrawingChartPoint[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const points = value.slice(0, PRACTICE_DRAWING_POINT_LIMIT).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const point = entry as Record<string, unknown>;
    const dataIndex = safeNumber(point.dataIndex, Number.NaN);
    const value = point.value === undefined ? undefined : safeNumber(point.value, Number.NaN);

    if (!Number.isFinite(dataIndex) || (value !== undefined && (!Number.isFinite(value) || value < 0))) {
      return [];
    }

    return [{
      dataIndex: Math.round(dataIndex * 1_000_000) / 1_000_000,
      ...(value === undefined ? {} : { value })
    } satisfies PracticeDrawingChartPoint];
  });

  return points.length ? points : undefined;
}

function requiresTwoPracticeDrawingPoints(kind: PracticeAnnotationKind) {
  return kind === "trend_line" ||
    kind === "zone" ||
    kind === "fibonacci_retracement" ||
    kind === "measurement_placeholder";
}

function mapAnnotation(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  annotationId: string;
}): PracticeAnnotationSummary {
  const annotationId = safeString(record.annotationId) || ids.annotationId;
  const kind = normalizeAnnotationKind(record.kind);

  return {
    annotationId,
    drawingId: safeString(record.drawingId) || annotationId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    sessionId: safeId(record.sessionId) || "unknown_session",
    orderId: safeId(record.orderId) || undefined,
    eventId: safeId(record.eventId) || undefined,
    candleIndex: record.candleIndex === undefined ? undefined : Math.max(0, Math.floor(safeNumber(record.candleIndex, 0))),
    secondCandleIndex: record.secondCandleIndex === undefined ? undefined : Math.max(0, Math.floor(safeNumber(record.secondCandleIndex, 0))),
    priceLevel: record.priceLevel === undefined ? undefined : Math.max(0, safeNumber(record.priceLevel, 0)),
    secondPriceLevel: record.secondPriceLevel === undefined ? undefined : Math.max(0, safeNumber(record.secondPriceLevel, 0)),
    coordinateVersion: record.coordinateVersion === "klinecharts_v1" || record.coordinateVersion === "klinecharts_v2" ? record.coordinateVersion : undefined,
    chartPoints: mapPracticeDrawingChartPoints(record.chartPoints),
    kind,
    label: normalizeAnnotationLabel(record.label, defaultTextForAnnotationKind(kind)) || undefined,
    text: normalizeStoredAnnotationText(record.text, defaultTextForAnnotationKind(kind), kind),
    colorToken: normalizeDrawingColorToken(record.colorToken),
    appearanceVersion: normalizeDrawingAppearanceVersion(record.appearanceVersion),
    isMainLesson: record.isMainLesson === true,
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString()
  };
}

function mapBookmark(record: Record<string, unknown>, ids: {
  workspaceId: string;
  studentId: string;
  bookmarkId: string;
}): PracticeBookmarkSummary {
  return {
    bookmarkId: safeString(record.bookmarkId) || ids.bookmarkId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    sessionId: safeId(record.sessionId) || "unknown_session",
    candleIndex: Math.max(0, Math.floor(safeNumber(record.candleIndex, 0))),
    candleTime: record.candleTime ? new Date(String(record.candleTime)).toISOString() : undefined,
    priceLevel: record.priceLevel === undefined ? undefined : Math.max(0, safeNumber(record.priceLevel, 0)),
    label: normalizeBookmarkText(record.label),
    note: normalizeBookmarkText(record.note),
    orderId: safeId(record.orderId) || undefined,
    drawingId: safeId(record.drawingId) || undefined,
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : new Date().toISOString()
  };
}

async function listPlaybooks(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_VISIBLE_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapPlaybook({ playbookId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      playbookId: doc.id
    })
  );
}

async function listSessions(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_SESSION_DASHBOARD_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapSession({ sessionId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      sessionId: doc.id
    })
  );
}

async function listOrders(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_VISIBLE_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
}

async function listOrdersForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .where("sessionId", "==", sessionId)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_VISIBLE_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
}

async function listExportPlaybooks(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_EXPORT_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapPlaybook({ playbookId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      playbookId: doc.id
    })
  );
}

async function listExportSessions(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_EXPORT_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapSession({ sessionId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      sessionId: doc.id
    })
  );
}

async function listExportOrders(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_EXPORT_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
}

async function listAnalyticsSessions(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_ANALYTICS_SESSION_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapSession({ sessionId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      sessionId: doc.id
    })
  );
}

async function listAnalyticsOrders(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_ANALYTICS_ORDER_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
}

async function listExportAnnotations(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations`)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_EXPORT_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapAnnotation({ annotationId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      annotationId: doc.id
    })
  );
}

async function listChallengeOrdersForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .where("sessionId", "==", sessionId)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_CHALLENGE_ORDER_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
}

async function listReportOrdersForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .where("sessionId", "==", sessionId)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_REPORT_ORDER_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
}

async function listReportAnnotationsForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations`)
    .where("sessionId", "==", sessionId)
    .orderBy("updatedAt", "desc")
    .limit(PRACTICE_REPORT_ANNOTATION_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapAnnotation({ annotationId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      annotationId: doc.id
    })
  );
}

async function listAnnotationsForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations`)
    .where("sessionId", "==", sessionId)
    .limit(PRACTICE_ANNOTATION_VISIBLE_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) =>
      mapAnnotation({ annotationId: doc.id, ...doc.data() }, {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        annotationId: doc.id
      })
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function listBookmarksForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_bookmarks`)
    .where("sessionId", "==", sessionId)
    .limit(PRACTICE_BOOKMARK_VISIBLE_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) =>
      mapBookmark({ bookmarkId: doc.id, ...doc.data() }, {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        bookmarkId: doc.id
      })
    )
    .sort((left, right) => left.candleIndex - right.candleIndex || left.updatedAt.localeCompare(right.updatedAt));
}

async function listVisibleEventsForSession(actor: VerifiedStudent, session: PracticeSessionSummary) {
  try {
    const result = await fetchSessionCandles(actor, session);
    const revealedCandles = result.candles.slice(0, Math.max(0, Math.floor(session.currentCandleIndex)) + 1);

    return listVisiblePracticeEventsForRevealedCandles({
      session,
      revealedCandles
    });
  } catch {
    return [];
  }
}

async function getPracticeBookmarkSnapshot(actor: VerifiedStudent, bookmarkId: string) {
  const safeBookmarkId = safeId(bookmarkId);

  if (!safeBookmarkId) {
    throw new AdminApiError(400, "practice_bookmark_required", "Choose a practice bookmark.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_bookmarks/${safeBookmarkId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_bookmark_not_found", "TradeHub could not find that practice bookmark.");
  }

  return {
    ref,
    bookmark: mapBookmark({ bookmarkId: safeBookmarkId, ...snapshot.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      bookmarkId: safeBookmarkId
    })
  };
}

async function getPracticeAnnotationSnapshot(actor: VerifiedStudent, annotationId: string) {
  const safeAnnotationId = safeId(annotationId);

  if (!safeAnnotationId) {
    throw new AdminApiError(400, "practice_annotation_required", "Choose a practice annotation.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations/${safeAnnotationId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_annotation_not_found", "TradeHub could not find that practice annotation.");
  }

  return {
    ref,
    annotation: mapAnnotation({ annotationId: safeAnnotationId, ...snapshot.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      annotationId: safeAnnotationId
    })
  };
}

async function getPracticeSessionSnapshot(actor: VerifiedStudent, sessionId: string) {
  const safeSessionId = safeId(sessionId);

  if (!safeSessionId) {
    throw new AdminApiError(400, "practice_session_required", "Choose a practice session.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions/${safeSessionId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_session_not_found", "TradeHub could not find that practice session.");
  }

  const session = mapSession({ sessionId: safeSessionId, ...snapshot.data() }, {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    sessionId: safeSessionId
  });

  return {
    ref,
    session
  };
}

async function getPracticePlaybookSnapshot(actor: VerifiedStudent, playbookId: string) {
  const safePlaybookId = safeId(playbookId);

  if (!safePlaybookId) {
    throw new AdminApiError(400, "practice_playbook_required", "Choose a Strategy before submitting a simulated order.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks/${safePlaybookId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_playbook_not_found", "TradeHub could not find that Strategy.");
  }

  const playbook = mapPlaybook({ playbookId: safePlaybookId, ...snapshot.data() }, {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    playbookId: safePlaybookId
  });

  if (playbook.status !== "active") {
    throw new AdminApiError(409, "practice_playbook_archived", "Choose an active Strategy before submitting a simulated order.");
  }

  return {
    ref,
    playbook
  };
}

function assertPracticeSessionMutable(session: PracticeSessionSummary) {
  if (session.status === "completed" || session.status === "abandoned" || session.status === "archived") {
    throw new AdminApiError(409, "practice_session_locked", "Completed, abandoned, or archived practice sessions cannot be changed.");
  }
}

async function getPracticeOrderSnapshot(actor: VerifiedStudent, orderId: string) {
  const safeOrderId = safeId(orderId);

  if (!safeOrderId) {
    throw new AdminApiError(400, "practice_order_required", "Choose a simulated practice order.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders/${safeOrderId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_order_not_found", "TradeHub could not find that simulated practice order.");
  }

  const order = mapOrder({ orderId: safeOrderId, ...snapshot.data() }, {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    orderId: safeOrderId
  });

  return {
    ref,
    order
  };
}

function candleRequestForSession(session: PracticeSessionSummary) {
  return {
    assetClass: session.assetClass,
    symbol: session.symbol,
    timeframeMinutes: session.timeframeMinutes,
    rangeStart: session.dateStart,
    rangeEnd: session.dateEnd
  };
}

async function fetchSessionCandles(actor: VerifiedStudent, session: PracticeSessionSummary) {
  return fetchHistoricalCandlesWithCache(actor.workspaceId, candleRequestForSession(session), {
    allowExpiredCache: true
  });
}

async function writePracticeLedgerIfClosed(session: PracticeSessionSummary, order: PracticeOrderSummary) {
  if (order.status !== "closed") {
    return;
  }

  await writeAccountLinkedLedgerEntry(mapPracticeBacktestOrderToLedgerEntry({ session, order }));
}

async function writePracticeCloseEventLedger(session: PracticeSessionSummary, order: PracticeOrderSummary, event: PracticeOrderCloseEvent) {
  await writeAccountLinkedLedgerEntry(mapPracticeBacktestCloseEventToLedgerEntry({ session, order, event }));
}

async function persistPracticeChallengeResultIfNeeded(input: {
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  forceFinal?: boolean;
}) {
  const challengeStatus = computePracticeChallengeStatus({
    session: input.session,
    orders: input.orders
  });

  if (!challengeStatus) {
    return undefined;
  }

  const shouldPersist = input.forceFinal || challengeStatus.status === "failed";

  if (shouldPersist) {
    const { db } = getFirebaseAdminClients();

    await db
      .doc(`workspaces/${input.session.workspaceId}/students/${input.session.studentId}/practice_sessions/${input.session.sessionId}`)
      .set({ challengeResult: stripUndefined(challengeStatus), updatedAt: new Date().toISOString() }, { merge: true });
  }

  return challengeStatus;
}

const sessionExportHeaders = [
  "sessionId",
  "sessionName",
  "assetClass",
  "symbol",
  "instrumentDisplayName",
  "pricePrecision",
  "quantityPrecision",
  "quantityStep",
  "quantityLabel",
  "pipTickLabel",
  "tickSize",
  "minSimulatedQuantity",
  "maxSimulatedQuantity",
  "minSimulatedNotional",
  "maxSimulatedNotional",
  "timeframeMinutes",
  "dateStart",
  "dateEnd",
  "status",
  "currentCandleIndex",
  "startingBalance",
  "riskPct",
  "feeBps",
  "spreadBps",
  "slippageBps",
  "playbookId",
  "challengeEnabled",
  "challengeStatus",
  "archivedAt",
  "archivedFromStatus",
  "createdAt",
  "updatedAt",
  "completedAt"
];
const orderExportHeaders = [
  "orderId",
  "sessionId",
  "orderType",
  "direction",
  "status",
  "instrumentSymbol",
  "instrumentDisplayName",
  "pricePrecision",
  "quantityPrecision",
  "quantityStep",
  "quantityLabel",
  "pipTickLabel",
  "tickSize",
  "minSimulatedNotional",
  "maxSimulatedNotional",
  "stopDistance",
  "stopDistanceInPips",
  "requestedPrice",
  "filledPrice",
  "size",
  "remainingSize",
  "closedSize",
  "notional",
  "stopLoss",
  "takeProfit",
  "riskAmount",
  "playbookId",
  "playbookName",
  "openedAtCandleTime",
  "closedAtCandleTime",
  "closeReason",
  "pnl",
  "rMultiple",
  "evaluatedThroughCandleIndex",
  "tags",
  "checklistNotes",
  "notes",
  "createdAt",
  "updatedAt"
];
const closedTradeExportHeaders = [
  "orderId",
  "sessionId",
  "playbookId",
  "playbookName",
  "direction",
  "entryPrice",
  "instrumentSymbol",
  "quantityLabel",
  "pipTickLabel",
  "exitTime",
  "closeReason",
  "closedSize",
  "pnl",
  "rMultiple",
  "partialCloseCount",
  "fullCloseCount"
];
const playbookExportHeaders = [
  "playbookId",
  "name",
  "market",
  "strategyType",
  "status",
  "setupRules",
  "entryChecklist",
  "invalidationRules",
  "riskNotes",
  "description",
  "createdAt",
  "updatedAt",
  "archivedAt"
];
const annotationExportHeaders = [
  "annotationId",
  "drawingId",
  "sessionId",
  "orderId",
  "eventId",
  "kind",
  "label",
  "text",
  "candleIndex",
  "secondCandleIndex",
  "priceLevel",
  "secondPriceLevel",
  "colorToken",
  "isMainLesson",
  "createdAt",
  "updatedAt"
];
const reflectionExportHeaders = [
  "sessionId",
  "sessionName",
  "symbol",
  "status",
  "whatWentWell",
  "whatWentWrong",
  "improveNextTime",
  "confidenceScore",
  "updatedAt",
  "completedAt"
];

function sessionExportRow(session: PracticeSessionSummary): PracticeExportRow {
  const instrument = session.instrument ?? getPracticeInstrumentSpec(session.assetClass, session.symbol);

  return {
    sessionId: session.sessionId,
    sessionName: session.sessionName ?? "",
    assetClass: session.assetClass,
    symbol: session.symbol,
    instrumentDisplayName: instrument?.displayName ?? "",
    pricePrecision: instrument?.pricePrecision ?? "",
    quantityPrecision: instrument?.quantityPrecision ?? "",
    quantityStep: instrument?.quantityStep ?? "",
    quantityLabel: instrument?.quantityLabel ?? "",
    pipTickLabel: instrument?.pipLabel ?? "",
    tickSize: instrument?.tickSize ?? instrument?.pipSize ?? "",
    minSimulatedQuantity: instrument?.minSimulatedSize ?? "",
    maxSimulatedQuantity: instrument?.maxSimulatedSize ?? "",
    minSimulatedNotional: instrument?.minSimulatedNotional ?? "",
    maxSimulatedNotional: instrument?.maxSimulatedNotional ?? "",
    timeframeMinutes: session.timeframeMinutes,
    dateStart: session.dateStart,
    dateEnd: session.dateEnd,
    status: session.status,
    currentCandleIndex: session.currentCandleIndex,
    startingBalance: session.startingBalance,
    riskPct: session.riskPct,
    feeBps: session.feeBps ?? 0,
    spreadBps: session.spreadBps ?? 0,
    slippageBps: session.slippageBps ?? 0,
    playbookId: session.playbookId ?? "",
    challengeEnabled: session.challenge?.enabled === true,
    challengeStatus: session.challengeResult?.status ?? "",
    archivedAt: session.archivedAt ?? "",
    archivedFromStatus: session.archivedFromStatus ?? "",
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt ?? ""
  };
}

function orderExportRow(order: PracticeOrderSummary): PracticeExportRow {
  const instrument = order.instrument;

  return {
    orderId: order.orderId,
    sessionId: order.sessionId,
    orderType: order.orderType,
    direction: order.direction,
    status: order.status,
    instrumentSymbol: instrument?.canonicalSymbol ?? "",
    instrumentDisplayName: instrument?.displayName ?? "",
    pricePrecision: instrument?.pricePrecision ?? "",
    quantityPrecision: instrument?.quantityPrecision ?? "",
    quantityStep: instrument?.quantityStep ?? "",
    quantityLabel: instrument?.quantityLabel ?? "",
    pipTickLabel: instrument?.pipLabel ?? "",
    tickSize: instrument?.tickSize ?? instrument?.pipSize ?? "",
    minSimulatedNotional: instrument?.minSimulatedNotional ?? "",
    maxSimulatedNotional: instrument?.maxSimulatedNotional ?? "",
    stopDistance: order.stopDistance ?? "",
    stopDistanceInPips: order.stopDistanceInPips ?? "",
    requestedPrice: order.requestedPrice,
    filledPrice: order.filledPrice ?? "",
    size: order.size ?? "",
    remainingSize: order.remainingSize ?? "",
    closedSize: order.closedSize ?? "",
    notional: order.notional ?? "",
    stopLoss: order.stopLoss ?? "",
    takeProfit: order.takeProfit ?? "",
    riskAmount: order.riskAmount ?? "",
    playbookId: order.playbookId ?? "",
    playbookName: order.playbookName ?? "",
    openedAtCandleTime: order.openedAtCandleTime ?? "",
    closedAtCandleTime: order.closedAtCandleTime ?? "",
    closeReason: order.closeReason ?? "",
    pnl: order.pnl ?? "",
    rMultiple: order.rMultiple ?? "",
    evaluatedThroughCandleIndex: order.evaluatedThroughCandleIndex ?? "",
    tags: order.tags.join("|"),
    checklistNotes: order.checklistNotes ?? "",
    notes: order.notes ?? "",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function closedTradeExportRow(order: PracticeOrderSummary): PracticeExportRow {
  const partialCloseCount = (order.closeEvents ?? []).filter((event) => event.eventType === "partial_close").length;
  const fullCloseCount = (order.closeEvents ?? []).filter((event) => event.eventType === "full_close").length;
  const lastCloseEvent = [...(order.closeEvents ?? [])].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const instrument = order.instrument;

  return {
    orderId: order.orderId,
    sessionId: order.sessionId,
    playbookId: order.playbookId ?? "",
    playbookName: order.playbookName ?? "",
    direction: order.direction,
    entryPrice: order.filledPrice ?? order.requestedPrice,
    instrumentSymbol: instrument?.canonicalSymbol ?? "",
    quantityLabel: instrument?.quantityLabel ?? "",
    pipTickLabel: instrument?.pipLabel ?? "",
    exitTime: order.closedAtCandleTime ?? lastCloseEvent?.candleTime ?? "",
    closeReason: order.closeReason ?? "",
    closedSize: order.closedSize ?? 0,
    pnl: order.pnl ?? 0,
    rMultiple: order.rMultiple ?? "",
    partialCloseCount,
    fullCloseCount
  };
}

function playbookExportRow(playbook: PracticePlaybookSummary): PracticeExportRow {
  return {
    playbookId: playbook.playbookId,
    name: playbook.name,
    market: playbook.market,
    strategyType: playbook.strategyType,
    status: playbook.status,
    setupRules: playbook.setupRules,
    entryChecklist: playbook.entryChecklist.join("|"),
    invalidationRules: playbook.invalidationRules,
    riskNotes: playbook.riskNotes,
    description: playbook.description ?? "",
    createdAt: playbook.createdAt,
    updatedAt: playbook.updatedAt,
    archivedAt: playbook.archivedAt ?? ""
  };
}

function annotationExportRow(annotation: PracticeAnnotationSummary): PracticeExportRow {
  return {
    annotationId: annotation.annotationId,
    drawingId: annotation.drawingId ?? "",
    sessionId: annotation.sessionId,
    orderId: annotation.orderId ?? "",
    eventId: annotation.eventId ?? "",
    kind: annotation.kind,
    label: annotation.label ?? "",
    text: annotation.text,
    candleIndex: annotation.candleIndex ?? "",
    secondCandleIndex: annotation.secondCandleIndex ?? "",
    priceLevel: annotation.priceLevel ?? "",
    secondPriceLevel: annotation.secondPriceLevel ?? "",
    colorToken: annotation.colorToken ?? "",
    isMainLesson: annotation.isMainLesson,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt
  };
}

function reflectionExportRow(session: PracticeSessionSummary): PracticeExportRow {
  return {
    sessionId: session.sessionId,
    sessionName: session.sessionName ?? "",
    symbol: session.symbol,
    status: session.status,
    whatWentWell: session.reflection?.whatWentWell ?? "",
    whatWentWrong: session.reflection?.whatWentWrong ?? "",
    improveNextTime: session.reflection?.improveNextTime ?? "",
    confidenceScore: session.reflection?.confidenceScore ?? "",
    updatedAt: session.reflection?.updatedAt ?? "",
    completedAt: session.completedAt ?? ""
  };
}

function buildCompletedSessionReview(input: {
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  playbooks: PracticePlaybookSummary[];
  annotations: PracticeAnnotationSummary[];
  eventMarkers?: PracticeEventMarkerSummary[];
}): PracticeCompletedSessionReview {
  const performance = computePracticePerformanceSummary({
    session: input.session,
    orders: input.orders
  });
  const playbookPerformance = computePracticePlaybookPerformance({
    playbooks: input.playbooks,
    orders: input.orders,
    sessions: [input.session]
  });
  const playbookExtremes = selectBestWorstPracticePlaybooks(playbookPerformance);
  const recentClosedOrders = input.orders
    .filter((order) => order.status === "closed")
    .sort((left, right) => String(right.closedAtCandleTime ?? right.updatedAt).localeCompare(String(left.closedAtCandleTime ?? left.updatedAt)))
    .slice(0, 5);

  return {
    finalBalance: performance.endingBalance,
    netPnl: performance.netPnl,
    winRate: performance.winRate,
    averageR: performance.averageR,
    profitFactor: performance.profitFactor,
    maxDrawdown: performance.maxDrawdown,
    bestTrade: performance.bestTrade,
    worstTrade: performance.worstTrade,
    bestPlaybook: playbookExtremes.bestPlaybook,
    worstPlaybook: playbookExtremes.worstPlaybook,
    recentClosedOrders,
    annotations: input.annotations,
    mainLesson: input.annotations.find((annotation) => annotation.isMainLesson),
    eventMarkers: input.eventMarkers ?? [],
    challengeStatus: computePracticeChallengeStatus({
      session: input.session,
      orders: input.orders
    }),
    reflection: input.session.reflection,
    safeMessage: "Completed practice-session review is computed server-side from closed simulated orders only."
  };
}

function roundedAnalyticsMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function roundedAnalyticsRatio(value: number) {
  return Math.round(value * 10000) / 10000;
}

function tradeDate(order: PracticeOrderSummary) {
  return String(order.closedAtCandleTime ?? order.updatedAt).slice(0, 10);
}

function computeOrdersAggregate(input: {
  orders: PracticeOrderSummary[];
  sessions: PracticeSessionSummary[];
}): Omit<PracticeSymbolBreakdownSummary, "symbol" | "assetClass" | "sessions"> {
  const sessionMap = new Map(input.sessions.map((session) => [session.sessionId, session]));
  const closedOrders = input.orders
    .filter((order) => order.status === "closed" && sessionMap.has(order.sessionId))
    .sort((left, right) => String(left.closedAtCandleTime ?? left.updatedAt).localeCompare(String(right.closedAtCandleTime ?? right.updatedAt)));
  const results = closedOrders.map((order) => computePracticeOrderNetResult({
    order,
    assumptions: normalizePracticePerformanceAssumptions(sessionMap.get(order.sessionId)!)
  }));
  const wins = results.filter((result) => result.netPnl > 0);
  const losses = results.filter((result) => result.netPnl < 0);
  const positivePnl = wins.reduce((total, result) => total + result.netPnl, 0);
  const negativePnl = Math.abs(losses.reduce((total, result) => total + result.netPnl, 0));
  const rValues = results
    .map((result) => result.rMultiple)
    .filter((value) => Number.isFinite(value));
  let equity = input.sessions.reduce((total, session) => total + safeNumber(session.startingBalance, 0), 0);
  let peak = equity;
  let maxDrawdown = 0;

  for (const result of results) {
    equity += result.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  const netPnl = results.reduce((total, result) => total + result.netPnl, 0);

  return {
    trades: closedOrders.length,
    netPnl: roundedAnalyticsMetric(netPnl),
    winRate: closedOrders.length > 0 ? roundedAnalyticsRatio(wins.length / closedOrders.length) : 0,
    averageR: rValues.length > 0 ? roundedAnalyticsRatio(rValues.reduce((total, value) => total + value, 0) / rValues.length) : 0,
    maxDrawdown: roundedAnalyticsMetric(maxDrawdown),
    profitFactor: negativePnl > 0 ? roundedAnalyticsRatio(positivePnl / negativePnl) : positivePnl > 0 ? roundedAnalyticsRatio(positivePnl) : 0,
    expectancy: closedOrders.length > 0 ? roundedAnalyticsMetric(netPnl / closedOrders.length) : 0
  };
}

function buildPracticeSessionAnalyticsSummary(input: {
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  playbook?: PracticePlaybookSummary;
}): PracticeSessionAnalyticsSummary {
  const performance = computePracticePerformanceSummary({
    session: input.session,
    orders: input.orders
  });
  const challengeStatus = computePracticeChallengeStatus({
    session: input.session,
    orders: input.orders
  });

  return {
    sessionId: input.session.sessionId,
    sessionName: input.session.sessionName,
    symbol: input.session.symbol,
    assetClass: input.session.assetClass,
    timeframeMinutes: input.session.timeframeMinutes,
    status: input.session.status,
    playbookName: input.playbook?.name,
    challengeStatus: challengeStatus?.status,
    startingBalance: performance.startingBalance,
    endingBalance: performance.endingBalance,
    netPnl: performance.netPnl,
    winRate: performance.winRate,
    averageR: performance.averageR,
    maxDrawdown: performance.maxDrawdown,
    profitFactor: performance.profitFactor,
    expectancy: performance.expectancy,
    totalTrades: performance.totalTrades,
    closedTrades: performance.closedTrades,
    updatedAt: input.session.updatedAt,
    completedAt: input.session.completedAt
  };
}

function buildPracticeEquityAndDrawdownCurves(input: {
  sessions: PracticeSessionSummary[];
  orders: PracticeOrderSummary[];
}) {
  const sessionMap = new Map(input.sessions.map((session) => [session.sessionId, session]));
  const closedOrders = input.orders
    .filter((order) => order.status === "closed" && sessionMap.has(order.sessionId))
    .sort((left, right) => String(left.closedAtCandleTime ?? left.updatedAt).localeCompare(String(right.closedAtCandleTime ?? right.updatedAt)));
  const closedSessionIds = new Set(closedOrders.map((order) => order.sessionId));
  let equity = input.sessions
    .filter((session) => closedSessionIds.has(session.sessionId))
    .reduce((total, session) => total + safeNumber(session.startingBalance, 0), 0);
  let peak = equity;

  return closedOrders.map<PracticeAnalyticsCurvePoint>((order, index) => {
    const pnl = computePracticeOrderNetResult({
      order,
      assumptions: normalizePracticePerformanceAssumptions(sessionMap.get(order.sessionId)!)
    }).netPnl;

    equity += pnl;
    peak = Math.max(peak, equity);

    return {
      index: index + 1,
      date: String(order.closedAtCandleTime ?? order.updatedAt),
      sessionId: order.sessionId,
      orderId: order.orderId,
      equity: roundedAnalyticsMetric(equity),
      pnl: roundedAnalyticsMetric(pnl),
      drawdown: roundedAnalyticsMetric(Math.max(0, peak - equity))
    };
  });
}

function buildDailyPracticePnl(input: {
  sessions: PracticeSessionSummary[];
  orders: PracticeOrderSummary[];
}) {
  const sessionMap = new Map(input.sessions.map((session) => [session.sessionId, session]));
  const daily = new Map<string, { pnl: number; trades: number; wins: number; losses: number }>();

  for (const order of input.orders) {
    const session = sessionMap.get(order.sessionId);

    if (order.status !== "closed" || !session) {
      continue;
    }

    const date = tradeDate(order);
    const pnl = computePracticeOrderNetResult({
      order,
      assumptions: normalizePracticePerformanceAssumptions(session)
    }).netPnl;
    const current = daily.get(date) ?? { pnl: 0, trades: 0, wins: 0, losses: 0 };

    current.pnl += pnl;
    current.trades += 1;
    current.wins += pnl > 0 ? 1 : 0;
    current.losses += pnl < 0 ? 1 : 0;
    daily.set(date, current);
  }

  return [...daily.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-60)
    .map(([date, summary]) => ({
      date,
      pnl: roundedAnalyticsMetric(summary.pnl),
      trades: summary.trades,
      wins: summary.wins,
      losses: summary.losses
    }));
}

function buildPracticeAnalyticsCohort(input: {
  sessions: PracticeSessionSummary[];
  orders: PracticeOrderSummary[];
}) {
  const eligibleSessionIds = new Set(input.sessions.map((session) => session.sessionId));
  const eligibleOrders = input.orders.filter((order) => eligibleSessionIds.has(order.sessionId));
  const eligibleClosedOrders = eligibleOrders.filter((order) => order.status === "closed");
  const excludedOrderCount = input.orders.length - eligibleOrders.length;

  return {
    eligibleOrders,
    eligibleClosedOrders,
    coverage: {
      sessionCount: input.sessions.length,
      scannedOrderCount: input.orders.length,
      eligibleOrderCount: eligibleOrders.length,
      eligibleClosedOrderCount: eligibleClosedOrders.length,
      excludedOrderCount,
      safeMessage: excludedOrderCount > 0
        ? excludedOrderCount === 1
          ? "1 bounded order record was excluded because its authoritative practice session was unavailable in this analytics window."
          : `${excludedOrderCount} bounded order records were excluded because their authoritative practice sessions were unavailable in this analytics window.`
        : "Every bounded order record has an authoritative practice session in this analytics window."
    }
  };
}

function buildSymbolBreakdown(input: {
  sessions: PracticeSessionSummary[];
  orders: PracticeOrderSummary[];
}): PracticeSymbolBreakdownSummary[] {
  const sessionsById = new Map(input.sessions.map((session) => [session.sessionId, session]));
  const groupedOrders = new Map<string, PracticeOrderSummary[]>();
  const groupedSessions = new Map<string, PracticeSessionSummary[]>();

  for (const session of input.sessions) {
    const key = `${session.assetClass}:${session.symbol}`;
    groupedSessions.set(key, [...(groupedSessions.get(key) ?? []), session]);
  }

  for (const order of input.orders) {
    const session = sessionsById.get(order.sessionId);

    if (!session) {
      continue;
    }

    const key = `${session.assetClass}:${session.symbol}`;
    groupedOrders.set(key, [...(groupedOrders.get(key) ?? []), order]);
  }

  return [...groupedSessions.entries()]
    .map(([key, sessions]) => {
      const [assetClass, symbol] = key.split(":") as [PracticeAssetClass, string];
      const aggregate = computeOrdersAggregate({
        sessions,
        orders: groupedOrders.get(key) ?? []
      });

      return {
        symbol,
        assetClass,
        sessions: sessions.length,
        ...aggregate
      };
    })
    .sort((left, right) => right.netPnl - left.netPnl)
    .slice(0, 24);
}

function buildChallengeAnalyticsSummary(input: {
  sessions: PracticeSessionSummary[];
  orders: PracticeOrderSummary[];
}): PracticeChallengeAnalyticsSummary {
  const groupedOrders = new Map<string, PracticeOrderSummary[]>();

  for (const order of input.orders) {
    groupedOrders.set(order.sessionId, [...(groupedOrders.get(order.sessionId) ?? []), order]);
  }

  return input.sessions.reduce<PracticeChallengeAnalyticsSummary>((summary, session) => {
    if (session.challenge?.enabled !== true) {
      return summary;
    }

    const challengeStatus = computePracticeChallengeStatus({
      session,
      orders: groupedOrders.get(session.sessionId) ?? []
    })?.status ?? "not_started";

    summary.enabledSessions += 1;

    if (challengeStatus === "active") {
      summary.active += 1;
    } else if (challengeStatus === "passed") {
      summary.passed += 1;
    } else if (challengeStatus === "failed") {
      summary.failed += 1;
    } else {
      summary.notStarted += 1;
    }

    return summary;
  }, {
    enabledSessions: 0,
    notStarted: 0,
    active: 0,
    passed: 0,
    failed: 0
  });
}

export async function getStudentPracticeOverview(actor: VerifiedStudent): Promise<StudentPracticeOverviewResponse> {
  const [playbooks, sessions, orders, instructorFeedback, assetCatalogue] = await Promise.all([
    listPlaybooks(actor),
    listSessions(actor),
    listOrders(actor),
    listStudentInstructorFeedback(actor),
    getPracticeAssetCatalogue()
  ]);
  const sessionPerformance: Record<string, ReturnType<typeof computePracticePerformanceSummary>> = {};
  const sessionChallengeStatus: Record<string, PracticeChallengeSummary> = {};
  const completedSessionReviews: Record<string, PracticeCompletedSessionReview> = {};

  for (const session of sessions) {
    const sessionOrders = orders.filter((order) => order.sessionId === session.sessionId);
    const challengeOrders = session.challenge?.enabled
      ? await listChallengeOrdersForSession(actor, session.sessionId)
      : sessionOrders;

    sessionPerformance[session.sessionId] = computePracticePerformanceSummary({
      session,
      orders: sessionOrders
    });
    const challengeStatus = computePracticeChallengeStatus({ session, orders: challengeOrders });

    if (challengeStatus) {
      sessionChallengeStatus[session.sessionId] = challengeStatus;
    }

    if (session.status === "completed") {
      const annotations = await listAnnotationsForSession(actor, session.sessionId);

      completedSessionReviews[session.sessionId] = buildCompletedSessionReview({
        session,
        playbooks,
        orders: sessionOrders,
        annotations
      });
    }
  }
  const playbookPerformance = computePracticePlaybookPerformance({ playbooks, orders, sessions });
  const playbookExtremes = selectBestWorstPracticePlaybooks(playbookPerformance);

  return {
    ...createSourceMeta(["Practice/backtesting is simulated learning data and remains separate from AutoCopy."]),
    ok: true,
    playbooks,
    sessions,
    sessionPerformance,
    sessionChallengeStatus,
    completedSessionReviews,
    playbookPerformance,
    ...playbookExtremes,
    orders,
    instructorFeedback,
    limits: {
      visibleLimit: PRACTICE_VISIBLE_LIMIT,
      maxCandlesPerRequest: historicalDataLimits.maxCandlesPerRequest,
      maxRangeDays: historicalDataLimits.maxRangeDays,
      supportedTimeframes: historicalDataLimits.supportedTimeframes,
      supportedCryptoSymbols: historicalDataLimits.supportedCryptoSymbols,
      supportedForexCfdSymbols: historicalDataLimits.supportedForexCfdSymbols,
      assetCatalogue
    }
  };
}

export async function getStudentPracticeAnalytics(actor: VerifiedStudent): Promise<StudentPracticeAnalyticsResponse> {
  const [sessions, orders, playbooks] = await Promise.all([
    listAnalyticsSessions(actor),
    listAnalyticsOrders(actor),
    listExportPlaybooks(actor)
  ]);
  const analyticsCohort = buildPracticeAnalyticsCohort({ sessions, orders });
  const eligibleOrders = analyticsCohort.eligibleOrders;
  const eligibleClosedOrders = analyticsCohort.eligibleClosedOrders;
  const playbooksById = new Map(playbooks.map((playbook) => [playbook.playbookId, playbook]));
  const groupedOrders = new Map<string, PracticeOrderSummary[]>();

  for (const order of eligibleOrders) {
    groupedOrders.set(order.sessionId, [...(groupedOrders.get(order.sessionId) ?? []), order]);
  }

  const sessionSummaries = sessions
    .map((session) => buildPracticeSessionAnalyticsSummary({
      session,
      orders: groupedOrders.get(session.sessionId) ?? [],
      playbook: session.playbookId ? playbooksById.get(session.playbookId) : undefined
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const curve = buildPracticeEquityAndDrawdownCurves({ sessions, orders: eligibleOrders });
  const playbookBreakdown = computePracticePlaybookPerformance({ playbooks, orders: eligibleOrders, sessions }).slice(0, 24);
  const eligibleSessionSummaries = sessionSummaries.filter((summary) => summary.closedTrades > 0);
  const bestSessions = eligibleSessionSummaries
    .slice()
    .sort((left, right) => right.netPnl - left.netPnl)
    .slice(0, 5);
  const worstSessions = eligibleSessionSummaries
    .slice()
    .sort((left, right) => left.netPnl - right.netPnl)
    .slice(0, 5);
  const recentCompletedSessions = sessionSummaries
    .filter((summary) => summary.status === "completed")
    .sort((left, right) => String(right.completedAt ?? right.updatedAt).localeCompare(String(left.completedAt ?? left.updatedAt)))
    .slice(0, 6);

  return {
    ...createSourceMeta([
      "Practice analytics are computed server-side from bounded student-owned simulated sessions and orders only.",
      "Analytics never fetch hidden unrevealed candles, provider payloads, AutoCopy internals, credentials, account IDs, or vault references."
    ]),
    ok: true,
    generatedAt: new Date().toISOString(),
    hasClosedTrades: eligibleClosedOrders.length > 0,
    sessionLimit: PRACTICE_ANALYTICS_SESSION_LIMIT,
    orderLimit: PRACTICE_ANALYTICS_ORDER_LIMIT,
    cohortCoverage: analyticsCohort.coverage,
    sessionSummaries,
    equityCurve: curve,
    drawdownCurve: curve.map((point) => ({ ...point })),
    dailyPnl: buildDailyPracticePnl({ sessions, orders: eligibleOrders }),
    symbolBreakdown: buildSymbolBreakdown({ sessions, orders: eligibleOrders }),
    playbookBreakdown,
    bestSessions,
    worstSessions,
    recentCompletedSessions,
    challengeSummary: buildChallengeAnalyticsSummary({ sessions, orders: eligibleOrders }),
    safeMessage: "Practice analytics use simulated practice data only and stay separate from AutoCopy/live execution."
  };
}

export async function exportStudentPracticeData(
  actor: VerifiedStudent,
  payload: unknown
): Promise<PracticeExportResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_export_payload_invalid", "Choose practice data to export.");
  }

  const dataset = parsePracticeExportDataset((payload as Record<string, unknown>).dataset);
  const [sessions, orders, playbooks, annotations] = await Promise.all([
    listExportSessions(actor),
    listExportOrders(actor),
    listExportPlaybooks(actor),
    listExportAnnotations(actor)
  ]);
  const reflections = sessions.filter((session) => session.reflection);
  const closedOrders = orders.filter((order) => order.status === "closed");
  const date = safeExportDate();

  if (dataset === "backup_json") {
    return {
      ...createSourceMeta([
        "Practice backup export is student-scoped and excludes hidden candles, provider payloads, credentials, vault refs, and AutoCopy internals."
      ]),
      ok: true,
      dataset,
      format: "json",
      filename: `tradehub-practice-backup-${date}.json`,
      mimeType: "application/json",
      rowCount: sessions.length + orders.length + playbooks.length + annotations.length + reflections.length,
      exportLimit: PRACTICE_EXPORT_LIMIT,
      backup: {
        exportedAt: new Date().toISOString(),
        sessions: sessions.map(sessionExportRow),
        orders: orders.map(orderExportRow),
        closedTrades: closedOrders.map(closedTradeExportRow),
        playbooks: playbooks.map(playbookExportRow),
        annotations: annotations.map(annotationExportRow),
        reflections: reflections.map(reflectionExportRow)
      },
      safeMessage: "Safe JSON backup contains practice records only and does not include unrevealed candles or provider/private data."
    };
  }

  const datasetConfig: Record<Exclude<PracticeExportDataset, "backup_json">, {
    filename: string;
    headers: string[];
    rows: PracticeExportRow[];
  }> = {
    sessions: {
      filename: `tradehub-practice-sessions-${date}.csv`,
      headers: sessionExportHeaders,
      rows: sessions.map(sessionExportRow)
    },
    orders: {
      filename: `tradehub-practice-orders-${date}.csv`,
      headers: orderExportHeaders,
      rows: orders.map(orderExportRow)
    },
    closed_trades: {
      filename: `tradehub-practice-closed-trades-${date}.csv`,
      headers: closedTradeExportHeaders,
      rows: closedOrders.map(closedTradeExportRow)
    },
    playbooks: {
      filename: `tradehub-practice-playbooks-${date}.csv`,
      headers: playbookExportHeaders,
      rows: playbooks.map(playbookExportRow)
    },
    annotations: {
      filename: `tradehub-practice-annotations-${date}.csv`,
      headers: annotationExportHeaders,
      rows: annotations.map(annotationExportRow)
    },
    reflections: {
      filename: `tradehub-practice-reflections-${date}.csv`,
      headers: reflectionExportHeaders,
      rows: reflections.map(reflectionExportRow)
    }
  };
  const config = datasetConfig[dataset];

  return {
    ...createSourceMeta([
      "Practice CSV export is student-scoped and excludes hidden candles, provider payloads, credentials, vault refs, and AutoCopy internals."
    ]),
    ok: true,
    dataset,
    format: "csv",
    filename: config.filename,
    mimeType: "text/csv",
    rowCount: config.rows.length,
    exportLimit: PRACTICE_EXPORT_LIMIT,
    csv: buildCsv(config.headers, config.rows),
    safeMessage: "Safe CSV export contains practice records only and does not include unrevealed candles or provider/private data."
  };
}

export async function importStudentPracticePlaybooks(
  actor: VerifiedStudent,
  payload: unknown
): Promise<PracticePlaybookImportResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_playbook_import_payload_invalid", "Send a CSV file or pasted CSV text to import Strategies.");
  }

  const csv = safeString((payload as Record<string, unknown>).csv).slice(0, 120_000);
  const rows = parseCsvObjects(csv).slice(0, PRACTICE_PLAYBOOK_IMPORT_LIMIT);

  if (!rows.length) {
    throw new AdminApiError(400, "practice_playbook_import_empty", "Add at least one Strategy row to import.");
  }

  const now = new Date().toISOString();
  const { db } = getFirebaseAdminClients();
  const imported: PracticePlaybookSummary[] = [];
  const errors: string[] = [];
  let skippedCount = 0;
  let rejectedCount = 0;

  for (const [index, row] of rows.entries()) {
    try {
      const name = safeString(row.name).replace(/\s+/g, " ").slice(0, 80);

      if (name.length < 2) {
        skippedCount += 1;
        errors.push(`Row ${index + 2}: missing playbook name.`);
        continue;
      }

      const playbookId = deterministicId(["playbook_import", actor.workspaceId, actor.studentId, name, now, String(index)]);
      const playbook: PracticePlaybookRecord = {
        playbookId,
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        name,
        market: normalizeOptionalPracticeMarket(row.market),
        strategyType: safeString(row.strategyType).replace(/\s+/g, " ").slice(0, 80) || "general",
        setupRules: safeString(row.setupRules).replace(/\s+/g, " ").slice(0, 1000),
        entryChecklist: normalizeChecklist(row.entryChecklist),
        invalidationRules: safeString(row.invalidationRules).replace(/\s+/g, " ").slice(0, 1000),
        riskNotes: safeString(row.riskNotes).replace(/\s+/g, " ").slice(0, 1000),
        status: normalizePlaybookStatus(row.status),
        description: safeString(row.description).replace(/\s+/g, " ").slice(0, 500) || undefined,
        createdAt: now,
        updatedAt: now
      };

      await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks/${playbookId}`).set(stripUndefined(playbook));
      imported.push(playbook);
    } catch {
      rejectedCount += 1;
      errors.push(`Row ${index + 2}: could not import this playbook safely.`);
    }
  }

  return {
    ...createSourceMeta([
      "Practice playbook import creates new student-owned playbooks only and cannot overwrite another student's data."
    ]),
    ok: true,
    importedCount: imported.length,
    skippedCount,
    rejectedCount,
    playbooks: imported,
    errors: errors.slice(0, 10),
    safeMessage: "Imported playbooks are sanitized strategy notes scoped to the signed-in student."
  };
}

export async function getStudentPracticeSessionDetail(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionDetailResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  const { db } = getFirebaseAdminClients();
  const [ordersSnapshot, playbookSnapshot, playbooks, annotations, bookmarks, instructorFeedback] = await Promise.all([
    db
      .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
      .where("sessionId", "==", session.sessionId)
      .orderBy("updatedAt", "desc")
      .limit(PRACTICE_VISIBLE_LIMIT)
      .get(),
    session.playbookId
      ? db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks/${session.playbookId}`).get()
      : Promise.resolve(null),
    listPlaybooks(actor),
    listAnnotationsForSession(actor, session.sessionId),
    listBookmarksForSession(actor, session.sessionId),
    getStudentInstructorFeedbackForSession(actor, session.sessionId)
  ]);

  const orders = ordersSnapshot.docs.map((doc) =>
    mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      orderId: doc.id
    })
  );
  const performance = computePracticePerformanceSummary({ session, orders });
  const challengeStatus = computePracticeChallengeStatus({ session, orders });
  const playbookPerformance = computePracticePlaybookPerformance({ playbooks, orders, sessions: [session] });
  const eventMarkers = await listVisibleEventsForSession(actor, session);
  const completedReview = session.status === "completed"
    ? buildCompletedSessionReview({ session, orders, playbooks, annotations, eventMarkers })
    : undefined;
  const playbook = playbookSnapshot?.exists && session.playbookId
    ? mapPlaybook({ playbookId: session.playbookId, ...playbookSnapshot.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      playbookId: session.playbookId
    })
    : undefined;

  return {
    ...createSourceMeta(["Practice replay detail is student-scoped and excludes live execution data."]),
    ok: true,
    session,
    orders,
    performance,
    challengeStatus,
    playbooks,
    playbookPerformance,
    annotations,
    bookmarks,
    eventMarkers,
    completedReview,
    playbook,
    instructorFeedback
  };
}

export async function getStudentPracticeSessionReport(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionReportResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  const [orders, playbooks, annotations, instructorFeedback] = await Promise.all([
    listReportOrdersForSession(actor, session.sessionId),
    listExportPlaybooks(actor),
    listReportAnnotationsForSession(actor, session.sessionId),
    getStudentInstructorFeedbackForSession(actor, session.sessionId)
  ]);
  const performance = computePracticePerformanceSummary({ session, orders });
  const challengeStatus = computePracticeChallengeStatus({ session, orders });
  const playbookPerformance = computePracticePlaybookPerformance({ playbooks, orders, sessions: [session] });
  const completedReview = session.status === "completed"
    ? buildCompletedSessionReview({ session, orders, playbooks, annotations })
    : undefined;
  const closedOrders = orders
    .filter((order) => order.status === "closed")
    .sort((left, right) => String(right.closedAtCandleTime ?? right.updatedAt).localeCompare(String(left.closedAtCandleTime ?? left.updatedAt)));
  const sortedByPnl = closedOrders
    .filter((order) => typeof order.pnl === "number" && Number.isFinite(order.pnl))
    .sort((left, right) => (right.pnl ?? 0) - (left.pnl ?? 0));
  const drawingKinds = new Set<PracticeAnnotationKind>([
    "trend_line",
    "horizontal_line",
    "vertical_marker",
    "zone",
    "text_note",
    "fibonacci_retracement",
    "measurement_placeholder"
  ]);

  return {
    ...createSourceMeta([
      "Practice session reports are generated from bounded student-owned simulated practice records only.",
      "Reports do not return hidden candles, provider payloads, credentials, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.",
      "Print and Save PDF use the browser print dialog only; TradeHub does not create or store report PDFs."
    ]),
    ok: true,
    generatedAt: new Date().toISOString(),
    session,
    performance,
    challengeStatus,
    playbook: session.playbookId ? playbooks.find((playbook) => playbook.playbookId === session.playbookId) : undefined,
    playbookPerformance,
    closedOrders,
    bestTrade: sortedByPnl[0],
    worstTrade: sortedByPnl[sortedByPnl.length - 1],
    annotations: annotations.filter((annotation) => !drawingKinds.has(annotation.kind)),
    drawings: annotations.filter((annotation) => drawingKinds.has(annotation.kind)),
    eventLinkedNotes: annotations.filter((annotation) => Boolean(annotation.eventId)),
    mainLesson: annotations.find((annotation) => annotation.isMainLesson),
    reflection: session.reflection,
    assumptions: normalizePracticePerformanceAssumptions(session),
    completedReview,
    instructorFeedback,
    reportLimit: {
      orders: PRACTICE_REPORT_ORDER_LIMIT,
      annotations: PRACTICE_REPORT_ANNOTATION_LIMIT
    },
    safeMessage: "Practice report is review-only, simulated, and safe for browser printing."
  };
}

function roundWorkspacePracticeMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function roundWorkspacePracticeRatio(value: number) {
  return Math.round(value * 10000) / 10000;
}

function maskPracticeStudentId(studentId: string) {
  const digest = createHash("sha256").update(studentId).digest("hex").slice(0, 8);

  return `student_${digest}`;
}

function maskPracticeSessionRef(workspaceId: string, studentId: string, sessionId: string) {
  const digest = createHash("sha256")
    .update([workspaceId, studentId, sessionId].join(":"))
    .digest("hex")
    .slice(0, 10);

  return `completion_${digest}`;
}

function sessionMatchesWorkspacePracticeFilters(
  session: PracticeSessionSummary,
  filters: WorkspacePracticeInsightsFilters
) {
  if (filters.status !== "all" && session.status !== filters.status) {
    return false;
  }

  if (filters.symbol && session.symbol !== filters.symbol) {
    return false;
  }

  if (filters.timeframeMinutes && session.timeframeMinutes !== filters.timeframeMinutes) {
    return false;
  }

  const sessionStart = Date.parse(session.dateStart);
  const sessionEnd = Date.parse(session.dateEnd);

  if (filters.dateStart && Number.isFinite(sessionEnd) && sessionEnd < Date.parse(filters.dateStart)) {
    return false;
  }

  if (filters.dateEnd && Number.isFinite(sessionStart) && sessionStart > Date.parse(filters.dateEnd)) {
    return false;
  }

  return true;
}

export async function getWorkspacePracticeInsights(
  actor: VerifiedInfluencer,
  filters: WorkspacePracticeInsightsFilters
): Promise<WorkspacePracticeInsightsResponse> {
  const { db } = getFirebaseAdminClients();
  const [sessionSnapshot, orderSnapshot, playbookSnapshot] = await Promise.all([
    db
      .collectionGroup("practice_sessions")
      .where("workspaceId", "==", actor.workspaceId)
      .limit(WORKSPACE_PRACTICE_INSIGHTS_SESSION_LIMIT)
      .get(),
    db
      .collectionGroup("practice_orders")
      .where("workspaceId", "==", actor.workspaceId)
      .limit(WORKSPACE_PRACTICE_INSIGHTS_ORDER_LIMIT)
      .get(),
    db
      .collectionGroup("playbooks")
      .where("workspaceId", "==", actor.workspaceId)
      .limit(WORKSPACE_PRACTICE_INSIGHTS_PLAYBOOK_LIMIT)
      .get()
  ]);
  const sessions = sessionSnapshot.docs
    .map((doc) =>
      mapSession({ sessionId: doc.id, ...doc.data() }, {
        workspaceId: actor.workspaceId,
        studentId: safeString(doc.data().studentId),
        sessionId: doc.id
      })
    )
    .filter((session) => sessionMatchesWorkspacePracticeFilters(session, filters));
  const sessionIds = new Set(sessions.map((session) => session.sessionId));
  const sessionById = new Map(sessions.map((session) => [session.sessionId, session]));
  const orders = orderSnapshot.docs
    .map((doc) =>
      mapOrder({ orderId: doc.id, ...doc.data() }, {
        workspaceId: actor.workspaceId,
        studentId: safeString(doc.data().studentId),
        orderId: doc.id
      })
    )
    .filter((order) => sessionIds.has(order.sessionId));
  const playbooks = playbookSnapshot.docs.map((doc) =>
    mapPlaybook({ playbookId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: safeString(doc.data().studentId),
      playbookId: doc.id
    })
  );
  const playbookNameById = new Map(playbooks.map((playbook) => [playbook.playbookId, playbook.name]));
  const ordersBySession = new Map<string, PracticeOrderSummary[]>();

  for (const order of orders) {
    ordersBySession.set(order.sessionId, [...(ordersBySession.get(order.sessionId) ?? []), order]);
  }

  const closedOrders = orders.filter((order) => order.status === "closed");
  const winningClosedOrders = closedOrders.filter((order) => safeNumber(order.pnl, 0) > 0);
  const rValues = closedOrders
    .map((order) => safeNumber(order.rMultiple, Number.NaN))
    .filter((value) => Number.isFinite(value));
  const challengeCounts = sessions.reduce(
    (summary, session) => {
      const challengeStatus = computePracticeChallengeStatus({
        session,
        orders: ordersBySession.get(session.sessionId) ?? []
      })?.status;

      if (challengeStatus === "passed") {
        summary.passed += 1;
      } else if (challengeStatus === "failed") {
        summary.failed += 1;
      } else if (challengeStatus === "active" || challengeStatus === "not_started") {
        summary.inProgress += 1;
      }

      return summary;
    },
    { passed: 0, failed: 0, inProgress: 0 }
  );
  const symbolGroups = new Map<string, {
    symbol: string;
    assetClass: PracticeAssetClass;
    sessions: number;
    closedTrades: number;
    netPnl: number;
  }>();

  for (const session of sessions) {
    const key = `${session.assetClass}:${session.symbol}`;
    const current = symbolGroups.get(key) ?? {
      symbol: session.symbol,
      assetClass: session.assetClass,
      sessions: 0,
      closedTrades: 0,
      netPnl: 0
    };

    current.sessions += 1;
    symbolGroups.set(key, current);
  }

  for (const order of closedOrders) {
    const session = sessionById.get(order.sessionId);

    if (!session) {
      continue;
    }

    const key = `${session.assetClass}:${session.symbol}`;
    const current = symbolGroups.get(key);

    if (!current) {
      continue;
    }

    current.closedTrades += 1;
    current.netPnl += safeNumber(order.pnl, 0);
  }

  const playbookGroups = new Map<string, {
    playbookName: string;
    uses: number;
    closedTrades: number;
    netPnl: number;
  }>();

  for (const order of orders) {
    const playbookName = safeString(order.playbookName || (order.playbookId ? playbookNameById.get(order.playbookId) : "")).replace(/\s+/g, " ").slice(0, 80);

    if (!playbookName) {
      continue;
    }

    const current = playbookGroups.get(playbookName) ?? {
      playbookName,
      uses: 0,
      closedTrades: 0,
      netPnl: 0
    };

    current.uses += 1;

    if (order.status === "closed") {
      current.closedTrades += 1;
      current.netPnl += safeNumber(order.pnl, 0);
    }

    playbookGroups.set(playbookName, current);
  }

  const recentCompletedSessions = sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) => String(right.completedAt ?? right.updatedAt).localeCompare(String(left.completedAt ?? left.updatedAt)))
    .slice(0, WORKSPACE_PRACTICE_INSIGHTS_RECENT_COMPLETED_LIMIT)
    .map((session) => {
      const sessionOrders = ordersBySession.get(session.sessionId) ?? [];
      const performance = computePracticePerformanceSummary({ session, orders: sessionOrders });
      const challengeStatus = computePracticeChallengeStatus({ session, orders: sessionOrders })?.status;

      return stripUndefined({
        maskedSessionRef: maskPracticeSessionRef(actor.workspaceId, session.studentId, session.sessionId),
        maskedStudentId: maskPracticeStudentId(session.studentId),
        symbol: session.symbol,
        assetClass: session.assetClass,
        timeframeMinutes: session.timeframeMinutes,
        completedAt: session.completedAt,
        closedTrades: performance.closedTrades,
        netPnl: performance.netPnl,
        winRate: performance.winRate,
        averageR: performance.averageR,
        challengeStatus
      });
    });

  return {
    ...createSourceMeta([
      "Workspace practice insights are aggregate, bounded, and educator-safe.",
      "This endpoint does not expose raw journal entries, trade-by-trade history, hidden candles, provider payloads, credentials, account references, vault refs, exchange IDs, or AutoCopy internals."
    ]),
    ok: true,
    generatedAt: new Date().toISOString(),
    filters,
    bounded:
      sessionSnapshot.docs.length === WORKSPACE_PRACTICE_INSIGHTS_SESSION_LIMIT ||
      orderSnapshot.docs.length === WORKSPACE_PRACTICE_INSIGHTS_ORDER_LIMIT ||
      playbookSnapshot.docs.length === WORKSPACE_PRACTICE_INSIGHTS_PLAYBOOK_LIMIT,
    limits: {
      sessions: WORKSPACE_PRACTICE_INSIGHTS_SESSION_LIMIT,
      orders: WORKSPACE_PRACTICE_INSIGHTS_ORDER_LIMIT,
      playbooks: WORKSPACE_PRACTICE_INSIGHTS_PLAYBOOK_LIMIT,
      recentCompletedSessions: WORKSPACE_PRACTICE_INSIGHTS_RECENT_COMPLETED_LIMIT
    },
    summary: {
      totalActivePracticeStudents: new Set(sessions.filter((session) => session.status === "active").map((session) => session.studentId)).size,
      totalPracticeSessions: sessions.length,
      completedPracticeSessions: sessions.filter((session) => session.status === "completed").length,
      archivedPracticeSessions: sessions.filter((session) => session.status === "archived").length,
      totalSimulatedClosedTrades: closedOrders.length,
      aggregatePracticePnl: roundWorkspacePracticeMetric(closedOrders.reduce((total, order) => total + safeNumber(order.pnl, 0), 0)),
      averageWinRate: closedOrders.length > 0 ? roundWorkspacePracticeRatio(winningClosedOrders.length / closedOrders.length) : 0,
      averageR: rValues.length > 0 ? roundWorkspacePracticeRatio(rValues.reduce((total, value) => total + value, 0) / rValues.length) : 0,
      challengePassed: challengeCounts.passed,
      challengeFailed: challengeCounts.failed,
      challengeInProgress: challengeCounts.inProgress
    },
    mostPracticedSymbols: [...symbolGroups.values()]
      .sort((left, right) => right.sessions - left.sessions || right.closedTrades - left.closedTrades)
      .slice(0, 8)
      .map((symbol) => ({
        ...symbol,
        netPnl: roundWorkspacePracticeMetric(symbol.netPnl)
      })),
    mostUsedPlaybooks: [...playbookGroups.values()]
      .sort((left, right) => right.uses - left.uses || right.closedTrades - left.closedTrades)
      .slice(0, 8)
      .map((playbook) => ({
        ...playbook,
        netPnl: roundWorkspacePracticeMetric(playbook.netPnl)
      })),
    recentCompletedSessions,
    safeMessage: "Practice insights show aggregate simulation progress only and stay separate from AutoCopy/live execution."
  };
}

function normalizePracticeAssignmentMutationPayload(payload: unknown, existing?: PracticeAssignmentSummary): PracticeAssignmentRecord {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_assignment_payload_invalid", "Practice assignment details are required.");
  }

  const record = payload as Record<string, unknown>;
  const now = new Date().toISOString();
  const assetClass = record.assetClass === undefined && existing ? existing.assetClass : normalizeAssetClass(record.assetClass);
  const symbol = record.symbol === undefined && existing ? existing.symbol : normalizeSymbol(record.symbol);
  const timeframeMinutes = record.timeframeMinutes === undefined && existing
    ? existing.timeframeMinutes
    : normalizeTimeframe(record.timeframeMinutes);
  const title = safeString(record.title ?? existing?.title).replace(/\s+/g, " ").slice(0, 120);

  if (title.length < 3) {
    throw new AdminApiError(400, "practice_assignment_title_required", "Name this practice assignment.");
  }

  const dateStart = record.dateStart === undefined
    ? existing?.dateStart
    : normalizeOptionalIso(record.dateStart, "practice_assignment_date_start");
  const dateEnd = record.dateEnd === undefined
    ? existing?.dateEnd
    : normalizeOptionalIso(record.dateEnd, "practice_assignment_date_end");

  if (dateStart && dateEnd && Date.parse(dateEnd) <= Date.parse(dateStart)) {
    throw new AdminApiError(400, "practice_assignment_date_range_invalid", "Choose an assignment date range where the end date is after the start date.");
  }

  const startingBalance = record.startingBalance === undefined
    ? existing?.startingBalance
    : Math.max(1, Math.min(safeNumber(record.startingBalance, 1000), 1_000_000));
  const status = normalizePracticeAssignmentStatus(record.status ?? existing?.status, existing?.archivedAt);
  const availabilityStartDate = record.availabilityStartDate === undefined
    ? existing?.availabilityStartDate
    : normalizeOptionalIso(record.availabilityStartDate, "practice_assignment_availability_start");
  const dueDate = record.dueDate === undefined
    ? existing?.dueDate
    : normalizeOptionalIso(record.dueDate, "practice_assignment_due_date");
  const closeDate = record.closeDate === undefined
    ? existing?.closeDate
    : normalizeOptionalIso(record.closeDate, "practice_assignment_close_date");

  if (availabilityStartDate && closeDate && Date.parse(closeDate) <= Date.parse(availabilityStartDate)) {
    throw new AdminApiError(400, "practice_assignment_schedule_invalid", "Choose a close date after the availability start.");
  }

  if (dueDate && closeDate && Date.parse(closeDate) < Date.parse(dueDate)) {
    throw new AdminApiError(400, "practice_assignment_close_before_due", "Choose a close date on or after the due date.");
  }

  return stripUndefined({
    assignmentId: existing?.assignmentId ?? deterministicId(["practice_assignment", title, now]),
    workspaceId: existing?.workspaceId ?? "",
    title,
    description: safeString(record.description ?? existing?.description).replace(/\s+/g, " ").slice(0, 1400),
    assetClass,
    symbol,
    timeframeMinutes,
    dateStart,
    dateEnd,
    randomStartEnabled: record.randomStartEnabled === undefined ? existing?.randomStartEnabled : record.randomStartEnabled === true,
    startingBalance,
    riskPct: record.riskPct === undefined ? existing?.riskPct : Math.max(0.1, Math.min(safeNumber(record.riskPct, 1), 10)),
    challenge: record.challenge === undefined ? existing?.challenge : normalizePracticeChallengeConfig(record.challenge, startingBalance ?? existing?.startingBalance ?? 1000),
    suggestedPlaybook: record.suggestedPlaybook === undefined ? existing?.suggestedPlaybook : normalizeSuggestedPlaybook(record.suggestedPlaybook),
    availabilityStartDate,
    dueDate,
    closeDate,
    targetCohortIds: record.targetCohortIds === undefined ? existing?.targetCohortIds : normalizeCohortIds(record.targetCohortIds),
    status,
    archivedAt: status === "archived" ? existing?.archivedAt ?? now : undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  });
}

async function listWorkspacePracticeAssignmentsRaw(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/practice_assignments`)
    .orderBy("updatedAt", "desc")
    .limit(WORKSPACE_PRACTICE_ASSIGNMENT_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapPracticeAssignment({ assignmentId: doc.id, ...doc.data() }, {
      workspaceId,
      assignmentId: doc.id
    })
  );
}

async function listWorkspacePracticeCohortsRaw(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/practice_cohorts`)
    .orderBy("updatedAt", "desc")
    .limit(WORKSPACE_PRACTICE_COHORT_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapPracticeCohort({ cohortId: doc.id, ...doc.data() }, {
      workspaceId,
      cohortId: doc.id
    })
  );
}

function normalizePracticeCohortMutationPayload(payload: unknown, existing?: PracticeCohortSummary): PracticeCohortSummary {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_cohort_payload_invalid", "Practice cohort details are required.");
  }

  const record = payload as Record<string, unknown>;
  const now = new Date().toISOString();
  const action = safeString(record.action);
  const status = action === "archive"
    ? "archived"
    : normalizePracticeCohortStatus(record.status ?? existing?.status, existing?.archivedAt);
  const name = safeString(record.name ?? existing?.name).replace(/\s+/g, " ").slice(0, 120);

  if (name.length < 2) {
    throw new AdminApiError(400, "practice_cohort_name_required", "Name this practice cohort.");
  }

  return stripUndefined({
    cohortId: existing?.cohortId ?? deterministicId(["practice_cohort", name, now]),
    workspaceId: existing?.workspaceId ?? "",
    name,
    description: safeString(record.description ?? existing?.description).replace(/\s+/g, " ").slice(0, 700) || undefined,
    status,
    studentRefs: record.studentRefs === undefined ? existing?.studentRefs ?? [] : normalizeStudentRefs(record.studentRefs),
    archivedAt: status === "archived" ? existing?.archivedAt ?? now : undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    safeMessage: "Practice cohort stores workspace-owned opaque student refs only."
  });
}

async function getWorkspacePracticeCohortSnapshot(workspaceId: string, cohortId: string) {
  const safeCohortId = safeId(cohortId);

  if (!safeCohortId) {
    throw new AdminApiError(400, "practice_cohort_id_invalid", "Choose a valid practice cohort.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${workspaceId}/practice_cohorts/${safeCohortId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_cohort_not_found", "That practice cohort was not found.");
  }

  return {
    ref,
    cohort: mapPracticeCohort({ cohortId: safeCohortId, ...snapshot.data() }, {
      workspaceId,
      cohortId: safeCohortId
    })
  };
}

async function getWorkspacePracticeAssignmentSnapshot(workspaceId: string, assignmentId: string) {
  const safeAssignmentId = safeId(assignmentId);

  if (!safeAssignmentId) {
    throw new AdminApiError(400, "practice_assignment_id_invalid", "Choose a valid practice assignment.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${workspaceId}/practice_assignments/${safeAssignmentId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_assignment_not_found", "That practice assignment was not found.");
  }

  return {
    ref,
    assignment: mapPracticeAssignment({ assignmentId: safeAssignmentId, ...snapshot.data() }, {
      workspaceId,
      assignmentId: safeAssignmentId
    })
  };
}

async function countWorkspaceStudentsForAssignments(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .limit(WORKSPACE_PRACTICE_ASSIGNMENT_STUDENT_LIMIT)
    .get();

  return snapshot.size;
}

async function listWorkspaceAssignmentProgressRecords(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const [sessionSnapshot, orderSnapshot, feedbackRecords] = await Promise.all([
    db
      .collectionGroup("practice_sessions")
      .where("workspaceId", "==", workspaceId)
      .limit(WORKSPACE_PRACTICE_ASSIGNMENT_PROGRESS_SESSION_LIMIT)
      .get(),
    db
      .collectionGroup("practice_orders")
      .where("workspaceId", "==", workspaceId)
      .limit(WORKSPACE_PRACTICE_ASSIGNMENT_PROGRESS_ORDER_LIMIT)
      .get(),
    listWorkspaceInstructorFeedbackRecords(workspaceId)
  ]);
  const sessions = sessionSnapshot.docs.map((doc) =>
    mapSession({ sessionId: doc.id, ...doc.data() }, {
      workspaceId,
      studentId: safeString(doc.data().studentId),
      sessionId: doc.id
    })
  );
  const assignmentSessionIds = new Set(sessions.filter((session) => session.assignmentId).map((session) => session.sessionId));
  const orders = orderSnapshot.docs
    .map((doc) =>
      mapOrder({ orderId: doc.id, ...doc.data() }, {
        workspaceId,
        studentId: safeString(doc.data().studentId),
        orderId: doc.id
      })
    )
    .filter((order) => assignmentSessionIds.has(order.sessionId));

  return { sessions, orders, feedbackRecords };
}

function emptyAssignmentProgress(assignedCount: number): WorkspacePracticeAssignmentProgressSummary {
  return {
    assignedCount,
    startedCount: 0,
    completedCount: 0,
    overdueCount: 0,
    reviewedCount: 0,
    resubmissionRequestedCount: 0,
    resubmissionCompletedCount: 0,
    averageRubricScore: 0,
    averagePnl: 0,
    averageR: 0,
    challengePassed: 0,
    challengeFailed: 0,
    challengeInProgress: 0,
    maskedRecentCompletions: []
  };
}

function buildWorkspaceAssignmentSummary(input: {
  assignment: PracticeAssignmentSummary;
  assignedCount: number;
  cohorts: PracticeCohortSummary[];
  sessions: PracticeSessionSummary[];
  orders: PracticeOrderSummary[];
  feedbackRecords: PracticeInstructorFeedbackRecord[];
}): WorkspacePracticeAssignmentSummary {
  const assignmentSessions = input.sessions.filter((session) => session.assignmentId === input.assignment.assignmentId);
  const sessionIds = new Set(assignmentSessions.map((session) => session.sessionId));
  const assignmentOrders = input.orders.filter((order) => sessionIds.has(order.sessionId));
  const assignmentFeedback = input.feedbackRecords.filter((feedback) => feedback.assignmentId === input.assignment.assignmentId);
  const ordersBySession = new Map<string, PracticeOrderSummary[]>();

  for (const order of assignmentOrders) {
    ordersBySession.set(order.sessionId, [...(ordersBySession.get(order.sessionId) ?? []), order]);
  }

  if (!assignmentSessions.length) {
    const now = Date.now();
    const dueTime = input.assignment.dueDate ? Date.parse(input.assignment.dueDate) : Number.NaN;
    const closeTime = input.assignment.closeDate ? Date.parse(input.assignment.closeDate) : Number.NaN;
    const emptyProgress = emptyAssignmentProgress(input.assignedCount);

    return {
      ...input.assignment,
      targetCohorts: input.cohorts.filter((cohort) => input.assignment.targetCohortIds?.includes(cohort.cohortId)),
      progress: {
        ...emptyProgress,
        overdueCount: Number.isFinite(dueTime) && dueTime < now && (!Number.isFinite(closeTime) || closeTime >= now)
          ? input.assignedCount
          : 0
      }
    };
  }

  const completedSessions = assignmentSessions.filter((session) => session.status === "completed");
  const now = Date.now();
  const completedStudentRefs = new Set(completedSessions.map((session) => maskPracticeStudentId(session.studentId)));
  const dueTime = input.assignment.dueDate ? Date.parse(input.assignment.dueDate) : Number.NaN;
  const closeTime = input.assignment.closeDate ? Date.parse(input.assignment.closeDate) : Number.NaN;
  const overdueCount = Number.isFinite(dueTime) && dueTime < now && (!Number.isFinite(closeTime) || closeTime >= now)
    ? Math.max(0, input.assignedCount - completedStudentRefs.size)
    : 0;
  const completedResubmissions = assignmentSessions.filter((session) => session.status === "completed" && (session.assignmentAttemptNumber ?? 1) > 1);
  const completedSummaries = completedSessions.map((session) => ({
    session,
    performance: computePracticePerformanceSummary({
      session,
      orders: ordersBySession.get(session.sessionId) ?? []
    }),
    challengeStatus: computePracticeChallengeStatus({
      session,
      orders: ordersBySession.get(session.sessionId) ?? []
    })?.status
  }));
  const averagePnl = completedSummaries.length > 0
    ? completedSummaries.reduce((total, entry) => total + entry.performance.netPnl, 0) / completedSummaries.length
    : 0;
  const averageR = completedSummaries.length > 0
    ? completedSummaries.reduce((total, entry) => total + entry.performance.averageR, 0) / completedSummaries.length
    : 0;
  const publishedOrReviewedFeedback = assignmentFeedback.filter((feedback) => feedback.publicationStatus === "published" || feedback.status === "reviewed");
  const rubricScores = publishedOrReviewedFeedback
    .map((feedback) => feedback.rubric.overallScore)
    .filter((value) => Number.isFinite(value));
  const resubmissionRequestedCount = assignmentFeedback.filter((feedback) => feedback.resubmissionRequest?.status === "requested" || feedback.resubmissionRequest?.status === "started").length;
  const challengeCounts = assignmentSessions.reduce((summary, session) => {
    const status = computePracticeChallengeStatus({
      session,
      orders: ordersBySession.get(session.sessionId) ?? []
    })?.status;

    if (status === "passed") {
      summary.passed += 1;
    } else if (status === "failed") {
      summary.failed += 1;
    } else if (status === "active" || status === "not_started") {
      summary.inProgress += 1;
    }

    return summary;
  }, { passed: 0, failed: 0, inProgress: 0 });

  return {
    ...input.assignment,
    targetCohorts: input.cohorts.filter((cohort) => input.assignment.targetCohortIds?.includes(cohort.cohortId)),
    progress: {
      assignedCount: input.assignedCount,
      startedCount: new Set(assignmentSessions.map((session) => session.studentId)).size,
      completedCount: completedSessions.length,
      overdueCount,
      reviewedCount: publishedOrReviewedFeedback.length,
      resubmissionRequestedCount,
      resubmissionCompletedCount: completedResubmissions.length,
      averageRubricScore: rubricScores.length > 0 ? roundWorkspacePracticeRatio(rubricScores.reduce((total, value) => total + value, 0) / rubricScores.length) : 0,
      averagePnl: roundWorkspacePracticeMetric(averagePnl),
      averageR: roundWorkspacePracticeRatio(averageR),
      challengePassed: challengeCounts.passed,
      challengeFailed: challengeCounts.failed,
      challengeInProgress: challengeCounts.inProgress,
      maskedRecentCompletions: completedSummaries
        .sort((left, right) => String(right.session.completedAt ?? right.session.updatedAt).localeCompare(String(left.session.completedAt ?? left.session.updatedAt)))
        .slice(0, WORKSPACE_PRACTICE_INSIGHTS_RECENT_COMPLETED_LIMIT)
        .map(({ session, performance, challengeStatus }) => stripUndefined({
          maskedSessionRef: maskPracticeSessionRef(session.workspaceId, session.studentId, session.sessionId),
          maskedStudentId: maskPracticeStudentId(session.studentId),
          symbol: session.symbol,
          assetClass: session.assetClass,
          timeframeMinutes: session.timeframeMinutes,
          completedAt: session.completedAt,
          closedTrades: performance.closedTrades,
          netPnl: performance.netPnl,
          winRate: performance.winRate,
          averageR: performance.averageR,
          challengeStatus
        }))
    }
  };
}

function buildWorkspaceAssignmentNotificationCounts(input: {
  assignments: WorkspacePracticeAssignmentSummary[];
  sessions: PracticeSessionSummary[];
  feedbackRecords: PracticeInstructorFeedbackRecord[];
}): WorkspacePracticeAssignmentNotificationCounts {
  const completedAssignmentSessions = input.sessions.filter((session) => session.status === "completed" && session.assignmentId);
  const feedbackSessionIds = new Set(input.feedbackRecords.map((feedback) => feedback.sessionId));
  const needsReview = completedAssignmentSessions.filter((session) => !feedbackSessionIds.has(session.sessionId)).length;
  const feedbackDraftsNotPublished = input.feedbackRecords.filter((feedback) => feedback.publicationStatus !== "published").length;
  const resubmissionsRequested = input.feedbackRecords.filter((feedback) =>
    feedback.resubmissionRequest?.status === "requested" || feedback.resubmissionRequest?.status === "started"
  ).length;
  const overdue = input.assignments.reduce((total, assignment) => total + assignment.progress.overdueCount, 0);

  return {
    needsReview,
    overdue,
    resubmissionsRequested,
    feedbackDraftsNotPublished,
    safeMessage: "Workspace practice notification counts are aggregate only and do not include raw student practice details."
  };
}

export async function listWorkspacePracticeAssignments(actor: VerifiedInfluencer): Promise<WorkspacePracticeAssignmentsResponse> {
  const [assignments, cohorts, assignedCount, progressRecords] = await Promise.all([
    listWorkspacePracticeAssignmentsRaw(actor.workspaceId),
    listWorkspacePracticeCohortsRaw(actor.workspaceId),
    countWorkspaceStudentsForAssignments(actor.workspaceId),
    listWorkspaceAssignmentProgressRecords(actor.workspaceId)
  ]);
  const assignedCountFor = (assignment: PracticeAssignmentSummary) => {
    if (!assignment.targetCohortIds?.length) {
      return assignedCount;
    }

    const refs = new Set<string>();

    for (const cohort of cohorts.filter((entry) => assignment.targetCohortIds?.includes(entry.cohortId) && entry.status === "active")) {
      for (const ref of cohort.studentRefs) {
        refs.add(ref);
      }
    }

    return refs.size;
  };

  const assignmentSummaries = assignments.map((assignment) => buildWorkspaceAssignmentSummary({
    assignment,
    assignedCount: assignedCountFor(assignment),
    cohorts,
    sessions: progressRecords.sessions,
    orders: progressRecords.orders,
    feedbackRecords: progressRecords.feedbackRecords
  }));

  return {
    ...createSourceMeta([
      "Workspace practice assignments expose assignment setup and aggregate progress only.",
      "Workspace assignment progress never returns raw student trades, notes, candles, annotations, reflections, journal entries, provider payloads, credentials, vault refs, or AutoCopy internals."
    ]),
    ok: true,
    cohorts,
    assignments: assignmentSummaries,
    notificationCounts: buildWorkspaceAssignmentNotificationCounts({
      assignments: assignmentSummaries,
      sessions: progressRecords.sessions,
      feedbackRecords: progressRecords.feedbackRecords
    }),
    limit: WORKSPACE_PRACTICE_ASSIGNMENT_LIMIT,
    safeMessage: "Practice assignments are simulated learning tasks and remain separate from AutoCopy/live execution."
  };
}

export async function createWorkspacePracticeAssignment(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspacePracticeAssignmentMutationResponse> {
  const assignment = {
    ...normalizePracticeAssignmentMutationPayload(payload),
    workspaceId: actor.workspaceId
  };
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/practice_assignments/${assignment.assignmentId}`).set(stripUndefined(assignment));

  const response = await listWorkspacePracticeAssignments(actor);
  const summary = response.assignments.find((entry) => entry.assignmentId === assignment.assignmentId);

  return {
    ...createSourceMeta(["Practice assignment was created server-side for this workspace only."]),
    ok: true,
      assignment: summary ?? buildWorkspaceAssignmentSummary({
      assignment: mapPracticeAssignment(assignment, {
        workspaceId: actor.workspaceId,
        assignmentId: assignment.assignmentId
      }),
      assignedCount: 0,
      cohorts: [],
      sessions: [],
      orders: [],
      feedbackRecords: []
    })
  };
}

export async function updateWorkspacePracticeAssignment(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspacePracticeAssignmentMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_assignment_payload_invalid", "Practice assignment details are required.");
  }

  const record = payload as Record<string, unknown>;
  const { ref, assignment: existing } = await getWorkspacePracticeAssignmentSnapshot(actor.workspaceId, safeId(record.assignmentId));
  const action = safeString(record.action);
  const nextPayload = action === "archive"
    ? { ...record, status: "archived" }
    : record;
  const updated = {
    ...normalizePracticeAssignmentMutationPayload(nextPayload, existing),
    workspaceId: actor.workspaceId,
    assignmentId: existing.assignmentId
  };

  await ref.set(stripUndefined(updated));

  const response = await listWorkspacePracticeAssignments(actor);
  const summary = response.assignments.find((entry) => entry.assignmentId === existing.assignmentId);

  return {
    ...createSourceMeta(["Practice assignment update is workspace-owned and does not reveal student practice internals."]),
    ok: true,
      assignment: summary ?? buildWorkspaceAssignmentSummary({
      assignment: mapPracticeAssignment(updated, {
        workspaceId: actor.workspaceId,
        assignmentId: existing.assignmentId
      }),
      assignedCount: 0,
      cohorts: [],
      sessions: [],
      orders: [],
      feedbackRecords: []
    })
  };
}

export async function createWorkspacePracticeCohort(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspacePracticeCohortMutationResponse> {
  const cohort = {
    ...normalizePracticeCohortMutationPayload(payload),
    workspaceId: actor.workspaceId
  };
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/practice_cohorts/${cohort.cohortId}`).set(stripUndefined(cohort));

  return {
    ...createSourceMeta([
      "Practice cohort was created server-side for this workspace using opaque student refs only."
    ]),
    ok: true,
    cohort: mapPracticeCohort(cohort, {
      workspaceId: actor.workspaceId,
      cohortId: cohort.cohortId
    }),
    safeMessage: "Practice cohorts organize assignment targeting only and do not expose student practice internals."
  };
}

export async function updateWorkspacePracticeCohort(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspacePracticeCohortMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_cohort_payload_invalid", "Practice cohort details are required.");
  }

  const record = payload as Record<string, unknown>;
  const { ref, cohort: existing } = await getWorkspacePracticeCohortSnapshot(actor.workspaceId, safeId(record.cohortId));
  const updated = {
    ...normalizePracticeCohortMutationPayload(record, existing),
    workspaceId: actor.workspaceId,
    cohortId: existing.cohortId
  };

  await ref.set(stripUndefined(updated));

  return {
    ...createSourceMeta([
      "Practice cohort update is workspace-owned and stores safe membership refs only."
    ]),
    ok: true,
    cohort: mapPracticeCohort(updated, {
      workspaceId: actor.workspaceId,
      cohortId: existing.cohortId
    }),
    safeMessage: "Practice cohort membership never exposes student practice trades, notes, candles, reflections, or secrets."
  };
}

function studentRefForPractice(actor: VerifiedStudent) {
  return maskPracticeStudentId(actor.studentId);
}

function assignmentTargetsStudent(assignment: PracticeAssignmentSummary, cohorts: PracticeCohortSummary[], studentRef: string) {
  if (!assignment.targetCohortIds?.length) {
    return true;
  }

  return cohorts.some((cohort) =>
    cohort.status === "active" &&
    assignment.targetCohortIds?.includes(cohort.cohortId) &&
    cohort.studentRefs.includes(studentRef)
  );
}

function assignmentAvailabilityStatus(assignment: PracticeAssignmentSummary, now = new Date()) {
  const nowTime = now.getTime();
  const startTime = assignment.availabilityStartDate ? Date.parse(assignment.availabilityStartDate) : Number.NaN;
  const dueTime = assignment.dueDate ? Date.parse(assignment.dueDate) : Number.NaN;
  const closeTime = assignment.closeDate ? Date.parse(assignment.closeDate) : Number.NaN;

  if (Number.isFinite(closeTime) && nowTime > closeTime) {
    return "closed" as const;
  }

  if (Number.isFinite(startTime) && nowTime < startTime) {
    return "not_available" as const;
  }

  if (Number.isFinite(dueTime) && nowTime > dueTime) {
    return "overdue" as const;
  }

  return "available" as const;
}

function assignmentTaskAvailabilityStatus(assignment: PracticeAssignmentSummary, now = new Date()) {
  const availability = assignmentAvailabilityStatus(assignment, now);
  const dueTime = assignment.dueDate ? Date.parse(assignment.dueDate) : Number.NaN;
  const dueSoonWindowMs = 1000 * 60 * 60 * 48;

  if (availability === "available" && Number.isFinite(dueTime) && dueTime >= now.getTime() && dueTime - now.getTime() <= dueSoonWindowMs) {
    return "due_soon" as const;
  }

  return availability;
}

function notificationIdFor(parts: string[]) {
  return deterministicId(["practice_notification", ...parts]);
}

function notificationUrgency(kind: PracticeNotificationKind): PracticeNotificationUrgency {
  if (kind === "assignment_closed" || kind === "assignment_overdue" || kind === "resubmission_overdue" || kind === "resubmission_requested") {
    return "high";
  }

  if (kind === "assignment_due_soon" || kind === "resubmission_due_soon" || kind === "feedback_published") {
    return "medium";
  }

  return "low";
}

function notificationSortRank(urgency: PracticeNotificationUrgency) {
  return urgency === "high" ? 0 : urgency === "medium" ? 1 : 2;
}

function buildStudentPracticeNotification(input: {
  kind: PracticeNotificationKind;
  assignment: PracticeAssignmentSummary;
  state: StudentPracticeAssignmentState;
  action: PracticeNotificationAction;
  title: string;
  body: string;
  eventAt?: string;
  dismissedIds: Set<string>;
  readIds: Set<string>;
}): StudentPracticeNotificationSummary {
  const notificationId = notificationIdFor([
    input.kind,
    input.assignment.assignmentId,
    input.state.feedback?.feedbackId ?? "",
    input.state.resubmissionRequest?.requestedAt ?? "",
    input.eventAt ?? ""
  ]);
  const urgency = notificationUrgency(input.kind);

  return stripUndefined({
    notificationId,
    kind: input.kind,
    urgency,
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 260),
    assignmentId: input.assignment.assignmentId,
    assignmentTitle: input.assignment.title,
    action: input.action,
    dueDate: input.state.resubmissionRequest?.dueDate ?? input.state.dueDate,
    eventAt: input.eventAt,
    dismissed: input.dismissedIds.has(notificationId),
    read: input.readIds.has(notificationId),
    safeMessage: "Practice alert is derived from your own assignment state and contains no raw session, trade, journal, candle, or provider details."
  });
}

function deriveStudentPracticeNotifications(input: {
  assignments: PracticeAssignmentSummary[];
  states: Record<string, StudentPracticeAssignmentState>;
  dismissedIds: Set<string>;
  readIds: Set<string>;
}) {
  const now = Date.now();
  const dueSoonWindowMs = 1000 * 60 * 60 * 48;
  const notifications: StudentPracticeNotificationSummary[] = [];

  for (const assignment of input.assignments) {
    const state = input.states[assignment.assignmentId];

    if (!state) {
      continue;
    }

    if (state.status === "available") {
      notifications.push(buildStudentPracticeNotification({
        kind: "assignment_available",
        assignment,
        state,
        action: "start_assignment",
        title: "New practice assignment available",
        body: `${assignment.title} is ready to start.`,
        eventAt: assignment.availabilityStartDate ?? assignment.updatedAt,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    } else if (state.status === "due_soon") {
      notifications.push(buildStudentPracticeNotification({
        kind: "assignment_due_soon",
        assignment,
        state,
        action: "start_assignment",
        title: "Practice assignment due soon",
        body: `${assignment.title} is due soon and remains open.`,
        eventAt: state.dueDate,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    } else if (state.status === "overdue") {
      notifications.push(buildStudentPracticeNotification({
        kind: "assignment_overdue",
        assignment,
        state,
        action: "start_assignment",
        title: "Practice assignment overdue",
        body: `${assignment.title} is overdue but still open.`,
        eventAt: state.dueDate,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    } else if (state.status === "closed") {
      notifications.push(buildStudentPracticeNotification({
        kind: "assignment_closed",
        assignment,
        state,
        action: "view_feedback",
        title: "Practice assignment closed",
        body: `${assignment.title} is closed for new starts.`,
        eventAt: state.closeDate,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    } else if (state.status === "feedback_available" && state.feedback) {
      notifications.push(buildStudentPracticeNotification({
        kind: "feedback_published",
        assignment,
        state,
        action: "view_feedback",
        title: "Instructor feedback published",
        body: `Feedback is available for ${assignment.title}.`,
        eventAt: state.feedback.publishedAt ?? state.feedback.updatedAt,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    } else if (state.status === "resubmission_requested" && state.resubmissionRequest) {
      const dueTime = state.resubmissionRequest.dueDate ? Date.parse(state.resubmissionRequest.dueDate) : Number.NaN;
      const kind: PracticeNotificationKind = Number.isFinite(dueTime) && dueTime < now
        ? "resubmission_overdue"
        : Number.isFinite(dueTime) && dueTime - now <= dueSoonWindowMs
          ? "resubmission_due_soon"
          : "resubmission_requested";

      notifications.push(buildStudentPracticeNotification({
        kind,
        assignment,
        state,
        action: "start_resubmission",
        title: kind === "resubmission_overdue"
          ? "Resubmission overdue"
          : kind === "resubmission_due_soon"
            ? "Resubmission due soon"
            : "Resubmission requested",
        body: `${assignment.title}: ${state.resubmissionRequest.reason}`,
        eventAt: state.resubmissionRequest.dueDate ?? state.resubmissionRequest.requestedAt,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    } else if (state.status === "in_progress") {
      notifications.push(buildStudentPracticeNotification({
        kind: "assignment_available",
        assignment,
        state,
        action: "continue_session",
        title: "Practice assignment in progress",
        body: `${assignment.title} has an active practice session.`,
        eventAt: assignment.updatedAt,
        dismissedIds: input.dismissedIds,
        readIds: input.readIds
      }));
    }
  }

  return notifications
    .filter((notification) => !notification.dismissed)
    .sort((left, right) =>
      notificationSortRank(left.urgency) - notificationSortRank(right.urgency) ||
      String(right.eventAt ?? right.dueDate ?? "").localeCompare(String(left.eventAt ?? left.dueDate ?? ""))
    )
    .slice(0, STUDENT_PRACTICE_NOTIFICATION_LIMIT);
}

function assertAssignmentStartAllowed(actor: VerifiedStudent, assignment: PracticeAssignmentSummary, cohorts: PracticeCohortSummary[]) {
  if (assignment.status !== "active") {
    throw new AdminApiError(409, "practice_assignment_inactive", "This practice assignment is not active.");
  }

  if (!assignmentTargetsStudent(assignment, cohorts, studentRefForPractice(actor))) {
    throw new AdminApiError(403, "practice_assignment_not_assigned", "This practice assignment is not assigned to your practice cohort.");
  }

  const availability = assignmentAvailabilityStatus(assignment);

  if (availability === "not_available") {
    throw new AdminApiError(409, "practice_assignment_not_available", "This practice assignment is not available yet.");
  }

  if (availability === "closed") {
    throw new AdminApiError(409, "practice_assignment_closed", "This practice assignment is closed.");
  }
}

export async function listStudentPracticeAssignments(actor: VerifiedStudent): Promise<StudentPracticeAssignmentsResponse> {
  const [allAssignments, cohorts, sessions, feedback] = await Promise.all([
    (await listWorkspacePracticeAssignmentsRaw(actor.workspaceId))
      .filter((assignment) => assignment.status === "active")
      .sort((left, right) => String(left.dueDate ?? left.updatedAt).localeCompare(String(right.dueDate ?? right.updatedAt))),
    listWorkspacePracticeCohortsRaw(actor.workspaceId),
    listSessions(actor),
    listStudentInstructorFeedback(actor)
  ]);
  const studentRef = studentRefForPractice(actor);
  const assignments = allAssignments.filter((assignment) => assignmentTargetsStudent(assignment, cohorts, studentRef));
  const feedbackByAssignment = new Map<string, PracticeInstructorFeedbackSummary>();

  for (const entry of feedback) {
    if (!feedbackByAssignment.has(entry.assignmentId)) {
      feedbackByAssignment.set(entry.assignmentId, entry);
    }
  }

  const states = assignments.reduce<Record<string, StudentPracticeAssignmentState>>((summary, assignment) => {
    const assignmentSessions = sessions
      .filter((session) => session.assignmentId === assignment.assignmentId)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
    const activeSession = assignmentSessions.find((session) => session.status === "active" || session.status === "draft");
    const completedSession = assignmentSessions.find((session) => session.status === "completed");
    const latestFeedback = feedbackByAssignment.get(assignment.assignmentId);
    const resubmissionRequest = latestFeedback?.resubmissionRequest?.status === "requested"
      ? latestFeedback.resubmissionRequest
      : undefined;
    const latestAttemptNumber = Math.max(1, ...assignmentSessions.map((session) => session.assignmentAttemptNumber ?? session.assignmentSnapshot?.attemptNumber ?? 1));
    const availabilityStatus = assignmentAvailabilityStatus(assignment);
    const taskAvailabilityStatus = assignmentTaskAvailabilityStatus(assignment);
    const baseStatus: StudentPracticeAssignmentState["status"] = resubmissionRequest
      ? "resubmission_requested"
      : latestFeedback
        ? "feedback_available"
        : completedSession
          ? "completed"
          : activeSession
            ? "in_progress"
            : "not_started";
    const status: StudentPracticeAssignmentState["status"] = baseStatus === "not_started"
      ? availabilityStatus === "not_available" || availabilityStatus === "closed"
        ? availabilityStatus
        : taskAvailabilityStatus
      : baseStatus;

    summary[assignment.assignmentId] = stripUndefined({
      assignmentId: assignment.assignmentId,
      status,
      availabilityStatus,
      activeSessionId: activeSession?.sessionId,
      completedSessionId: completedSession?.sessionId,
      feedback: latestFeedback,
      resubmissionRequest,
      latestAttemptNumber,
      dueDate: assignment.dueDate,
      availabilityStartDate: assignment.availabilityStartDate,
      closeDate: assignment.closeDate,
      targetCohortIds: assignment.targetCohortIds,
      safeMessage: "Assignment state is scoped to your own practice sessions and published feedback only."
    });

    return summary;
  }, {});

  return {
    ...createSourceMeta([
      "Student assignment list contains workspace-created practice tasks only and does not expose other students' progress."
    ]),
    ok: true,
    assignments,
    states,
    safeMessage: "Practice assignments are simulated tasks. Starting one creates a student-owned practice session."
  };
}

function mapNotificationState(record: Record<string, unknown>) {
  const dismissedIds = Array.isArray(record.dismissedIds)
    ? record.dismissedIds.map(safeId).filter(Boolean).slice(0, STUDENT_PRACTICE_NOTIFICATION_STATE_LIMIT)
    : [];
  const readIds = Array.isArray(record.readIds)
    ? record.readIds.map(safeId).filter(Boolean).slice(0, STUDENT_PRACTICE_NOTIFICATION_STATE_LIMIT)
    : [];

  return {
    dismissedIds,
    readIds,
    updatedAt: record.updatedAt ? new Date(String(record.updatedAt)).toISOString() : undefined
  };
}

async function loadStudentPracticeNotificationState(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_notification_state/current`)
    .get();

  return mapNotificationState(snapshot.exists ? snapshot.data() ?? {} : {});
}

export async function getStudentPracticeNotifications(actor: VerifiedStudent): Promise<StudentPracticeNotificationsResponse> {
  const [assignmentsResponse, notificationState] = await Promise.all([
    listStudentPracticeAssignments(actor),
    loadStudentPracticeNotificationState(actor)
  ]);
  const dismissedIds = new Set(notificationState.dismissedIds);
  const readIds = new Set(notificationState.readIds);
  const notifications = deriveStudentPracticeNotifications({
    assignments: assignmentsResponse.assignments,
    states: assignmentsResponse.states,
    dismissedIds,
    readIds
  });

  return {
    ...createSourceMeta([
      "Practice notifications are derived from your own assignment state and published instructor feedback.",
      "No raw session IDs, student IDs, trades, journal entries, candles, provider payloads, credentials, vault refs, or AutoCopy internals are returned."
    ]),
    ok: true,
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    dismissedCount: notificationState.dismissedIds.length,
    limit: STUDENT_PRACTICE_NOTIFICATION_LIMIT,
    safeMessage: "Practice notifications are in-app only; no email, SMS, WhatsApp, push, or external notification provider is used."
  };
}

export async function updateStudentPracticeNotificationState(
  actor: VerifiedStudent,
  payload: unknown
): Promise<StudentPracticeNotificationMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_notification_payload_invalid", "Choose a notification action.");
  }

  const record = payload as Record<string, unknown>;
  const action = safeString(record.action);
  const notificationId = safeId(record.notificationId);
  const { db } = getFirebaseAdminClients();
  const state = await loadStudentPracticeNotificationState(actor);
  const dismissedIds = new Set(state.dismissedIds);
  const readIds = new Set(state.readIds);
  const current = await getStudentPracticeNotifications(actor);
  const currentIds = new Set(current.notifications.map((notification) => notification.notificationId));

  if (action === "dismiss_all") {
    for (const id of currentIds) {
      dismissedIds.add(id);
      readIds.add(id);
    }
  } else if (action === "read_all") {
    for (const id of currentIds) {
      readIds.add(id);
    }
  } else if ((action === "dismiss" || action === "read") && currentIds.has(notificationId)) {
    readIds.add(notificationId);

    if (action === "dismiss") {
      dismissedIds.add(notificationId);
    }
  } else {
    throw new AdminApiError(400, "practice_notification_action_invalid", "Choose a valid practice notification action.");
  }

  await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_notification_state/current`)
    .set(stripUndefined({
      dismissedIds: [...dismissedIds].slice(-STUDENT_PRACTICE_NOTIFICATION_STATE_LIMIT),
      readIds: [...readIds].slice(-STUDENT_PRACTICE_NOTIFICATION_STATE_LIMIT),
      updatedAt: new Date().toISOString(),
      safeMessage: "Student-owned practice notification read/dismiss state only."
    }), { merge: true });

  const next = await getStudentPracticeNotifications(actor);

  return {
    ...createSourceMeta(["Practice notification state was updated server-side for the signed-in student only."]),
    ok: true,
    notifications: next.notifications,
    unreadCount: next.unreadCount,
    safeMessage: "Practice notification state is in-app only and contains no private practice internals."
  };
}

export async function startStudentPracticeAssignment(
  actor: VerifiedStudent,
  assignmentId: string
): Promise<StudentPracticeAssignmentStartResponse> {
  const { assignment } = await getWorkspacePracticeAssignmentSnapshot(actor.workspaceId, assignmentId);
  const cohorts = await listWorkspacePracticeCohortsRaw(actor.workspaceId);
  assertAssignmentStartAllowed(actor, assignment, cohorts);

  const now = new Date().toISOString();
  const fallbackEnd = assignment.dateEnd ?? now;
  const fallbackStart = assignment.dateStart ?? new Date(Date.parse(fallbackEnd) - 1000 * 60 * assignment.timeframeMinutes * 120).toISOString();
  const sessionResponse = await createStudentPracticeSession(actor, {
    sessionName: assignment.title,
    assetClass: assignment.assetClass,
    symbol: assignment.symbol,
    timeframeMinutes: assignment.timeframeMinutes,
    dateStart: fallbackStart,
    dateEnd: fallbackEnd,
    randomStartEnabled: assignment.randomStartEnabled === true,
    startingBalance: assignment.startingBalance ?? 1000,
    riskPct: assignment.riskPct ?? 1,
    challenge: assignment.challenge
  }, {
    assignmentSnapshot: {
      assignmentId: assignment.assignmentId,
      title: assignment.title,
      assetClass: assignment.assetClass,
      symbol: assignment.symbol,
      timeframeMinutes: assignment.timeframeMinutes,
      dueDate: assignment.dueDate,
      availabilityStartDate: assignment.availabilityStartDate,
      closeDate: assignment.closeDate,
      targetCohortIds: assignment.targetCohortIds,
      startedAt: now,
      attemptNumber: 1,
      safeMessage: "Practice assignment snapshot contains assignment metadata only and no workspace-visible student trade details."
    },
    assignmentAttemptNumber: 1,
    resubmissionStatus: "none"
  });

  return {
    ...createSourceMeta([
      "Started practice assignment by creating a student-owned simulated practice session.",
      "Workspace users will see aggregate assignment progress only."
    ]),
    ok: true,
    assignment,
    session: sessionResponse.session,
    safeMessage: "Assignment session is practice-only and does not connect to broker, exchange, AutoCopy, or provider execution."
  };
}

export async function startStudentPracticeAssignmentResubmission(
  actor: VerifiedStudent,
  payload: unknown
): Promise<StudentPracticeAssignmentStartResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_resubmission_payload_invalid", "Choose a resubmission request.");
  }

  const feedbackTargetRef = safeString((payload as Record<string, unknown>).feedbackTargetRef);
  const { db } = getFirebaseAdminClients();
  const feedbackSnapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_instructor_feedback`)
    .orderBy("updatedAt", "desc")
    .limit(STUDENT_PRACTICE_FEEDBACK_LIMIT)
    .get();
  const feedbackEntries = feedbackSnapshot.docs
    .map((doc) => mapInstructorFeedback({ feedbackId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      sessionId: safeString(doc.data().sessionId),
      feedbackId: doc.id
    }))
    .filter((feedback) => feedback.publicationStatus === "published");
  const feedback = feedbackEntries.find((entry) => entry.feedbackTargetRef === feedbackTargetRef);

  if (!feedback || feedback.resubmissionRequest?.status !== "requested") {
    throw new AdminApiError(404, "practice_resubmission_not_found", "TradeHub could not find a published resubmission request for this assignment.");
  }

  const { session: previousSession } = await getPracticeSessionSnapshot(actor, feedback.sessionId);

  if (!previousSession.assignmentId) {
    throw new AdminApiError(409, "practice_resubmission_assignment_missing", "That feedback is not linked to a practice assignment.");
  }

  const { assignment } = await getWorkspacePracticeAssignmentSnapshot(actor.workspaceId, previousSession.assignmentId);
  const cohorts = await listWorkspacePracticeCohortsRaw(actor.workspaceId);
  assertAssignmentStartAllowed(actor, assignment, cohorts);
  const now = new Date().toISOString();
  const fallbackEnd = assignment.dateEnd ?? previousSession.dateEnd;
  const fallbackStart = assignment.dateStart ?? previousSession.dateStart;
  const attemptNumber = Math.max(previousSession.assignmentAttemptNumber ?? previousSession.assignmentSnapshot?.attemptNumber ?? 1, 1) + 1;
  const previousAttemptMaskedSessionRef = feedback.maskedSessionRef;
  const sessionResponse = await createStudentPracticeSession(actor, {
    sessionName: `${assignment.title} resubmission ${attemptNumber}`,
    assetClass: assignment.assetClass,
    symbol: assignment.symbol,
    timeframeMinutes: assignment.timeframeMinutes,
    dateStart: fallbackStart,
    dateEnd: fallbackEnd,
    randomStartEnabled: assignment.randomStartEnabled === true,
    startingBalance: assignment.startingBalance ?? previousSession.startingBalance,
    riskPct: assignment.riskPct ?? previousSession.riskPct,
    challenge: assignment.challenge
  }, {
    assignmentSnapshot: {
      assignmentId: assignment.assignmentId,
      title: assignment.title,
      assetClass: assignment.assetClass,
      symbol: assignment.symbol,
      timeframeMinutes: assignment.timeframeMinutes,
      dueDate: assignment.dueDate,
      availabilityStartDate: assignment.availabilityStartDate,
      closeDate: assignment.closeDate,
      targetCohortIds: assignment.targetCohortIds,
      startedAt: now,
      attemptNumber,
      previousAttemptMaskedSessionRef,
      resubmissionSourceFeedbackId: feedback.feedbackId,
      safeMessage: "Practice resubmission snapshot contains setup metadata and an opaque previous-attempt ref only."
    },
    assignmentAttemptNumber: attemptNumber,
    previousAttemptMaskedSessionRef,
    resubmissionSourceFeedbackId: feedback.feedbackId,
    resubmissionStatus: "started"
  });
  const updatedFeedback = {
    ...feedback,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    sessionId: previousSession.sessionId,
    reviewerId: "workspace_reviewer",
    resubmissionRequest: {
      ...feedback.resubmissionRequest,
      status: "started" as const
    },
    updatedAt: now
  };

  await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_instructor_feedback/${feedback.feedbackId}`)
    .set(stripUndefined(updatedFeedback), { merge: true });

  return {
    ...createSourceMeta([
      "Started a practice assignment resubmission by creating a fresh student-owned simulated session.",
      "Orders, candles, notes, drawings, bookmarks, reflections, ledger records, and hidden data were not copied."
    ]),
    ok: true,
    assignment,
    session: sessionResponse.session,
    safeMessage: "Resubmission session is practice-only and setup-only."
  };
}

async function listStudentInstructorFeedback(actor: VerifiedStudent): Promise<PracticeInstructorFeedbackSummary[]> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_instructor_feedback`)
    .orderBy("updatedAt", "desc")
    .limit(STUDENT_PRACTICE_FEEDBACK_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) => toInstructorFeedbackSummary(mapInstructorFeedback({ feedbackId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      sessionId: safeString(doc.data().sessionId),
      feedbackId: doc.id
    })))
    .filter((feedback): feedback is PracticeInstructorFeedbackSummary => feedback !== undefined && feedback.publicationStatus === "published");
}

async function getStudentInstructorFeedbackForSession(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const feedbackId = instructorFeedbackId(sessionId);
  const snapshot = await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_instructor_feedback/${feedbackId}`)
    .get();

  if (!snapshot.exists) {
    return undefined;
  }

  const feedback = toInstructorFeedbackSummary(mapInstructorFeedback({ feedbackId, ...snapshot.data() }, {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    sessionId,
    feedbackId
  }));

  return feedback?.publicationStatus === "published" ? feedback : undefined;
}

async function listWorkspaceInstructorFeedbackRecords(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collectionGroup("practice_instructor_feedback")
    .where("workspaceId", "==", workspaceId)
    .limit(WORKSPACE_PRACTICE_FEEDBACK_RECORD_LIMIT)
    .get();

  return snapshot.docs.map((doc) => mapInstructorFeedback({ feedbackId: doc.id, ...doc.data() }, {
    workspaceId,
    studentId: safeString(doc.data().studentId),
    sessionId: safeString(doc.data().sessionId),
    feedbackId: doc.id
  }));
}

async function listWorkspaceAssignmentFeedbackSource(actor: VerifiedInfluencer) {
  const { db } = getFirebaseAdminClients();
  const [sessionSnapshot, orderSnapshot, assignmentSnapshot, feedbackRecords] = await Promise.all([
    db
      .collectionGroup("practice_sessions")
      .where("workspaceId", "==", actor.workspaceId)
      .limit(WORKSPACE_PRACTICE_FEEDBACK_COMPLETION_LIMIT)
      .get(),
    db
      .collectionGroup("practice_orders")
      .where("workspaceId", "==", actor.workspaceId)
      .limit(WORKSPACE_PRACTICE_FEEDBACK_ORDER_LIMIT)
      .get(),
    db
      .collection(`workspaces/${actor.workspaceId}/practice_assignments`)
      .limit(WORKSPACE_PRACTICE_ASSIGNMENT_LIMIT)
      .get(),
    listWorkspaceInstructorFeedbackRecords(actor.workspaceId)
  ]);
  const sessions = sessionSnapshot.docs
    .map((doc) => mapSession({ sessionId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: safeString(doc.data().studentId),
      sessionId: doc.id
    }))
    .filter((session) => session.status === "completed" && Boolean(session.assignmentId));
  const sessionIds = new Set(sessions.map((session) => session.sessionId));
  const orders = orderSnapshot.docs
    .map((doc) => mapOrder({ orderId: doc.id, ...doc.data() }, {
      workspaceId: actor.workspaceId,
      studentId: safeString(doc.data().studentId),
      orderId: doc.id
    }))
    .filter((order) => sessionIds.has(order.sessionId));
  const assignments = assignmentSnapshot.docs.map((doc) => mapPracticeAssignment({ assignmentId: doc.id, ...doc.data() }, {
    workspaceId: actor.workspaceId,
    assignmentId: doc.id
  }));

  return { sessions, orders, assignments, feedbackRecords };
}

function buildWorkspaceFeedbackCompletion(input: {
  workspaceId: string;
  session: PracticeSessionSummary;
  assignment?: PracticeAssignmentSummary;
  orders: PracticeOrderSummary[];
  feedback?: PracticeInstructorFeedbackRecord;
}): WorkspacePracticeAssignmentFeedbackCompletionSummary {
  const performance = computePracticePerformanceSummary({
    session: input.session,
    orders: input.orders
  });
  const challengeStatus = computePracticeChallengeStatus({
    session: input.session,
    orders: input.orders
  })?.status;
  const resubmissionStatus = input.feedback?.resubmissionRequest?.status ??
    input.session.resubmissionStatus ??
    "none";
  const queueStatus: PracticeAssignmentReviewQueueFilter = resubmissionStatus === "requested" || resubmissionStatus === "started"
    ? "resubmission_requested"
    : input.feedback?.publicationStatus === "published"
      ? "feedback_published"
      : input.feedback
        ? "feedback_draft"
        : "needs_review";

  return stripUndefined({
    feedbackTargetRef: maskFeedbackTargetRef(input.workspaceId, input.session.studentId, input.session.sessionId),
    assignmentId: input.session.assignmentId ?? input.assignment?.assignmentId ?? "",
    assignmentTitle: input.session.assignmentSnapshot?.title ?? input.assignment?.title ?? "Practice assignment",
    maskedStudentId: maskPracticeStudentId(input.session.studentId),
    maskedSessionRef: maskPracticeSessionRef(input.workspaceId, input.session.studentId, input.session.sessionId),
    sessionName: input.session.sessionName,
    symbol: input.session.symbol,
    assetClass: input.session.assetClass,
    timeframeMinutes: input.session.timeframeMinutes,
    completedAt: input.session.completedAt,
    closedTrades: performance.closedTrades,
    netPnl: performance.netPnl,
    winRate: performance.winRate,
    averageR: performance.averageR,
    challengeStatus,
    queueStatus,
    attemptNumber: input.session.assignmentAttemptNumber ?? input.session.assignmentSnapshot?.attemptNumber ?? 1,
    previousAttemptMaskedSessionRef: input.session.previousAttemptMaskedSessionRef ?? input.session.assignmentSnapshot?.previousAttemptMaskedSessionRef,
    resubmissionStatus,
    feedback: toInstructorFeedbackSummary(input.feedback)
  });
}

export function parseWorkspacePracticeReviewQueueRequest(url: string | URL) {
  const parsed = typeof url === "string" ? new URL(url) : url;
  const queue = parseWorkspaceReviewQueueFilter(parsed.searchParams.get("queue"));
  const assignmentId = safeId(parsed.searchParams.get("assignmentId"));

  return stripUndefined({
    queue,
    assignmentId: assignmentId || undefined
  });
}

export async function listWorkspacePracticeAssignmentFeedback(
  actor: VerifiedInfluencer,
  filters: ReturnType<typeof parseWorkspacePracticeReviewQueueRequest> = { queue: "all", assignmentId: undefined }
): Promise<WorkspacePracticeAssignmentFeedbackResponse> {
  const source = await listWorkspaceAssignmentFeedbackSource(actor);
  const assignmentsById = new Map(source.assignments.map((assignment) => [assignment.assignmentId, assignment]));
  const ordersBySession = new Map<string, PracticeOrderSummary[]>();
  const feedbackBySession = new Map(source.feedbackRecords.map((feedback) => [feedback.sessionId, feedback]));

  for (const order of source.orders) {
    ordersBySession.set(order.sessionId, [...(ordersBySession.get(order.sessionId) ?? []), order]);
  }

  const completions = source.sessions
    .sort((left, right) => String(right.completedAt ?? right.updatedAt).localeCompare(String(left.completedAt ?? left.updatedAt)))
    .map((session) => buildWorkspaceFeedbackCompletion({
      workspaceId: actor.workspaceId,
      session,
      assignment: session.assignmentId ? assignmentsById.get(session.assignmentId) : undefined,
      orders: ordersBySession.get(session.sessionId) ?? [],
      feedback: feedbackBySession.get(session.sessionId)
    }))
    .filter((completion) => !filters.assignmentId || completion.assignmentId === filters.assignmentId)
    .filter((completion) => filters.queue === "all" || filters.queue === "completed" || completion.queueStatus === filters.queue);

  return {
    ...createSourceMeta([
      "Workspace assignment feedback lists completed assignment summaries only.",
      "This response excludes raw trades, journal entries, annotations, drawings, reflections, hidden candles, provider payloads, credentials, vault refs, and AutoCopy internals."
    ]),
    ok: true,
    completions,
    filters,
    limit: WORKSPACE_PRACTICE_FEEDBACK_COMPLETION_LIMIT,
    safeMessage: "Instructor feedback is scoped to completed practice assignment sessions and uses masked student/session references."
  };
}

function normalizeInstructorFeedbackPayload(actor: VerifiedInfluencer, payload: unknown, target: WorkspacePracticeAssignmentFeedbackCompletionSummary & {
  session: PracticeSessionSummary;
}): PracticeInstructorFeedbackRecord {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_feedback_payload_invalid", "Instructor feedback details are required.");
  }

  const record = payload as Record<string, unknown>;
  const now = new Date().toISOString();
  const action = safeString(record.action);
  const publicationStatus = normalizeInstructorFeedbackPublicationStatus(
    action === "publish" ? "published" : record.publicationStatus ?? target.feedback?.publicationStatus,
    action === "publish" ? now : target.feedback?.publishedAt
  );
  const status = normalizeInstructorFeedbackStatus(
    publicationStatus === "published" ? "reviewed" : record.status ?? target.feedback?.status,
    publicationStatus === "published" ? now : target.feedback?.reviewedAt
  );
  const reviewerDisplayLabel = sanitizeFeedbackText(record.reviewerDisplayLabel, 80) ||
    sanitizeFeedbackText(actor.email?.split("@")[0], 80) ||
    "Workspace instructor";
  const resubmissionRequest = record.resubmissionRequest === undefined
    ? target.feedback?.resubmissionRequest
    : normalizeResubmissionRequest(record.resubmissionRequest, target.maskedSessionRef);

  return {
    feedbackId: instructorFeedbackId(target.session.sessionId),
    workspaceId: actor.workspaceId,
    studentId: target.session.studentId,
    assignmentId: target.assignmentId,
    sessionId: target.session.sessionId,
    feedbackTargetRef: target.feedbackTargetRef,
    maskedStudentId: target.maskedStudentId,
    maskedSessionRef: target.maskedSessionRef,
    reviewerId: actor.uid,
    reviewerDisplayLabel,
    status,
    publicationStatus,
    rubric: normalizeInstructorFeedbackRubric(record.rubric),
    feedbackNote: sanitizeFeedbackText(record.feedbackNote, 900),
    recommendedNextDrill: sanitizeFeedbackText(record.recommendedNextDrill, 160) || undefined,
    resubmissionRequest,
    reviewedAt: status === "reviewed" ? now : undefined,
    publishedAt: publicationStatus === "published" ? target.feedback?.publishedAt ?? now : undefined,
    createdAt: target.feedback?.createdAt ?? now,
    updatedAt: now,
    safeMessage: "Instructor feedback is a bounded rubric summary for a completed practice assignment."
  };
}

export async function upsertWorkspacePracticeAssignmentFeedback(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspacePracticeAssignmentFeedbackMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_feedback_payload_invalid", "Instructor feedback details are required.");
  }

  const record = payload as Record<string, unknown>;
  const feedbackTargetRef = safeString(record.feedbackTargetRef);
  const source = await listWorkspaceAssignmentFeedbackSource(actor);
  const assignmentsById = new Map(source.assignments.map((assignment) => [assignment.assignmentId, assignment]));
  const ordersBySession = new Map<string, PracticeOrderSummary[]>();
  const feedbackBySession = new Map(source.feedbackRecords.map((feedback) => [feedback.sessionId, feedback]));

  for (const order of source.orders) {
    ordersBySession.set(order.sessionId, [...(ordersBySession.get(order.sessionId) ?? []), order]);
  }

  const session = source.sessions.find((entry) =>
    maskFeedbackTargetRef(actor.workspaceId, entry.studentId, entry.sessionId) === feedbackTargetRef
  );

  if (!session) {
    throw new AdminApiError(404, "practice_feedback_target_not_found", "TradeHub could not find a completed practice assignment for that feedback target.");
  }

  const completion = {
    ...buildWorkspaceFeedbackCompletion({
      workspaceId: actor.workspaceId,
      session,
      assignment: session.assignmentId ? assignmentsById.get(session.assignmentId) : undefined,
      orders: ordersBySession.get(session.sessionId) ?? [],
      feedback: feedbackBySession.get(session.sessionId)
    }),
    session
  };
  const feedback = normalizeInstructorFeedbackPayload(actor, record, completion);
  const { db } = getFirebaseAdminClients();

  await db
    .doc(`workspaces/${actor.workspaceId}/students/${session.studentId}/practice_instructor_feedback/${feedback.feedbackId}`)
    .set(stripUndefined(feedback), { merge: true });

  const savedCompletion = buildWorkspaceFeedbackCompletion({
    workspaceId: actor.workspaceId,
    session,
    assignment: session.assignmentId ? assignmentsById.get(session.assignmentId) : undefined,
    orders: ordersBySession.get(session.sessionId) ?? [],
    feedback
  });

  return {
    ...createSourceMeta([
      "Instructor feedback was saved through a workspace-scoped server route.",
      "The mutation attaches only a bounded rubric summary to the student-owned assignment session."
    ]),
    ok: true,
    completion: savedCompletion,
    feedback: toInstructorFeedbackSummary(feedback) as PracticeInstructorFeedbackSummary,
    safeMessage: "Feedback saved. Student-visible feedback contains rubric scores and a bounded note only."
  };
}

export async function createStudentPracticePlaybook(
  actor: VerifiedStudent,
  payload: unknown
): Promise<PracticePlaybookMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_playbook_payload_invalid", "Strategy details are required.");
  }

  const record = payload as Record<string, unknown>;
  const name = safeString(record.name).slice(0, 80);

  if (name.length < 2) {
    throw new AdminApiError(400, "practice_playbook_name_required", "Name your Strategy.");
  }

  const now = new Date().toISOString();
  const playbookId = deterministicId(["playbook", actor.workspaceId, actor.studentId, name, now]);
  const playbook: PracticePlaybookRecord = {
    playbookId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    name,
    market: normalizeOptionalPracticeMarket(record.market),
    strategyType: safeString(record.strategyType).slice(0, 80) || "general",
    setupRules: safeString(record.setupRules).slice(0, 1000),
    entryChecklist: normalizeChecklist(record.entryChecklist),
    invalidationRules: safeString(record.invalidationRules).slice(0, 1000),
    riskNotes: safeString(record.riskNotes).slice(0, 1000),
    status: "active",
    description: safeString(record.description).slice(0, 500) || undefined,
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks/${playbookId}`).set(stripUndefined(playbook));

  return {
    ...createSourceMeta(),
    ok: true,
    playbook
  };
}

export async function updateStudentPracticePlaybook(
  actor: VerifiedStudent,
  payload: unknown
): Promise<PracticePlaybookMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_playbook_payload_invalid", "Strategy details are required.");
  }

  const record = payload as Record<string, unknown>;
  const playbookId = safeId(record.playbookId);

  if (!playbookId) {
    throw new AdminApiError(400, "practice_playbook_required", "Choose a Strategy to update.");
  }

  const name = safeString(record.name).slice(0, 80);

  if (name.length < 2) {
    throw new AdminApiError(400, "practice_playbook_name_required", "Name your Strategy.");
  }

  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks/${playbookId}`);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "practice_playbook_not_found", "TradeHub could not find that Strategy.");
  }

  const now = new Date().toISOString();
  const existing = snapshot.data() ?? {};
  const status = normalizePlaybookStatus(record.status, record.archive === true ? now : existing.archivedAt);
  const updated: PracticePlaybookRecord = {
    playbookId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    name,
    market: normalizeOptionalPracticeMarket(record.market ?? existing.market),
    strategyType: safeString(record.strategyType ?? existing.strategyType).slice(0, 80) || "general",
    setupRules: safeString(record.setupRules ?? existing.setupRules).slice(0, 1000),
    entryChecklist: normalizeChecklist(record.entryChecklist ?? existing.entryChecklist),
    invalidationRules: safeString(record.invalidationRules ?? existing.invalidationRules).slice(0, 1000),
    riskNotes: safeString(record.riskNotes ?? existing.riskNotes).slice(0, 1000),
    status,
    description: safeString(record.description).slice(0, 500) || undefined,
    archivedAt: status === "archived" ? record.archive === true ? now : safeString(existing.archivedAt) || now : undefined,
    createdAt: safeString(existing.createdAt) || now,
    updatedAt: now
  };

  await ref.set(stripUndefined(updated));

  return {
    ...createSourceMeta(["Practice playbooks are student-scoped strategy notes and remain separate from AutoCopy."]),
    ok: true,
    playbook: mapPlaybook({ ...updated }, {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      playbookId
    })
  };
}

export async function createStudentPracticeSession(
  actor: VerifiedStudent,
  payload: unknown,
  options?: {
    assignmentSnapshot?: PracticeSessionAssignmentSnapshot;
    assignmentAttemptNumber?: number;
    previousAttemptMaskedSessionRef?: string;
    resubmissionSourceFeedbackId?: string;
    resubmissionStatus?: PracticeAssignmentResubmissionStatus;
  }
): Promise<PracticeSessionMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_session_payload_invalid", "Practice session details are required.");
  }

  const record = payload as Record<string, unknown>;
  const assetClass = normalizeAssetClass(record.assetClass);
  const symbol = normalizeSymbol(record.symbol);
  const sessionName = safeString(record.sessionName).replace(/\s+/g, " ").slice(0, 80);
  const timeframeMinutes = normalizeTimeframe(record.timeframeMinutes);
  const requestedDateStart = normalizeIso(record.dateStart, "dateStart");
  const requestedDateEnd = normalizeIso(record.dateEnd, "dateEnd");
  const requestedStartMs = Date.parse(requestedDateStart);
  const requestedEndMs = Date.parse(requestedDateEnd);

  if (sessionName.length < 2) {
    throw new AdminApiError(400, "practice_session_name_required", "Add a session name with at least 2 characters.");
  }

  if (requestedEndMs <= requestedStartMs) {
    throw new AdminApiError(400, "practice_session_range_invalid", "Choose a practice session range where the end date is after the start date.");
  }

  if (requestedEndMs > Date.now()) {
    throw new AdminApiError(400, "practice_session_future_range", "Choose an end date that is not in the future.");
  }

  const requestedRangeMs = requestedEndMs - requestedStartMs;
  const maxRangeMs = historicalDataLimits.maxRangeDays * 24 * 60 * 60 * 1000;

  if (requestedRangeMs > maxRangeMs) {
    throw new AdminApiError(400, "practice_session_range_too_large", `Practice sessions are limited to ${historicalDataLimits.maxRangeDays} days.`);
  }

  const assetCatalogue = await getPracticeAssetCatalogue();
  const asset = assetCatalogue.find((item) =>
    item.assetClass === assetClass && item.symbol === symbol
  );

  if (!asset) {
    throw new AdminApiError(400, "practice_session_asset_unsupported", "Choose an available Crypto, Forex, or Metals asset.");
  }

  if (!asset.available) {
    throw new AdminApiError(503, "practice_session_history_unavailable", asset.safeMessage);
  }

  const validatedInstrument = asset.instrument ?? getPracticeInstrumentSpec(assetClass, symbol);

  if (!validatedInstrument) {
    throw new AdminApiError(503, "practice_session_instrument_unavailable", "Practice sizing is not available for that instrument right now.");
  }

  const startingBalance = safeNumber(record.startingBalance, Number.NaN);

  if (!Number.isFinite(startingBalance) || startingBalance < 1 || startingBalance > 1_000_000) {
    throw new AdminApiError(400, "practice_session_balance_invalid", "Starting balance must be between 1 and 1,000,000.");
  }

  const randomStartEnabled = record.randomStartEnabled === true || record.randomStart === true;
  const timeframeMs = timeframeMinutes * 60 * 1000;
  const maxWindowMs = Math.max(timeframeMs, Math.min(240, historicalDataLimits.maxCandlesPerRequest) * timeframeMs);
  const randomWindowMs = Math.min(requestedRangeMs, maxWindowMs);
  const randomizableMs = Math.max(0, requestedRangeMs - randomWindowMs);
  const selectedStartMs = randomStartEnabled && randomizableMs > 0
    ? requestedStartMs + Math.floor(Math.random() * (randomizableMs + 1) / timeframeMs) * timeframeMs
    : requestedStartMs;
  const selectedEndMs = randomStartEnabled
    ? Math.min(selectedStartMs + randomWindowMs, requestedEndMs)
    : requestedEndMs;
  const dateStart = new Date(selectedStartMs).toISOString();
  const dateEnd = new Date(selectedEndMs).toISOString();
  const riskPct = Math.max(0.1, Math.min(safeNumber(record.riskPct, 1), 10));
  const playbookId = safeId(record.playbookId) || undefined;

  if (playbookId) {
    const { playbook } = await getPracticePlaybookSnapshot(actor, playbookId);

    if (playbook.market && playbook.market !== assetClass) {
      throw new AdminApiError(409, "practice_session_strategy_market_mismatch", "Choose a Strategy for the selected market or No strategy.");
    }
  }

  const candleRequest = normalizeHistoricalCandleRequest({
    assetClass,
    symbol,
    timeframeMinutes,
    rangeStart: dateStart,
    rangeEnd: dateEnd
  });
  const candleResult = await fetchHistoricalCandlesWithCache(actor.workspaceId, candleRequest);

  if (!candleResult.candles.length) {
    throw new AdminApiError(503, "practice_session_candles_unavailable", "Historical candles are not available for that session setup right now.");
  }

  const challenge = normalizePracticeChallengeConfig(record.challenge, startingBalance);
  const now = new Date().toISOString();
  const sessionId = deterministicId(["practice_session", actor.workspaceId, actor.studentId, assetClass, symbol, String(timeframeMinutes), now]);
  const session: PracticeSessionRecord = {
    sessionId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    sessionName,
    assetClass,
    platformSource: assetClass === "crypto" ? "binance" : "metaapi_mt5",
    symbol,
    instrument: candleResult.instrument ?? validatedInstrument,
    timeframeMinutes,
    dateStart,
    dateEnd,
    requestedDateStart: randomStartEnabled ? requestedDateStart : undefined,
    requestedDateEnd: randomStartEnabled ? requestedDateEnd : undefined,
    randomStartEnabled,
    randomizedAt: randomStartEnabled ? now : undefined,
    startingBalance,
    riskPct,
    feeBps: normalizeAssumptionBps(record.feeBps),
    spreadBps: normalizeAssumptionBps(record.spreadBps),
    slippageBps: normalizeAssumptionBps(record.slippageBps),
    playbookId,
    assignmentId: options?.assignmentSnapshot?.assignmentId,
    assignmentSnapshot: options?.assignmentSnapshot,
    assignmentAttemptNumber: options?.assignmentAttemptNumber,
    previousAttemptMaskedSessionRef: options?.previousAttemptMaskedSessionRef,
    resubmissionSourceFeedbackId: options?.resubmissionSourceFeedbackId,
    resubmissionStatus: options?.resubmissionStatus,
    challenge,
    status: "draft",
    currentCandleIndex: 0,
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions/${sessionId}`).set(stripUndefined(session));

  return {
    ...createSourceMeta(["Practice sessions do not connect to live broker or exchange execution."]),
    ok: true,
    session
  };
}

export async function archiveStudentPracticeSession(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionMutationResponse> {
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);
  const now = new Date().toISOString();

  if (session.status === "archived") {
    return {
      ...createSourceMeta(["Archived practice sessions remain student-owned and review-only."]),
      ok: true,
      session
    };
  }

  const archived: PracticeSessionSummary = {
    ...session,
    status: "archived",
    archivedAt: now,
    archivedFromStatus: session.status,
    updatedAt: now
  };

  await ref.set({
    status: archived.status,
    archivedAt: archived.archivedAt,
    archivedFromStatus: archived.archivedFromStatus,
    updatedAt: now
  }, { merge: true });

  return {
    ...createSourceMeta([
      "Practice session archive is a server-owned student-scoped state change and does not touch orders, candles, ledgers, or execution systems."
    ]),
    ok: true,
    session: archived
  };
}

export async function restoreStudentPracticeSession(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionMutationResponse> {
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);

  if (session.status !== "archived") {
    return {
      ...createSourceMeta(["Practice session was already visible in the dashboard."]),
      ok: true,
      session
    };
  }

  const now = new Date().toISOString();
  const restoredStatus = normalizeRestorableSessionStatus(session.archivedFromStatus);
  const restored: PracticeSessionSummary = {
    ...session,
    status: restoredStatus,
    archivedAt: undefined,
    archivedFromStatus: undefined,
    updatedAt: now
  };

  await ref.set(stripUndefined(restored));

  return {
    ...createSourceMeta([
      "Practice session restore only changes safe dashboard visibility metadata for the signed-in student."
    ]),
    ok: true,
    session: restored
  };
}

export async function duplicateStudentPracticeSession(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  const now = new Date().toISOString();
  const duplicateName = `${(session.sessionName ?? session.symbol).slice(0, 68)} Copy`;
  const duplicateId = deterministicId(["practice_session_duplicate", actor.workspaceId, actor.studentId, session.sessionId, now]);
  const duplicate: PracticeSessionRecord = {
    sessionId: duplicateId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    sessionName: duplicateName,
    assetClass: session.assetClass,
    platformSource: session.platformSource,
    symbol: session.symbol,
    instrument: session.instrument,
    timeframeMinutes: session.timeframeMinutes,
    dateStart: session.dateStart,
    dateEnd: session.dateEnd,
    requestedDateStart: session.requestedDateStart,
    requestedDateEnd: session.requestedDateEnd,
    randomStartEnabled: session.randomStartEnabled,
    randomizedAt: session.randomStartEnabled ? now : undefined,
    startingBalance: session.startingBalance,
    riskPct: session.riskPct,
    feeBps: session.feeBps,
    spreadBps: session.spreadBps,
    slippageBps: session.slippageBps,
    playbookId: session.playbookId,
    challenge: session.challenge ? { ...session.challenge } : undefined,
    status: "draft",
    currentCandleIndex: 0,
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions/${duplicateId}`).set(stripUndefined(duplicate));

  return {
    ...createSourceMeta([
      "Practice session duplicate copies setup only. Orders, annotations, drawings, bookmarks, reflections, hidden candles, and ledger entries are not copied."
    ]),
    ok: true,
    session: duplicate
  };
}

const PRACTICE_SESSION_DELETE_BATCH_LIMIT = 400;

async function deletePracticeSessionQuery(query: FirebaseFirestore.Query) {
  const { db } = getFirebaseAdminClients();

  while (true) {
    const snapshot = await query.limit(PRACTICE_SESSION_DELETE_BATCH_LIMIT).get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function deletePracticeSessionOrdersAndLedger(actor: VerifiedStudent, sessionId: string) {
  const { db } = getFirebaseAdminClients();
  const orders = db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders`)
    .where("sessionId", "==", sessionId);

  while (true) {
    const snapshot = await orders.limit(120).get();

    if (snapshot.empty) {
      return;
    }

    const ledgerReferences: FirebaseFirestore.DocumentReference[] = [];
    const orderReferences: FirebaseFirestore.DocumentReference[] = [];

    for (const document of snapshot.docs) {
      const order = mapOrder({ orderId: document.id, ...document.data() }, {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        orderId: document.id
      });

      orderReferences.push(document.ref);
      ledgerReferences.push(
        db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/account_linked_trade_ledger/practice_backtest_${order.orderId}`)
      );

      for (const event of order.closeEvents ?? []) {
        ledgerReferences.push(
          db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/account_linked_trade_ledger/practice_backtest_${event.eventId}`)
        );
      }
    }

    // Keep the source orders discoverable until every derived ledger entry is gone.
    // If cleanup is interrupted, the next request can query the same orders and retry safely.
    for (let index = 0; index < ledgerReferences.length; index += PRACTICE_SESSION_DELETE_BATCH_LIMIT) {
      const batch = db.batch();
      ledgerReferences.slice(index, index + PRACTICE_SESSION_DELETE_BATCH_LIMIT).forEach((reference) => batch.delete(reference));
      await batch.commit();
    }

    for (let index = 0; index < orderReferences.length; index += PRACTICE_SESSION_DELETE_BATCH_LIMIT) {
      const batch = db.batch();
      orderReferences.slice(index, index + PRACTICE_SESSION_DELETE_BATCH_LIMIT).forEach((reference) => batch.delete(reference));
      await batch.commit();
    }
  }
}

export async function deleteStudentPracticeSession(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeSessionDeleteResponse> {
  const { db } = getFirebaseAdminClients();
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);
  const record = typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const expectedName = (session.sessionName ?? session.symbol).trim();
  const confirmationName = safeString(record.confirmationName).trim();

  if (!confirmationName || confirmationName !== expectedName) {
    throw new AdminApiError(400, "practice_session_delete_confirmation_invalid", "Enter the session name exactly to confirm permanent deletion.");
  }

  const feedbackRef = db.doc(
    `workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_instructor_feedback/${instructorFeedbackId(session.sessionId)}`
  );
  const feedbackSnapshot = await feedbackRef.get();

  if (session.assignmentId || session.assignmentSnapshot || feedbackSnapshot.exists) {
    throw new AdminApiError(
      409,
      "practice_session_delete_protected",
      "This assignment or reviewed session must be kept for learning records. Archive it instead."
    );
  }

  const studentPath = `workspaces/${actor.workspaceId}/students/${actor.studentId}`;
  const now = new Date().toISOString();

  // Stop new session mutations before multi-batch cleanup; the session stays retryable until the final delete.
  await ref.set({
    status: "archived",
    archivedAt: session.archivedAt ?? now,
    archivedFromStatus: session.archivedFromStatus ?? session.status,
    updatedAt: now
  }, { merge: true });

  await deletePracticeSessionOrdersAndLedger(actor, session.sessionId);
  await deletePracticeSessionQuery(
    db.collection(`${studentPath}/practice_annotations`).where("sessionId", "==", session.sessionId)
  );
  await deletePracticeSessionQuery(
    db.collection(`${studentPath}/practice_bookmarks`).where("sessionId", "==", session.sessionId)
  );
  await deletePracticeSessionQuery(
    db.collection(`${studentPath}/practice_drawings`).where("sessionId", "==", session.sessionId)
  );
  await ref.delete();

  return {
    ...createSourceMeta([
      "Permanent deletion was limited to one signed-in student's standalone practice session and its session-owned records."
    ]),
    ok: true,
    deleted: true,
    safeMessage: "Practice session permanently deleted."
  };
}

export async function createStudentPracticeOrder(
  actor: VerifiedStudent,
  payload: unknown
): Promise<PracticeOrderMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_order_payload_invalid", "Practice order details are required.");
  }

  const record = payload as Record<string, unknown>;
  const sessionId = safeId(record.sessionId);

  if (!sessionId) {
    throw new AdminApiError(400, "practice_session_required", "Choose a practice session before drafting an order.");
  }

  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const selectedPlaybookId = safeId(record.playbookId) || session.playbookId;
  let playbook: PracticePlaybookSummary | undefined;

  if (selectedPlaybookId) {
    ({ playbook } = await getPracticePlaybookSnapshot(actor, selectedPlaybookId));

    if (playbook.market && playbook.market !== session.assetClass) {
      throw new AdminApiError(409, "practice_playbook_market_mismatch", "Choose a Strategy that matches this practice session market.");
    }
  }

  const orderType = normalizeOrderType(record.orderType);
  const direction: PracticeOrderDirection = record.direction === "sell" ? "sell" : "buy";
  const candlesResult = await fetchSessionCandles(actor, session);
  const revealedCandles = candlesResult.candles.slice(0, session.currentCandleIndex + 1);
  const latestRevealedCandle = revealedCandles[revealedCandles.length - 1];

  if (!latestRevealedCandle) {
    throw new AdminApiError(400, "practice_order_no_revealed_candle", "Reveal at least one candle before placing a simulated practice order.");
  }

  const existingOrders = await listChallengeOrdersForSession(actor, session.sessionId);

  assertPracticeChallengeAllowsNewOrder({
    session,
    orders: existingOrders,
    practiceDay: latestRevealedCandle.closeTime.slice(0, 10)
  });

  const entryPrice = orderType === "market"
    ? marketOrderFillPriceFromLatestRevealedCandle(latestRevealedCandle)
    : Math.max(0, safeNumber(record.requestedPrice, 0));

  if (entryPrice <= 0) {
    throw new AdminApiError(400, "practice_order_price_required", "Enter a requested price for limit or stop simulated orders.");
  }

  const stopLoss = safeNumber(record.stopLoss, 0);
  const takeProfit = safeNumber(record.takeProfit, 0);

  validateDirectionalPracticeLevels({
    direction,
    entryPrice,
    stopLoss,
    takeProfit
  });

  const sizing = calculatePracticeRiskSizing({
    startingBalance: session.startingBalance,
    riskPct: session.riskPct,
    entryPrice,
    stopLoss,
    takeProfit,
    assetClass: session.assetClass,
    symbol: session.symbol,
    instrument: session.instrument,
    direction
  });
  const now = new Date().toISOString();
  const orderId = deterministicId(["practice_order", actor.workspaceId, actor.studentId, sessionId, orderType, direction, String(entryPrice), now]);
  const initialStatus: PracticeOrderStatus = orderType === "market" ? "open" : "pending";
  const order: PracticeOrderRecord = {
    orderId,
    sessionId: session.sessionId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    orderType,
    direction,
    status: initialStatus,
    requestedPrice: entryPrice,
    filledPrice: orderType === "market" ? entryPrice : undefined,
    size: sizing.size,
    remainingSize: sizing.size,
    closedSize: 0,
    notional: sizing.notional,
    instrument: sizing.instrument,
    stopDistance: sizing.stopDistance,
    stopDistanceInPips: sizing.stopDistanceInPips,
    stopLoss,
    takeProfit,
    riskAmount: sizing.riskAmount,
    playbookId: playbook?.playbookId,
    playbookName: playbook?.name,
    openedAtCandleTime: orderType === "market" ? latestRevealedCandle.closeTime : undefined,
    evaluatedThroughCandleIndex: session.currentCandleIndex,
    tags: Array.isArray(record.tags) ? record.tags.map(safeString).filter(Boolean).slice(0, 12) : [],
    checklistNotes: safeString(record.checklistNotes).slice(0, 500) || undefined,
    notes: safeString(record.notes).slice(0, 500) || undefined,
    screenshotUrls: [],
    closeEvents: [],
    safeMessage: orderType === "market"
      ? "Simulated market practice order filled at the latest revealed candle close."
      : "Simulated pending practice order will be evaluated only against revealed candles.",
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders/${orderId}`).set(stripUndefined(order));

  return {
    ...createSourceMeta([
      "Practice orders are simulated only; no broker, exchange, AutoCopy, or live execution adapter is called.",
      "Market practice order rule: fill at the latest revealed candle close."
    ]),
    ok: true,
    order,
    challengeStatus: computePracticeChallengeStatus({
      session,
      orders: [order, ...existingOrders]
    })
  };
}

export async function listStudentPracticeSessionOrders(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionOrdersResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  const orders = await listOrdersForSession(actor, session.sessionId);
  const performance = computePracticePerformanceSummary({ session, orders });

  return {
    ...createSourceMeta(["Practice orders are student-scoped simulated records and remain separate from AutoCopy."]),
    ok: true,
    session,
    orders,
    performance,
    challengeStatus: computePracticeChallengeStatus({ session, orders }),
    visibleLimit: PRACTICE_VISIBLE_LIMIT
  };
}

export async function updateStudentPracticeSessionAssumptions(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeSessionAssumptionsMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_assumptions_payload_invalid", "Send valid practice assumption settings.");
  }

  const record = payload as Record<string, unknown>;
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const now = new Date().toISOString();
  const updatedSession: PracticeSessionSummary = {
    ...session,
    feeBps: normalizeAssumptionBps(record.feeBps),
    spreadBps: normalizeAssumptionBps(record.spreadBps),
    slippageBps: normalizeAssumptionBps(record.slippageBps),
    updatedAt: now
  };

  await ref.set({
    feeBps: updatedSession.feeBps,
    spreadBps: updatedSession.spreadBps,
    slippageBps: updatedSession.slippageBps,
    updatedAt: now
  }, { merge: true });

  const orders = await listOrdersForSession(actor, session.sessionId);

  return {
    ...createSourceMeta(["Practice fee/spread/slippage assumptions affect simulated analytics only and never call external providers."]),
    ok: true,
    session: updatedSession,
    performance: computePracticePerformanceSummary({ session: updatedSession, orders })
  };
}

export async function cancelStudentPracticeOrder(
  actor: VerifiedStudent,
  sessionId: string,
  orderId: string
): Promise<PracticeOrderMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, order } = await getPracticeOrderSnapshot(actor, orderId);

  if (order.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_order_not_found", "TradeHub could not find that simulated practice order for this session.");
  }

  if (order.status !== "pending" && order.status !== "draft") {
    throw new AdminApiError(409, "practice_order_cancel_blocked", "Only pending simulated practice orders can be cancelled.");
  }

  const now = new Date().toISOString();
  const cancelled: PracticeOrderSummary = {
    ...order,
    status: "cancelled",
    closeReason: "cancelled",
    closedAtCandleTime: undefined,
    safeMessage: "Simulated pending practice order cancelled.",
    updatedAt: now
  };

  await ref.set(stripUndefined(cancelled), { merge: true });
  const sessionOrders = (await listChallengeOrdersForSession(actor, session.sessionId))
    .map((candidate) => candidate.orderId === cancelled.orderId ? cancelled : candidate);

  return {
    ...createSourceMeta(["Cancelled practice orders are simulated records only."]),
    ok: true,
    order: cancelled,
    challengeStatus: computePracticeChallengeStatus({ session, orders: sessionOrders })
  };
}

export async function manuallyCloseStudentPracticeOrder(
  actor: VerifiedStudent,
  sessionId: string,
  orderId: string
): Promise<PracticeOrderMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, order } = await getPracticeOrderSnapshot(actor, orderId);

  if (order.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_order_not_found", "TradeHub could not find that simulated practice order for this session.");
  }

  if (order.status !== "open") {
    throw new AdminApiError(409, "practice_order_manual_close_blocked", "Only open simulated practice orders can be manually closed.");
  }

  const candlesResult = await fetchSessionCandles(actor, session);
  const revealedCandles = candlesResult.candles.slice(0, session.currentCandleIndex + 1);
  const latestRevealedCandle = revealedCandles[revealedCandles.length - 1];

  if (!latestRevealedCandle) {
    throw new AdminApiError(400, "practice_order_no_revealed_candle", "Reveal at least one candle before manually closing a simulated order.");
  }

  const entryPrice = order.filledPrice ?? order.requestedPrice;
  const exitPrice = latestRevealedCandle.close;
  const remainingSize = order.remainingSize ?? order.size ?? 0;
  const previousClosedSize = order.closedSize ?? 0;

  if (remainingSize <= 0) {
    throw new AdminApiError(409, "practice_order_no_remaining_size", "That simulated order has no remaining quantity to close.");
  }

  const pnl = pnlForPracticeOrder({
    assetClass: session.assetClass,
    symbol: session.symbol,
    instrument: order.instrument,
    direction: order.direction,
    entryPrice,
    exitPrice,
    size: remainingSize
  });
  const riskAmount = order.riskAmount && order.riskAmount > 0 ? order.riskAmount : undefined;
  const now = new Date().toISOString();
  const closeEvent = buildPracticeCloseEvent({
    order,
    session,
    exitPrice,
    closeReason: "manual",
    candleIndex: session.currentCandleIndex,
    candleTime: latestRevealedCandle.closeTime,
    eventType: "full_close",
    closedSize: remainingSize,
    remainingSize: 0
  });
  const closed: PracticeOrderSummary = {
    ...order,
    status: "closed",
    closeReason: "manual",
    closedAtCandleTime: latestRevealedCandle.closeTime,
    remainingSize: 0,
    closedSize: roundPracticeQuantity(previousClosedSize + remainingSize, order.instrument),
    pnl: (order.pnl ?? 0) + pnl,
    rMultiple: riskAmount ? Math.round((((order.pnl ?? 0) + pnl) / riskAmount) * 100) / 100 : undefined,
    evaluatedThroughCandleIndex: session.currentCandleIndex,
    closeEvents: [...(order.closeEvents ?? []), closeEvent],
    safeMessage: "Simulated practice order manually closed at the latest revealed candle close.",
    updatedAt: now
  };

  await ref.set(stripUndefined(closed), { merge: true });
  await writePracticeCloseEventLedger(session, closed, closeEvent);
  await writePracticeLedgerIfClosed(session, closed);
  const sessionOrders = (await listChallengeOrdersForSession(actor, session.sessionId))
    .map((candidate) => candidate.orderId === closed.orderId ? closed : candidate);
  const challengeStatus = await persistPracticeChallengeResultIfNeeded({ session, orders: sessionOrders });

  return {
    ...createSourceMeta(["Manual close uses the latest revealed candle close; no live order endpoint is called."]),
    ok: true,
    order: closed,
    challengeStatus
  };
}

export async function updateStudentPracticeOrderLevels(
  actor: VerifiedStudent,
  sessionId: string,
  orderId: string,
  payload: unknown
): Promise<PracticeOrderMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_order_levels_payload_invalid", "Send valid simulated SL/TP levels.");
  }

  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, order } = await getPracticeOrderSnapshot(actor, orderId);

  if (order.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_order_not_found", "TradeHub could not find that simulated practice order for this session.");
  }

  if (order.status !== "open" && order.status !== "pending") {
    throw new AdminApiError(409, "practice_order_levels_blocked", "Only open or pending simulated practice orders can edit SL/TP.");
  }

  const record = payload as Record<string, unknown>;
  const stopLoss = safeNumber(record.stopLoss, 0);
  const takeProfit = safeNumber(record.takeProfit, 0);
  const entryPrice = order.filledPrice ?? order.requestedPrice;

  validateDirectionalPracticeLevels({
    direction: order.direction,
    entryPrice,
    stopLoss,
    takeProfit
  });
  const instrument = order.instrument ?? session.instrument ?? getPracticeInstrumentSpec(session.assetClass, session.symbol);

  if (!instrument) {
    throw new AdminApiError(400, "practice_instrument_spec_unsupported", "TradeHub does not support that practice instrument yet.");
  }

  validatePracticePriceTickAlignment({ instrument, prices: [entryPrice, stopLoss, takeProfit] });

  const remainingSize = order.remainingSize ?? order.size ?? 0;
  const sizing = remainingSize > 0
    ? riskAmountForPracticeQuantity({
      assetClass: session.assetClass,
      symbol: session.symbol,
      instrument,
      entryPrice,
      stopLoss,
      size: remainingSize
    })
    : undefined;
  const now = new Date().toISOString();
  const updated: PracticeOrderSummary = {
    ...order,
    stopLoss,
    takeProfit,
    riskAmount: sizing?.riskAmount ?? order.riskAmount,
    instrument: sizing?.instrument ?? order.instrument,
    stopDistance: sizing?.stopDistance ?? order.stopDistance,
    stopDistanceInPips: sizing?.stopDistanceInPips ?? order.stopDistanceInPips,
    safeMessage: "Simulated practice order SL/TP updated after direction and price-step validation.",
    updatedAt: now
  };

  await ref.set(stripUndefined(updated), { merge: true });

  return {
    ...createSourceMeta(["Practice SL/TP edits are simulated only and validated server-side."]),
    ok: true,
    order: updated
  };
}

export async function partiallyCloseStudentPracticeOrder(
  actor: VerifiedStudent,
  sessionId: string,
  orderId: string,
  payload: unknown
): Promise<PracticeOrderMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_partial_close_payload_invalid", "Send a valid partial close amount.");
  }

  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, order } = await getPracticeOrderSnapshot(actor, orderId);

  if (order.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_order_not_found", "TradeHub could not find that simulated practice order for this session.");
  }

  if (order.status !== "open") {
    throw new AdminApiError(409, "practice_partial_close_blocked", "Only open simulated practice orders can be partially closed.");
  }

  const remainingSize = order.remainingSize ?? order.size ?? 0;

  if (remainingSize <= 0) {
    throw new AdminApiError(409, "practice_order_no_remaining_size", "That simulated order has no remaining quantity to close.");
  }

  const record = payload as Record<string, unknown>;
  const percent = safeNumber(record.percent, 0);
  const quantity = safeNumber(record.quantity, 0);
  const instrument = order.instrument ?? session.instrument ?? getPracticeInstrumentSpec(session.assetClass, session.symbol);

  if (!instrument || !practiceQuantityAlignsWithStep(remainingSize, instrument)) {
    throw new AdminApiError(409, "practice_order_quantity_step_invalid", "That simulated order quantity cannot be safely closed with this instrument's quantity step.");
  }

  const requestedCloseSize = quantity > 0 ? quantity : remainingSize * percent / 100;
  const closeSize = quantizePracticeQuantityDown(requestedCloseSize, instrument);
  const minimumCloseSize = Math.max(instrument.quantityStep, instrument.minSimulatedSize);

  if (
    !Number.isFinite(requestedCloseSize) || requestedCloseSize <= 0 ||
    !practiceQuantityAlignsWithStep(closeSize, instrument) ||
    closeSize < minimumCloseSize || closeSize >= remainingSize
  ) {
    throw new AdminApiError(400, "practice_partial_close_size_invalid", "Partial close quantity must meet this instrument's minimum and quantity step, and remain below the open quantity.");
  }

  const totalSize = order.size ?? 0;
  const totalStepCount = practiceQuantityStepCount(totalSize, instrument);
  const remainingStepCount = practiceQuantityStepCount(remainingSize, instrument);
  const closeStepCount = practiceQuantityStepCount(closeSize, instrument);
  const previouslyClosedStepCount = practiceQuantityStepCount(order.closedSize ?? 0, instrument);
  const remainingAfterStepCount = remainingStepCount - closeStepCount;
  const remainingAfterClose = practiceQuantityFromStepCount(remainingAfterStepCount, instrument);
  const closedAfterClose = practiceQuantityFromStepCount(totalStepCount - remainingAfterStepCount, instrument);

  if (
    !Number.isInteger(totalStepCount) || !Number.isInteger(remainingStepCount) || !Number.isInteger(closeStepCount) ||
    !Number.isInteger(previouslyClosedStepCount) || previouslyClosedStepCount + remainingStepCount !== totalStepCount ||
    previouslyClosedStepCount + closeStepCount !== totalStepCount - remainingAfterStepCount ||
    remainingAfterStepCount <= 0 || remainingAfterClose < instrument.minSimulatedSize ||
    !practiceQuantityAlignsWithStep(remainingAfterClose, instrument) ||
    !practiceQuantityAlignsWithStep(closedAfterClose, instrument)
  ) {
    throw new AdminApiError(400, "practice_partial_close_remainder_invalid", "Choose a partial close that leaves a permitted step-aligned remaining quantity, or close the order in full.");
  }

  const candlesResult = await fetchSessionCandles(actor, session);
  const revealedCandles = candlesResult.candles.slice(0, session.currentCandleIndex + 1);
  const latestRevealedCandle = revealedCandles[revealedCandles.length - 1];

  if (!latestRevealedCandle) {
    throw new AdminApiError(400, "practice_order_no_revealed_candle", "Reveal at least one candle before partially closing a simulated order.");
  }

  const exitPrice = latestRevealedCandle.close;
  const minimumNotional = instrument.minSimulatedNotional ?? 0;

  if (
    practiceNotionalForInstrument(instrument, exitPrice, closeSize) < minimumNotional ||
    practiceNotionalForInstrument(instrument, exitPrice, remainingAfterClose) < minimumNotional
  ) {
    throw new AdminApiError(400, "practice_partial_close_notional_invalid", "Partial close and remaining quantities must each meet this instrument's simulated minimum notional.");
  }

  const closeEvent = buildPracticeCloseEvent({
    order,
    session,
    exitPrice,
    closeReason: "manual",
    candleIndex: session.currentCandleIndex,
    candleTime: latestRevealedCandle.closeTime,
    eventType: "partial_close",
    closedSize: closeSize,
    remainingSize: remainingAfterClose
  });
  const riskAmount = order.riskAmount && order.riskAmount > 0 ? order.riskAmount : undefined;
  const pnl = (order.pnl ?? 0) + closeEvent.pnl;
  const now = new Date().toISOString();
  const updated: PracticeOrderSummary = {
    ...order,
    status: "open",
    remainingSize: remainingAfterClose,
    closedSize: closedAfterClose,
    pnl,
    rMultiple: riskAmount ? Math.round((pnl / riskAmount) * 100) / 100 : undefined,
    evaluatedThroughCandleIndex: session.currentCandleIndex,
    closeEvents: [...(order.closeEvents ?? []), closeEvent],
    safeMessage: "Simulated practice order partially closed at the latest revealed candle close.",
    updatedAt: now
  };

  await ref.set(stripUndefined(updated), { merge: true });
  await writePracticeCloseEventLedger(session, updated, closeEvent);
  const sessionOrders = (await listChallengeOrdersForSession(actor, session.sessionId))
    .map((candidate) => candidate.orderId === updated.orderId ? updated : candidate);
  const challengeStatus = await persistPracticeChallengeResultIfNeeded({ session, orders: sessionOrders });

  return {
    ...createSourceMeta(["Partial close uses the latest revealed candle close and reduces simulated remaining quantity only."]),
    ok: true,
    order: updated,
    challengeStatus
  };
}

export async function evaluateStudentPracticeSessionOrders(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeOrderEvaluationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const candlesResult = await fetchSessionCandles(actor, session);
  const revealedCandles = candlesResult.candles.slice(0, session.currentCandleIndex + 1);

  if (revealedCandles.length <= 0) {
    throw new AdminApiError(400, "practice_evaluation_no_revealed_candles", "Reveal at least one candle before evaluating simulated orders.");
  }

  const orders = await listOrdersForSession(actor, session.sessionId);
  const { db } = getFirebaseAdminClients();
  const evaluatedOrders: PracticeOrderSummary[] = [];
  let evaluatedOrderCount = 0;
  let closedOrderCount = 0;

  await Promise.all(orders.map(async (order) => {
    if (order.status !== "pending" && order.status !== "open") {
      evaluatedOrders.push(order);
      return;
    }

    const evaluated = evaluatePracticeOrderAgainstRevealedCandles({
      order,
      session,
      revealedCandles,
      currentCandleIndex: session.currentCandleIndex
    });
    const updatedAt = new Date().toISOString();
    const nextOrder = {
      ...evaluated,
      updatedAt
    };

    evaluatedOrderCount += 1;

    if (nextOrder.status === "closed") {
      closedOrderCount += 1;
    }

    await db
      .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders/${order.orderId}`)
      .set(stripUndefined(nextOrder), { merge: true });
    const previousEventIds = new Set((order.closeEvents ?? []).map((event) => event.eventId));

    await Promise.all((nextOrder.closeEvents ?? [])
      .filter((event) => !previousEventIds.has(event.eventId))
      .map((event) => writePracticeCloseEventLedger(session, nextOrder, event)));
    await writePracticeLedgerIfClosed(session, nextOrder);
    evaluatedOrders.push(nextOrder);
  }));

  const playbooks = await listPlaybooks(actor);
  const challengeOrders = (await listChallengeOrdersForSession(actor, session.sessionId))
    .map((candidate) => evaluatedOrders.find((order) => order.orderId === candidate.orderId) ?? candidate);
  const challengeStatus = await persistPracticeChallengeResultIfNeeded({
    session,
    orders: challengeOrders
  });

  return {
    ...createSourceMeta([
      "Practice fill evaluation uses only candles sliced through currentCandleIndex; future candles are not evaluated."
    ]),
    ok: true,
    session,
    orders: evaluatedOrders.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    performance: computePracticePerformanceSummary({ session, orders: evaluatedOrders }),
    challengeStatus,
    playbookPerformance: computePracticePlaybookPerformance({ playbooks, orders: evaluatedOrders, sessions: [session] }),
    evaluatedThroughCandleIndex: session.currentCandleIndex,
    evaluatedOrderCount,
    closedOrderCount
  };
}

export async function fetchStudentHistoricalCandles(
  actor: VerifiedStudent,
  payload: unknown
): Promise<HistoricalCandlesResponse> {
  const request = normalizeHistoricalCandleRequest(payload);
  const result = await fetchHistoricalCandlesWithCache(actor.workspaceId, request);

  return {
    ...createSourceMeta([
      "Historical candles are normalized server-side and returned only for the requested bounded range."
    ]),
    ok: true,
    assetClass: request.assetClass,
    symbol: request.symbol,
    timeframeMinutes: request.timeframeMinutes,
    rangeStart: request.rangeStart,
    rangeEnd: request.rangeEnd,
    candleCount: result.candles.length,
    candles: result.candles.map(toStudentPracticeCandle)
  };
}

export async function fetchStudentRevealedPracticeCandles(
  actor: VerifiedStudent,
  sessionId: string,
  requestedIndex?: unknown
): Promise<RevealedPracticeCandlesResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  const result = await fetchSessionCandles(actor, session);
  const availableCandleCount = result.candles.length;
  const persistedCurrentCandleIndex = Math.max(0, Math.floor(session.currentCandleIndex));
  const normalizedRequestedIndex = requestedIndex === undefined
    ? persistedCurrentCandleIndex
    : normalizeReplayIndex(requestedIndex);
  const currentCandleIndex = availableCandleCount > 0
    ? Math.min(normalizedRequestedIndex, persistedCurrentCandleIndex, availableCandleCount - 1)
    : 0;
  const revealedCandles = availableCandleCount > 0
    ? result.candles.slice(0, currentCandleIndex + 1)
    : [];
  const eventMarkers = listVisiblePracticeEventsForRevealedCandles({
    session: {
      ...session,
      currentCandleIndex
    },
    revealedCandles
  });

  return {
    ...createSourceMeta([
      "Replay candles are sliced server-side through the current reveal index; unrevealed future candles are not returned."
    ]),
    ok: true,
    session: {
      ...session,
      currentCandleIndex
    },
    assetClass: session.assetClass,
    symbol: session.symbol,
    timeframeMinutes: session.timeframeMinutes,
    rangeStart: session.dateStart,
    rangeEnd: session.dateEnd,
    currentCandleIndex,
    availableCandleCount,
    revealedCandleCount: revealedCandles.length,
    candles: revealedCandles.map(toStudentPracticeCandle),
    eventMarkers
  };
}

export async function updateStudentPracticeReplayIndex(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeReplayIndexMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_replay_payload_invalid", "Replay index details are required.");
  }

  const record = payload as Record<string, unknown>;
  const targetIndex = normalizeReplayIndex(record.currentCandleIndex);
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);

  if (session.status === "completed" || session.status === "abandoned") {
    throw new AdminApiError(409, "practice_session_locked", "Completed or abandoned practice sessions cannot be advanced.");
  }

  const result = await fetchSessionCandles(actor, session);
  const availableCandleCount = result.candles.length;

  if (availableCandleCount <= 0) {
    throw new AdminApiError(400, "practice_replay_no_candles", "No candles are available for this practice session yet.");
  }

  if (targetIndex > availableCandleCount - 1) {
    throw new AdminApiError(400, "practice_replay_index_out_of_bounds", "The replay index cannot exceed the available candle range.");
  }

  const now = new Date().toISOString();
  const nextStatus = session.status === "draft" && targetIndex > 0 ? "active" : session.status;

  await ref.set({
    currentCandleIndex: targetIndex,
    status: nextStatus,
    updatedAt: now
  }, { merge: true });

  return {
    ...createSourceMeta(["Practice replay index is persisted server-side after ownership and candle bounds checks."]),
    ok: true,
    session: {
      ...session,
      status: nextStatus,
      currentCandleIndex: targetIndex,
      updatedAt: now
    },
    currentCandleIndex: targetIndex,
    availableCandleCount
  };
}

export async function navigateStudentPracticeReplay(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeReplayIndexMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_navigation_payload_invalid", "Navigation details are required.");
  }

  const record = payload as Record<string, unknown>;
  const mode = safeString(record.mode);
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);

  if (session.status === "completed" || session.status === "abandoned") {
    throw new AdminApiError(409, "practice_session_locked", "Completed or abandoned practice sessions cannot be advanced.");
  }

  const result = await fetchSessionCandles(actor, session);
  const availableCandleCount = result.candles.length;

  if (availableCandleCount <= 0) {
    throw new AdminApiError(400, "practice_replay_no_candles", "No candles are available for this practice session yet.");
  }

  let targetIndex = Math.max(0, Math.floor(session.currentCandleIndex));

  if (mode === "start") {
    targetIndex = 0;
  } else if (mode === "latest_revealed") {
    targetIndex = Math.max(0, Math.floor(session.currentCandleIndex));
  } else if (mode === "index") {
    targetIndex = normalizeReplayIndex(record.candleIndex);
  } else if (mode === "datetime") {
    const targetTime = Date.parse(safeString(record.dateTime));

    if (!Number.isFinite(targetTime)) {
      throw new AdminApiError(400, "practice_navigation_datetime_invalid", "Choose a valid practice replay date or time.");
    }

    const matchingIndex = result.candles.findIndex((candle) => Date.parse(candle.openTime) >= targetTime);
    targetIndex = matchingIndex >= 0 ? matchingIndex : availableCandleCount - 1;
  } else {
    throw new AdminApiError(400, "practice_navigation_mode_invalid", "Choose start, latest revealed, candle index, or date/time navigation.");
  }

  targetIndex = Math.max(0, Math.min(targetIndex, availableCandleCount - 1));

  if (targetIndex > session.currentCandleIndex && record.revealToTarget !== true) {
    targetIndex = Math.max(0, Math.floor(session.currentCandleIndex));
  }

  const now = new Date().toISOString();
  const nextStatus = session.status === "draft" && targetIndex > 0 ? "active" : session.status;

  await ref.set({
    currentCandleIndex: targetIndex,
    status: nextStatus,
    updatedAt: now
  }, { merge: true });

  return {
    ...createSourceMeta(["Practice terminal Go To navigation is server-clamped and reveals only bounded candles for this student-owned session."]),
    ok: true,
    session: {
      ...session,
      status: nextStatus,
      currentCandleIndex: targetIndex,
      updatedAt: now
    },
    currentCandleIndex: targetIndex,
    availableCandleCount
  };
}

export async function createStudentPracticeTimeframeSession(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeSessionMutationResponse> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_timeframe_payload_invalid", "Choose a target timeframe.");
  }

  const record = payload as Record<string, unknown>;
  const timeframeMinutes = normalizeTimeframe(record.timeframeMinutes);
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);

  if (timeframeMinutes === session.timeframeMinutes) {
  return {
      ...createSourceMeta(["Practice timeframe selection kept the current student-owned session."]),
      ok: true,
      session
    };
  }

  return createStudentPracticeSession(actor, {
    sessionName: `${session.sessionName ?? session.symbol} ${timeframeMinutes}m`,
    assetClass: session.assetClass,
    symbol: session.symbol,
    timeframeMinutes,
    dateStart: session.requestedDateStart ?? session.dateStart,
    dateEnd: session.requestedDateEnd ?? session.dateEnd,
    startingBalance: session.startingBalance,
    riskPct: session.riskPct,
    feeBps: session.feeBps,
    spreadBps: session.spreadBps,
    slippageBps: session.slippageBps,
    playbookId: session.playbookId,
    challenge: session.challenge,
    randomStartEnabled: false
  });
}

async function normalizeBookmarkPayload(input: {
  actor: VerifiedStudent;
  session: PracticeSessionSummary;
  payload: unknown;
  existing?: PracticeBookmarkSummary;
}): Promise<Omit<PracticeBookmarkRecord, "bookmarkId" | "createdAt" | "updatedAt">> {
  if (typeof input.payload !== "object" || input.payload === null || Array.isArray(input.payload)) {
    throw new AdminApiError(400, "practice_bookmark_payload_invalid", "Bookmark details are required.");
  }

  const record = input.payload as Record<string, unknown>;
  const candleIndex = record.candleIndex === undefined && input.existing
    ? input.existing.candleIndex
    : record.candleIndex === undefined
      ? input.session.currentCandleIndex
      : normalizeReplayIndex(record.candleIndex);

  if (candleIndex > input.session.currentCandleIndex) {
    throw new AdminApiError(400, "practice_bookmark_future_candle_blocked", "Practice bookmarks cannot reference unrevealed future candles.");
  }

  const orderId = safeId(record.orderId ?? input.existing?.orderId);
  if (orderId) {
    const { order } = await getPracticeOrderSnapshot(input.actor, orderId);

    if (order.sessionId !== input.session.sessionId) {
      throw new AdminApiError(404, "practice_bookmark_order_not_found", "TradeHub could not find that simulated order for this session.");
    }
  }

  const drawingId = safeId(record.drawingId ?? input.existing?.drawingId);
  if (drawingId) {
    const { annotation } = await getPracticeAnnotationSnapshot(input.actor, drawingId);

    if (annotation.sessionId !== input.session.sessionId) {
      throw new AdminApiError(404, "practice_bookmark_drawing_not_found", "TradeHub could not find that drawing for this session.");
    }
  }

  let candleTime: string | undefined = input.existing?.candleTime;
  const candles = await fetchSessionCandles(input.actor, input.session);
  const candle = candles.candles[candleIndex];

  if (candle) {
    candleTime = candle.openTime;
  }

  return {
    workspaceId: input.actor.workspaceId,
    studentId: input.actor.studentId,
    sessionId: input.session.sessionId,
    candleIndex,
    candleTime,
    priceLevel: record.priceLevel === undefined
      ? input.existing?.priceLevel
      : Math.max(0, safeNumber(record.priceLevel, 0)) || undefined,
    label: normalizeBookmarkText(record.label) ?? input.existing?.label,
    note: normalizeBookmarkText(record.note) ?? input.existing?.note,
    orderId: orderId || undefined,
    drawingId: drawingId || undefined
  };
}

export async function createStudentPracticeBookmark(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeBookmarkMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const now = new Date().toISOString();
  const bookmarkId = deterministicId(["practice_bookmark", actor.workspaceId, actor.studentId, session.sessionId, String(now)]);
  const normalized = await normalizeBookmarkPayload({ actor, session, payload });
  const bookmark: PracticeBookmarkRecord = {
    bookmarkId,
    ...normalized,
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();

  await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_bookmarks/${bookmarkId}`)
    .set(stripUndefined(bookmark));

  const bookmarks = await listBookmarksForSession(actor, session.sessionId);

  return {
    ...createSourceMeta(["Practice bookmarks are student-owned replay navigation markers and cannot reference unrevealed candles."]),
    ok: true,
    bookmark,
    bookmarks
  };
}

export async function updateStudentPracticeBookmark(
  actor: VerifiedStudent,
  sessionId: string,
  bookmarkId: string,
  payload: unknown
): Promise<PracticeBookmarkMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, bookmark: existing } = await getPracticeBookmarkSnapshot(actor, bookmarkId);

  if (existing.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_bookmark_not_found", "TradeHub could not find that practice bookmark for this session.");
  }

  const now = new Date().toISOString();
  const normalized = await normalizeBookmarkPayload({ actor, session, payload, existing });
  const updated: PracticeBookmarkRecord = {
    ...existing,
    ...normalized,
    updatedAt: now
  };

  await ref.set(stripUndefined(updated), { merge: true });

  return {
    ...createSourceMeta(["Practice bookmark updates remain student-owned and server-bounded to revealed candles."]),
    ok: true,
    bookmark: updated,
    bookmarks: await listBookmarksForSession(actor, session.sessionId)
  };
}

export async function deleteStudentPracticeBookmark(
  actor: VerifiedStudent,
  sessionId: string,
  bookmarkId: string
): Promise<PracticeBookmarkDeleteResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, bookmark } = await getPracticeBookmarkSnapshot(actor, bookmarkId);

  if (bookmark.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_bookmark_not_found", "TradeHub could not find that practice bookmark for this session.");
  }

  await ref.delete();

  return {
    ...createSourceMeta(["Deleted practice bookmarks remove navigation metadata only and do not touch candles or orders."]),
    ok: true,
    deletedBookmarkId: bookmark.bookmarkId,
    bookmarks: await listBookmarksForSession(actor, session.sessionId)
  };
}

export async function finishStudentPracticeSession(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeSessionFinishMutationResponse> {
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);

  if (session.status === "abandoned") {
    throw new AdminApiError(409, "practice_session_abandoned", "Abandoned practice sessions cannot be finished.");
  }

  const [orders, playbooks, annotations, eventMarkers] = await Promise.all([
    listChallengeOrdersForSession(actor, session.sessionId),
    listPlaybooks(actor),
    listAnnotationsForSession(actor, session.sessionId),
    listVisibleEventsForSession(actor, session)
  ]);
  const unresolvedOrders = orders.filter((order) => order.status === "open" || order.status === "pending" || order.status === "draft");

  if (unresolvedOrders.length > 0) {
    throw new AdminApiError(409, "practice_session_finish_open_orders", "Close or cancel open and pending simulated orders before finishing this practice session.");
  }

  const now = new Date().toISOString();
  const finishedSession: PracticeSessionSummary = {
    ...session,
    status: "completed",
    completedAt: session.completedAt ?? now,
    updatedAt: now
  };
  const finalChallengeStatus = computePracticeChallengeStatus({
    session: finishedSession,
    orders
  });
  const finalSession: PracticeSessionSummary = {
    ...finishedSession,
    challengeResult: finalChallengeStatus
  };

  await ref.set(stripUndefined({
    status: "completed",
    completedAt: finalSession.completedAt,
    challengeResult: finalChallengeStatus ? stripUndefined(finalChallengeStatus) : undefined,
    updatedAt: now
  }), { merge: true });

  return {
    ...createSourceMeta(["Finished practice sessions are locked for replay and simulated order mutations, but remain viewable for analytics."]),
    ok: true,
    session: finalSession,
    performance: computePracticePerformanceSummary({ session: finalSession, orders }),
    challengeStatus: finalChallengeStatus,
    completedReview: buildCompletedSessionReview({
      session: finalSession,
    orders,
    playbooks,
    annotations,
    eventMarkers
  })
  };
}

export async function updateStudentPracticeSessionReflection(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeSessionReflectionMutationResponse> {
  const { ref, session } = await getPracticeSessionSnapshot(actor, sessionId);

  if (session.status !== "completed") {
    throw new AdminApiError(409, "practice_reflection_session_not_completed", "Finish this practice session before saving a reflection.");
  }

  const now = new Date().toISOString();
  const reflection = normalizeReflectionPayload(payload, now);
  const updatedSession: PracticeSessionSummary = {
    ...session,
    reflection,
    updatedAt: now
  };
  const [orders, playbooks, annotations] = await Promise.all([
    listOrdersForSession(actor, session.sessionId),
    listPlaybooks(actor),
    listAnnotationsForSession(actor, session.sessionId)
  ]);

  await ref.set({
    reflection,
    updatedAt: now
  }, { merge: true });

  return {
    ...createSourceMeta(["Completed-session reflections are bounded practice notes and remain separate from AutoCopy."]),
    ok: true,
    session: updatedSession,
    reflection,
    completedReview: buildCompletedSessionReview({
      session: updatedSession,
      orders,
      playbooks,
      annotations
    })
  };
}

async function unsetOtherMainLessons(actor: VerifiedStudent, sessionId: string, annotationId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations`)
    .where("sessionId", "==", sessionId)
    .limit(PRACTICE_ANNOTATION_VISIBLE_LIMIT)
    .get();
  const batch = db.batch();

  for (const doc of snapshot.docs) {
    if (doc.id !== annotationId && doc.data().isMainLesson === true) {
      batch.set(doc.ref, {
        isMainLesson: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  }

  await batch.commit();
}

async function completedReviewForSession(
  actor: VerifiedStudent,
  session: PracticeSessionSummary
): Promise<PracticeCompletedSessionReview | undefined> {
  if (session.status !== "completed") {
    return undefined;
  }

  const [orders, playbooks, annotations, eventMarkers] = await Promise.all([
    listOrdersForSession(actor, session.sessionId),
    listPlaybooks(actor),
    listAnnotationsForSession(actor, session.sessionId),
    listVisibleEventsForSession(actor, session)
  ]);

  return buildCompletedSessionReview({
    session,
    orders,
    playbooks,
    annotations,
    eventMarkers
  });
}

async function normalizeAnnotationForSession(input: {
  actor: VerifiedStudent;
  session: PracticeSessionSummary;
  payload: unknown;
  existing?: PracticeAnnotationSummary;
}) {
  if (typeof input.payload !== "object" || input.payload === null || Array.isArray(input.payload)) {
    throw new AdminApiError(400, "practice_annotation_payload_invalid", "Send valid practice annotation details.");
  }

  const record = input.payload as Record<string, unknown>;
  const orderId = record.orderId === undefined
    ? input.existing?.orderId
    : safeId(record.orderId) || undefined;
  const eventId = record.eventId === undefined
    ? input.existing?.eventId
    : safeId(record.eventId) || undefined;
  const candleIndex = record.candleIndex === undefined
    ? input.existing?.candleIndex
    : Math.max(0, Math.floor(safeNumber(record.candleIndex, 0)));
  const secondCandleIndex = record.secondCandleIndex === undefined
    ? input.existing?.secondCandleIndex
    : Math.max(0, Math.floor(safeNumber(record.secondCandleIndex, 0)));
  const kind = record.kind === undefined && input.existing ? input.existing.kind : normalizeAnnotationKind(record.kind);
  const label = record.label === undefined && input.existing
    ? input.existing.label
    : normalizeAnnotationLabel(record.label, defaultTextForAnnotationKind(kind));
  const coordinateVersion: PracticeDrawingCoordinateVersion | undefined = record.coordinateVersion === undefined
    ? input.existing?.coordinateVersion
    : record.coordinateVersion === "klinecharts_v1" || record.coordinateVersion === "klinecharts_v2"
      ? record.coordinateVersion
      : undefined;
  const chartPoints = record.chartPoints === undefined
    ? input.existing?.chartPoints
    : mapPracticeDrawingChartPoints(record.chartPoints);
  const appearanceVersion = record.appearanceVersion === undefined
    ? input.existing?.appearanceVersion
    : normalizeDrawingAppearanceVersion(record.appearanceVersion);

  if (record.coordinateVersion !== undefined && coordinateVersion !== "klinecharts_v1" && coordinateVersion !== "klinecharts_v2") {
    throw new AdminApiError(400, "practice_drawing_coordinate_version_invalid", "Use a supported practice drawing coordinate format.");
  }

  if (record.appearanceVersion !== undefined && !appearanceVersion) {
    throw new AdminApiError(400, "practice_drawing_appearance_version_invalid", "Use a supported practice drawing appearance.");
  }

  if (record.chartPoints !== undefined && (!Array.isArray(record.chartPoints) || !chartPoints || chartPoints.length !== record.chartPoints.length)) {
    throw new AdminApiError(400, "practice_drawing_chart_points_invalid", "Use valid bounded chart points for this drawing.");
  }

  if (chartPoints) {
    const minimumDataIndex = -PRACTICE_DRAWING_VISUAL_INDEX_MARGIN;
    const maximumDataIndex = input.session.currentCandleIndex + PRACTICE_DRAWING_VISUAL_INDEX_MARGIN;

    if (coordinateVersion !== "klinecharts_v1" && coordinateVersion !== "klinecharts_v2") {
      throw new AdminApiError(400, "practice_drawing_coordinate_version_required", "A chart coordinate version is required for visual drawing points.");
    }

    if (chartPoints.some((point) => point.dataIndex < minimumDataIndex || point.dataIndex > maximumDataIndex)) {
      throw new AdminApiError(400, "practice_drawing_chart_point_out_of_bounds", "Place the drawing within the visible practice chart workspace.");
    }

    const requiredPointCount = requiresTwoPracticeDrawingPoints(kind) ? 2 : 1;
    if (chartPoints.length !== requiredPointCount) {
      throw new AdminApiError(400, "practice_drawing_chart_point_count_invalid", "Complete every required point before saving this drawing.");
    }

    if (kind !== "vertical_marker" && chartPoints.some((point) => point.value === undefined)) {
      throw new AdminApiError(400, "practice_drawing_chart_price_required", "Place this drawing inside the chart price area.");
    }
  }

  if (orderId) {
    const { order } = await getPracticeOrderSnapshot(input.actor, orderId);

    if (order.sessionId !== input.session.sessionId) {
      throw new AdminApiError(404, "practice_annotation_order_not_found", "TradeHub could not find that simulated order for this session.");
    }
  }

  if (eventId) {
    const visibleEvents = await listVisibleEventsForSession(input.actor, input.session);

    if (!visibleEvents.some((event) => event.eventId === eventId)) {
      throw new AdminApiError(400, "practice_event_marker_not_visible", "Choose an event marker that is already visible in this replay.");
    }
  }

  if (candleIndex !== undefined && candleIndex > input.session.currentCandleIndex) {
    throw new AdminApiError(400, "practice_annotation_future_candle_blocked", "Practice annotations cannot reference unrevealed future candles.");
  }

  if (secondCandleIndex !== undefined && secondCandleIndex > input.session.currentCandleIndex) {
    throw new AdminApiError(400, "practice_drawing_future_candle_blocked", "Practice drawings cannot reference unrevealed future candles.");
  }

    return {
    orderId,
    eventId,
    candleIndex,
    secondCandleIndex,
    priceLevel: record.priceLevel === undefined
      ? input.existing?.priceLevel
      : Math.max(0, safeNumber(record.priceLevel, 0)) || undefined,
    secondPriceLevel: record.secondPriceLevel === undefined
      ? input.existing?.secondPriceLevel
      : Math.max(0, safeNumber(record.secondPriceLevel, 0)) || undefined,
    coordinateVersion,
    chartPoints,
    kind,
    label,
    text: record.text === undefined && input.existing ? input.existing.text : normalizeAnnotationText(record.text, label || defaultTextForAnnotationKind(kind), kind),
    colorToken: record.colorToken === undefined && input.existing ? input.existing.colorToken : normalizeDrawingColorToken(record.colorToken),
    appearanceVersion,
    isMainLesson: record.isMainLesson === undefined ? input.existing?.isMainLesson === true : record.isMainLesson === true
  };
}

export async function createStudentPracticeAnnotation(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeAnnotationMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const normalized = await normalizeAnnotationForSession({ actor, session, payload });
  const now = new Date().toISOString();
  const annotationId = deterministicId(["practice_annotation", actor.workspaceId, actor.studentId, session.sessionId, normalized.kind, now]);
  const annotation: PracticeAnnotationRecord = {
    annotationId,
    drawingId: annotationId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    sessionId: session.sessionId,
    orderId: normalized.orderId,
    eventId: normalized.eventId,
    candleIndex: normalized.candleIndex,
    secondCandleIndex: normalized.secondCandleIndex,
    priceLevel: normalized.priceLevel,
    secondPriceLevel: normalized.secondPriceLevel,
    coordinateVersion: normalized.coordinateVersion,
    chartPoints: normalized.chartPoints,
    kind: normalized.kind,
    label: normalized.label,
    text: normalized.text,
    colorToken: normalized.colorToken,
    appearanceVersion: normalized.appearanceVersion,
    isMainLesson: normalized.isMainLesson,
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();

  if (annotation.isMainLesson) {
    await unsetOtherMainLessons(actor, session.sessionId, annotationId);
  }

  await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations/${annotationId}`)
    .set(stripUndefined(annotation));

  const annotations = await listAnnotationsForSession(actor, session.sessionId);

  return {
    ...createSourceMeta(["Practice annotations are text-only simulated review notes. No screenshots, PDFs, brokers, exchanges, or storage providers are called."]),
    ok: true,
    annotation,
    annotations,
    completedReview: await completedReviewForSession(actor, session)
  };
}

export async function updateStudentPracticeAnnotation(
  actor: VerifiedStudent,
  sessionId: string,
  annotationId: string,
  payload: unknown
): Promise<PracticeAnnotationMutationResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, annotation: existing } = await getPracticeAnnotationSnapshot(actor, annotationId);

  if (existing.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_annotation_not_found", "TradeHub could not find that practice annotation for this session.");
  }

  const normalized = await normalizeAnnotationForSession({ actor, session, payload, existing });
  const now = new Date().toISOString();
  const updated: PracticeAnnotationSummary = {
    ...existing,
    orderId: normalized.orderId,
    eventId: normalized.eventId,
    candleIndex: normalized.candleIndex,
    secondCandleIndex: normalized.secondCandleIndex,
    priceLevel: normalized.priceLevel,
    secondPriceLevel: normalized.secondPriceLevel,
    coordinateVersion: normalized.coordinateVersion,
    chartPoints: normalized.chartPoints,
    kind: normalized.kind,
    label: normalized.label,
    text: normalized.text,
    colorToken: normalized.colorToken,
    appearanceVersion: normalized.appearanceVersion,
    isMainLesson: normalized.isMainLesson,
    updatedAt: now
  };

  if (updated.isMainLesson) {
    await unsetOtherMainLessons(actor, session.sessionId, updated.annotationId);
  }

  await ref.set(stripUndefined(updated), { merge: true });
  const annotations = await listAnnotationsForSession(actor, session.sessionId);

  return {
    ...createSourceMeta(["Practice annotation updates remain text-only and student-scoped."]),
    ok: true,
    annotation: updated,
    annotations,
    completedReview: await completedReviewForSession(actor, session)
  };
}

export async function deleteStudentPracticeAnnotation(
  actor: VerifiedStudent,
  sessionId: string,
  annotationId: string
): Promise<PracticeAnnotationDeleteResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { ref, annotation } = await getPracticeAnnotationSnapshot(actor, annotationId);

  if (annotation.sessionId !== session.sessionId) {
    throw new AdminApiError(404, "practice_annotation_not_found", "TradeHub could not find that practice annotation for this session.");
  }

  await ref.delete();
  const annotations = await listAnnotationsForSession(actor, session.sessionId);

  return {
    ...createSourceMeta(["Deleted practice annotations remove text-only review metadata and do not touch orders or candles."]),
    ok: true,
    deletedAnnotationId: annotation.annotationId,
    annotations,
    completedReview: await completedReviewForSession(actor, session)
  };
}

export async function createStudentPracticeDrawing(
  actor: VerifiedStudent,
  sessionId: string,
  payload: unknown
): Promise<PracticeAnnotationMutationResponse> {
  return createStudentPracticeAnnotation(actor, sessionId, payload);
}

export async function updateStudentPracticeDrawing(
  actor: VerifiedStudent,
  sessionId: string,
  drawingId: string,
  payload: unknown
): Promise<PracticeAnnotationMutationResponse> {
  return updateStudentPracticeAnnotation(actor, sessionId, drawingId, payload);
}

export async function deleteStudentPracticeDrawing(
  actor: VerifiedStudent,
  sessionId: string,
  drawingId: string
): Promise<PracticeAnnotationDeleteResponse> {
  return deleteStudentPracticeAnnotation(actor, sessionId, drawingId);
}

export async function deleteAllStudentPracticeDrawings(
  actor: VerifiedStudent,
  sessionId: string
): Promise<PracticeDrawingBulkDeleteResponse> {
  const { session } = await getPracticeSessionSnapshot(actor, sessionId);
  assertPracticeSessionMutable(session);
  const { db } = getFirebaseAdminClients();
  const collection = db.collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_annotations`);
  const snapshot = await collection
    .where("sessionId", "==", session.sessionId)
    .limit(PRACTICE_DRAWING_BULK_DELETE_LIMIT + 1)
    .get();

  if (snapshot.size > PRACTICE_DRAWING_BULK_DELETE_LIMIT) {
    throw new AdminApiError(409, "practice_drawing_clear_limit_reached", "Too many chart drawings are loaded to clear safely in one request.");
  }

  const drawingDocs = snapshot.docs.filter((doc) =>
    isTerminalDrawingAnnotationKind(normalizeAnnotationKind(doc.data().kind))
  );

  if (drawingDocs.length) {
    const batch = db.batch();

    for (const drawingDoc of drawingDocs) {
      batch.delete(drawingDoc.ref);
    }

    await batch.commit();
  }

  const annotations = await listAnnotationsForSession(actor, session.sessionId);

  return {
    ...createSourceMeta(["Cleared student-owned terminal drawings atomically without deleting candles, orders, events, bookmarks, reports, journal data, or non-drawing annotations."]),
    ok: true,
    deletedDrawingIds: drawingDocs.map((doc) => doc.id),
    deletedDrawingCount: drawingDocs.length,
    annotations,
    completedReview: await completedReviewForSession(actor, session)
  };
}
