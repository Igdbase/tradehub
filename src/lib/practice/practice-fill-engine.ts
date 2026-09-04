import "server-only";

import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  getPracticeInstrumentSpec,
  practiceQuantityAlignsWithStep,
  practiceNotionalForInstrument,
  practicePipDistance,
  practicePnlForInstrument,
  quantizePracticeQuantityDown,
  roundPracticeMoney,
  roundPracticeQuantity
} from "@/lib/practice/practice-instrument-specs";
import type {
  NormalizedCandle,
  PracticeAssetClass,
  PracticeInstrumentSpecSummary,
  PracticeOrderCloseReason,
  PracticeOrderDirection,
  PracticeOrderSummary,
  PracticeSessionSummary
} from "@/types/practice";

const MAX_PRACTICE_NOTIONAL = 10_000_000;
const MAX_PRACTICE_SIZE = 1_000_000;

export type PracticeRiskSizingInput = {
  startingBalance: number;
  riskPct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  assetClass: PracticeAssetClass;
  symbol: string;
  instrument?: PracticeInstrumentSpecSummary;
  direction: PracticeOrderDirection;
};

export type PracticeRiskSizingResult = {
  riskAmount: number;
  stopDistance: number;
  stopDistanceInPips: number;
  size: number;
  notional: number;
  instrument: PracticeInstrumentSpecSummary;
};

function assertFinitePositive(value: number, code: string, message: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AdminApiError(400, code, message);
  }
}

function requireSupportedPracticeInstrument(
  assetClass: PracticeAssetClass,
  symbol: string,
  instrument?: PracticeInstrumentSpecSummary
) {
  const canonicalSymbol = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const spec = instrument?.assetClass === assetClass && instrument.canonicalSymbol === canonicalSymbol
    ? instrument
    : getPracticeInstrumentSpec(assetClass, symbol);

  if (!spec) {
    throw new AdminApiError(400, "practice_instrument_spec_unsupported", "TradeHub does not support sizing for that practice instrument yet.");
  }

  return spec;
}

export function validateDirectionalPracticeLevels(input: {
  direction: PracticeOrderDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}) {
  assertFinitePositive(input.entryPrice, "practice_entry_price_invalid", "Enter a valid simulated entry price.");
  assertFinitePositive(input.stopLoss, "practice_stop_loss_invalid", "Enter a valid simulated stop loss.");
  assertFinitePositive(input.takeProfit, "practice_take_profit_invalid", "Enter a valid simulated take profit.");

  if (input.direction === "buy" && !(input.stopLoss < input.entryPrice && input.entryPrice < input.takeProfit)) {
    throw new AdminApiError(400, "practice_buy_levels_invalid", "Buy practice orders require stop loss below entry and take profit above entry.");
  }

  if (input.direction === "sell" && !(input.takeProfit < input.entryPrice && input.entryPrice < input.stopLoss)) {
    throw new AdminApiError(400, "practice_sell_levels_invalid", "Sell practice orders require take profit below entry and stop loss above entry.");
  }
}

function priceAlignsWithInstrument(value: number, instrument: PracticeInstrumentSpecSummary) {
  const precision = Math.max(0, Math.min(instrument.pricePrecision, 8));
  const factor = 10 ** precision;
  const tickSize = instrument.tickSize ?? instrument.pipSize;
  const tickUnits = Math.round(tickSize * factor);
  const valueUnits = Math.round(value * factor);

  return tickUnits > 0 && Math.abs(value * factor - valueUnits) < 0.000001 && valueUnits % tickUnits === 0;
}

export function validatePracticePriceTickAlignment(input: {
  instrument: PracticeInstrumentSpecSummary;
  prices: number[];
}) {
  if (input.prices.some((price) => !priceAlignsWithInstrument(price, input.instrument))) {
    throw new AdminApiError(400, "practice_price_tick_invalid", "Entry, stop loss, and take profit must use this instrument's price step.");
  }
}

export function calculatePracticeRiskSizing(input: PracticeRiskSizingInput): PracticeRiskSizingResult {
  const instrument = requireSupportedPracticeInstrument(input.assetClass, input.symbol, input.instrument);
  validateDirectionalPracticeLevels(input);
  validatePracticePriceTickAlignment({
    instrument,
    prices: [input.entryPrice, input.stopLoss, input.takeProfit]
  });

  const riskAmount = input.startingBalance * input.riskPct / 100;
  const stopDistance = Math.abs(input.entryPrice - input.stopLoss);
  const size = riskAmount / (stopDistance * instrument.contractMultiplier);
  const alignedSize = quantizePracticeQuantityDown(size, instrument);
  const actualRiskAmount = stopDistance * alignedSize * instrument.contractMultiplier;
  const notional = practiceNotionalForInstrument(instrument, input.entryPrice, alignedSize);
  const stopDistanceInPips = practicePipDistance({
    spec: instrument,
    firstPrice: input.entryPrice,
    secondPrice: input.stopLoss
  });

  assertFinitePositive(riskAmount, "practice_risk_amount_invalid", "Practice risk amount must be greater than zero.");
  assertFinitePositive(stopDistance, "practice_stop_distance_invalid", "Practice stop distance must be greater than zero.");
  assertFinitePositive(size, "practice_order_size_invalid", "Practice order size must be finite and greater than zero.");
  assertFinitePositive(alignedSize, "practice_order_size_invalid", "Practice order size must be finite and greater than zero.");
  assertFinitePositive(notional, "practice_notional_invalid", "Practice notional must be finite and greater than zero.");

  if (
    !practiceQuantityAlignsWithStep(alignedSize, instrument) ||
    alignedSize < instrument.minSimulatedSize ||
    alignedSize > Math.min(instrument.maxSimulatedSize, MAX_PRACTICE_SIZE) ||
    notional < (instrument.minSimulatedNotional ?? 0) ||
    notional > Math.min(instrument.maxSimulatedNotional, MAX_PRACTICE_NOTIONAL) ||
    actualRiskAmount > riskAmount + 0.000001
  ) {
    throw new AdminApiError(400, "practice_order_size_out_of_range", "Adjust practice risk or the stop distance so the simulated size stays within this instrument's limits.");
  }

  return {
    riskAmount: roundPracticeMoney(actualRiskAmount),
    stopDistance,
    stopDistanceInPips,
    size: alignedSize,
    notional,
    instrument
  };
}

export function pnlForPracticeOrder(input: {
  assetClass?: PracticeAssetClass;
  symbol?: string;
  instrument?: PracticeInstrumentSpecSummary;
  direction: PracticeOrderDirection;
  entryPrice: number;
  exitPrice: number;
  size: number;
}) {
  const instrument = input.instrument ?? (
    input.assetClass && input.symbol ? getPracticeInstrumentSpec(input.assetClass, input.symbol) : undefined
  );

  return practicePnlForInstrument({
    spec: instrument,
    direction: input.direction,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    quantity: input.size
  });
}

export function riskAmountForPracticeQuantity(input: {
  assetClass: PracticeAssetClass;
  symbol: string;
  instrument?: PracticeInstrumentSpecSummary;
  entryPrice: number;
  stopLoss: number;
  size: number;
}) {
  const instrument = requireSupportedPracticeInstrument(input.assetClass, input.symbol, input.instrument);
  const stopDistance = Math.abs(input.entryPrice - input.stopLoss);

  assertFinitePositive(stopDistance, "practice_stop_distance_invalid", "Practice stop distance must be greater than zero.");

  return {
    riskAmount: roundPracticeMoney(stopDistance * input.size * instrument.contractMultiplier),
    stopDistance,
    stopDistanceInPips: practicePipDistance({
      spec: instrument,
      firstPrice: input.entryPrice,
      secondPrice: input.stopLoss
    }),
    instrument
  };
}

function shouldFillPendingOrder(order: PracticeOrderSummary, candle: NormalizedCandle) {
  if (order.orderType === "limit" && order.direction === "buy") {
    return candle.low <= order.requestedPrice;
  }

  if (order.orderType === "limit" && order.direction === "sell") {
    return candle.high >= order.requestedPrice;
  }

  if (order.orderType === "stop" && order.direction === "buy") {
    return candle.high >= order.requestedPrice;
  }

  if (order.orderType === "stop" && order.direction === "sell") {
    return candle.low <= order.requestedPrice;
  }

  return false;
}

function closeSignalForOpenOrder(order: PracticeOrderSummary, candle: NormalizedCandle) {
  if (order.stopLoss === undefined || order.takeProfit === undefined) {
    return null;
  }

  if (order.direction === "buy") {
    const stopHit = candle.low <= order.stopLoss;
    const targetHit = candle.high >= order.takeProfit;

    // Same-candle SL/TP conflict is intentionally conservative: stop loss wins.
    // TODO Stage 17D/17E: use finer 1-minute series for authoritative intrabar ordering.
    if (stopHit) {
      return { closeReason: "stop_loss" as const, exitPrice: order.stopLoss };
    }

    if (targetHit) {
      return { closeReason: "take_profit" as const, exitPrice: order.takeProfit };
    }
  }

  if (order.direction === "sell") {
    const stopHit = candle.high >= order.stopLoss;
    const targetHit = candle.low <= order.takeProfit;

    // Same-candle SL/TP conflict is intentionally conservative: stop loss wins.
    // TODO Stage 17D/17E: use finer 1-minute series for authoritative intrabar ordering.
    if (stopHit) {
      return { closeReason: "stop_loss" as const, exitPrice: order.stopLoss };
    }

    if (targetHit) {
      return { closeReason: "take_profit" as const, exitPrice: order.takeProfit };
    }
  }

  return null;
}

export function buildPracticeCloseEvent(input: {
  order: PracticeOrderSummary;
  session?: PracticeSessionSummary;
  exitPrice: number;
  closeReason: PracticeOrderCloseReason;
  candleIndex: number;
  candleTime: string;
  eventType: "partial_close" | "full_close";
  closedSize: number;
  remainingSize: number;
}) {
  const entryPrice = input.order.filledPrice ?? input.order.requestedPrice;
  const instrument = input.order.instrument ?? (
    input.session ? getPracticeInstrumentSpec(input.session.assetClass, input.session.symbol) : undefined
  );
  const alignedClosedSize = roundPracticeQuantity(input.closedSize, instrument);
  const alignedRemainingSize = roundPracticeQuantity(input.remainingSize, instrument);

  if (
    !practiceQuantityAlignsWithStep(input.closedSize, instrument) ||
    !practiceQuantityAlignsWithStep(input.remainingSize, instrument) ||
    alignedClosedSize !== input.closedSize ||
    alignedRemainingSize !== input.remainingSize
  ) {
    throw new AdminApiError(400, "practice_close_quantity_step_invalid", "Close quantities must use this instrument's quantity step.");
  }
  const pnl = pnlForPracticeOrder({
    instrument,
    direction: input.order.direction,
    entryPrice,
    exitPrice: input.exitPrice,
    size: alignedClosedSize
  });
  const riskAmount = input.order.riskAmount && input.order.riskAmount > 0 ? input.order.riskAmount : undefined;
  const eventId = [
    input.order.orderId,
    input.eventType,
    input.closeReason,
    String(input.candleIndex),
    String(input.closedSize),
    String(Date.now())
  ].join("_").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);

  return {
    eventId,
    eventType: input.eventType,
    closedSize: alignedClosedSize,
    remainingSize: alignedRemainingSize,
    exitPrice: input.exitPrice,
    notional: practiceNotionalForInstrument(instrument, input.exitPrice, alignedClosedSize),
    pnl,
    rMultiple: riskAmount ? Math.round((pnl / riskAmount) * 100) / 100 : undefined,
    instrument,
    closeReason: input.closeReason,
    candleIndex: input.candleIndex,
    candleTime: input.candleTime,
    safeMessage: input.eventType === "partial_close"
      ? "Simulated practice order partially closed against revealed candle data."
      : `Simulated practice order fully closed by ${input.closeReason.replace("_", " ")}.`,
    createdAt: new Date().toISOString()
  };
}

function closeOrder(session: PracticeSessionSummary, order: PracticeOrderSummary, candle: NormalizedCandle, candleIndex: number, exitPrice: number, closeReason: "stop_loss" | "take_profit") {
  const entryPrice = order.filledPrice ?? order.requestedPrice;
  const remainingSize = order.remainingSize ?? order.size ?? 0;
  const previousClosedSize = order.closedSize ?? 0;
  const closeEvent = buildPracticeCloseEvent({
    order,
    session,
    exitPrice,
    closeReason,
    candleIndex,
    candleTime: candle.closeTime,
    eventType: "full_close",
    closedSize: remainingSize,
    remainingSize: 0
  });
  const pnl = pnlForPracticeOrder({
    assetClass: session.assetClass,
    symbol: session.symbol,
    instrument: order.instrument,
    direction: order.direction,
    entryPrice,
    exitPrice,
    size: remainingSize
  });
  const riskAmount = order.riskAmount && order.riskAmount > 0 ? order.riskAmount : undefined;

  return {
    ...order,
    status: "closed" as const,
    closeReason,
    closedAtCandleTime: candle.closeTime,
    remainingSize: 0,
    closedSize: roundPracticeQuantity(previousClosedSize + remainingSize, order.instrument),
    pnl: roundPracticeMoney((order.pnl ?? 0) + pnl),
    rMultiple: riskAmount ? Math.round((pnl / riskAmount) * 100) / 100 : undefined,
    evaluatedThroughCandleIndex: order.evaluatedThroughCandleIndex,
    closeEvents: [...(order.closeEvents ?? []), closeEvent],
    safeMessage: closeEvent.safeMessage
  };
}

export function evaluatePracticeOrderAgainstRevealedCandles(input: {
  order: PracticeOrderSummary;
  session: PracticeSessionSummary;
  revealedCandles: NormalizedCandle[];
  currentCandleIndex: number;
}) {
  let nextOrder = { ...input.order };
  const startIndex = Math.max(0, (nextOrder.evaluatedThroughCandleIndex ?? -1) + 1);

  for (let candleIndex = startIndex; candleIndex <= input.currentCandleIndex; candleIndex += 1) {
    const candle = input.revealedCandles[candleIndex];

    if (!candle) {
      break;
    }

    if (nextOrder.status === "pending" && shouldFillPendingOrder(nextOrder, candle)) {
      const sizing = calculatePracticeRiskSizing({
        startingBalance: input.session.startingBalance,
        riskPct: input.session.riskPct,
        entryPrice: nextOrder.requestedPrice,
        stopLoss: nextOrder.stopLoss ?? 0,
        takeProfit: nextOrder.takeProfit ?? 0,
        assetClass: input.session.assetClass,
        symbol: input.session.symbol,
        instrument: input.session.instrument,
        direction: nextOrder.direction
      });

      nextOrder = {
        ...nextOrder,
        status: "open",
        filledPrice: nextOrder.requestedPrice,
        size: sizing.size,
        remainingSize: sizing.size,
        closedSize: 0,
        notional: sizing.notional,
        instrument: sizing.instrument,
        stopDistance: sizing.stopDistance,
        stopDistanceInPips: sizing.stopDistanceInPips,
        riskAmount: sizing.riskAmount,
        openedAtCandleTime: candle.closeTime,
        safeMessage: "Simulated pending practice order filled against revealed candle data."
      };
    }

    if (nextOrder.status === "open") {
      const closeSignal = closeSignalForOpenOrder(nextOrder, candle);

      if (closeSignal) {
        nextOrder = closeOrder(input.session, nextOrder, candle, candleIndex, closeSignal.exitPrice, closeSignal.closeReason);
      }
    }

    nextOrder.evaluatedThroughCandleIndex = candleIndex;

    if (nextOrder.status === "closed") {
      break;
    }
  }

  return nextOrder;
}

export function marketOrderFillPriceFromLatestRevealedCandle(candle: NormalizedCandle) {
  // Stage 17C rule: simulated market orders fill at the latest revealed candle close.
  return candle.close;
}
