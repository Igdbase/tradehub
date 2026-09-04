import type { WorkspaceSignalMarket } from "@/types/workspace-dashboard";

const supportedCryptoSpotSymbols = new Set([
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "BTCUSDC",
  "ETHUSDC",
  "BNBUSDC",
  "SOLUSDC"
]);

const supportedForexPairs = new Set([
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
  "XAUUSD"
]);

const supportedForexDemoCfdSymbols = new Set([
  "BTCUSD",
  "XAUUSD"
]);

export function canonicalSignalPair(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

export function isSupportedCryptoSpotSymbol(pair: string) {
  return supportedCryptoSpotSymbols.has(canonicalSignalPair(pair));
}

export function isSupportedForexPair(pair: string) {
  return supportedForexPairs.has(canonicalSignalPair(pair));
}

export function isSupportedForexDemoCfdSymbol(pair: string) {
  return supportedForexDemoCfdSymbols.has(canonicalSignalPair(pair));
}

export function isSupportedForexDemoProofSymbol(pair: string) {
  const normalized = canonicalSignalPair(pair);

  return isSupportedForexPair(normalized) || isSupportedForexDemoCfdSymbol(normalized);
}

export function normalizeSignalPairForMarket(pair: string, market: WorkspaceSignalMarket) {
  const normalized = canonicalSignalPair(pair);

  if (market === "crypto") {
    return isSupportedCryptoSpotSymbol(normalized) && !isSupportedForexPair(normalized)
      ? normalized
      : null;
  }

  return isSupportedForexPair(normalized) && !isSupportedCryptoSpotSymbol(normalized)
    ? normalized
    : null;
}

export function normalizeSignalPairForForexDemoProof(pair: string) {
  const normalized = canonicalSignalPair(pair);

  return isSupportedForexDemoProofSymbol(normalized) && !isSupportedCryptoSpotSymbol(normalized)
    ? normalized
    : null;
}
