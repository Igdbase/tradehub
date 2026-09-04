import type { AdminSourceMeta } from "@/types/admin-api";
import type { NormalizedCandle, PracticeAssetClass, PracticePlatformSource } from "@/types/practice";
import type { IsoDateString } from "@/types/workspace";

export type ManualTradeMarket = "crypto" | "forex" | "cfd" | "stock" | "futures" | "other";

export type ManualTradeSide = "buy_long" | "sell_short";

export type ManualTradeStatus = "planned" | "open" | "closed" | "cancelled";

export type ManualTradeOutcome = "planned" | "open" | "cancelled" | "win" | "loss" | "breakeven";

export type ManualTradeSetupQuality = "a_plus" | "a" | "b" | "c" | "poor" | "";

export type ManualJournalTrade = {
  tradeId: string;
  workspaceId: string;
  studentId: string;
  market: ManualTradeMarket;
  symbol: string;
  side: ManualTradeSide;
  status: ManualTradeStatus;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  stopLoss?: number;
  takeProfit?: number;
  fees?: number;
  openedAt?: IsoDateString;
  closedAt?: IsoDateString;
  strategyName?: string;
  tags: string[];
  emotion?: string;
  mistakeCategory?: string;
  setupQuality?: ManualTradeSetupQuality;
  notes?: string;
  lessonLearned?: string;
  grossPnl?: number;
  netPnl?: number;
  riskAmount?: number;
  rMultiple?: number;
  outcome: ManualTradeOutcome;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  archivedAt?: IsoDateString;
};

export type ManualJournalTradeInput = Partial<{
  market: ManualTradeMarket;
  symbol: string;
  side: ManualTradeSide;
  status: ManualTradeStatus;
  entryPrice: number | string | null;
  exitPrice: number | string | null;
  quantity: number | string | null;
  stopLoss: number | string | null;
  takeProfit: number | string | null;
  fees: number | string | null;
  openedAt: string | null;
  closedAt: string | null;
  strategyName: string | null;
  tags: string[] | string | null;
  emotion: string | null;
  mistakeCategory: string | null;
  setupQuality: ManualTradeSetupQuality | null;
  notes: string | null;
  lessonLearned: string | null;
}>;

export type ManualJournalTradeFilters = {
  q?: string;
  status?: ManualTradeStatus | "all";
  outcome?: ManualTradeOutcome | "all";
  strategy?: string;
  tag?: string;
  includeArchived?: boolean;
  limit: number;
};

export type ManualJournalTradeListResponse = AdminSourceMeta & {
  trades: ManualJournalTrade[];
  pageInfo: {
    limit: number;
    totalLoaded: number;
    hasMore: boolean;
  };
};

export type ManualJournalTradeMutationResponse = AdminSourceMeta & {
  trade: ManualJournalTrade;
  message: string;
};

export type ManualTradeReviewChartState = {
  available: boolean;
  assetClass?: PracticeAssetClass;
  provider?: PracticePlatformSource;
  providerSymbol?: string;
  timeframeMinutes: number;
  rangeStart?: IsoDateString;
  rangeEnd?: IsoDateString;
  candles: NormalizedCandle[];
  safeMessage: string;
  warnings: string[];
};

export type ManualJournalTradeReviewResponse = AdminSourceMeta & {
  ok: true;
  trade: ManualJournalTrade;
  chart: ManualTradeReviewChartState;
  review: {
    readOnly: boolean;
    canEditReviewFields: boolean;
    safeMessage: string;
  };
};

export type ManualJournalBreakdownRow = {
  label: string;
  count: number;
  closedTrades: number;
  netPnl: number;
  averageR: number;
  winRate: number;
};

export type ManualJournalCalendarDay = {
  date: string;
  trades: number;
  closedTrades: number;
  netPnl: number;
  rTotal: number;
  wins: number;
  losses: number;
};

export type ManualJournalTradeHighlight = {
  tradeId: string;
  symbol: string;
  market: ManualTradeMarket;
  side: ManualTradeSide;
  outcome: ManualTradeOutcome;
  netPnl: number;
  rMultiple?: number;
  closedAt?: IsoDateString;
  strategyName?: string;
};

export type ManualJournalAnalyticsSummary = {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  plannedTrades: number;
  cancelledTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  netPnl: number;
  averageR: number;
  expectancy: number;
  profitFactor: number;
  bestTrade?: ManualJournalTradeHighlight;
  worstTrade?: ManualJournalTradeHighlight;
  averageWin: number;
  averageLoss: number;
};

export type ManualJournalAnalyticsResponse = AdminSourceMeta & {
  ok: true;
  summary: ManualJournalAnalyticsSummary;
  breakdowns: {
    symbols: ManualJournalBreakdownRow[];
    strategies: ManualJournalBreakdownRow[];
    tags: ManualJournalBreakdownRow[];
    emotions: ManualJournalBreakdownRow[];
    mistakes: ManualJournalBreakdownRow[];
    setupQuality: ManualJournalBreakdownRow[];
  };
  calendar: ManualJournalCalendarDay[];
  pageInfo: {
    limit: number;
    totalLoaded: number;
    bounded: boolean;
  };
  safeMessage: string;
};

export type ManualJournalImportResponse = AdminSourceMeta & {
  ok: true;
  createdCount: number;
  rejectedCount: number;
  trades: ManualJournalTrade[];
  errors: Array<{
    row: number;
    code: string;
    message: string;
  }>;
  safeMessage: string;
};
