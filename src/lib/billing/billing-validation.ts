import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { SolanaSettlementPatchPayload, SolanaSettlementStatus } from "@/types/payments";

const SOLANA_SETTLEMENT_STATUSES = new Set<SolanaSettlementStatus>([
  "pending_payout",
  "settled",
  "cancelled"
]);

function boundedString(value: unknown, max: number) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AdminApiError(400, "invalid_text", "Text fields must be plain strings.");
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > max) {
    throw new AdminApiError(400, "text_too_long", `Keep notes under ${max} characters.`);
  }

  return trimmed;
}

export function parsePaymentIntentIdParam(paymentIntentId: string) {
  const value = paymentIntentId.trim();

  if (!value || value.length > 140 || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new AdminApiError(400, "invalid_payment_intent", "A valid payment intent ID is required.");
  }

  return value;
}

export function parseSettlementIdParam(settlementId: string) {
  const value = settlementId.trim();

  if (!value || value.length > 160 || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new AdminApiError(400, "invalid_settlement", "A valid settlement ID is required.");
  }

  return value;
}

export function parseSolanaSettlementPatchPayload(payload: unknown): SolanaSettlementPatchPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "invalid_settlement_payload", "Choose a valid settlement status.");
  }

  const status = "status" in payload && typeof payload.status === "string"
    ? payload.status.trim()
    : "";

  if (!SOLANA_SETTLEMENT_STATUSES.has(status as SolanaSettlementStatus)) {
    throw new AdminApiError(400, "invalid_settlement_status", "Choose a valid settlement status.");
  }

  const payoutNote = boundedString("payoutNote" in payload ? payload.payoutNote : undefined, 500);
  const payoutSignature = boundedString("payoutSignature" in payload ? payload.payoutSignature : undefined, 180);

  if (payoutSignature && !/^[a-zA-Z0-9_-]+$/.test(payoutSignature)) {
    throw new AdminApiError(400, "invalid_payout_reference", "Payout reference must be plain text without spaces.");
  }

  return {
    status: status as SolanaSettlementStatus,
    payoutNote,
    payoutSignature
  };
}

export function parseCheckoutPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "invalid_checkout_payload", "Choose a valid workspace tier.");
  }

  const tierId = "tierId" in payload && typeof payload.tierId === "string" ? payload.tierId.trim() : "";

  if (!tierId || tierId.length > 120) {
    throw new AdminApiError(400, "invalid_tier", "Choose a valid workspace tier.");
  }

  return { tierId };
}

export function parseReferenceParam(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim() ?? "";

  if (!reference || reference.length > 160) {
    throw new AdminApiError(400, "invalid_reference", "A valid Paystack reference is required.");
  }

  return reference;
}

export function parseSolanaVerifyParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const paymentIntentId = params.get("paymentIntentId")?.trim() ?? "";
  const signature = params.get("signature")?.trim() ?? "";

  if (!paymentIntentId || paymentIntentId.length > 120) {
    throw new AdminApiError(400, "invalid_payment_intent", "A valid Solana payment intent is required.");
  }

  if (signature && signature.length > 140) {
    throw new AdminApiError(400, "invalid_solana_signature", "That Solana signature is not valid.");
  }

  return {
    paymentIntentId,
    signature: signature || undefined
  };
}
