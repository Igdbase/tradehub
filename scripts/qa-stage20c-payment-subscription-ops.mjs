import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, forbidden, message) {
  const hits = forbidden.filter((entry) => source.includes(entry));
  assert(hits.length === 0, `${message}${hits.length ? ` Hits: ${hits.join(", ")}` : ""}`);
}

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert(start >= 0, `Found source slice start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert(end > start, `Found source slice end marker: ${endMarker}`);
  return source.slice(start, end);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const firestoreRules = read("firestore.rules");

const paymentTypes = read("src/types/payments.ts");
const workspaceTypes = read("src/types/workspace-dashboard.ts");
const workspaceMappers = read("src/lib/workspace/dashboard-mappers.ts");
const workspaceRepository = read("src/lib/workspace/dashboard-repository.ts");
const studentCrm = read("src/components/workspace/student-management-section.tsx");
const billingRepository = read("src/lib/billing/billing-repository.ts");
const billingValidation = read("src/lib/billing/billing-validation.ts");
const billingMappers = read("src/lib/billing/billing-mappers.ts");
const adminPaymentQueuePath = "src/components/admin/payment-support-queue.tsx";
const adminPaymentQueue = read(adminPaymentQueuePath);
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminSupportOverview = read("src/components/admin/admin-support-overview.tsx");
const paystackOps = read("src/components/admin/paystack-payment-ops.tsx");
const workspaceBilling = read("src/components/workspace/workspace-billing-panel.tsx");
const studentBillingOverview = read("src/app/api/student/billing/overview/route.ts");
const studentBillingCheckout = read("src/app/api/student/billing/checkout/route.ts");
const studentBillingVerify = read("src/app/api/student/billing/verify/route.ts");

assert(
  packageJson.scripts?.["stage20c:qa"] === "node scripts/qa-stage20c-payment-subscription-ops.mjs",
  "package.json exposes npm run stage20c:qa."
);

assert(exists(adminPaymentQueuePath), "Admin payment support queue component exists.");

assertIncludesAll(
  workspaceTypes + workspaceMappers + studentCrm,
  [
    "WorkspaceStudentBillingOpsStatus",
    "unpaid_pending_payment",
    "active_subscription",
    "expired_cancelled_subscription",
    "verification_pending",
    "payment_mismatch_needs_admin_review",
    "payment_issue_resolved",
    "billingOpsLabel",
    "billingOpsDetail",
    "billingAdminReviewPending",
    "Student needs payment support",
    "Admin review pending",
    "Access active",
    "Payment issue resolved"
  ],
  "Workspace student CRM includes safe billing/subscription issue indicators."
);

assertIncludesAll(
  paymentTypes + billingRepository,
  [
    "AdminPaymentSupportQueueItem",
    "AdminPaymentSupportQueueKind",
    "pending_paystack_verification",
    "failed_verification",
    "stale_pending_intent",
    "subscription_access_mismatch",
    "solana_settlement_review",
    "paymentSupportQueue",
    "buildAdminPaymentSupportQueue",
    "safeOpsDigest",
    "crypto.createHash(\"sha256\")"
  ],
  "Admin payment support queue is typed and server-computed with hashed refs."
);

const supportQueueBuilder = sourceSlice(
  billingRepository,
  "function buildAdminPaymentSupportQueue",
  "function describeAdminPaymentsQueryError"
);

assertIncludesAll(
  supportQueueBuilder,
  [
    "safeOpsDigest(intent.paymentIntentId, \"intent\")",
    "safeOpsDigest(intent.workspaceId, \"ws\")",
    "safeOpsDigest(intent.studentId, \"student\")",
    "safeOpsDigest(settlement.settlementId, \"solset\")",
    "Do not grant access from workspace UI",
    "This queue does not initiate payouts"
  ],
  "Payment support queue emits safe refs and no workspace access-grant/payout behavior."
);

assertExcludesAll(
  supportQueueBuilder,
  [
    "paystackReference:",
    "paystackCustomerCode:",
    "paystackAuthorizationUrl:",
    "verifiedSignature:",
    "platformWallet:",
    "influencerWallet:",
    "webhookPayload",
    "authorizationUrl"
  ],
  "Payment support queue builder does not return raw provider refs, wallets, webhook payloads, or authorization data."
);

assertIncludesAll(
  adminPaymentQueue + adminPage + adminSupportOverview + paystackOps,
  [
    "PaymentSupportQueue",
    "Reconciliation support queue",
    "paymentSupportQueueCount",
    "pendingPaystackVerificationCount",
    "failedVerificationCount",
    "stalePendingIntentCount",
    "subscriptionMismatchCount",
    "Request recheck",
    "does not",
    "issue refunds, payouts, withdrawals, or workspace-side access grants"
  ],
  "Admin UI exposes safe payment support queue and preserves existing recheck-only action copy."
);

assertIncludesAll(
  billingRepository,
  [
    "reconcilePaystackPaymentIntent",
    "verifyPaystackTransaction(intent.paystackReference)",
    "No subscription state was changed",
    "applySuccessfulPayment"
  ],
  "Existing Paystack reconciliation behavior remains in the established Super Admin path."
);

assertIncludesAll(
  billingValidation,
  [
    "parseSolanaSettlementPatchPayload",
    "boundedString",
    "text_too_long",
    "payload.payoutNote",
    "500",
    "payoutSignature"
  ],
  "Existing Solana settlement support notes remain bounded by validation."
);

assertIncludesAll(
  workspaceBilling + studentCrm,
  [
    "maskOpsReference",
    "Billing / access",
    "payment refs",
    "provider payloads",
    "credentials"
  ],
  "Workspace browser surfaces keep payment/provider details masked or omitted."
);

assertIncludesAll(
  studentBillingOverview + studentBillingCheckout + studentBillingVerify,
  ["requireStudent"],
  "Student billing checkout and verification routes remain signed-in student routes."
);

assertIncludesAll(
  firestoreRules,
  [
    "match /paystack_webhooks/{documentId}",
    "match /solana_settlements/{documentId}",
    "match /workspaces/{workspaceId}/payment_intents/{documentId}",
    "match /workspaces/{workspaceId}/students/{studentId}/subscriptions/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules retain deny-by-default coverage for payment and subscription internals."
);

assertIncludesAll(
  plan,
  [
    "Stage 20C - Payment And Subscription Ops Reconciliation Support",
    "TH-2026-08-21-STAGE20C-PAYMENT-SUBSCRIPTION-OPS-HANDOFF",
    "Practice/backtesting remains source-QA frozen",
    "Course/Lesson remains source-QA frozen"
  ],
  "plan.md documents Stage 20C scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 20C Payment And Subscription Ops Reconciliation Support",
    "Workspace sees safe student billing/support indicators.",
    "Admin sees payment support queue.",
    "Student payment checkout/verification behavior is unchanged.",
    "Browser-visible data contains only masked refs and safe status labels."
  ],
  "manual-test-backlog.md records deferred Stage 20C manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 20C - Payment And Subscription Ops Reconciliation Support",
    "TH-2026-08-21-STAGE20C-PAYMENT-SUBSCRIPTION-OPS-HANDOFF",
    "npm run stage20c:qa"
  ],
  "prompt summary moves current stop to Stage 20C."
);

const stage20cSurface = [
  paymentTypes,
  workspaceTypes,
  workspaceMappers,
  workspaceRepository,
  billingRepository,
  billingValidation,
  billingMappers,
  adminPaymentQueue,
  adminPage,
  adminSupportOverview,
  paystackOps,
  workspaceBilling,
  studentCrm
].join("\n");

assertExcludesAll(
  stage20cSurface,
  [
    "refundPayment",
    "createRefund",
    "initiatePayout",
    "withdraw(",
    "sendEmail",
    "sendSms",
    "WhatsApp",
    "pushNotification",
    "autoGrant",
    "grantAccessFromWorkspace",
    "MetaApi",
    "Binance",
    "Bybit"
  ],
  "Stage 20C surfaces add no forbidden refunds, payouts, messaging, provider, AutoCopy, or execution behavior."
);

console.log("Stage 20C payment and subscription ops reconciliation support QA passed.");
