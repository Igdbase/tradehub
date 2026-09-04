import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  normalizeSignalPairForForexDemoProof,
  normalizeSignalPairForMarket
} from "@/lib/workspace/signal-symbols";
import type {
  WorkspaceStudentLifecycleStatus,
  WorkspaceStudentSupportPatchPayload,
  WorkspaceSignalDraftPayload,
  WorkspaceSignalMarket,
  WorkspaceSignalPatchPayload,
  WorkspaceSignalRecord,
  WorkspaceSignalStatus
} from "@/types/workspace-dashboard";

export type WorkspaceListFilters = {
  limit: number;
  cursor?: string;
  q?: string;
};

export type WorkspaceStudentFilters = WorkspaceListFilters & {
  status: "all" | "trial" | "active" | "past_due" | "paused" | "cancelled";
};

export type WorkspaceSignalFilters = WorkspaceListFilters & {
  status: "all" | WorkspaceSignalStatus;
};

const studentStatuses: WorkspaceStudentFilters["status"][] = [
  "all",
  "trial",
  "active",
  "past_due",
  "paused",
  "cancelled"
];
const signalStatuses: WorkspaceSignalFilters["status"][] = [
  "all",
  "draft",
  "published",
  "cancelled"
];
const markets: WorkspaceSignalMarket[] = ["forex", "crypto"];
const directions: WorkspaceSignalRecord["direction"][] = ["buy", "sell"];
const riskLabels: WorkspaceSignalRecord["riskLabel"][] = ["low", "medium", "high"];
const deliveryModes: WorkspaceSignalRecord["deliveryMode"][] = ["manual_review", "alerts_only"];
const lifecycleStatuses: WorkspaceStudentLifecycleStatus[] = [
  "active",
  "pending_onboarding",
  "payment_access_issue",
  "paused",
  "inactive",
  "needs_support"
];
const supportActions: WorkspaceStudentSupportPatchPayload["action"][] = [
  "mark_support_follow_up",
  "clear_support_follow_up",
  "save_support_note",
  "update_operational_status"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeString(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeText(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function normalizeLimit(value: string | null, defaultLimit = 10) {
  const parsed = Number(value ?? "");

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(parsed, 25);
}

export function parseStudentFilters(searchParams: URLSearchParams): WorkspaceStudentFilters {
  const status = searchParams.get("status");

  return {
    status: isOneOf(status, studentStatuses) ? status : "all",
    limit: normalizeLimit(searchParams.get("limit")),
    cursor: sanitizeString(searchParams.get("cursor"), 80) || undefined,
    q: sanitizeString(searchParams.get("q"), 120) || undefined
  };
}

export function parseCourseFilters(searchParams: URLSearchParams): WorkspaceListFilters {
  return {
    limit: normalizeLimit(searchParams.get("limit")),
    cursor: sanitizeString(searchParams.get("cursor"), 80) || undefined,
    q: sanitizeString(searchParams.get("q"), 120) || undefined
  };
}

export function parseSignalFilters(searchParams: URLSearchParams): WorkspaceSignalFilters {
  const status = searchParams.get("status");

  return {
    status: isOneOf(status, signalStatuses) ? status : "all",
    limit: normalizeLimit(searchParams.get("limit")),
    cursor: sanitizeString(searchParams.get("cursor"), 80) || undefined,
    q: sanitizeString(searchParams.get("q"), 120) || undefined
  };
}

function pushField(fields: Record<string, string>, key: string, message: string) {
  if (!fields[key]) {
    fields[key] = message;
  }
}

function throwFields(fields: Record<string, string>) {
  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", "Fix the highlighted signal fields.", fields);
  }
}

function throwSupportFields(fields: Record<string, string>) {
  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", "Fix the highlighted student support fields.", fields);
  }
}

function validatePriceText(value: unknown, key: string, fields: Record<string, string>) {
  const text = sanitizeString(value, 40);

  if (!text) {
    pushField(fields, key, "Enter a value.");
  } else if (!/^[0-9.,\-\s]+$/.test(text)) {
    pushField(fields, key, "Use plain numeric levels or ranges only.");
  }

  return text;
}

function firstNumericLevel(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validatePair(value: unknown, fields: Record<string, string>) {
  const pair = sanitizeString(value, 24).toUpperCase();

  if (!pair) {
    pushField(fields, "pair", "Enter a pair or symbol.");
  } else if (!/^[A-Z0-9/._-]{3,24}$/.test(pair)) {
    pushField(fields, "pair", "Use a plain pair such as EURUSD or BTC/USDC.");
  }

  return pair;
}

function validatePairForMarket(
  pair: string,
  market: WorkspaceSignalMarket | undefined,
  fields: Record<string, string>
) {
  if (!market || !pair) {
    return pair;
  }

  const normalized = market === "forex"
    ? normalizeSignalPairForForexDemoProof(pair)
    : normalizeSignalPairForMarket(pair, market);

  if (normalized) {
    return normalized;
  }

  pushField(
    fields,
    "pair",
    market === "crypto"
      ? "Enter a supported crypto spot symbol such as BTCUSDT, ETHUSDT, SOLUSDT, or BTC/USDT."
      : "Enter a supported forex/demo CFD pair such as EURUSD, GBPUSD, USDJPY, XAUUSD, or BTCUSD."
  );

  return pair;
}

function validateDirectionalLevels({
  direction,
  entry,
  takeProfit,
  stopLoss,
  fields
}: {
  direction: WorkspaceSignalRecord["direction"] | undefined;
  entry: string;
  takeProfit: string;
  stopLoss: string;
  fields: Record<string, string>;
}) {
  if (!direction || fields.entry || fields.takeProfit || fields.stopLoss) {
    return;
  }

  const entryLevel = firstNumericLevel(entry);
  const takeProfitLevel = firstNumericLevel(takeProfit);
  const stopLossLevel = firstNumericLevel(stopLoss);

  if (!entryLevel || !takeProfitLevel || !stopLossLevel) {
    return;
  }

  if (direction === "buy" && (takeProfitLevel <= entryLevel || stopLossLevel >= entryLevel)) {
    pushField(fields, "takeProfit", "For buy signals, take profit must be above entry and stop loss below entry.");
    pushField(fields, "stopLoss", "For buy signals, stop loss must be below entry and take profit above entry.");
  }

  if (direction === "sell" && (takeProfitLevel >= entryLevel || stopLossLevel <= entryLevel)) {
    pushField(fields, "takeProfit", "For sell signals, take profit must be below entry and stop loss above entry.");
    pushField(fields, "stopLoss", "For sell signals, stop loss must be above entry and take profit below entry.");
  }
}

export function validateSignalDraftPayload(payload: unknown): WorkspaceSignalDraftPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid signal payload.");
  }

  const fields: Record<string, string> = {};
  const market = isOneOf(payload.market, markets) ? payload.market : undefined;
  const direction = isOneOf(payload.direction, directions) ? payload.direction : undefined;
  const riskLabel = isOneOf(payload.riskLabel, riskLabels) ? payload.riskLabel : undefined;
  const deliveryMode = isOneOf(payload.deliveryMode, deliveryModes) ? payload.deliveryMode : undefined;
  const pair = validatePairForMarket(validatePair(payload.pair, fields), market, fields);
  const entry = validatePriceText(payload.entry, "entry", fields);
  const takeProfit = validatePriceText(payload.takeProfit, "takeProfit", fields);
  const stopLoss = validatePriceText(payload.stopLoss, "stopLoss", fields);
  const notes = sanitizeText(payload.notes, 480);

  if (!market) {
    pushField(fields, "market", "Choose forex or crypto.");
  }

  if (!direction) {
    pushField(fields, "direction", "Choose buy or sell.");
  }

  if (!riskLabel) {
    pushField(fields, "riskLabel", "Choose a risk label.");
  }

  if (!deliveryMode) {
    pushField(fields, "deliveryMode", "Choose manual review or alerts only.");
  }

  if (notes && /<[^>]+>/.test(notes)) {
    pushField(fields, "notes", "Use plain text only.");
  }

  validateDirectionalLevels({
    direction,
    entry,
    takeProfit,
    stopLoss,
    fields
  });

  throwFields(fields);

  return {
    market: market ?? "forex",
    pair,
    direction: direction ?? "buy",
    entry,
    takeProfit,
    stopLoss,
    riskLabel: riskLabel ?? "medium",
    notes: notes || undefined,
    deliveryMode: deliveryMode ?? "alerts_only",
    publish: payload.publish === true
  };
}

export function validateSignalPatchPayload(
  payload: unknown,
  current: WorkspaceSignalRecord
): WorkspaceSignalPatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid signal update payload.");
  }

  const action = asString(payload.action);

  if (action !== "save_draft" && action !== "publish" && action !== "cancel") {
    throw new AdminApiError(400, "invalid_action", "Choose a valid signal action.");
  }

  if (action === "publish" && current.status === "cancelled") {
    throw new AdminApiError(400, "invalid_action", "Cancelled signals cannot be published.");
  }

  if (action === "cancel") {
    return { action: "cancel" };
  }

  const draft = validateSignalDraftPayload({
    market: payload.market ?? current.market,
    pair: payload.pair ?? current.pair,
    direction: payload.direction ?? current.direction,
    entry: payload.entry ?? current.entry,
    takeProfit: payload.takeProfit ?? current.takeProfit,
    stopLoss: payload.stopLoss ?? current.stopLoss,
    riskLabel: payload.riskLabel ?? current.riskLabel,
    notes: payload.notes ?? current.notes,
    deliveryMode: payload.deliveryMode ?? current.deliveryMode,
    publish: action === "publish"
  });

  return {
    ...draft,
    action
  };
}

export function validateStudentSupportPatchPayload(payload: unknown): WorkspaceStudentSupportPatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid student support update.");
  }

  const fields: Record<string, string> = {};
  const action = isOneOf(payload.action, supportActions) ? payload.action : undefined;
  const lifecycleStatus = isOneOf(payload.lifecycleStatus, lifecycleStatuses)
    ? payload.lifecycleStatus
    : undefined;
  const supportNoteSummary = sanitizeText(payload.supportNoteSummary, 280);

  if (!action) {
    pushField(fields, "action", "Choose a valid support action.");
  }

  if (action === "update_operational_status" && !lifecycleStatus) {
    pushField(fields, "lifecycleStatus", "Choose a valid lifecycle status.");
  }

  if (supportNoteSummary && /<[^>]+>/.test(supportNoteSummary)) {
    pushField(fields, "supportNoteSummary", "Use plain text only.");
  }

  if (supportNoteSummary.length > 0 && supportNoteSummary.length < 3) {
    pushField(fields, "supportNoteSummary", "Add a short support note summary.");
  }

  throwSupportFields(fields);

  return {
    action: action ?? "save_support_note",
    lifecycleStatus,
    supportNoteSummary: supportNoteSummary || undefined
  };
}
