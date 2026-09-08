import type {
  WorkspaceSignalDirection,
  WorkspaceSignalMarket,
  WorkspaceSignalRiskLabel
} from "@/types/workspace-dashboard";

export type StudentSignalFilter = "all" | "forex" | "crypto" | "open";
export type StudentSignalLifecycle = "open" | "cancelled" | "closed" | "unavailable";
export type StudentSignalCopiedState = "not_copied" | "copied" | "executed";

export type StudentSignalExecutionSummary = {
  copiedState: StudentSignalCopiedState;
  sourceLabel?: "Copied" | "Provider placed";
  lifecycle?: "open" | "partial" | "closed";
  pnl?: {
    label: "Floating P&L" | "Realized P&L";
    value: number;
    currency: string;
  };
};

export type StudentSignalFeedCard = {
  signalRef: string;
  symbol: string;
  market: WorkspaceSignalMarket;
  side: WorkspaceSignalDirection;
  lifecycle: StudentSignalLifecycle;
  statusLabel: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  riskLabel: WorkspaceSignalRiskLabel;
  sourceLabel: string;
  ageLabel: string;
  publishedAt?: string;
  updatedAt: string;
  copied: StudentSignalExecutionSummary;
};

export type StudentSignalsPageInfo = {
  limit: number;
  scannedCount: number;
  matchedCount: number;
  visibleCount: number;
  hasMore: boolean;
  truncated: boolean;
  nextCursor: string | null;
};

export type StudentSignalsOverview = {
  workspaceLabel: string;
  accessState: "available" | "locked";
  accessReason: string;
  copiedCount: number;
  executedCount: number;
  openCount: number;
};

export type StudentSignalsResponse = {
  ok: true;
  filter: StudentSignalFilter;
  overview: StudentSignalsOverview;
  signals: StudentSignalFeedCard[];
  pageInfo: StudentSignalsPageInfo;
  notices: string[];
};
