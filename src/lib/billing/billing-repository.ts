import crypto from "node:crypto";
import type { DocumentData, DocumentReference, Query } from "firebase-admin/firestore";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  assertWorkspacePackageSeatAvailable,
  deriveWorkspacePackageStatus
} from "@/lib/workspace/workspace-package-licence";
import {
  getPaystackReadiness,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  type PaystackVerificationResult
} from "@/lib/paystack/paystack-client";
import {
  hasVerifiedPaystackRail,
  hasVerifiedSolanaRail,
  mapBillingTier,
  mapBillingWorkspace,
  mapPaymentIntent,
  mapPaystackPaymentIntent,
  mapPaystackWebhookReceipt,
  mapSolanaSettlementRecord,
  mapSolanaPaymentIntent,
  mapSubscriptionRecord,
  recordFromSnapshot,
  stripUndefined
} from "@/lib/billing/billing-mappers";
import { mapStudentProfile } from "@/lib/student-app/student-app-mappers";
import type {
  AdminPaymentsOverviewResponse,
  AdminPaymentSupportQueueItem,
  AdminPaystackReconcileResponse,
  AdminSolanaSettlementUpdateResponse,
  BillingSubscriptionStatus,
  BillingTier,
  PaymentIntent,
  PaystackPaymentIntent,
  PaystackWebhookReceipt,
  SolanaSettlementPatchPayload,
  SolanaSettlementRecord,
  SolanaPaymentIntent,
  StudentBillingCheckoutResponse,
  StudentBillingOverviewResponse,
  StudentBillingVerifyResponse,
  StudentSolanaCheckoutResponse,
  StudentSolanaVerifyResponse,
  StudentSubscription,
  WorkspaceBillingOverviewResponse
} from "@/types/payments";
import type { AdminAuditEvent, AdminAuditTargetType } from "@/types/admin-api";
import type { StudentAppProfile } from "@/types/student-app";
import type { Workspace } from "@/types/workspace";
import {
  buildSolanaPayUrl,
  createSolanaReference,
  getOwnerUsdcBalanceSnapshot,
  getSolanaReadiness,
  quoteUsdcFromNgn,
  requireSolanaConfig,
  verifySolanaPaymentIntent
} from "@/lib/solana/solana-client";

type CheckoutValues = {
  tierId: string;
};

type BillingActor = {
  uid: string;
  email?: string;
};

type PaystackWebhookPayload = Record<string, unknown>;

type PaystackPaymentContext = {
  workspace: Workspace;
  student: StudentAppProfile;
  tier: BillingTier;
  paymentIntent: PaystackPaymentIntent;
  verification: PaystackVerificationResult;
  actor?: BillingActor;
  action: string;
};

type SolanaPaymentContext = {
  workspace: Workspace;
  student: StudentAppProfile;
  tier: BillingTier;
  paymentIntent: SolanaPaymentIntent;
  signature: string;
  actor?: BillingActor;
  action: string;
};

const PAYMENT_INTENT_PAGE_SIZE = 25;
const WEBHOOK_RECEIPT_PAGE_SIZE = 25;
const PACKAGE_SEAT_ACTIVE_STUDENT_LIMIT = 501;

function nowIso() {
  return new Date().toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addBillingPeriod(date: Date, period: Workspace["tiers"][number]["billingPeriod"]) {
  const next = new Date(date);

  if (period === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

async function assertWorkspacePackageAllowsStudentActivation(workspace: Workspace, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspace.workspaceId}/students`)
    .where("status", "==", "active")
    .limit(PACKAGE_SEAT_ACTIVE_STUDENT_LIMIT)
    .get();
  const activeOtherStudentCount = snapshot.docs.filter((doc) => doc.id !== studentId).length;
  const packageStatus = deriveWorkspacePackageStatus({
    workspace,
    activeStudentCount: activeOtherStudentCount
  });

  assertWorkspacePackageSeatAvailable(packageStatus);
}

function paymentIntentId() {
  return `pi_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function paymentReference() {
  return `th_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function solanaSettlementId(paymentIntentId: string) {
  return `solset_${paymentIntentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

function auditEvent({
  actor,
  action,
  targetType,
  targetId,
  before,
  after,
  now = nowIso()
}: {
  actor?: BillingActor;
  action: string;
  targetType: AdminAuditTargetType;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  now?: string;
}): AdminAuditEvent {
  return stripUndefined({
    eventId: `audit_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`,
    actorUid: actor?.uid ?? "paystack_webhook",
    actorEmail: actor?.email,
    action,
    targetType,
    targetId,
    before,
    after,
    createdAt: now
  });
}

function defaultMonthlyPlanCode() {
  return process.env.PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE?.trim() || undefined;
}

function planCodeForTier(tier: Workspace["tiers"][number]) {
  return tier.paystackPlanCode || (tier.billingPeriod === "monthly" ? defaultMonthlyPlanCode() : undefined);
}

function callbackUrl(reference: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const url = new URL("/app/billing/callback", appUrl);
  url.searchParams.set("reference", reference);
  return url.toString();
}

function cleanPaystackStatus(status: unknown): BillingSubscriptionStatus {
  if (status === "active" || status === "trialing" || status === "past_due" || status === "cancelled") {
    return status;
  }

  if (status === "non-renewing" || status === "non_renewing") {
    return "non_renewing";
  }

  return "active";
}

function safeMetadata(value: unknown): Record<string, string> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return safeMetadata(parsed);
    } catch {
      return {};
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) =>
      typeof entry === "string" ? [[key, entry.trim()]] : []
    )
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildStudentProfileForBilling({
  workspace,
  studentRecord,
  studentId,
  claimedTierId,
  subscription
}: {
  workspace: Workspace;
  studentRecord: Record<string, unknown>;
  studentId: string;
  claimedTierId?: string | null;
  subscription: StudentSubscription | null;
}) {
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord,
    subscription,
    claimedTierId
  });

  return mapStudentProfile(studentRecord, workspace.workspaceId, studentId, entitlements);
}

async function loadStudentBillingContext(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const workspaceRef = db.doc(`workspaces/${actor.workspaceId}`);
  const studentRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`);
  const subscriptionRef = db.doc(
    `workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`
  );
  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot] = await Promise.all([
    workspaceRef.get(),
    studentRef.get(),
    subscriptionRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This student workspace is not prepared yet.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(403, "student_record_missing", "This student account is not active in the workspace yet.");
  }

  const workspace = mapBillingWorkspace(workspaceSnapshot, actor.workspaceId);
  const studentRecord = recordFromSnapshot(studentSnapshot, "studentId");
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const student = buildStudentProfileForBilling({
    workspace,
    studentRecord,
    studentId: actor.studentId,
    claimedTierId: actor.tierId,
    subscription
  });

  return { db, workspace, student, subscription };
}

function mapWorkspaceTiers(workspace: Workspace) {
  return workspace.tiers.map((tier) => mapBillingTier(tier, planCodeForTier(tier)));
}

function requireCheckoutTier(workspace: Workspace, tierId: string) {
  const tier = workspace.tiers.find((entry) => entry.tierId === tierId);

  if (!tier) {
    throw new AdminApiError(404, "tier_not_found", "That billing tier was not found.");
  }

  if (!Number.isInteger(tier.priceNgn) || tier.priceNgn <= 0) {
    throw new AdminApiError(400, "invalid_tier_price", "This tier needs a positive NGN price before checkout can start.");
  }

  return tier;
}

function requirePaystackCheckoutTier(workspace: Workspace, tierId: string) {
  const tier = requireCheckoutTier(workspace, tierId);
  const billingTier = mapBillingTier(tier, planCodeForTier(tier));

  if (!billingTier.checkoutReady || !billingTier.paystackPlanCode) {
    throw new AdminApiError(
      400,
      "paystack_plan_missing",
      "This tier needs a Paystack plan code before checkout can start."
    );
  }

  return billingTier;
}

function requireSolanaCheckoutTier(workspace: Workspace, tierId: string) {
  return mapBillingTier(requireCheckoutTier(workspace, tierId));
}

function splitForWorkspace(workspace: Workspace, amountNgn: number) {
  const platformPercent = Math.min(Math.max(workspace.platformSplitPercent || 10, 0), 100);
  const influencerPercent = 100 - platformPercent;

  return {
    platformPercent,
    influencerPercent,
    platformAmountNgn: Math.round((amountNgn * platformPercent) / 100),
    influencerAmountNgn: Math.round((amountNgn * influencerPercent) / 100)
  };
}

function splitUsdcForWorkspace(workspace: Workspace, amountUsdc: number) {
  const platformPercent = Math.min(Math.max(workspace.platformSplitPercent || 10, 0), 100);
  const influencerPercent = 100 - platformPercent;

  return {
    platformPercent,
    influencerPercent,
    platformAmountUsdc: Number(((amountUsdc * platformPercent) / 100).toFixed(6)),
    influencerAmountUsdc: Number(((amountUsdc * influencerPercent) / 100).toFixed(6))
  };
}

function buildSolanaSettlementRecord({
  workspace,
  student,
  tier,
  paymentIntent,
  signature,
  verifiedAt
}: {
  workspace: Workspace;
  student: StudentAppProfile;
  tier: BillingTier;
  paymentIntent: SolanaPaymentIntent;
  signature: string;
  verifiedAt: string;
}): SolanaSettlementRecord {
  return stripUndefined({
    settlementId: solanaSettlementId(paymentIntent.paymentIntentId),
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.name,
    workspaceHandle: workspace.handle,
    studentId: student.studentId,
    studentDisplayName: student.displayName,
    studentEmail: student.email,
    tierId: tier.tierId,
    tierLabel: tier.name,
    paymentIntentId: paymentIntent.paymentIntentId,
    reference: paymentIntent.reference,
    status: "pending_payout" as const,
    amountNgn: paymentIntent.amountNgn,
    amountUsdc: paymentIntent.amountUsdc,
    split: paymentIntent.split,
    platformWallet: paymentIntent.platformWallet,
    influencerWallet: paymentIntent.influencerWallet,
    verifiedSignature: signature,
    solanaNetwork: paymentIntent.solanaNetwork,
    usdcMint: paymentIntent.usdcMint,
    fxRateSnapshot: paymentIntent.fxRateSnapshot,
    createdAt: verifiedAt,
    verifiedAt
  });
}

function requireSolanaWorkspaceEligibility(workspace: Workspace) {
  const readiness = getSolanaReadiness(workspace);

  if (!readiness.configured) {
    throw new AdminApiError(
      503,
      "solana_not_configured",
      `Solana Pay is missing required setup: ${readiness.missing.join(", ")}.`
    );
  }

  if (!readiness.eligible) {
    throw new AdminApiError(
      400,
      "solana_workspace_not_ready",
      "Solana Pay is not enabled for this approved workspace yet."
    );
  }

  return readiness;
}

export async function getStudentBillingOverview(
  actor: VerifiedStudent
): Promise<StudentBillingOverviewResponse> {
  const { workspace, student, subscription } = await loadStudentBillingContext(actor);
  const warnings: string[] = [];
  const tiers = mapWorkspaceTiers(workspace);
  const solana = getSolanaReadiness(workspace);

  if (!subscription) {
    warnings.push("No current subscription document exists yet for this student.");
  }

  if (!hasVerifiedPaystackRail(workspace)) {
    warnings.push("Paystack rail is not fully verified for this workspace yet.");
  }

  if (!tiers.some((tier) => tier.checkoutReady)) {
    warnings.push("No Paystack plan codes are available on workspace tiers yet.");
  }

  if (hasVerifiedSolanaRail(workspace) && !solana.configured) {
    warnings.push("Solana is approved for this workspace, but server-side Solana config is incomplete.");
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspace: {
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      handle: workspace.handle,
      paystackSplitReady: hasVerifiedPaystackRail(workspace),
      solanaReady: solana.eligible
    },
    student: {
      studentId: student.studentId,
      email: student.email || actor.email,
      displayName: student.displayName,
      tierId: student.tierId,
      tierLabel: student.tierLabel
    },
    paystack: getPaystackReadiness(),
    solana,
    currentSubscription: subscription,
    tiers
  };
}

export async function createStudentBillingCheckout(
  actor: VerifiedStudent,
  values: CheckoutValues
): Promise<StudentBillingCheckoutResponse> {
  const { db, workspace, student } = await loadStudentBillingContext(actor);
  const tier = requirePaystackCheckoutTier(workspace, values.tierId);
  const email = student.email || actor.email;

  if (!email) {
    throw new AdminApiError(400, "student_email_required", "This student account needs an email before checkout can start.");
  }

  const id = paymentIntentId();
  const reference = paymentReference();
  const now = nowIso();
  const expiresAt = addDays(new Date(now), 1).toISOString();
  const split = splitForWorkspace(workspace, tier.priceNgn);
  const intent: PaystackPaymentIntent = stripUndefined({
    paymentIntentId: id,
    rail: "paystack" as const,
    workspaceId: workspace.workspaceId,
    studentId: student.studentId,
    tierId: tier.tierId,
    status: "pending" as const,
    amountNgn: tier.priceNgn,
    split,
    createdAt: now,
    expiresAt,
    paystackReference: reference,
    paystackPlanCode: tier.paystackPlanCode,
    paystackSplitCode: workspace.paystackSplitCode
  });
  const intentRef = db.doc(`workspaces/${workspace.workspaceId}/payment_intents/${id}`);

  await intentRef.set(intent);

  try {
    const checkout = await initializePaystackTransaction(
      stripUndefined({
        email,
        amount: tier.priceNgn * 100,
        reference,
        callback_url: callbackUrl(reference),
        plan: tier.paystackPlanCode,
        split_code: workspace.paystackSplitCode,
        subaccount: workspace.paystackSplitCode ? undefined : workspace.paystackSubaccountCode,
        bearer: workspace.paystackSplitCode || workspace.paystackSubaccountCode ? "account" : undefined,
        metadata: {
          workspaceId: workspace.workspaceId,
          studentId: student.studentId,
          tierId: tier.tierId,
          paymentIntentId: id
        }
      })
    );
    const after = stripUndefined({
      status: "checkout_opened",
      paystackAccessCode: checkout.access_code,
      paystackAuthorizationUrl: checkout.authorization_url,
      updatedAt: nowIso()
    });
    const audit = auditEvent({
      actor,
      action: "billing.paystack.checkout_opened",
      targetType: "payment_intent",
      targetId: id,
      after: { reference, tierId: tier.tierId, amountNgn: tier.priceNgn }
    });
    const batch = db.batch();

    batch.set(intentRef, after, { merge: true });
    batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
    await batch.commit();

    return {
      ...createSourceMeta(),
      ok: true,
      checkout: {
        paymentIntentId: id,
        reference,
        authorizationUrl: checkout.authorization_url,
        accessCode: checkout.access_code,
        amountNgn: tier.priceNgn,
        currency: "NGN"
      }
    };
  } catch (error) {
    await intentRef.set(
      stripUndefined({
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Paystack checkout initialization failed.",
        updatedAt: nowIso()
      }),
      { merge: true }
    );
    throw error;
  }
}

async function findStudentIntentByReference(workspaceId: string, reference: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/payment_intents`)
    .where("paystackReference", "==", reference)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  if (!doc) {
    return null;
  }

  return {
    ref: doc.ref,
    intent: mapPaystackPaymentIntent(recordFromSnapshot(doc, "paymentIntentId"))
  };
}

async function findPlatformIntentByPaymentIntentId(paymentIntentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collectionGroup("payment_intents")
    .where("paymentIntentId", "==", paymentIntentId)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  if (!doc) {
    return null;
  }

  return {
    ref: doc.ref as DocumentReference<DocumentData>,
    record: recordFromSnapshot(doc, "paymentIntentId")
  };
}

async function loadExistingPaystackIntentContext(intent: PaystackPaymentIntent) {
  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot] = await Promise.all([
    db.doc(`workspaces/${intent.workspaceId}`).get(),
    db.doc(`workspaces/${intent.workspaceId}/students/${intent.studentId}`).get(),
    db.doc(`workspaces/${intent.workspaceId}/students/${intent.studentId}/subscriptions/current`).get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "The workspace for this payment intent no longer exists.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(404, "student_not_found", "The student for this payment intent no longer exists.");
  }

  const workspace = mapBillingWorkspace(workspaceSnapshot, intent.workspaceId);
  const studentRecord = recordFromSnapshot(studentSnapshot, "studentId");
  const workspaceTier = requireCheckoutTier(workspace, intent.tierId);
  const tier = mapBillingTier(workspaceTier, planCodeForTier(workspaceTier));
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    intent.workspaceId,
    intent.studentId
  );
  const student = buildStudentProfileForBilling({
    workspace,
    studentRecord,
    studentId: intent.studentId,
    claimedTierId: intent.tierId,
    subscription
  });

  return { db, workspace, student, tier, subscription };
}

async function applySuccessfulPayment({
  workspace,
  student,
  tier,
  paymentIntent,
  verification,
  actor,
  action
}: PaystackPaymentContext): Promise<StudentSubscription> {
  const { db } = getFirebaseAdminClients();
  const now = nowIso();
  const periodEnd =
    verification.subscription?.next_payment_date && Number.isFinite(Date.parse(verification.subscription.next_payment_date))
      ? new Date(verification.subscription.next_payment_date)
      : addBillingPeriod(new Date(now), tier.billingPeriod);
  const subscription: StudentSubscription = stripUndefined({
    workspaceId: workspace.workspaceId,
    studentId: student.studentId,
    tierId: tier.tierId,
    tierLabel: tier.name,
    status: cleanPaystackStatus(verification.subscription?.status),
    rail: "paystack",
    paystackCustomerCode: verification.customer?.customer_code,
    paystackSubscriptionCode: verification.subscription?.subscription_code,
    paystackEmailToken: verification.subscription?.email_token,
    currentPeriodStart: verification.paid_at || now,
    currentPeriodEnd: periodEnd.toISOString(),
    nextPaymentDate: verification.subscription?.next_payment_date,
    latestPaymentIntentId: paymentIntent.paymentIntentId,
    latestReference: paymentIntent.paystackReference,
    lastVerifiedAt: now,
    createdAt: paymentIntent.createdAt,
    updatedAt: now
  });
  await assertWorkspacePackageAllowsStudentActivation(workspace, student.studentId);
  const audit = auditEvent({
    actor,
    action,
    targetType: "subscription",
    targetId: `${workspace.workspaceId}_${student.studentId}`,
    after: {
      tierId: tier.tierId,
      status: subscription.status,
      reference: paymentIntent.paystackReference
    },
    now
  });
  const batch = db.batch();

  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/students/${student.studentId}/subscriptions/current`),
    subscription,
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/students/${student.studentId}`),
    stripUndefined({
      status: "active",
      subscriptionStatus: subscription.status,
      tierId: tier.tierId,
      tierLabel: tier.name,
      paymentRail: "paystack",
      paystackCustomerCode: subscription.paystackCustomerCode,
      paystackSubscriptionCode: subscription.paystackSubscriptionCode,
      updatedAt: now
    }),
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/payment_intents/${paymentIntent.paymentIntentId}`),
    stripUndefined({
      status: "verified",
      verifiedAt: now,
      paystackCustomerCode: subscription.paystackCustomerCode,
      paystackSubscriptionCode: subscription.paystackSubscriptionCode,
      updatedAt: now
    }),
    { merge: true }
  );
  batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
  await batch.commit();

  return subscription;
}

async function applySuccessfulSolanaPayment({
  workspace,
  student,
  tier,
  paymentIntent,
  signature,
  actor,
  action
}: SolanaPaymentContext): Promise<StudentSubscription> {
  const { db } = getFirebaseAdminClients();
  const now = nowIso();
  const periodEnd = addBillingPeriod(new Date(now), tier.billingPeriod);
  const settlement = buildSolanaSettlementRecord({
    workspace,
    student,
    tier,
    paymentIntent,
    signature,
    verifiedAt: now
  });
  const subscription: StudentSubscription = stripUndefined({
    workspaceId: workspace.workspaceId,
    studentId: student.studentId,
    tierId: tier.tierId,
    tierLabel: tier.name,
    status: "active" as const,
    rail: "solana" as const,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd.toISOString(),
    nextPaymentDate: periodEnd.toISOString(),
    latestPaymentIntentId: paymentIntent.paymentIntentId,
    latestReference: paymentIntent.reference,
    latestSignature: signature,
    lastVerifiedAt: now,
    createdAt: paymentIntent.createdAt,
    updatedAt: now
  });
  await assertWorkspacePackageAllowsStudentActivation(workspace, student.studentId);
  const audit = auditEvent({
    actor,
    action,
    targetType: "subscription",
    targetId: `${workspace.workspaceId}_${student.studentId}`,
    after: {
      tierId: tier.tierId,
      status: subscription.status,
      rail: "solana",
      reference: paymentIntent.reference,
      signature
    },
    now
  });
  const settlementAudit = auditEvent({
    actor,
    action: "billing.solana.settlement_recorded",
    targetType: "solana_settlement",
    targetId: settlement.settlementId,
    after: {
      paymentIntentId: paymentIntent.paymentIntentId,
      status: settlement.status,
      amountUsdc: settlement.amountUsdc,
      platformAmountUsdc: settlement.split.platformAmountUsdc,
      influencerAmountUsdc: settlement.split.influencerAmountUsdc
    },
    now
  });
  const batch = db.batch();

  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/students/${student.studentId}/subscriptions/current`),
    subscription,
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/students/${student.studentId}`),
    stripUndefined({
      status: "active",
      subscriptionStatus: subscription.status,
      tierId: tier.tierId,
      tierLabel: tier.name,
      paymentRail: "solana",
      updatedAt: now
    }),
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/payment_intents/${paymentIntent.paymentIntentId}`),
    stripUndefined({
      status: "verified",
      verifiedAt: now,
      verifiedSignature: signature,
      settlementId: settlement.settlementId,
      settlementStatus: settlement.status,
      updatedAt: now
    }),
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${workspace.workspaceId}/solana_settlements/${settlement.settlementId}`),
    settlement,
    { merge: true }
  );
  batch.set(db.doc(`solana_settlements/${settlement.settlementId}`), settlement, { merge: true });
  batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
  batch.set(db.doc(`audit_log/${settlementAudit.eventId}`), settlementAudit);
  await batch.commit();

  return subscription;
}

export async function createStudentSolanaCheckout(
  actor: VerifiedStudent,
  values: CheckoutValues
): Promise<StudentSolanaCheckoutResponse> {
  const { db, workspace, student } = await loadStudentBillingContext(actor);
  requireSolanaWorkspaceEligibility(workspace);
  const config = requireSolanaConfig();
  const tier = requireSolanaCheckoutTier(workspace, values.tierId);
  const amountUsdc = quoteUsdcFromNgn(tier.priceNgn, config.fxRate);
  const influencerWallet = workspace.solanaPayoutWallet ?? "";
  const platformTokenBalanceBeforeRaw = await getOwnerUsdcBalanceSnapshot(
    config.platformWallet,
    config.usdcMint
  );

  if (!amountUsdc || amountUsdc <= 0) {
    throw new AdminApiError(400, "invalid_solana_quote", "TradeHub could not create a valid USDC quote for this tier.");
  }

  const id = paymentIntentId();
  const reference = createSolanaReference();
  const now = nowIso();
  const quoteExpiresAt = new Date(new Date(now).getTime() + config.quoteTtlSeconds * 1000).toISOString();
  const split = splitUsdcForWorkspace(workspace, amountUsdc);
  const solanaPayUrl = buildSolanaPayUrl({
    recipient: config.platformWallet,
    amountUsdc,
    usdcMint: config.usdcMint,
    reference,
    label: "TradeHub",
    message: `${workspace.name} ${tier.name} subscription`,
    memo: `tradehub:${workspace.workspaceId}:${student.studentId}:${id}`
  });
  const intent: SolanaPaymentIntent = stripUndefined({
    paymentIntentId: id,
    rail: "solana" as const,
    workspaceId: workspace.workspaceId,
    studentId: student.studentId,
    tierId: tier.tierId,
    status: "pending" as const,
    amountNgn: tier.priceNgn,
    amountUsdc,
    fxRateSnapshot: config.fxRate,
    reference,
    solanaPayUrl,
    influencerWallet,
    platformWallet: config.platformWallet,
    platformTokenBalanceBeforeRaw,
    split,
    quoteExpiresAt,
    expiresAt: quoteExpiresAt,
    solanaNetwork: config.network,
    usdcMint: config.usdcMint,
    createdAt: now
  });
  const audit = auditEvent({
    actor,
    action: "billing.solana.quote_created",
    targetType: "payment_intent",
    targetId: id,
    after: {
      tierId: tier.tierId,
      amountNgn: tier.priceNgn,
      amountUsdc,
      reference
    },
    now
  });
  const batch = db.batch();

  batch.set(db.doc(`workspaces/${workspace.workspaceId}/payment_intents/${id}`), intent);
  batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
  await batch.commit();

  return {
    ...createSourceMeta(),
    ok: true,
    checkout: {
      paymentIntentId: id,
      reference,
      solanaPayUrl,
      amountNgn: tier.priceNgn,
      amountUsdc,
      fxRateSnapshot: config.fxRate,
      quoteExpiresAt,
      platformWallet: config.platformWallet,
      influencerWallet,
      usdcMint: config.usdcMint,
      network: config.network
    }
  };
}

export async function verifyStudentSolanaCheckout({
  actor,
  paymentIntentId,
  signature
}: {
  actor: VerifiedStudent;
  paymentIntentId: string;
  signature?: string;
}): Promise<StudentSolanaVerifyResponse> {
  const { db, workspace, student, subscription: currentSubscription } = await loadStudentBillingContext(actor);
  const intentRef = db.doc(`workspaces/${workspace.workspaceId}/payment_intents/${paymentIntentId}`);
  const snapshot = await intentRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "payment_intent_not_found", "TradeHub could not find that Solana payment intent.");
  }

  const intent = mapSolanaPaymentIntent(recordFromSnapshot(snapshot, "paymentIntentId"));

  if (intent.rail !== "solana" || intent.studentId !== student.studentId) {
    throw new AdminApiError(403, "payment_intent_scope_mismatch", "That Solana payment intent belongs to another student.");
  }

  const tier = requireSolanaCheckoutTier(workspace, intent.tierId);

  if (intent.status === "verified") {
    let nextIntent = intent;

    if (!intent.settlementId && intent.verifiedSignature) {
      const settlement = buildSolanaSettlementRecord({
        workspace,
        student,
        tier,
        paymentIntent: intent,
        signature: intent.verifiedSignature,
        verifiedAt: intent.verifiedAt ?? currentSubscription?.lastVerifiedAt ?? nowIso()
      });
      const audit = auditEvent({
        actor,
        action: "billing.solana.settlement_backfilled",
        targetType: "solana_settlement",
        targetId: settlement.settlementId,
        after: {
          paymentIntentId: intent.paymentIntentId,
          status: settlement.status,
          amountUsdc: settlement.amountUsdc
        },
        now: settlement.verifiedAt
      });
      const batch = db.batch();

      batch.set(
        db.doc(`workspaces/${workspace.workspaceId}/solana_settlements/${settlement.settlementId}`),
        settlement,
        { merge: true }
      );
      batch.set(db.doc(`solana_settlements/${settlement.settlementId}`), settlement, { merge: true });
      batch.set(
        intentRef,
        stripUndefined({
          settlementId: settlement.settlementId,
          settlementStatus: settlement.status,
          updatedAt: settlement.verifiedAt
        }),
        { merge: true }
      );
      batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
      await batch.commit();

      nextIntent = {
        ...intent,
        settlementId: settlement.settlementId,
        settlementStatus: settlement.status
      };
    }

    return {
      ...createSourceMeta(),
      ok: true,
      status: "verified",
      paymentIntent: nextIntent,
      subscription: currentSubscription,
      message: "This Solana payment intent was already verified."
    };
  }

  if (Date.now() > Date.parse(intent.quoteExpiresAt)) {
    await intentRef.set(
      stripUndefined({
        status: "expired",
        failureReason: "Solana quote expired before verification.",
        updatedAt: nowIso()
      }),
      { merge: true }
    );

    return {
      ...createSourceMeta(),
      ok: true,
      status: "expired",
      paymentIntent: { ...intent, status: "expired", failureReason: "Solana quote expired before verification." },
      subscription: currentSubscription,
      message: "This Solana quote expired. Create a fresh quote before paying."
    };
  }

  try {
    const result = await verifySolanaPaymentIntent(intent, signature);

    if (result.status === "pending") {
      return {
        ...createSourceMeta(),
        ok: true,
        status: "pending",
        paymentIntent: intent,
        subscription: currentSubscription,
        message: result.message
      };
    }

    const nextSubscription = await applySuccessfulSolanaPayment({
      workspace,
      student,
      tier,
      paymentIntent: intent,
      signature: result.signature,
      actor,
      action: "billing.solana.payment_verified"
    });

    return {
      ...createSourceMeta(),
      ok: true,
      status: "verified",
      paymentIntent: {
        ...intent,
        status: "verified",
        verifiedAt: nextSubscription.lastVerifiedAt,
        verifiedSignature: result.signature
      },
      subscription: nextSubscription,
      message: result.message
    };
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 400) {
      await intentRef.set(
        stripUndefined({
          status: "failed",
          failureReason: error.message,
          updatedAt: nowIso()
        }),
        { merge: true }
      );

      return {
        ...createSourceMeta(),
        ok: true,
        status: "failed",
        paymentIntent: { ...intent, status: "failed", failureReason: error.message },
        subscription: currentSubscription,
        message: error.message
      };
    }

    throw error;
  }
}

export async function verifyStudentBillingReference(
  actor: VerifiedStudent,
  reference: string
): Promise<StudentBillingVerifyResponse> {
  const { workspace, student } = await loadStudentBillingContext(actor);
  const intentResult = await findStudentIntentByReference(workspace.workspaceId, reference);

  if (!intentResult) {
    throw new AdminApiError(404, "payment_intent_not_found", "TradeHub could not find that payment intent.");
  }

  if (intentResult.intent.studentId !== student.studentId) {
    throw new AdminApiError(403, "payment_intent_scope_mismatch", "That payment intent belongs to another student.");
  }

  const verification = await verifyPaystackTransaction(reference);
  const tier = requirePaystackCheckoutTier(workspace, intentResult.intent.tierId);

  if (verification.currency !== "NGN" || verification.amount !== tier.priceNgn * 100) {
    await intentResult.ref.set(
      stripUndefined({
        status: "failed",
        failureReason: "Verified Paystack amount or currency did not match the checkout intent.",
        updatedAt: nowIso()
      }),
      { merge: true }
    );
    throw new AdminApiError(
      400,
      "payment_verification_mismatch",
      "Paystack verified a transaction that does not match this TradeHub checkout."
    );
  }

  if (verification.status !== "success") {
    await intentResult.ref.set(
      stripUndefined({
        status: "failed",
        failureReason: `Paystack status: ${verification.status}`,
        updatedAt: nowIso()
      }),
      { merge: true }
    );

    return {
      ...createSourceMeta(),
      ok: true,
      status: "failed",
      paymentIntent: {
        ...intentResult.intent,
        status: "failed",
        failureReason: `Paystack status: ${verification.status}`
      },
      subscription: null,
      message: "Paystack did not report this transaction as successful."
    };
  }

  const subscription = await applySuccessfulPayment({
    workspace,
    student,
    tier,
    paymentIntent: intentResult.intent,
    verification,
    actor,
    action: "billing.paystack.reference_verified"
  });

  return {
    ...createSourceMeta(),
    ok: true,
    status: "verified",
    paymentIntent: {
      ...intentResult.intent,
      status: "verified",
      verifiedAt: subscription.lastVerifiedAt,
      paystackCustomerCode: subscription.paystackCustomerCode,
      paystackSubscriptionCode: subscription.paystackSubscriptionCode
    },
    subscription,
    message: "Payment verified. Subscription access has been updated."
  };
}

async function writePaymentIntentAudit({
  actor,
  action,
  paymentIntentId,
  before,
  after
}: {
  actor: BillingActor;
  action: string;
  paymentIntentId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const { db } = getFirebaseAdminClients();
  const audit = auditEvent({
    actor,
    action,
    targetType: "payment_intent",
    targetId: paymentIntentId,
    before,
    after
  });

  await db.doc(`audit_log/${audit.eventId}`).set(audit);
}

export async function reconcilePaystackPaymentIntent(
  actor: VerifiedSuperAdmin,
  paymentIntentId: string
): Promise<AdminPaystackReconcileResponse> {
  const match = await findPlatformIntentByPaymentIntentId(paymentIntentId);

  if (!match) {
    throw new AdminApiError(404, "payment_intent_not_found", "TradeHub could not find that payment intent.");
  }

  if (asString(match.record.rail, "paystack") !== "paystack") {
    throw new AdminApiError(400, "not_paystack_intent", "Only Paystack payment intents can use this reconcile action.");
  }

  const intent = mapPaystackPaymentIntent(match.record);
  const { workspace, student, tier, subscription } = await loadExistingPaystackIntentContext(intent);

  if (intent.status === "verified") {
    await writePaymentIntentAudit({
      actor,
      action: "billing.paystack.admin_reconcile_already_verified",
      paymentIntentId: intent.paymentIntentId,
      before: { status: intent.status },
      after: { status: intent.status, reference: intent.paystackReference }
    });

    return {
      ...createSourceMeta(),
      ok: true,
      status: "already_verified",
      message: "This Paystack intent was already verified. No billing state was changed.",
      paymentIntent: intent,
      subscription
    };
  }

  const verification = await verifyPaystackTransaction(intent.paystackReference);
  const mismatch = verification.currency !== "NGN" || verification.amount !== intent.amountNgn * 100;

  if (mismatch) {
    const now = nowIso();
    const failureReason = "Paystack verified a different amount or currency than this TradeHub intent.";
    const nextIntent = {
      ...intent,
      status: "failed" as const,
      failureReason
    };
    const audit = auditEvent({
      actor,
      action: "billing.paystack.admin_reconcile_mismatch",
      targetType: "payment_intent",
      targetId: intent.paymentIntentId,
      before: { status: intent.status, amountNgn: intent.amountNgn },
      after: {
        status: nextIntent.status,
        paystackAmount: verification.amount,
        paystackCurrency: verification.currency
      },
      now
    });
    const batch = getFirebaseAdminClients().db.batch();

    batch.set(match.ref, stripUndefined({ status: "failed", failureReason, updatedAt: now }), { merge: true });
    batch.set(getFirebaseAdminClients().db.doc(`audit_log/${audit.eventId}`), audit);
    await batch.commit();

    return {
      ...createSourceMeta(["Reconciliation failed because Paystack returned a different amount or currency."]),
      ok: true,
      status: "failed",
      message: failureReason,
      paymentIntent: nextIntent,
      subscription
    };
  }

  if (verification.status !== "success") {
    const now = nowIso();
    const explicitFailure = ["failed", "abandoned", "cancelled"].includes(verification.status);
    const nextStatus = explicitFailure ? "failed" : "pending";
    const failureReason = `Paystack status: ${verification.status}`;
    const audit = auditEvent({
      actor,
      action: "billing.paystack.admin_reconcile_not_success",
      targetType: "payment_intent",
      targetId: intent.paymentIntentId,
      before: { status: intent.status },
      after: { status: nextStatus, paystackStatus: verification.status },
      now
    });
    const batch = getFirebaseAdminClients().db.batch();

    batch.set(
      match.ref,
      stripUndefined({
        status: nextStatus,
        failureReason,
        updatedAt: now
      }),
      { merge: true }
    );
    batch.set(getFirebaseAdminClients().db.doc(`audit_log/${audit.eventId}`), audit);
    await batch.commit();

    return {
      ...createSourceMeta([
        explicitFailure
          ? "Paystack returned a final non-success status."
          : "Paystack has not confirmed success yet. Leave access unchanged and retry later."
      ]),
      ok: true,
      status: nextStatus,
      message:
        nextStatus === "failed"
          ? "Paystack returned a final non-success status. TradeHub marked the intent failed."
          : "Paystack has not confirmed success yet. No subscription state was changed.",
      paymentIntent: {
        ...intent,
        status: nextStatus,
        failureReason
      },
      subscription
    };
  }

  const nextSubscription = await applySuccessfulPayment({
    workspace,
    student,
    tier,
    paymentIntent: intent,
    verification,
    actor,
    action: "billing.paystack.admin_reconcile_verified"
  });

  return {
    ...createSourceMeta(),
    ok: true,
    status: "verified",
    message: "Paystack confirmed success. TradeHub updated the subscription idempotently.",
    paymentIntent: {
      ...intent,
      status: "verified",
      verifiedAt: nextSubscription.lastVerifiedAt,
      paystackCustomerCode: nextSubscription.paystackCustomerCode,
      paystackSubscriptionCode: nextSubscription.paystackSubscriptionCode
    },
    subscription: nextSubscription
  };
}

export async function updateSolanaSettlementStatus(
  actor: VerifiedSuperAdmin,
  settlementId: string,
  patch: SolanaSettlementPatchPayload
): Promise<AdminSolanaSettlementUpdateResponse> {
  const { db } = getFirebaseAdminClients();
  const settlementRef = db.doc(`solana_settlements/${settlementId}`);
  const snapshot = await settlementRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "settlement_not_found", "TradeHub could not find that Solana settlement record.");
  }

  const settlement = mapSolanaSettlementRecord(recordFromSnapshot(snapshot, "settlementId"));
  const now = nowIso();
  const update: Record<string, unknown> = stripUndefined({
    status: patch.status,
    payoutNote: patch.payoutNote ?? settlement.payoutNote,
    payoutSignature: patch.status === "settled"
      ? patch.payoutSignature ?? settlement.payoutSignature
      : patch.payoutSignature ?? null,
    payoutCompletedAt: patch.status === "settled" ? now : null,
    updatedAt: now
  });
  const nextSettlement = mapSolanaSettlementRecord({
    ...settlement,
    ...update
  });
  const audit = auditEvent({
    actor,
    action: "billing.solana.settlement_ops_updated",
    targetType: "solana_settlement",
    targetId: settlement.settlementId,
    before: {
      status: settlement.status,
      payoutCompletedAt: settlement.payoutCompletedAt,
      payoutSignature: settlement.payoutSignature
    },
    after: {
      status: nextSettlement.status,
      payoutCompletedAt: nextSettlement.payoutCompletedAt,
      payoutSignature: nextSettlement.payoutSignature,
      payoutNote: nextSettlement.payoutNote
    },
    now
  });
  const batch = db.batch();

  batch.set(settlementRef, update, { merge: true });
  batch.set(
    db.doc(`workspaces/${settlement.workspaceId}/solana_settlements/${settlement.settlementId}`),
    update,
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${settlement.workspaceId}/payment_intents/${settlement.paymentIntentId}`),
    stripUndefined({
      settlementStatus: patch.status,
      updatedAt: now
    }),
    { merge: true }
  );
  batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
  await batch.commit();

  return {
    ...createSourceMeta(),
    ok: true,
    message:
      patch.status === "settled"
        ? "Settlement marked settled for ops tracking. No on-chain payout was sent by TradeHub."
        : "Settlement ops state updated. No on-chain payout automation was triggered.",
    settlement: nextSettlement
  };
}

function verifiedAtOrCreatedAt(intent: PaymentIntent) {
  return intent.verifiedAt ?? intent.createdAt;
}

async function listLatestWorkspaceVerifiedPaymentIntents(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/payment_intents`)
    .where("status", "==", "verified")
    .limit(PAYMENT_INTENT_PAGE_SIZE * 4)
    .get();

  return snapshot.docs
    .map((doc) => mapPaymentIntent(recordFromSnapshot(doc, "paymentIntentId")))
    .filter((intent) => intent.status === "verified")
    .sort((left, right) => verifiedAtOrCreatedAt(right).localeCompare(verifiedAtOrCreatedAt(left)))
    .slice(0, PAYMENT_INTENT_PAGE_SIZE);
}

async function listLatestWorkspaceSolanaSettlements(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/solana_settlements`)
    .orderBy("verifiedAt", "desc")
    .limit(PAYMENT_INTENT_PAGE_SIZE)
    .get();

  return snapshot.docs.map((doc) => mapSolanaSettlementRecord(recordFromSnapshot(doc, "settlementId")));
}

async function listLatestPlatformSolanaSettlements() {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection("solana_settlements")
    .orderBy("verifiedAt", "desc")
    .limit(PAYMENT_INTENT_PAGE_SIZE)
    .get();

  return snapshot.docs.map((doc) => mapSolanaSettlementRecord(recordFromSnapshot(doc, "settlementId")));
}

async function listLatestPaystackWebhookReceipts() {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection("paystack_webhooks")
    .orderBy("receivedAt", "desc")
    .limit(WEBHOOK_RECEIPT_PAGE_SIZE)
    .get();

  return snapshot.docs.map((doc) => mapPaystackWebhookReceipt(recordFromSnapshot(doc, "eventId")));
}

function summarizePaymentOps({
  latestPaymentIntents,
  latestSolanaSettlements,
  paymentSupportQueue
}: {
  latestPaymentIntents: PaymentIntent[];
  latestSolanaSettlements: SolanaSettlementRecord[];
  paymentSupportQueue: AdminPaymentSupportQueueItem[];
}) {
  const latest = latestPaymentIntents[0];

  return {
    latestIntentCount: latestPaymentIntents.length,
    verifiedPaystackCount: latestPaymentIntents.filter(
      (intent) => intent.rail === "paystack" && intent.status === "verified"
    ).length,
    verifiedSolanaCount: latestPaymentIntents.filter(
      (intent) => intent.rail === "solana" && intent.status === "verified"
    ).length,
    pendingSolanaPayoutCount: latestSolanaSettlements.filter(
      (settlement) => settlement.status === "pending_payout"
    ).length,
    paymentSupportQueueCount: paymentSupportQueue.length,
    pendingPaystackVerificationCount: paymentSupportQueue.filter(
      (item) => item.kind === "pending_paystack_verification"
    ).length,
    failedVerificationCount: paymentSupportQueue.filter(
      (item) => item.kind === "failed_verification"
    ).length,
    stalePendingIntentCount: paymentSupportQueue.filter(
      (item) => item.kind === "stale_pending_intent"
    ).length,
    subscriptionMismatchCount: paymentSupportQueue.filter(
      (item) => item.kind === "subscription_access_mismatch"
    ).length,
    latestAmountNgn: latest?.amountNgn,
    latestAmountUsdc: latest?.rail === "solana" ? latest.amountUsdc : undefined,
    latestRail: latest?.rail
  };
}

function safeOpsDigest(value: string, prefix: string) {
  const digest = crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);

  return `${prefix}_${digest}`;
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function isPendingIntent(intent: PaymentIntent) {
  return intent.status === "pending" || intent.status === "checkout_opened";
}

function isStalePendingIntent(intent: PaymentIntent, now: Date) {
  if (!isPendingIntent(intent)) {
    return false;
  }

  const expiresAt = Date.parse(intent.expiresAt);
  const createdAt = Date.parse(intent.createdAt);
  const ageMs = Number.isFinite(createdAt) ? now.getTime() - createdAt : 0;

  return (Number.isFinite(expiresAt) && expiresAt < now.getTime()) || ageMs > 24 * 60 * 60 * 1000;
}

function buildAdminPaymentSupportQueue({
  latestPaymentIntents,
  latestSolanaSettlements
}: {
  latestPaymentIntents: PaymentIntent[];
  latestSolanaSettlements: SolanaSettlementRecord[];
}): AdminPaymentSupportQueueItem[] {
  const now = new Date();
  const queue: AdminPaymentSupportQueueItem[] = [];

  for (const intent of latestPaymentIntents) {
    if (intent.rail === "paystack" && intent.failureReason?.toLowerCase().includes("different amount")) {
      queue.push({
        queueItemId: safeOpsDigest(`mismatch:${intent.paymentIntentId}`, "payq"),
        kind: "subscription_access_mismatch",
        rail: intent.rail,
        severity: "high",
        statusLabel: statusLabel(intent.status),
        issueLabel: "Payment mismatch / needs admin review",
        supportCopy: "Provider confirmation did not match the TradeHub intent. Keep access unchanged until Super Admin review.",
        safePaymentRef: safeOpsDigest(intent.paymentIntentId, "intent"),
        maskedWorkspaceRef: safeOpsDigest(intent.workspaceId, "ws"),
        maskedStudentRef: safeOpsDigest(intent.studentId, "student"),
        amountNgn: intent.amountNgn,
        createdAt: intent.createdAt,
        actionHint: "Use Paystack reconcile/audit recheck. Do not grant access from workspace UI."
      });
      continue;
    }

    if (intent.rail === "paystack" && isStalePendingIntent(intent, now)) {
      queue.push({
        queueItemId: safeOpsDigest(`stale:${intent.paymentIntentId}`, "payq"),
        kind: "stale_pending_intent",
        rail: intent.rail,
        severity: "high",
        statusLabel: statusLabel(intent.status),
        issueLabel: "Stale pending intent",
        supportCopy: "Checkout is still pending after the bounded ops window. Recheck before advising the student.",
        safePaymentRef: safeOpsDigest(intent.paymentIntentId, "intent"),
        maskedWorkspaceRef: safeOpsDigest(intent.workspaceId, "ws"),
        maskedStudentRef: safeOpsDigest(intent.studentId, "student"),
        amountNgn: intent.amountNgn,
        createdAt: intent.createdAt,
        actionHint: "Request manual recheck through existing Paystack reconciliation."
      });
      continue;
    }

    if (intent.rail === "paystack" && isPendingIntent(intent)) {
      queue.push({
        queueItemId: safeOpsDigest(`pending:${intent.paymentIntentId}`, "payq"),
        kind: "pending_paystack_verification",
        rail: intent.rail,
        severity: "medium",
        statusLabel: statusLabel(intent.status),
        issueLabel: "Pending Paystack verification",
        supportCopy: "Payment is not verified yet. Student-facing checkout behavior remains unchanged.",
        safePaymentRef: safeOpsDigest(intent.paymentIntentId, "intent"),
        maskedWorkspaceRef: safeOpsDigest(intent.workspaceId, "ws"),
        maskedStudentRef: safeOpsDigest(intent.studentId, "student"),
        amountNgn: intent.amountNgn,
        createdAt: intent.createdAt,
        actionHint: "Use existing reconcile when an operator needs to recheck Paystack."
      });
      continue;
    }

    if (
      intent.rail === "paystack" &&
      (intent.status === "failed" ||
        intent.status === "expired" ||
        intent.status === "cancelled" ||
        intent.status === "abandoned")
    ) {
      queue.push({
        queueItemId: safeOpsDigest(`failed:${intent.paymentIntentId}`, "payq"),
        kind: "failed_verification",
        rail: intent.rail,
        severity: intent.status === "failed" ? "high" : "medium",
        statusLabel: statusLabel(intent.status),
        issueLabel: "Failed verification",
        supportCopy: "Payment did not verify successfully. Do not change entitlement from this queue.",
        safePaymentRef: safeOpsDigest(intent.paymentIntentId, "intent"),
        maskedWorkspaceRef: safeOpsDigest(intent.workspaceId, "ws"),
        maskedStudentRef: safeOpsDigest(intent.studentId, "student"),
        amountNgn: intent.amountNgn,
        createdAt: intent.createdAt,
        actionHint: "Use existing Paystack reconcile only when a manual recheck is warranted."
      });
    }
  }

  for (const settlement of latestSolanaSettlements) {
    if (settlement.status !== "pending_payout") {
      continue;
    }

    queue.push({
      queueItemId: safeOpsDigest(`solana:${settlement.settlementId}`, "payq"),
      kind: "solana_settlement_review",
      rail: "solana",
      severity: "medium",
      statusLabel: statusLabel(settlement.status),
      issueLabel: "Solana settlement review",
      supportCopy: "Verified USDC payment needs settlement review. This queue does not initiate payouts.",
      safePaymentRef: safeOpsDigest(settlement.settlementId, "solset"),
      maskedWorkspaceRef: safeOpsDigest(settlement.workspaceId, "ws"),
      maskedStudentRef: safeOpsDigest(settlement.studentId, "student"),
      amountNgn: settlement.amountNgn,
      amountUsdc: settlement.amountUsdc,
      createdAt: settlement.verifiedAt,
      actionHint: "Use the existing Solana settlement ledger for bounded internal notes/status."
    });
  }

  return queue
    .sort((left, right) => {
      const severityRank = { high: 3, medium: 2, low: 1 };
      const severityDelta = severityRank[right.severity] - severityRank[left.severity];

      return severityDelta || right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, 12);
}

function describeAdminPaymentsQueryError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("requires an index")) {
      return `${fallback} Firestore still needs the matching index deployed. See firestore.indexes.json before retrying this feed.`;
    }

    return `${fallback} ${error.message}`;
  }

  return fallback;
}

export async function getWorkspaceBillingOverview(
  actor: VerifiedInfluencer
): Promise<WorkspaceBillingOverviewResponse> {
  const { db } = getFirebaseAdminClients();
  const workspaceSnapshot = await db.doc(`workspaces/${actor.workspaceId}`).get();

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This workspace has not been prepared yet.");
  }

  const workspace = mapBillingWorkspace(workspaceSnapshot, actor.workspaceId);
  const latestPaymentIntents = await listLatestWorkspaceVerifiedPaymentIntents(actor.workspaceId);
  const latestSolanaSettlements = (await listLatestWorkspaceSolanaSettlements(actor.workspaceId))
    .filter((settlement) => settlement.status !== "cancelled");
  const tiers = mapWorkspaceTiers(workspace);
  const solana = getSolanaReadiness(workspace);
  const warnings: string[] = [];

  if (!hasVerifiedPaystackRail(workspace)) {
    warnings.push("Paystack split or subaccount is not fully verified yet.");
  }

  if (!tiers.some((tier) => tier.checkoutReady)) {
    warnings.push("No workspace tier has a Paystack plan code yet.");
  }

  if (hasVerifiedSolanaRail(workspace) && !solana.configured) {
    warnings.push("Solana is approved for this workspace, but server-side Solana config is incomplete.");
  }

  if (latestPaymentIntents.length === 0) {
    warnings.push(
      "No verified student payments exist yet for this workspace. Pending, expired, and failed intents stay in super-admin payment ops."
    );
  }

  if (hasVerifiedSolanaRail(workspace) && latestSolanaSettlements.length === 0) {
    warnings.push("No verified Solana settlement records exist yet for this workspace.");
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    paystack: getPaystackReadiness(),
    solana,
    workspace: {
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      handle: workspace.handle,
      paystackSplitReady: hasVerifiedPaystackRail(workspace),
      solanaReady: solana.eligible
    },
    tiers,
    latestPaymentIntents,
    latestSolanaSettlements,
    warnings
  };
}

export async function getAdminPaymentsOverview(
  actor: VerifiedSuperAdmin
): Promise<AdminPaymentsOverviewResponse> {
  void actor;

  const { db } = getFirebaseAdminClients();
  let latestPaymentIntents: PaymentIntent[] = [];
  let latestSolanaSettlements: SolanaSettlementRecord[] = [];
  let latestWebhookReceipts: PaystackWebhookReceipt[] = [];
  const warnings: string[] = [];

  try {
    const query: Query<DocumentData> = db.collectionGroup("payment_intents").orderBy("createdAt", "desc");
    const snapshot = await query.limit(PAYMENT_INTENT_PAGE_SIZE).get();
    latestPaymentIntents = snapshot.docs.map((doc) =>
      mapPaymentIntent(recordFromSnapshot(doc, "paymentIntentId"))
    );
  } catch (error) {
    warnings.push(
      describeAdminPaymentsQueryError(
        error,
        "TradeHub could not load the latest payment intent feed."
      )
    );
  }

  try {
    latestSolanaSettlements = await listLatestPlatformSolanaSettlements();
  } catch (error) {
    warnings.push(
      describeAdminPaymentsQueryError(
        error,
        "TradeHub could not load the Solana settlement ledger."
      )
    );
  }

  try {
    latestWebhookReceipts = await listLatestPaystackWebhookReceipts();
  } catch (error) {
    warnings.push(
      describeAdminPaymentsQueryError(
        error,
        "TradeHub could not load recent Paystack webhook receipts."
      )
    );
  }

  if (!latestPaymentIntents.length) {
    warnings.push("No payment intents have been created yet. This overview stays limited instead of scanning billing data.");
  }

  if (!latestSolanaSettlements.length) {
    warnings.push("No verified Solana settlement records exist yet. Payout ops will appear here after a verified USDC payment.");
  }

  const paymentSupportQueue = buildAdminPaymentSupportQueue({
    latestPaymentIntents,
    latestSolanaSettlements
  });

  return {
    ...createSourceMeta(warnings),
    ok: true,
    paystack: getPaystackReadiness(),
    solana: getSolanaReadiness(),
    opsSummary: summarizePaymentOps({ latestPaymentIntents, latestSolanaSettlements, paymentSupportQueue }),
    paymentSupportQueue,
    latestPaymentIntents,
    latestSolanaSettlements,
    latestWebhookReceipts,
    warnings
  };
}

function receiptIdForWebhook(payload: PaystackWebhookPayload) {
  const event = asString(payload.event, "unknown_event");
  const data = asRecord(payload.data);
  const fingerprint =
    asString(data.id) ||
    asString(data.reference) ||
    asString(data.invoice_code) ||
    asString(data.subscription_code) ||
    crypto.randomUUID();

  return `paystack_${event}_${fingerprint}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

async function recordWebhookReceipt(receipt: PaystackWebhookReceipt) {
  const { db } = getFirebaseAdminClients();
  const audit = auditEvent({
    action: receipt.processed ? "billing.paystack.webhook_processed" : "billing.paystack.webhook_received",
    targetType: "paystack_webhook",
    targetId: receipt.eventId,
    after: {
      event: receipt.event,
      reference: receipt.reference,
      workspaceId: receipt.workspaceId,
      studentId: receipt.studentId,
      processed: receipt.processed
    }
  });
  const batch = db.batch();

  batch.set(db.doc(`paystack_webhooks/${receipt.eventId}`), stripUndefined(receipt));
  batch.set(db.doc(`audit_log/${audit.eventId}`), audit);
  await batch.commit();
}

async function applyWebhookChargeSuccess(payload: PaystackWebhookPayload, receipt: PaystackWebhookReceipt) {
  const data = asRecord(payload.data);
  const metadata = safeMetadata(data.metadata);
  const workspaceId = metadata.workspaceId;
  const studentId = metadata.studentId;
  const reference = asString(data.reference);

  if (!workspaceId || !studentId || !reference) {
    return false;
  }

  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, studentSnapshot, intentResult] = await Promise.all([
    db.doc(`workspaces/${workspaceId}`).get(),
    db.doc(`workspaces/${workspaceId}/students/${studentId}`).get(),
    findStudentIntentByReference(workspaceId, reference)
  ]);

  if (!workspaceSnapshot.exists || !studentSnapshot.exists || !intentResult) {
    return false;
  }

  const workspace = mapBillingWorkspace(workspaceSnapshot, workspaceId);
  const studentRecord = recordFromSnapshot(studentSnapshot, "studentId");
  const subscriptionSnapshot = await db
    .doc(`workspaces/${workspaceId}/students/${studentId}/subscriptions/current`)
    .get();
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    workspaceId,
    studentId
  );
  const student = buildStudentProfileForBilling({
    workspace,
    studentRecord,
    studentId,
    claimedTierId: metadata.tierId,
    subscription
  });
  const tier = requirePaystackCheckoutTier(workspace, intentResult.intent.tierId);
  const verification: PaystackVerificationResult = {
    status: asString(data.status, "success"),
    reference,
    amount: asNumber(data.amount),
    currency: asString(data.currency, "NGN"),
    paid_at: asString(data.paid_at) || asString(data.paidAt) || nowIso(),
    customer: asRecord(data.customer) as PaystackVerificationResult["customer"],
    metadata: data.metadata,
    subscription: asRecord(data.subscription) as PaystackVerificationResult["subscription"]
  } as PaystackVerificationResult;

  if (verification.status !== "success") {
    return false;
  }

  await applySuccessfulPayment({
    workspace,
    student,
    tier,
    paymentIntent: intentResult.intent,
    verification,
    action: "billing.paystack.webhook_charge_success"
  });

  receipt.workspaceId = workspaceId;
  receipt.studentId = studentId;
  receipt.reference = reference;
  receipt.processed = true;
  receipt.processedAt = nowIso();
  return true;
}

async function applyWebhookSubscriptionStatus(payload: PaystackWebhookPayload, status: BillingSubscriptionStatus) {
  const data = asRecord(payload.data);
  const metadata = safeMetadata(data.metadata);
  const workspaceId = metadata.workspaceId;
  const studentId = metadata.studentId;

  if (!workspaceId || !studentId) {
    return false;
  }

  const { db } = getFirebaseAdminClients();
  const now = nowIso();
  await db
    .doc(`workspaces/${workspaceId}/students/${studentId}/subscriptions/current`)
    .set(
      stripUndefined({
        status,
        graceEndsAt: status === "past_due" ? addDays(new Date(now), 3).toISOString() : undefined,
        updatedAt: now
      }),
      { merge: true }
    );
  await db
    .doc(`workspaces/${workspaceId}/students/${studentId}`)
    .set(stripUndefined({ subscriptionStatus: status, updatedAt: now }), { merge: true });

  return true;
}

export async function processPaystackWebhook(payload: PaystackWebhookPayload): Promise<PaystackWebhookReceipt> {
  const { db } = getFirebaseAdminClients();
  const eventId = receiptIdForWebhook(payload);
  const existing = await db.doc(`paystack_webhooks/${eventId}`).get();
  const data = asRecord(payload.data);
  const receipt: PaystackWebhookReceipt = {
    eventId,
    event: asString(payload.event, "unknown_event"),
    reference: asString(data.reference) || undefined,
    subscriptionCode: asString(data.subscription_code) || asString(asRecord(data.subscription).subscription_code) || undefined,
    invoiceCode: asString(data.invoice_code) || undefined,
    processed: false,
    duplicate: existing.exists,
    receivedAt: nowIso()
  };

  if (existing.exists) {
    return {
      ...receipt,
      duplicate: true,
      processed: Boolean(existing.data()?.processed),
      processedAt: asString(existing.data()?.processedAt) || undefined
    };
  }

  if (receipt.event === "charge.success") {
    await applyWebhookChargeSuccess(payload, receipt);
  } else if (receipt.event === "invoice.payment_failed") {
    receipt.processed = await applyWebhookSubscriptionStatus(payload, "past_due");
    receipt.processedAt = receipt.processed ? nowIso() : undefined;
  } else if (receipt.event === "subscription.disable") {
    receipt.processed = await applyWebhookSubscriptionStatus(payload, "cancelled");
    receipt.processedAt = receipt.processed ? nowIso() : undefined;
  } else if (receipt.event === "subscription.not_renew") {
    receipt.processed = await applyWebhookSubscriptionStatus(payload, "non_renewing");
    receipt.processedAt = receipt.processed ? nowIso() : undefined;
  }

  await recordWebhookReceipt(receipt);
  return receipt;
}
