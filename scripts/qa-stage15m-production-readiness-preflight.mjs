import fs from "node:fs";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const production = read("src/lib/crypto-execution/crypto-live-production.ts");
const exchangeTypes = read("src/lib/crypto-execution/exchanges/types.ts");
const orderPlacement = read("src/lib/crypto-execution/exchanges/order-placement.ts");
const binance = read("src/lib/crypto-execution/exchanges/binance-adapter.ts");
const bybit = read("src/lib/crypto-execution/exchanges/bybit-adapter.ts");
const cryptoTypes = read("src/types/crypto-execution.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const signalUi = read("src/components/workspace/signal-management-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const productionPreview = read("src/components/crypto-execution/live-production-execution-preview.tsx");
const dashboardValidation = read("src/lib/workspace/dashboard-validation.ts");
const packageJson = JSON.parse(read("package.json"));

check(
  "stage15m script registered",
  packageJson.scripts?.["stage15m:qa"] === "node scripts/qa-stage15m-production-readiness-preflight.mjs",
  "package.json must expose npm run stage15m:qa."
);
check(
  "balance precheck types exist",
  exchangeTypes.includes("ExchangeBalancePrecheckStatus") &&
    exchangeTypes.includes("ExchangeBalancePrecheckInput") &&
    exchangeTypes.includes("ExchangeBalancePrecheckResult"),
  "Balance precheck must have a normalized support-safe exchange abstraction."
);
check(
  "balance adapter exports are server-only",
  orderPlacement.includes('import "server-only"') &&
    orderPlacement.includes("getExchangeBalancePrecheckAdapter") &&
    orderPlacement.includes("checkBinanceBalance") &&
    orderPlacement.includes("checkBybitBalance"),
  "Balance adapters must stay behind the server-only order-placement boundary."
);
check(
  "binance balance endpoint is signed account check",
  binance.includes("checkBinanceBalance") &&
    binance.includes("/api/v3/account") &&
    binance.includes("omitZeroBalances") &&
    binance.includes("binance_balance_insufficient"),
  "Binance balance precheck must use the signed account endpoint and fail closed on insufficient balance."
);
check(
  "bybit wallet balance endpoint is signed",
  bybit.includes("checkBybitBalance") &&
    bybit.includes("/v5/account/wallet-balance") &&
    bybit.includes("accountType") &&
    bybit.includes("bybit_balance_insufficient"),
  "Bybit balance precheck must use the V5 wallet balance endpoint and fail closed on insufficient balance."
);
check(
  "canary checks balance before order placement",
  production.indexOf("getExchangeBalancePrecheckAdapter") > -1 &&
    production.indexOf("const balancePrecheck = await getExchangeBalancePrecheckAdapter") > -1 &&
    production.indexOf("const balancePrecheck = await getExchangeBalancePrecheckAdapter") < production.indexOf("const placement = getExchangeOrderPlacementAdapter") &&
    production.includes("live_production.canary.balance_blocked"),
  "Production canary must block on balance precheck before reaching the exchange order adapter."
);
check(
  "production preflight preview exists",
  cryptoTypes.includes("LiveProductionPreflightCheck") &&
    cryptoTypes.includes("LiveProductionBalancePrecheckSummary") &&
    cryptoTypes.includes("preflightChecks") &&
    cryptoTypes.includes("balancePrecheck") &&
    production.includes("buildProductionPreflight"),
  "Production previews must carry support-safe server-derived preflight checks."
);
check(
  "student production risk UX is explicit",
  studentUi.includes("Why production is gated") &&
    studentUi.includes("TradeHub still requires vault readiness") &&
    studentUi.includes("TradeHub does not custody"),
  "Student copier must explain consent, custody, and production gates without implying live trading is active."
);
check(
  "influencer publish review exists",
  signalUi.includes("Publish review") &&
    signalUi.includes("expectedRoutingMode") &&
    signalUi.includes("Eligible sample") &&
    signalUi.includes("forex paper simulation") &&
    signalUi.includes("No broker, MetaAPI, demo, or live forex order is called"),
  "Influencer signal form must show a mature pre-publish routing review."
);
check(
  "server directional and market validation remain",
  dashboardValidation.includes("normalizeSignalPairForMarket") &&
    dashboardValidation.includes("For buy signals, take profit must be above entry and stop loss below entry.") &&
    dashboardValidation.includes("For sell signals, take profit must be below entry and stop loss above entry."),
  "Server validation must still reject invalid market/pair and directional levels."
);
check(
  "admin preflight is visible",
  adminUi.includes("Production readiness preflight") &&
    adminUi.includes("No credentials, vault refs, raw balances, or full exchange order IDs are returned."),
  "Super Admin must see the production readiness checklist as support-safe ops data."
);
check(
  "production preview avoids raw balance exposure",
  productionPreview.includes("Balance precheck") &&
    !productionPreview.includes("walletBalance") &&
    !productionPreview.includes("free balance") &&
    !productionPreview.includes("rawBalance"),
  "UI previews may show precheck status, but not raw balances."
);
check(
  "production canary still requires explicit gates",
  production.includes("RUN_LIVE_CANARY") &&
    production.includes("env.productionCanaryEnabled") &&
    production.includes("env.productionDryRun === false") &&
    production.includes("env.productionVaultReady") &&
    production.includes("productionOrdersEnabled"),
  "Stage 15M must not broaden the 15L canary gate."
);
check(
  "client surfaces do not import order placement",
  !studentUi.includes("getExchangeOrderPlacementAdapter") &&
    !signalUi.includes("getExchangeOrderPlacementAdapter") &&
    !adminUi.includes("getExchangeOrderPlacementAdapter"),
  "Browser/client components must not import exchange order placement."
);
check(
  "default user surfaces scrub prompt fixture wording",
  !studentUi.includes("Stage 15F") &&
    !studentUi.includes("Stage 15H") &&
    !studentUi.includes("fixture") &&
    !signalUi.includes("Stage 15F") &&
    !signalUi.includes("Stage 15H") &&
    !signalUi.includes("fixture"),
  "Student and influencer default surfaces must not show prompt or fixture wording."
);

const failed = checks.filter((entry) => !entry.ok);

for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
