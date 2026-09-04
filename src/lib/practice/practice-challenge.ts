import "server-only";

import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  PracticeChallengeConfig,
  PracticeChallengeSummary,
  PracticeOrderSummary,
  PracticeSessionSummary
} from "@/types/practice";

function safeNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number) {
  return Math.round(value * 10000) / 10000;
}

function positiveAmountFromPercent(balance: number, amount: unknown, percent: unknown, fallbackPercent: number) {
  const explicitAmount = safeNumber(amount, 0);
  const normalizedPercent = Math.max(0, safeNumber(percent, fallbackPercent));

  return explicitAmount > 0 ? explicitAmount : balance * normalizedPercent / 100;
}

function practiceOrderDay(order: PracticeOrderSummary) {
  const value = order.openedAtCandleTime ?? order.closedAtCandleTime ?? order.createdAt;
  const time = Date.parse(value);

  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : "unknown";
}

function challengeTradeCount(orders: PracticeOrderSummary[]) {
  return orders.filter((order) => order.status !== "cancelled" && order.status !== "rejected").length;
}

function openTradeCount(orders: PracticeOrderSummary[]) {
  return orders.filter((order) => order.status === "open" || order.status === "pending").length;
}

function computeDailyLoss(orders: PracticeOrderSummary[]) {
  const lossesByDay = new Map<string, number>();

  for (const order of orders) {
    if (order.status !== "closed") {
      continue;
    }

    const pnl = safeNumber(order.pnl, 0);

    if (pnl >= 0) {
      continue;
    }

    const day = practiceOrderDay(order);
    lossesByDay.set(day, (lossesByDay.get(day) ?? 0) + Math.abs(pnl));
  }

  return Math.max(0, ...lossesByDay.values());
}

function computeTradingDays(orders: PracticeOrderSummary[]) {
  return new Set(
    orders
      .filter((order) => order.status !== "cancelled" && order.status !== "rejected")
      .map(practiceOrderDay)
      .filter((day) => day !== "unknown")
  ).size;
}

function computeTradesOnDay(orders: PracticeOrderSummary[], targetDay: string) {
  return orders
    .filter((order) => order.status !== "cancelled" && order.status !== "rejected")
    .filter((order) => practiceOrderDay(order) === targetDay)
    .length;
}

export function normalizePracticeChallengeConfig(payload: unknown, sessionStartingBalance: number): PracticeChallengeConfig | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;

  if (record.enabled !== true) {
    return undefined;
  }

  const startingBalance = Math.max(1, Math.min(safeNumber(record.startingBalance, sessionStartingBalance), 1_000_000));
  const profitTargetPercent = Math.max(0.1, Math.min(safeNumber(record.profitTargetPercent, 10), 500));
  const maxDailyLossPercent = Math.max(0.1, Math.min(safeNumber(record.maxDailyLossPercent, 5), 100));
  const maxTotalDrawdownPercent = Math.max(0.1, Math.min(safeNumber(record.maxTotalDrawdownPercent, 10), 100));

  return {
    enabled: true,
    challengeName: safeString(record.challengeName).replace(/\s+/g, " ").slice(0, 80) || "Practice challenge",
    startingBalance,
    profitTargetAmount: positiveAmountFromPercent(startingBalance, record.profitTargetAmount, profitTargetPercent, 10),
    profitTargetPercent,
    maxDailyLossAmount: positiveAmountFromPercent(startingBalance, record.maxDailyLossAmount, maxDailyLossPercent, 5),
    maxDailyLossPercent,
    maxTotalDrawdownAmount: positiveAmountFromPercent(startingBalance, record.maxTotalDrawdownAmount, maxTotalDrawdownPercent, 10),
    maxTotalDrawdownPercent,
    maxOpenSimulatedTrades: Math.max(1, Math.min(Math.floor(safeNumber(record.maxOpenSimulatedTrades, 3)), 20)),
    maxTradesPerSession: Math.max(1, Math.min(Math.floor(safeNumber(record.maxTradesPerSession, 20)), 200)),
    maxTradesPerDay: record.maxTradesPerDay === undefined
      ? undefined
      : Math.max(1, Math.min(Math.floor(safeNumber(record.maxTradesPerDay, 10)), 100)),
    minimumTradingDays: record.minimumTradingDays === undefined
      ? undefined
      : Math.max(0, Math.min(Math.floor(safeNumber(record.minimumTradingDays, 0)), 60)),
    notes: safeString(record.notes).replace(/\s+/g, " ").slice(0, 700) || undefined
  };
}

export function computePracticeChallengeStatus(input: {
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  now?: string;
}): PracticeChallengeSummary | undefined {
  const challenge = input.session.challenge;

  if (!challenge?.enabled) {
    return undefined;
  }

  if (input.session.challengeResult?.status === "failed") {
    return input.session.challengeResult;
  }

  if (input.session.status === "completed" && input.session.challengeResult) {
    return input.session.challengeResult;
  }

  const startingBalance = challenge.startingBalance || input.session.startingBalance;
  const closedOrders = input.orders
    .filter((order) => order.status === "closed")
    .sort((left, right) => String(left.closedAtCandleTime ?? left.updatedAt).localeCompare(String(right.closedAtCandleTime ?? right.updatedAt)));
  const netPnl = closedOrders.reduce((total, order) => total + safeNumber(order.pnl, 0), 0);
  const currentEquity = startingBalance + netPnl;
  let peak = startingBalance;
  let drawdownUsage = 0;
  let equity = startingBalance;

  for (const order of closedOrders) {
    equity += safeNumber(order.pnl, 0);
    peak = Math.max(peak, equity);
    drawdownUsage = Math.max(drawdownUsage, peak - equity);
  }

  const openTrades = openTradeCount(input.orders);
  const tradesUsed = challengeTradeCount(input.orders);
  const latestDay = input.orders
    .map(practiceOrderDay)
    .filter((day) => day !== "unknown")
    .sort()
    .at(-1) ?? new Date().toISOString().slice(0, 10);
  const tradesToday = computeTradesOnDay(input.orders, latestDay);
  const dailyLossUsage = computeDailyLoss(input.orders);
  const tradingDays = computeTradingDays(input.orders);
  const profitTargetAmount = positiveAmountFromPercent(startingBalance, challenge.profitTargetAmount, challenge.profitTargetPercent, 10);
  const maxDailyLossAmount = positiveAmountFromPercent(startingBalance, challenge.maxDailyLossAmount, challenge.maxDailyLossPercent, 5);
  const maxTotalDrawdownAmount = positiveAmountFromPercent(startingBalance, challenge.maxTotalDrawdownAmount, challenge.maxTotalDrawdownPercent, 10);
  const breachCodes: string[] = [];
  const breachMessages: string[] = [];

  if (dailyLossUsage > maxDailyLossAmount) {
    breachCodes.push("practice_challenge_daily_loss_breached");
    breachMessages.push("Simulated daily loss exceeded the practice challenge limit.");
  }

  if (drawdownUsage > maxTotalDrawdownAmount) {
    breachCodes.push("practice_challenge_drawdown_breached");
    breachMessages.push("Simulated total drawdown exceeded the practice challenge limit.");
  }

  if (openTrades > challenge.maxOpenSimulatedTrades) {
    breachCodes.push("practice_challenge_open_trades_breached");
    breachMessages.push("Open simulated trades exceeded the practice challenge limit.");
  }

  if (tradesUsed > challenge.maxTradesPerSession) {
    breachCodes.push("practice_challenge_trade_count_breached");
    breachMessages.push("Simulated trade count exceeded the practice challenge session limit.");
  }

  if (challenge.maxTradesPerDay && tradesToday > challenge.maxTradesPerDay) {
    breachCodes.push("practice_challenge_daily_trade_count_breached");
    breachMessages.push("Simulated trades for the latest practice day exceeded the challenge limit.");
  }

  const status = breachCodes.length > 0
    ? "failed"
    : tradesUsed === 0
      ? "not_started"
      : netPnl >= profitTargetAmount
        ? "passed"
        : "active";

  return {
    enabled: true,
    status,
    challengeName: challenge.challengeName || "Practice challenge",
    startingBalance: roundMetric(startingBalance),
    currentEquity: roundMetric(currentEquity),
    netPnl: roundMetric(netPnl),
    profitTargetAmount: roundMetric(profitTargetAmount),
    profitTargetProgress: profitTargetAmount > 0 ? roundRatio(Math.max(0, netPnl) / profitTargetAmount) : 0,
    maxDailyLossAmount: roundMetric(maxDailyLossAmount),
    dailyLossUsage: roundMetric(dailyLossUsage),
    maxTotalDrawdownAmount: roundMetric(maxTotalDrawdownAmount),
    drawdownUsage: roundMetric(drawdownUsage),
    openTrades,
    maxOpenSimulatedTrades: challenge.maxOpenSimulatedTrades,
    tradesUsed,
    maxTradesPerSession: challenge.maxTradesPerSession,
    tradesToday,
    maxTradesPerDay: challenge.maxTradesPerDay,
    tradingDays,
    minimumTradingDays: challenge.minimumTradingDays,
    breachCodes,
    breachMessages,
    safeMessage: "Simulated practice challenge status is computed from student-owned practice orders only.",
    evaluatedAt: input.now ?? new Date().toISOString()
  };
}

export function assertPracticeChallengeAllowsNewOrder(input: {
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  practiceDay?: string;
}) {
  const challenge = input.session.challenge;

  if (!challenge?.enabled) {
    return;
  }

  if (input.session.challengeResult?.status === "failed") {
    throw new AdminApiError(409, "practice_challenge_failed", "This simulated practice challenge has already failed.");
  }

  if (input.session.challengeResult?.status === "passed") {
    throw new AdminApiError(409, "practice_challenge_passed", "This simulated practice challenge is already preserved as passed.");
  }

  const openAfterNewOrder = openTradeCount(input.orders) + 1;
  const tradeCountAfterNewOrder = challengeTradeCount(input.orders) + 1;

  if (openAfterNewOrder > challenge.maxOpenSimulatedTrades) {
    throw new AdminApiError(409, "practice_challenge_max_open_trades", "This simulated order would exceed the practice challenge open-trade limit.");
  }

  if (tradeCountAfterNewOrder > challenge.maxTradesPerSession) {
    throw new AdminApiError(409, "practice_challenge_max_trades", "This simulated order would exceed the practice challenge session trade limit.");
  }

  if (challenge.maxTradesPerDay) {
    const day = input.practiceDay ?? new Date().toISOString().slice(0, 10);
    const tradesTodayAfterNewOrder = computeTradesOnDay(input.orders, day) + 1;

    if (tradesTodayAfterNewOrder > challenge.maxTradesPerDay) {
      throw new AdminApiError(409, "practice_challenge_max_daily_trades", "This simulated order would exceed the practice challenge daily trade limit.");
    }
  }
}
