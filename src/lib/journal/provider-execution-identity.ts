import "server-only";

import { createHash } from "node:crypto";

export interface ProviderExecutionIdentityInput {
  provider: string;
  symbol: string;
  side?: string;
  providerOrderId?: string;
  providerExecutionId?: string;
  clientOrderId?: string;
  executedAt?: string | number;
}

function identityPart(value: unknown, maxLength = 120) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export function createProviderExecutionIdentity(input: ProviderExecutionIdentityInput) {
  const providerOrderId = identityPart(input.providerOrderId);
  const providerExecutionId = identityPart(input.providerExecutionId);
  const clientOrderId = identityPart(input.clientOrderId);
  const executedAt = identityPart(input.executedAt, 80);
  const stableProviderRef = providerOrderId || providerExecutionId || clientOrderId;

  if (!stableProviderRef) {
    return undefined;
  }

  const fallbackClientOrderId = providerOrderId || providerExecutionId ? "" : clientOrderId;
  const parts = [
    identityPart(input.provider, 32).toLowerCase(),
    identityPart(input.symbol, 32).toUpperCase(),
    identityPart(input.side, 12).toLowerCase(),
    providerOrderId,
    providerExecutionId,
    fallbackClientOrderId,
    executedAt
  ];

  return `provider_exec_${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40)}`;
}

export function createProviderOrderExecutionIdentity(input: ProviderExecutionIdentityInput) {
  const providerOrderId = identityPart(input.providerOrderId);
  const clientOrderId = identityPart(input.clientOrderId);
  const stableProviderRef = providerOrderId || clientOrderId;

  if (!stableProviderRef) {
    return undefined;
  }

  const fallbackClientOrderId = providerOrderId ? "" : clientOrderId;
  const parts = [
    identityPart(input.provider, 32).toLowerCase(),
    identityPart(input.symbol, 32).toUpperCase(),
    identityPart(input.side, 12).toLowerCase(),
    providerOrderId,
    fallbackClientOrderId
  ];

  return `provider_order_exec_${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40)}`;
}
