import type { IsoDateString } from "@/types/workspace";

export type TradeSource = "copied" | "manual" | "imported";

export type TradeDirection = "buy" | "sell";

export type TradingSession = "asia" | "london" | "new_york";

export interface TradeTags {
  setup: string;
  session: TradingSession;
  account: "personal" | "prop_firm";
}

export interface JournalPrivacy {
  globalPrivate: boolean;
}

export interface JournalTrade {
  tradeId: string;
  workspaceId: string;
  studentId: string;
  pair: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  pnl: number;
  riskReward: number;
  openTime: IsoDateString;
  closeTime: IsoDateString;
  source: TradeSource;
  signalId?: string;
  notes: string;
  isPrivate: boolean;
  tags: TradeTags;
}

export interface JournalStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  averageRiskReward: number;
  totalPnl: number;
  bestDayPnl: number;
  worstDayPnl: number;
  mostTradedPair: string;
}

export interface CalendarPnlDay {
  date: string;
  pnl: number;
  result: "profit" | "loss" | "flat";
}

export interface JournalInsight {
  insightId: string;
  workspaceId: string;
  studentId: string;
  summary: string;
  basedOnTagFilter: string;
  generatedAt: IsoDateString;
}
