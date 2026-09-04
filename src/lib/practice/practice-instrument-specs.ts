import type {
  PracticeAssetClass,
  PracticeInstrumentSpecSummary
} from "@/types/practice";
import { APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS } from "@/lib/practice/practice-crypto-spot-allowlist";

const PRACTICE_INSTRUMENT_SAFE_MESSAGE =
  "Practice instrument specs are bounded simulation estimates and may differ from the student's broker or exchange.";

const EXPANDED_CRYPTO_SPOT_SPECS: Record<string, PracticeInstrumentSpecSummary> = Object.fromEntries(
  APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.map((asset): [string, PracticeInstrumentSpecSummary] => [asset.symbol, {
    canonicalSymbol: asset.symbol,
    assetClass: "crypto",
    displayName: asset.displayName,
    category: "crypto_spot",
    pricePrecision: 8,
    quantityPrecision: 8,
    quantityStep: 0.00000001,
    quantityLabel: "Qty",
    tickSize: 0.00000001,
    pipSize: 0.00000001,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.00000001,
    maxSimulatedSize: 1_000_000,
    minSimulatedNotional: 1,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  }])
);

const FOREX_CROSS_SYMBOLS = [
  "EURGBP", "EURJPY", "EURCHF", "EURCAD", "EURAUD", "EURNZD",
  "GBPJPY", "GBPCHF", "GBPCAD", "GBPAUD", "GBPNZD",
  "AUDJPY", "AUDNZD", "AUDCAD", "AUDCHF",
  "NZDJPY", "NZDCAD", "NZDCHF", "CADJPY", "CADCHF", "CHFJPY",
  "USDCNH", "USDHKD", "USDSGD", "USDSEK", "USDNOK", "USDDKK", "USDPLN",
  "USDMXN", "USDZAR", "USDTRY", "EURSEK", "EURNOK", "EURPLN", "GBPSEK"
] as const;

const FOREX_CROSS_NAMES: Record<typeof FOREX_CROSS_SYMBOLS[number], string> = {
  EURGBP: "Euro / British Pound", EURJPY: "Euro / Japanese Yen", EURCHF: "Euro / Swiss Franc",
  EURCAD: "Euro / Canadian Dollar", EURAUD: "Euro / Australian Dollar", EURNZD: "Euro / New Zealand Dollar",
  GBPJPY: "British Pound / Japanese Yen", GBPCHF: "British Pound / Swiss Franc",
  GBPCAD: "British Pound / Canadian Dollar", GBPAUD: "British Pound / Australian Dollar",
  GBPNZD: "British Pound / New Zealand Dollar", AUDJPY: "Australian Dollar / Japanese Yen",
  AUDNZD: "Australian Dollar / New Zealand Dollar", AUDCAD: "Australian Dollar / Canadian Dollar",
  AUDCHF: "Australian Dollar / Swiss Franc", NZDJPY: "New Zealand Dollar / Japanese Yen",
  NZDCAD: "New Zealand Dollar / Canadian Dollar", NZDCHF: "New Zealand Dollar / Swiss Franc",
  CADJPY: "Canadian Dollar / Japanese Yen", CADCHF: "Canadian Dollar / Swiss Franc",
  CHFJPY: "Swiss Franc / Japanese Yen", USDCNH: "US Dollar / Offshore Chinese Yuan",
  USDHKD: "US Dollar / Hong Kong Dollar", USDSGD: "US Dollar / Singapore Dollar",
  USDSEK: "US Dollar / Swedish Krona", USDNOK: "US Dollar / Norwegian Krone",
  USDDKK: "US Dollar / Danish Krone", USDPLN: "US Dollar / Polish Zloty",
  USDMXN: "US Dollar / Mexican Peso", USDZAR: "US Dollar / South African Rand",
  USDTRY: "US Dollar / Turkish Lira", EURSEK: "Euro / Swedish Krona",
  EURNOK: "Euro / Norwegian Krone", EURPLN: "Euro / Polish Zloty",
  GBPSEK: "British Pound / Swedish Krona"
};

const EXPANDED_FOREX_CFD_SPECS: Record<string, PracticeInstrumentSpecSummary> = Object.fromEntries([
  ...FOREX_CROSS_SYMBOLS.map((symbol): [string, PracticeInstrumentSpecSummary] => {
    const isJpy = symbol.endsWith("JPY");

    return [symbol, {
      canonicalSymbol: symbol,
      assetClass: "forex_cfd",
      displayName: FOREX_CROSS_NAMES[symbol],
      category: "forex_cross",
      pricePrecision: isJpy ? 3 : 5,
      quantityPrecision: 2,
      quantityStep: 0.01,
      quantityLabel: "Lots",
      tickSize: isJpy ? 0.001 : 0.00001,
      pipSize: isJpy ? 0.01 : 0.0001,
      pipLabel: "pip",
      contractMultiplier: 100_000,
      minSimulatedSize: 0.01,
      maxSimulatedSize: 100,
      maxSimulatedNotional: 10_000_000,
      safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
    }];
  }),
  ["XAGUSD", {
    canonicalSymbol: "XAGUSD", assetClass: "forex_cfd", displayName: "Silver CFD", category: "metals_cfd",
    pricePrecision: 3, quantityPrecision: 2, quantityStep: 0.01, quantityLabel: "Lots", tickSize: 0.001, pipSize: 0.001, pipLabel: "tick",
    contractMultiplier: 5_000, minSimulatedSize: 0.01, maxSimulatedSize: 50,
    maxSimulatedNotional: 10_000_000, safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  }],
  ...[
    ["US30", "US Wall Street 30", 1], ["US500", "US 500", 2], ["SPX500", "US 500", 2],
    ["NAS100", "US Tech 100", 1], ["GER40", "Germany 40", 1], ["UK100", "UK 100", 1],
    ["JP225", "Japan 225", 1], ["JPN225", "Japan 225", 1]
  ].map(([symbol, displayName, precision]): [string, PracticeInstrumentSpecSummary] => [String(symbol), {
    canonicalSymbol: String(symbol), assetClass: "forex_cfd", displayName: String(displayName), category: "indices_cfd",
    pricePrecision: Number(precision), quantityPrecision: 2, quantityStep: 0.01, quantityLabel: "Lots",
    tickSize: Number(precision) === 2 ? 0.01 : 0.1, pipSize: Number(precision) === 2 ? 0.01 : 0.1,
    pipLabel: "tick", contractMultiplier: 1, minSimulatedSize: 0.01, maxSimulatedSize: 1_000,
    maxSimulatedNotional: 10_000_000, safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  }]),
  ...[["USOIL", "US Crude Oil"], ["UKOIL", "Brent Crude Oil"], ["NATGAS", "Natural Gas"]]
    .map(([symbol, displayName]): [string, PracticeInstrumentSpecSummary] => [symbol, {
      canonicalSymbol: symbol, assetClass: "forex_cfd", displayName, category: "energy_cfd",
      pricePrecision: 3, quantityPrecision: 2, quantityStep: 0.01, quantityLabel: "Lots", tickSize: 0.001, pipSize: 0.01, pipLabel: "tick",
      contractMultiplier: symbol === "NATGAS" ? 10_000 : 1_000, minSimulatedSize: 0.01, maxSimulatedSize: 100,
      maxSimulatedNotional: 10_000_000, safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
    }])
]);

export const PRACTICE_INSTRUMENT_SPECS: Record<string, PracticeInstrumentSpecSummary> = {
  ...EXPANDED_CRYPTO_SPOT_SPECS,
  BTCUSDT: {
    canonicalSymbol: "BTCUSDT",
    assetClass: "crypto",
    displayName: "Bitcoin / Tether",
    category: "crypto_spot",
    pricePrecision: 2,
    quantityPrecision: 6,
    quantityStep: 0.000001,
    quantityLabel: "Qty",
    tickSize: 0.01,
    pipSize: 0.01,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.000001,
    maxSimulatedSize: 100,
    minSimulatedNotional: 5,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  ETHUSDT: {
    canonicalSymbol: "ETHUSDT",
    assetClass: "crypto",
    displayName: "Ethereum / Tether",
    category: "crypto_spot",
    pricePrecision: 2,
    quantityPrecision: 5,
    quantityStep: 0.00001,
    quantityLabel: "Qty",
    tickSize: 0.01,
    pipSize: 0.01,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.00001,
    maxSimulatedSize: 1_000,
    minSimulatedNotional: 5,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  BNBUSDT: {
    canonicalSymbol: "BNBUSDT",
    assetClass: "crypto",
    displayName: "BNB / Tether",
    category: "crypto_spot",
    pricePrecision: 2,
    quantityPrecision: 4,
    quantityStep: 0.0001,
    quantityLabel: "Qty",
    tickSize: 0.01,
    pipSize: 0.01,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.0001,
    maxSimulatedSize: 10_000,
    minSimulatedNotional: 5,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  SOLUSDT: {
    canonicalSymbol: "SOLUSDT",
    assetClass: "crypto",
    displayName: "Solana / Tether",
    category: "crypto_spot",
    pricePrecision: 3,
    quantityPrecision: 3,
    quantityStep: 0.001,
    quantityLabel: "Qty",
    tickSize: 0.001,
    pipSize: 0.001,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.001,
    maxSimulatedSize: 100_000,
    minSimulatedNotional: 5,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  XRPUSDT: {
    canonicalSymbol: "XRPUSDT",
    assetClass: "crypto",
    displayName: "XRP / Tether",
    category: "crypto_spot",
    pricePrecision: 5,
    quantityPrecision: 1,
    quantityStep: 0.1,
    quantityLabel: "Qty",
    tickSize: 0.00001,
    pipSize: 0.00001,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.1,
    maxSimulatedSize: 10_000_000,
    minSimulatedNotional: 5,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  XAUUSD: {
    canonicalSymbol: "XAUUSD",
    assetClass: "forex_cfd",
    displayName: "Gold CFD",
    category: "metals_cfd",
    pricePrecision: 2,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.01,
    pipLabel: "tick",
    contractMultiplier: 100,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 50,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  EURUSD: {
    canonicalSymbol: "EURUSD",
    assetClass: "forex_cfd",
    displayName: "Euro / US Dollar",
    category: "forex_major",
    pricePrecision: 5,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.0001,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  GBPUSD: {
    canonicalSymbol: "GBPUSD",
    assetClass: "forex_cfd",
    displayName: "British Pound / US Dollar",
    category: "forex_major",
    pricePrecision: 5,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.0001,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  USDJPY: {
    canonicalSymbol: "USDJPY",
    assetClass: "forex_cfd",
    displayName: "US Dollar / Japanese Yen",
    category: "forex_major",
    pricePrecision: 3,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.01,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  USDCHF: {
    canonicalSymbol: "USDCHF",
    assetClass: "forex_cfd",
    displayName: "US Dollar / Swiss Franc",
    category: "forex_major",
    pricePrecision: 5,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.0001,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  USDCAD: {
    canonicalSymbol: "USDCAD",
    assetClass: "forex_cfd",
    displayName: "US Dollar / Canadian Dollar",
    category: "forex_major",
    pricePrecision: 5,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.0001,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  AUDUSD: {
    canonicalSymbol: "AUDUSD",
    assetClass: "forex_cfd",
    displayName: "Australian Dollar / US Dollar",
    category: "forex_major",
    pricePrecision: 5,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.0001,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  NZDUSD: {
    canonicalSymbol: "NZDUSD",
    assetClass: "forex_cfd",
    displayName: "New Zealand Dollar / US Dollar",
    category: "forex_major",
    pricePrecision: 5,
    quantityPrecision: 2,
    quantityStep: 0.01,
    quantityLabel: "Lots",
    pipSize: 0.0001,
    pipLabel: "pip",
    contractMultiplier: 100_000,
    minSimulatedSize: 0.01,
    maxSimulatedSize: 100,
    maxSimulatedNotional: 10_000_000,
    safeMessage: PRACTICE_INSTRUMENT_SAFE_MESSAGE
  },
  ...EXPANDED_FOREX_CFD_SPECS
};

export function normalizePracticeInstrumentSymbol(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getPracticeInstrumentSpec(
  assetClass: PracticeAssetClass,
  symbol: string
): PracticeInstrumentSpecSummary | undefined {
  const spec = PRACTICE_INSTRUMENT_SPECS[normalizePracticeInstrumentSymbol(symbol)];

  if (!spec || spec.assetClass !== assetClass) {
    return undefined;
  }

  return spec;
}

export function requirePracticeInstrumentSpec(
  assetClass: PracticeAssetClass,
  symbol: string
): PracticeInstrumentSpecSummary {
  const spec = getPracticeInstrumentSpec(assetClass, symbol);

  if (!spec) {
    throw new Error(`Unsupported practice instrument spec: ${assetClass}:${symbol}`);
  }

  return spec;
}

export function roundPracticeMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function roundPracticePrice(value: number, spec?: PracticeInstrumentSpecSummary) {
  const precision = Math.max(0, Math.min(spec?.pricePrecision ?? 2, 8));
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

export function roundPracticeQuantity(value: number, spec?: PracticeInstrumentSpecSummary) {
  const precision = Math.max(0, Math.min(spec?.quantityPrecision ?? 8, 8));
  const factor = 10 ** precision;
  const stepUnits = practiceQuantityStepUnits(spec);

  return Math.round(value * factor / stepUnits) * stepUnits / factor;
}

export function practiceQuantityStepUnits(spec?: PracticeInstrumentSpecSummary) {
  const precision = Math.max(0, Math.min(spec?.quantityPrecision ?? 8, 8));
  const factor = 10 ** precision;
  const rawStep = spec?.quantityStep ?? 1 / factor;

  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  return Math.max(1, Math.round(rawStep * factor));
}

export function quantizePracticeQuantityDown(value: number, spec?: PracticeInstrumentSpecSummary) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const precision = Math.max(0, Math.min(spec?.quantityPrecision ?? 8, 8));
  const factor = 10 ** precision;
  const stepUnits = practiceQuantityStepUnits(spec);
  const valueUnits = Math.floor(value * factor + 0.000001);

  return Math.floor(valueUnits / stepUnits) * stepUnits / factor;
}

export function practiceQuantityAlignsWithStep(value: number, spec?: PracticeInstrumentSpecSummary) {
  if (!Number.isFinite(value) || value < 0) {
    return false;
  }

  const precision = Math.max(0, Math.min(spec?.quantityPrecision ?? 8, 8));
  const factor = 10 ** precision;
  const valueUnits = Math.round(value * factor);

  return Math.abs(value * factor - valueUnits) < 0.000001 &&
    valueUnits % practiceQuantityStepUnits(spec) === 0;
}

export function practiceQuantityStepCount(value: number, spec?: PracticeInstrumentSpecSummary) {
  const precision = Math.max(0, Math.min(spec?.quantityPrecision ?? 8, 8));
  const factor = 10 ** precision;
  const stepUnits = practiceQuantityStepUnits(spec);

  return Math.round(value * factor) / stepUnits;
}

export function practiceQuantityFromStepCount(stepCount: number, spec?: PracticeInstrumentSpecSummary) {
  const precision = Math.max(0, Math.min(spec?.quantityPrecision ?? 8, 8));
  const factor = 10 ** precision;
  const stepUnits = practiceQuantityStepUnits(spec);

  return Math.round(stepCount) * stepUnits / factor;
}

export function practiceNotionalForInstrument(
  spec: PracticeInstrumentSpecSummary | undefined,
  price: number,
  quantity: number
) {
  const multiplier = spec?.contractMultiplier ?? 1;

  return roundPracticeMoney(price * quantity * multiplier);
}

export function practicePnlForInstrument(input: {
  spec?: PracticeInstrumentSpecSummary;
  direction: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
}) {
  const multiplier = input.spec?.contractMultiplier ?? 1;
  const raw = input.direction === "buy"
    ? (input.exitPrice - input.entryPrice) * input.quantity * multiplier
    : (input.entryPrice - input.exitPrice) * input.quantity * multiplier;

  return roundPracticeMoney(raw);
}

export function practicePriceDistance(input: {
  spec?: PracticeInstrumentSpecSummary;
  firstPrice: number;
  secondPrice: number;
}) {
  return Math.abs(input.firstPrice - input.secondPrice);
}

export function practicePipDistance(input: {
  spec?: PracticeInstrumentSpecSummary;
  firstPrice: number;
  secondPrice: number;
}) {
  const pipSize = input.spec?.pipSize ?? 0.01;

  if (!Number.isFinite(pipSize) || pipSize <= 0) {
    return 0;
  }

  return Math.round((practicePriceDistance(input) / pipSize) * 100) / 100;
}

export function formatPracticePrice(value: number | undefined, spec?: PracticeInstrumentSpecSummary) {
  if (value === undefined || !Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: spec?.pricePrecision ?? 2,
    maximumFractionDigits: spec?.pricePrecision ?? 2
  });
}

export function formatPracticeQuantity(value: number | undefined, spec?: PracticeInstrumentSpecSummary) {
  if (value === undefined || !Number.isFinite(value)) {
    return "0";
  }

  const precision = spec?.quantityPrecision ?? 6;

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision
  });
}

export function formatPracticeMoney(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}
