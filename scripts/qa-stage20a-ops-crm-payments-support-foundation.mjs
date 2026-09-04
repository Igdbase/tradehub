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
const workspaceDashboardRoute = read("src/app/api/workspace/dashboard/route.ts");
const workspaceStudentsRoute = read("src/app/api/workspace/students/route.ts");
const workspaceBillingRoute = read("src/app/api/workspace/billing/overview/route.ts");

const studentBilling = read("src/components/billing/student-billing-client.tsx");
const studentBillingRoute = read("src/app/api/student/billing/overview/route.ts");
const studentCheckoutRoute = read("src/app/api/student/billing/checkout/route.ts");
const studentVerifyRoute = read("src/app/api/student/billing/verify/route.ts");

const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminSupportOverview = read("src/components/admin/admin-support-overview.tsx");
const adminPaystackOps = read("src/components/admin/paystack-payment-ops.tsx");
const adminPaymentRail = read("src/components/admin/payment-rail-overview.tsx");
const adminSettlementLedger = read("src/components/admin/solana-settlement-ledger.tsx");
const adminOverviewRoute = read("src/app/api/admin/overview/route.ts");
const adminPaymentsRoute = read("src/app/api/admin/payments/overview/route.ts");
const adminAuditRoute = read("src/app/api/admin/audit-log/route.ts");
const billingRepo = read("src/lib/billing/billing-repository.ts");
const billingMappers = read("src/lib/billing/billing-mappers.ts");
const billingValidation = read("src/lib/billing/billing-validation.ts");
const adminApi = read("src/lib/admin/admin-api.ts");

const opsClientSurface = [
  workspacePage,
  workspaceOverview,
  studentCrm,
  workspaceBilling,
  studentBilling,
  adminPage,
  adminSupportOverview,
  adminPaystackOps,
  adminPaymentRail,
  adminSettlementLedger
].join("\n");

const opsServerSurface = [
  workspaceDashboardRepo,
  workspaceDashboardRoute,
  workspaceStudentsRoute,
  workspaceBillingRoute,
  studentBillingRoute,
  studentCheckoutRoute,
  studentVerifyRoute,
  adminOverviewRoute,
  adminPaymentsRoute,
  adminAuditRoute,
  billingRepo,
  billingMappers,
  billingValidation,
  adminApi
].join("\n");

assert(
  packageJson.scripts?.["stage20a:qa"] === "node scripts/qa-stage20a-ops-crm-payments-support-foundation.mjs",
  "package.json exposes npm run stage20a:qa."
);

assertExistsAll(
  [
    "src/app/(influencer)/workspace/page.tsx",
    "src/app/(influencer)/workspace/onboarding/page.tsx",
    "src/app/api/workspace/dashboard/route.ts",
    "src/app/api/workspace/students/route.ts",
    "src/app/api/workspace/billing/overview/route.ts",
    "src/app/(student)/app/billing/page.tsx",
    "src/app/api/student/billing/overview/route.ts",
    "src/app/api/student/billing/checkout/route.ts",
    "src/app/api/student/billing/verify/route.ts",
    "src/app/(super-admin)/admin/page.tsx",
    "src/app/api/admin/overview/route.ts",
    "src/app/api/admin/payments/overview/route.ts",
    "src/app/api/admin/audit-log/route.ts",
    "src/components/admin/admin-support-overview.tsx"
  ],
  "Stage 20A audited workspace, student billing, and admin/support surfaces exist."
);

assertIncludesAll(
  plan,
  [
    "Stage 20A - Workspace Ops, Student CRM, Payments, And Support Audit Foundation",
    "Workspace onboarding and student CRM",
    "Payment and subscription operations",
    "Admin and support operations",
    "TH-2026-08-21-STAGE20A-OPS-CRM-PAYMENTS-SUPPORT-HANDOFF"
  ],
  "plan.md documents Stage 20A scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 20A Workspace Ops, Student CRM, Payments, And Support Audit Foundation",
    "Workspace onboarding overview renders safe readiness states.",
    "Workspace student CRM search/filter works.",
    "Admin payment overview shows safe masked operational data.",
    "Admin support overview shows safe issue summaries only."
  ],
  "manual-test-backlog.md records deferred Stage 20A manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-21-STAGE20A-OPS-CRM-PAYMENTS-SUPPORT-HANDOFF",
    "Stage 20A - Workspace Ops, Student CRM, Payments, And Support Audit Foundation",
    "Practice/backtesting remains source-QA frozen",
    "course/lesson MVP remains source-QA frozen",
    "npm run stage20a:qa"
  ],
  "prompt summary moves current stop to Stage 20A while preserving Stage 18X and 19I freezes."
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
    "course notes",
    "payment payloads",
    "credential records"
  ],
  "Workspace overview exposes a safe readiness summary without private internals."
);

assertIncludesAll(
  studentCrm,
  [
    "Search loaded page",
    "Status",
    "Verified rails",
    "Pending",
    "Unpaid / expired",
    "Support ref",
    "practiceStudentRef",
    "private course notes",
    "practice trades",
    "journal entries",
    "payment payloads",
    "provider payloads",
    "credentials"
  ],
  "Workspace student CRM supports safe search/filter/counts and masked support refs."
);

assertIncludesAll(
  workspaceDashboardRepo + workspaceDashboardMappers + workspaceDashboardRoute + workspaceStudentsRoute,
  [
    "requireInfluencer",
    "parseStudentFilters",
    "applySearch",
    "dedupeWorkspaceStudents",
    "practiceStudentRef",
    "hydrateStudentCourseCompletion",
    "Search is applied to the loaded page only"
  ],
  "Workspace repository keeps student CRM bounded, workspace-scoped, and summary-based."
);

assertIncludesAll(
  workspaceDashboardRoute + workspaceStudentsRoute + workspaceBillingRoute,
  ["requireInfluencer"],
  "Workspace ops routes require influencer workspace auth."
);

assertIncludesAll(
  studentBilling,
  [
    "No active subscription yet",
    "Payment needs attention",
    "Subscription not active",
    "Billing unavailable",
    "Payment safety",
    "TradeHub never collects card details",
    "server-side before access changes"
  ],
  "Student billing keeps clear lifecycle empty/error/safety copy."
);

assertIncludesAll(
  studentBillingRoute + studentCheckoutRoute + studentVerifyRoute,
  ["requireStudent"],
  "Student billing routes require signed-in student auth."
);

assertIncludesAll(
  workspaceFormatters + workspaceBilling + adminPaystackOps + adminSettlementLedger,
  [
    "maskOpsReference",
    "intent",
    "payref",
    "receipt",
    "solref"
  ],
  "Workspace/admin payment browser display uses masked operational references."
);

assertIncludesAll(
  adminSupportOverview,
  [
    "Stage 20A support audit",
    "Safe operator issue summary",
    "Pending apps",
    "Payment issues",
    "Workspace readiness",
    "AutoCopy blocks",
    "MVP browser QA",
    "aggregate-only",
    "does not show raw payment payloads"
  ],
  "Admin support overview shows aggregate-only issue summaries."
);

assertIncludesAll(
  adminPage,
  [
    "RoleGate allowedRole=\"super_admin\"",
    "Stage 20A ops audit",
    "AdminSupportOverview",
    "/api/admin/payments/overview",
    "/api/admin/audit-log?limit=25"
  ],
  "Admin page keeps Super Admin gate and safe ops/support panels."
);

assertIncludesAll(
  adminPaymentsRoute + adminAuditRoute,
  ["requireSuperAdmin"],
  "Admin payments and audit routes require Super Admin auth."
);

assertIncludesAll(
  adminOverviewRoute + adminApi,
  ["getAdminRepositoryForRequest", "requireSuperAdmin"],
  "Admin overview stays behind the Super Admin repository boundary."
);

assertIncludesAll(
  billingRepo,
  [
    "getPaystackReadiness",
    "verifyPaystackTransaction",
    "processPaystackWebhook",
    "safeMetadata",
    "summarizePaymentOps",
    "PAYMENT_INTENT_PAGE_SIZE",
    "WEBHOOK_RECEIPT_PAGE_SIZE",
    "No payment intents have been created yet"
  ],
  "Billing repository keeps Paystack verification/webhook safety and bounded ops summaries."
);

assertIncludesAll(
  firestoreRules,
  [
    "payment_intents",
    "subscriptions",
    "paystack_webhooks",
    "course_lesson_notes",
    "practice_orders",
    "allow read, write: if false"
  ],
  "Firestore rules retain deny-by-default coverage for protected billing, learning, and practice paths."
);

assertExcludesAll(
  opsClientSurface.toLowerCase(),
  [
    "rawproviderpayload",
    ".paystackauthorizationurl",
    ".paystackaccesscode",
    ".brokerpassword",
    ".metaapitoken",
    ".exchangeapikey",
    ".exchangesecret",
    ".vaultref",
    ".correctindex"
  ],
  "Ops browser surfaces do not describe or render forbidden secret/private payload fields."
);

assertExcludesAll(
  opsServerSurface.toLowerCase(),
  [
    "sendgrid",
    "twilio",
    "whatsapp",
    "push notification",
    "jspdf",
    "pdfkit",
    "firebase/storage",
    "uploadbytes",
    "new payment provider",
    "refundstudent",
    "withdrawfunds"
  ],
  "Stage 20A ops foundation does not add forbidden messaging/upload/PDF/refund/withdrawal/provider integrations."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
    "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF"
  ],
  "Stage 18X and Stage 19I handoff references remain preserved."
);

console.log("Stage 20A workspace ops, CRM, payments, and support audit foundation QA passed.");
