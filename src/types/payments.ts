import type {
  BillingPeriod,
  IsoDateString,
  PaymentRail,
  WorkspaceFeatureKey
} from "@/types/workspace";
import type { AdminSourceMeta } from "@/types/admin-api";

export type PaymentIntentStatus =
  | "pending"
  | "checkout_opened"
  | "verified"
  | "expired"
  | "failed"
  | "abandoned"
  | "cancelled";

export type BillingSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "non_renewing"
  | "cancelled"
  | "expired";

export type PaystackMode = "missing" | "test" | "live" | "unknown";
export type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta" | "custom";
export type SolanaSettlementStatus = "pending_payout" | "settled" | "cancelled";

export interface PaymentSplit {
  platformPercent: number;
  influencerPercent: number;
  platformAmountNgn?: number;
  influencerAmountNgn?: number;
  platformAmountUsdc?: number;
  influencerAmountUsdc?: number;
}

export interface SubscriptionPlan {
  planId: string;
  workspaceId: string;
  tierId: string;
  label: string;
  priceNgn: number;
  billingPeriod: BillingPeriod;
  rails: PaymentRail[];
}

export interface PaymentIntentBase {
  paymentIntentId: string;
  rail: PaymentRail;
  workspaceId: string;
  studentId: string;
  tierId: string;
  status: PaymentIntentStatus;
  amountNgn: number;
  split: PaymentSplit;
  createdAt: IsoDateString;
  expiresAt: IsoDateString;
  verifiedAt?: IsoDateString;
}

export interface PaystackPaymentIntent extends PaymentIntentBase {
  rail: "paystack";
  paystackReference: string;
  paystackCustomerCode?: string;
  paystackSplitCode?: string;
  paystackPlanCode?: string;
  paystackAccessCode?: string;
  paystackAuthorizationUrl?: string;
  paystackSubscriptionCode?: string;
  failureReason?: string;
}

export interface SolanaPaymentIntent extends PaymentIntentBase {
  rail: "solana";
  amountUsdc: number;
  fxRateSnapshot: number;
  reference: string;
  solanaPayUrl: string;
  influencerWallet: string;
  platformWallet: string;
  platformTokenBalanceBeforeRaw?: string;
  quoteExpiresAt: IsoDateString;
  verifiedSignature?: string;
  solanaNetwork: SolanaNetwork;
  usdcMint: string;
  settlementId?: string;
  settlementStatus?: SolanaSettlementStatus;
  failureReason?: string;
}

export type PaymentIntent = PaystackPaymentIntent | SolanaPaymentIntent;

export interface SolanaSettlementRecord {
  settlementId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceHandle: string;
  studentId: string;
  studentDisplayName: string;
  studentEmail?: string;
  tierId: string;
  tierLabel: string;
  paymentIntentId: string;
  reference: string;
  status: SolanaSettlementStatus;
  amountNgn: number;
  amountUsdc: number;
  split: PaymentSplit;
  platformWallet: string;
  influencerWallet: string;
  verifiedSignature: string;
  solanaNetwork: SolanaNetwork;
  usdcMint: string;
  fxRateSnapshot: number;
  createdAt: IsoDateString;
  verifiedAt: IsoDateString;
  payoutCompletedAt?: IsoDateString;
  payoutSignature?: string;
  payoutNote?: string;
}

export type StudentSubscription = {
  workspaceId: string;
  studentId: string;
  tierId: string;
  tierLabel: string;
  status: BillingSubscriptionStatus;
  rail: "paystack" | "solana";
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  paystackEmailToken?: string;
  latestSignature?: string;
  currentPeriodStart?: IsoDateString;
  currentPeriodEnd?: IsoDateString;
  trialEndsAt?: IsoDateString;
  graceEndsAt?: IsoDateString;
  nextPaymentDate?: IsoDateString;
  latestPaymentIntentId?: string;
  latestReference?: string;
  lastVerifiedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type BillingTier = {
  tierId: string;
  name: string;
  description: string;
  priceNgn: number;
  billingPeriod: BillingPeriod;
  features: WorkspaceFeatureKey[];
  featured?: boolean;
  paystackPlanCode?: string;
  checkoutReady: boolean;
  readinessMessage: string;
};

export type PaystackReadiness = {
  configured: boolean;
  mode: PaystackMode;
  publicKeyConfigured: boolean;
  webhookReady: boolean;
  message: string;
};

export type SolanaReadiness = {
  configured: boolean;
  eligible: boolean;
  network: SolanaNetwork;
  platformWalletConfigured: boolean;
  usdcMintConfigured: boolean;
  rpcConfigured: boolean;
  fxRateConfigured: boolean;
  workspaceWalletConfigured: boolean;
  message: string;
  missing: string[];
};

export type StudentBillingOverviewResponse = AdminSourceMeta & {
  ok: true;
  workspace: {
    workspaceId: string;
    name: string;
    handle: string;
    paystackSplitReady: boolean;
    solanaReady: boolean;
  };
  student: {
    studentId: string;
    email?: string;
    displayName: string;
    tierId: string;
    tierLabel: string;
  };
  paystack: PaystackReadiness;
  solana: SolanaReadiness;
  currentSubscription: StudentSubscription | null;
  tiers: BillingTier[];
};

export type StudentBillingCheckoutResponse = AdminSourceMeta & {
  ok: true;
  checkout: {
    paymentIntentId: string;
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amountNgn: number;
    currency: "NGN";
  };
};

export type StudentBillingVerifyResponse = AdminSourceMeta & {
  ok: true;
  status: "verified" | "pending" | "failed";
  paymentIntent: PaystackPaymentIntent | null;
  subscription: StudentSubscription | null;
  message: string;
};

export type StudentSolanaCheckoutResponse = AdminSourceMeta & {
  ok: true;
  checkout: {
    paymentIntentId: string;
    reference: string;
    solanaPayUrl: string;
    amountNgn: number;
    amountUsdc: number;
    fxRateSnapshot: number;
    quoteExpiresAt: IsoDateString;
    platformWallet: string;
    influencerWallet: string;
    usdcMint: string;
    network: SolanaNetwork;
  };
};

export type StudentSolanaVerifyResponse = AdminSourceMeta & {
  ok: true;
  status: "verified" | "pending" | "failed" | "expired";
  paymentIntent: SolanaPaymentIntent | null;
  subscription: StudentSubscription | null;
  message: string;
};

export type PaystackWebhookReceipt = {
  eventId: string;
  event: string;
  reference?: string;
  subscriptionCode?: string;
  invoiceCode?: string;
  workspaceId?: string;
  studentId?: string;
  processed: boolean;
  duplicate: boolean;
  receivedAt: IsoDateString;
  processedAt?: IsoDateString;
};

export type AdminPaymentOpsSummary = {
  latestIntentCount: number;
  verifiedPaystackCount: number;
  verifiedSolanaCount: number;
  pendingSolanaPayoutCount: number;
  paymentSupportQueueCount: number;
  pendingPaystackVerificationCount: number;
  failedVerificationCount: number;
  stalePendingIntentCount: number;
  subscriptionMismatchCount: number;
  latestAmountNgn?: number;
  latestAmountUsdc?: number;
  latestRail?: PaymentRail;
};

export type AdminPaymentSupportQueueKind =
  | "pending_paystack_verification"
  | "failed_verification"
  | "stale_pending_intent"
  | "subscription_access_mismatch"
  | "solana_settlement_review";

export type AdminPaymentSupportQueueItem = {
  queueItemId: string;
  kind: AdminPaymentSupportQueueKind;
  rail: PaymentRail;
  severity: "low" | "medium" | "high";
  statusLabel: string;
  issueLabel: string;
  supportCopy: string;
  safePaymentRef: string;
  maskedWorkspaceRef: string;
  maskedStudentRef?: string;
  amountNgn?: number;
  amountUsdc?: number;
  createdAt: IsoDateString;
  actionHint: string;
};

export type AdminPaymentsOverviewResponse = AdminSourceMeta & {
  ok: true;
  paystack: PaystackReadiness;
  solana: SolanaReadiness;
  opsSummary: AdminPaymentOpsSummary;
  paymentSupportQueue: AdminPaymentSupportQueueItem[];
  latestPaymentIntents: PaymentIntent[];
  latestSolanaSettlements: SolanaSettlementRecord[];
  latestWebhookReceipts: PaystackWebhookReceipt[];
  warnings: string[];
};

export type AdminPaystackReconcileResponse = AdminSourceMeta & {
  ok: true;
  status: "verified" | "already_verified" | "pending" | "failed";
  message: string;
  paymentIntent: PaystackPaymentIntent;
  subscription: StudentSubscription | null;
};

export type SolanaSettlementPatchPayload = {
  status: SolanaSettlementStatus;
  payoutNote?: string;
  payoutSignature?: string;
};

export type AdminSolanaSettlementUpdateResponse = AdminSourceMeta & {
  ok: true;
  message: string;
  settlement: SolanaSettlementRecord;
};

export type WorkspaceBillingOverviewResponse = AdminSourceMeta & {
  ok: true;
  paystack: PaystackReadiness;
  workspace: {
    workspaceId: string;
    name: string;
    handle: string;
    paystackSplitReady: boolean;
    solanaReady: boolean;
  };
  solana: SolanaReadiness;
  tiers: BillingTier[];
  latestPaymentIntents: PaymentIntent[];
  latestSolanaSettlements: SolanaSettlementRecord[];
  warnings: string[];
};
