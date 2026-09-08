import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const subscriptionRepo = read("src/lib/crypto-execution/forex-autocopy-subscription-repository.ts");
const tradeCopierBilling = read("src/lib/student-copier/student-copier-billing.ts");
const provisioningRepo = read("src/lib/crypto-execution/forex-provisioning-repository.ts");
const forexDemo = read("src/lib/crypto-execution/forex-demo-execution.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const provisioningPreview = read("src/components/crypto-execution/forex-provisioning-preview.tsx");
const checkoutRoute = read("src/app/api/student/forex-execution/subscription/checkout/route.ts");
const verifyRoute = read("src/app/api/student/forex-execution/subscription/verify/route.ts");
const cancelRoute = read("src/app/api/student/forex-execution/subscription/cancel/route.ts");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");
const indexes = read("firestore.indexes.json");
const envExample = read(".env.example");

assert(
  packageJson.scripts?.["stage15s:qa"] === "node scripts/qa-stage15s-forex-autocopy-checkout-lifecycle.mjs",
  "package.json must expose npm run stage15s:qa."
);

assert(
  types.includes("\"payment_pending\"") &&
    types.includes("\"payment_failed\"") &&
    types.includes("ForexAutoCopyPaymentIntentSummary") &&
    types.includes("StudentForexAutoCopyCheckoutResponse") &&
    types.includes("StudentForexAutoCopyVerifyResponse"),
  "Stage 15S must add Forex AutoCopy pending/failed lifecycle and support-safe checkout response types."
);

assert(
  subscriptionRepo.includes("initializePaystackTransaction") &&
    subscriptionRepo.includes("verifyPaystackTransaction") &&
    subscriptionRepo.includes("requireForexAutoCopyPlanCode") &&
    subscriptionRepo.includes("checkoutEmailForPaystack") &&
    subscriptionRepo.includes("forex_autocopy_plan_not_configured") &&
    subscriptionRepo.includes("Forex AutoCopy Paystack plan code is not configured yet.") &&
    subscriptionRepo.includes("Forex AutoCopy Paystack checkout could not be opened:") &&
    subscriptionRepo.includes("studentId}+forex-autocopy@example.com") &&
    subscriptionRepo.includes("forex_autocopy_payment_intents") &&
    subscriptionRepo.includes("forex_autocopy_subscriptions/current") &&
    subscriptionRepo.includes("product: \"forex_autocopy\"") &&
    subscriptionRepo.includes("status: \"payment_pending\"") &&
    subscriptionRepo.includes("status: \"active_paid\"") &&
    subscriptionRepo.includes("status: \"payment_failed\""),
  "Forex AutoCopy checkout must fail closed when the dedicated plan code is missing, create protected Paystack intents, and update the student subscription lifecycle."
);

assert(
  subscriptionRepo.includes("resolveStudentEntitlements") &&
    subscriptionRepo.includes("autoCopy.access !== \"allowed\"") &&
    subscriptionRepo.includes("entitlements.riskPosture !== \"personal_account\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"trial\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"past_due\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"cancelled\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"expired\""),
  "Checkout must preserve Stage 16 Auto-Copy entitlement, paid subscription, and personal-account gates."
);

assert(
  subscriptionRepo.includes("cleanupForexProvisioningForSubscriptionLifecycle") &&
    subscriptionRepo.includes("\"cancelled\"") &&
    subscriptionRepo.includes("\"past_due\"") &&
    subscriptionRepo.includes("\"expired\""),
  "Cancelled, past-due, and expired Forex AutoCopy billing must trigger mock provisioning cleanup."
);

assert(
  provisioningRepo.includes("resolveTradeCopierBillingAccess") &&
    provisioningRepo.includes("billing.status as ForexAutoCopyBillingStatus") &&
    provisioningRepo.includes("entitled: billing.active") &&
    provisioningRepo.includes("billing.source === \"legacy_grandfathered\" ? \"manual\" : \"paystack\"") &&
    provisioningRepo.includes("billing.entitled && status !== \"disabled\"") &&
    provisioningRepo.includes("cleanupForexProvisioningForSubscriptionLifecycle") &&
    provisioningRepo.includes("providerMode: \"dry_run\""),
  "Broker provisioning must unlock only from unified Trade Copier active billing and keep mock cleanup dry-run only."
);

assert(
  checkoutRoute.includes("requireStudent") &&
    checkoutRoute.includes("createStudentTradeCopierCheckout") &&
    verifyRoute.includes("requireStudent") &&
    verifyRoute.includes("verifyLegacyTradeCopierCheckout") &&
    verifyRoute.includes("\"forex_autocopy\"") &&
    cancelRoute.includes("requireStudent") &&
    cancelRoute.includes("cancelStudentTradeCopierSubscription"),
  "Forex AutoCopy compatibility subscription mutations must go through authenticated student API routes and the unified Trade Copier lifecycle."
);

assert(
  tradeCopierBilling.includes("TRADE_COPIER_PRODUCT_ID = \"trade_copier\"") &&
    tradeCopierBilling.includes("PAYSTACK_TRADE_COPIER_PLAN_CODE") &&
    tradeCopierBilling.includes("verifyLegacyTradeCopierCheckout") &&
    tradeCopierBilling.includes("forex_autocopy_payment_intents") &&
    tradeCopierBilling.includes("forex_autocopy_subscriptions/current") &&
    tradeCopierBilling.includes("product: TRADE_COPIER_PRODUCT_ID"),
  "Stage 29I unified Trade Copier lifecycle preserves Forex legacy callback compatibility while using canonical trade_copier billing for new access."
);

assert(
  studentUi.includes("Purchase Trade Copier") &&
    studentUi.includes("Cancel Trade Copier") &&
    studentUi.includes("copierReference") &&
    studentUi.includes("forexReference") &&
    studentUi.includes("/api/student/copier/checkout") &&
    studentUi.includes("/api/student/copier/forex/verify") &&
    studentUi.includes("/api/student/copier/cancel") &&
    studentUi.includes("Disable Forex setup") &&
    studentUi.includes("StudentCopierOverviewResponse") &&
    !studentUi.includes("Purchase Forex Copier") &&
    !studentUi.includes("Cancel Forex Copier") &&
    !studentUi.includes("metaApiToken") &&
    !studentUi.includes("metaApiAccountId"),
  "Accepted Stage 29I Student UI must show unified Trade Copier checkout/cancel with Forex setup controls through the allowlisted Copier DTO and must not ask normal students for MetaAPI token/account ID fields."
);

assert(
  provisioningPreview.includes("Payment ops") &&
    provisioningPreview.includes("paymentPending") &&
    provisioningPreview.includes("paymentFailed") &&
    provisioningPreview.includes("referenceRef") &&
    !provisioningPreview.includes("paystackAuthorizationUrl") &&
    !provisioningPreview.includes("paystackAccessCode") &&
    !provisioningPreview.includes("brokerPassword"),
  "Student/influencer/admin provisioning previews must show support-safe payment lifecycle summaries only."
);

assert(
  forexDemo.includes("loadStudentForexProvisioningForExecution") &&
    forexDemo.includes("Paid Forex AutoCopy provisioning is required before demo execution proof can run."),
  "Forex demo proof must remain blocked unless the paid provisioning gate is active."
);

assert(
  !subscriptionRepo.includes("metaapi.com") &&
    !subscriptionRepo.includes("deploy") &&
    !subscriptionRepo.includes("submitMetaApiDemoOrder") &&
    !subscriptionRepo.includes("createAccount") &&
    !subscriptionRepo.includes("brokerPassword:") &&
    !subscriptionRepo.includes("brokerLogin:"),
  "Stage 15S must not create MetaAPI resources, deploy terminals, place broker orders, or store broker credentials."
);

assert(
  rules.includes("forex_autocopy_payment_intents") &&
    rules.includes("forex_autocopy_subscriptions") &&
    rulesTest.includes("forex_autocopy_payment_intents") &&
    rulesTest.includes("forex_autocopy_subscriptions"),
  "Firestore rules and rules tests must deny protected Forex AutoCopy billing/provisioning paths."
);

assert(
  indexes.includes("forex_autocopy_payment_intents") &&
    indexes.includes("\"studentId\"") &&
    indexes.includes("\"updatedAt\""),
  "Student-filtered Forex AutoCopy payment previews must declare the required bounded query index."
);

assert(
  envExample.includes("APP_URL=http://localhost:3000") &&
    envExample.includes("PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE") &&
    envExample.includes("PAYSTACK_FOREX_AUTOCOPY_CHECKOUT_EMAIL") &&
    envExample.includes("FOREX_AUTOCOPY_PRICE_NGN") &&
    envExample.includes("PAYSTACK_TRADE_COPIER_PLAN_CODE") &&
    envExample.includes("TRADE_COPIER_PRICE_NGN"),
  ".env.example must document historical Forex AutoCopy settings, canonical Trade Copier checkout settings, and server callback URL."
);

console.log("Stage 15S Forex AutoCopy checkout lifecycle QA passed.");
