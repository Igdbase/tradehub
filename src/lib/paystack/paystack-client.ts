import { PaystackApiError, PaystackConfigurationError } from "@/lib/paystack/paystack-errors";
import type { PaystackMode, PaystackReadiness } from "@/types/payments";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackInitializePayload = {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  metadata: Record<string, string>;
  plan?: string;
  split_code?: string;
  subaccount?: string;
  bearer?: "account" | "subaccount";
};

export type PaystackInitializeResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackVerificationResult = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
  created_at?: string;
  customer?: {
    email?: string;
    customer_code?: string;
  };
  metadata?: unknown;
  plan?: string | Record<string, unknown>;
  subscription?: {
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
    status?: string;
  };
};

function getSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
}

export function getPaystackMode(): PaystackMode {
  const key = getSecretKey();

  if (!key) {
    return "missing";
  }

  if (key.startsWith("sk_test_")) {
    return "test";
  }

  if (key.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
}

export function isPaystackConfigured() {
  return getPaystackMode() !== "missing";
}

export function getPaystackReadiness(): PaystackReadiness {
  const mode = getPaystackMode();
  const configured = mode !== "missing";

  return {
    configured,
    mode,
    publicKeyConfigured: Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim()),
    webhookReady: configured,
    message: configured
      ? `Paystack ${mode} mode is configured server-side.`
      : "Paystack test mode is not configured yet."
  };
}

function requireSecretKey() {
  const key = getSecretKey();

  if (!key) {
    throw new PaystackConfigurationError();
  }

  return key;
}

async function requestPaystack<T>(path: string, init?: RequestInit): Promise<T> {
  const secretKey = requireSecretKey();
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json().catch(() => null)) as PaystackResponse<T> | null;

  if (!response.ok || !payload?.status) {
    throw new PaystackApiError(payload?.message || "Paystack rejected that request.");
  }

  return payload.data;
}

export async function initializePaystackTransaction(payload: PaystackInitializePayload) {
  return requestPaystack<PaystackInitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyPaystackTransaction(reference: string) {
  const safeReference = encodeURIComponent(reference);
  return requestPaystack<PaystackVerificationResult>(`/transaction/verify/${safeReference}`);
}

export function getPaystackWebhookSecret() {
  return process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || getSecretKey();
}
