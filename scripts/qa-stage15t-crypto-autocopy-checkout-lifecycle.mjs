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

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));

  assert(missing.length === 0, `${message} Missing: ${missing.join(", ")}`);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const subscriptionRepo = read("src/lib/crypto-execution/crypto-autocopy-subscription-repository.ts");
const tradeCopierBilling = read("src/lib/student-copier/student-copier-billing.ts");
const executionRepo = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const validation = read("src/lib/crypto-execution/crypto-execution-validation.ts");
const riskEngine = read("src/lib/crypto-execution/crypto-risk-engine.ts");
const routing = read("src/lib/crypto-execution/crypto-signal-routing.ts");
const liveSandbox = read("src/lib/crypto-execution/crypto-live-sandbox.ts");
const liveProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const mappers = read("src/lib/crypto-execution/crypto-execution-mappers.ts");
const credentialVault = read("src/lib/crypto-execution/credential-vault.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const checkoutRoute = read("src/app/api/student/crypto-execution/subscription/checkout/route.ts");
const verifyRoute = read("src/app/api/student/crypto-execution/subscription/verify/route.ts");
const cancelRoute = read("src/app/api/student/crypto-execution/subscription/cancel/route.ts");
const connectionRoute = read("src/app/api/student/crypto-execution/connections/route.ts");
const overviewRoute = read("src/app/api/student/crypto-execution/overview/route.ts");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");
const indexes = read("firestore.indexes.json");
const envExample = read(".env.example");

assert(
  packageJson.scripts?.["stage15t:qa"] === "node scripts/qa-stage15t-crypto-autocopy-checkout-lifecycle.mjs",
  "package.json must expose npm run stage15t:qa."
);

assert(
  types.includes("CryptoAutoCopyBillingStatus") &&
    types.includes("CryptoAutoCopySubscriptionPreview") &&
    types.includes("StudentCryptoAutoCopyCheckoutResponse") &&
    types.includes("StudentCryptoAutoCopyVerifyResponse") &&
    types.includes("\"needs_crypto_autocopy_payment\"") &&
    types.includes("\"crypto_autocopy_billing\""),
  "Stage 15T must add support-safe Crypto AutoCopy billing, response, readiness, and risk-check types."
);

assert(
  subscriptionRepo.includes("initializePaystackTransaction") &&
    subscriptionRepo.includes("verifyPaystackTransaction") &&
    subscriptionRepo.includes("PAYSTACK_CRYPTO_AUTOCOPY_PLAN_CODE") &&
    subscriptionRepo.includes("crypto_autocopy_plan_not_configured") &&
    subscriptionRepo.includes("Crypto AutoCopy Paystack plan code is not configured yet.") &&
    subscriptionRepo.includes("crypto_autocopy_payment_intents") &&
    subscriptionRepo.includes("crypto_autocopy_subscriptions/current") &&
    subscriptionRepo.includes("product: \"crypto_autocopy\"") &&
    subscriptionRepo.includes("status: \"payment_pending\"") &&
    subscriptionRepo.includes("status: \"active_paid\"") &&
    subscriptionRepo.includes("status: \"payment_failed\"") &&
    subscriptionRepo.includes("studentId}+crypto-autocopy@example.com"),
  "Crypto AutoCopy checkout must use a dedicated Paystack plan, local fixture email fallback, protected intents, and paid/pending/failed states."
);

assertIncludesAll(
  subscriptionRepo,
  [
    "function mapStatus(value: unknown): CryptoAutoCopyBillingStatus",
    "value === \"payment_pending\"",
    "value === \"payment_failed\"",
    "value === \"active_paid\"",
    "value === \"past_due\"",
    "value === \"cancelled\"",
    "value === \"expired\"",
    "entitled: status === \"active_paid\"",
    "active: status === \"active_paid\"",
    "Purchase Trade Copier before connecting Binance, Bybit, or MT4/MT5 for Copier setup.",
    "Trade Copier billing is cancelled. Setup and routing are locked.",
    "Renew Trade Copier before setup or routing can continue."
  ],
  "Only active_paid may unlock Crypto AutoCopy, and unpaid/cancelled/expired states must relock setup and routing."
);

assert(
  subscriptionRepo.includes("resolveStudentEntitlements") &&
    subscriptionRepo.includes("autoCopy.access !== \"allowed\"") &&
    subscriptionRepo.includes("entitlements.riskPosture !== \"personal_account\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"trial\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"past_due\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"cancelled\"") &&
    subscriptionRepo.includes("entitlements.subscriptionStatus === \"expired\""),
  "Crypto AutoCopy purchase must preserve Stage 16 entitlement, paid course subscription, and personal-account gates."
);

assert(
  executionRepo.includes("loadTradeCopierSubscriptionPreview") &&
    executionRepo.includes("cryptoAutoCopy: base.cryptoAutoCopy") &&
    executionRepo.includes("crypto_autocopy_subscription_required") &&
    validation.includes("needs_crypto_autocopy_payment") &&
    validation.includes("cryptoAutoCopy && !cryptoAutoCopy.billing.entitled"),
  "Student overview and mutation paths must require active paid unified Trade Copier billing before Binance/Bybit setup."
);

assertIncludesAll(
  executionRepo,
  [
    "function assertEligibleForConnection(base: StudentExecutionBase)",
    "if (!base.cryptoAutoCopy.billing.entitled)",
    "\"crypto_autocopy_subscription_required\"",
    "base.cryptoAutoCopy.billing.reason",
    "input.environment === \"production\"",
    "base.platformControl.sandboxOnly || base.workspaceControl.sandboxOnly",
    "\"production_exchange_keys_disabled\"",
    "Production exchange keys are disabled until TradeHub live execution beta is enabled."
  ],
  "Binance/Bybit setup must stay paid-gated and sandbox-only while platform/workspace sandbox controls are active."
);
assertBefore(
  executionRepo,
  "assertEligibleForConnection(base);",
  "const adapter = getExchangePermissionAdapter(input.exchange);",
  "Billing and entitlement checks must run before exchange permission verification."
);
assertBefore(
  executionRepo,
  "assertEligibleForConnection(base);",
  "storeExchangeCredential({",
  "Billing and entitlement checks must run before exchange credential storage."
);

assert(
  riskEngine.includes("crypto_autocopy_billing") &&
    riskEngine.includes("Paid Crypto AutoCopy add-on is active.") &&
    routing.includes("isTradeCopierBillingActive") &&
    routing.includes("cryptoAutoCopyBilling") &&
    liveSandbox.includes("isTradeCopierBillingActive") &&
    liveSandbox.includes("live_sandbox.order.failed") &&
    liveProduction.includes("isTradeCopierBillingActive") &&
    liveProduction.includes("Production worker blocked an intent because paid Crypto AutoCopy billing was missing or inactive.") &&
    liveProduction.includes("Production canary blocked an intent because paid Crypto AutoCopy billing was missing or inactive."),
  "Crypto paper, live sandbox, production, and canary routing must block students without active unified Trade Copier billing, including already-connected students."
);

assertIncludesAll(
  routing,
  [
    "isTradeCopierBillingActive(actor.workspaceId",
    "status: cryptoAutoCopyBillingStates[index].status",
    "entitled: cryptoAutoCopyBillingStates[index].active",
    "cryptoAutoCopyBilling: {",
    "active: cryptoAutoCopyBillingStates[index].active",
    "paperTradingOnly: true",
    "status: \"ready_for_paper\""
  ],
  "Influencer signal routing must create only paper intents and must use paid Crypto AutoCopy billing as a risk gate."
);

assertIncludesAll(
  validation,
  [
    "if (cryptoAutoCopy && !cryptoAutoCopy.billing.entitled)",
    "state: \"needs_crypto_autocopy_payment\"",
    "paperTradingOnly: true",
    "if (platformControl.sandboxOnly || workspaceControl.sandboxOnly)",
    "state: \"paper_ready\"",
    "Live execution cannot be marked ready until sandbox-only controls are disabled."
  ],
  "Student readiness must relock unpaid Crypto AutoCopy and remain paper-ready under sandbox-only controls."
);

assertIncludesAll(
  liveSandbox,
  [
    "rawEnvironment !== \"sandbox\"",
    "intent.environment !== \"sandbox\"",
    "const cryptoAutoCopyBilling = await isTradeCopierBillingActive(workspaceId, intent.studentId);",
    "if (!cryptoAutoCopyBilling.active)",
    "failureCode: \"crypto_autocopy_subscription_required\"",
    "Live sandbox worker blocked an intent because paid Crypto AutoCopy billing was missing or inactive.",
    "connection.environment !== \"sandbox\"",
    "environment: \"sandbox\""
  ],
  "Paid Crypto AutoCopy may unlock only live-sandbox/testnet exchange submission, and unpaid students must be blocked there too."
);

assertIncludesAll(
  liveProduction,
  [
    "productionOrdersEnabled: process.env.CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED === \"true\"",
    "productionDryRun: process.env.CRYPTO_EXECUTION_PRODUCTION_DRY_RUN !== \"false\"",
    "legacyLiveFlagIneffective: true",
    "const dryRun = env.productionDryRun || platformControl.dryRun || workspaceControl.dryRun || intent.gateSnapshot.dryRun;",
    "Production dry-run recorded a safe no-exchange-call attempt. No production exchange endpoint was called.",
    "Production exchange order submission remains fail-closed until KMS-backed credential loading is implemented.",
    "Production canary is closed until canary, beta, order-call, dry-run, and vault env gates all pass.",
    "Production canary skipped because platform/workspace live beta, order-call, dry-run, or kill-switch controls are not open.",
    "if (!cryptoAutoCopyBilling.active)",
    "Production worker blocked an intent because paid Crypto AutoCopy billing was missing or inactive.",
    "Production canary blocked an intent because paid Crypto AutoCopy billing was missing or inactive."
  ],
  "Production crypto execution must stay behind independent env, dry-run, vault, canary, and platform/workspace controls; paid billing alone must not enable it."
);
assertBefore(
  liveProduction,
  "if (!cryptoAutoCopyBilling.active)",
  "const dryRun = env.productionDryRun || platformControl.dryRun || workspaceControl.dryRun || intent.gateSnapshot.dryRun;",
  "Production worker must check billing before dry-run handling while still requiring separate production gates."
);
assertBefore(
  liveProduction,
  "if (dryRun) {",
  "Production exchange order submission remains fail-closed until KMS-backed credential loading is implemented.",
  "Regular production worker must record dry-run/no-exchange attempts before the fail-closed submission path."
);

assert(
  checkoutRoute.includes("requireStudent") &&
    checkoutRoute.includes("createStudentTradeCopierCheckout") &&
    verifyRoute.includes("requireStudent") &&
    verifyRoute.includes("verifyLegacyTradeCopierCheckout") &&
    verifyRoute.includes("\"crypto_autocopy\"") &&
    cancelRoute.includes("requireStudent") &&
    cancelRoute.includes("cancelStudentTradeCopierSubscription"),
  "Crypto AutoCopy compatibility subscription mutations must go through authenticated student API routes and the unified Trade Copier lifecycle."
);

assert(
  tradeCopierBilling.includes("TRADE_COPIER_PRODUCT_ID = \"trade_copier\"") &&
    tradeCopierBilling.includes("PAYSTACK_TRADE_COPIER_PLAN_CODE") &&
    tradeCopierBilling.includes("verifyLegacyTradeCopierCheckout") &&
    tradeCopierBilling.includes("crypto_autocopy_payment_intents") &&
    tradeCopierBilling.includes("crypto_autocopy_subscriptions/current") &&
    tradeCopierBilling.includes("product: TRADE_COPIER_PRODUCT_ID") &&
    tradeCopierBilling.includes("legacyGrandfathered"),
  "Stage 29I unified Trade Copier lifecycle preserves Crypto legacy callback/grandfather compatibility while using canonical trade_copier billing for new access."
);

assert(
  connectionRoute.includes("requireStudent") &&
    connectionRoute.includes("createStudentCryptoExecutionConnection") &&
    overviewRoute.includes("requireStudent") &&
    overviewRoute.includes("getStudentCopierOverview"),
  "Crypto exchange setup and overview must go through authenticated student API routes and the Stage 29I allowlisted Copier DTO."
);

assert(
  studentUi.includes("Trade Copier subscription") &&
    studentUi.includes("Purchase Trade Copier") &&
    studentUi.includes("Cancel Trade Copier") &&
    studentUi.includes("copierReference") &&
    studentUi.includes("cryptoReference") &&
    studentUi.includes("/api/student/copier/checkout") &&
    studentUi.includes("/api/student/copier/crypto/verify") &&
    studentUi.includes("/api/student/copier/cancel") &&
    !studentUi.includes("Purchase Crypto Copier") &&
    !studentUi.includes("Cancel Crypto Copier") &&
    studentUi.includes("StudentCopierOverviewResponse"),
  "Accepted Stage 29I Student UI must expose unified Trade Copier checkout/verify/cancel controls through the allowlisted Copier DTO."
);

assertIncludesAll(
  studentUi,
  [
    "/api/student/copier/crypto/connections",
    "connectionForm.apiKey",
    "connectionForm.apiSecret",
    "Trade Copier is purchased by the student separately",
    "not included in workspace Launch, Pro, or Enterprise packages",
    "Cancel Trade Copier"
  ],
  "Client UI must submit setup through allowlisted server APIs and keep Copier separate from workspace packages and Journal Sync."
);
assert(
  !studentUi.includes("getExchangeOrderPlacementAdapter") &&
    !studentUi.includes("placeBinanceOrder") &&
    !studentUi.includes("placeBybitOrder") &&
    !studentUi.includes("loadExchangeCredential(") &&
    !studentUi.includes("credentialRefPath") &&
    !studentUi.includes("paystackSecret") &&
    !studentUi.includes("rawProviderPayload"),
  "Browser/client code must not place exchange orders or expose vault refs, Paystack secrets, or raw provider payloads."
);

assertIncludesAll(
  mappers,
  [
    "export function toExchangeConnectionSummary",
    "delete safeConnection.credentialRefPath"
  ],
  "Returned exchange connection summaries must remove credential vault paths."
);
assert(
  types.includes("export type ExchangeConnectionSummary = Omit<") &&
    types.includes("\"credentialRefPath\"") &&
    !types.includes("apiSecret?:") &&
    !types.includes("apiKey?:"),
  "Public crypto execution response types must not include raw exchange API keys, secrets, or credential vault refs."
);
assertIncludesAll(
  credentialVault,
  [
    "import \"server-only\";",
    "type StoredSecretPayload = {",
    "apiKey: string;",
    "apiSecret: string;",
    "Local encrypted credential storage is disabled in production.",
    "Production credential vault is fail-closed until Google Cloud Secret Manager is configured and marked ready."
  ],
  "Exchange secrets must stay in server-only credential storage with production vault fail-closed behavior."
);

assert(
  rules.includes("crypto_autocopy_payment_intents") &&
    rules.includes("crypto_autocopy_subscriptions") &&
    rules.includes("crypto_autocopy_audit_events") &&
    rulesTest.includes("crypto_autocopy_payment_intents") &&
    rulesTest.includes("crypto_autocopy_subscriptions") &&
    rulesTest.includes("crypto_autocopy_audit_events"),
  "Firestore rules and rules tests must deny protected Crypto AutoCopy billing paths."
);

assertIncludesAll(
  rules,
  [
    "match /workspaces/{workspaceId}/students/{studentId}/exchange_connections/{connectionId} {",
    "allow read, write: if false;",
    "match /workspaces/{workspaceId}/students/{studentId}/crypto_autocopy_subscriptions/{documentId} {",
    "match /workspaces/{workspaceId}/students/{studentId}/execution_preferences/{documentId} {",
    "match /workspaces/{workspaceId}/students/{studentId}/auto_copy_preferences/{documentId} {"
  ],
  "Firestore rules must keep exchange connections, billing, and execution preferences server-only."
);

assert(
  indexes.includes("crypto_autocopy_payment_intents") &&
    indexes.includes("\"studentId\"") &&
    indexes.includes("\"updatedAt\""),
  "Student-filtered Crypto AutoCopy payment previews must declare the required bounded query index."
);

assert(
  envExample.includes("PAYSTACK_CRYPTO_AUTOCOPY_PLAN_CODE") &&
    envExample.includes("PAYSTACK_CRYPTO_AUTOCOPY_CHECKOUT_EMAIL") &&
    envExample.includes("CRYPTO_AUTOCOPY_PRICE_NGN") &&
    envExample.includes("PAYSTACK_TRADE_COPIER_PLAN_CODE") &&
    envExample.includes("TRADE_COPIER_PRICE_NGN"),
  ".env.example must document historical Crypto AutoCopy settings and canonical Trade Copier checkout settings."
);

assert(
  !subscriptionRepo.includes("placeOrder") &&
    !subscriptionRepo.includes("submitLive") &&
    !subscriptionRepo.includes("submitExchangeOrder") &&
    !subscriptionRepo.includes("apiSecret:") &&
    !subscriptionRepo.includes("brokerPassword:"),
  "Stage 15T must not add exchange order placement, API-secret exposure, or broker credential handling."
);

console.log("Stage 15T Crypto AutoCopy paid sandbox unlock lifecycle QA passed.");
