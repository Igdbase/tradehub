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

export type PaystackDisableSubscriptionPayload = {
  code: string;
  token: string;
};

export type PaystackDisableSubscriptionResult = {
  status?: string;
  subscription_code?: string;
  email_token?: string;
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

function isLocalPaystackFakeEnabled() {
  return process.env.PAYSTACK_LOCAL_FAKE === "true" &&
    Boolean(
      process.env.FIRESTORE_EMULATOR_HOST?.trim() ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim()
    );
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
  if (isLocalPaystackFakeEnabled()) {
    return {
      authorization_url: payload.callback_url,
      access_code: `local_access_${payload.reference.slice(0, 16)}`,
      reference: payload.reference
    };
  }

  return requestPaystack<PaystackInitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyPaystackTransaction(reference: string) {
  if (isLocalPaystackFakeEnabled()) {
    return {
      status: reference.includes("pending") ? "pending" : "success",
      reference,
      amount: Number(process.env.TRADE_COPIER_PRICE_NGN ?? "25000") * 100,
      currency: "NGN",
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      customer: {
        customer_code: "CUS_local_trade_copier"
      },
      metadata: {
        product: "trade_copier"
      },
      subscription: {
        subscription_code: "SUB_local_trade_copier",
        email_token: "EMAIL_local_trade_copier",
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active"
      }
    };
  }

  const safeReference = encodeURIComponent(reference);
  return requestPaystack<PaystackVerificationResult>(`/transaction/verify/${safeReference}`);
}

export async function disablePaystackSubscription(payload: PaystackDisableSubscriptionPayload) {
  if (isLocalPaystackFakeEnabled()) {
    if (payload.code.includes("fail") || payload.token.includes("fail")) {
      throw new PaystackApiError("Local Paystack subscription disable failed.");
    }

    return {
      status: "disabled",
      subscription_code: payload.code,
      email_token: payload.token
    };
  }

  return requestPaystack<PaystackDisableSubscriptionResult>("/subscription/disable", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getPaystackWebhookSecret() {
  return process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || getSecretKey();
}
