import "server-only";

import { createHash } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  hasModeratedTelegramSignalProof,
  studentVisibleSignalSourceLabel
} from "@/lib/signals/tradehub-signal-source-guards";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import {
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import { mapSignalRecord } from "@/lib/workspace/dashboard-mappers";
import type { AccountLinkedTradeLedgerRecord } from "@/types/crypto-execution";
import type {
  StudentSignalExecutionSummary,
  StudentSignalFeedCard,
  StudentSignalFilter,
  StudentSignalLifecycle,
  StudentSignalsResponse
} from "@/types/student-signals";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

const SIGNAL_VISIBLE_LIMIT_MAX = 25;
const SIGNAL_FILTER_SCAN_LIMIT = 250;
const LINKED_EXECUTION_SCAN_LIMIT = 125;

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, SIGNAL_VISIBLE_LIMIT_MAX) : 25;
}

function parseFilter(value: string | null): StudentSignalFilter {
  if (value === "forex" || value === "crypto" || value === "open") {
    return value;
  }

  return "all";
}

function signalRef(signal: WorkspaceSignalRecord) {
  return `signal_${createHash("sha256")
    .update([signal.workspaceId, signal.signalId, signal.updatedAt].join("|"))
    .digest("hex")
    .slice(0, 16)}`;
}

function cursorRef(signal: WorkspaceSignalRecord) {
  return signalRef(signal);
}

function encodeCursor(signal: WorkspaceSignalRecord) {
  return Buffer.from(JSON.stringify({
    updatedAt: signal.updatedAt,
    ref: cursorRef(signal)
  }))
    .toString("base64url")
    .slice(0, 180);
}

function decodeCursor(value: string) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const updatedAt = safeString(parsed?.updatedAt);
    const ref = safeString(parsed?.ref);

    if (!updatedAt || !Number.isFinite(Date.parse(updatedAt)) || !ref.startsWith("signal_")) {
      return null;
    }

    return { updatedAt, ref };
  } catch {
    return null;
  }
}

function ageLabel(signal: WorkspaceSignalRecord) {
  const source = signal.publishedAt ?? signal.updatedAt;
  const timestamp = Date.parse(source);

  if (!Number.isFinite(timestamp)) {
    return "Recent";
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes}m`;
  }

  if (diffMs < day) {
    return `${Math.round(diffMs / hour)}h`;
  }

  const days = Math.round(diffMs / day);
  return days === 1 ? "Yesterday" : `${days}d`;
}

function normalizeLifecycle(signal: WorkspaceSignalRecord): StudentSignalLifecycle {
  const raw = safeString((signal as WorkspaceSignalRecord & { lifecycle?: string }).lifecycle).toLowerCase();

  if (signal.status === "cancelled" || raw === "cancelled") {
    return "cancelled";
  }

  if (raw === "closed") {
    return "closed";
  }

  if (signal.status === "published") {
    return "open";
  }

  return "unavailable";
}

function statusLabel(lifecycle: StudentSignalLifecycle) {
  switch (lifecycle) {
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unavailable";
  }
}

function matchesFilter(signal: WorkspaceSignalRecord, filter: StudentSignalFilter) {
  if (filter === "all") return true;
  if (filter === "open") return normalizeLifecycle(signal) === "open";
  return signal.market === filter;
}

function isStudentVisibleTradeHubSignal(record: WorkspaceSignalRecord) {
  return (
    (record.source === "in_app" || record.source === "legacy_in_app" || hasModeratedTelegramSignalProof(record)) &&
    (record.status === "published" || record.status === "cancelled") &&
    (record.market === "crypto" || record.market === "forex")
  );
}

function normalizeSignalSymbol(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

function marketMatchesLedger(signal: WorkspaceSignalRecord, record: Record<string, unknown>) {
  const assetClass = safeString(record.assetClass);

  if (signal.market === "crypto") {
    return assetClass === "crypto";
  }

  return assetClass === "forex" || assetClass === "forex_cfd";
}

function supportedRealExecutionMode(record: Record<string, unknown>) {
  const mode = safeString(record.executionMode);
  const environment = safeString(record.environment);
  const status = safeString(record.status);

  if (
    mode === "paper" ||
    mode === "practice" ||
    mode === "testnet" ||
    mode === "demo" ||
    mode === "provider_history" ||
    environment === "paper" ||
    environment === "testnet" ||
    environment === "demo" ||
    record.dryRun === true
  ) {
    return false;
  }

  if (status === "queued" || status === "blocked" || status === "failed" || status === "dry_run" || status === "zero_safe") {
    return false;
  }

  return mode === "production_gated" || mode === "live_canary";
}

function authoritativePnlForSignal(record: Record<string, unknown>, lifecycle: "open" | "partial" | "closed") {
  const pnl = record.authoritativePnl;

  if (typeof pnl !== "object" || pnl === null || Array.isArray(pnl)) {
    return undefined;
  }

  const value = safeNumber((pnl as Record<string, unknown>).value);
  const currency = safeString((pnl as Record<string, unknown>).currency).replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 8);
  const kind = safeString((pnl as Record<string, unknown>).kind);
  const source = safeString((pnl as Record<string, unknown>).source);

  if ((pnl as Record<string, unknown>).authoritative !== true || value === undefined || !currency) {
    return undefined;
  }

  if (lifecycle === "closed") {
    if (kind !== "realized" || source !== "provider_closure" || record.providerClosureConfirmed !== true) {
      return undefined;
    }

    return {
      label: "Realized P&L" as const,
      value,
      currency
    };
  }

  if (kind !== "floating" || source !== "provider_valuation") {
    return undefined;
  }

  return {
    label: "Floating P&L" as const,
    value,
    currency
  };
}

function mapExecutionRecord(signal: WorkspaceSignalRecord, record: Record<string, unknown>) {
  const providerConfirmed = record.providerConfirmed === true || record.confirmationState === "provider_confirmed";
  const tradeOrigin = safeString(record.tradeOrigin);
  const lifecycle = safeString(record.journalLifecycle);
  const status = safeString(record.status);
  const providerStatus = safeString(record.providerStatus);
  const linkedSignalId = safeString(record.tradeHubSignalId);

  if (
    !providerConfirmed ||
    linkedSignalId !== signal.signalId ||
    tradeOrigin !== "copied" ||
    !supportedRealExecutionMode(record) ||
    !marketMatchesLedger(signal, record) ||
    normalizeSignalSymbol(safeString(record.symbol)) !== normalizeSignalSymbol(signal.pair)
  ) {
    return null;
  }

  if (signal.market === "crypto" && safeString(record.source) !== "crypto_autocopy") {
    return null;
  }

  if (signal.market === "forex" && safeString(record.source) !== "forex_autocopy") {
    return null;
  }

  const normalizedLifecycle =
    lifecycle === "closed" || status === "closed"
      ? "closed"
        : lifecycle === "partial" || status === "partial" || status === "partially_filled"
        ? "partial"
        : "open";
  const authoritativePnl = authoritativePnlForSignal(record, normalizedLifecycle);
  const copiedState = providerStatus === "filled" ||
    status === "filled" ||
    status === "partial" ||
    status === "partially_filled" ||
    status === "filled_live" ||
    status === "partially_filled_live" ||
    status === "filled_live_forex_canary" ||
    status === "partially_filled_live_forex_canary"
      ? "executed"
      : "copied";

  return {
    summary: {
      copiedState,
      sourceLabel: "Copied",
      lifecycle: normalizedLifecycle,
      pnl: authoritativePnl
    } satisfies StudentSignalExecutionSummary
  };
}

function emptyExecution(): StudentSignalExecutionSummary {
  return { copiedState: "not_copied" };
}

function executionForSignal(
  signal: WorkspaceSignalRecord,
  records: Array<Record<string, unknown>>
) {
  for (const record of records) {
    const mapped = mapExecutionRecord(signal, record);
    if (mapped) return mapped.summary;
  }

  return emptyExecution();
}

function mapStudentSignalCard(
  signal: WorkspaceSignalRecord,
  ledgerRecords: Array<Record<string, unknown>>
): StudentSignalFeedCard {
  const lifecycle = normalizeLifecycle(signal);

  return {
    signalRef: signalRef(signal),
    symbol: signal.pair,
    market: signal.market,
    side: signal.direction,
    lifecycle,
    statusLabel: statusLabel(lifecycle),
    entry: signal.entry || "Set",
    stopLoss: signal.stopLoss || "Set",
    takeProfit: signal.takeProfit || "Set",
    riskLabel: signal.riskLabel,
    sourceLabel: studentVisibleSignalSourceLabel(signal),
    ageLabel: ageLabel(signal),
    publishedAt: signal.publishedAt,
    updatedAt: signal.updatedAt,
    copied: executionForSignal(signal, ledgerRecords)
  };
}

export async function listStudentSignalFeed(
  actor: VerifiedStudent,
  request: Request
): Promise<StudentSignalsResponse> {
  const { db } = getFirebaseAdminClients();
  const params = new URL(request.url).searchParams;
  const limit = normalizeLimit(params.get("limit"));
  const filter = parseFilter(params.get("filter"));
  const cursor = decodeCursor(safeString(params.get("cursor")).slice(0, 180));

  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`).get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This student workspace is not prepared yet.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(403, "student_record_required", "This student account is not ready yet.");
  }

  const workspace = mapWorkspaceForStudent(recordFromSnapshot(workspaceSnapshot, "workspaceId"), actor.workspaceId);
  const studentRecord = recordFromSnapshot(studentSnapshot, "studentId");
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const entitlements = resolveStudentEntitlements({ workspace, studentRecord, subscription, claimedTierId: actor.tierId });
  const student = mapStudentProfile(studentRecord, actor.workspaceId, actor.studentId, entitlements);

  if (!student.signalAccess) {
    return {
      ok: true,
      filter,
      overview: {
        workspaceLabel: workspace.name,
        accessState: "locked",
        accessReason: student.signalAccessReason,
        copiedCount: 0,
        executedCount: 0,
        openCount: 0
      },
      signals: [],
      pageInfo: {
        limit,
        scannedCount: 0,
        matchedCount: 0,
        visibleCount: 0,
        hasMore: false,
        truncated: false,
        nextCursor: null
      },
      notices: []
    };
  }

  const signalQuery = db
    .collection(`workspaces/${actor.workspaceId}/signals`)
    .orderBy("updatedAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");

  const [signalSnapshot, ledgerSnapshot] = await Promise.all([
    signalQuery.limit(SIGNAL_FILTER_SCAN_LIMIT + 1).get(),
    db
      .collection(`workspaces/${actor.workspaceId}/students/${actor.studentId}/account_linked_trade_ledger`)
      .orderBy("updatedAt", "desc")
      .limit(LINKED_EXECUTION_SCAN_LIMIT)
      .get()
  ]);
  const ledgerRecords = ledgerSnapshot.docs
    .map((doc) => ({
      ...doc.data(),
      ledgerEntryId: String(doc.data().ledgerEntryId ?? doc.id)
    }) as Partial<AccountLinkedTradeLedgerRecord> & Record<string, unknown>)
    .sort((left, right) => {
      const byUpdatedAt = safeString(right.updatedAt).localeCompare(safeString(left.updatedAt));
      return byUpdatedAt || safeString(right.ledgerEntryId).localeCompare(safeString(left.ledgerEntryId));
    });

  const hitScanBoundary = signalSnapshot.docs.length > SIGNAL_FILTER_SCAN_LIMIT;
  const loaded = signalSnapshot.docs
    .slice(0, SIGNAL_FILTER_SCAN_LIMIT)
    .map((doc) => mapSignalRecord(recordFromSnapshot(doc, "signalId"), actor.workspaceId))
    .filter(isStudentVisibleTradeHubSignal);
  const cursorIndex = cursor
    ? loaded.findIndex((signal) => signal.updatedAt === cursor.updatedAt && cursorRef(signal) === cursor.ref)
    : -1;
  const cursorFilteredLoaded = cursorIndex >= 0 ? loaded.slice(cursorIndex + 1) : cursor ? [] : loaded;
  const matched = cursorFilteredLoaded.filter((signal) => matchesFilter(signal, filter));
  const visible = matched.slice(0, limit);
  const signals = visible.map((signal) => mapStudentSignalCard(signal, ledgerRecords));
  const hasMoreInCohort = matched.length > visible.length;
  const nextCursor = visible.length > 0 && hasMoreInCohort
    ? encodeCursor(visible[visible.length - 1])
    : null;
  const copiedCount = signals.filter((signal) => signal.copied.copiedState === "copied").length;
  const executedCount = signals.filter((signal) => signal.copied.copiedState === "executed").length;

  return {
    ok: true,
    filter,
    overview: {
      workspaceLabel: workspace.name,
      accessState: "available",
      accessReason: "Signals are available for your workspace access.",
      copiedCount,
      executedCount,
      openCount: signals.filter((signal) => signal.lifecycle === "open").length
    },
    signals,
    pageInfo: {
      limit,
      scannedCount: Math.min(signalSnapshot.docs.length, SIGNAL_FILTER_SCAN_LIMIT),
      matchedCount: matched.length,
      visibleCount: signals.length,
      hasMore: hasMoreInCohort,
      truncated: hitScanBoundary,
      nextCursor
    },
    notices: hitScanBoundary
      ? ["Showing a bounded newest-first signal set. Older records may be omitted by the current history window."]
      : []
  };
}
