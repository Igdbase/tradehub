import "server-only";

import crypto from "node:crypto";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import { cleanupForexProvisioningForSubscriptionLifecycle } from "@/lib/crypto-execution/forex-provisioning-repository";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  getPaystackReadiness,
  initializePaystackTransaction,
  verifyPaystackTransaction
} from "@/lib/paystack/paystack-client";
import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import {
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot as studentRecordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import type {
  ForexAutoCopyBillingStatus,
  ForexAutoCopySubscriptionRecord,
  StudentForexAutoCopyCheckoutResponse
} from "@/types/crypto-execution";
import type { StudentSubscription } from "@/types/payments";
import type { StudentAppProfile } from "@/types/student-app";
import type { Workspace } from "@/types/workspace";

type ForexSubscriptionContext = {
  workspace: Workspace;
  student: StudentAppProfile;
  studentRecord: Record<string, unknown>;
  courseSubscription: StudentSubscription | null;
  actor: VerifiedStudent;
};

type PaymentIntentStatus = "pending" | "checkout_opened" | "verified" | "failed" | "cancelled" | "expired";

const BILLING_DISABLED_STATUSES = new Set<ForexAutoCopyBillingStatus>([
  "past_due",
  "cancelled",
  "expired"
]);

function nowIso() {
  return new Date().toISOString();
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
  return `fxpi_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function paymentReference() {
  return `thfx_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
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
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}

function priceNgn() {
  const configured = Number(process.env.FOREX_AUTOCOPY_PRICE_NGN ?? "");
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 25000;
}

function planCode() {
  return process.env.PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE?.trim() || undefined;
}

function checkoutEmailForPaystack(email: string, studentId: string) {
  const override = process.env.PAYSTACK_FOREX_AUTOCOPY_CHECKOUT_EMAIL?.trim();

  if (override) {
    return override;
  }

  if (getPaystackReadiness().mode === "test" && isUsingLocalEmulator() && email.endsWith(".test")) {
    return `${studentId}+forex-autocopy@example.com`;
  }

  return email;
}

function requireForexAutoCopyPlanCode() {
  const code = planCode();

  if (!code) {
    throw new AdminApiError(
      503,
      "forex_autocopy_plan_not_configured",
      "Forex AutoCopy Paystack plan code is not configured yet."
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
  url.searchParams.set("forexReference", reference);
  return url.toString();
}

function billingStateForStatus(status: ForexAutoCopyBillingStatus): ForexAutoCopySubscriptionRecord["billingState"] {
  if (status === "active_paid") {
    return "paid";
  }

  if (status === "payment_pending") {
    return "pending";
  }

  if (status === "payment_failed") {
    return "failed";
  }

  if (status === "trial_only") {
    return "trial";
  }

  if (status === "past_due" || status === "cancelled" || status === "expired") {
    return status;
  }

  return "unknown";
}

function mapVerificationStatus(status: string): "verified" | "pending" | "failed" {
  if (status === "success") {
    return "verified";
  }

  if (status === "pending" || status === "ongoing" || status === "processing") {
    return "pending";
  }

  return "failed";
}

async function loadContext(actor: VerifiedStudent): Promise<ForexSubscriptionContext> {
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

function assertCanBuyForexAutoCopy(context: ForexSubscriptionContext) {
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
    throw new AdminApiError(403, "personal_account_required", "Forex AutoCopy can only be purchased for personal broker accounts.");
  }

  if (!entitlements.subscriptionActive || entitlements.subscriptionStatus === "trial") {
    throw new AdminApiError(403, "paid_course_subscription_required", "A paid active TradeHub subscription is required before purchasing the Forex AutoCopy add-on.");
  }

  if (
    entitlements.subscriptionStatus === "past_due" ||
    entitlements.subscriptionStatus === "cancelled" ||
    entitlements.subscriptionStatus === "expired"
  ) {
    throw new AdminApiError(403, "course_subscription_inactive", "Renew your TradeHub subscription before purchasing Forex AutoCopy.");
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
  const eventRef = db.collection(`workspaces/${workspaceId}/forex_provisioning_audit_events`).doc();

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

export async function createStudentForexAutoCopyCheckout(
  actor: VerifiedStudent
): Promise<StudentForexAutoCopyCheckoutResponse> {
  const context = await loadContext(actor);
  assertCanBuyForexAutoCopy(context);
  const studentEmail = context.student.email || actor.email;

  if (!studentEmail) {
    throw new AdminApiError(400, "student_email_required", "This student account needs an email before checkout can start.");
  }

  const checkoutEmail = checkoutEmailForPaystack(studentEmail, actor.studentId);

  if (!getPaystackReadiness().configured) {
    throw new AdminApiError(503, "paystack_not_configured", "Paystack test checkout is not configured for Forex AutoCopy yet.");
  }

  const forexPlanCode = requireForexAutoCopyPlanCode();
  const { db } = getFirebaseAdminClients();
  const now = nowIso();
  const id = paymentIntentId();
  const reference = paymentReference();
  const amountNgn = priceNgn();
  const expiresAt = addDays(new Date(now), 1).toISOString();
  const intentRef = db.doc(`workspaces/${actor.workspaceId}/forex_autocopy_payment_intents/${id}`);
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_autocopy_subscriptions/current`);

  await db.runTransaction(async (transaction) => {
    transaction.set(intentRef, stripUndefined({
      paymentIntentId: id,
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      product: "forex_autocopy",
      rail: "paystack",
      status: "pending" as PaymentIntentStatus,
      amountNgn,
      currency: "NGN",
      paystackReference: reference,
      referenceRef: maskReference(reference),
      paystackPlanCode: forexPlanCode,
      safeMessage: "Forex AutoCopy Paystack checkout was created. Broker provisioning remains locked until payment is verified.",
      createdAt: now,
      updatedAt: now,
      expiresAt
    }));
    transaction.set(subscriptionRef, stripUndefined({
      subscriptionId: "current",
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      status: "payment_pending" as ForexAutoCopyBillingStatus,
      billingState: "pending",
      rail: "paystack",
      priceLabel: `${amountNgn.toLocaleString("en-NG")} NGN`,
      latestPaymentIntentId: id,
      latestReference: reference,
      latestReferenceRef: maskReference(reference),
      createdAt: now,
      updatedAt: now
    }), { merge: true });
  });

  try {
    const checkout = await initializePaystackTransaction(stripUndefined({
      email: checkoutEmail,
      amount: amountNgn * 100,
      reference,
      callback_url: callbackUrl(reference),
      plan: forexPlanCode,
      metadata: {
        product: "forex_autocopy",
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        paymentIntentId: id
      }
    }));

    await db.runTransaction(async (transaction) => {
      transaction.set(intentRef, stripUndefined({
        status: "checkout_opened" as PaymentIntentStatus,
        paystackAccessCode: checkout.access_code,
        paystackAuthorizationUrl: checkout.authorization_url,
        safeMessage: "Forex AutoCopy Paystack checkout is open. Broker provisioning unlocks only after verified payment.",
        updatedAt: nowIso()
      }), { merge: true });
      transaction.set(subscriptionRef, stripUndefined({
        status: "payment_pending" as ForexAutoCopyBillingStatus,
        billingState: "pending",
        latestPaymentIntentId: id,
        latestReference: reference,
        latestReferenceRef: maskReference(reference),
        updatedAt: nowIso()
      }), { merge: true });
    });

    await writeAudit({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "forex_autocopy.paystack.checkout_opened",
      targetId: id,
      safeMessage: "Student opened a Paystack checkout for TradeHub-managed Forex AutoCopy. No MetaAPI resource or broker account was created.",
      after: { amountNgn, rail: "paystack", referenceRef: maskReference(reference), product: "forex_autocopy" }
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
      transaction.set(intentRef, stripUndefined({
        status: "failed" as PaymentIntentStatus,
        failureReason,
        safeMessage: `Forex AutoCopy Paystack checkout could not be opened: ${failureReason}`,
        updatedAt: nowIso()
      }), { merge: true });
      transaction.set(subscriptionRef, stripUndefined({
        status: "payment_failed" as ForexAutoCopyBillingStatus,
        billingState: "failed",
        updatedAt: nowIso()
      }), { merge: true });
    });
    throw error;
  }
}

async function findStudentForexPaymentIntentByReference(workspaceId: string, reference: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_autocopy_payment_intents`)
    .where("paystackReference", "==", reference)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  return doc ? { ref: doc.ref, record: doc.data(), id: doc.id } : null;
}

export async function verifyStudentForexAutoCopyCheckout(actor: VerifiedStudent, reference: string) {
  const context = await loadContext(actor);
  assertCanBuyForexAutoCopy(context);
  const cleanReference = reference.trim();

  if (!cleanReference || cleanReference.length > 160) {
    throw new AdminApiError(400, "invalid_reference", "A valid Forex AutoCopy Paystack reference is required.");
  }

  const intentResult = await findStudentForexPaymentIntentByReference(actor.workspaceId, cleanReference);

  if (!intentResult) {
    throw new AdminApiError(404, "forex_autocopy_payment_intent_not_found", "TradeHub could not find that Forex AutoCopy payment intent.");
  }

  if (intentResult.record.studentId !== actor.studentId) {
    throw new AdminApiError(403, "payment_intent_scope_mismatch", "That Forex AutoCopy payment intent belongs to another student.");
  }

  const amountNgn = typeof intentResult.record.amountNgn === "number" ? intentResult.record.amountNgn : priceNgn();
  const verification = await verifyPaystackTransaction(cleanReference);
  const verificationStatus = mapVerificationStatus(verification.status);
  const { db } = getFirebaseAdminClients();
  const now = nowIso();
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_autocopy_subscriptions/current`);

  if (verification.currency !== "NGN" || verification.amount !== amountNgn * 100) {
    await db.runTransaction(async (transaction) => {
      transaction.set(intentResult.ref, stripUndefined({
        status: "failed" as PaymentIntentStatus,
        failureReason: "Paystack amount or currency did not match the Forex AutoCopy checkout intent.",
        safeMessage: "Forex AutoCopy payment verification failed safely.",
        updatedAt: now
      }), { merge: true });
      transaction.set(subscriptionRef, stripUndefined({
        status: "payment_failed" as ForexAutoCopyBillingStatus,
        billingState: "failed",
        latestPaymentIntentId: intentResult.id,
        latestReference: cleanReference,
        latestReferenceRef: maskReference(cleanReference),
        updatedAt: now
      }), { merge: true });
    });
    throw new AdminApiError(400, "payment_verification_mismatch", "Paystack verified a transaction that does not match this Forex AutoCopy checkout.");
  }

  if (verificationStatus !== "verified") {
    const nextStatus: ForexAutoCopyBillingStatus = verificationStatus === "pending" ? "payment_pending" : "payment_failed";
    await applyForexAutoCopySubscriptionLifecycle({
      actor,
      status: nextStatus,
      paymentIntentId: intentResult.id,
      reference: cleanReference,
      amountNgn,
      safeMessage: verificationStatus === "pending"
        ? "Paystack has not confirmed this Forex AutoCopy payment yet."
        : "Paystack did not report this Forex AutoCopy payment as successful."
    });
    await intentResult.ref.set(stripUndefined({
      status: verificationStatus === "pending" ? "pending" : "failed",
      failureReason: verificationStatus === "failed" ? `Paystack status: ${verification.status}` : undefined,
      safeMessage: verificationStatus === "pending"
        ? "Forex AutoCopy checkout is still pending."
        : "Forex AutoCopy payment failed safely.",
      updatedAt: now
    }), { merge: true });

    return {
      status: verificationStatus,
      message: verificationStatus === "pending"
        ? "Paystack has not confirmed this Forex AutoCopy payment yet."
        : "Paystack did not report this Forex AutoCopy payment as successful."
    };
  }

  const periodEnd =
    verification.subscription?.next_payment_date && Number.isFinite(Date.parse(verification.subscription.next_payment_date))
      ? new Date(verification.subscription.next_payment_date)
      : addMonths(new Date(now), 1);

  await db.runTransaction(async (transaction) => {
    transaction.set(intentResult.ref, stripUndefined({
      status: "verified" as PaymentIntentStatus,
      verifiedAt: now,
      paystackCustomerCode: verification.customer?.customer_code,
      paystackSubscriptionCode: verification.subscription?.subscription_code,
      safeMessage: "Forex AutoCopy payment verified. Broker provisioning is now unlocked for the paid add-on.",
      updatedAt: now
    }), { merge: true });
    transaction.set(subscriptionRef, stripUndefined({
      subscriptionId: "current",
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      status: "active_paid" as ForexAutoCopyBillingStatus,
      billingState: "paid",
      rail: "paystack",
      priceLabel: `${amountNgn.toLocaleString("en-NG")} NGN`,
      latestPaymentIntentId: intentResult.id,
      latestReference: cleanReference,
      latestReferenceRef: maskReference(cleanReference),
      paystackCustomerCode: verification.customer?.customer_code,
      paystackSubscriptionCode: verification.subscription?.subscription_code,
      currentPeriodEnd: periodEnd.toISOString(),
      lastVerifiedAt: now,
      createdAt: intentResult.record.createdAt ?? now,
      updatedAt: now
    }), { merge: true });
  });

  await writeAudit({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "forex_autocopy.paystack.payment_verified",
    targetId: intentResult.id,
    safeMessage: "Forex AutoCopy Paystack payment verified. Broker provisioning can unlock through server-side billing gates.",
    after: {
      status: "active_paid",
      rail: "paystack",
      referenceRef: maskReference(cleanReference),
      paystackMode: getPaystackReadiness().mode
    }
  });

  return {
    status: "verified" as const,
    message: "Forex AutoCopy payment verified. Broker provisioning is now unlocked."
  };
}

export async function applyForexAutoCopySubscriptionLifecycle({
  actor,
  status,
  paymentIntentId,
  reference,
  amountNgn,
  safeMessage
}: {
  actor: VerifiedStudent;
  status: ForexAutoCopyBillingStatus;
  paymentIntentId?: string;
  reference?: string;
  amountNgn?: number;
  safeMessage?: string;
}) {
  const context = await loadContext(actor);
  const now = nowIso();
  const { db } = getFirebaseAdminClients();
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_autocopy_subscriptions/current`);
  const statusMessage =
    safeMessage ??
    (status === "cancelled"
      ? "Forex AutoCopy subscription was cancelled. Broker provisioning is disabled."
      : status === "past_due"
        ? "Forex AutoCopy subscription is past due. Broker provisioning is disabled."
        : status === "expired"
          ? "Forex AutoCopy subscription expired. Broker provisioning is disabled."
          : status === "payment_failed"
            ? "Forex AutoCopy payment failed. Broker provisioning remains locked."
            : status === "payment_pending"
              ? "Forex AutoCopy payment is pending. Broker provisioning remains locked."
              : "Forex AutoCopy billing state was updated.");

  await subscriptionRef.set(stripUndefined({
    subscriptionId: "current",
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    status,
    billingState: billingStateForStatus(status),
    rail: "paystack",
    priceLabel: amountNgn ? `${amountNgn.toLocaleString("en-NG")} NGN` : undefined,
    latestPaymentIntentId: paymentIntentId,
    latestReference: reference,
    latestReferenceRef: reference ? maskReference(reference) : undefined,
    createdAt: now,
    updatedAt: now
  }), { merge: true });

  if (paymentIntentId) {
    await db.doc(`workspaces/${actor.workspaceId}/forex_autocopy_payment_intents/${paymentIntentId}`).set(stripUndefined({
      status: status === "payment_failed"
        ? "failed"
        : status === "cancelled"
          ? "cancelled"
          : status === "expired"
            ? "expired"
            : undefined,
      safeMessage: statusMessage,
      updatedAt: now
    }), { merge: true });
  }

  await writeAudit({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: `forex_autocopy.subscription.${status}`,
    targetId: paymentIntentId ?? "current",
    safeMessage: statusMessage,
    after: {
      status,
      rail: "paystack",
      referenceRef: reference ? maskReference(reference) : undefined,
      courseTier: context.student.tierLabel
    }
  });

  if (BILLING_DISABLED_STATUSES.has(status)) {
    await cleanupForexProvisioningForSubscriptionLifecycle({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      actorType: "student",
      reason: status
    });
  }
}

export async function cancelStudentForexAutoCopySubscription(actor: VerifiedStudent) {
  await applyForexAutoCopySubscriptionLifecycle({
    actor,
    status: "cancelled",
    safeMessage: "Forex AutoCopy subscription was cancelled. Mock provisioning cleanup was requested and future demo routing is blocked."
  });
}
