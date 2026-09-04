import type { AdminSourceMeta } from "@/types/admin-api";
import type { IsoDateString } from "@/types/workspace";

export type ConnectedJournalMarket = "crypto" | "forex" | "cfd";
export type ConnectedJournalTradeSource = "copied" | "provider_manual";
export type ConnectedJournalTradeStatus = "open" | "partial" | "closed" | "execution_only";
export type ConnectedJournalProviderStatus = "pending" | "filled" | "partially_filled" | "cancelled" | "unknown";
export type JournalCryptoExchange = "binance" | "bybit";
export type JournalCryptoConnectionStatus =
  | "verifying"
  | "ready"
  | "syncing"
  | "partial"
  | "failed"
  | "disconnected";
export type JournalCryptoSyncFailureCategory =
  | "none"
  | "permission_rejected"
  | "vault_unavailable"
  | "provider_unavailable"
  | "rate_limited"
  | "invalid_response"
  | "bounded_limit_reached"
  | "sync_disabled"
  | "unknown";

export interface ConnectedJournalTradeSummary {
  tradeRef: string;
  symbol: string;
  market: ConnectedJournalMarket;
  side: "buy" | "sell";
  status: ConnectedJournalTradeStatus;
  providerStatus: ConnectedJournalProviderStatus;
  source: ConnectedJournalTradeSource;
  accountLabel: string;
  openedAt?: IsoDateString;
  closedAt?: IsoDateString;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  fees?: number;
  realizedPnl?: number;
  rMultiple?: number;
}

export interface ConnectedJournalPerformanceSummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  averageR: number | null;
  profitFactor: number | null;
  averageWin: number | null;
  averageLoss: number | null;
  maxDrawdown: number;
}

export interface ConnectedJournalCurvePoint {
  index: number;
  date: IsoDateString;
  pnl: number;
  equity: number;
  drawdown: number;
}

export interface ConnectedJournalPeriodPnl {
  period: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface ConnectedJournalFilterOptions {
  accounts: string[];
  markets: ConnectedJournalMarket[];
  symbols: string[];
  sources: ConnectedJournalTradeSource[];
  statuses: ConnectedJournalTradeStatus[];
}

export interface JournalCryptoConnectionSummary {
  connectionRef: string;
  exchange: JournalCryptoExchange;
  accountLabel: string;
  status: JournalCryptoConnectionStatus;
  selectedSymbols: string[];
  permissionState: "not_checked" | "passed" | "failed";
  syncDisabled: boolean;
  lastAttemptAt?: IsoDateString;
  lastSuccessAt?: IsoDateString;
  importedCount: number;
  skippedCount: number;
  truncated: boolean;
  failureCategory: JournalCryptoSyncFailureCategory;
  safeMessage: string;
}

export interface ConnectedJournalReadinessSummary {
  state: "not_configured" | "ready" | "syncing" | "partial" | "failed" | "disconnected";
  journalSyncConfigured: boolean;
  historyAccountCount: number;
  historyAvailable: boolean;
  copiedHistoryAvailable: boolean;
  providerManualHistoryAvailable: boolean;
  cryptoConnections: JournalCryptoConnectionSummary[];
  message: string;
}

export interface ConnectedJournalResultWindow {
  scannedCount: number;
  matchedCount: number;
  visibleCount: number;
  hasMore: boolean;
  truncated: boolean;
}

export interface StudentConnectedJournalResponse extends AdminSourceMeta {
  ok: true;
  generatedAt: IsoDateString;
  performance: ConnectedJournalPerformanceSummary;
  equityCurve: ConnectedJournalCurvePoint[];
  dailyPnl: ConnectedJournalPeriodPnl[];
  monthlyPnl: ConnectedJournalPeriodPnl[];
  trades: ConnectedJournalTradeSummary[];
  filters: ConnectedJournalFilterOptions;
  readiness: ConnectedJournalReadinessSummary;
  appliedFilters: {
    account?: string;
    market?: ConnectedJournalMarket;
    symbol?: string;
    source?: ConnectedJournalTradeSource;
    status?: ConnectedJournalTradeStatus;
    dateRange: "all" | "30d" | "90d" | "year";
  };
  resultWindow: ConnectedJournalResultWindow;
  limit: number;
  safeMessage: string;
}
