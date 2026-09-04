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

function assertExistsAll(paths, message) {
  const missing = paths.filter((entry) => !exists(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
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

const workspacePage = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const studentCrm = read("src/components/workspace/student-management-section.tsx");
const workspaceBilling = read("src/components/workspace/workspace-billing-panel.tsx");
const workspaceFormatters = read("src/components/workspace/workspace-formatters.ts");
const workspaceDashboardRepo = read("src/lib/workspace/dashboard-repository.ts");
const workspaceDashboardMappers = read("src/lib/workspace/dashboard-mappers.ts");
const workspaceValidation = read("src/lib/workspace/dashboard-validation.ts");
const workspaceStudentsRoute = read("src/app/api/workspace/students/route.ts");
const workspaceSupportRoute = read("src/app/api/workspace/students/[studentId]/support/route.ts");
const workspaceBillingRoute = read("src/app/api/workspace/billing/overview/route.ts");

const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminSupportOverview = read("src/components/admin/admin-support-overview.tsx");
const adminPaymentQueue = read("src/components/admin/payment-support-queue.tsx");
const adminPaystackOps = read("src/components/admin/paystack-payment-ops.tsx");
const adminSettlementLedger = read("src/components/admin/solana-settlement-ledger.tsx");
const adminPaymentsRoute = read("src/app/api/admin/payments/overview/route.ts");
const adminPaystackReconcileRoute = read("src/app/api/admin/payments/paystack/[paymentIntentId]/reconcile/route.ts");
const billingRepo = read("src/lib/billing/billing-repository.ts");
const billingValidation = read("src/lib/billing/billing-validation.ts");
const paymentTypes = read("src/types/payments.ts");
const workspaceTypes = read("src/types/workspace-dashboard.ts");

const stage18xQa = read("scripts/qa-stage18x-practice-mvp-final-acceptance.mjs");
const stage19iQa = read("scripts/qa-stage19i-course-mvp-final-acceptance.mjs");

const opsBrowserSurface = [
  workspacePage,
  workspaceOverview,
  studentCrm,
  workspaceBilling,
  adminPage,
  adminSupportOverview,
  adminPaymentQueue,
  adminPaystackOps,
  adminSettlementLedger
].join("\n");

const opsServerSurface = [
  workspaceDashboardRepo,
  workspaceDashboardMappers,
  workspaceValidation,
  workspaceStudentsRoute,
  workspaceSupportRoute,
  workspaceBillingRoute,
  adminPaymentsRoute,
  adminPaystackReconcileRoute,
  billingRepo,
  billingValidation,
  paymentTypes,
  workspaceTypes
].join("\n");

assert(
  packageJson.scripts?.["stage20d:qa"] === "node scripts/qa-stage20d-ops-support-final-acceptance.mjs",
  "package.json exposes npm run stage20d:qa."
);

assertExistsAll(
  [
    "scripts/qa-stage20a-ops-crm-payments-support-foundation.mjs",
    "scripts/qa-stage20b-workspace-student-crm-lifecycle.mjs",
    "scripts/qa-stage20c-payment-subscription-ops.mjs",
    "scripts/qa-stage18x-practice-mvp-final-acceptance.mjs",
    "scripts/qa-stage19i-course-mvp-final-acceptance.mjs",
    "src/components/admin/payment-support-queue.tsx",
    "src/app/api/workspace/students/[studentId]/support/route.ts"
  ],
  "Stage 20D final smoke covers existing ops QA and frozen MVP acceptance scripts."
);

assertIncludesAll(
  workspaceOverview,
  [
    "Stage 20A ops audit",
    "Workspace readiness summary",
    "Profile",
    "Payment/access",
    "Courses",
    "Signals",
    "AutoCopy",
    "Practice/course MVP",
    "Private practice trades",
    "payment payloads",
    "credential records"
  ],
  "Workspace readiness summary remains safe and complete."
);

assertIncludesAll(
  studentCrm + workspaceTypes + workspaceDashboardMappers,
  [
    "WorkspaceStudentLifecycleStatus",
    "pending_onboarding",
    "payment_access_issue",
    "needs_support",
    "Lifecycle",
    "Support needed",
    "Mark follow-up",
    "Clear follow-up",
    "Internal support note",
    "Operational status",
    "supportFollowUpNeeded",
    "supportNoteSummary",
    "supportUpdatedByRef"
  ],
  "Student CRM lifecycle/status indicators and support actions remain present."
);

assertIncludesAll(
  workspaceValidation + workspaceDashboardRepo + workspaceSupportRoute,
  [
    "validateStudentSupportPatchPayload",
    "sanitizeText(payload.supportNoteSummary, 280)",
    "Use plain text only",
    "requireInfluencer",
    "workspaces/${actor.workspaceId}/students/${studentId}",
    "Notes are internal summaries and are not returned through student APIs",
    "audit_log"
  ],
  "Support follow-up actions and internal notes remain bounded, workspace-scoped, and server-written."
);

assertIncludesAll(
  studentCrm + workspaceTypes + workspaceDashboardMappers,
  [
    "WorkspaceStudentBillingOpsStatus",
    "unpaid_pending_payment",
    "active_subscription",
    "expired_cancelled_subscription",
    "verification_pending",
    "payment_mismatch_needs_admin_review",
    "billingOpsLabel",
    "billingOpsDetail",
    "Student needs payment support",
    "Admin review pending",
    "Access active",
    "Payment issue resolved"
  ],
  "Workspace-safe payment/subscription issue indicators remain present."
);

assertIncludesAll(
  adminSupportOverview + adminPaymentQueue + adminPage + paymentTypes + billingRepo,
  [
    "AdminSupportOverview",
    "PaymentSupportQueue",
    "Reconciliation support queue",
    "AdminPaymentSupportQueueItem",
    "paymentSupportQueue",
    "buildAdminPaymentSupportQueue",
    "safeOpsDigest",
    "pending_paystack_verification",
    "failed_verification",
    "stale_pending_intent",
    "subscription_access_mismatch",
    "solana_settlement_review"
  ],
  "Super Admin support overview and payment support queue remain present."
);

const paymentSupportBuilder = sourceSlice(
  billingRepo,
  "function buildAdminPaymentSupportQueue",
  "function describeAdminPaymentsQueryError"
);

assertIncludesAll(
  paymentSupportBuilder,
  [
    "safeOpsDigest(intent.paymentIntentId, \"intent\")",
    "safeOpsDigest(intent.workspaceId, \"ws\")",
    "safeOpsDigest(intent.studentId, \"student\")",
    "safeOpsDigest(settlement.settlementId, \"solset\")",
    "Do not grant access from workspace UI",
    "This queue does not initiate payouts"
  ],
  "Payment support queue uses hashed/masked refs and avoids workspace-side access grants or payouts."
);

assertExcludesAll(
  paymentSupportBuilder,
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
  "Payment support queue does not return raw provider refs, wallets, payloads, or authorization data."
);

assertIncludesAll(
  workspaceFormatters + workspaceBilling + adminPaystackOps + adminSettlementLedger + adminPaymentQueue,
  [
    "maskOpsReference",
    "payref",
    "receipt",
    "solref",
    "safePaymentRef",
    "maskedWorkspaceRef",
    "maskedStudentRef"
  ],
  "Workspace/admin payment and settlement refs remain masked in browser-visible surfaces."
);

assertIncludesAll(
  firestoreRules,
  [
    "match /paystack_webhooks/{documentId}",
    "match /solana_settlements/{documentId}",
    "match /workspaces/{workspaceId}/payment_intents/{documentId}",
    "match /workspaces/{workspaceId}/students/{studentId} {",
    "match /workspaces/{workspaceId}/students/{studentId}/subscriptions/{documentId}",
    "match /workspaces/{workspaceId}/students/{studentId}/course_lesson_notes/{documentId}",
    "match /workspaces/{workspaceId}/students/{studentId}/practice_orders/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules retain deny-by-default coverage for protected ops, payment, support, course, and practice records."
);

assertIncludesAll(
  stage18xQa,
  [
    "Stage 18X practice MVP final acceptance",
    "Practice server/types layer does not couple to live execution",
    "Workspace recent completion type excludes raw sessionId/studentId",
    "FireStore rules retain deny-by-default coverage for protected practice paths".replace("FireStore", "Firestore")
  ],
  "Frozen Stage 18X practice acceptance guard remains intact."
);

assertIncludesAll(
  stage19iQa,
  [
    "Stage 19I course/lesson MVP final acceptance",
    "Student detail strips authoring quiz keys",
    "Workspace aggregates include only masked refs",
    "Course MVP source does not add forbidden"
  ],
  "Frozen Stage 19I course acceptance guard remains intact."
);

assertIncludesAll(
  plan,
  [
    "Stage 20D - Ops, CRM, Payments, And Support Final Smoke Freeze",
    "Stage 20 source-QA frozen",
    "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
    "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
    "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF"
  ],
  "plan.md marks Stage 20 source-QA frozen while preserving Stage 18X and 19I references."
);

assertIncludesAll(
  manualBacklog,
  [
    "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
    "Ops/CRM/payments/support MVP status: source-QA frozen at Stage 20D",
    "Stage 20 Ops Must Test Before Demo",
    "Stage 20 Ops Nice To Test",
    "Stage 20 Ops Later Regression",
    "Workspace readiness summary renders.",
    "Admin support overview and payment queue render.",
    "Frozen Practice and Course surfaces still open normally."
  ],
  "manual-test-backlog.md reorganizes Stage 20 browser QA into demo, nice-to-test, and later regression groups."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 20D - Ops, CRM, Payments, And Support Final Smoke Freeze",
    "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
    "npm run stage20d:qa",
    "Stage 20 ops/support MVP is source-QA frozen"
  ],
  "prompt summary moves current stop to Stage 20D final freeze."
);

assertExcludesAll(
  opsBrowserSurface + opsServerSurface,
  [
    "refundPayment",
    "createRefund",
    "initiatePayout",
    "withdraw(",
    "walletTransfer",
    "autoGrant",
    "grantAccessFromWorkspace",
    "sendEmail",
    "sendSms",
    "WhatsApp",
    "pushNotification",
    "uploadFile",
    "generatePdf",
    "MetaApi",
    "binance.private",
    "bybit.private"
  ],
  "Stage 20D final ops surface adds no forbidden payment, messaging, upload, provider, AutoCopy, or live execution behavior."
);

console.log("Stage 20D ops, CRM, payments, and support final acceptance QA passed.");
