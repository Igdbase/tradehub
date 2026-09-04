import "server-only";

import crypto from "node:crypto";
import {
  canonicalSignalPair,
  isSupportedCryptoSpotSymbol,
  isSupportedForexDemoProofSymbol,
  isSupportedForexPair
} from "@/lib/workspace/signal-symbols";
import type {
  ExternalSignalAssetClass,
  ExternalSignalIngestionReadiness,
  ExternalSignalManualMockParseInput,
  ExternalSignalNormalizedCandidate,
  ExternalSignalParserMode,
  ExternalSignalRiskFlag,
  ExternalSignalSourceType
} from "@/types/external-signal-ingestion";

export const EXTERNAL_SIGNAL_PARSER_VERSION = "stage24b_manual_mock_v1";
export const EXTERNAL_SIGNAL_MAX_TAKE_PROFITS = 5;

export const EXTERNAL_SIGNAL_SOURCE_TYPES: ExternalSignalSourceType[] = [
  "manual_admin_seed",
  "telegram_channel",
  "webhook_source",
  "master_trader_feed"
];

export const EXTERNAL_SIGNAL_PARSER_MODES: ExternalSignalParserMode[] = [
  "manual_mock",
  "telegram_like_mock",
  "disabled"
];

export const EXTERNAL_SIGNAL_ALLOWED_ASSET_CLASSES: ExternalSignalAssetClass[] = [
  "crypto",
  "forex",
  "cfd",
  "other"
];

const PROVIDER_LABELS = {
  disabled: "Disabled",
  contract_only: "Contract only"
} as const;

function readBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();

  if (!raw) {
    return fallback;
  }

  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function readProviderEnv() {
  return process.env.EXTERNAL_SIGNAL_INGESTION_PROVIDER?.trim().toLowerCase() === "contract_only"
    ? "contract_only" as const
    : "disabled" as const;
}

function firstFailClosedReason({
  enabled,
  dryRun,
  provider,
  sourcesEnabled
}: {
  enabled: boolean;
  dryRun: boolean;
  provider: "disabled" | "contract_only";
  sourcesEnabled: boolean;
}) {
  if (!enabled) {
    return "external_signal_ingestion_disabled";
  }

  if (provider === "disabled") {
    return "external_signal_provider_disabled";
  }

  if (!dryRun) {
    return "external_signal_real_ingestion_blocked_stage24a";
  }

  if (!sourcesEnabled) {
    return "external_signal_sources_disabled";
  }

  return "external_signal_contract_only";
}

export function getExternalSignalIngestionReadiness(): ExternalSignalIngestionReadiness {
  const enabled = readBooleanEnv("EXTERNAL_SIGNAL_INGESTION_ENABLED", false);
  const dryRun = readBooleanEnv("EXTERNAL_SIGNAL_INGESTION_DRY_RUN", true);
  const provider = readProviderEnv();
  const sourcesEnabled = readBooleanEnv("EXTERNAL_SIGNAL_SOURCE_ALLOWLIST_ENABLED", false);
  const failClosedReason = firstFailClosedReason({
    enabled,
    dryRun,
    provider,
    sourcesEnabled
  });

  return {
    enabled,
    dryRun,
    provider,
    providerLabel: PROVIDER_LABELS[provider],
    externalFetchAvailable: false,
    webhookIngestionAvailable: false,
    failClosedReason,
    safeMessage:
      "Stage 24A is contract-only. External Telegram, webhook, and master-trader feed ingestion is disabled and cannot trigger AutoCopy or live execution."
  };
}

export function createExternalSignalSafeRef(value: string, prefix: string) {
  const digest = crypto.createHash("sha256").update(value.trim()).digest("hex").slice(0, 12);

  return `${prefix}_${digest}`;
}

export function createExternalSignalFingerprint(input: {
  sourceRef: string;
  symbol: string;
  side: string;
  entryMin: string;
  entryMax?: string;
  stopLoss?: string;
  takeProfits?: string[];
}) {
  const source = [
    input.sourceRef.trim().toLowerCase(),
    canonicalSignalPair(input.symbol),
    input.side.trim().toLowerCase(),
    input.entryMin.trim(),
    input.entryMax?.trim() ?? "",
    input.stopLoss?.trim() ?? "",
    ...(input.takeProfits ?? []).map((entry) => entry.trim())
  ].join("|");

  return createExternalSignalSafeRef(source, "extsig");
}

function isSupportedSymbol(symbol: string, assetClass: ExternalSignalAssetClass) {
  if (assetClass === "crypto") {
    return isSupportedCryptoSpotSymbol(symbol);
  }

  if (assetClass === "forex") {
    return isSupportedForexPair(symbol);
  }

  if (assetClass === "cfd") {
    return isSupportedForexDemoProofSymbol(symbol);
  }

  return false;
}

function isSupportedAssetClass(assetClass: ExternalSignalAssetClass) {
  return assetClass === "crypto" || assetClass === "forex" || assetClass === "cfd";
}

function boundedPrice(value: string) {
  const trimmed = value.trim();
  const numeric = Number(trimmed);

  if (!trimmed || !Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return trimmed.slice(0, 32);
}

function hasSuspiciousTextPattern(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /\b(guaranteed|risk[-\s]?free|100%|double your|send funds|dm me|whatsapp|telegram|http)\b/i.test(value);
}

export function parseManualMockExternalSignalCandidate(input: ExternalSignalManualMockParseInput): {
  normalized?: ExternalSignalNormalizedCandidate;
  parseWarnings: string[];
  riskFlags: ExternalSignalRiskFlag[];
  status: "parsed" | "rejected" | "quarantined" | "needs_review";
  safeReason: string;
} {
  const parseWarnings: string[] = [];
  const riskFlags: ExternalSignalRiskFlag[] = [];
  const symbol = canonicalSignalPair(input.symbol);
  const rawTakeProfits = input.takeProfits ?? [];
  const entryMin = boundedPrice(input.entryMin);
  const entryMax = input.entryMax ? boundedPrice(input.entryMax) : undefined;
  const stopLoss = input.stopLoss ? boundedPrice(input.stopLoss) : undefined;
  const takeProfits = rawTakeProfits.map(boundedPrice).filter(Boolean).slice(0, EXTERNAL_SIGNAL_MAX_TAKE_PROFITS) as string[];

  if (!isSupportedAssetClass(input.assetClass)) {
    return {
      parseWarnings: ["unsupported_asset_class"],
      riskFlags: ["unsupported_asset_class"],
      status: "rejected",
      safeReason: "external_signal_asset_class_not_allowed"
    };
  }

  if (!isSupportedSymbol(symbol, input.assetClass)) {
    return {
      parseWarnings: ["unsupported_symbol"],
      riskFlags: ["unsupported_symbol"],
      status: "rejected",
      safeReason: "external_signal_symbol_not_allowed"
    };
  }

  if (input.side !== "buy" && input.side !== "sell") {
    return {
      parseWarnings: ["unsupported_side"],
      riskFlags: [],
      status: "rejected",
      safeReason: "external_signal_side_not_allowed"
    };
  }

  if (!entryMin) {
    return {
      parseWarnings: ["entry_missing_or_invalid"],
      riskFlags: ["missing_or_invalid_entry"],
      status: "quarantined",
      safeReason: "external_signal_entry_invalid"
    };
  }

  if (!stopLoss) {
    parseWarnings.push("stop_loss_missing");
    riskFlags.push("missing_stop_loss");
  }

  if (takeProfits.length === 0) {
    parseWarnings.push("take_profit_missing");
    riskFlags.push("missing_take_profit");
  }

  if (rawTakeProfits.length > EXTERNAL_SIGNAL_MAX_TAKE_PROFITS) {
    parseWarnings.push("too_many_take_profits");
    riskFlags.push("too_many_take_profits");
  }

  if (hasSuspiciousTextPattern(input.safeTextHint)) {
    parseWarnings.push("suspicious_text_pattern");
    riskFlags.push("suspicious_text_pattern");
  }

  return {
    normalized: {
      symbol,
      assetClass: input.assetClass,
      side: input.side,
      entryRange: {
        min: entryMin,
        max: entryMax ?? undefined
      },
      stopLoss: stopLoss ?? undefined,
      takeProfits,
      confidence: input.confidence ?? "unknown"
    },
    parseWarnings,
    riskFlags,
    status: riskFlags.length > 0 ? "needs_review" : "parsed",
    safeReason: parseWarnings.length > 0 ? "external_signal_needs_review" : "external_signal_parsed_mock"
  };
}
