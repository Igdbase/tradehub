import "server-only";

import { createHash } from "node:crypto";
import { createSourceMeta } from "@/lib/admin/admin-mappers";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  listStudentJournalCryptoConnectionImportPointers,
  listStudentJournalCryptoConnectionSummaries
} from "@/lib/journal/crypto-journal-sync-repository";
import type {
  ConnectedJournalCurvePoint,
  ConnectedJournalMarket,
  ConnectedJournalPeriodPnl,
  ConnectedJournalProviderStatus,
  ConnectedJournalTradeSource,
  ConnectedJournalTradeStatus,
  ConnectedJournalTradeSummary,
  StudentConnectedJournalResponse
} from "@/types/journal-workspace";

const CONNECTED_TRADE_SCAN_LIMIT = 200;
const CONNECTED_TRADE_VISIBLE_LIMIT = 100;

export interface ConnectedJournalFilters {
  account?: string;
  market?: ConnectedJournalMarket;
  symbol?: string;
  source?: ConnectedJournalTradeSource;
  status?: ConnectedJournalTradeStatus;
  dateRange: "all" | "30d" | "90d" | "year";
}

function safeString(value: unknown, maxLength = 80) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeDate(value: unknown) {
  const normalized = typeof value === "string"
    ? value
    : value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
      ? value.toDate().toISOString()
      : "";
  const timestamp = Date.parse(normalized);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function opaqueTradeRef(value: string) {
  return `trade_${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function normalizeMarket(value: unknown): ConnectedJournalMarket | null {
  if (value === "crypto") return "crypto";
  if (value === "forex") return "forex";
  if (value === "forex_cfd" || value === "cfd") return "cfd";
  return null;
}

function normalizeStatus(value: unknown): ConnectedJournalTradeStatus | null {
  if (value === "open" || value === "closed" || value === "partial" || value === "execution_only") {
    return value;
  }
  return null;
}

function normalizeProviderStatus(value: unknown): ConnectedJournalProviderStatus {
  const normalized = safeString(value, 40).toLowerCase();
  if (["filled", "executed", "closed"].includes(normalized)) return "filled";
  if (["partial", "partially_filled", "partially_closed"].includes(normalized)) return "partially_filled";
  if (["cancelled", "canceled", "rejected", "expired"].includes(normalized)) return "cancelled";
  if (["pending", "new", "submitted", "open"].includes(normalized)) return "pending";
  return "unknown";
}

function hasAuthoritativeClosure(record: Record<string, unknown>) {
  const closureConfirmed = record.providerClosureConfirmed === true ||
    record.closureConfirmationState === "provider_confirmed" ||
    record.positionState === "provider_closed";
  return closureConfirmed && Boolean(safeDate(record.closedAt ?? record.completedAt)) &&
    typeof safeNumber(record.realizedPnl ?? record.pnl) === "number";
}

export function normalizeConnectedJournalLifecycle(
  record: Record<string, unknown>
): ConnectedJournalTradeStatus {
  const explicitLifecycle = normalizeStatus(record.journalLifecycle ?? record.tradeLifecycle);

  if (explicitLifecycle === "closed" && hasAuthoritativeClosure(record)) return "closed";
  if (explicitLifecycle === "partial") return "partial";
  if (explicitLifecycle === "open") return "open";
  if (explicitLifecycle === "execution_only") return "execution_only";

  const rawStatus = safeString(record.status, 40).toLowerCase();
  if (["partial", "partially_filled", "partially_closed"].includes(rawStatus)) return "partial";
  if (rawStatus === "closed" && hasAuthoritativeClosure(record)) return "closed";

  // A provider-filled entry confirms an execution, not the position's closure.
  return "open";
}

export function isProviderConfirmedConnectedTrade(record: Record<string, unknown>) {
  const environment = safeString(record.environment, 32).toLowerCase();
  const executionMode = safeString(record.executionMode, 32);
  const source = safeString(record.source, 40);
  const providerStatus = normalizeProviderStatus(record.status);
  const explicitlyConfirmed = record.providerConfirmed === true ||
    record.confirmationState === "provider_confirmed" ||
    record.reconciliationStatus === "provider_confirmed";
  const isRealMode = executionMode === "production_gated" || executionMode === "live_canary" ||
    executionMode === "provider_history";
  const isConnectedSource = source === "crypto_autocopy" || source === "forex_autocopy" ||
    source === "connected_provider";
  const forbiddenEnvironment = ["paper", "testnet", "sandbox", "demo", "practice", "dry_run"]
    .includes(environment);

  return explicitlyConfirmed && isRealMode && isConnectedSource &&
    providerStatus !== "cancelled" && providerStatus !== "unknown" &&
    !forbiddenEnvironment && record.dryRun !== true && !record.sanitizedFailureCode;
}

export function mapProviderConfirmedTrade(
  record: Record<string, unknown>,
  ledgerEntryId: string,
  activeJournalGenerations = new Map<string, string>()
): ConnectedJournalTradeSummary | null {
  if (!isProviderConfirmedConnectedTrade(record)) return null;
  if (record.source === "connected_provider" && record.tradeOrigin === "provider_manual") {
    const connectionRef = safeString(record.journalConnectionRef, 80);
    const activeGeneration = connectionRef ? activeJournalGenerations.get(connectionRef) : "";
    const recordGeneration = safeString(record.importGeneration, 80);
    if (activeGeneration && recordGeneration !== activeGeneration) return null;
    if (!activeGeneration && recordGeneration) return null;
  }

  const market = normalizeMarket(record.assetClass);
  const status = normalizeConnectedJournalLifecycle(record);
  const providerStatus = normalizeProviderStatus(record.status);
  const side = record.side === "buy" || record.side === "sell" ? record.side : null;
  const symbol = safeString(record.symbol, 24).replace(/[^A-Z0-9._-]/gi, "").toUpperCase();

  if (!market || !side || !symbol) return null;

  const source: ConnectedJournalTradeSource = record.source === "connected_provider" &&
    record.tradeOrigin === "provider_manual"
    ? "provider_manual"
    : "copied";

  return {
    tradeRef: opaqueTradeRef(ledgerEntryId),
    symbol,
    market,
    side,
    status,
    providerStatus,
    source,
    accountLabel: safeString(record.safeBrokerOrExchangeLabel, 64) ||
      (market === "crypto" ? "Connected crypto account" : "Connected trading account"),
    openedAt: safeDate(record.openedAt ?? record.submittedAt ?? record.createdAt),
    closedAt: status === "closed" ? safeDate(record.closedAt ?? record.completedAt) : undefined,
    entryPrice: safeNumber(record.entryPrice ?? record.filledPrice ?? record.averagePrice),
    exitPrice: status === "closed" || status === "partial"
      ? safeNumber(record.exitPrice ?? record.closePrice)
      : undefined,
    stopLoss: safeNumber(record.stopLoss),
    takeProfit: safeNumber(record.takeProfit),
    quantity: safeNumber(record.quantity ?? record.volume),
    fees: safeNumber(record.fees ?? record.costs),
    realizedPnl: status === "closed" || status === "partial"
      ? safeNumber(record.realizedPnl ?? record.pnl)
      : undefined,
    rMultiple: status === "closed" ? safeNumber(record.rMultiple) : undefined
  };
}

function periodStart(range: ConnectedJournalFilters["dateRange"], now: number) {
  if (range === "30d") return now - 30 * 86_400_000;
  if (range === "90d") return now - 90 * 86_400_000;
  if (range === "year") return now - 365 * 86_400_000;
  return 0;
}

function matchesFilters(trade: ConnectedJournalTradeSummary, filters: ConnectedJournalFilters, now: number) {
  if (filters.account && trade.accountLabel !== filters.account) return false;
  if (filters.market && trade.market !== filters.market) return false;
  if (filters.symbol && trade.symbol !== filters.symbol) return false;
  if (filters.source && trade.source !== filters.source) return false;
  if (filters.status && trade.status !== filters.status) return false;

  const start = periodStart(filters.dateRange, now);
  const tradeDate = Date.parse(trade.closedAt ?? trade.openedAt ?? "");
  return start === 0 || (Number.isFinite(tradeDate) && tradeDate >= start);
}

function buildPerformance(trades: ConnectedJournalTradeSummary[]) {
  const closed = trades.filter((trade) => trade.status === "closed");
  const realized = closed.filter((trade) => typeof trade.realizedPnl === "number");
  const wins = realized.filter((trade) => (trade.realizedPnl ?? 0) > 0);
  const losses = realized.filter((trade) => (trade.realizedPnl ?? 0) < 0);
  const rValues = closed.map((trade) => trade.rMultiple).filter((value): value is number => typeof value === "number");
  const grossProfit = wins.reduce((total, trade) => total + (trade.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((total, trade) => total + (trade.realizedPnl ?? 0), 0));

  return {
    totalTrades: trades.length,
    openTrades: trades.filter((trade) => trade.status === "open" || trade.status === "partial").length,
    closedTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: realized.length > 0 ? wins.length / realized.length : 0,
    netPnl: realized.reduce((total, trade) => total + (trade.realizedPnl ?? 0), 0),
    averageR: rValues.length > 0 ? rValues.reduce((total, value) => total + value, 0) / rValues.length : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : null,
    averageWin: wins.length > 0 ? grossProfit / wins.length : null,
    averageLoss: losses.length > 0 ? grossLoss / losses.length : null,
    maxDrawdown: buildEquityCurve(closed).reduce((maximum, point) => Math.max(maximum, point.drawdown), 0)
  };
}

function buildEquityCurve(trades: ConnectedJournalTradeSummary[]): ConnectedJournalCurvePoint[] {
  let equity = 0;
  let peak = 0;
  return trades
    .filter((trade) => trade.status === "closed" && trade.closedAt && typeof trade.realizedPnl === "number")
    .sort((left, right) => String(left.closedAt).localeCompare(String(right.closedAt)))
    .map((trade, index) => {
      const pnl = trade.realizedPnl ?? 0;
      equity += pnl;
      peak = Math.max(peak, equity);
      return { index, date: trade.closedAt!, pnl, equity, drawdown: Math.max(0, peak - equity) };
    });
}

function buildPeriodPnl(trades: ConnectedJournalTradeSummary[], mode: "day" | "month"): ConnectedJournalPeriodPnl[] {
  const grouped = new Map<string, ConnectedJournalPeriodPnl>();
  for (const trade of trades) {
    if (trade.status !== "closed" || !trade.closedAt || typeof trade.realizedPnl !== "number") continue;
    const period = mode === "day" ? trade.closedAt.slice(0, 10) : trade.closedAt.slice(0, 7);
    const current = grouped.get(period) ?? { period, pnl: 0, trades: 0, wins: 0, losses: 0 };
    current.pnl += trade.realizedPnl;
    current.trades += 1;
    if (trade.realizedPnl > 0) current.wins += 1;
    if (trade.realizedPnl < 0) current.losses += 1;
    grouped.set(period, current);
  }
  return [...grouped.values()].sort((left, right) => left.period.localeCompare(right.period)).slice(-120);
}

export async function getStudentConnectedJournal(
  actor: VerifiedStudent,
  filters: ConnectedJournalFilters
): Promise<StudentConnectedJournalResponse> {
  const { db } = getFirebaseAdminClients();
  const studentPath = `workspaces/${actor.workspaceId}/students/${actor.studentId}`;
  const activeJournalGenerations = await listStudentJournalCryptoConnectionImportPointers(actor);
  const activeGenerationValues = [...activeJournalGenerations.values()].filter(Boolean);
  const activeGenerationSnapshots = await Promise.all(activeGenerationValues
    .map((generation) => db.collection(`${studentPath}/journal_crypto_import_generations/${generation}/entries`)
      .orderBy("updatedAt", "desc")
      .limit(CONNECTED_TRADE_SCAN_LIMIT)
      .get()));
  const ledgerSnapshot = await db.collection(`${studentPath}/account_linked_trade_ledger`)
    .orderBy("updatedAt", "desc")
    .limit(CONNECTED_TRADE_SCAN_LIMIT)
    .get();
  const activeGenerationTrades = activeGenerationSnapshots
    .flatMap((snapshot) => snapshot.docs.map((doc) => mapProviderConfirmedTrade(doc.data(), doc.id, activeJournalGenerations)))
    .filter((trade): trade is ConnectedJournalTradeSummary => Boolean(trade));
  const accountLedgerTrades = ledgerSnapshot.docs
    .filter((doc) => {
      const record = doc.data();
      if (record.source !== "connected_provider" || record.tradeOrigin !== "provider_manual") return true;
      return activeGenerationValues.length === 0;
    })
    .map((doc) => mapProviderConfirmedTrade(doc.data(), doc.id, activeJournalGenerations))
    .filter((trade): trade is ConnectedJournalTradeSummary => Boolean(trade));
  const allConfirmed = [...activeGenerationTrades, ...accountLedgerTrades]
    .sort((left, right) => String(right.closedAt ?? right.openedAt).localeCompare(String(left.closedAt ?? left.openedAt)))
    .slice(0, CONNECTED_TRADE_SCAN_LIMIT);
  const now = Date.now();
  const matchedTrades = allConfirmed.filter((trade) => matchesFilters(trade, filters, now));
  const trades = matchedTrades.slice(0, CONNECTED_TRADE_VISIBLE_LIMIT);
  const scannedCount = ledgerSnapshot.size + activeGenerationSnapshots.reduce((total, snapshot) => total + snapshot.size, 0);
  const scanBoundaryReached = ledgerSnapshot.size === CONNECTED_TRADE_SCAN_LIMIT ||
    activeGenerationSnapshots.some((snapshot) => snapshot.size === CONNECTED_TRADE_SCAN_LIMIT);
  const visibleRowsTruncated = matchedTrades.length > trades.length;
  const providerManualHistoryAvailable = allConfirmed.some((trade) => trade.source === "provider_manual");
  const copiedHistoryAvailable = allConfirmed.some((trade) => trade.source === "copied");
  const historyAccounts = new Set(allConfirmed.map((trade) => trade.accountLabel));
  const cryptoConnections = await listStudentJournalCryptoConnectionSummaries(actor);
  const activeJournalConnections = cryptoConnections.filter((connection) => !connection.syncDisabled && connection.status !== "disconnected");
  const syncState = activeJournalConnections.some((connection) => connection.status === "syncing")
    ? "syncing"
    : activeJournalConnections.some((connection) => connection.status === "partial")
      ? "partial"
      : activeJournalConnections.some((connection) => connection.status === "failed")
        ? "failed"
        : activeJournalConnections.length > 0
          ? "ready"
          : cryptoConnections.length > 0
            ? "disconnected"
            : "not_configured";
  const journalSyncConfigured = activeJournalConnections.length > 0;

  return {
    ...createSourceMeta("firestore", allConfirmed.length === 0
      ? ["No provider-confirmed connected-account executions are available. Unconfirmed and simulated records were excluded."]
      : []),
    ok: true,
    generatedAt: new Date().toISOString(),
    performance: buildPerformance(matchedTrades),
    equityCurve: buildEquityCurve(matchedTrades),
    dailyPnl: buildPeriodPnl(matchedTrades, "day"),
    monthlyPnl: buildPeriodPnl(matchedTrades, "month"),
    trades,
    filters: {
      accounts: [...new Set(allConfirmed.map((trade) => trade.accountLabel))].sort(),
      markets: [...new Set(allConfirmed.map((trade) => trade.market))].sort(),
      symbols: [...new Set(allConfirmed.map((trade) => trade.symbol))].sort(),
      sources: [...new Set(allConfirmed.map((trade) => trade.source))].sort(),
      statuses: [...new Set(allConfirmed.map((trade) => trade.status))].sort()
    },
    readiness: {
      state: syncState,
      journalSyncConfigured,
      historyAccountCount: historyAccounts.size,
      historyAvailable: allConfirmed.length > 0,
      copiedHistoryAvailable,
      providerManualHistoryAvailable,
      cryptoConnections,
      message: allConfirmed.length === 0
        ? journalSyncConfigured
          ? "Journal Sync is ready. Sync your read-only crypto history to show confirmed trades here."
          : "Journal Sync is not configured yet. Provider-confirmed history will appear here when a dedicated read-only Journal connection is available."
        : journalSyncConfigured
          ? "Provider-confirmed history is available from dedicated read-only Journal Sync and eligible copied history."
          : "Provider-confirmed history is available, but dedicated Journal Sync setup is not configured yet."
    },
    appliedFilters: filters,
    resultWindow: {
      scannedCount,
      matchedCount: matchedTrades.length,
      visibleCount: trades.length,
      hasMore: scanBoundaryReached || visibleRowsTruncated,
      truncated: scanBoundaryReached || visibleRowsTruncated
    },
    limit: CONNECTED_TRADE_VISIBLE_LIMIT,
    safeMessage: scanBoundaryReached
      ? `Performance is calculated from the newest ${CONNECTED_TRADE_SCAN_LIMIT} ledger records and may not represent complete all-time history.`
      : visibleRowsTruncated
        ? `Performance includes all ${matchedTrades.length} matching trades in the scanned history. The list shows the newest ${CONNECTED_TRADE_VISIBLE_LIMIT}.`
      : "My Trades includes provider-confirmed connected-account executions only. Practice and legacy manual entries are excluded."
  };
}
