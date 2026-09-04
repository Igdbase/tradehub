import "server-only";

import type {
  PracticeOrderSummary,
  PracticePerformanceAssumptions,
  PracticePerformanceSummary,
  PracticePlaybookPerformanceSummary,
  PracticePlaybookSummary,
  PracticeSessionSummary
} from "@/types/practice";

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number) {
  return Math.round(value * 10000) / 10000;
}

function clampBps(value: unknown) {
  return Math.max(0, Math.min(safeNumber(value), 100));
}

export function normalizePracticePerformanceAssumptions(session: PracticeSessionSummary): PracticePerformanceAssumptions {
  return {
    feeBps: clampBps(session.feeBps),
    spreadBps: clampBps(session.spreadBps),
    slippageBps: clampBps(session.slippageBps),
    safeMessage: "Practice assumptions are simulated fee/spread/slippage settings only and never call broker or exchange providers."
  };
}

export function computePracticeOrderNetResult(input: {
  order: PracticeOrderSummary;
  assumptions: PracticePerformanceAssumptions;
}) {
  const assumptions = input.assumptions;
  const order = input.order;
  const notional = safeNumber(order.notional);
  const persistedFees = typeof order.fees === "number" && Number.isFinite(order.fees)
    ? Math.max(0, order.fees)
    : undefined;
  // Persisted fees replace the fee-bps estimate; spread and slippage remain session assumptions.
  const feeCost = persistedFees ?? notional * assumptions.feeBps / 10_000;
  const spreadCost = notional * assumptions.spreadBps / 10_000;
  const slippageCost = notional * assumptions.slippageBps / 10_000;
  const grossPnl = safeNumber(order.pnl);
  const costs = feeCost + spreadCost + slippageCost;
  const netPnl = grossPnl - costs;
  const persistedRMultiple = safeNumber(order.rMultiple, Number.NaN);
  const explicitRiskAmount = safeNumber(order.riskAmount);
  const inferredRiskAmount = explicitRiskAmount > 0
    ? explicitRiskAmount
    : Number.isFinite(persistedRMultiple) && persistedRMultiple !== 0
      ? Math.abs(grossPnl / persistedRMultiple)
      : 0;

  return {
    order,
    grossPnl: roundMetric(grossPnl),
    feeCost: roundMetric(feeCost),
    spreadCost: roundMetric(spreadCost),
    slippageCost: roundMetric(slippageCost),
    costs: roundMetric(costs),
    netPnl: roundMetric(netPnl),
    rMultiple: inferredRiskAmount > 0 ? roundRatio(netPnl / inferredRiskAmount) : 0
  };
}

export function computePracticePerformanceSummary(input: {
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
}): PracticePerformanceSummary {
  const assumptions = normalizePracticePerformanceAssumptions(input.session);
  const openTrades = input.orders.filter((order) => order.status === "open" || order.status === "pending").length;
  const closedOrders = input.orders
    .filter((order) => order.status === "closed")
    .sort((left, right) => String(left.closedAtCandleTime ?? left.updatedAt).localeCompare(String(right.closedAtCandleTime ?? right.updatedAt)));
  const closedResults = closedOrders.map((order) => computePracticeOrderNetResult({ order, assumptions }));
  const grossPnl = closedResults.reduce((total, result) => total + result.grossPnl, 0);
  const totalCosts = closedResults.reduce((total, result) => total + result.costs, 0);
  const netPnl = closedResults.reduce((total, result) => total + result.netPnl, 0);
  const wins = closedResults.filter((result) => result.netPnl > 0);
  const losses = closedResults.filter((result) => result.netPnl < 0);
  const positivePnl = wins.reduce((total, result) => total + result.netPnl, 0);
  const negativePnl = Math.abs(losses.reduce((total, result) => total + result.netPnl, 0));
  let equity = input.session.startingBalance;
  let peak = equity;
  let maxDrawdown = 0;

  for (const result of closedResults) {
    equity += result.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return {
    startingBalance: roundMetric(input.session.startingBalance),
    endingBalance: roundMetric(input.session.startingBalance + netPnl),
    netPnl: roundMetric(netPnl),
    grossPnl: roundMetric(grossPnl),
    totalCosts: roundMetric(totalCosts),
    winRate: closedResults.length > 0 ? roundRatio(wins.length / closedResults.length) : 0,
    lossRate: closedResults.length > 0 ? roundRatio(losses.length / closedResults.length) : 0,
    totalTrades: closedResults.length + openTrades,
    openTrades,
    closedTrades: closedResults.length,
    averageR: closedResults.length > 0
      ? roundRatio(closedResults.reduce((total, result) => total + result.rMultiple, 0) / closedResults.length)
      : 0,
    bestTrade: closedResults.length > 0 ? roundMetric(Math.max(...closedResults.map((result) => result.netPnl))) : 0,
    worstTrade: closedResults.length > 0 ? roundMetric(Math.min(...closedResults.map((result) => result.netPnl))) : 0,
    maxDrawdown: roundMetric(maxDrawdown),
    profitFactor: negativePnl > 0 ? roundRatio(positivePnl / negativePnl) : positivePnl > 0 ? roundRatio(positivePnl) : 0,
    expectancy: closedResults.length > 0 ? roundMetric(netPnl / closedResults.length) : 0,
    assumptions,
    safeMessage: "Practice analytics are computed server-side from student-owned simulated orders only."
  };
}

export function computePracticePlaybookPerformance(input: {
  orders: PracticeOrderSummary[];
  playbooks?: PracticePlaybookSummary[];
  sessions: PracticeSessionSummary[];
}): PracticePlaybookPerformanceSummary[] {
  const playbookMap = new Map((input.playbooks ?? []).map((playbook) => [playbook.playbookId, playbook]));
  const sessionMap = new Map(input.sessions.map((session) => [session.sessionId, session]));
  const grouped = new Map<string, PracticeOrderSummary[]>();

  for (const order of input.orders) {
    if (order.status !== "closed" || !order.playbookId || !sessionMap.has(order.sessionId)) {
      continue;
    }

    grouped.set(order.playbookId, [...(grouped.get(order.playbookId) ?? []), order]);
  }

  return [...grouped.entries()]
    .map(([playbookId, orders]) => {
      const closedOrders = orders
        .slice()
        .sort((left, right) => String(left.closedAtCandleTime ?? left.updatedAt).localeCompare(String(right.closedAtCandleTime ?? right.updatedAt)));
      const results = closedOrders.map((order) => computePracticeOrderNetResult({
        order,
        assumptions: normalizePracticePerformanceAssumptions(sessionMap.get(order.sessionId)!)
      }));
      const wins = results.filter((result) => result.netPnl > 0);
      const losses = results.filter((result) => result.netPnl < 0);
      const netPnl = results.reduce((total, result) => total + result.netPnl, 0);
      const positivePnl = wins.reduce((total, result) => total + result.netPnl, 0);
      const negativePnl = Math.abs(losses.reduce((total, result) => total + result.netPnl, 0));
      const rValues = results
        .map((result) => result.rMultiple)
        .filter((value) => Number.isFinite(value));
      let equity = 0;
      let peak = 0;
      let maxDrawdown = 0;

      for (const result of results) {
        equity += result.netPnl;
        peak = Math.max(peak, equity);
        maxDrawdown = Math.max(maxDrawdown, peak - equity);
      }

      const playbook = playbookMap.get(playbookId);

      return {
        playbookId,
        playbookName: playbook?.name ?? closedOrders[0]?.playbookName ?? "Archived playbook",
        market: playbook?.market,
        strategyType: playbook?.strategyType,
        trades: closedOrders.length,
        wins: wins.length,
        losses: losses.length,
        winRate: closedOrders.length > 0 ? roundRatio(wins.length / closedOrders.length) : 0,
        netPnl: roundMetric(netPnl),
        averageR: rValues.length > 0 ? roundRatio(rValues.reduce((total, value) => total + value, 0) / rValues.length) : 0,
        profitFactor: negativePnl > 0 ? roundRatio(positivePnl / negativePnl) : positivePnl > 0 ? roundRatio(positivePnl) : 0,
        expectancy: closedOrders.length > 0 ? roundMetric(netPnl / closedOrders.length) : 0,
        maxDrawdown: roundMetric(maxDrawdown),
        safeMessage: "Playbook analytics are computed from closed simulated practice orders only."
      };
    })
    .sort((left, right) => right.netPnl - left.netPnl);
}

export function selectBestWorstPracticePlaybooks(summaries: PracticePlaybookPerformanceSummary[]) {
  const eligible = summaries.filter((summary) => summary.trades > 0);

  if (eligible.length === 0) {
    return {};
  }

  return {
    bestPlaybook: eligible.reduce((best, summary) => summary.netPnl > best.netPnl ? summary : best, eligible[0]),
    worstPlaybook: eligible.reduce((worst, summary) => summary.netPnl < worst.netPnl ? summary : worst, eligible[0])
  };
}
