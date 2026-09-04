import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import type {
  BillingTier,
  BillingSubscriptionStatus,
  PaymentIntent,
  PaystackPaymentIntent,
  PaystackWebhookReceipt,
  SolanaSettlementRecord,
  SolanaPaymentIntent,
  StudentSubscription
} from "@/types/payments";
import type { Workspace, WorkspaceTier } from "@/types/workspace";

type SnapshotLike = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

export function recordFromSnapshot(snapshot: SnapshotLike, idField = "id") {
  const data = snapshot.data() ?? {};

  return {
    ...data,
    [idField]: data[idField] ?? snapshot.id
  };
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date.toISOString() : fallback;
  }

  return fallback;
}

export function mapBillingWorkspace(snapshot: SnapshotLike, workspaceId: string): Workspace {
  return mapWorkspaceRecord(recordFromSnapshot(snapshot, "workspaceId"), workspaceId);
}

export function mapBillingTier(tier: WorkspaceTier, planCodeFallback?: string): BillingTier {
  const paystackPlanCode = tier.paystackPlanCode || planCodeFallback || undefined;
  const checkoutReady = Boolean(paystackPlanCode);

  return {
    tierId: tier.tierId,
    name: tier.name,
    description: tier.description,
    priceNgn: tier.priceNgn,
    billingPeriod: tier.billingPeriod,
    features: tier.features,
    featured: tier.featured,
    paystackPlanCode,
    checkoutReady,
    readinessMessage: checkoutReady
      ? "Paystack plan code is ready."
      : "Owner needs to add a Paystack plan code before checkout can start."
  };
}

export function mapSubscriptionRecord(
  record: Record<string, unknown> | null,
  workspaceId: string,
  studentId: string
): StudentSubscription | null {
  if (!record) {
    return null;
  }

  return {
    workspaceId: asString(record.workspaceId, workspaceId),
    studentId: asString(record.studentId, studentId),
    tierId: asString(record.tierId, "all"),
    tierLabel: asString(record.tierLabel, "All access"),
    status: asString(record.status, "inactive") as BillingSubscriptionStatus,
    rail: asString(record.rail, "paystack") as StudentSubscription["rail"],
    paystackCustomerCode: asString(record.paystackCustomerCode) || undefined,
    paystackSubscriptionCode: asString(record.paystackSubscriptionCode) || undefined,
    paystackEmailToken: asString(record.paystackEmailToken) || undefined,
    latestSignature: asString(record.latestSignature) || undefined,
    currentPeriodStart: record.currentPeriodStart ? normalizeIsoDate(record.currentPeriodStart) : undefined,
    currentPeriodEnd: record.currentPeriodEnd ? normalizeIsoDate(record.currentPeriodEnd) : undefined,
    trialEndsAt: record.trialEndsAt ? normalizeIsoDate(record.trialEndsAt) : undefined,
    graceEndsAt: record.graceEndsAt ? normalizeIsoDate(record.graceEndsAt) : undefined,
    nextPaymentDate: record.nextPaymentDate ? normalizeIsoDate(record.nextPaymentDate) : undefined,
    latestPaymentIntentId: asString(record.latestPaymentIntentId) || undefined,
    latestReference: asString(record.latestReference) || undefined,
    lastVerifiedAt: record.lastVerifiedAt ? normalizeIsoDate(record.lastVerifiedAt) : undefined,
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

export function mapPaystackPaymentIntent(record: Record<string, unknown>): PaystackPaymentIntent {
  const split = typeof record.split === "object" && record.split !== null && !Array.isArray(record.split)
    ? record.split as Record<string, unknown>
    : {};

  return {
    paymentIntentId: asString(record.paymentIntentId),
    rail: "paystack",
    workspaceId: asString(record.workspaceId),
    studentId: asString(record.studentId),
    tierId: asString(record.tierId),
    status: asString(record.status, "pending") as PaystackPaymentIntent["status"],
    amountNgn: asNumber(record.amountNgn),
    split: {
      platformPercent: asNumber(split.platformPercent, 10),
      influencerPercent: asNumber(split.influencerPercent, 90),
      platformAmountNgn: asNumber(split.platformAmountNgn),
      influencerAmountNgn: asNumber(split.influencerAmountNgn)
    },
    createdAt: normalizeIsoDate(record.createdAt),
    expiresAt: normalizeIsoDate(record.expiresAt, normalizeIsoDate(record.createdAt)),
    verifiedAt: record.verifiedAt ? normalizeIsoDate(record.verifiedAt) : undefined,
    paystackReference: asString(record.paystackReference, asString(record.reference)),
    paystackCustomerCode: asString(record.paystackCustomerCode) || undefined,
    paystackSplitCode: asString(record.paystackSplitCode, asString(record.splitCode)) || undefined,
    paystackPlanCode: asString(record.paystackPlanCode) || undefined,
    paystackAccessCode: asString(record.paystackAccessCode) || undefined,
    paystackAuthorizationUrl: asString(record.paystackAuthorizationUrl) || undefined,
    paystackSubscriptionCode: asString(record.paystackSubscriptionCode) || undefined,
    failureReason: asString(record.failureReason) || undefined
  };
}

export function mapSolanaPaymentIntent(record: Record<string, unknown>): SolanaPaymentIntent {
  const split = typeof record.split === "object" && record.split !== null && !Array.isArray(record.split)
    ? record.split as Record<string, unknown>
    : {};
  const settlementStatus = asString(record.settlementStatus);

  return {
    paymentIntentId: asString(record.paymentIntentId),
    rail: "solana",
    workspaceId: asString(record.workspaceId),
    studentId: asString(record.studentId),
    tierId: asString(record.tierId),
    status: asString(record.status, "pending") as SolanaPaymentIntent["status"],
    amountNgn: asNumber(record.amountNgn),
    split: {
      platformPercent: asNumber(split.platformPercent, 10),
      influencerPercent: asNumber(split.influencerPercent, 90),
      platformAmountUsdc: asNumber(split.platformAmountUsdc),
      influencerAmountUsdc: asNumber(split.influencerAmountUsdc)
    },
    createdAt: normalizeIsoDate(record.createdAt),
    expiresAt: normalizeIsoDate(record.expiresAt, normalizeIsoDate(record.createdAt)),
    verifiedAt: record.verifiedAt ? normalizeIsoDate(record.verifiedAt) : undefined,
    amountUsdc: asNumber(record.amountUsdc),
    fxRateSnapshot: asNumber(record.fxRateSnapshot),
    reference: asString(record.reference),
    solanaPayUrl: asString(record.solanaPayUrl),
    influencerWallet: asString(record.influencerWallet),
    platformWallet: asString(record.platformWallet),
    platformTokenBalanceBeforeRaw: asString(record.platformTokenBalanceBeforeRaw) || undefined,
    quoteExpiresAt: normalizeIsoDate(record.quoteExpiresAt, normalizeIsoDate(record.expiresAt)),
    verifiedSignature: asString(record.verifiedSignature) || undefined,
    solanaNetwork: asString(record.solanaNetwork, "devnet") as SolanaPaymentIntent["solanaNetwork"],
    usdcMint: asString(record.usdcMint),
    settlementId: asString(record.settlementId) || undefined,
    settlementStatus: settlementStatus
      ? settlementStatus as SolanaPaymentIntent["settlementStatus"]
      : undefined,
    failureReason: asString(record.failureReason) || undefined
  };
}

export function mapSolanaSettlementRecord(record: Record<string, unknown>): SolanaSettlementRecord {
  const split = typeof record.split === "object" && record.split !== null && !Array.isArray(record.split)
    ? record.split as Record<string, unknown>
    : {};

  return {
    settlementId: asString(record.settlementId),
    workspaceId: asString(record.workspaceId),
    workspaceName: asString(record.workspaceName),
    workspaceHandle: asString(record.workspaceHandle),
    studentId: asString(record.studentId),
    studentDisplayName: asString(record.studentDisplayName),
    studentEmail: asString(record.studentEmail) || undefined,
    tierId: asString(record.tierId),
    tierLabel: asString(record.tierLabel),
    paymentIntentId: asString(record.paymentIntentId),
    reference: asString(record.reference),
    status: asString(record.status, "pending_payout") as SolanaSettlementRecord["status"],
    amountNgn: asNumber(record.amountNgn),
    amountUsdc: asNumber(record.amountUsdc),
    split: {
      platformPercent: asNumber(split.platformPercent, 10),
      influencerPercent: asNumber(split.influencerPercent, 90),
      platformAmountNgn: asNumber(split.platformAmountNgn),
      influencerAmountNgn: asNumber(split.influencerAmountNgn),
      platformAmountUsdc: asNumber(split.platformAmountUsdc),
      influencerAmountUsdc: asNumber(split.influencerAmountUsdc)
    },
    platformWallet: asString(record.platformWallet),
    influencerWallet: asString(record.influencerWallet),
    verifiedSignature: asString(record.verifiedSignature),
    solanaNetwork: asString(record.solanaNetwork, "devnet") as SolanaSettlementRecord["solanaNetwork"],
    usdcMint: asString(record.usdcMint),
    fxRateSnapshot: asNumber(record.fxRateSnapshot),
    createdAt: normalizeIsoDate(record.createdAt),
    verifiedAt: normalizeIsoDate(record.verifiedAt, normalizeIsoDate(record.createdAt)),
    payoutCompletedAt: record.payoutCompletedAt ? normalizeIsoDate(record.payoutCompletedAt) : undefined,
    payoutSignature: asString(record.payoutSignature) || undefined,
    payoutNote: asString(record.payoutNote) || undefined
  };
}

export function mapPaymentIntent(record: Record<string, unknown>): PaymentIntent {
  return asString(record.rail) === "solana"
    ? mapSolanaPaymentIntent(record)
    : mapPaystackPaymentIntent(record);
}

export function mapPaystackWebhookReceipt(record: Record<string, unknown>): PaystackWebhookReceipt {
  return {
    eventId: asString(record.eventId),
    event: asString(record.event, "unknown_event"),
    reference: asString(record.reference) || undefined,
    subscriptionCode: asString(record.subscriptionCode) || undefined,
    invoiceCode: asString(record.invoiceCode) || undefined,
    workspaceId: asString(record.workspaceId) || undefined,
    studentId: asString(record.studentId) || undefined,
    processed: Boolean(record.processed),
    duplicate: Boolean(record.duplicate),
    receivedAt: normalizeIsoDate(record.receivedAt),
    processedAt: record.processedAt ? normalizeIsoDate(record.processedAt) : undefined
  };
}

export function hasVerifiedPaystackRail(workspace: Workspace) {
  const paystackRail = workspace.rails.find((rail) => rail.rail === "paystack");

  return Boolean(
    paystackRail?.status === "enabled" &&
      (workspace.paystackSplitCode || workspace.paystackSubaccountCode)
  );
}

export function hasVerifiedSolanaRail(workspace: Workspace) {
  const solanaRail = workspace.rails.find((rail) => rail.rail === "solana");

  return Boolean(
    solanaRail?.status === "enabled" &&
      workspace.solanaPayEnabled &&
      workspace.solanaPayoutWallet
  );
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}
