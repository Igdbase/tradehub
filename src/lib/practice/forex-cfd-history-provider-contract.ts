import "server-only";

import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  HistoricalCandleRequest,
  NormalizedCandle,
  PracticeAssetCatalogueCategory,
  PracticeInstrumentCategory
} from "@/types/practice";

export type ForexCfdHistoryProviderId = "disabled" | "tradehub_static_demo" | "metaapi_utility";

export interface ForexCfdHistoryProviderReadiness {
  configured: boolean;
  provider: ForexCfdHistoryProviderId;
  providerLabel: string;
  realHistoryEnabled: boolean;
  dryRun: boolean;
  vaultReady: boolean;
  supportedSymbols: string[];
  supportedTimeframes: number[];
  failClosedReason?: string;
  safeMessage: string;
}

export interface ForexCfdHistoricalProviderContract {
  id: ForexCfdHistoryProviderId;
  label: string;
  mode: "disabled" | "static_demo" | "real_provider";
  supports(input: HistoricalCandleRequest): boolean;
  readiness(): ForexCfdHistoryProviderReadiness;
  fetchCandles(input: HistoricalCandleRequest & { providerSymbol: string }): Promise<NormalizedCandle[]>;
}

export type ApprovedForexCfdInstrument = {
  symbol: string;
  displayName: string;
  category: PracticeAssetCatalogueCategory;
  instrumentCategory: PracticeInstrumentCategory;
  aliases: string[];
};

export const FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  "EURGBP",
  "EURJPY",
  "EURCHF",
  "EURCAD",
  "EURAUD",
  "EURNZD",
  "GBPJPY",
  "GBPCHF",
  "GBPCAD",
  "GBPAUD",
  "GBPNZD",
  "AUDJPY",
  "AUDNZD",
  "AUDCAD",
  "AUDCHF",
  "NZDJPY",
  "NZDCAD",
  "NZDCHF",
  "CADJPY",
  "CADCHF",
  "CHFJPY",
  "USDCNH",
  "USDHKD",
  "USDSGD",
  "USDSEK",
  "USDNOK",
  "USDDKK",
  "USDPLN",
  "USDMXN",
  "USDZAR",
  "USDTRY",
  "EURSEK",
  "EURNOK",
  "EURPLN",
  "GBPSEK",
  "XAUUSD",
  "XAGUSD",
  "US30",
  "US500",
  "SPX500",
  "NAS100",
  "GER40",
  "UK100",
  "JP225",
  "JPN225",
  "USOIL",
  "UKOIL",
  "NATGAS"
] as const;

const FOREX_MAJORS = new Set(["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD"]);

const DISPLAY_NAMES: Record<string, string> = {
  EURUSD: "Euro / US Dollar",
  GBPUSD: "British Pound / US Dollar",
  USDJPY: "US Dollar / Japanese Yen",
  USDCHF: "US Dollar / Swiss Franc",
  USDCAD: "US Dollar / Canadian Dollar",
  AUDUSD: "Australian Dollar / US Dollar",
  NZDUSD: "New Zealand Dollar / US Dollar",
  EURGBP: "Euro / British Pound",
  EURJPY: "Euro / Japanese Yen",
  EURCHF: "Euro / Swiss Franc",
  EURCAD: "Euro / Canadian Dollar",
  EURAUD: "Euro / Australian Dollar",
  EURNZD: "Euro / New Zealand Dollar",
  GBPJPY: "British Pound / Japanese Yen",
  GBPCHF: "British Pound / Swiss Franc",
  GBPCAD: "British Pound / Canadian Dollar",
  GBPAUD: "British Pound / Australian Dollar",
  GBPNZD: "British Pound / New Zealand Dollar",
  AUDJPY: "Australian Dollar / Japanese Yen",
  AUDNZD: "Australian Dollar / New Zealand Dollar",
  AUDCAD: "Australian Dollar / Canadian Dollar",
  AUDCHF: "Australian Dollar / Swiss Franc",
  NZDJPY: "New Zealand Dollar / Japanese Yen",
  NZDCAD: "New Zealand Dollar / Canadian Dollar",
  NZDCHF: "New Zealand Dollar / Swiss Franc",
  CADJPY: "Canadian Dollar / Japanese Yen",
  CADCHF: "Canadian Dollar / Swiss Franc",
  CHFJPY: "Swiss Franc / Japanese Yen",
  USDCNH: "US Dollar / Offshore Chinese Yuan",
  USDHKD: "US Dollar / Hong Kong Dollar",
  USDSGD: "US Dollar / Singapore Dollar",
  USDSEK: "US Dollar / Swedish Krona",
  USDNOK: "US Dollar / Norwegian Krone",
  USDDKK: "US Dollar / Danish Krone",
  USDPLN: "US Dollar / Polish Zloty",
  USDMXN: "US Dollar / Mexican Peso",
  USDZAR: "US Dollar / South African Rand",
  USDTRY: "US Dollar / Turkish Lira",
  EURSEK: "Euro / Swedish Krona",
  EURNOK: "Euro / Norwegian Krone",
  EURPLN: "Euro / Polish Zloty",
  GBPSEK: "British Pound / Swedish Krona",
  XAUUSD: "Gold / US Dollar",
  XAGUSD: "Silver / US Dollar",
  US30: "US Wall Street 30",
  US500: "US 500",
  SPX500: "US 500",
  NAS100: "US Tech 100",
  GER40: "Germany 40",
  UK100: "UK 100",
  JP225: "Japan 225",
  JPN225: "Japan 225",
  USOIL: "US Crude Oil",
  UKOIL: "Brent Crude Oil",
  NATGAS: "Natural Gas"
};

const PROVIDER_ALIASES: Record<string, string[]> = {
  US30: ["US30", "DJ30", "WS30", "WALLSTREET30"],
  US500: ["US500", "SPX500", "SP500"],
  SPX500: ["SPX500", "US500", "SP500"],
  NAS100: ["NAS100", "USTEC", "US100", "NDX100"],
  GER40: ["GER40", "DE40", "DAX40", "GERMANY40"],
  UK100: ["UK100", "FTSE100"],
  JP225: ["JP225", "JPN225", "NIKKEI225"],
  JPN225: ["JPN225", "JP225", "NIKKEI225"],
  USOIL: ["USOIL", "XTIUSD", "WTI", "WTICOUSD"],
  UKOIL: ["UKOIL", "XBRUSD", "BRENT", "BCOUSD"],
  NATGAS: ["NATGAS", "XNGUSD", "NGAS", "NATURALGAS"]
};

function approvedCategory(symbol: string): Pick<ApprovedForexCfdInstrument, "category" | "instrumentCategory"> {
  if (symbol === "XAUUSD" || symbol === "XAGUSD") {
    return { category: "metals", instrumentCategory: "metals_cfd" };
  }

  if (["US30", "US500", "SPX500", "NAS100", "GER40", "UK100", "JP225", "JPN225"].includes(symbol)) {
    return { category: "indices", instrumentCategory: "indices_cfd" };
  }

  if (symbol === "USOIL" || symbol === "UKOIL" || symbol === "NATGAS") {
    return { category: "energies", instrumentCategory: "energy_cfd" };
  }

  return {
    category: "forex",
    instrumentCategory: FOREX_MAJORS.has(symbol) ? "forex_major" : "forex_cross"
  };
}

export const FOREX_CFD_APPROVED_INSTRUMENTS: ApprovedForexCfdInstrument[] =
  FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS.map((symbol) => ({
    symbol,
    displayName: DISPLAY_NAMES[symbol] ?? symbol,
    ...approvedCategory(symbol),
    aliases: PROVIDER_ALIASES[symbol] ?? [symbol]
  }));

export const FOREX_CFD_HISTORY_SUPPORTED_TIMEFRAMES = [15, 60, 240, 1440] as const;

const SAFE_PROVIDER_LABELS: Record<ForexCfdHistoryProviderId, string> = {
  disabled: "Disabled",
  tradehub_static_demo: "TradeHub static demo",
  metaapi_utility: "Platform Forex/CFD utility provider"
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSymbol(value: unknown) {
  return safeString(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

export function safeForexCfdProviderSymbol(value: unknown) {
  return safeString(value).toUpperCase().replace(/[^A-Z0-9._-]/g, "").slice(0, 32);
}

export function forexCfdProviderSymbolMatchesCanonical(providerSymbol: string, canonicalSymbol: string) {
  const provider = safeForexCfdProviderSymbol(providerSymbol);
  const canonical = normalizeSymbol(canonicalSymbol);
  const approved = FOREX_CFD_APPROVED_INSTRUMENTS.find((instrument) => instrument.symbol === canonical);

  return (approved?.aliases ?? [canonical]).some((alias) => {
    const normalizedAlias = safeForexCfdProviderSymbol(alias);

    if (provider === normalizedAlias) {
      return true;
    }

    if (!provider.startsWith(normalizedAlias)) {
      return false;
    }

    const suffix = provider.slice(normalizedAlias.length);

    return suffix.length <= 8 && /^[A-Z0-9._-]*$/.test(suffix);
  });
}

export function canonicalForexCfdSymbolForProviderSymbol(providerSymbol: string) {
  return FOREX_CFD_APPROVED_INSTRUMENTS.find((instrument) =>
    forexCfdProviderSymbolMatchesCanonical(providerSymbol, instrument.symbol)
  )?.symbol;
}

function parseProviderId(value: unknown): ForexCfdHistoryProviderId {
  const provider = safeString(value) || "disabled";

  if (provider === "tradehub_static_demo" || provider === "metaapi_utility") {
    return provider;
  }

  return "disabled";
}

function parseProviderSymbolMap(): Map<string, string> {
  const entries: Array<[string, string]> = safeString(process.env.PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry): [string, string] => {
      const [canonical, provider] = entry.split(":");

      return [normalizeSymbol(canonical), safeForexCfdProviderSymbol(provider)];
    })
    .filter(([canonical, provider]) =>
      Boolean(canonical && provider && forexCfdProviderSymbolMatchesCanonical(provider, canonical))
    );

  return new Map(entries);
}

export function resolveForexCfdHistoryProviderSymbol(canonicalSymbol: string) {
  const canonical = normalizeSymbol(canonicalSymbol);

  if (!FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS.includes(canonical as typeof FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS[number])) {
    throw new AdminApiError(400, "practice_forex_cfd_symbol_unsupported", "Choose an available Forex, metals, index, or energy instrument for practice historical data.");
  }

  return parseProviderSymbolMap().get(canonical) ?? canonical;
}

function secretManagerProjectId() {
  return (
    safeString(process.env.PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID) ||
    safeString(process.env.GOOGLE_CLOUD_PROJECT) ||
    safeString(process.env.GCLOUD_PROJECT)
  );
}

function historyVaultReady() {
  return process.env.PRACTICE_FOREX_CFD_HISTORY_VAULT_READY === "true" &&
    Boolean(secretManagerProjectId()) &&
    Boolean(safeString(process.env.PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME));
}

export function getForexCfdHistoryProviderReadiness(): ForexCfdHistoryProviderReadiness {
  const provider = parseProviderId(process.env.PRACTICE_FOREX_CFD_HISTORY_PROVIDER);
  const realHistoryEnabled = process.env.PRACTICE_FOREX_CFD_REAL_HISTORY_ENABLED === "true";
  const dryRun = process.env.PRACTICE_FOREX_CFD_HISTORY_DRY_RUN !== "false";
  const vaultReady = historyVaultReady();
  let failClosedReason: string | undefined;

  if (provider === "disabled") {
    failClosedReason = "real_forex_cfd_history_provider_disabled";
  } else if (provider === "tradehub_static_demo") {
    failClosedReason = undefined;
  } else if (!realHistoryEnabled) {
    failClosedReason = "real_forex_cfd_history_env_disabled";
  } else if (!vaultReady) {
    failClosedReason = "real_forex_cfd_history_vault_unavailable";
  } else if (dryRun) {
    failClosedReason = "real_forex_cfd_history_dry_run";
  } else {
    failClosedReason = undefined;
  }

  return {
    configured: provider !== "disabled" && !failClosedReason,
    provider,
    providerLabel: SAFE_PROVIDER_LABELS[provider],
    realHistoryEnabled,
    dryRun,
    vaultReady,
    supportedSymbols: [...FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS],
    supportedTimeframes: [...FOREX_CFD_HISTORY_SUPPORTED_TIMEFRAMES],
    failClosedReason,
    safeMessage: provider === "tradehub_static_demo"
      ? "Forex/CFD practice history is using TradeHub static demo candles. This is not a real provider feed."
      : failClosedReason
      ? "Real Forex/CFD practice history is platform-managed and remains fail-closed until env, vault, and provider gates pass."
      : "Real Forex/CFD practice history is configured through platform-managed server credentials. Browser responses include normalized candles only."
  };
}

export const FOREX_CFD_HISTORY_ADAPTER_PENDING_REASON = "real_forex_cfd_history_adapter_pending";

export function assertForexCfdRealHistoryReady() {
  const readiness = getForexCfdHistoryProviderReadiness();

  if (readiness.provider !== "metaapi_utility") {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_provider_disabled",
      "Real Forex/CFD historical candles are disabled. Static demo data remains separate and explicit."
    );
  }

  if (!readiness.realHistoryEnabled) {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_real_history_disabled",
      "Real Forex/CFD historical candles are disabled by server configuration."
    );
  }

  if (!readiness.vaultReady) {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_vault_unavailable",
      "Real Forex/CFD historical candles require platform utility provider credentials in the server vault."
    );
  }

  if (readiness.dryRun) {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_dry_run",
      "Real Forex/CFD historical candle fetching is still in dry-run mode."
    );
  }

  return readiness;
}
