import fs from "node:fs";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const vault = read("src/lib/crypto-execution/credential-vault.ts");
const production = read("src/lib/crypto-execution/crypto-live-production.ts");
const exchangeTypes = read("src/lib/crypto-execution/exchanges/types.ts");
const binance = read("src/lib/crypto-execution/exchanges/binance-adapter.ts");
const bybit = read("src/lib/crypto-execution/exchanges/bybit-adapter.ts");
const adminPanel = read("src/components/admin/crypto-execution-ops-panel.tsx");
const canaryRoute = read("src/app/api/admin/crypto-execution/live-production/canary/run/route.ts");
const envExample = read(".env.example");
const packageJson = JSON.parse(read("package.json"));

check(
  "secret-manager dependency installed",
  Boolean(packageJson.dependencies?.["@google-cloud/secret-manager"]),
  "Google Cloud Secret Manager client must be available for the production vault adapter."
);
check(
  "cloud secret manager vault mode supported",
  vault.includes("cloud_secret_manager") && vault.includes("SecretManagerServiceClient") && vault.includes("accessSecretVersion"),
  "Production credential storage must use Secret Manager, not local encrypted storage."
);
check(
  "production vault fail-closed readiness",
  vault.includes("CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY") && vault.includes("crypto_production_vault_unavailable"),
  "Production credential load/store must fail closed when the vault is not explicitly ready."
);
check(
  "canary env gate exists",
  production.includes("CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED") && envExample.includes("CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=false"),
  "Real production order calls require the canary env gate."
);
check(
  "typed canary confirmation required",
  production.includes("RUN_LIVE_CANARY") && canaryRoute.includes("runLiveProductionCanaryWorker") && adminPanel.includes("RUN_LIVE_CANARY"),
  "Super Admin canary path must require typed confirmation."
);
check(
  "canary limit is one",
  production.includes(".limit(1)") && production.includes("candidateLimit: 1"),
  "Production canary worker must only process one candidate."
);
check(
  "canary buy-only gate",
  production.includes("production_canary_sell_deferred") && production.includes('intent.side !== "buy"'),
  "Stage 15L canary must block SELL signals."
);
check(
  "canary tiny cap",
  production.includes("CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT") && production.includes("PRODUCTION_CANARY_DEFAULT_MAX_USDT = 5"),
  "Stage 15L canary must default to a max 5 USDT notional."
);
check(
  "production adapter requires explicit canary flag",
  exchangeTypes.includes("productionCanary?: boolean") &&
    binance.includes("production_rejected_without_canary") &&
    bybit.includes("production_rejected_without_canary"),
  "Production exchange endpoints must reject calls unless the canary worker passes the explicit flag."
);
check(
  "dry-run worker remains separate",
  production.includes("runLiveProductionExecutionWorker") &&
    production.includes("Production dry-run recorded a safe no-exchange-call attempt") &&
    adminPanel.includes("Run production dry-run") &&
    adminPanel.includes("Run production canary"),
  "The production dry-run control must not silently become the canary order control."
);
check(
  "no live flag shortcut",
  !production.includes("CRYPTO_EXECUTION_LIVE_ENABLED"),
  "CRYPTO_EXECUTION_LIVE_ENABLED must remain ineffective for production order calls."
);

const failed = checks.filter((entry) => !entry.ok);

for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
