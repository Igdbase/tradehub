import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const listFiles = (relativeDir) => fs.readdirSync(path.join(root, relativeDir), { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(relativeDir, entry.name);

  if (entry.isDirectory()) return listFiles(entryPath);
  return entryPath;
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};
const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

const packageJson = JSON.parse(read("package.json"));
const copierClient = read("src/components/student-app/student-copier-client.tsx");
const copierPage = read("src/app/(student)/app/copier/page.tsx");
const copierTypes = read("src/types/student-copier.ts");
const copierDto = read("src/lib/student-copier/student-copier-dto.ts");
const copierBilling = read("src/lib/student-copier/student-copier-billing.ts");
const copierOverviewRoute = read("src/app/api/student/copier/route.ts");
const tradeCopierCheckoutRoute = read("src/app/api/student/copier/checkout/route.ts");
const tradeCopierVerifyRoute = read("src/app/api/student/copier/verify/route.ts");
const tradeCopierCancelRoute = read("src/app/api/student/copier/cancel/route.ts");
const paystackClient = read("src/lib/paystack/paystack-client.ts");
const paystackWebhookRoute = read("src/app/api/paystack/webhook/route.ts");
const paystackCancellationWorkerRoute = read("src/app/api/admin/copier/paystack-cancellation-worker/run/route.ts");
const cryptoCheckoutRoute = read("src/app/api/student/copier/crypto/checkout/route.ts");
const forexCheckoutRoute = read("src/app/api/student/copier/forex/checkout/route.ts");
const cryptoVerifyRoute = read("src/app/api/student/copier/crypto/verify/route.ts");
const forexVerifyRoute = read("src/app/api/student/copier/forex/verify/route.ts");
const routeBundle = [
  copierOverviewRoute,
  tradeCopierCheckoutRoute,
  tradeCopierVerifyRoute,
  tradeCopierCancelRoute,
  cryptoCheckoutRoute,
  forexCheckoutRoute,
  cryptoVerifyRoute,
  forexVerifyRoute,
  read("src/app/api/student/copier/crypto/cancel/route.ts"),
  read("src/app/api/student/copier/forex/cancel/route.ts"),
  read("src/app/api/student/copier/crypto/connections/route.ts"),
  read("src/app/api/student/copier/crypto/connections/[actionRef]/refresh/route.ts"),
  read("src/app/api/student/copier/crypto/connections/[actionRef]/disable/route.ts"),
  read("src/app/api/student/copier/crypto/preferences/route.ts"),
  read("src/app/api/student/copier/preferences/route.ts"),
  read("src/app/api/student/copier/forex/provisioning/route.ts"),
  read("src/app/api/student/copier/forex/provisioning/disable/route.ts")
].join("\n");
const legacyStudentExecutionRoutePaths = [
  ...listFiles("src/app/api/student/crypto-execution"),
  ...listFiles("src/app/api/student/forex-execution")
].filter((routePath) => routePath.endsWith("route.ts")).sort();
const legacyRouteBundle = legacyStudentExecutionRoutePaths.map(read).join("\n");
const browser = read("tests/browser/student-e2e.spec.mjs");
const browserHelpers = read("tests/browser/helpers/student-flows.mjs");
const docs = [
  "plan.md",
  "complaint-resolution-roadmap.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md"
].map(read).join("\n");

assert(
  packageJson.scripts?.["stage29i:qa"] === "node scripts/qa-stage29i-copier-purchase-setup-experience.mjs",
  "package.json exposes npm run stage29i:qa."
);
assert(
  packageJson.scripts?.["stage29i:repository:qa"] === "node scripts/qa-stage29i-trade-copier-billing-repository.mjs",
  "package.json exposes npm run stage29i:repository:qa for emulator-backed Trade Copier billing lifecycle coverage."
);

includesAll(
  copierPage,
  ["Student Trade Copier purchase and Crypto or Forex account setup.", "StudentCopierClient"],
  "Student Copier route metadata is product-focused and uses the rebuilt client."
);

includesAll(
  copierClient,
  [
    "student-copier-workspace",
    "copier-purchase-panel",
    "copier-unpaid-empty-state",
    "copier-crypto-setup-panel",
    "copier-forex-setup-panel",
    "copier-crypto-connection-card",
    "copier-crypto-risk-card",
    "copier-forex-broker-card",
    "copier-${form.market}-controls-card",
    "Crypto Setup",
    "Forex Setup",
    "Trade Copier is purchased by the student separately",
    "not included in workspace Launch, Pro, or Enterprise packages",
    "One Trade Copier payment unlocks both Crypto Setup and Forex Setup",
    "Purchase Trade Copier",
    "Cancel Trade Copier",
    "Purchase Trade Copier before connecting Binance or Bybit",
    "Purchase Trade Copier before submitting MT4/MT5 setup",
    "Verify connection",
    "Save risk limits",
    "Pause Crypto Copier",
    "Resume Crypto Copier",
    "MT4",
    "MT5",
    "Submit broker setup",
    "Disable Forex setup",
    "Save {marketLabel} controls",
    "I understand copying trades can lose money"
  ],
  "Copier client exposes one purchase area plus segmented Crypto/Forex setup with student-facing actions."
);

includesAll(
  copierClient,
  [
    "/api/student/copier",
    "/api/student/copier/checkout",
    "/api/student/copier/verify",
    "/api/student/copier/cancel",
    "/api/student/copier/crypto/verify",
    "/api/student/copier/forex/verify",
    "/api/student/copier/crypto/connections",
    "/api/student/copier/crypto/preferences",
    "/api/student/copier/preferences",
    "/api/student/copier/forex/provisioning",
    "/api/student/copier/forex/provisioning/disable"
  ],
  "Copier client uses the unified allowlisted protected Copier APIs for checkout/cancel plus setup-specific callback, connection, consent, risk, pause, and disable actions."
);

excludesAll(
  copierClient,
  [
    "Crypto Copier and Forex Copier are separate products",
    "Buy only the coverage you need",
    "Purchase Crypto Copier",
    "Purchase Forex Copier",
    "Cancel Crypto Copier",
    "Cancel Forex Copier",
    "/api/student/copier/crypto/checkout",
    "/api/student/copier/forex/checkout",
    "/api/student/copier/crypto/cancel",
    "/api/student/copier/forex/cancel"
  ],
  "Student Copier client cannot reintroduce split-product purchase buttons, duplicate cancellation controls, or market-specific purchase requests."
);

excludesAll(
  copierClient,
  [
    "StudentCryptoExecutionOverviewResponse",
    "StudentCryptoAutoCopyCheckoutResponse",
    "StudentForexAutoCopyCheckoutResponse",
    "/api/student/crypto-execution/overview",
    "/api/student/crypto-execution/subscription/checkout",
    "/api/student/forex-execution/subscription/checkout",
    "/api/student/crypto-execution/subscription/verify",
    "/api/student/forex-execution/subscription/verify",
    "/api/student/crypto-execution/connections",
    "/api/student/crypto-execution/preferences",
    "/api/student/crypto-execution/auto-copy/preferences",
    "/api/student/forex-execution/provisioning"
  ],
  "Student Copier client does not consume the broad execution overview or old execution endpoints directly."
);

includesAll(
  copierTypes,
  [
    "StudentCopierOverviewResponse",
    "StudentCopierCheckoutStartResponse",
    "StudentCopierMutationResponse",
    "StudentCopierConnectionSummary",
    "actionRef",
    "eligibility",
    "subscription",
    "setup",
    "consentStatus",
    "risk"
  ],
  "Dedicated student Copier DTO exposes only eligibility, subscription, setup, consent, risk, connection, and user-safe status fields."
);

assert(
  copierTypes.includes("subscription: StudentCopierProductSummary;") &&
    !copierTypes.includes("crypto: {\n      subscription") &&
    !copierTypes.includes("forex: {\n      subscription"),
  "Student Copier DTO uses one authoritative top-level subscription and no per-market purchase lifecycle."
);

excludesAll(
  copierTypes,
  [
    "studentId",
    "workspaceId",
    "tierId",
    "connectionId",
    "fingerprint",
    "credential",
    "idempotency",
    "killSwitch",
    "providerPayload",
    "vault",
    "audit",
    "canary",
    "worker",
    "paymentIntentId",
    "accessCode",
    "amountNgn",
    "currency",
    "referenceRef",
    "latestReference"
  ],
  "Student Copier DTO does not define forbidden internal identifiers, payment metadata, execution controls, or credential fields."
);

includesAll(
  copierDto,
  [
    "mapStudentCopierOverview",
    "getStudentCopierOverview",
    "resolveStudentCopierConnectionActionRef",
    "createHmac(\"sha256\"",
    "makeConnectionActionRef",
    "unifiedTradeCopierSubscription",
    "productReason",
    "setupDescription",
    "setupStatusLabel",
    "Purchase Trade Copier once to unlock both Crypto Setup and Forex Setup.",
    "Setup received",
    "Ready for review",
    "Connected",
    "Needs attention",
    "Disabled",
    "Unavailable"
  ],
  "Server mapper converts broad execution state into a closed student-safe Copier vocabulary and opaque connection action refs."
);

includesAll(
  copierBilling,
  [
    "TRADE_COPIER_PRODUCT_ID = \"trade_copier\"",
    "createStudentTradeCopierCheckout",
    "verifyStudentTradeCopierCheckout",
    "verifyLegacyTradeCopierCheckout",
    "cancelStudentTradeCopierSubscription",
    "resolveTradeCopierBillingAccess",
    "isTradeCopierBillingActive",
    "loadTradeCopierSubscriptionPreview",
    "processTradeCopierPaystackWebhook",
    "processStudentTradeCopierPaystackCancellationRetry",
    "runTradeCopierPaystackCancellationRetryWorker",
    "materializeLegacyGrandfatherIfNeeded",
    "PAYSTACK_TRADE_COPIER_PLAN_CODE",
    "TRADE_COPIER_PRICE_NGN",
    "trade_copier_payment_intents",
    "trade_copier_subscriptions/current",
    "trade_copier_cleanup_tasks",
    "product: TRADE_COPIER_PRODUCT_ID",
    "legacyGrandfathered",
    "crypto_autocopy_subscriptions/current",
    "forex_autocopy_subscriptions/current",
    "trade_copier_already_active",
    "cancellation_pending",
    "needs_attention",
    "paystackSubscriptionCode",
    "paystackEmailToken",
    "disableSubscription",
    "lifecycleRevision",
    "operationToken",
    "latestPaymentIntentId",
    "support_review",
    "retry_scheduled",
    "non_renewing",
    "PAYSTACK_CANCELLATION_RETRY_BATCH_LIMIT",
    "leaseOwnerToken",
    "leaseExpiresAt",
    "cleanupLeaseExpired",
    "skipImmediateCancellationRetry",
    "Trade Copier Paystack subscription cancellation is queued for leased provider confirmation."
  ],
  "Canonical Trade Copier billing model owns checkout, verification, provider cancellation, webhook routing, lifecycle tokens, legacy grandfathering, leased retry cleanup, and non-renewing state."
);

const cancellationFunction = copierBilling.slice(
  copierBilling.indexOf("export async function cancelStudentTradeCopierSubscription"),
  copierBilling.length
);

assert(
  !/export async function cancelStudentTradeCopierSubscription[\s\S]*status: "in_progress"/.test(cancellationFunction),
  "Initial Trade Copier cancellation never writes an unleased in-progress Paystack task."
);

includesAll(
  cancellationFunction,
  [
    "status: \"retry_scheduled\"",
    "processStudentTradeCopierPaystackCancellationRetry",
    "!resolved.skipImmediateCancellationRetry",
    "currentStatus === \"non_renewing\"",
    "existingTaskStatus === \"blocked\"",
    "existingTaskStatus === \"final_failed\"",
    "existingTaskStatus === \"resolved\"",
    "existingTaskStatus === \"in_progress\"",
    "finalSubscriptionSnapshot",
    "finalPaystackTaskSnapshot",
    "providerCancellation"
  ],
  "Initial Trade Copier cancellation schedules recoverable due work, preserves repeated cancellation state, and audits the final reloaded result."
);

assert(
  !/after: \{ status: cancellation\.needsProvider \?/.test(cancellationFunction),
  "Trade Copier cancellation audit cannot derive final status only from the pre-provider needsProvider flag."
);

assert(
  !/cancelStudentTradeCopierSubscription[\s\S]*?assertCanBuyTradeCopier/.test(copierBilling),
  "Trade Copier cancellation is separate from purchase eligibility and cannot call the purchase-eligibility assertion."
);

assert(
  !/verifyStudentTradeCopierCheckout[\s\S]{0,420}assertCanBuyTradeCopier/.test(copierBilling),
  "Trade Copier verification can reconcile in-flight payment truth without requiring current purchase eligibility."
);

includesAll(
  paystackClient,
  [
    "PaystackDisableSubscriptionPayload",
    "PaystackDisableSubscriptionResult",
    "disablePaystackSubscription",
    "\"/subscription/disable\"",
    "method: \"POST\"",
    "code",
    "token"
  ],
  "Paystack client exposes a server-only disable-subscription adapter using Paystack's official disable endpoint shape."
);

includesAll(
  paystackWebhookRoute,
  [
    "processTradeCopierPaystackWebhook",
    "if (tradeCopierReceipt.handled)",
    "processPaystackWebhook(payload)"
  ],
  "Paystack webhook route product-routes Trade Copier events before falling back to the course/package subscription handler."
);

assert(
  paystackWebhookRoute.indexOf("processTradeCopierPaystackWebhook") < paystackWebhookRoute.indexOf("processPaystackWebhook(payload)"),
  "Trade Copier webhook isolation runs before the main course/package Paystack webhook updater."
);

excludesAll(
  copierBilling,
  [
    "createStudentCryptoAutoCopyCheckout(",
    "verifyStudentCryptoAutoCopyCheckout(",
    "cancelStudentCryptoAutoCopySubscription(",
    "createStudentForexAutoCopyCheckout(",
    "verifyStudentForexAutoCopyCheckout(",
    "cancelStudentForexAutoCopySubscription("
  ],
  "Canonical Trade Copier billing does not delegate unified lifecycle operations to legacy Crypto or Forex subscription repositories."
);

includesAll(
  read("scripts/qa-stage29i-trade-copier-billing-repository.mjs"),
  [
    "createStudentTradeCopierCheckout",
    "verifyStudentTradeCopierCheckout",
    "verifyLegacyTradeCopierCheckout",
    "cancelStudentTradeCopierSubscription",
    "resolveTradeCopierBillingAccess",
    "fake.initialized[0].metadata.product === \"trade_copier\"",
    "fake.initialized[0].plan === \"PLN_stage29i_trade_copier\"",
    "payment_pending",
    "active_paid",
    "trade_copier_already_active",
    "payment_verification_mismatch",
    "payment_product_mismatch",
    "Canonical cancelled status overrides stale active legacy records.",
    "Concurrent checkout attempts create one successful lifecycle",
    "Cleanup failure leaves a retryable support-safe task"
    ,
    "Provider cancellation failure keeps Trade Copier inactive in needs_attention state.",
    "Unified cancellation calls the Paystack disable-subscription adapter with server-stored renewal details.",
    "Initial cancellation schedules recoverable due work instead of an unleased in-progress task.",
    "Simulated interruption after cancellation scheduling makes no direct Paystack call.",
    "Cancellation retry worker recovers the initial interruption window and finalizes cancellation.",
  "Repeated Cancel treats non_renewing with pending provider-disable work as the existing cancellation operation.",
  "Repeated Cancel preserves retry_scheduled operation token, attempt count, and due time.",
  "Repeated Cancel does not reset an existing legacy cleanup task unnecessarily.",
  "Repeated Cancel preserves in-progress operation token, attempt count, due time, and lease.",
  "Repeated Cancel preserves final_failed support state and bounded attempt count.",
    "Repeated Cancel cannot reset matching blocked provider-disable work.",
    "Repeated Cancel reconciles matching resolved provider-disable work to canonical cancelled status.",
    "A genuinely new Paystack target after repurchase gets a new bounded cancellation operation.",
    "Immediate successful cancellation audits the actual cancelled/resolved result.",
    "Provider cancellation failure audits the actual needs_attention/retry_scheduled result.",
    "Future-scheduled tasks cannot starve older due Paystack cancellation work.",
    "Not-yet-due Paystack tasks do not occupy the due retry batch.",
    "Missing Paystack subscription code/token does not report cancellation complete.",
    "Repeated cancellation request does not reset Paystack retry attempt counts.",
    "Cancellation remains authorized for an owned Trade Copier subscription after purchase eligibility is lost.",
    "Verified payment after eligibility loss is reconciled truthfully without claiming setup availability.",
    "Concurrent cancellation retry workers produce at most one Paystack disable call.",
    "Abandoned Paystack cancellation retry leases are recovered safely.",
    "Maximum retry attempts are bounded and do not call Paystack again.",
    "Cancellation retry never targets a newer active Paystack subscription.",
    "Late successful verification after cancellation is recorded for support review without unlocking.",
    "Repeated verification after cancellation returns a truthful support-review state instead of setup availability.",
    "Late checkout initialization completion cannot overwrite cancellation.",
    "Stale successful callback from an older checkout cannot activate over a newer checkout.",
    "Recurring Trade Copier charge.success is routed by subscription code even with a new transaction reference.",
    "Recurring Trade Copier renewal updates the paid period from subscription identity, not the original checkout intent.",
    "Recurring renewal without next_payment_date or period_end is recorded for review, not falsely processed.",
    "Renewal without an authoritative period end preserves the existing paid period instead of using paid_at or created_at.",
    "Recurring renewal fails closed when the stored Trade Copier plan identity is missing.",
    "[\"wrong plan\", { plan: { plan_code: \"PLN_wrong\" } }]",
    "[\"wrong amount\", { amount: 999 }]",
    "[\"wrong product\", { metadata: { product: \"course\" } }]",
    "is safely recorded without activating billing.",
    "Valid recurring renewal can restore a past-due Trade Copier subscription.",
    "subscription.not_renew records non-renewing state instead of falsely expiring the paid period.",
    "subscription.not_renew preserves awaiting-disable cleanup work until provider disable is confirmed.",
    "Matching subscription.disable webhook resolves the exact pending Paystack cancellation task.",
    "Trade Copier charge webhook does not modify the course/package subscription.",
    "Trade Copier invoice failure never marks course/package access past due.",
    "Course/package webhook cannot affect Trade Copier billing.",
    "Stale Trade Copier webhook receipt is handled without falsely reporting a processed lifecycle transition.",
    "Out-of-order stale Trade Copier webhook cannot overwrite a newer lifecycle state.",
    "Unproven Paystack product events remain safely unhandled by Trade Copier."
  ],
  "Stage 29I repository QA covers canonical checkout, verification, replay, mismatches, provider cancellation, retry, stale callback races, webhook isolation, legacy grandfathering, cancellation cleanup failure, and concurrent checkout attempts."
);

includesAll(
  paystackCancellationWorkerRoute,
  [
    "requireSuperAdmin",
    "runTradeCopierPaystackCancellationRetryWorker",
    "return apiJson(response)"
  ],
  "Trade Copier Paystack cancellation retry worker has a real Super Admin-owned invocation route."
);

includesAll(
  copierBilling,
  [
    ".collectionGroup(\"trade_copier_cleanup_tasks\")",
    ".where(\"action\", \"==\", \"paystack_disable_subscription\")",
    ".where(\"status\", \"==\", \"retry_scheduled\")",
    ".where(\"nextAttemptAt\", \"<=\", now)",
    ".orderBy(\"nextAttemptAt\", \"asc\")",
    ".where(\"status\", \"==\", \"in_progress\")",
    ".where(\"leaseExpiresAt\", \"<=\", now)",
    "safeString(task.leaseOwnerToken) !== ownerToken",
    "cleanupLeaseExpired(task, now)",
    "resolved.paystack.disableSubscription(claimed.target)"
  ],
  "Cancellation retry worker queries due tasks deterministically, recovers abandoned leases, and calls Paystack only after owning a valid lease."
);

includesAll(
  copierBilling,
  [
    "paystackPlanCodeFromPayloadData",
    "paystackRenewalPeriodEnd",
    "applyTradeCopierRenewalWebhook",
    "findCanonicalSubscriptionByPaystackCode(subscriptionCode)",
    "receipt.event === \"charge.success\" && subscriptionCode",
    "receipt.event === \"subscription.not_renew\"",
    "? \"non_renewing\"",
    "currentStatus === \"cancelled\"",
    "lateRenewalNeedsReview",
    "renewalNeedsReview",
    "missing_authoritative_period_end",
    "receipt.processed = processed"
  ],
  "Paystack renewal and non-renewing lifecycle handling is subscription-code routed, ordered, and truthful."
);

excludesAll(
  copierBilling,
  [
    "safeString(data.paid_at) ||\n    safeString(data.created_at)",
    "addMonths(fallbackNow, 1)",
    "receipt.processed = true;\n    receipt.processedAt = nowIso(resolved.now());"
  ],
  "Trade Copier webhooks cannot invent renewal periods from paid_at/created_at or report processed=true after no-op transitions."
);

excludesAll(
  copierBilling,
  [
    "status: \"cancelled\" as TradeCopierBillingStatus,\n      billingState: \"cancelled\",\n      rail,\n      previousStatus: currentStatus,\n      safeMessage: \"Trade Copier subscription was cancelled",
    "processPaystackWebhook(payload)"
  ],
  "Trade Copier cancellation cannot be only a local Firestore status change and Trade Copier billing does not delegate webhooks to the course/package updater."
);

includesAll(
  routeBundle,
  [
    "requireStudent",
    "getStudentCopierOverview",
    "mapStudentCopierOverview",
    "StudentCopierCheckoutStartResponse",
    "authorizationUrl: response.checkout.authorizationUrl",
    "resolveStudentCopierConnectionActionRef"
  ],
  "Dedicated student Copier routes require student auth and map overview, checkout, connection, preference, verify, and disable responses through the allowlisted DTO."
);

excludesAll(
  `${tradeCopierCheckoutRoute}\n${cryptoCheckoutRoute}\n${forexCheckoutRoute}`,
  [
    "paymentIntentId:",
    "reference:",
    "accessCode:",
    "amountNgn:",
    "currency:"
  ],
  "Student Copier checkout wrapper returns only ok and authorizationUrl."
);

includesAll(
  `${tradeCopierCheckoutRoute}\n${tradeCopierVerifyRoute}\n${tradeCopierCancelRoute}`,
  [
    "createStudentTradeCopierCheckout",
    "verifyStudentTradeCopierCheckout",
    "cancelStudentTradeCopierSubscription"
  ],
  "Canonical Trade Copier checkout, verification, and cancellation routes exist under the student Copier route family."
);

assert(
  !copierOverviewRoute.includes("getStudentCopier(actor)") &&
    !routeBundle.includes("return apiJson(await getStudentCryptoExecutionOverview(actor))"),
  "Student Copier routes do not return the legacy broad Copier/status or crypto execution overview directly."
);

includesAll(
  legacyStudentExecutionRoutePaths.join("\n"),
  [
    "src/app/api/student/crypto-execution/overview/route.ts",
    "src/app/api/student/crypto-execution/connections/[connectionId]/disable/route.ts",
    "src/app/api/student/crypto-execution/connections/[connectionId]/refresh/route.ts",
    "src/app/api/student/forex-execution/connections/[connectionId]/disable/route.ts",
    "src/app/api/student/forex-execution/connections/[connectionId]/refresh/route.ts",
    "src/app/api/student/forex-execution/live-canary/connections/route.ts"
  ],
  "Stage 29I QA inventories the legacy crypto-execution and forex-execution student route trees."
);

excludesAll(
  legacyRouteBundle,
  [
    "StudentCryptoExecutionOverviewResponse",
    "StudentCryptoAutoCopyCheckoutResponse",
    "StudentForexAutoCopyCheckoutResponse",
    "StudentCryptoAutoCopyVerifyResponse",
    "StudentForexAutoCopyVerifyResponse",
    "return apiJson(await getStudentCryptoExecutionOverview(actor))",
    "return apiJson(response, { status: 201 });"
  ],
  "Legacy student execution routes no longer return broad execution overview, verify, or full checkout objects."
);

includesAll(
  read("src/app/api/student/crypto-execution/overview/route.ts"),
  ["requireStudent", "getStudentCopierOverview", "return apiJson(response)"],
  "Legacy crypto overview compatibility route returns the allowlisted student Copier DTO."
);

for (const checkoutRoute of [
  "src/app/api/student/crypto-execution/subscription/checkout/route.ts",
  "src/app/api/student/forex-execution/subscription/checkout/route.ts"
]) {
  const source = read(checkoutRoute);
  includesAll(
    source,
    ["StudentCopierCheckoutStartResponse", "authorizationUrl: response.checkout.authorizationUrl"],
    `${checkoutRoute} returns only the minimal checkout start payload.`
  );
  excludesAll(
    source,
    ["paymentIntentId:", "reference:", "accessCode:", "amountNgn:", "currency:"],
    `${checkoutRoute} does not return browser-visible payment metadata.`
  );
}

for (const compatibilityRoute of [
  "src/app/api/student/crypto-execution/subscription/verify/route.ts",
  "src/app/api/student/crypto-execution/subscription/cancel/route.ts",
  "src/app/api/student/crypto-execution/connections/route.ts",
  "src/app/api/student/crypto-execution/preferences/route.ts",
  "src/app/api/student/crypto-execution/auto-copy/preferences/route.ts",
  "src/app/api/student/forex-execution/subscription/verify/route.ts",
  "src/app/api/student/forex-execution/subscription/cancel/route.ts",
  "src/app/api/student/forex-execution/provisioning/route.ts",
  "src/app/api/student/forex-execution/provisioning/disable/route.ts"
]) {
  const source = read(compatibilityRoute);
  assert(
    source.includes("getStudentCopierOverview") || source.includes("mapStudentCopierOverview"),
    `${compatibilityRoute} maps compatibility responses through the allowlisted student Copier DTO.`
  );
}

for (const retiredRoute of [
  "src/app/api/student/crypto-execution/connections/[connectionId]/disable/route.ts",
  "src/app/api/student/crypto-execution/connections/[connectionId]/refresh/route.ts",
  "src/app/api/student/crypto-execution/live-production/consent/route.ts",
  "src/app/api/student/crypto-execution/live-production/pause/route.ts",
  "src/app/api/student/crypto-execution/live-production/resume/route.ts",
  "src/app/api/student/crypto-execution/live-production/revoke/route.ts",
  "src/app/api/student/forex-execution/connections/route.ts",
  "src/app/api/student/forex-execution/connections/[connectionId]/disable/route.ts",
  "src/app/api/student/forex-execution/connections/[connectionId]/refresh/route.ts",
  "src/app/api/student/forex-execution/live-canary/connections/route.ts"
]) {
  const source = read(retiredRoute);
  includesAll(
    source,
    ["legacyStudentCopierRouteRetired", "return await legacyStudentCopierRouteRetired(request)"],
    `${retiredRoute} is an authenticated safe 410 rather than a raw student mutation bypass.`
  );
  excludesAll(
    source,
    [
      "disableStudentCryptoExecutionConnection",
      "refreshStudentCryptoExecutionConnection",
      "updateStudentLiveProductionConsent",
      "createStudentForexConnection",
      "refreshStudentForexConnection",
      "disableStudentForexConnection",
      "AdminApiError("
    ],
    `${retiredRoute} no longer calls raw connection/live/canary mutation helpers or leaks operational error copy.`
  );
}

includesAll(
  read("src/lib/student-copier/legacy-copier-routes.ts"),
  ["requireStudent", "legacy_copier_route_retired", "{ status: 410 }"],
  "Retired legacy Copier routes authenticate students before returning a safe 410 response."
);

includesAll(
  copierDto,
  [
    "STUDENT_COPIER_ACTION_REF_SECRET",
    "NODE_ENV === \"production\"",
    "MIN_PRODUCTION_ACTION_SECRET_LENGTH",
    "copier_action_secret_unavailable",
    "Copier connection actions are temporarily unavailable."
  ],
  "Opaque Copier action refs fail closed in production unless STUDENT_COPIER_ACTION_REF_SECRET is configured strongly."
);

includesAll(
  read(".env.example"),
  ["STUDENT_COPIER_ACTION_REF_SECRET="],
  ".env.example documents STUDENT_COPIER_ACTION_REF_SECRET without a real value."
);

excludesAll(
  copierClient,
  [
    "StudentBroadLiveAutoCopyStatusCard",
    "LiveProductionExecutionPreviewCard",
    "LiveSandboxExecutionPreviewCard",
    "PaperExecutionPreview",
    "ForexDemoExecutionPreviewCard",
    "ForexPaperExecutionPreviewCard",
    "Production Beta",
    "production beta",
    "canary",
    "vault",
    "preflight",
    "worker",
    "source-QA",
    "provider payload",
    "raw id",
    "keyFingerprint",
    "paymentIntents.map",
    "referenceRef",
    "Stage 16",
    "/api/student/journal",
    "Journal Sync",
    "Read-only crypto history",
    "₦",
    "NGN"
  ],
  "Student Copier UI does not render internal ops panels, Journal Sync coupling, raw refs, public prices, or stage language."
);

includesAll(
  browserHelpers,
  [
    "clearCopierBrowserFixtures",
    "installCopierBrowserEligibility",
    "installCryptoCopierBrowserEntitlement",
    "installCryptoCopierBrowserConnection",
    "installForexCopierBrowserEntitlement",
    "installPendingTradeCopierBrowserPayment",
    "installOperationalForexCopierBrowserState",
    "crypto_autocopy_subscriptions/current",
    "forex_autocopy_subscriptions/current",
    "autoCopyEligible: false",
    "autoCopyEligible: true",
    "features: [\"course\", \"signalAlerts\", \"autoCopy\", \"journal\", \"calculators\"]"
  ],
  "Browser fixtures can deterministically clear and install unpaid, pending, legacy Crypto-entitled, legacy Forex-entitled, connection, and operational Forex Copier states."
);

includesAll(
  browser,
  [
    "Copier purchase and setup stays student-focused and separate from Journal Sync",
    "clearCopierBrowserFixtures",
    "clearCryptoJournalSyncFixtures",
    "installCryptoCopierBrowserEntitlement",
    "installCryptoCopierBrowserConnection",
    "installForexCopierBrowserEntitlement",
    "installPendingTradeCopierBrowserPayment",
    "installOperationalForexCopierBrowserState",
    "expectStudentCopierResponseSafe",
    "checkoutProbeResponse = await page.request.post",
    "checkoutProbePayload = await checkoutProbeResponse.json();",
    "/api/student/copier/checkout",
    "/api/student/copier/cancel",
    "authorizationUrl: expect.stringMatching(/\\/app\\/copier\\?copierReference=thtc_/)",
    "page.waitForURL(/copierReference=thtc_/)",
    "await expect(page.locator(\"body\")).toContainText(/Trade Copier payment verified/i)",
    "/api/student/copier/crypto/preferences",
    "/api/student/copier/preferences",
    "/api/student/copier/crypto/connections/",
    "/api/student/crypto-execution/overview",
    "/api/student/crypto-execution/connections/stage29i_browser_binance/disable",
    "/api/student/copier/forex/provisioning/disable",
    "Disable connection",
    "Disable Forex setup",
    "Resume Crypto Copier",
    "Cancel Trade Copier",
    "wrong-role users cannot open or call student Copier surfaces",
    "workspace persona must receive the shared wrong-role denial",
    "different account type|wrong role",
    "/api/student/copier",
    "copier-purchase-panel",
    "copier-unpaid-empty-state",
    "copier-crypto-setup-panel",
    "copier-forex-setup-panel",
    "copier-crypto-connection-card",
    "copier-forex-broker-card",
    "requestedUrls.some((url) => url.includes(\"/api/student/journal/crypto-sync\"))",
    "requestedUrls.some((url) => url.includes(\"/api/student/journal/connected-trades\"))",
    "not.toContainText(forbiddenCopierTerms)",
    "not.toContainText(/₦|NGN|Launch price|Pro price|Enterprise price/i)",
    "scrollWidth - document.documentElement.clientWidth",
    "width: 1180",
    "width: 820",
    "width: 390"
  ],
  "Browser QA covers unpaid purchase CTA, minimal checkout response, mutation/reload flows, connection/Forex disablement, response privacy, setup switching, Journal Sync independence, forbidden terms, prices, and responsive widths."
);

excludesAll(
  browser,
  [
    "/api/student/copier/crypto/checkout",
    "/api/student/copier/forex/checkout",
    "page.route(\"**/api/student/copier/verify",
    "Purchase Crypto Copier",
    "Purchase Forex Copier",
    "separate products"
  ],
  "Browser QA cannot use split checkout endpoints, split purchase buttons, separate-product expectations, or fabricated verification route fulfillment."
);

includesAll(
  docs,
  [
    "Stage 29G",
    "owner-deferred",
    "Google Cloud Secret Manager",
    "approved provider accounts",
    "source-QA ready",
    "not owner/provider accepted",
    "Stage 29H",
    "unstarted",
    "externally deferred",
    "Stage 29I",
    "Copier Purchase and Account Setup Experience",
    "TH-2026-09-06-STAGE29I-COPIER-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
    "owner-accepted",
    "closed",
    "frozen",
    "Stage 29J",
    "implemented/source-QA ready for adviser review"
  ],
  "Authoritative docs record Stage 29G external acceptance deferral, Stage 29H deferral, Stage 29I handoff, and Stage 29J source-QA-ready status."
);

includesAll(
  docs,
  [
    "Trade Copier is a separate paid student add-on",
    "not included in Launch, Pro, or Enterprise packages",
    "Crypto Setup",
    "Forex Setup",
    "Journal Sync remains separate from Copier",
    "no live execution"
  ],
  "Docs capture the Stage 29I student-facing product and security boundaries."
);

excludesAll(
  docs,
  [
    "Stage 29G is owner/provider accepted",
    "Stage 29G: owner/provider accepted",
    "Stage 29G owner-accepted",
    "Stage 29G closed and frozen",
    "Stage 29H implemented",
    "Stage 29J owner-accepted"
  ],
  "Docs do not overstate Stage 29G, Stage 29H, or Stage 29J owner status."
);

console.log("Stage 29I Copier purchase and account setup QA passed.");
