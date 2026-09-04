import type { IsoDateString } from "@/types/workspace";

export type SignalStatus = "active" | "edited" | "cancelled" | "closed";

export type SignalSource = "telegram" | "in_app";

export type MarketType = "forex" | "crypto";

export type TradeAction = "buy" | "sell";

export type ExecutionMode = "auto_copy" | "signal_alerts";

export type CopierStatus = "active" | "paused" | "risk_paused" | "unlinked";

export interface SignalEditEvent {
  field: "entry" | "stopLoss" | "takeProfit" | "riskPercent" | "status";
  oldValue: string;
  newValue: string;
  timestamp: IsoDateString;
}

export interface SignalExecutionSummary {
  autoCopyTotal: number;
  autoCopySuccess: number;
  autoCopyFailed: number;
  signalAlertsDelivered: number;
  lastFailureReason?: string;
}

export interface TradeSignal {
  signalId: string;
  workspaceId: string;
  postedBy: string;
  market: MarketType;
  pair: string;
  action: TradeAction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  timestamp: IsoDateString;
  source: SignalSource;
  status: SignalStatus;
  editHistory: SignalEditEvent[];
  executionSummary: SignalExecutionSummary;
}

export interface CopierSettings {
  maxRiskPercent: number;
  maxDailyLoss: number;
  maxOpenTrades: number;
  executionMode: ExecutionMode;
}
