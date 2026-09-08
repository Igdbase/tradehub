import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import ts from "typescript";

const root = process.cwd();
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "trade-hub-4d8df";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.GCLOUD_PROJECT ||= projectId;
process.env.PAYSTACK_TRADE_COPIER_PLAN_CODE ||= "PLN_stage29i_trade_copier";
process.env.TRADE_COPIER_PRICE_NGN ||= "25000";

const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);

class AdminApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};

async function assertRejects(fn, pattern, message) {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof Error && pattern.test(error.code ?? error.message), message);
    return;
  }
  throw new Error(message);
}

function loadTradeCopierBillingModule() {
  const compiled = ts.transpileModule(read("src/lib/student-copier/student-copier-billing.ts"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};
  const module = { exports };
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "node:crypto") return crypto;
    if (specifier === "@/lib/firebase/admin") {
      return {
        getFirebaseAdminClients: () => ({ db, app, auth: null })
      };
    }
    if (specifier === "@/lib/firebase/admin-errors") {
      return { AdminApiError };
    }
    if (specifier === "@/lib/course-hub/course-source") {
      return { createSourceMeta: () => ({ source: "firestore", sourceLabel: "Firestore live", sourceMessage: "Stage 29I repository QA." }) };
    }
    if (specifier === "@/lib/paystack/paystack-client") {
      return {
        getPaystackReadiness: () => ({ configured: true, mode: "test", publicKeyConfigured: true, webhookReady: true, message: "fake" }),
        initializePaystackTransaction: async () => { throw new Error("Paystack must be injected by this test."); },
        verifyPaystackTransaction: async () => { throw new Error("Paystack must be injected by this test."); },
        disablePaystackSubscription: async () => { throw new Error("Paystack disable must be injected by this test."); }
      };
    }
    if (specifier === "@/lib/billing/billing-mappers") {
      return {
        mapSubscriptionRecord: (record) => record
          ? {
              status: record.status,
              tierId: record.tierId,
              tierLabel: record.tierLabel,
              active: record.status === "active"
            }
          : null
      };
    }
    if (specifier === "@/lib/entitlements/student-entitlements") {
      return {
        resolveStudentEntitlements: ({ workspace, studentRecord, subscription }) => {
          const features = Array.isArray(workspace?.tiers?.[0]?.features) ? workspace.tiers[0].features : [];
          const allowed = features.includes("autoCopy") && studentRecord?.autoCopyEligible === true;
          return {
            features: {
              autoCopy: {
                access: allowed ? "allowed" : "blocked",
                reason: allowed ? "AutoCopy allowed." : "AutoCopy is not available for this account."
              }
            },
            riskPosture: studentRecord?.accountMode === "auto_copy" ? "personal_account" : "funded_or_prop_firm",
            subscriptionActive: subscription?.status === "active",
            subscriptionStatus: subscription?.status ?? "missing"
          };
        }
      };
    }
    if (specifier === "@/lib/student-app/student-app-mappers") {
      return {
        recordFromSnapshot: (snapshot, idKey) => ({ [idKey]: snapshot.id, ...snapshot.data() }),
        mapWorkspaceForStudent: (record, workspaceId) => ({ workspaceId, ...record }),
        mapStudentProfile: (record, workspaceId, studentId) => ({
          workspaceId,
          studentId,
          email: record.email,
          tierLabel: record.tierLabel ?? "Demo Core Access"
        })
      };
    }
    throw new Error(`Unexpected require in Stage 29I billing repository QA: ${specifier}`);
  };
  const runner = new Function("require", "exports", "module", "console", "Buffer", "Date", "URL", "process", `${compiled}\n//# sourceURL=student-copier-billing.ts`);
  runner(localRequire, exports, module, console, Buffer, Date, URL, process);
  return module.exports;
}

const billing = loadTradeCopierBillingModule();
const workspaceId = "stage29i_repo_ws";
let counter = 0;

function actorFor(label) {
  counter += 1;
  return {
    workspaceId,
    studentId: `stage29i_${label}_${counter}`,
    uid: `uid_stage29i_${label}_${counter}`,
    email: `${label}.${counter}@example.test`,
    tierId: "demo_core"
  };
}

function studentPath(actor) {
  return `workspaces/${actor.workspaceId}/students/${actor.studentId}`;
}

async function clearActor(actor) {
  for (const collectionPath of [
    `workspaces/${actor.workspaceId}/trade_copier_payment_intents`,
    `workspaces/${actor.workspaceId}/trade_copier_audit_events`
  ]) {
    const snapshot = await db.collection(collectionPath).where("studentId", "==", actor.studentId).limit(100).get();
    const batch = db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
  }

  for (const pathToDelete of [
    `${studentPath(actor)}/trade_copier_subscriptions/current`,
    `${studentPath(actor)}/trade_copier_cleanup_tasks/legacy_subscription_cleanup`,
    `${studentPath(actor)}/trade_copier_cleanup_tasks/paystack_subscription_disable`,
    `${studentPath(actor)}/crypto_autocopy_subscriptions/current`,
    `${studentPath(actor)}/forex_autocopy_subscriptions/current`,
    `${studentPath(actor)}/subscriptions/current`,
    studentPath(actor)
  ]) {
    await db.doc(pathToDelete).delete().catch(() => undefined);
  }
}

async function seedActor(actor) {
  await db.doc(`workspaces/${workspaceId}`).set({
    workspaceId,
    name: "Stage 29I Repository Workspace",
    tiers: [
      {
        tierId: "demo_core",
        name: "Demo Core",
        features: ["course", "signalAlerts", "autoCopy", "journal"]
      }
    ],
    updatedAt: "2026-09-06T00:00:00.000Z"
  }, { merge: true });
  await db.doc(studentPath(actor)).set({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    email: actor.email,
    tierId: "demo_core",
    tierLabel: "Demo Core",
    status: "active",
    accountMode: "auto_copy",
    autoCopyEligible: true,
    updatedAt: "2026-09-06T00:00:00.000Z"
  }, { merge: true });
  await db.doc(`${studentPath(actor)}/subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    status: "active",
    tierId: "demo_core",
    updatedAt: "2026-09-06T00:00:00.000Z"
  }, { merge: true });
}

function paystackFor({
  status = "success",
  amount = 2500000,
  currency = "NGN",
  product = "trade_copier",
  failInitialize = false,
  failDisable = false,
  subscriptionCode = "SUB_stage29i",
  emailToken = "EMAIL_stage29i"
} = {}) {
  const initialized = [];
  const verified = [];
  const disabled = [];

  return {
    initialized,
    verified,
    disabled,
    adapter: {
      readiness: () => ({ configured: true, mode: "test", publicKeyConfigured: true, webhookReady: true, message: "fake" }),
      initialize: async (payload) => {
        if (failInitialize) throw new Error("fake initialize failure");
        initialized.push(payload);
        return {
          authorization_url: payload.callback_url,
          access_code: `access_${payload.reference}`,
          reference: payload.reference
        };
      },
      verify: async (reference) => {
        verified.push(reference);
        return {
          status,
          reference,
          amount,
          currency,
          metadata: { product },
          customer: { customer_code: "CUS_stage29i" },
          subscription: {
            subscription_code: subscriptionCode,
            email_token: emailToken,
            next_payment_date: "2099-01-01T00:00:00.000Z",
            status: "active"
          }
        };
      },
      disableSubscription: async (payload) => {
        disabled.push(payload);
        if (failDisable) throw new Error("fake disable failure");
        return {
          status: "disabled",
          subscription_code: payload.code,
          email_token: payload.token
        };
      }
    }
  };
}

async function readSubscription(actor) {
  const snapshot = await db.doc(`${studentPath(actor)}/trade_copier_subscriptions/current`).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function readCleanupTask(actor, taskId = "paystack_subscription_disable") {
  const snapshot = await db.doc(`${studentPath(actor)}/trade_copier_cleanup_tasks/${taskId}`).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function readLatestCancellationAudit(actor) {
  const snapshot = await db.collection(`workspaces/${actor.workspaceId}/trade_copier_audit_events`)
    .where("studentId", "==", actor.studentId)
    .limit(100)
    .get();
  return snapshot.docs
    .map((doc) => doc.data())
    .filter((event) =>
      event.action === "trade_copier.subscription.cancelled" ||
      event.action === "trade_copier.subscription.cancellation_requested"
    )
    .sort((left, right) => Date.parse(String(right.createdAt || "")) - Date.parse(String(left.createdAt || "")))[0] ?? null;
}

async function assertNoUnleasedPaystackCancellationInProgress(actor, message) {
  const task = await readCleanupTask(actor);
  assert(
    !task ||
      task.status !== "in_progress" ||
      (typeof task.leaseOwnerToken === "string" &&
        task.leaseOwnerToken.length > 0 &&
        typeof task.leaseExpiresAt === "string" &&
        Number.isFinite(Date.parse(task.leaseExpiresAt))),
    message
  );
}

async function assertEmulatorAvailable() {
  try {
    await db.collection("stage29i_repository_ping").doc("health").set({ ok: true });
    if (typeof db.recursiveDelete === "function") {
      await db.recursiveDelete(db.doc(`workspaces/${workspaceId}`)).catch(() => undefined);
    }
  } catch (error) {
    throw new Error(`Firestore emulator is required at ${emulatorHost}. Start emulators before running stage29i:repository:qa. ${error instanceof Error ? error.message : ""}`);
  }
}

async function testCanonicalCheckoutVerifyCancel() {
  const actor = actorFor("canonical");
  await clearActor(actor);
  await seedActor(actor);
  const fake = paystackFor();

  const checkout = await billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_checkout_intent",
    referenceFactory: () => "thtc_stage29i_checkout"
  });
  assert(checkout.checkout.authorizationUrl.includes("copierReference=thtc_stage29i_checkout"), "Canonical checkout creates a Trade Copier callback reference.");
  assert(fake.initialized[0].metadata.product === "trade_copier", "Canonical checkout sends trade_copier product metadata to Paystack.");
  assert(fake.initialized[0].plan === "PLN_stage29i_trade_copier", "Canonical checkout uses the Trade Copier Paystack plan.");
  let subscription = await readSubscription(actor);
  assert(subscription?.product === "trade_copier" && subscription.status === "payment_pending", "Canonical checkout writes one pending trade_copier subscription.");

  await assertRejects(
    () => billing.createStudentTradeCopierCheckout(actor, { paystack: fake.adapter }),
    /trade_copier_checkout_pending/,
    "A pending canonical checkout prevents duplicate checkout creation."
  );

  const verified = await billing.verifyStudentTradeCopierCheckout(actor, "thtc_stage29i_checkout", { paystack: fake.adapter });
  assert(verified.status === "verified", "Canonical verification succeeds through the injected Paystack adapter.");
  subscription = await readSubscription(actor);
  assert(subscription?.product === "trade_copier" && subscription.status === "active_paid", "Successful verification activates the canonical Trade Copier subscription.");
  assert(fake.verified.length === 1, "Verification called Paystack exactly once before replay.");

  const replay = await billing.verifyStudentTradeCopierCheckout(actor, "thtc_stage29i_checkout", { paystack: fake.adapter });
  assert(replay.status === "verified", "Repeated verification remains idempotently verified.");
  subscription = await readSubscription(actor);
  assert(subscription?.status === "active_paid", "Repeated verification does not duplicate or downgrade the canonical subscription.");

  await billing.cancelStudentTradeCopierSubscription(actor, { paystack: fake.adapter });
  subscription = await readSubscription(actor);
  assert(subscription?.product === "trade_copier" && subscription.status === "cancelled", "Provider-confirmed unified cancellation marks the canonical subscription cancelled.");
  assert(fake.disabled.length === 1 && fake.disabled[0].code === "SUB_stage29i" && fake.disabled[0].token === "EMAIL_stage29i", "Unified cancellation calls the Paystack disable-subscription adapter with server-stored renewal details.");
  const paystackTask = await readCleanupTask(actor);
  assert(paystackTask?.status === "resolved", "Successful provider cancellation resolves the Paystack cancellation task.");
  const cleanup = await db.doc(`${studentPath(actor)}/trade_copier_cleanup_tasks/legacy_subscription_cleanup`).get();
  assert(cleanup.data()?.status === "resolved", "Successful unified cancellation resolves the idempotent legacy cleanup task.");

  await clearActor(actor);
}

async function testMismatchAndPending() {
  const amountActor = actorFor("amount");
  await clearActor(amountActor);
  await seedActor(amountActor);
  await billing.createStudentTradeCopierCheckout(amountActor, {
    paystack: paystackFor().adapter,
    idFactory: () => "stage29i_amount_intent",
    referenceFactory: () => "thtc_stage29i_amount"
  });
  await assertRejects(
    () => billing.verifyStudentTradeCopierCheckout(amountActor, "thtc_stage29i_amount", { paystack: paystackFor({ amount: 999 }).adapter }),
    /payment_verification_mismatch/,
    "Amount mismatch fails closed."
  );

  const productActor = actorFor("product");
  await clearActor(productActor);
  await seedActor(productActor);
  await billing.createStudentTradeCopierCheckout(productActor, {
    paystack: paystackFor().adapter,
    idFactory: () => "stage29i_product_intent",
    referenceFactory: () => "thtc_stage29i_product"
  });
  await assertRejects(
    () => billing.verifyStudentTradeCopierCheckout(productActor, "thtc_stage29i_product", { paystack: paystackFor({ product: "crypto_autocopy" }).adapter }),
    /payment_product_mismatch/,
    "Product mismatch fails closed."
  );

  const pendingActor = actorFor("pending");
  await clearActor(pendingActor);
  await seedActor(pendingActor);
  await billing.createStudentTradeCopierCheckout(pendingActor, {
    paystack: paystackFor().adapter,
    idFactory: () => "stage29i_pending_intent",
    referenceFactory: () => "thtc_stage29i_pending"
  });
  const pending = await billing.verifyStudentTradeCopierCheckout(pendingActor, "thtc_stage29i_pending", { paystack: paystackFor({ status: "pending" }).adapter });
  assert(pending.status === "pending", "Pending Paystack verification stays pending.");
  assert((await readSubscription(pendingActor))?.status === "payment_pending", "Pending verification does not unlock setup.");

  await clearActor(amountActor);
  await clearActor(productActor);
  await clearActor(pendingActor);
}

async function testLegacyGrandfathering() {
  for (const [label, legacyWrites] of [
    ["crypto_only", [["crypto_autocopy_subscriptions", "active_paid"]]],
    ["forex_only", [["forex_autocopy_subscriptions", "active_paid"]]],
    ["both_active", [["crypto_autocopy_subscriptions", "active_paid"], ["forex_autocopy_subscriptions", "active_paid"]]]
  ]) {
    const actor = actorFor(label);
    await clearActor(actor);
    await seedActor(actor);
    for (const [collection, status] of legacyWrites) {
      await db.doc(`${studentPath(actor)}/${collection}/current`).set({
        subscriptionId: "current",
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        status,
        billingState: "paid",
        rail: "manual",
        currentPeriodEnd: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-06T00:00:00.000Z"
      });
    }
    const access = await billing.resolveTradeCopierBillingAccess(actor.workspaceId, actor.studentId);
    assert(access.active && access.source === "legacy_grandfathered", `${label} legacy active subscription materializes one unified entitlement.`);
    const subscription = await readSubscription(actor);
    assert(subscription?.product === "trade_copier" && subscription.status === "active_paid", `${label} writes a canonical trade_copier record.`);
    await assertRejects(
      () => billing.createStudentTradeCopierCheckout(actor, { paystack: paystackFor().adapter }),
      /trade_copier_already_active/,
      `${label} grandfathered student is not asked to pay a second time.`
    );
    await clearActor(actor);
  }

  const cancelledActor = actorFor("canonical_cancelled");
  await clearActor(cancelledActor);
  await seedActor(cancelledActor);
  await db.doc(`${studentPath(cancelledActor)}/crypto_autocopy_subscriptions/current`).set({
    status: "active_paid",
    billingState: "paid",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(cancelledActor)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    product: "trade_copier",
    status: "cancelled",
    billingState: "cancelled",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const cancelledAccess = await billing.resolveTradeCopierBillingAccess(cancelledActor.workspaceId, cancelledActor.studentId);
  assert(!cancelledAccess.active && cancelledAccess.status === "cancelled" && cancelledAccess.source === "canonical", "Canonical cancelled status overrides stale active legacy records.");
  await clearActor(cancelledActor);
}

async function testLegacyVerificationAndCleanupFailure() {
  const actor = actorFor("legacy_verify");
  await clearActor(actor);
  await seedActor(actor);
  await db.doc(`workspaces/${actor.workspaceId}/forex_autocopy_payment_intents/stage29i_legacy_forex_intent`).set({
    paymentIntentId: "stage29i_legacy_forex_intent",
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    product: "forex_autocopy",
    status: "checkout_opened",
    amountNgn: 25000,
    currency: "NGN",
    paystackReference: "thfx_stage29i_legacy",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const result = await billing.verifyLegacyTradeCopierCheckout(actor, "thfx_stage29i_legacy", "forex_autocopy", { paystack: paystackFor({ product: "forex_autocopy" }).adapter });
  assert(result.status === "verified", "Pending legacy callback verifies into unified Trade Copier access.");
  assert((await readSubscription(actor))?.product === "trade_copier", "Legacy verification materializes canonical trade_copier subscription.");

  await billing.cancelStudentTradeCopierSubscription(actor, {
    paystack: paystackFor().adapter,
    legacyCleanup: async () => {
      throw new Error("simulated cleanup failure");
    }
  });
  const subscription = await readSubscription(actor);
  const task = await db.doc(`${studentPath(actor)}/trade_copier_cleanup_tasks/legacy_subscription_cleanup`).get();
  assert(subscription?.status === "cancelled", "Canonical cancellation remains cancelled when legacy cleanup fails.");
  assert(task.data()?.status === "retry_scheduled", "Cleanup failure leaves a retryable support-safe task.");
  assert(!(await billing.resolveTradeCopierBillingAccess(actor.workspaceId, actor.studentId)).active, "Cleanup failure never reactivates Trade Copier access.");
  await clearActor(actor);
}

async function testProviderCancellationFailureRetryAndMissingTarget() {
  const actor = actorFor("provider_cancel_retry");
  await clearActor(actor);
  await seedActor(actor);
  const fake = paystackFor({ failDisable: true, subscriptionCode: "SUB_stage29i_retry", emailToken: "EMAIL_stage29i_retry" });
  await billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_retry_intent",
    referenceFactory: () => "thtc_stage29i_retry"
  });
  await billing.verifyStudentTradeCopierCheckout(actor, "thtc_stage29i_retry", { paystack: fake.adapter });
  await billing.cancelStudentTradeCopierSubscription(actor, { paystack: fake.adapter });
  let subscription = await readSubscription(actor);
  let task = await readCleanupTask(actor);
  assert(subscription?.status === "needs_attention", "Provider cancellation failure keeps Trade Copier inactive in needs_attention state.");
  assert(task?.status === "retry_scheduled" && task.paystackSubscriptionCode === "SUB_stage29i_retry", "Provider cancellation failure creates a bounded targeted retry task.");
  assert(!(await billing.resolveTradeCopierBillingAccess(actor.workspaceId, actor.studentId)).active, "Provider cancellation failure does not leave Trade Copier access active.");
  await billing.cancelStudentTradeCopierSubscription(actor, { paystack: fake.adapter });
  task = await readCleanupTask(actor);
  assert(task?.attemptCount === 1, "Repeated cancellation request does not reset Paystack retry attempt counts.");
  await db.doc(`${studentPath(actor)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    nextAttemptAt: "2026-09-06T00:00:00.000Z"
  }, { merge: true });
  const retryFake = paystackFor({ subscriptionCode: "SUB_stage29i_retry", emailToken: "EMAIL_stage29i_retry" });
  await billing.processStudentTradeCopierPaystackCancellationRetry({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid
  }, { paystack: retryFake.adapter });
  subscription = await readSubscription(actor);
  task = await readCleanupTask(actor);
  assert(subscription?.status === "cancelled", "Successful provider cancellation retry finalizes the canonical cancellation.");
  assert(task?.status === "resolved" && retryFake.disabled.length === 1, "Provider cancellation retry calls Paystack disable and resolves the existing task.");

  const missing = actorFor("provider_cancel_missing");
  await clearActor(missing);
  await seedActor(missing);
  await db.doc(`${studentPath(missing)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: missing.workspaceId,
    studentId: missing.studentId,
    product: "trade_copier",
    status: "active_paid",
    billingState: "paid",
    rail: "paystack",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const missingFake = paystackFor();
  await billing.cancelStudentTradeCopierSubscription(missing, { paystack: missingFake.adapter });
  assert((await readSubscription(missing))?.status === "needs_attention", "Missing Paystack subscription code/token does not report cancellation complete.");
  assert((await readCleanupTask(missing))?.status === "blocked", "Missing Paystack renewal details create a support-safe blocked cancellation task.");
  assert(missingFake.disabled.length === 0, "Missing Paystack renewal details never call the provider disable endpoint.");

  const newer = actorFor("retry_newer");
  await clearActor(newer);
  await seedActor(newer);
  await db.doc(`${studentPath(newer)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: newer.workspaceId,
    studentId: newer.studentId,
    product: "trade_copier",
    status: "active_paid",
    billingState: "paid",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_newer_active",
    paystackEmailToken: "EMAIL_newer_active",
    cancellationOperationToken: "cancel_old",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(newer)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: newer.workspaceId,
    studentId: newer.studentId,
    action: "paystack_disable_subscription",
    status: "retry_scheduled",
    paystackSubscriptionCode: "SUB_old_target",
    paystackEmailToken: "EMAIL_old_target",
    expectedOperationToken: "cancel_old",
    attemptCount: 1,
    nextAttemptAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const newerFake = paystackFor();
  await billing.processStudentTradeCopierPaystackCancellationRetry({
    workspaceId: newer.workspaceId,
    studentId: newer.studentId,
    actorId: newer.uid
  }, { paystack: newerFake.adapter });
  assert(newerFake.disabled.length === 0, "Cancellation retry never targets a newer active Paystack subscription.");
  assert((await readCleanupTask(newer))?.status === "blocked", "Changed Paystack target blocks stale cancellation retry.");

  await clearActor(actor);
  await clearActor(missing);
  await clearActor(newer);
}

async function testInitialCancellationSchedulingAndRecovery() {
  const actor = actorFor("initial_cancel_recovery");
  await clearActor(actor);
  await seedActor(actor);
  const fake = paystackFor({ subscriptionCode: "SUB_initial_recovery", emailToken: "EMAIL_initial_recovery" });
  await billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_initial_recovery_intent",
    referenceFactory: () => "thtc_stage29i_initial_recovery"
  });
  await billing.verifyStudentTradeCopierCheckout(actor, "thtc_stage29i_initial_recovery", { paystack: fake.adapter });
  await billing.cancelStudentTradeCopierSubscription(actor, {
    paystack: fake.adapter,
    skipImmediateCancellationRetry: true
  });
  let subscription = await readSubscription(actor);
  let task = await readCleanupTask(actor);
  assert(subscription?.status === "cancellation_pending", "Initial cancellation locks access and records provider confirmation as pending.");
  assert(
    task?.status === "retry_scheduled" &&
      typeof task.nextAttemptAt === "string" &&
      Number.isFinite(Date.parse(task.nextAttemptAt)) &&
      Date.parse(task.nextAttemptAt) <= Date.now(),
    "Initial cancellation schedules recoverable due work instead of an unleased in-progress task."
  );
  assert(fake.disabled.length === 0, "Simulated interruption after cancellation scheduling makes no direct Paystack call.");
  await assertNoUnleasedPaystackCancellationInProgress(actor, "Initial cancellation never writes an unleased in-progress Paystack task.");

  await billing.runTradeCopierPaystackCancellationRetryWorker({ uid: "admin_initial_recovery" }, { limit: 5 }, { paystack: fake.adapter });
  subscription = await readSubscription(actor);
  task = await readCleanupTask(actor);
  assert(subscription?.status === "cancelled", "Cancellation retry worker recovers the initial interruption window and finalizes cancellation.");
  assert(task?.status === "resolved" && fake.disabled.length === 1, "Recovered cancellation is processed through the leased worker path exactly once.");
  await assertNoUnleasedPaystackCancellationInProgress(actor, "Recovered cancellation leaves no unleased in-progress task.");

  const futureActors = [];
  for (let index = 0; index < 5; index += 1) {
    const future = actorFor(`future_task_${index}`);
    futureActors.push(future);
    await clearActor(future);
    await seedActor(future);
    await db.doc(`${studentPath(future)}/trade_copier_subscriptions/current`).set({
      subscriptionId: "current",
      workspaceId: future.workspaceId,
      studentId: future.studentId,
      product: "trade_copier",
      status: "needs_attention",
      billingState: "failed",
      rail: "paystack",
      paystackSubscriptionCode: `SUB_future_${index}`,
      paystackEmailToken: `EMAIL_future_${index}`,
      cancellationOperationToken: `cancel_future_${index}`,
      lifecycleRevision: 2,
      updatedAt: "2026-09-06T00:00:00.000Z"
    });
    await db.doc(`${studentPath(future)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
      taskId: "paystack_subscription_disable",
      workspaceId: future.workspaceId,
      studentId: future.studentId,
      action: "paystack_disable_subscription",
      status: "retry_scheduled",
      paystackSubscriptionCode: `SUB_future_${index}`,
      paystackEmailToken: `EMAIL_future_${index}`,
      expectedOperationToken: `cancel_future_${index}`,
      expectedLifecycleRevision: 2,
      attemptCount: 0,
      nextAttemptAt: "2099-01-01T00:00:00.000Z",
      updatedAt: "2026-09-06T00:00:00.000Z"
    });
  }
  const due = actorFor("due_not_starved");
  await clearActor(due);
  await seedActor(due);
  await db.doc(`${studentPath(due)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: due.workspaceId,
    studentId: due.studentId,
    product: "trade_copier",
    status: "needs_attention",
    billingState: "failed",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_due_not_starved",
    paystackEmailToken: "EMAIL_due_not_starved",
    cancellationOperationToken: "cancel_due_not_starved",
    lifecycleRevision: 2,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(due)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: due.workspaceId,
    studentId: due.studentId,
    action: "paystack_disable_subscription",
    status: "retry_scheduled",
    paystackSubscriptionCode: "SUB_due_not_starved",
    paystackEmailToken: "EMAIL_due_not_starved",
    expectedOperationToken: "cancel_due_not_starved",
    expectedLifecycleRevision: 2,
    attemptCount: 0,
    nextAttemptAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const dueFake = paystackFor({ subscriptionCode: "SUB_due_not_starved", emailToken: "EMAIL_due_not_starved" });
  await billing.runTradeCopierPaystackCancellationRetryWorker({ uid: "admin_due_not_starved" }, { limit: 1 }, { paystack: dueFake.adapter });
  assert(dueFake.disabled.length === 1 && (await readCleanupTask(due))?.status === "resolved", "Future-scheduled tasks cannot starve older due Paystack cancellation work.");
  for (const future of futureActors) {
    assert((await readCleanupTask(future))?.status === "retry_scheduled", "Not-yet-due Paystack tasks do not occupy the due retry batch.");
    await clearActor(future);
  }
  await clearActor(due);
  await clearActor(actor);
}

async function testRepeatedCancellationIdempotencyAndAuditTruth() {
  const nonRenewing = actorFor("repeat_non_renewing");
  await clearActor(nonRenewing);
  await seedActor(nonRenewing);
  await db.doc(`${studentPath(nonRenewing)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: nonRenewing.workspaceId,
    studentId: nonRenewing.studentId,
    product: "trade_copier",
    status: "non_renewing",
    billingState: "cancelled",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_repeat_non_renewing",
    paystackEmailToken: "EMAIL_repeat_non_renewing",
    cancellationOperationToken: "cancel_repeat_non_renewing",
    lifecycleRevision: 7,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(nonRenewing)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: nonRenewing.workspaceId,
    studentId: nonRenewing.studentId,
    action: "paystack_disable_subscription",
    status: "retry_scheduled",
    paystackSubscriptionCode: "SUB_repeat_non_renewing",
    paystackEmailToken: "EMAIL_repeat_non_renewing",
    expectedOperationToken: "cancel_repeat_non_renewing",
    expectedLifecycleRevision: 7,
    attemptCount: 3,
    nextAttemptAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(nonRenewing)}/trade_copier_cleanup_tasks/legacy_subscription_cleanup`).set({
    taskId: "legacy_subscription_cleanup",
    workspaceId: nonRenewing.workspaceId,
    studentId: nonRenewing.studentId,
    action: "legacy_subscription_cleanup",
    status: "retry_scheduled",
    attemptCount: 4,
    nextAttemptAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const nonRenewingFake = paystackFor({ subscriptionCode: "SUB_repeat_non_renewing", emailToken: "EMAIL_repeat_non_renewing" });
  await billing.cancelStudentTradeCopierSubscription(nonRenewing, { paystack: nonRenewingFake.adapter });
  let task = await readCleanupTask(nonRenewing);
  let legacyTask = await readCleanupTask(nonRenewing, "legacy_subscription_cleanup");
  let subscription = await readSubscription(nonRenewing);
  assert(subscription?.status === "non_renewing", "Repeated Cancel treats non_renewing with pending provider-disable work as the existing cancellation operation.");
  assert(task?.expectedOperationToken === "cancel_repeat_non_renewing" && task?.attemptCount === 3 && task?.nextAttemptAt === "2026-09-07T00:00:00.000Z", "Repeated Cancel preserves retry_scheduled operation token, attempt count, and due time.");
  assert(legacyTask?.attemptCount === 4 && legacyTask?.nextAttemptAt === "2026-09-08T00:00:00.000Z", "Repeated Cancel does not reset an existing legacy cleanup task unnecessarily.");
  assert(nonRenewingFake.disabled.length === 0, "Repeated Cancel does not call Paystack again for an existing pending non-renewing operation.");

  const inProgress = actorFor("repeat_in_progress");
  await clearActor(inProgress);
  await seedActor(inProgress);
  await db.doc(`${studentPath(inProgress)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: inProgress.workspaceId,
    studentId: inProgress.studentId,
    product: "trade_copier",
    status: "cancellation_pending",
    billingState: "cancelled",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_repeat_in_progress",
    paystackEmailToken: "EMAIL_repeat_in_progress",
    cancellationOperationToken: "cancel_repeat_in_progress",
    lifecycleRevision: 8,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(inProgress)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: inProgress.workspaceId,
    studentId: inProgress.studentId,
    action: "paystack_disable_subscription",
    status: "in_progress",
    paystackSubscriptionCode: "SUB_repeat_in_progress",
    paystackEmailToken: "EMAIL_repeat_in_progress",
    expectedOperationToken: "cancel_repeat_in_progress",
    expectedLifecycleRevision: 8,
    attemptCount: 2,
    nextAttemptAt: "2026-09-07T00:00:00.000Z",
    leaseOwnerToken: "existing_repeat_cancel_lease",
    leaseExpiresAt: "2099-01-01T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const inProgressFake = paystackFor({ subscriptionCode: "SUB_repeat_in_progress", emailToken: "EMAIL_repeat_in_progress" });
  await billing.cancelStudentTradeCopierSubscription(inProgress, { paystack: inProgressFake.adapter });
  task = await readCleanupTask(inProgress);
  assert(
    task?.status === "in_progress" &&
      task?.expectedOperationToken === "cancel_repeat_in_progress" &&
      task?.attemptCount === 2 &&
      task?.leaseOwnerToken === "existing_repeat_cancel_lease" &&
      task?.leaseExpiresAt === "2099-01-01T00:00:00.000Z",
    "Repeated Cancel preserves in-progress operation token, attempt count, due time, and lease."
  );
  assert(inProgressFake.disabled.length === 0, "Repeated Cancel does not race an already leased provider-disable task.");

  const finalFailed = actorFor("repeat_final_failed");
  await clearActor(finalFailed);
  await seedActor(finalFailed);
  await db.doc(`${studentPath(finalFailed)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: finalFailed.workspaceId,
    studentId: finalFailed.studentId,
    product: "trade_copier",
    status: "needs_attention",
    billingState: "failed",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_repeat_final_failed",
    paystackEmailToken: "EMAIL_repeat_final_failed",
    cancellationOperationToken: "cancel_repeat_final_failed",
    lifecycleRevision: 9,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(finalFailed)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: finalFailed.workspaceId,
    studentId: finalFailed.studentId,
    action: "paystack_disable_subscription",
    status: "final_failed",
    paystackSubscriptionCode: "SUB_repeat_final_failed",
    paystackEmailToken: "EMAIL_repeat_final_failed",
    expectedOperationToken: "cancel_repeat_final_failed",
    expectedLifecycleRevision: 9,
    attemptCount: 5,
    nextAttemptAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const finalFailedFake = paystackFor({ subscriptionCode: "SUB_repeat_final_failed", emailToken: "EMAIL_repeat_final_failed" });
  await billing.cancelStudentTradeCopierSubscription(finalFailed, { paystack: finalFailedFake.adapter });
  task = await readCleanupTask(finalFailed);
  assert(task?.status === "final_failed" && task?.attemptCount === 5, "Repeated Cancel preserves final_failed support state and bounded attempt count.");
  assert(finalFailedFake.disabled.length === 0, "Repeated Cancel does not reactivate retries or call Paystack after final_failed work.");

  const blocked = actorFor("repeat_blocked");
  await clearActor(blocked);
  await seedActor(blocked);
  await db.doc(`${studentPath(blocked)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: blocked.workspaceId,
    studentId: blocked.studentId,
    product: "trade_copier",
    status: "needs_attention",
    billingState: "failed",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_repeat_blocked",
    paystackEmailToken: "EMAIL_repeat_blocked",
    cancellationOperationToken: "cancel_repeat_blocked",
    lifecycleRevision: 4,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(blocked)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: blocked.workspaceId,
    studentId: blocked.studentId,
    action: "paystack_disable_subscription",
    status: "blocked",
    paystackSubscriptionCode: "SUB_repeat_blocked",
    paystackEmailToken: "EMAIL_repeat_blocked",
    expectedOperationToken: "cancel_repeat_blocked",
    expectedLifecycleRevision: 4,
    attemptCount: 2,
    nextAttemptAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const blockedFake = paystackFor({ subscriptionCode: "SUB_repeat_blocked", emailToken: "EMAIL_repeat_blocked" });
  await billing.cancelStudentTradeCopierSubscription(blocked, { paystack: blockedFake.adapter });
  task = await readCleanupTask(blocked);
  assert(task?.status === "blocked" && task?.attemptCount === 2, "Repeated Cancel cannot reset matching blocked provider-disable work.");
  assert(blockedFake.disabled.length === 0, "Repeated Cancel does not call Paystack for matching blocked work.");

  const resolved = actorFor("repeat_resolved");
  await clearActor(resolved);
  await seedActor(resolved);
  await db.doc(`${studentPath(resolved)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: resolved.workspaceId,
    studentId: resolved.studentId,
    product: "trade_copier",
    status: "non_renewing",
    billingState: "cancelled",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_repeat_resolved",
    paystackEmailToken: "EMAIL_repeat_resolved",
    cancellationOperationToken: "cancel_repeat_resolved",
    lifecycleRevision: 5,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(resolved)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: resolved.workspaceId,
    studentId: resolved.studentId,
    action: "paystack_disable_subscription",
    status: "resolved",
    paystackSubscriptionCode: "SUB_repeat_resolved",
    paystackEmailToken: "EMAIL_repeat_resolved",
    expectedOperationToken: "cancel_repeat_resolved",
    expectedLifecycleRevision: 5,
    attemptCount: 1,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const resolvedFake = paystackFor({ subscriptionCode: "SUB_repeat_resolved", emailToken: "EMAIL_repeat_resolved" });
  await billing.cancelStudentTradeCopierSubscription(resolved, { paystack: resolvedFake.adapter });
  subscription = await readSubscription(resolved);
  task = await readCleanupTask(resolved);
  assert(subscription?.status === "cancelled" && task?.status === "resolved", "Repeated Cancel reconciles matching resolved provider-disable work to canonical cancelled status.");
  assert(resolvedFake.disabled.length === 0, "Resolved provider-disable work reconciles without another Paystack call.");

  const repurchase = actorFor("repeat_repurchase_new_target");
  await clearActor(repurchase);
  await seedActor(repurchase);
  await db.doc(`${studentPath(repurchase)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: repurchase.workspaceId,
    studentId: repurchase.studentId,
    product: "trade_copier",
    status: "active_paid",
    billingState: "paid",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_repeat_new_target",
    paystackEmailToken: "EMAIL_repeat_new_target",
    cancellationOperationToken: "cancel_repeat_old_target",
    lifecycleRevision: 2,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(repurchase)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: repurchase.workspaceId,
    studentId: repurchase.studentId,
    action: "paystack_disable_subscription",
    status: "resolved",
    paystackSubscriptionCode: "SUB_repeat_old_target",
    paystackEmailToken: "EMAIL_repeat_old_target",
    expectedOperationToken: "cancel_repeat_old_target",
    expectedLifecycleRevision: 1,
    attemptCount: 1,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const repurchaseFake = paystackFor({ subscriptionCode: "SUB_repeat_new_target", emailToken: "EMAIL_repeat_new_target" });
  await billing.cancelStudentTradeCopierSubscription(repurchase, {
    paystack: repurchaseFake.adapter,
    skipImmediateCancellationRetry: true
  });
  subscription = await readSubscription(repurchase);
  task = await readCleanupTask(repurchase);
  assert(subscription?.status === "cancellation_pending" && subscription?.cancellationOperationToken !== "cancel_repeat_old_target", "A genuinely new Paystack target after repurchase gets a new bounded cancellation operation.");
  assert(task?.status === "retry_scheduled" && task?.paystackSubscriptionCode === "SUB_repeat_new_target" && task?.attemptCount === 0, "New subscription target creates fresh due provider-disable work only for the new target.");

  const auditSuccess = actorFor("audit_success");
  await clearActor(auditSuccess);
  await seedActor(auditSuccess);
  const auditSuccessFake = paystackFor({ subscriptionCode: "SUB_audit_success", emailToken: "EMAIL_audit_success" });
  await billing.createStudentTradeCopierCheckout(auditSuccess, {
    paystack: auditSuccessFake.adapter,
    idFactory: () => "stage29i_audit_success_intent",
    referenceFactory: () => "thtc_stage29i_audit_success"
  });
  await billing.verifyStudentTradeCopierCheckout(auditSuccess, "thtc_stage29i_audit_success", { paystack: auditSuccessFake.adapter });
  await billing.cancelStudentTradeCopierSubscription(auditSuccess, { paystack: auditSuccessFake.adapter });
  let audit = await readLatestCancellationAudit(auditSuccess);
  assert(audit?.action === "trade_copier.subscription.cancelled" && audit?.after?.status === "cancelled" && audit?.after?.providerCancellation === "resolved", "Immediate successful cancellation audits the actual cancelled/resolved result.");

  const auditFailure = actorFor("audit_failure");
  await clearActor(auditFailure);
  await seedActor(auditFailure);
  const auditFailureFake = paystackFor({ subscriptionCode: "SUB_audit_failure", emailToken: "EMAIL_audit_failure", failDisable: true });
  await billing.createStudentTradeCopierCheckout(auditFailure, {
    paystack: auditFailureFake.adapter,
    idFactory: () => "stage29i_audit_failure_intent",
    referenceFactory: () => "thtc_stage29i_audit_failure"
  });
  await billing.verifyStudentTradeCopierCheckout(auditFailure, "thtc_stage29i_audit_failure", { paystack: auditFailureFake.adapter });
  await billing.cancelStudentTradeCopierSubscription(auditFailure, { paystack: auditFailureFake.adapter });
  audit = await readLatestCancellationAudit(auditFailure);
  assert(audit?.action === "trade_copier.subscription.cancellation_requested" && audit?.after?.status === "needs_attention" && audit?.after?.providerCancellation === "retry_scheduled", "Provider cancellation failure audits the actual needs_attention/retry_scheduled result.");

  await clearActor(nonRenewing);
  await clearActor(inProgress);
  await clearActor(finalFailed);
  await clearActor(blocked);
  await clearActor(resolved);
  await clearActor(repurchase);
  await clearActor(auditSuccess);
  await clearActor(auditFailure);
}

async function testCancellationAuthorizationAfterEligibilityLoss() {
  const actor = actorFor("cancel_after_eligibility_loss");
  await clearActor(actor);
  await seedActor(actor);
  const fake = paystackFor({ subscriptionCode: "SUB_eligibility_loss", emailToken: "EMAIL_eligibility_loss" });
  await billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_loss_intent",
    referenceFactory: () => "thtc_stage29i_loss"
  });
  await billing.verifyStudentTradeCopierCheckout(actor, "thtc_stage29i_loss", { paystack: fake.adapter });
  await db.doc(studentPath(actor)).set({
    accountMode: "funded",
    autoCopyEligible: false,
    updatedAt: "2026-09-06T01:00:00.000Z"
  }, { merge: true });
  await db.doc(`${studentPath(actor)}/subscriptions/current`).set({
    status: "cancelled",
    updatedAt: "2026-09-06T01:00:00.000Z"
  }, { merge: true });
  await billing.cancelStudentTradeCopierSubscription(actor, { paystack: fake.adapter });
  const subscription = await readSubscription(actor);
  assert(subscription?.status === "cancelled" && fake.disabled.some((entry) => entry.code === "SUB_eligibility_loss"), "Cancellation remains authorized for an owned Trade Copier subscription after purchase eligibility is lost.");
  await clearActor(actor);
}

async function testVerificationAfterEligibilityLossKeepsSetupLocked() {
  const actor = actorFor("verify_after_eligibility_loss");
  await clearActor(actor);
  await seedActor(actor);
  const fake = paystackFor({ subscriptionCode: "SUB_verify_loss", emailToken: "EMAIL_verify_loss" });
  await billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_verify_loss_intent",
    referenceFactory: () => "thtc_stage29i_verify_loss"
  });
  await db.doc(studentPath(actor)).set({
    accountMode: "funded",
    autoCopyEligible: false,
    updatedAt: "2026-09-06T01:00:00.000Z"
  }, { merge: true });
  const result = await billing.verifyStudentTradeCopierCheckout(actor, "thtc_stage29i_verify_loss", { paystack: fake.adapter });
  assert(result.status === "verified" && /Setup remains locked/.test(result.message), "Verified payment after eligibility loss is reconciled truthfully without claiming setup availability.");
  assert((await readSubscription(actor))?.status === "active_paid", "Eligibility loss during verification does not strand a completed Trade Copier payment.");
  await clearActor(actor);
}

async function testCancellationRetryWorkerConcurrencyAndLeases() {
  const actor = actorFor("retry_worker");
  await clearActor(actor);
  await seedActor(actor);
  await db.doc(`${studentPath(actor)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    product: "trade_copier",
    status: "needs_attention",
    billingState: "failed",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_worker",
    paystackEmailToken: "EMAIL_worker",
    cancellationOperationToken: "cancel_worker",
    lifecycleRevision: 4,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(actor)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    action: "paystack_disable_subscription",
    status: "retry_scheduled",
    paystackSubscriptionCode: "SUB_worker",
    paystackEmailToken: "EMAIL_worker",
    expectedOperationToken: "cancel_worker",
    expectedLifecycleRevision: 4,
    attemptCount: 0,
    nextAttemptAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  let releaseDisable;
  const disableRelease = new Promise((resolve) => {
    releaseDisable = resolve;
  });
  const fake = paystackFor({ subscriptionCode: "SUB_worker", emailToken: "EMAIL_worker" });
  fake.adapter.disableSubscription = async (payload) => {
    fake.disabled.push(payload);
    await disableRelease;
    return { status: "disabled", subscription_code: payload.code, email_token: payload.token };
  };
  const first = billing.runTradeCopierPaystackCancellationRetryWorker({ uid: "admin_worker_one" }, { limit: 5 }, { paystack: fake.adapter });
  const second = billing.runTradeCopierPaystackCancellationRetryWorker({ uid: "admin_worker_two" }, { limit: 5 }, { paystack: fake.adapter });
  await new Promise((resolve) => setTimeout(resolve, 75));
  await assertNoUnleasedPaystackCancellationInProgress(actor, "A worker-owned in-progress Paystack cancellation task always has a valid lease owner and expiry.");
  releaseDisable();
  await Promise.all([first, second]);
  assert(fake.disabled.length === 1, "Concurrent cancellation retry workers produce at most one Paystack disable call.");
  assert((await readCleanupTask(actor))?.status === "resolved", "Worker resolves the leased Paystack cancellation task after provider confirmation.");

  const abandoned = actorFor("retry_worker_abandoned");
  await clearActor(abandoned);
  await seedActor(abandoned);
  await db.doc(`${studentPath(abandoned)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: abandoned.workspaceId,
    studentId: abandoned.studentId,
    product: "trade_copier",
    status: "needs_attention",
    billingState: "failed",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_abandoned",
    paystackEmailToken: "EMAIL_abandoned",
    cancellationOperationToken: "cancel_abandoned",
    lifecycleRevision: 2,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(abandoned)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: abandoned.workspaceId,
    studentId: abandoned.studentId,
    action: "paystack_disable_subscription",
    status: "in_progress",
    leaseOwnerToken: "old_owner",
    leaseExpiresAt: "2026-09-05T00:00:00.000Z",
    paystackSubscriptionCode: "SUB_abandoned",
    paystackEmailToken: "EMAIL_abandoned",
    expectedOperationToken: "cancel_abandoned",
    expectedLifecycleRevision: 2,
    attemptCount: 0,
    nextAttemptAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z"
  });
  const abandonedFake = paystackFor({ subscriptionCode: "SUB_abandoned", emailToken: "EMAIL_abandoned" });
  await billing.runTradeCopierPaystackCancellationRetryWorker({ uid: "admin_worker_abandoned" }, { limit: 5 }, { paystack: abandonedFake.adapter });
  assert(abandonedFake.disabled.length === 1 && (await readCleanupTask(abandoned))?.status === "resolved", "Abandoned Paystack cancellation retry leases are recovered safely.");

  const maxed = actorFor("retry_worker_max");
  await clearActor(maxed);
  await seedActor(maxed);
  await db.doc(`${studentPath(maxed)}/trade_copier_subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: maxed.workspaceId,
    studentId: maxed.studentId,
    product: "trade_copier",
    status: "needs_attention",
    billingState: "failed",
    rail: "paystack",
    paystackSubscriptionCode: "SUB_maxed",
    paystackEmailToken: "EMAIL_maxed",
    cancellationOperationToken: "cancel_maxed",
    lifecycleRevision: 2,
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  await db.doc(`${studentPath(maxed)}/trade_copier_cleanup_tasks/paystack_subscription_disable`).set({
    taskId: "paystack_subscription_disable",
    workspaceId: maxed.workspaceId,
    studentId: maxed.studentId,
    action: "paystack_disable_subscription",
    status: "retry_scheduled",
    paystackSubscriptionCode: "SUB_maxed",
    paystackEmailToken: "EMAIL_maxed",
    expectedOperationToken: "cancel_maxed",
    expectedLifecycleRevision: 2,
    attemptCount: 5,
    nextAttemptAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z"
  });
  const maxedFake = paystackFor({ subscriptionCode: "SUB_maxed", emailToken: "EMAIL_maxed" });
  await billing.runTradeCopierPaystackCancellationRetryWorker({ uid: "admin_worker_maxed" }, { limit: 5 }, { paystack: maxedFake.adapter });
  assert(maxedFake.disabled.length === 0 && (await readCleanupTask(maxed))?.status === "final_failed", "Maximum retry attempts are bounded and do not call Paystack again.");

  await clearActor(actor);
  await clearActor(abandoned);
  await clearActor(maxed);
}

async function testStaleAsyncLifecycleRaces() {
  const verifiedReplay = actorFor("verified_replay_cancelled");
  await clearActor(verifiedReplay);
  await seedActor(verifiedReplay);
  const verifiedReplayFake = paystackFor({ subscriptionCode: "SUB_verified_replay", emailToken: "EMAIL_verified_replay" });
  await billing.createStudentTradeCopierCheckout(verifiedReplay, {
    paystack: verifiedReplayFake.adapter,
    idFactory: () => "stage29i_verified_replay_intent",
    referenceFactory: () => "thtc_stage29i_verified_replay"
  });
  await billing.verifyStudentTradeCopierCheckout(verifiedReplay, "thtc_stage29i_verified_replay", { paystack: verifiedReplayFake.adapter });
  await billing.cancelStudentTradeCopierSubscription(verifiedReplay, { paystack: verifiedReplayFake.adapter });
  const replayAfterCancel = await billing.verifyStudentTradeCopierCheckout(verifiedReplay, "thtc_stage29i_verified_replay", { paystack: verifiedReplayFake.adapter });
  assert(replayAfterCancel.status === "support_review", "Repeated verification after cancellation returns a truthful support-review state instead of setup availability.");
  assert((await readSubscription(verifiedReplay))?.status === "cancelled", "Repeated verification after cancellation does not restore Trade Copier access.");

  const verifyRace = actorFor("verify_cancel_race");
  await clearActor(verifyRace);
  await seedActor(verifyRace);
  const fake = paystackFor({ subscriptionCode: "SUB_verify_race", emailToken: "EMAIL_verify_race" });
  await billing.createStudentTradeCopierCheckout(verifyRace, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_verify_race_intent",
    referenceFactory: () => "thtc_stage29i_verify_race"
  });
  await billing.cancelStudentTradeCopierSubscription(verifyRace, { paystack: fake.adapter });
  const staleVerify = await billing.verifyStudentTradeCopierCheckout(verifyRace, "thtc_stage29i_verify_race", { paystack: fake.adapter });
  assert(staleVerify.status === "support_review", "Late successful verification after cancellation is recorded for support review without unlocking.");
  assert((await readSubscription(verifyRace))?.status === "cancelled", "Late verification after cancellation does not reactivate Trade Copier.");

  const initRace = actorFor("init_cancel_race");
  await clearActor(initRace);
  await seedActor(initRace);
  let releaseInitialize;
  let initializeStarted;
  const initializeStartedPromise = new Promise((resolve) => {
    initializeStarted = resolve;
  });
  const initializeReleasePromise = new Promise((resolve) => {
    releaseInitialize = resolve;
  });
  const delayedFake = paystackFor();
  delayedFake.adapter.initialize = async (payload) => {
    delayedFake.initialized.push(payload);
    initializeStarted();
    await initializeReleasePromise;
    return {
      authorization_url: payload.callback_url,
      access_code: `access_${payload.reference}`,
      reference: payload.reference
    };
  };
  const checkoutPromise = billing.createStudentTradeCopierCheckout(initRace, {
    paystack: delayedFake.adapter,
    idFactory: () => "stage29i_init_race_intent",
    referenceFactory: () => "thtc_stage29i_init_race"
  });
  await initializeStartedPromise;
  await billing.cancelStudentTradeCopierSubscription(initRace, { paystack: delayedFake.adapter });
  releaseInitialize();
  await checkoutPromise;
  assert((await readSubscription(initRace))?.status === "cancelled", "Late checkout initialization completion cannot overwrite cancellation.");

  const staleOld = actorFor("stale_old");
  await clearActor(staleOld);
  await seedActor(staleOld);
  const oldFake = paystackFor({ subscriptionCode: "SUB_old", emailToken: "EMAIL_old" });
  await billing.createStudentTradeCopierCheckout(staleOld, {
    paystack: oldFake.adapter,
    idFactory: () => "stage29i_stale_old_intent",
    referenceFactory: () => "thtc_stage29i_stale_old"
  });
  await billing.cancelStudentTradeCopierSubscription(staleOld, { paystack: oldFake.adapter });
  const newerFake = paystackFor({ subscriptionCode: "SUB_new", emailToken: "EMAIL_new" });
  await billing.createStudentTradeCopierCheckout(staleOld, {
    paystack: newerFake.adapter,
    idFactory: () => "stage29i_stale_new_intent",
    referenceFactory: () => "thtc_stage29i_stale_new"
  });
  const oldResult = await billing.verifyStudentTradeCopierCheckout(staleOld, "thtc_stage29i_stale_old", { paystack: oldFake.adapter });
  assert(oldResult.status === "support_review", "Stale successful callback from an older checkout cannot activate over a newer checkout.");
  assert((await readSubscription(staleOld))?.status === "payment_pending", "Stale callback leaves the newer checkout pending.");
  await billing.verifyStudentTradeCopierCheckout(staleOld, "thtc_stage29i_stale_new", { paystack: newerFake.adapter });
  assert((await readSubscription(staleOld))?.paystackSubscriptionCode === "SUB_new", "Only the latest verified intent activates the canonical subscription.");

  await clearActor(verifyRace);
  await clearActor(initRace);
  await clearActor(staleOld);
  await clearActor(verifiedReplay);
}

async function testPaystackWebhookProductIsolationAndOrdering() {
  const actor = actorFor("webhook");
  await clearActor(actor);
  await seedActor(actor);
  await db.doc(`${studentPath(actor)}/subscriptions/current`).set({
    subscriptionId: "current",
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    status: "active",
    tierId: "demo_core",
    updatedAt: "2026-09-06T00:00:00.000Z"
  }, { merge: true });
  const fake = paystackFor({ subscriptionCode: "SUB_webhook_tc", emailToken: "EMAIL_webhook_tc" });
  await billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_webhook_intent",
    referenceFactory: () => "thtc_stage29i_webhook"
  });
  const charge = await billing.processTradeCopierPaystackWebhook({
    event: "charge.success",
    data: {
      id: "evt_tc_charge",
      reference: "thtc_stage29i_webhook",
      status: "success",
      amount: 2500000,
      currency: "NGN",
      created_at: "2026-09-06T10:00:00.000Z",
      metadata: { product: "trade_copier", workspaceId: actor.workspaceId, studentId: actor.studentId },
      customer: { customer_code: "CUS_webhook" },
      subscription: {
        subscription_code: "SUB_webhook_tc",
        email_token: "EMAIL_webhook_tc",
        next_payment_date: "2099-01-01T00:00:00.000Z",
        status: "active"
      }
    }
  }, { paystack: fake.adapter });
  assert(charge.handled && charge.processed, "Trade Copier charge.success webhook is handled by the canonical Trade Copier router.");
  assert((await db.doc(`${studentPath(actor)}/subscriptions/current`).get()).data()?.status === "active", "Trade Copier charge webhook does not modify the course/package subscription.");
  assert((await readSubscription(actor))?.status === "active_paid", "Trade Copier charge webhook activates only the canonical Trade Copier subscription.");

  const renewal = await billing.processTradeCopierPaystackWebhook({
    event: "charge.success",
    data: {
      id: "evt_tc_renewal",
      reference: "renewal_reference_not_original_intent",
      status: "success",
      amount: 2500000,
      currency: "NGN",
      created_at: "2026-09-06T10:30:00.000Z",
      paid_at: "2026-09-06T10:30:00.000Z",
      metadata: { product: "trade_copier" },
      plan: { plan_code: "PLN_stage29i_trade_copier" },
      subscription: {
        subscription_code: "SUB_webhook_tc",
        email_token: "EMAIL_webhook_tc",
        next_payment_date: "2099-02-01T00:00:00.000Z",
        status: "active"
      }
    }
  }, { paystack: fake.adapter });
  assert(renewal.handled && renewal.processed, "Recurring Trade Copier charge.success is routed by subscription code even with a new transaction reference.");
  assert((await readSubscription(actor))?.currentPeriodEnd === "2099-02-01T00:00:00.000Z", "Recurring Trade Copier renewal updates the paid period from subscription identity, not the original checkout intent.");

  const missingPeriodRenewal = await billing.processTradeCopierPaystackWebhook({
    event: "charge.success",
    data: {
      id: "evt_tc_renewal_missing_period",
      reference: "renewal_missing_period_reference",
      status: "success",
      amount: 2500000,
      currency: "NGN",
      created_at: "2026-09-06T10:35:00.000Z",
      paid_at: "2026-09-06T10:35:00.000Z",
      metadata: { product: "trade_copier" },
      plan: { plan_code: "PLN_stage29i_trade_copier" },
      subscription: {
        subscription_code: "SUB_webhook_tc",
        email_token: "EMAIL_webhook_tc",
        status: "active"
      }
    }
  }, { paystack: fake.adapter });
  let subscription = await readSubscription(actor);
  assert(missingPeriodRenewal.handled && !missingPeriodRenewal.processed, "Recurring renewal without next_payment_date or period_end is recorded for review, not falsely processed.");
  assert(subscription?.currentPeriodEnd === "2099-02-01T00:00:00.000Z", "Renewal without an authoritative period end preserves the existing paid period instead of using paid_at or created_at.");
  assert(subscription?.renewalNeedsReview === true, "Renewal without an authoritative period end leaves a bounded support-review marker.");

  await db.doc(`${studentPath(actor)}/trade_copier_subscriptions/current`).set({
    renewalNeedsReview: false,
    renewalReviewReason: ""
  }, { merge: true });

  for (const [label, override] of [
    ["wrong plan", { plan: { plan_code: "PLN_wrong" } }],
    ["wrong amount", { amount: 999 }],
    ["wrong product", { metadata: { product: "course" } }]
  ]) {
    const blocked = await billing.processTradeCopierPaystackWebhook({
      event: "charge.success",
      data: {
        id: `evt_tc_renewal_blocked_${label.replace(/\s+/g, "_")}`,
        reference: `blocked_${label.replace(/\s+/g, "_")}`,
        status: "success",
        amount: 2500000,
        currency: "NGN",
        created_at: "2026-09-06T10:45:00.000Z",
        metadata: { product: "trade_copier" },
        plan: { plan_code: "PLN_stage29i_trade_copier" },
        subscription: {
          subscription_code: "SUB_webhook_tc",
          email_token: "EMAIL_webhook_tc",
          next_payment_date: "2099-03-01T00:00:00.000Z"
        },
        ...override
      }
    }, { paystack: fake.adapter });
    assert(blocked.handled && !blocked.processed, `Trade Copier renewal with ${label} is safely recorded without activating billing.`);
  }

  const invoiceFailed = await billing.processTradeCopierPaystackWebhook({
    event: "invoice.payment_failed",
    data: {
      id: "evt_tc_invoice_failed",
      subscription_code: "SUB_webhook_tc",
      created_at: "2026-09-06T11:00:00.000Z",
      metadata: { product: "trade_copier" }
    }
  }, { paystack: fake.adapter });
  assert(invoiceFailed.handled && invoiceFailed.processed, "Trade Copier invoice failure webhook is product-routed.");
  assert((await readSubscription(actor))?.status === "past_due", "Trade Copier invoice failure affects only the Trade Copier subscription.");
  assert((await db.doc(`${studentPath(actor)}/subscriptions/current`).get()).data()?.status === "active", "Trade Copier invoice failure never marks course/package access past due.");

  await db.doc(`${studentPath(actor)}/trade_copier_subscriptions/current`).set({
    paystackPlanCode: "",
    updatedAt: "2026-09-06T11:10:00.000Z"
  }, { merge: true });
  const missingStoredPlan = await billing.processTradeCopierPaystackWebhook({
    event: "charge.success",
    data: {
      id: "evt_tc_missing_stored_plan",
      reference: "missing_stored_plan_reference",
      status: "success",
      amount: 2500000,
      currency: "NGN",
      created_at: "2026-09-06T11:10:00.000Z",
      metadata: { product: "trade_copier" },
      plan: { plan_code: "PLN_stage29i_trade_copier" },
      subscription: {
        subscription_code: "SUB_webhook_tc",
        email_token: "EMAIL_webhook_tc",
        next_payment_date: "2099-03-01T00:00:00.000Z"
      }
    }
  }, { paystack: fake.adapter });
  assert(missingStoredPlan.handled && !missingStoredPlan.processed, "Recurring renewal fails closed when the stored Trade Copier plan identity is missing.");
  await db.doc(`${studentPath(actor)}/trade_copier_subscriptions/current`).set({
    paystackPlanCode: "PLN_stage29i_trade_copier"
  }, { merge: true });

  await billing.processTradeCopierPaystackWebhook({
    event: "charge.success",
    data: {
      id: "evt_tc_renewal_restore",
      reference: "renewal_restore_reference",
      status: "success",
      amount: 2500000,
      currency: "NGN",
      created_at: "2026-09-06T11:30:00.000Z",
      metadata: { product: "trade_copier" },
      plan: { plan_code: "PLN_stage29i_trade_copier" },
      subscription: {
        subscription_code: "SUB_webhook_tc",
        email_token: "EMAIL_webhook_tc",
        next_payment_date: "2099-04-01T00:00:00.000Z"
      }
    }
  }, { paystack: fake.adapter });
  assert((await readSubscription(actor))?.status === "active_paid", "Valid recurring renewal can restore a past-due Trade Copier subscription.");

  const courseEvent = await billing.processTradeCopierPaystackWebhook({
    event: "subscription.disable",
    data: {
      id: "evt_course_disable",
      subscription_code: "SUB_webhook_tc",
      created_at: "2026-09-06T12:00:00.000Z",
      metadata: { product: "course" }
    }
  }, { paystack: fake.adapter });
  assert(courseEvent.handled && !courseEvent.processed, "Conflicting product webhook with a Trade Copier subscription code is claimed safely but not processed.");
  assert((await readSubscription(actor))?.status === "active_paid", "Course/package webhook cannot affect Trade Copier billing.");

  await billing.cancelStudentTradeCopierSubscription(actor, {
    paystack: fake.adapter,
    skipImmediateCancellationRetry: true
  });
  assert((await readCleanupTask(actor))?.status === "retry_scheduled", "Cancellation before provider webhook leaves matching due provider work.");
  const notRenew = await billing.processTradeCopierPaystackWebhook({
    event: "subscription.not_renew",
    data: {
      id: "evt_tc_not_renew",
      subscription_code: "SUB_webhook_tc",
      created_at: "2026-09-06T12:30:00.000Z",
      metadata: { product: "trade_copier" }
    }
  }, { paystack: fake.adapter });
  assert(notRenew.handled && notRenew.processed, "Trade Copier subscription.not_renew webhook is handled.");
  assert((await readSubscription(actor))?.status === "non_renewing", "subscription.not_renew records non-renewing state instead of falsely expiring the paid period.");
  assert(!(await billing.resolveTradeCopierBillingAccess(actor.workspaceId, actor.studentId)).active, "Non-renewing Trade Copier state locks setup access immediately without claiming expiry.");
  assert((await readCleanupTask(actor))?.status === "retry_scheduled", "subscription.not_renew preserves awaiting-disable cleanup work until provider disable is confirmed.");

  const disabled = await billing.processTradeCopierPaystackWebhook({
    event: "subscription.disable",
    data: {
      id: "evt_tc_disable",
      subscription_code: "SUB_webhook_tc",
      created_at: "2026-09-06T13:00:00.000Z",
      metadata: { product: "trade_copier" }
    }
  }, { paystack: fake.adapter });
  assert(disabled.handled && disabled.processed, "Trade Copier subscription.disable webhook is handled idempotently.");
  assert((await readSubscription(actor))?.status === "cancelled", "Trade Copier disable webhook cancels only Trade Copier.");
  assert((await readCleanupTask(actor))?.status === "resolved", "Matching subscription.disable webhook resolves the exact pending Paystack cancellation task.");
  const duplicate = await billing.processTradeCopierPaystackWebhook({
    event: "subscription.disable",
    data: {
      id: "evt_tc_disable",
      subscription_code: "SUB_webhook_tc",
      created_at: "2026-09-06T13:00:00.000Z",
      metadata: { product: "trade_copier" }
    }
  }, { paystack: fake.adapter });
  assert(duplicate.duplicate && duplicate.handled, "Duplicate Trade Copier webhook is detected from the idempotent receipt.");
  const staleInvoice = await billing.processTradeCopierPaystackWebhook({
    event: "invoice.payment_failed",
    data: {
      id: "evt_tc_stale_invoice",
      subscription_code: "SUB_webhook_tc",
      created_at: "2026-09-06T09:00:00.000Z",
      metadata: { product: "trade_copier" }
    }
  }, { paystack: fake.adapter });
  assert(staleInvoice.handled && !staleInvoice.processed, "Stale Trade Copier webhook receipt is handled without falsely reporting a processed lifecycle transition.");
  assert((await readSubscription(actor))?.status === "cancelled", "Out-of-order stale Trade Copier webhook cannot overwrite a newer lifecycle state.");

  const unknown = await billing.processTradeCopierPaystackWebhook({
    event: "charge.success",
    data: {
      id: "evt_unknown_product",
      reference: "unknown_reference",
      status: "success",
      amount: 2500000,
      currency: "NGN",
      metadata: {}
    }
  }, { paystack: fake.adapter });
  assert(!unknown.handled && !unknown.processed, "Unproven Paystack product events remain safely unhandled by Trade Copier.");

  await clearActor(actor);
}

async function testConcurrentCheckout() {
  const actor = actorFor("concurrent");
  await clearActor(actor);
  await seedActor(actor);
  const fake = paystackFor();
  const first = billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_concurrent_one",
    referenceFactory: () => "thtc_stage29i_concurrent_one"
  });
  const second = billing.createStudentTradeCopierCheckout(actor, {
    paystack: fake.adapter,
    idFactory: () => "stage29i_concurrent_two",
    referenceFactory: () => "thtc_stage29i_concurrent_two"
  });
  const results = await Promise.allSettled([first, second]);
  assert(results.filter((result) => result.status === "fulfilled").length === 1, "Concurrent checkout attempts create one successful lifecycle.");
  assert(results.filter((result) => result.status === "rejected").length === 1, "Concurrent checkout attempts reject the duplicate lifecycle.");
  const intents = await db.collection(`workspaces/${actor.workspaceId}/trade_copier_payment_intents`)
    .where("studentId", "==", actor.studentId)
    .get();
  assert(intents.size === 1, "Concurrent checkout attempts leave one canonical payment intent.");
  await clearActor(actor);
}

await assertEmulatorAvailable();
await testCanonicalCheckoutVerifyCancel();
await testMismatchAndPending();
await testLegacyGrandfathering();
await testLegacyVerificationAndCleanupFailure();
await testProviderCancellationFailureRetryAndMissingTarget();
await testInitialCancellationSchedulingAndRecovery();
await testRepeatedCancellationIdempotencyAndAuditTruth();
await testCancellationAuthorizationAfterEligibilityLoss();
await testVerificationAfterEligibilityLossKeepsSetupLocked();
await testCancellationRetryWorkerConcurrencyAndLeases();
await testStaleAsyncLifecycleRaces();
await testPaystackWebhookProductIsolationAndOrdering();
await testConcurrentCheckout();

console.log("Stage 29I Trade Copier billing repository QA passed.");
