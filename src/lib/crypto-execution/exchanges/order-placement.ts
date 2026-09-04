import "server-only";

import {
  cancelBinanceOrder,
  checkBinanceBalance,
  getBinanceOrderStatus,
  placeBinanceOrder
} from "@/lib/crypto-execution/exchanges/binance-adapter";
import {
  cancelBybitOrder,
  checkBybitBalance,
  getBybitOrderStatus,
  placeBybitOrder
} from "@/lib/crypto-execution/exchanges/bybit-adapter";
import type {
  ExchangeBalancePrecheckAdapter,
  ExchangeOrderLookupAdapter,
  ExchangeOrderPlacementAdapter
} from "@/lib/crypto-execution/exchanges/types";
import type { CryptoExchangeId } from "@/types/crypto-execution";

export function getExchangeOrderPlacementAdapter(exchange: CryptoExchangeId): ExchangeOrderPlacementAdapter {
  return exchange === "bybit" ? placeBybitOrder : placeBinanceOrder;
}

export function getExchangeOrderStatusAdapter(exchange: CryptoExchangeId): ExchangeOrderLookupAdapter {
  return exchange === "bybit" ? getBybitOrderStatus : getBinanceOrderStatus;
}

export function getExchangeOrderCancelAdapter(exchange: CryptoExchangeId): ExchangeOrderLookupAdapter {
  return exchange === "bybit" ? cancelBybitOrder : cancelBinanceOrder;
}

export function getExchangeBalancePrecheckAdapter(exchange: CryptoExchangeId): ExchangeBalancePrecheckAdapter {
  return exchange === "bybit" ? checkBybitBalance : checkBinanceBalance;
}

export type {
  ExchangeBalancePrecheckAdapter,
  ExchangeBalancePrecheckInput,
  ExchangeBalancePrecheckResult,
  ExchangeOrderLookupAdapter,
  ExchangeOrderLookupInput,
  ExchangeOrderLookupResult,
  ExchangeOrderPlacementAdapter,
  ExchangeOrderPlacementInput,
  ExchangeOrderPlacementResult
} from "@/lib/crypto-execution/exchanges/types";
