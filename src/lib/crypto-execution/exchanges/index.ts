import "server-only";

import { checkBinancePermissions } from "@/lib/crypto-execution/exchanges/binance-adapter";
import { checkBybitPermissions } from "@/lib/crypto-execution/exchanges/bybit-adapter";
import type { ExchangePermissionAdapter } from "@/lib/crypto-execution/exchanges/types";
import type { CryptoExchangeId } from "@/types/crypto-execution";

export function getExchangePermissionAdapter(exchange: CryptoExchangeId): ExchangePermissionAdapter {
  return exchange === "bybit" ? checkBybitPermissions : checkBinancePermissions;
}

export type {
  ExchangePermissionAdapter,
  ExchangePermissionCheckInput,
  ExchangePermissionCheckResult
} from "@/lib/crypto-execution/exchanges/types";
