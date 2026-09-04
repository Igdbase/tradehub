import type { TradeSignal } from "@/types/tradehub";

export const mockSignals: TradeSignal[] = [
  {
    signalId: "sig_apex_xau_001",
    workspaceId: "ws_apexfx",
    postedBy: "infl_apex_001",
    market: "forex",
    pair: "XAUUSD",
    action: "buy",
    entry: 2310.5,
    stopLoss: 2300,
    takeProfit: 2340,
    riskPercent: 1,
    timestamp: "2026-07-06T07:10:00.000Z",
    source: "telegram",
    status: "active",
    editHistory: [],
    executionSummary: {
      autoCopyTotal: 2,
      autoCopySuccess: 2,
      autoCopyFailed: 0,
      signalAlertsDelivered: 4
    }
  },
  {
    signalId: "sig_apex_btc_002",
    workspaceId: "ws_apexfx",
    postedBy: "infl_apex_001",
    market: "crypto",
    pair: "BTCUSDT",
    action: "buy",
    entry: 63220,
    stopLoss: 61900,
    takeProfit: 66500,
    riskPercent: 0.8,
    timestamp: "2026-07-05T14:20:00.000Z",
    source: "in_app",
    status: "edited",
    editHistory: [
      {
        field: "takeProfit",
        oldValue: "66100",
        newValue: "66500",
        timestamp: "2026-07-05T14:45:00.000Z"
      }
    ],
    executionSummary: {
      autoCopyTotal: 2,
      autoCopySuccess: 1,
      autoCopyFailed: 1,
      signalAlertsDelivered: 4,
      lastFailureReason: "Bybit position mode mismatch on one linked account."
    }
  },
  {
    signalId: "sig_apex_eur_003",
    workspaceId: "ws_apexfx",
    postedBy: "infl_apex_001",
    market: "forex",
    pair: "EURUSD",
    action: "sell",
    entry: 1.0821,
    stopLoss: 1.0866,
    takeProfit: 1.0745,
    riskPercent: 0.7,
    timestamp: "2026-07-03T09:10:00.000Z",
    source: "telegram",
    status: "closed",
    editHistory: [],
    executionSummary: {
      autoCopyTotal: 2,
      autoCopySuccess: 2,
      autoCopyFailed: 0,
      signalAlertsDelivered: 3
    }
  },
  {
    signalId: "sig_apex_nas_004",
    workspaceId: "ws_apexfx",
    postedBy: "infl_apex_001",
    market: "forex",
    pair: "NAS100",
    action: "sell",
    entry: 20180,
    stopLoss: 20310,
    takeProfit: 19940,
    riskPercent: 0.6,
    timestamp: "2026-07-02T13:40:00.000Z",
    source: "in_app",
    status: "cancelled",
    editHistory: [
      {
        field: "status",
        oldValue: "active",
        newValue: "cancelled",
        timestamp: "2026-07-02T13:52:00.000Z"
      }
    ],
    executionSummary: {
      autoCopyTotal: 2,
      autoCopySuccess: 0,
      autoCopyFailed: 0,
      signalAlertsDelivered: 4
    }
  },
  {
    signalId: "sig_north_btc_005",
    workspaceId: "ws_northstar",
    postedBy: "infl_north_001",
    market: "crypto",
    pair: "BTCUSDT",
    action: "buy",
    entry: 64200,
    stopLoss: 62820,
    takeProfit: 67100,
    riskPercent: 1.1,
    timestamp: "2026-07-06T05:50:00.000Z",
    source: "telegram",
    status: "active",
    editHistory: [],
    executionSummary: {
      autoCopyTotal: 1,
      autoCopySuccess: 1,
      autoCopyFailed: 0,
      signalAlertsDelivered: 1
    }
  },
  {
    signalId: "sig_north_eth_006",
    workspaceId: "ws_northstar",
    postedBy: "infl_north_001",
    market: "crypto",
    pair: "ETHUSDT",
    action: "sell",
    entry: 3480,
    stopLoss: 3565,
    takeProfit: 3325,
    riskPercent: 0.9,
    timestamp: "2026-07-04T11:05:00.000Z",
    source: "in_app",
    status: "closed",
    editHistory: [],
    executionSummary: {
      autoCopyTotal: 1,
      autoCopySuccess: 1,
      autoCopyFailed: 0,
      signalAlertsDelivered: 1
    }
  },
  {
    signalId: "sig_pip_gbp_007",
    workspaceId: "ws_pipharvest",
    postedBy: "infl_pip_001",
    market: "forex",
    pair: "GBPUSD",
    action: "buy",
    entry: 1.2741,
    stopLoss: 1.2694,
    takeProfit: 1.2828,
    riskPercent: 0.75,
    timestamp: "2026-07-05T08:35:00.000Z",
    source: "telegram",
    status: "active",
    editHistory: [],
    executionSummary: {
      autoCopyTotal: 1,
      autoCopySuccess: 1,
      autoCopyFailed: 0,
      signalAlertsDelivered: 1
    }
  }
];
