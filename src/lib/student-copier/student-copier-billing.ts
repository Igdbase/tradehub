import "server-only";

import crypto from "node:crypto";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  getPaystackReadiness,
  disablePaystackSubscription,
  initializePaystackTransaction,
  type PaystackDisableSubscriptionResult,
  type PaystackInitializeResult,
  type PaystackVerificationResult,
  verifyPaystackTransaction
} from "@/lib/paystack/paystack-client";
import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import {
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot as studentRecordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import type {
  CryptoAutoCopyBillingStatus,
  CryptoAutoCopyPaymentIntentSummary,
  CryptoAutoCopySubscriptionPreview,
  ForexAutoCopyBillingStatus,
  StudentCryptoAutoCopyCheckoutResponse
} from "@/types/crypto-execution";
import type { PaystackWebhookReceipt, StudentSubscription } from "@/types/payments";
import type { StudentAppProfile } from "@/types/student-app";
import type { Workspace } from "@/types/workspace";

export const TRADE_COPIER_PRODUCT_ID = "trade_copier";
const TRADE_COPIER_VISIBLE_LIMIT = 4;
const LEGACY_CLEANUP_TASK_ID = "legacy_subscription_cleanup";
const PAYSTACK_CANCELLATION_TASK_ID = "paystack_subscription_disable";
const PAYSTACK_CANCELLATION_RETRY_BATCH_LIMIT = 5;
const PAYSTACK_CANCELLATION_RETRY_MAX_ATTEMPTS = 5;
const PAYSTACK_CANCELLATION_RETRY_LEASE_MS = 60_000;

type TradeCopierPaymentIntentStatus =
  | "pending"
  | "checkout_opened"
  | "verified"
  | "failed"
  | "cancelled"
  | "expired"
  | "support_review";
type TradeCopierBillingStatus =
  | "not_purchased"
  | "payment_pending"
  | "payment_failed"
  | "active_paid"
  | "past_due"
  | "cancelled"
  | "expired"
  | "non_renewing"
  | "cancellation_pending"
  | "needs_attention";
type LegacyProduct = "crypto_autocopy" | "forex_autocopy";

type TradeCopierContext = {
  workspace: Workspace;
  student: StudentAppProfile;
  studentRecord: Record<string, unknown>;
  courseSubscription: StudentSubscription | null;
  actor: VerifiedStudent;
};

export type TradeCopierBillingAccess = {
  active: boolean;
  status: TradeCopierBillingStatus;
  reason: string;
  source: "canonical" | "legacy_grandfathered" | "none";
  currentPeriodEnd?: string;
};

export type TradeCopierPaystackAdapter = {
  readiness: typeof getPaystackReadiness;
  initialize: typeof initializePaystackTransaction;
  verify: typeof verifyPaystackTransaction;
  disableSubscription: typeof disablePaystackSubscription;
};

export type TradeCopierBillingDependencies = {
  paystack?: Partial<TradeCopierPaystackAdapter>;
  idFactory?: () => string;
  referenceFactory?: () => string;
  now?: () => Date;
  skipImmediateCancellationRetry?: boolean;
  legacyCleanup?: (input: {
    workspaceId: string;
    studentId: string;
    canonicalStatus: TradeCopierBillingStatus;
    actorId: string;
  }) => Promise<void>;
};

function defaultPaystackAdapter(): TradeCopierPaystackAdapter {
  return {
    readiness: getPaystackReadiness,
    initialize: initializePaystackTransaction,
    verify: verifyPaystackTransaction,
    disableSubscription: disablePaystackSubscription
  };
}

function resolveDependencies(dependencies?: TradeCopierBillingDependencies) {
  const fallback = defaultPaystackAdapter();

  return {
    paystack: {
      readiness: dependencies?.paystack?.readiness ?? fallback.readiness,
      initialize: dependencies?.paystack?.initialize ?? fallback.initialize,
      verify: dependencies?.paystack?.verify ?? fallback.verify,
      disableSubscription: dependencies?.paystack?.disableSubscription ?? fallback.disableSubscription
    },
    idFactory: dependencies?.idFactory ?? paymentIntentId,
    referenceFactory: dependencies?.referenceFactory ?? paymentReference,
    now: dependencies?.now ?? (() => new Date()),
    skipImmediateCancellationRetry: dependencies?.skipImmediateCancellationRetry === true,
    legacyCleanup: dependencies?.legacyCleanup ?? ((input) => processStudentTradeCopierLegacyCleanup(input))
  };
}

function nowIso(date = new Date()) {
  return date.toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function paymentIntentId() {
  return `tcpi_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function paymentReference() {
  return `thtc_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function isUsingLocalEmulator() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST?.trim() ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim()
  );
}

function maskReference(value: string) {
  const clean = value.trim().replace(/\s+/g, "");
  return clean.length <= 8 ? `ref:${clean}` : `ref:${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function sanitizeSupportMessage(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "masked-email")
    .replace(/\b(sk|pk)_(test|live)_[A-Za-z0-9]+\b/g, "$1_$2_***")
    .replace(/\bPLN_[A-Za-z0-9]+\b/g, "PLN_***")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "masked-ref")
    .slice(0, 180);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) cleaned[key] = stripUndefined(entry);
    }

    return cleaned as T;
  }

  return value;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeIsoDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : nowIso();
}

function priceNgn() {
  const configured = Number(process.env.TRADE_COPIER_PRICE_NGN ?? "");
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 25000;
}

function planCode() {
  return process.env.PAYSTACK_TRADE_COPIER_PLAN_CODE?.trim() || undefined;
}

function checkoutEmailForPaystack(email: string, studentId: string) {
  const override = process.env.PAYSTACK_TRADE_COPIER_CHECKOUT_EMAIL?.trim();

  if (override) return override;

  if (getPaystackReadiness().mode === "test" && isUsingLocalEmulator() && email.endsWith(".test")) {
    return `${studentId}+trade-copier@example.com`;
  }

  return email;
}

function requireTradeCopierPlanCode() {
  const code = planCode();

  if (!code) {
    throw new AdminApiError(
      503,
      "trade_copier_plan_not_configured",
      "Trade Copier Paystack plan code is not configured yet."
    );
  }

  return code;
}

function callbackUrl(reference: string) {
  const appUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  const url = new URL("/app/copier", appUrl);
  url.searchParams.set("copierReference", reference);
  return url.toString();
}

function billingStateForStatus(status: TradeCopierBillingStatus) {
  if (status === "active_paid") return "paid";
  if (status === "payment_pending") return "pending";
  if (status === "payment_failed") return "failed";
  if (status === "non_renewing") return "cancelled";
  if (status === "cancellation_pending") return "cancelled";
  if (status === "needs_attention") return "failed";
  if (status === "past_due" || status === "cancelled" || status === "expired") return status;
  return "unknown";
}

function mapVerificationStatus(status: string): "verified" | "pending" | "failed" {
  if (status === "success") return "verified";
  if (status === "pending" || status === "ongoing" || status === "processing") return "pending";
  return "failed";
}

function mapBillingStatus(value: unknown): TradeCopierBillingStatus {
  return value === "payment_pending" ||
    value === "payment_failed" ||
    value === "active_paid" ||
    value === "past_due" ||
    value === "cancelled" ||
    value === "expired" ||
    value === "non_renewing" ||
    value === "cancellation_pending" ||
    value === "needs_attention"
    ? value
    : "not_purchased";
}

function mapLegacyCryptoStatus(value: unknown): CryptoAutoCopyBillingStatus {
  return value === "payment_pending" ||
    value === "payment_failed" ||
    value === "active_paid" ||
    value === "past_due" ||
    value === "cancelled" ||
    value === "expired"
    ? value
    : "not_purchased";
}

function mapLegacyForexStatus(value: unknown): ForexAutoCopyBillingStatus {
  return value === "active_paid" ||
    value === "payment_pending" ||
    value === "payment_failed" ||
    value === "past_due" ||
    value === "cancelled" ||
    value === "expired"
    ? value
    : "not_purchased";
}

function billingReason(status: TradeCopierBillingStatus, source: TradeCopierBillingAccess["source"] = "canonical") {
  if (status === "active_paid") {
    return source === "legacy_grandfathered"
      ? "Trade Copier is active through an existing paid Copier subscription. Crypto Setup and Forex Setup are available."
      : "Trade Copier billing is active. Crypto Setup and Forex Setup are available through their own safety gates.";
  }

  if (status === "payment_pending") {
    return "Trade Copier payment is pending. Setup unlocks only after TradeHub verifies payment.";
  }

  if (status === "payment_failed") {
    return "Trade Copier payment failed. Setup remains locked.";
  }

  if (status === "cancelled") {
    return "Trade Copier is cancelled. Purchase again before setup can continue.";
  }

  if (status === "non_renewing") {
    return "Trade Copier will not renew. Crypto Setup and Forex Setup are locked unless support reactivates access.";
  }

  if (status === "cancellation_pending") {
    return "Trade Copier cancellation is being confirmed. Crypto Setup and Forex Setup are locked.";
  }

  if (status === "needs_attention") {
    return "Trade Copier billing needs support. Crypto Setup and Forex Setup are locked.";
  }

  if (status === "past_due" || status === "expired") {
    return "Renew Trade Copier before setup or routing can continue.";
  }

  return "Purchase Trade Copier before connecting Binance, Bybit, or MT4/MT5 for Copier setup.";
}

function lifecycleRevision(record?: Record<string, unknown> | null) {
  const value = record?.lifecycleRevision;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function operationToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function isCurrentIntent(record: Record<string, unknown> | undefined | null, intentId: string, reference: string, token?: string) {
  if (!record) return false;
  if (safeString(record.latestPaymentIntentId) !== intentId) return false;
  if (safeString(record.latestReference) !== reference) return false;
  return token ? safeString(record.operationToken) === token : true;
}

function paystackSubscriptionTarget(record?: Record<string, unknown> | null) {
  const code = safeString(record?.paystackSubscriptionCode);
  const token = safeString(record?.paystackEmailToken);

  return code && token ? { code, token } : null;
}

function canUseTradeCopierSetup(context: TradeCopierContext) {
  const entitlements = resolveStudentEntitlements({
    workspace: context.workspace,
    studentRecord: context.studentRecord,
    subscription: context.courseSubscription,
    claimedTierId: context.actor.tierId
  });

  return entitlements.features.autoCopy.access === "allowed" &&
    entitlements.riskPosture === "personal_account" &&
    entitlements.subscriptionActive &&
    entitlements.subscriptionStatus !== "trial" &&
    entitlements.subscriptionStatus !== "past_due" &&
    entitlements.subscriptionStatus !== "cancelled" &&
    entitlements.subscriptionStatus !== "expired";
}

function isPaystackDisableConfirmed(result: PaystackDisableSubscriptionResult) {
  const status = safeString(result.status).toLowerCase();
  return status === "" ||
    status === "disabled" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "success" ||
    status === "complete";
}

function receiptIdForTradeCopierWebhook(payload: Record<string, unknown>) {
  const event = safeString(payload.event) || "unknown_event";
  const data = asRecord(payload.data);
  const fingerprint =
    safeString(data.id) ||
    safeString(data.reference) ||
    safeString(data.invoice_code) ||
    safeString(data.subscription_code) ||
    safeString(asRecord(data.subscription).subscription_code) ||
    crypto.randomUUID();

  return `trade_copier_${event}_${fingerprint}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

function safeMetadata(value: unknown): Record<string, string> {
  if (typeof value === "string") {
    try {
      return safeMetadata(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) =>
      typeof entry === "string" ? [[key, entry.trim()]] : []
    )
  );
}

function paystackPlanCodeFromPayloadData(data: Record<string, unknown>) {
  const subscription = asRecord(data.subscription);
  const plan = asRecord(data.plan);
  const subscriptionPlan = asRecord(subscription.plan);

  return safeString(data.plan_code) ||
    safeString(plan.plan_code) ||
    safeString(subscription.plan_code) ||
    safeString(subscriptionPlan.plan_code);
}

function paystackRenewalPeriodEnd(data: Record<string, unknown>) {
  const subscription = asRecord(data.subscription);
  const candidate =
    safeString(subscription.next_payment_date) ||
    safeString(data.next_payment_date) ||
    safeString(data.period_end);

  return candidate && Number.isFinite(Date.parse(candidate))
    ? new Date(candidate).toISOString()
    : null;
}

function cleanupLeaseExpired(task: Record<string, unknown> | undefined | null, now: string) {
  const leaseExpiresAt = safeString(task?.leaseExpiresAt);
  return !leaseExpiresAt || !Number.isFinite(Date.parse(leaseExpiresAt)) || Date.parse(leaseExpiresAt) <= Date.parse(now);
}

function cleanupAttemptCount(task: Record<string, unknown> | undefined | null) {
  return typeof task?.attemptCount === "number" && Number.isFinite(task.attemptCount)
    ? Math.max(0, Math.floor(task.attemptCount))
    : 0;
}

function isRetryablePaystackCancellationTask(task: Record<string, unknown> | undefined | null, now: string) {
  const status = safeString(task?.status);
  const dueAt = safeString(task?.nextAttemptAt);

  if (status === "retry_scheduled") {
    return !dueAt || !Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt) <= Date.parse(now);
  }

  return status === "in_progress" && cleanupLeaseExpired(task, now);
}

function nextCancellationRetryAt(now: string, attemptCount: number) {
  const delayMinutes = Math.min(60 * 24, Math.max(5, 5 * 2 ** Math.max(0, attemptCount - 1)));
  return new Date(Date.parse(now) + delayMinutes * 60_000).toISOString();
}

function studentPathFromCleanupTaskRef(taskRef: FirebaseFirestore.DocumentReference) {
  const segments = taskRef.path.split("/");
  const workspaceIndex = segments.indexOf("workspaces");
  const studentIndex = segments.indexOf("students");

  if (workspaceIndex < 0 || studentIndex < 0 || !segments[workspaceIndex + 1] || !segments[studentIndex + 1]) {
    return null;
  }

  return {
    workspaceId: segments[workspaceIndex + 1],
    studentId: segments[studentIndex + 1]
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanWebhookEventTime(value: unknown) {
  return normalizeIsoDate(value);
}

async function loadContext(actor: VerifiedStudent): Promise<TradeCopierContext> {
  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`).get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This student workspace is not prepared yet.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(403, "student_record_required", "This student account has not been provisioned inside this workspace yet.");
  }

  const workspace = mapWorkspaceForStudent(
    studentRecordFromSnapshot(workspaceSnapshot, "workspaceId"),
    actor.workspaceId
  );
  const studentRecord = studentRecordFromSnapshot(studentSnapshot, "studentId");
  const courseSubscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? studentRecordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord,
    subscription: courseSubscription,
    claimedTierId: actor.tierId
  });
  const student = mapStudentProfile(studentRecord, actor.workspaceId, actor.studentId, entitlements);

  return {
    workspace,
    student,
    studentRecord,
    courseSubscription,
    actor
  };
}

function assertCanBuyTradeCopier(context: TradeCopierContext) {
  const entitlements = resolveStudentEntitlements({
    workspace: context.workspace,
    studentRecord: context.studentRecord,
    subscription: context.courseSubscription,
    claimedTierId: context.actor.tierId
  });
  const autoCopy = entitlements.features.autoCopy;

  if (autoCopy.access !== "allowed") {
    throw new AdminApiError(403, "auto_copy_not_entitled", autoCopy.reason);
  }

  if (entitlements.riskPosture !== "personal_account") {
    throw new AdminApiError(403, "personal_account_required", "Trade Copier can only be purchased for personal trading accounts.");
  }

  if (!entitlements.subscriptionActive || entitlements.subscriptionStatus === "trial") {
    throw new AdminApiError(403, "paid_course_subscription_required", "A paid active TradeHub subscription is required before purchasing the Trade Copier add-on.");
  }

  if (
    entitlements.subscriptionStatus === "past_due" ||
    entitlements.subscriptionStatus === "cancelled" ||
    entitlements.subscriptionStatus === "expired"
  ) {
    throw new AdminApiError(403, "course_subscription_inactive", "Renew your TradeHub subscription before purchasing Trade Copier.");
  }
}

async function writeAudit({
  workspaceId,
  studentId,
  actorId,
  action,
  targetId,
  safeMessage,
  after
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
  action: string;
  targetId: string;
  safeMessage: string;
  after?: Record<string, unknown>;
}) {
  const { db } = getFirebaseAdminClients();
  const eventRef = db.collection(`workspaces/${workspaceId}/trade_copier_audit_events`).doc();

  await eventRef.set(stripUndefined({
    eventId: eventRef.id,
    action,
    actorType: "student",
    actorId,
    workspaceId,
    studentId,
    targetType: "subscription",
    targetId,
    safeMessage,
    severity: "info",
    after,
    createdAt: nowIso()
  }));
}

function mapPaymentIntentSummary(record: Record<string, unknown>, paymentIntentId: string): CryptoAutoCopyPaymentIntentSummary {
  const status =
    record.status === "checkout_opened" ||
    record.status === "verified" ||
    record.status === "failed" ||
    record.status === "cancelled" ||
    record.status === "expired"
      ? record.status
      : record.status === "support_review"
        ? "failed"
      : "pending";

  return {
    paymentIntentId,
    studentId: safeString(record.studentId) || "unknown_student",
    status,
    rail: "paystack" as const,
    referenceRef: maskReference(safeString(record.paystackReference) || safeString(record.reference)),
    amountNgn: safeNumber(record.amountNgn),
    currency: "NGN" as const,
    safeMessage: safeString(record.safeMessage) || "Trade Copier Paystack payment intent is support-safe.",
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: normalizeIsoDate(record.updatedAt ?? record.createdAt)
  };
}

async function loadCanonicalRecord(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_subscriptions/current`).get();

  return snapshot.exists ? snapshot.data() ?? null : null;
}

async function materializeLegacyGrandfatherIfNeeded(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const subscriptionRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_subscriptions/current`);

  return db.runTransaction(async (transaction) => {
    const [canonicalSnapshot, cryptoSnapshot, forexSnapshot] = await Promise.all([
      transaction.get(subscriptionRef),
      transaction.get(db.doc(`workspaces/${workspaceId}/students/${studentId}/crypto_autocopy_subscriptions/current`)),
      transaction.get(db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_autocopy_subscriptions/current`))
    ]);

    if (canonicalSnapshot.exists) return canonicalSnapshot.data() ?? null;

    const cryptoRecord = cryptoSnapshot.exists ? cryptoSnapshot.data() ?? null : null;
    const forexRecord = forexSnapshot.exists ? forexSnapshot.data() ?? null : null;
    const cryptoStatus = mapLegacyCryptoStatus(cryptoRecord?.status);
    const forexStatus = mapLegacyForexStatus(forexRecord?.status);

    if (cryptoStatus !== "active_paid" && forexStatus !== "active_paid") {
      return null;
    }

    const now = nowIso();
    const currentPeriodEnd = safeString(cryptoRecord?.currentPeriodEnd) || safeString(forexRecord?.currentPeriodEnd) || undefined;
    const legacySources = [
      cryptoStatus === "active_paid" ? "crypto_autocopy" : null,
      forexStatus === "active_paid" ? "forex_autocopy" : null
    ].filter(Boolean);
    const record = stripUndefined({
      subscriptionId: "current",
      workspaceId,
      studentId,
      product: TRADE_COPIER_PRODUCT_ID,
      status: "active_paid" as TradeCopierBillingStatus,
      billingState: "paid",
      rail: "legacy_grandfathered",
      legacyGrandfathered: true,
      legacySources,
      currentPeriodEnd,
      safeMessage: "Existing paid Copier subscription was grandfathered into the unified Trade Copier add-on.",
      createdAt: now,
      updatedAt: now,
      materializedAt: now
    });

    transaction.set(subscriptionRef, record, { merge: true });
    return record;
  });
}

export async function resolveTradeCopierBillingAccess(
  workspaceId: string,
  studentId: string
): Promise<TradeCopierBillingAccess> {
  let record = await loadCanonicalRecord(workspaceId, studentId);
  let source: TradeCopierBillingAccess["source"] = "canonical";

  if (!record) {
    record = await materializeLegacyGrandfatherIfNeeded(workspaceId, studentId);
    source = record ? "legacy_grandfathered" : "none";
  }

  const status = mapBillingStatus(record?.status);

  return {
    active: status === "active_paid",
    status,
    source,
    reason: billingReason(status, source),
    currentPeriodEnd: safeString(record?.currentPeriodEnd) || undefined
  };
}

export async function isTradeCopierBillingActive(workspaceId: string, studentId: string) {
  return resolveTradeCopierBillingAccess(workspaceId, studentId);
}

export async function loadTradeCopierSubscriptionPreview({
  workspaceId,
  studentId
}: {
  workspaceId: string;
  studentId: string;
}): Promise<CryptoAutoCopySubscriptionPreview> {
  const { db } = getFirebaseAdminClients();
  const [access, paymentIntentSnapshot] = await Promise.all([
    resolveTradeCopierBillingAccess(workspaceId, studentId),
    db
      .collection(`workspaces/${workspaceId}/trade_copier_payment_intents`)
      .where("studentId", "==", studentId)
      .orderBy("updatedAt", "desc")
      .limit(TRADE_COPIER_VISIBLE_LIMIT + 1)
      .get()
  ]);
  const paymentIntents = paymentIntentSnapshot.docs.map((doc) =>
    mapPaymentIntentSummary(studentRecordFromSnapshot(doc, "paymentIntentId"), doc.id)
  );

  return {
    billing: {
      status: access.status as CryptoAutoCopyBillingStatus,
      entitled: access.active,
      reason: access.reason,
      priceLabel: `${priceNgn().toLocaleString("en-NG")} NGN`,
      currentPeriodEnd: access.currentPeriodEnd
    },
    paymentIntents: paymentIntents.slice(0, TRADE_COPIER_VISIBLE_LIMIT),
    bounded: {
      paymentIntents: paymentIntents.length > TRADE_COPIER_VISIBLE_LIMIT
    },
    warnings: [],
    updatedAt: nowIso()
  };
}

async function findCanonicalPaymentIntentByReference(workspaceId: string, reference: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/trade_copier_payment_intents`)
    .where("paystackReference", "==", reference)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  return doc ? { ref: doc.ref, record: doc.data(), id: doc.id } : null;
}

async function findCanonicalPaymentIntentGloballyByReference(reference: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collectionGroup("trade_copier_payment_intents")
    .where("paystackReference", "==", reference)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  return doc ? { ref: doc.ref, record: doc.data(), id: doc.id } : null;
}

async function findCanonicalSubscriptionByPaystackCode(subscriptionCode: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collectionGroup("trade_copier_subscriptions")
    .where("paystackSubscriptionCode", "==", subscriptionCode)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  return doc ? { ref: doc.ref, record: doc.data(), id: doc.id } : null;
}

async function findLegacyPaymentIntentByReference(workspaceId: string, reference: string, legacyProduct: LegacyProduct) {
  const { db } = getFirebaseAdminClients();
  const collection = legacyProduct === "crypto_autocopy"
    ? "crypto_autocopy_payment_intents"
    : "forex_autocopy_payment_intents";
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/${collection}`)
    .where("paystackReference", "==", reference)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  return doc ? { ref: doc.ref, record: doc.data(), id: doc.id } : null;
}

function assertVerificationMatchesIntent({
  verification,
  intent,
  expectedProduct,
  amountNgn
}: {
  verification: PaystackVerificationResult;
  intent: Record<string, unknown>;
  expectedProduct: string;
  amountNgn: number;
}) {
  const metadata = typeof verification.metadata === "object" && verification.metadata !== null
    ? verification.metadata as Record<string, unknown>
    : null;
  const verifiedProduct = safeString(metadata?.product);
  const intentProduct = safeString(intent.product);

  if (intentProduct !== expectedProduct) {
    throw new AdminApiError(400, "payment_product_mismatch", "TradeHub could not verify this payment for Trade Copier.");
  }

  if (verifiedProduct && verifiedProduct !== expectedProduct) {
    throw new AdminApiError(400, "payment_product_mismatch", "Paystack verified a different product than Trade Copier.");
  }

  if (verification.currency !== "NGN" || verification.amount !== amountNgn * 100) {
    throw new AdminApiError(400, "payment_verification_mismatch", "Paystack verified a transaction that does not match this Trade Copier checkout.");
  }
}

export async function createStudentTradeCopierCheckout(
  actor: VerifiedStudent,
  dependencies?: TradeCopierBillingDependencies
): Promise<StudentCryptoAutoCopyCheckoutResponse> {
  const resolved = resolveDependencies(dependencies);
  const context = await loadContext(actor);
  assertCanBuyTradeCopier(context);
  const current = await resolveTradeCopierBillingAccess(actor.workspaceId, actor.studentId);

  if (current.active) {
    throw new AdminApiError(409, "trade_copier_already_active", "Trade Copier is already active. Crypto Setup and Forex Setup are available.");
  }

  if (current.status === "payment_pending") {
    throw new AdminApiError(409, "trade_copier_checkout_pending", "Trade Copier checkout is already pending.");
  }

  const studentEmail = context.student.email || actor.email;

  if (!studentEmail) {
    throw new AdminApiError(400, "student_email_required", "This student account needs an email before checkout can start.");
  }

  const checkoutEmail = checkoutEmailForPaystack(studentEmail, actor.studentId);
  const readiness = resolved.paystack.readiness();

  if (!readiness.configured) {
    throw new AdminApiError(503, "paystack_not_configured", "Paystack test checkout is not configured for Trade Copier yet.");
  }

  const tradeCopierPlanCode = requireTradeCopierPlanCode();
  const { db } = getFirebaseAdminClients();
  const now = nowIso(resolved.now());
  const id = resolved.idFactory();
  const reference = resolved.referenceFactory();
  const checkoutOperationToken = operationToken("checkout");
  const amountNgn = priceNgn();
  const expiresAt = addDays(new Date(now), 1).toISOString();
  const intentRef = db.doc(`workspaces/${actor.workspaceId}/trade_copier_payment_intents/${id}`);
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/trade_copier_subscriptions/current`);

  await db.runTransaction(async (transaction) => {
    const subscriptionSnapshot = await transaction.get(subscriptionRef);
    const existingStatus = mapBillingStatus(subscriptionSnapshot.data()?.status);

    if (existingStatus === "active_paid") {
      throw new AdminApiError(409, "trade_copier_already_active", "Trade Copier is already active. Crypto Setup and Forex Setup are available.");
    }

    if (existingStatus === "payment_pending") {
      throw new AdminApiError(409, "trade_copier_checkout_pending", "Trade Copier checkout is already pending.");
    }

    transaction.set(intentRef, stripUndefined({
      paymentIntentId: id,
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      product: TRADE_COPIER_PRODUCT_ID,
      rail: "paystack",
      status: "pending" as TradeCopierPaymentIntentStatus,
      amountNgn,
      currency: "NGN",
      paystackReference: reference,
      referenceRef: maskReference(reference),
      paystackPlanCode: tradeCopierPlanCode,
      operationToken: checkoutOperationToken,
      safeMessage: "Trade Copier Paystack checkout was created. Crypto Setup and Forex Setup remain locked until payment is verified.",
      createdAt: now,
      updatedAt: now,
      expiresAt
    }));
    transaction.set(subscriptionRef, stripUndefined({
      subscriptionId: "current",
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      product: TRADE_COPIER_PRODUCT_ID,
      status: "payment_pending" as TradeCopierBillingStatus,
      billingState: "pending",
      rail: "paystack",
      latestPaymentIntentId: id,
      latestReference: reference,
      latestReferenceRef: maskReference(reference),
      operationToken: checkoutOperationToken,
      lifecycleRevision: lifecycleRevision(subscriptionSnapshot.data()) + 1,
      safeMessage: "Trade Copier checkout is pending. Setup unlocks only after verified payment.",
      createdAt: now,
      updatedAt: now
    }), { merge: true });
  });

  try {
    const checkout: PaystackInitializeResult = await resolved.paystack.initialize(stripUndefined({
      email: checkoutEmail,
      amount: amountNgn * 100,
      reference,
      callback_url: callbackUrl(reference),
      plan: tradeCopierPlanCode,
      metadata: {
        product: TRADE_COPIER_PRODUCT_ID,
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        paymentIntentId: id
      }
    }));

    await db.runTransaction(async (transaction) => {
      const [subscriptionSnapshot, intentSnapshot] = await Promise.all([
        transaction.get(subscriptionRef),
        transaction.get(intentRef)
      ]);
      const subscription = subscriptionSnapshot.data();
      const intent = intentSnapshot.data();

      if (
        !isCurrentIntent(subscription, id, reference, checkoutOperationToken) ||
        mapBillingStatus(subscription?.status) !== "payment_pending" ||
        intent?.status !== "pending"
      ) {
        return;
      }

      transaction.set(intentRef, stripUndefined({
        status: "checkout_opened" as TradeCopierPaymentIntentStatus,
        paystackAccessCode: checkout.access_code,
        paystackAuthorizationUrl: checkout.authorization_url,
        safeMessage: "Trade Copier Paystack checkout is open. Crypto Setup and Forex Setup unlock only after verified payment.",
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
      transaction.set(subscriptionRef, stripUndefined({
        status: "payment_pending" as TradeCopierBillingStatus,
        billingState: "pending",
        latestPaymentIntentId: id,
        latestReference: reference,
        latestReferenceRef: maskReference(reference),
        operationToken: checkoutOperationToken,
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
    });

    await writeAudit({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "trade_copier.paystack.checkout_opened",
      targetId: id,
      safeMessage: "Student opened a Paystack checkout for Trade Copier. No exchange or broker order was created.",
      after: { rail: "paystack", referenceRef: maskReference(reference), product: TRADE_COPIER_PRODUCT_ID }
    });

    return {
      ...createSourceMeta(),
      ok: true,
      checkout: {
        paymentIntentId: id,
        reference,
        authorizationUrl: checkout.authorization_url,
        accessCode: checkout.access_code,
        amountNgn,
        currency: "NGN"
      }
    };
  } catch (error) {
    const failureReason = sanitizeSupportMessage(
      error instanceof Error ? error.message : "Paystack checkout initialization failed."
    );
    await db.runTransaction(async (transaction) => {
      const [subscriptionSnapshot, intentSnapshot] = await Promise.all([
        transaction.get(subscriptionRef),
        transaction.get(intentRef)
      ]);
      const subscription = subscriptionSnapshot.data();
      const intent = intentSnapshot.data();

      if (
        !isCurrentIntent(subscription, id, reference, checkoutOperationToken) ||
        mapBillingStatus(subscription?.status) !== "payment_pending" ||
        (intent?.status !== "pending" && intent?.status !== "checkout_opened")
      ) {
        return;
      }

      transaction.set(intentRef, stripUndefined({
        status: "failed" as TradeCopierPaymentIntentStatus,
        failureReason,
        safeMessage: `Trade Copier Paystack checkout could not be opened: ${failureReason}`,
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
      transaction.set(subscriptionRef, stripUndefined({
        status: "payment_failed" as TradeCopierBillingStatus,
        billingState: "failed",
        safeMessage: "Trade Copier checkout could not be opened. Setup remains locked.",
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
    });
    throw error;
  }
}

async function applyCanonicalVerification({
  actor,
  intentResult,
  reference,
  verification,
  verificationStatus,
  resolved
}: {
  actor: VerifiedStudent;
  intentResult: { ref: FirebaseFirestore.DocumentReference; record: Record<string, unknown>; id: string };
  reference: string;
  verification: PaystackVerificationResult;
  verificationStatus: "verified" | "pending" | "failed";
  resolved: ReturnType<typeof resolveDependencies>;
}) {
  const { db } = getFirebaseAdminClients();
  const now = nowIso(resolved.now());
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/trade_copier_subscriptions/current`);

  if (verificationStatus !== "verified") {
    const nextStatus: TradeCopierBillingStatus = verificationStatus === "pending" ? "payment_pending" : "payment_failed";
    await db.runTransaction(async (transaction) => {
      const subscriptionSnapshot = await transaction.get(subscriptionRef);
      const subscription = subscriptionSnapshot.data();
      const currentStatus = mapBillingStatus(subscription?.status);

      if (
        !isCurrentIntent(subscription, intentResult.id, reference) ||
        currentStatus === "non_renewing" ||
        currentStatus === "cancellation_pending" ||
        currentStatus === "cancelled" ||
        currentStatus === "needs_attention"
      ) {
        transaction.set(intentResult.ref, stripUndefined({
          status: "support_review" as TradeCopierPaymentIntentStatus,
          staleCallback: true,
          safeMessage: "Late Trade Copier payment callback was recorded for support review. Setup remains locked.",
          updatedAt: now
        }), { merge: true });
        return;
      }

      transaction.set(intentResult.ref, stripUndefined({
        status: verificationStatus === "pending" ? "pending" : "failed",
        failureReason: verificationStatus === "failed" ? `Paystack status: ${verification.status}` : undefined,
        safeMessage: verificationStatus === "pending"
          ? "Trade Copier checkout is still pending."
          : "Trade Copier payment failed safely.",
        updatedAt: now
      }), { merge: true });
      transaction.set(subscriptionRef, stripUndefined({
        subscriptionId: "current",
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        product: TRADE_COPIER_PRODUCT_ID,
        status: nextStatus,
        billingState: billingStateForStatus(nextStatus),
        rail: "paystack",
        latestPaymentIntentId: intentResult.id,
        latestReference: reference,
        latestReferenceRef: maskReference(reference),
        operationToken: safeString(subscription?.operationToken) || safeString(intentResult.record.operationToken) || undefined,
        lifecycleRevision: lifecycleRevision(subscription) + 1,
        safeMessage: billingReason(nextStatus),
        updatedAt: now
      }), { merge: true });
    });

    return {
      status: verificationStatus,
      message: verificationStatus === "pending"
        ? "Paystack has not confirmed this Trade Copier payment yet."
        : "Paystack did not report this Trade Copier payment as successful."
    };
  }

  const periodEnd =
    verification.subscription?.next_payment_date && Number.isFinite(Date.parse(verification.subscription.next_payment_date))
      ? new Date(verification.subscription.next_payment_date)
      : addMonths(new Date(now), 1);

  const activated = await db.runTransaction(async (transaction) => {
    const [intentSnapshot, subscriptionSnapshot] = await Promise.all([
      transaction.get(intentResult.ref),
      transaction.get(subscriptionRef)
    ]);
    const intent = intentSnapshot.data() ?? intentResult.record;
    const subscription = subscriptionSnapshot.data();
    const currentStatus = mapBillingStatus(subscription?.status);

    if (
      intent.status === "verified" &&
      isCurrentIntent(subscription, intentResult.id, reference) &&
      currentStatus === "active_paid"
    ) {
      return true;
    }

    if (
      !isCurrentIntent(subscription, intentResult.id, reference) ||
      currentStatus === "non_renewing" ||
      currentStatus === "cancellation_pending" ||
      currentStatus === "cancelled" ||
      currentStatus === "needs_attention"
    ) {
      transaction.set(intentResult.ref, stripUndefined({
        status: "support_review" as TradeCopierPaymentIntentStatus,
        verifiedAt: now,
        activationBlocked: true,
        safeMessage: "Late Trade Copier payment succeeded but could not safely activate this subscription. Support review is required.",
        updatedAt: now
      }), { merge: true });
      return false;
    }

    transaction.set(intentResult.ref, stripUndefined({
      status: "verified" as TradeCopierPaymentIntentStatus,
      verifiedAt: now,
      paystackCustomerCode: verification.customer?.customer_code,
      paystackSubscriptionCode: verification.subscription?.subscription_code,
      paystackEmailToken: verification.subscription?.email_token,
      safeMessage: "Trade Copier payment verified. Crypto Setup and Forex Setup are now available.",
      updatedAt: now
    }), { merge: true });
    transaction.set(subscriptionRef, stripUndefined({
      subscriptionId: "current",
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      product: TRADE_COPIER_PRODUCT_ID,
      status: "active_paid" as TradeCopierBillingStatus,
      billingState: "paid",
      rail: "paystack",
      latestPaymentIntentId: intentResult.id,
      latestReference: reference,
      latestReferenceRef: maskReference(reference),
      paystackCustomerCode: verification.customer?.customer_code,
      paystackSubscriptionCode: verification.subscription?.subscription_code,
      paystackEmailToken: verification.subscription?.email_token,
      amountNgn: typeof intent.amountNgn === "number" ? intent.amountNgn : priceNgn(),
      currency: "NGN",
      paystackPlanCode: safeString(intent.paystackPlanCode) || planCode(),
      currentPeriodEnd: periodEnd.toISOString(),
      lastVerifiedAt: now,
      lifecycleRevision: lifecycleRevision(subscription) + 1,
      operationToken: operationToken("verified"),
      safeMessage: "Trade Copier billing is active. Crypto Setup and Forex Setup are available through their own safety gates.",
      createdAt: intent.createdAt ?? now,
      updatedAt: now
    }), { merge: true });
    return true;
  });

  if (!activated) {
    return {
      status: "support_review" as const,
      message: "Trade Copier payment requires support review before setup can continue."
    };
  }

  await writeAudit({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "trade_copier.paystack.payment_verified",
    targetId: intentResult.id,
    safeMessage: "Trade Copier Paystack payment verified. Crypto Setup and Forex Setup may unlock through server-side safety gates.",
    after: {
      status: "active_paid",
      rail: "paystack",
      referenceRef: maskReference(reference),
      paystackMode: resolved.paystack.readiness().mode
    }
  });

  return {
    status: "verified" as const,
    message: "Trade Copier payment verified. Crypto Setup and Forex Setup are now available."
  };
}

export async function verifyStudentTradeCopierCheckout(
  actor: VerifiedStudent,
  reference: string,
  dependencies?: TradeCopierBillingDependencies
) {
  const context = await loadContext(actor);
  const resolved = resolveDependencies(dependencies);
  const cleanReference = reference.trim();

  if (!cleanReference || cleanReference.length > 160) {
    throw new AdminApiError(400, "invalid_reference", "A valid Trade Copier Paystack reference is required.");
  }

  const intentResult = await findCanonicalPaymentIntentByReference(actor.workspaceId, cleanReference);

  if (!intentResult) {
    throw new AdminApiError(404, "trade_copier_payment_intent_not_found", "TradeHub could not find that Trade Copier payment intent.");
  }

  if (intentResult.record.studentId !== actor.studentId) {
    throw new AdminApiError(403, "payment_intent_scope_mismatch", "That Trade Copier payment intent belongs to another student.");
  }

  const amountNgn = typeof intentResult.record.amountNgn === "number" ? intentResult.record.amountNgn : priceNgn();
  const verification = await resolved.paystack.verify(cleanReference);
  assertVerificationMatchesIntent({
    verification,
    intent: intentResult.record,
    expectedProduct: TRADE_COPIER_PRODUCT_ID,
    amountNgn
  });
  const verificationStatus = mapVerificationStatus(verification.status);

  const result = await applyCanonicalVerification({
    actor,
    intentResult,
    reference: cleanReference,
    verification,
    verificationStatus,
    resolved
  });

  if (result.status === "verified" && !canUseTradeCopierSetup(context)) {
    return {
      status: "verified" as const,
      message: "Trade Copier payment is verified. Setup remains locked until account access requirements are satisfied."
    };
  }

  return result;
}

export async function verifyLegacyTradeCopierCheckout(
  actor: VerifiedStudent,
  reference: string,
  legacyProduct: LegacyProduct,
  dependencies?: TradeCopierBillingDependencies
) {
  const context = await loadContext(actor);
  const resolved = resolveDependencies(dependencies);
  const cleanReference = reference.trim();

  if (!cleanReference || cleanReference.length > 160) {
    throw new AdminApiError(400, "invalid_reference", "A valid legacy Copier checkout reference is required.");
  }

  const intentResult = await findLegacyPaymentIntentByReference(actor.workspaceId, cleanReference, legacyProduct);

  if (!intentResult) {
    throw new AdminApiError(404, "legacy_copier_payment_intent_not_found", "TradeHub could not find that legacy Copier payment intent.");
  }

  if (intentResult.record.studentId !== actor.studentId) {
    throw new AdminApiError(403, "payment_intent_scope_mismatch", "That legacy Copier payment intent belongs to another student.");
  }

  const amountNgn = typeof intentResult.record.amountNgn === "number" ? intentResult.record.amountNgn : priceNgn();
  const verification = await resolved.paystack.verify(cleanReference);
  const verificationStatus = mapVerificationStatus(verification.status);
  const legacyIntent = {
    ...intentResult.record,
    product: legacyProduct
  };

  assertVerificationMatchesIntent({
    verification,
    intent: legacyIntent,
    expectedProduct: legacyProduct,
    amountNgn
  });

  const { db } = getFirebaseAdminClients();
  const canonicalIntentRef = db.doc(`workspaces/${actor.workspaceId}/trade_copier_payment_intents/legacy_${legacyProduct}_${intentResult.id}`);
  const canonicalIntent = {
    paymentIntentId: canonicalIntentRef.id,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    product: TRADE_COPIER_PRODUCT_ID,
    legacyProduct,
    rail: "paystack",
    status: intentResult.record.status,
    amountNgn,
    currency: "NGN",
    paystackReference: cleanReference,
    referenceRef: maskReference(cleanReference),
    safeMessage: "Legacy Copier checkout is being reconciled into unified Trade Copier access.",
    createdAt: intentResult.record.createdAt ?? nowIso(resolved.now()),
    updatedAt: nowIso(resolved.now())
  };
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/trade_copier_subscriptions/current`);
  await db.runTransaction(async (transaction) => {
    const subscriptionSnapshot = await transaction.get(subscriptionRef);
    const subscription = subscriptionSnapshot.data();
    const currentStatus = mapBillingStatus(subscription?.status);

    transaction.set(canonicalIntentRef, stripUndefined(canonicalIntent), { merge: true });

    if (!subscriptionSnapshot.exists || currentStatus === "not_purchased") {
      transaction.set(subscriptionRef, stripUndefined({
        subscriptionId: "current",
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        product: TRADE_COPIER_PRODUCT_ID,
        status: "payment_pending" as TradeCopierBillingStatus,
        billingState: "pending",
        rail: "paystack",
        latestPaymentIntentId: canonicalIntentRef.id,
        latestReference: cleanReference,
        latestReferenceRef: maskReference(cleanReference),
        operationToken: operationToken("legacy_verify"),
        lifecycleRevision: lifecycleRevision(subscription) + 1,
        safeMessage: "Legacy Copier checkout is being reconciled into unified Trade Copier access.",
        createdAt: nowIso(resolved.now()),
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
    }
  });
  const result = await applyCanonicalVerification({
    actor,
    intentResult: { ref: canonicalIntentRef, record: canonicalIntent, id: canonicalIntentRef.id },
    reference: cleanReference,
    verification,
    verificationStatus,
    resolved
  });

  await intentResult.ref.set(stripUndefined({
    status: verificationStatus === "verified" ? "verified" : verificationStatus === "pending" ? "pending" : "failed",
    safeMessage: verificationStatus === "verified"
      ? "Legacy Copier payment verified and reconciled into Trade Copier."
      : "Legacy Copier payment remains unresolved.",
    updatedAt: nowIso(resolved.now())
  }), { merge: true });

  if (result.status === "verified" && !canUseTradeCopierSetup(context)) {
    return {
      status: "verified" as const,
      message: "Trade Copier payment is verified. Setup remains locked until account access requirements are satisfied."
    };
  }

  return result;
}

async function recordTradeCopierWebhookReceipt(receipt: PaystackWebhookReceipt) {
  const { db } = getFirebaseAdminClients();
  await db.doc(`paystack_webhooks/${receipt.eventId}`).set(stripUndefined(receipt), { merge: true });
}

async function applyTradeCopierWebhookStatus({
  subscriptionRef,
  subscriptionRecord,
  status,
  eventTime,
  receipt
}: {
  subscriptionRef: FirebaseFirestore.DocumentReference;
  subscriptionRecord: Record<string, unknown>;
  status: TradeCopierBillingStatus;
  eventTime: string;
  receipt: PaystackWebhookReceipt;
}) {
  const { db } = getFirebaseAdminClients();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(subscriptionRef);
    const current = snapshot.data() ?? subscriptionRecord;
    const currentCode = safeString(current.paystackSubscriptionCode);
    const workspaceId = safeString(current.workspaceId) || safeString(subscriptionRecord.workspaceId);
    const studentId = safeString(current.studentId) || safeString(subscriptionRecord.studentId);

    if (
      currentCode &&
      receipt.subscriptionCode &&
      currentCode !== receipt.subscriptionCode
    ) {
      return false;
    }

    const lastWebhookAt = safeString(current.lastPaystackWebhookAt);
    if (lastWebhookAt && Date.parse(lastWebhookAt) > Date.parse(eventTime)) {
      return false;
    }

    const currentStatus = mapBillingStatus(current.status);
    if (
      currentStatus === "cancelled" &&
      (status === "past_due" || status === "non_renewing")
    ) {
      return false;
    }

    const taskRef = workspaceId && studentId
      ? db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_cleanup_tasks/${PAYSTACK_CANCELLATION_TASK_ID}`)
      : null;
    const taskSnapshot = taskRef ? await transaction.get(taskRef) : null;
    const task = taskSnapshot?.data();
    const taskTarget = paystackSubscriptionTarget(task);
    const taskStatus = safeString(task?.status);
    const taskMatchesTarget = Boolean(
      taskRef &&
        task &&
        safeString(task.action) === "paystack_disable_subscription" &&
        (taskStatus === "retry_scheduled" || taskStatus === "in_progress" || taskStatus === "blocked") &&
        taskTarget?.code === currentCode &&
        (!safeString(task.expectedOperationToken) ||
          safeString(task.expectedOperationToken) === safeString(current.cancellationOperationToken))
    );
    const nextStatus = status === "non_renewing" && currentStatus === "cancellation_pending"
      ? "non_renewing" as TradeCopierBillingStatus
      : status;

    if (currentStatus === nextStatus && !(status === "cancelled" && taskMatchesTarget)) {
      return false;
    }

    transaction.set(subscriptionRef, stripUndefined({
      status: nextStatus,
      billingState: billingStateForStatus(nextStatus),
      safeMessage: nextStatus === "non_renewing" && taskMatchesTarget
        ? "Trade Copier will not renew and provider disable confirmation is still pending. Crypto Setup and Forex Setup are locked."
        : billingReason(nextStatus),
      lastPaystackWebhookAt: eventTime,
      updatedAt: nowIso(),
      lifecycleRevision: lifecycleRevision(current) + 1
    }), { merge: true });

    if (status === "cancelled" && taskRef && taskMatchesTarget) {
      transaction.set(taskRef, stripUndefined({
        status: "resolved",
        leaseOwnerToken: "",
        leaseExpiresAt: "",
        resolvedAt: nowIso(),
        safeMessage: "Trade Copier Paystack cancellation was confirmed by provider webhook.",
        updatedAt: nowIso(),
        updatedBy: "paystack_webhook"
      }), { merge: true });
    }

    return true;
  });
}

async function applyTradeCopierRenewalWebhook({
  subscriptionRef,
  subscriptionRecord,
  data,
  eventTime,
  receipt
}: {
  subscriptionRef: FirebaseFirestore.DocumentReference;
  subscriptionRecord: Record<string, unknown>;
  data: Record<string, unknown>;
  eventTime: string;
  receipt: PaystackWebhookReceipt;
}) {
  const { db } = getFirebaseAdminClients();
  const payloadPlan = paystackPlanCodeFromPayloadData(data);
  const payloadAmount = safeNumber(data.amount);
  const payloadCurrency = safeString(data.currency) || "NGN";
  const periodEnd = paystackRenewalPeriodEnd(data);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(subscriptionRef);
    const current = snapshot.data() ?? subscriptionRecord;
    const currentCode = safeString(current.paystackSubscriptionCode);
    const currentStatus = mapBillingStatus(current.status);
    const storedPlan = safeString(current.paystackPlanCode);
    const storedCurrency = safeString(current.currency) || "NGN";
    const storedAmount = typeof current.amountNgn === "number" && Number.isFinite(current.amountNgn)
      ? current.amountNgn * 100
      : 0;

    if (
      safeString(current.product) !== TRADE_COPIER_PRODUCT_ID ||
      !currentCode ||
      currentCode !== receipt.subscriptionCode
    ) {
      return false;
    }

    const lastWebhookAt = safeString(current.lastPaystackWebhookAt);
    if (lastWebhookAt && Date.parse(lastWebhookAt) > Date.parse(eventTime)) {
      return false;
    }

    if (!storedPlan || !payloadPlan || storedPlan !== payloadPlan || !storedAmount || payloadAmount !== storedAmount || payloadCurrency !== storedCurrency) {
      transaction.set(subscriptionRef, stripUndefined({
        renewalNeedsReview: true,
        renewalReviewReason: "plan_amount_or_currency_mismatch",
        lastPaystackWebhookAt: eventTime,
        safeMessage: "Trade Copier renewal needs support review before billing status can change.",
        updatedAt: nowIso()
      }), { merge: true });
      return false;
    }

    if (!periodEnd) {
      transaction.set(subscriptionRef, stripUndefined({
        renewalNeedsReview: true,
        renewalReviewReason: "missing_authoritative_period_end",
        lastPaystackWebhookAt: eventTime,
        safeMessage: "Trade Copier renewal needs support review because Paystack did not provide the next billing period.",
        updatedAt: nowIso()
      }), { merge: true });
      return false;
    }

    if (
      currentStatus === "cancelled" ||
      currentStatus === "cancellation_pending" ||
      currentStatus === "needs_attention" ||
      currentStatus === "non_renewing"
    ) {
      transaction.set(subscriptionRef, stripUndefined({
        lastPaystackWebhookAt: eventTime,
        lateRenewalNeedsReview: true,
        safeMessage: "Trade Copier renewal was received after cancellation or support review. Setup remains locked.",
        updatedAt: nowIso()
      }), { merge: true });
      return false;
    }

    transaction.set(subscriptionRef, stripUndefined({
      status: "active_paid" as TradeCopierBillingStatus,
      billingState: "paid",
      currentPeriodEnd: periodEnd,
      lastRenewedAt: eventTime,
      lastPaystackWebhookAt: eventTime,
      lifecycleRevision: lifecycleRevision(current) + 1,
      safeMessage: "Trade Copier billing is active. Crypto Setup and Forex Setup are available through their own safety gates.",
      updatedAt: nowIso()
    }), { merge: true });
    return true;
  });
}

export async function processTradeCopierPaystackWebhook(
  payload: Record<string, unknown>,
  dependencies?: TradeCopierBillingDependencies
): Promise<PaystackWebhookReceipt & { handled: boolean; product?: string }> {
  const resolved = resolveDependencies(dependencies);
  const { db } = getFirebaseAdminClients();
  const eventId = receiptIdForTradeCopierWebhook(payload);
  const existing = await db.doc(`paystack_webhooks/${eventId}`).get();
  const data = asRecord(payload.data);
  const metadata = safeMetadata(data.metadata);
  const reference = safeString(data.reference);
  const subscriptionCode = safeString(data.subscription_code) || safeString(asRecord(data.subscription).subscription_code);
  const receipt: PaystackWebhookReceipt & { handled: boolean; product?: string } = {
    eventId,
    event: safeString(payload.event) || "unknown_event",
    reference: reference || undefined,
    subscriptionCode: subscriptionCode || undefined,
    invoiceCode: safeString(data.invoice_code) || undefined,
    processed: false,
    duplicate: existing.exists,
    receivedAt: nowIso(resolved.now()),
    handled: false,
    product: TRADE_COPIER_PRODUCT_ID
  };

  if (existing.exists) {
    return {
      ...receipt,
      handled: Boolean(existing.data()?.product === TRADE_COPIER_PRODUCT_ID),
      duplicate: true,
      processed: Boolean(existing.data()?.processed),
      processedAt: safeString(existing.data()?.processedAt) || undefined
    };
  }

  const metadataProduct = safeString(metadata.product);
  const metadataConflicts = Boolean(metadataProduct && metadataProduct !== TRADE_COPIER_PRODUCT_ID);

  if (receipt.event === "charge.success" && reference && !metadataConflicts) {
    const intentResult = metadata.workspaceId
      ? await findCanonicalPaymentIntentByReference(metadata.workspaceId, reference)
      : await findCanonicalPaymentIntentGloballyByReference(reference);

    if (intentResult) {
      const workspaceId = safeString(intentResult.record.workspaceId);
      const studentId = safeString(intentResult.record.studentId);
      const amountNgn = typeof intentResult.record.amountNgn === "number" ? intentResult.record.amountNgn : priceNgn();
      const verification: PaystackVerificationResult = {
        status: safeString(data.status) || "success",
        reference,
        amount: safeNumber(data.amount),
        currency: safeString(data.currency) || "NGN",
        paid_at: safeString(data.paid_at) || safeString(data.paidAt) || nowIso(resolved.now()),
        created_at: safeString(data.created_at) || safeString(data.createdAt) || nowIso(resolved.now()),
        customer: asRecord(data.customer) as PaystackVerificationResult["customer"],
        metadata: data.metadata,
        subscription: asRecord(data.subscription) as PaystackVerificationResult["subscription"]
      };

      assertVerificationMatchesIntent({
        verification,
        intent: intentResult.record,
        expectedProduct: TRADE_COPIER_PRODUCT_ID,
        amountNgn
      });

      const verificationResult = await applyCanonicalVerification({
        actor: { uid: "paystack_webhook", workspaceId, studentId, email: undefined, tierId: null, token: {} as VerifiedStudent["token"] },
        intentResult,
        reference,
        verification,
        verificationStatus: mapVerificationStatus(verification.status),
        resolved
      });

      receipt.workspaceId = workspaceId;
      receipt.studentId = studentId;
      receipt.processed = verificationResult.status === "verified";
      receipt.processedAt = receipt.processed ? nowIso(resolved.now()) : undefined;
      receipt.handled = true;
      await recordTradeCopierWebhookReceipt(receipt);
      return receipt;
    }
  }

  if (receipt.event === "charge.success" && subscriptionCode) {
    const subscription = await findCanonicalSubscriptionByPaystackCode(subscriptionCode);

    if (!subscription) return metadataConflicts ? receipt : receipt;

    const workspaceId = safeString(subscription.record.workspaceId);
    const studentId = safeString(subscription.record.studentId);
    receipt.workspaceId = workspaceId;
    receipt.studentId = studentId;
    receipt.handled = true;

    if (metadataConflicts || safeString(subscription.record.product) !== TRADE_COPIER_PRODUCT_ID) {
      receipt.processed = false;
      await recordTradeCopierWebhookReceipt(receipt);
      return receipt;
    }

    const processed = await applyTradeCopierRenewalWebhook({
      subscriptionRef: subscription.ref,
      subscriptionRecord: subscription.record,
      data,
      eventTime: cleanWebhookEventTime(data.paid_at ?? data.created_at ?? data.createdAt ?? nowIso(resolved.now())),
      receipt
    });
    receipt.processed = processed;
    receipt.processedAt = processed ? nowIso(resolved.now()) : undefined;
    await recordTradeCopierWebhookReceipt(receipt);
    return receipt;
  }

  if (
    (receipt.event === "invoice.payment_failed" ||
      receipt.event === "subscription.disable" ||
      receipt.event === "subscription.not_renew") &&
    subscriptionCode
  ) {
    const subscription = await findCanonicalSubscriptionByPaystackCode(subscriptionCode);

    if (!subscription) return receipt;
    const workspaceId = safeString(subscription.record.workspaceId);
    const studentId = safeString(subscription.record.studentId);
    receipt.workspaceId = workspaceId;
    receipt.studentId = studentId;
    receipt.handled = true;

    if (metadataConflicts || safeString(subscription.record.product) !== TRADE_COPIER_PRODUCT_ID) {
      receipt.processed = false;
      await recordTradeCopierWebhookReceipt(receipt);
      return receipt;
    }

    const status: TradeCopierBillingStatus =
      receipt.event === "invoice.payment_failed"
        ? "past_due"
        : receipt.event === "subscription.not_renew"
          ? "non_renewing"
          : "cancelled";

    const processed = await applyTradeCopierWebhookStatus({
      subscriptionRef: subscription.ref,
      subscriptionRecord: subscription.record,
      status,
      eventTime: cleanWebhookEventTime(data.paid_at ?? data.created_at ?? data.createdAt ?? nowIso(resolved.now())),
      receipt
    });
    receipt.processed = processed;
    receipt.processedAt = processed ? nowIso(resolved.now()) : undefined;
    await recordTradeCopierWebhookReceipt(receipt);
    return receipt;
  }

  if (metadataProduct === TRADE_COPIER_PRODUCT_ID) {
    receipt.handled = true;
    receipt.processed = false;
    await recordTradeCopierWebhookReceipt(receipt);
  }

  return receipt;
}

export async function processStudentTradeCopierLegacyCleanup({
  workspaceId,
  studentId,
  actorId,
  canonicalStatus
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
  canonicalStatus?: TradeCopierBillingStatus;
}) {
  const { db } = getFirebaseAdminClients();
  const now = nowIso();
  const access = await resolveTradeCopierBillingAccess(workspaceId, studentId);
  const cleanupStatus = canonicalStatus ?? access.status;

  if (cleanupStatus === "active_paid") return { ok: true, cleaned: false };

  await db.runTransaction(async (transaction) => {
    const subscriptionRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_subscriptions/current`);
    const taskRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_cleanup_tasks/${LEGACY_CLEANUP_TASK_ID}`);
    const subscriptionSnapshot = await transaction.get(subscriptionRef);
    const currentStatus = mapBillingStatus(subscriptionSnapshot.data()?.status);

    if (currentStatus === "active_paid") {
      throw new AdminApiError(409, "trade_copier_active_cleanup_blocked", "Trade Copier cleanup cannot run while subscription is active.");
    }

    for (const collection of ["crypto_autocopy_subscriptions", "forex_autocopy_subscriptions"]) {
      transaction.set(
        db.doc(`workspaces/${workspaceId}/students/${studentId}/${collection}/current`),
        stripUndefined({
          status: "cancelled",
          billingState: "cancelled",
          unifiedTradeCopierCanonicalStatus: currentStatus,
          safeMessage: "Legacy Copier subscription was superseded by unified Trade Copier billing.",
          updatedAt: now,
          updatedBy: actorId
        }),
        { merge: true }
      );
    }

    transaction.set(taskRef, {
      status: "resolved",
      resolvedAt: now,
      updatedAt: now,
      updatedBy: actorId
    }, { merge: true });
  });

  return { ok: true, cleaned: true };
}

export async function processStudentTradeCopierPaystackCancellationRetry({
  workspaceId,
  studentId,
  actorId
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
}, dependencies?: TradeCopierBillingDependencies) {
  const resolved = resolveDependencies(dependencies);
  const { db } = getFirebaseAdminClients();
  const subscriptionRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_subscriptions/current`);
  const taskRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_cleanup_tasks/${PAYSTACK_CANCELLATION_TASK_ID}`);
  const legacyTaskRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_cleanup_tasks/${LEGACY_CLEANUP_TASK_ID}`);
  const ownerToken = operationToken("paystack_cancel_retry");
  const claimed = await db.runTransaction(async (transaction) => {
    const now = nowIso(resolved.now());
    const leaseExpiresAt = new Date(Date.parse(now) + PAYSTACK_CANCELLATION_RETRY_LEASE_MS).toISOString();
    const [subscriptionSnapshot, taskSnapshot] = await Promise.all([
      transaction.get(subscriptionRef),
      transaction.get(taskRef)
    ]);
    const subscription = subscriptionSnapshot.data();
    const task = taskSnapshot.data();
    const status = mapBillingStatus(subscription?.status);

    if (!taskSnapshot.exists || !isRetryablePaystackCancellationTask(task, now)) {
      return { claimed: false as const, reason: "no_retry_due" };
    }

    const attemptCount = cleanupAttemptCount(task);
    if (attemptCount >= PAYSTACK_CANCELLATION_RETRY_MAX_ATTEMPTS) {
      transaction.set(taskRef, stripUndefined({
        status: "final_failed",
        safeMessage: "Trade Copier Paystack cancellation retry reached the bounded attempt limit.",
        updatedAt: now,
        updatedBy: actorId
      }), { merge: true });
      return { claimed: false as const, reason: "max_attempts" };
    }

    const target = paystackSubscriptionTarget(task);
    const currentTarget = paystackSubscriptionTarget(subscription);

    if (
      safeString(task?.action) !== "paystack_disable_subscription" ||
      !target ||
      !currentTarget ||
      currentTarget.code !== target.code ||
      status === "active_paid" ||
      safeString(subscription?.cancellationOperationToken) !== safeString(task?.expectedOperationToken) ||
      lifecycleRevision(subscription) !== safeNumber(task?.expectedLifecycleRevision)
    ) {
      transaction.set(taskRef, stripUndefined({
        status: "blocked",
        safeMessage: "Trade Copier Paystack cancellation retry was blocked because the active subscription target changed.",
        updatedAt: now,
        updatedBy: actorId
      }), { merge: true });
      return { claimed: false as const, reason: "target_changed" };
    }

    transaction.set(taskRef, stripUndefined({
      status: "in_progress",
      leaseOwnerToken: ownerToken,
      leaseExpiresAt,
      safeMessage: "Trade Copier Paystack cancellation retry is leased for provider confirmation.",
      updatedAt: now,
      updatedBy: actorId
    }), { merge: true });

    return {
      claimed: true as const,
      target,
      expectedOperationToken: safeString(task?.expectedOperationToken),
      expectedLifecycleRevision: lifecycleRevision(subscription),
      attemptCount
    };
  });

  if (!claimed.claimed) {
    return { ok: claimed.reason === "no_retry_due", retried: false, reason: claimed.reason };
  }

  const preflight = await db.runTransaction(async (transaction) => {
    const now = nowIso(resolved.now());
    const [subscriptionSnapshot, taskSnapshot] = await Promise.all([
      transaction.get(subscriptionRef),
      transaction.get(taskRef)
    ]);
    const subscription = subscriptionSnapshot.data();
    const task = taskSnapshot.data();
    const currentTarget = paystackSubscriptionTarget(subscription);

    if (
      task?.status !== "in_progress" ||
      safeString(task.leaseOwnerToken) !== ownerToken ||
      cleanupLeaseExpired(task, now) ||
      safeString(task.action) !== "paystack_disable_subscription" ||
      safeString(task.expectedOperationToken) !== claimed.expectedOperationToken ||
      lifecycleRevision(subscription) !== claimed.expectedLifecycleRevision ||
      currentTarget?.code !== claimed.target.code ||
      currentTarget?.token !== claimed.target.token ||
      cleanupAttemptCount(task) !== claimed.attemptCount
    ) {
      transaction.set(taskRef, stripUndefined({
        status: "blocked",
        safeMessage: "Trade Copier Paystack cancellation retry lost lease or target ownership before provider call.",
        updatedAt: now,
        updatedBy: actorId
      }), { merge: true });
      return false;
    }

    return true;
  });

  if (!preflight) {
    return { ok: false, retried: false, reason: "lease_or_target_changed" };
  }

  try {
    const result = await resolved.paystack.disableSubscription(claimed.target);

    if (!isPaystackDisableConfirmed(result)) {
      throw new Error("Paystack did not confirm subscription disable.");
    }

    await db.runTransaction(async (transaction) => {
      const [latestSubscriptionSnapshot, latestTaskSnapshot] = await Promise.all([
        transaction.get(subscriptionRef),
        transaction.get(taskRef)
      ]);
      const latestSubscription = latestSubscriptionSnapshot.data();
      const latestTask = latestTaskSnapshot.data();
      const latestTarget = paystackSubscriptionTarget(latestSubscription);

      if (
        latestTask?.status !== "in_progress" ||
        safeString(latestTask.leaseOwnerToken) !== ownerToken ||
        cleanupLeaseExpired(latestTask, nowIso(resolved.now())) ||
        latestTarget?.code !== claimed.target.code ||
        latestTarget?.token !== claimed.target.token ||
        safeString(latestSubscription?.cancellationOperationToken) !== claimed.expectedOperationToken ||
        lifecycleRevision(latestSubscription) !== claimed.expectedLifecycleRevision
      ) {
        return;
      }

      transaction.set(subscriptionRef, stripUndefined({
        status: "cancelled" as TradeCopierBillingStatus,
        billingState: "cancelled",
        safeMessage: "Trade Copier subscription was cancelled. Crypto Setup and Forex Setup are locked.",
        cancelledAt: nowIso(resolved.now()),
        updatedAt: nowIso(resolved.now()),
        lifecycleRevision: lifecycleRevision(latestSubscription) + 1
      }), { merge: true });
      transaction.set(taskRef, stripUndefined({
        status: "resolved",
        resolvedAt: nowIso(resolved.now()),
        safeMessage: "Trade Copier Paystack cancellation retry confirmed provider disable.",
        updatedAt: nowIso(resolved.now()),
        updatedBy: actorId
      }), { merge: true });
    });

    try {
      await resolved.legacyCleanup({
        workspaceId,
        studentId,
        actorId,
        canonicalStatus: "cancelled"
      });
    } catch (cleanupError) {
      const cleanupFailureReason = sanitizeSupportMessage(
        cleanupError instanceof Error ? cleanupError.message : "Legacy Copier cleanup failed."
      );
      await legacyTaskRef.set(stripUndefined({
        status: "retry_scheduled",
        safeMessage: `Legacy Copier cleanup remains pending: ${cleanupFailureReason}`,
        lastFailureCategory: "legacy_cleanup_failed",
        nextAttemptAt: addDays(new Date(nowIso(resolved.now())), 1).toISOString(),
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
    }

    return { ok: true, retried: true };
  } catch (error) {
    const failureReason = sanitizeSupportMessage(
      error instanceof Error ? error.message : "Paystack subscription cancellation retry failed."
    );
    await db.runTransaction(async (transaction) => {
      const now = nowIso(resolved.now());
      const [subscriptionSnapshot, snapshot] = await Promise.all([
        transaction.get(subscriptionRef),
        transaction.get(taskRef)
      ]);
      const subscription = subscriptionSnapshot.data();
      const task = snapshot.data();

      if (task?.status !== "in_progress" || safeString(task.leaseOwnerToken) !== ownerToken) {
        return;
      }

      const attemptCount = cleanupAttemptCount(task) + 1;
      let nextExpectedLifecycleRevision = claimed.expectedLifecycleRevision;
      if (
        mapBillingStatus(subscription?.status) === "cancellation_pending" &&
        safeString(subscription?.cancellationOperationToken) === claimed.expectedOperationToken &&
        lifecycleRevision(subscription) === claimed.expectedLifecycleRevision
      ) {
        nextExpectedLifecycleRevision = lifecycleRevision(subscription) + 1;
        transaction.set(subscriptionRef, stripUndefined({
          status: "needs_attention" as TradeCopierBillingStatus,
          billingState: "failed",
          safeMessage: "Trade Copier cancellation needs support. Crypto Setup and Forex Setup are locked.",
          updatedAt: now,
          lifecycleRevision: nextExpectedLifecycleRevision
        }), { merge: true });
      }

      transaction.set(taskRef, stripUndefined({
        status: attemptCount >= PAYSTACK_CANCELLATION_RETRY_MAX_ATTEMPTS ? "final_failed" : "retry_scheduled",
        leaseOwnerToken: "",
        leaseExpiresAt: "",
        safeMessage: `Trade Copier Paystack cancellation retry remains pending: ${failureReason}`,
        lastFailureCategory: "paystack_disable_retry_failed",
        attemptCount,
        expectedLifecycleRevision: nextExpectedLifecycleRevision,
        nextAttemptAt: nextCancellationRetryAt(now, attemptCount),
        updatedAt: now,
        updatedBy: actorId
      }), { merge: true });
    });

    return { ok: false, retried: true, reason: "provider_failed" };
  }
}

export async function runTradeCopierPaystackCancellationRetryWorker(
  actor: { uid: string },
  payload: { limit?: number } = {},
  dependencies?: TradeCopierBillingDependencies
) {
  const resolved = resolveDependencies(dependencies);
  const { db } = getFirebaseAdminClients();
  const now = nowIso(resolved.now());
  const limit = Math.min(
    PAYSTACK_CANCELLATION_RETRY_BATCH_LIMIT,
    Math.max(1, Math.floor(typeof payload.limit === "number" && Number.isFinite(payload.limit) ? payload.limit : PAYSTACK_CANCELLATION_RETRY_BATCH_LIMIT))
  );
  const scheduledSnapshot = await db
    .collectionGroup("trade_copier_cleanup_tasks")
    .where("action", "==", "paystack_disable_subscription")
    .where("status", "==", "retry_scheduled")
    .where("nextAttemptAt", "<=", now)
    .orderBy("nextAttemptAt", "asc")
    .limit(limit)
    .get();
  const abandonedSnapshot = await db
    .collectionGroup("trade_copier_cleanup_tasks")
    .where("action", "==", "paystack_disable_subscription")
    .where("status", "==", "in_progress")
    .where("leaseExpiresAt", "<=", now)
    .orderBy("leaseExpiresAt", "asc")
    .limit(limit)
    .get();
  const results: Array<{ status: string; reason?: string }> = [];
  const docs = [...scheduledSnapshot.docs, ...abandonedSnapshot.docs]
    .filter((doc, index, all) => all.findIndex((candidate) => candidate.ref.path === doc.ref.path) === index)
    .sort((left, right) => {
      const leftDate = safeString(left.data().nextAttemptAt) || safeString(left.data().leaseExpiresAt);
      const rightDate = safeString(right.data().nextAttemptAt) || safeString(right.data().leaseExpiresAt);
      return Date.parse(leftDate) - Date.parse(rightDate);
    })
    .slice(0, limit);

  for (const doc of docs) {
    const scope = studentPathFromCleanupTaskRef(doc.ref);

    if (!scope) {
      results.push({ status: "skipped", reason: "invalid_task_scope" });
      continue;
    }

    const result = await processStudentTradeCopierPaystackCancellationRetry({
      workspaceId: scope.workspaceId,
      studentId: scope.studentId,
      actorId: actor.uid
    }, dependencies);

    results.push({
      status: result.ok && result.retried ? "processed" : result.ok ? "skipped" : "blocked",
      reason: result.reason
    });
  }

  return {
    ok: true,
    processed: results.filter((result) => result.status === "processed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    blocked: results.filter((result) => result.status === "blocked").length,
    limit,
    dryRun: false,
    results
  };
}

export async function cancelStudentTradeCopierSubscription(
  actor: VerifiedStudent,
  dependencies?: TradeCopierBillingDependencies
) {
  const resolved = resolveDependencies(dependencies);
  await loadContext(actor);
  await materializeLegacyGrandfatherIfNeeded(actor.workspaceId, actor.studentId);
  const { db } = getFirebaseAdminClients();
  const now = nowIso(resolved.now());
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/trade_copier_subscriptions/current`);
  const legacyTaskRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/trade_copier_cleanup_tasks/${LEGACY_CLEANUP_TASK_ID}`);
  const paystackTaskRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/trade_copier_cleanup_tasks/${PAYSTACK_CANCELLATION_TASK_ID}`);

  const cancellation = await db.runTransaction(async (transaction) => {
    const [snapshot, paystackTaskSnapshot] = await Promise.all([
      transaction.get(subscriptionRef),
      transaction.get(paystackTaskRef)
    ]);
    const existing = snapshot.data() ?? {};
    const currentStatus = mapBillingStatus(existing.status);
    const target = paystackSubscriptionTarget(existing);
    const existingTask = paystackTaskSnapshot.data();
    const rail = safeString(existing.rail) || "paystack";
    const token = operationToken("cancel");
    const nextRevision = lifecycleRevision(existing) + 1;
    const needsProvider = rail === "paystack" && Boolean(target);
    const missingPaystackRenewalTarget = rail === "paystack" && currentStatus === "active_paid" && !target;
    const existingTaskStatus = safeString(existingTask?.status);
    const existingTaskTarget = paystackSubscriptionTarget(existingTask);
    const existingTaskMatchesTarget = Boolean(
      existingTask &&
        safeString(existingTask.action) === "paystack_disable_subscription" &&
        target &&
        existingTaskTarget?.code === target.code
    );

    if (currentStatus === "cancelled") {
      return { needsProvider: false, alreadyCancelled: true, skipLegacyCleanup: true, runLegacyCleanup: false, rail, token, target: null };
    }

    if (
      (currentStatus === "cancellation_pending" || currentStatus === "needs_attention" || currentStatus === "non_renewing") &&
      existingTaskMatchesTarget &&
      (existingTaskStatus === "retry_scheduled" || existingTaskStatus === "in_progress")
    ) {
      return {
        needsProvider: true,
        alreadyCancelled: false,
        alreadyPending: true,
        skipLegacyCleanup: true,
        runLegacyCleanup: false,
        rail,
        token: safeString(existing.cancellationOperationToken),
        target: null
      };
    }

    if (
      existingTaskMatchesTarget &&
      (existingTaskStatus === "blocked" || existingTaskStatus === "final_failed")
    ) {
      return {
        needsProvider: false,
        alreadyCancelled: false,
        alreadyPending: true,
        skipLegacyCleanup: true,
        runLegacyCleanup: false,
        rail,
        token: safeString(existing.cancellationOperationToken),
        target: null
      };
    }

    if (existingTaskMatchesTarget && existingTaskStatus === "resolved") {
      transaction.set(subscriptionRef, stripUndefined({
        status: "cancelled" as TradeCopierBillingStatus,
        billingState: "cancelled",
        safeMessage: "Trade Copier subscription was cancelled. Crypto Setup and Forex Setup are locked.",
        cancelledAt: existing.cancelledAt ?? now,
        updatedAt: now,
        lifecycleRevision: lifecycleRevision(existing) + 1
      }), { merge: true });
      return {
        needsProvider: false,
        alreadyCancelled: false,
        reconciledResolved: true,
        skipLegacyCleanup: true,
        runLegacyCleanup: false,
        rail,
        token: safeString(existing.cancellationOperationToken),
        target: null
      };
    }

    transaction.set(subscriptionRef, stripUndefined({
      subscriptionId: "current",
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      product: TRADE_COPIER_PRODUCT_ID,
      status: needsProvider
        ? "cancellation_pending" as TradeCopierBillingStatus
        : missingPaystackRenewalTarget
          ? "needs_attention" as TradeCopierBillingStatus
          : "cancelled" as TradeCopierBillingStatus,
      billingState: missingPaystackRenewalTarget ? "failed" : "cancelled",
      rail,
      previousStatus: currentStatus,
      cancellationOperationToken: token,
      lifecycleRevision: nextRevision,
      safeMessage: needsProvider
        ? "Trade Copier cancellation is being confirmed. Crypto Setup and Forex Setup are locked."
        : missingPaystackRenewalTarget
          ? "Trade Copier cancellation needs support. Crypto Setup and Forex Setup are locked."
        : "Trade Copier subscription was cancelled. Crypto Setup and Forex Setup are locked.",
      createdAt: existing.createdAt ?? now,
      updatedAt: now,
      cancellationRequestedAt: now,
      cancelledAt: needsProvider || missingPaystackRenewalTarget ? undefined : now
    }), { merge: true });

    transaction.set(legacyTaskRef, stripUndefined({
      taskId: LEGACY_CLEANUP_TASK_ID,
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      action: "legacy_subscription_cleanup",
      status: "retry_scheduled",
      canonicalStatus: needsProvider ? "cancellation_pending" : "cancelled",
      safeMessage: "Legacy Copier subscription records require idempotent cleanup after cancellation.",
      attemptCount: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
      updatedBy: actor.uid
    }), { merge: true });

    if (needsProvider && target) {
      transaction.set(paystackTaskRef, stripUndefined({
        taskId: PAYSTACK_CANCELLATION_TASK_ID,
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        action: "paystack_disable_subscription",
        status: "retry_scheduled",
        paystackSubscriptionCode: target.code,
        paystackEmailToken: target.token,
        expectedOperationToken: token,
        expectedLifecycleRevision: nextRevision,
        safeMessage: "Trade Copier Paystack subscription cancellation is queued for leased provider confirmation.",
        attemptCount: 0,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
        updatedBy: actor.uid
      }), { merge: true });
    } else {
      transaction.set(paystackTaskRef, stripUndefined({
        taskId: PAYSTACK_CANCELLATION_TASK_ID,
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        action: "paystack_disable_subscription",
        status: missingPaystackRenewalTarget ? "blocked" : "not_required",
        safeMessage: missingPaystackRenewalTarget
          ? "Trade Copier provider cancellation needs support because subscription renewal details are unavailable."
          : "No Trade Copier Paystack subscription cancellation is required.",
        attemptCount: 0,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
        updatedBy: actor.uid
      }), { merge: true });
    }

    return {
      needsProvider,
      alreadyCancelled: false,
      skipLegacyCleanup: false,
      runLegacyCleanup: !needsProvider && !missingPaystackRenewalTarget,
      rail,
      token,
      target
    };
  });

  if (
    !cancellation.alreadyCancelled &&
    cancellation.needsProvider &&
    cancellation.target &&
    !resolved.skipImmediateCancellationRetry
  ) {
    await processStudentTradeCopierPaystackCancellationRetry({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid
    }, dependencies);
  }

  if (!cancellation.skipLegacyCleanup && cancellation.runLegacyCleanup) {
    try {
      await resolved.legacyCleanup({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        canonicalStatus: "cancelled",
        actorId: actor.uid
      });
    } catch (error) {
      const failureReason = sanitizeSupportMessage(
        error instanceof Error ? error.message : "Legacy Copier cleanup failed."
      );
      await legacyTaskRef.set(stripUndefined({
        status: "retry_scheduled",
        safeMessage: `Legacy Copier cleanup remains pending: ${failureReason}`,
        lastFailureCategory: "legacy_cleanup_failed",
        nextAttemptAt: addDays(new Date(now), 1).toISOString(),
        updatedAt: nowIso(resolved.now())
      }), { merge: true });
    }
  }

  const [finalSubscriptionSnapshot, finalPaystackTaskSnapshot] = await Promise.all([
    subscriptionRef.get(),
    paystackTaskRef.get()
  ]);
  const finalSubscription = finalSubscriptionSnapshot.data() ?? {};
  const finalStatus = mapBillingStatus(finalSubscription.status);
  const finalTask = finalPaystackTaskSnapshot.data();
  const finalTaskStatus = safeString(finalTask?.status);
  const safeProviderCancellationStatus =
    finalTaskStatus === "resolved" ||
    finalTaskStatus === "retry_scheduled" ||
    finalTaskStatus === "in_progress" ||
    finalTaskStatus === "blocked" ||
    finalTaskStatus === "final_failed" ||
    finalTaskStatus === "not_required"
      ? finalTaskStatus
      : "unknown";
  const cancellationCompleted = finalStatus === "cancelled";

  await writeAudit({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: cancellationCompleted
      ? "trade_copier.subscription.cancelled"
      : "trade_copier.subscription.cancellation_requested",
    targetId: "current",
    safeMessage: cancellationCompleted
      ? "Trade Copier subscription cancellation completed. Crypto Setup and Forex Setup are locked."
      : "Trade Copier cancellation was requested and setup access remains locked pending provider confirmation or support review.",
    after: {
      status: finalStatus,
      providerCancellation: safeProviderCancellationStatus
    }
  });
}
