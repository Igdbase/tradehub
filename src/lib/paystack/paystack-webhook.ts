import crypto from "node:crypto";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { getPaystackWebhookSecret } from "@/lib/paystack/paystack-client";

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = getPaystackWebhookSecret();

  if (!secret) {
    throw new AdminApiError(503, "paystack_not_configured", "Paystack webhook verification is not configured.");
  }

  if (!signature) {
    throw new AdminApiError(401, "missing_paystack_signature", "Missing Paystack webhook signature.");
  }

  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  let actualBuffer: Buffer;

  try {
    actualBuffer = Buffer.from(signature, "hex");
  } catch {
    throw new AdminApiError(401, "invalid_paystack_signature", "Invalid Paystack webhook signature.");
  }

  const expectedBuffer = Buffer.from(expected, "hex");

  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new AdminApiError(401, "invalid_paystack_signature", "Invalid Paystack webhook signature.");
  }
}

export function parsePaystackWebhook(rawBody: string): Record<string, unknown> {
  try {
    const payload = JSON.parse(rawBody) as unknown;

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("invalid");
    }

    return payload as Record<string, unknown>;
  } catch {
    throw new AdminApiError(400, "invalid_webhook_payload", "Paystack webhook payload is not valid JSON.");
  }
}
