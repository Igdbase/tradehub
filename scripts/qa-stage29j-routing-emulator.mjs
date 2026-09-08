import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import ts from "typescript";

const root = process.cwd();
const projectId = process.env.FIREBASE_PROJECT_ID || "trade-hub-4d8df";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= projectId;
process.env.GCLOUD_PROJECT ||= projectId;
process.env.CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED = "true";
process.env.CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED = "true";
process.env.CRYPTO_EXECUTION_PRODUCTION_DRY_RUN = "false";
process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED = "true";
process.env.CRYPTO_EXECUTION_PRODUCTION_MAX_ORDER_USDT = "5";
process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT = "5";
process.env.FOREX_LIVE_CANARY_SETUP_ENABLED = "true";
process.env.FOREX_LIVE_CANARY_ENABLED = "true";
process.env.FOREX_LIVE_ORDER_CALLS_ENABLED = "true";
process.env.FOREX_LIVE_DRY_RUN = "false";
process.env.FOREX_LIVE_MAX_NOTIONAL_USD = "5";
process.env.FOREX_LIVE_MAX_DAILY_NOTIONAL_USD = "25";
process.env.FOREX_LIVE_MAX_VOLUME = "0.01";

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
const safeNow = () => new Date().toISOString();
const providerCalls = {
  cryptoBalance: 0,
  cryptoOrders: 0,
  forexOrders: 0
};
const ledgerProjectionFailures = {
  remainingWrites: 0
};
const ledgerProjectionWriteControl = {
  sequence: 0,
  pauseAfterSuccessSequences: new Set(),
  pauseAndFailSequences: new Set(),
  enteredResolvers: new Map(),
  releaseResolvers: new Map(),
  enteredPromises: new Map(),
  releasePromises: new Map()
};

function resetLedgerProjectionWriteControl() {
  ledgerProjectionWriteControl.sequence = 0;
  ledgerProjectionWriteControl.pauseAfterSuccessSequences.clear();
  ledgerProjectionWriteControl.pauseAndFailSequences.clear();
  ledgerProjectionWriteControl.enteredResolvers.clear();
  ledgerProjectionWriteControl.releaseResolvers.clear();
  ledgerProjectionWriteControl.enteredPromises.clear();
  ledgerProjectionWriteControl.releasePromises.clear();
}

function prepareLedgerProjectionWriteGate(sequence, mode) {
  if (mode === "after_success") {
    ledgerProjectionWriteControl.pauseAfterSuccessSequences.add(sequence);
  } else {
    ledgerProjectionWriteControl.pauseAndFailSequences.add(sequence);
  }

  ledgerProjectionWriteControl.enteredPromises.set(sequence, new Promise((resolve) => {
    ledgerProjectionWriteControl.enteredResolvers.set(sequence, resolve);
  }));
  ledgerProjectionWriteControl.releasePromises.set(sequence, new Promise((resolve) => {
    ledgerProjectionWriteControl.releaseResolvers.set(sequence, resolve);
  }));
}

async function waitForLedgerProjectionWriteGate(sequence) {
  await ledgerProjectionWriteControl.enteredPromises.get(sequence);
}

function releaseLedgerProjectionWriteGate(sequence) {
  const release = ledgerProjectionWriteControl.releaseResolvers.get(sequence);
  if (release) release();
}

const moduleCache = new Map();
function loadTsModule(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
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
    if (specifier === "crypto") return crypto;
    if (specifier === "node:crypto") return crypto;
    if (specifier === "firebase-admin/firestore") return { FieldPath };
    if (specifier === "@/lib/firebase/admin") return { getFirebaseAdminClients: () => ({ db }) };
    if (specifier === "@/lib/firebase/admin-errors") return { AdminApiError };
    if (specifier === "@/lib/billing/billing-mappers") {
      return {
        recordFromSnapshot,
        mapSubscriptionRecord: (record) => ({
          status: record?.status === "inactive" ? "inactive" : "active"
        })
      };
    }
    if (specifier === "@/lib/entitlements/student-entitlements") {
      return {
        resolveStudentEntitlements: ({ studentRecord }) => {
          const personal = studentRecord?.riskPosture !== "funded_or_prop" && studentRecord?.accountMode !== "prop_firm";
          const allowed = studentRecord?.autoCopyEligible !== false && personal;

          return {
            tierId: "stage29j_tier",
            tierLabel: "Stage 29J",
            subscriptionStatus: "active",
            subscriptionActive: true,
            riskPosture: personal ? "personal_account" : "funded_or_prop",
            features: {
              signals: { access: "included" },
              autoCopy: { access: allowed ? "allowed" : "blocked", reason: allowed ? "Allowed" : "Auto-Copy unavailable." }
            }
          };
        }
      };
    }
    if (specifier === "@/lib/student-copier/student-copier-billing") {
      return { isTradeCopierBillingActive: tradeCopierBilling };
    }
    if (specifier === "@/lib/crypto-execution/forex-provisioning-repository") {
      return {
        getForexAutoCopyBillingState: async (workspaceId, studentId) => {
          const billing = await tradeCopierBilling(workspaceId, studentId);
          return { entitled: billing.active, status: billing.status, reason: billing.reason };
        }
      };
    }
    if (specifier === "@/lib/crypto-execution/auto-copy-preferences") {
      return {
        defaultCrossAssetAutoCopyPreferences: ({ workspaceId, studentId, market }) =>
          autoCopyPreferences({ workspaceId, studentId, market, record: null }),
        mapCrossAssetAutoCopyPreferencesRecord: autoCopyPreferences,
        evaluateStaleSignalPolicy: ({ signal, preferences }) => {
          const source = Date.parse(signal.publishedAt ?? signal.updatedAt ?? "");
          const maxMinutes = Number(preferences?.maxSignalAgeMinutes ?? 90);
          if (Number.isFinite(source) && Date.now() - source > maxMinutes * 60_000) {
            return { outcome: "blocked", safeMessage: "Signal is too old for live routing." };
          }
          return { outcome: "route_normally", safeMessage: "Signal freshness is inside the configured window." };
        }
      };
    }
    if (specifier === "@/lib/crypto-execution/credential-vault") {
      return {
        getCredentialStorageReadiness: () => ({
          productionVaultReady: true,
          safeMessage: "Deterministic Stage 29J credential storage is ready."
        }),
        loadExchangeCredential: async () => ({ apiKey: "stage29j_api_key", apiSecret: "stage29j_api_secret" }),
        loadForexMetaApiToken: async () => ({
          environment: "production",
          metaApiToken: "stage29j_metaapi_token",
          metaApiAccountId: "stage29j_metaapi_account"
        })
      };
    }
    if (specifier === "@/lib/crypto-execution/exchanges/order-placement") {
      return {
        getExchangeBalancePrecheckAdapter: () => async () => {
          providerCalls.cryptoBalance += 1;
          return {
            ok: true,
            status: "sufficient",
            checkedAsset: "USDT",
            checkedAt: safeNow(),
            safeMessage: "Deterministic balance precheck passed."
          };
        },
        getExchangeOrderPlacementAdapter: () => async (payload) => {
          providerCalls.cryptoOrders += 1;
          return {
            ok: true,
            status: "filled",
            exchangeOrderId: `stage29j_crypto_${providerCalls.cryptoOrders}`,
            exchangeClientOrderId: payload.clientOrderId,
            safeMessage: "Deterministic crypto production canary filled."
          };
        },
        getExchangeOrderCancelAdapter: () => async () => ({ ok: true, status: "cancelled", safeMessage: "not used" }),
        getExchangeOrderStatusAdapter: () => async () => ({ ok: true, status: "filled", safeMessage: "not used" })
      };
    }
    if (specifier === "@/lib/crypto-execution/forex") {
      return {
        getForexLiveCanaryOrderPlacementAdapter: () => ({
          submitOrder: async (payload) => {
            providerCalls.forexOrders += 1;
            return {
              ok: true,
              status: "filled",
              providerOrderId: `stage29j_forex_${providerCalls.forexOrders}`,
              providerOrderRef: `fx...${providerCalls.forexOrders}`,
              providerHttpStatus: 200,
              canonicalSymbol: payload.symbol,
              providerSymbol: payload.symbol,
              safeMessage: "Deterministic forex live canary filled."
            };
          }
        })
      };
    }
    if (specifier === "@/lib/crypto-execution/crypto-execution-mappers") {
      return {
        normalizeIsoDate,
        recordFromSnapshot,
        mapExchangeConnectionRecord: (record, ids) => ({
          connectionId: ids.connectionId,
          workspaceId: ids.workspaceId,
          studentId: ids.studentId,
          exchange: record.exchange === "bybit" ? "bybit" : "binance",
          environment: record.environment === "production" ? "production" : "testnet",
          status: record.status === "verified" ? "verified" : "pending",
          permissionVerification: record.permissionVerification === "passed" ? "passed" : "pending",
          withdrawalPermission: record.withdrawalPermission === "confirmed_disabled" ? "confirmed_disabled" : "unknown",
          lastVerifiedAt: normalizeIsoDate(record.lastVerifiedAt),
          updatedAt: normalizeIsoDate(record.updatedAt)
        }),
        toExchangeConnectionSummary: (record) => record
      };
    }
    if (specifier === "@/lib/workspace/dashboard-mappers") {
      return {
        recordFromSnapshot,
        mapWorkspaceForDashboard: (record, workspaceId) => ({
          workspaceId,
          name: typeof record?.name === "string" ? record.name : "Stage 29J Workspace"
        }),
        mapSignalRecord: mapSignalRecordForQa
      };
    }
    if (specifier === "@/lib/workspace/signal-symbols") {
      return {
        canonicalSignalPair: (value) => String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 24),
        normalizeSignalPairForMarket: (value, market) => {
          const normalized = String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 24);
          if (!normalized) return null;
          if (market === "crypto") return normalized.endsWith("USDT") ? normalized : null;
          return /^(EURUSD|XAUUSD|GBPUSD|USDJPY)$/.test(normalized) ? normalized : null;
        }
      };
    }
    if (specifier === "@/lib/journal/provider-execution-identity") {
      return loadTsModule("src/lib/journal/provider-execution-identity.ts");
    }
    if (specifier === "@/lib/signals/tradehub-signal-source-guards") {
      return loadTsModule("src/lib/signals/tradehub-signal-source-guards.ts");
    }
    if (specifier === "@/lib/signals/external-signal-ingestion-contract") {
      return loadTsModule("src/lib/signals/external-signal-ingestion-contract.ts");
    }
    if (specifier === "@/lib/journal/account-linked-performance-ledger") {
      const realLedger = loadTsModule("src/lib/journal/account-linked-performance-ledger.ts");
      return {
        ...realLedger,
        writeAccountLinkedLedgerEntry: async (...args) => {
          const sequence = ledgerProjectionWriteControl.sequence + 1;
          ledgerProjectionWriteControl.sequence = sequence;
          const entered = ledgerProjectionWriteControl.enteredResolvers.get(sequence);
          const release = ledgerProjectionWriteControl.releasePromises.get(sequence);

          if (ledgerProjectionWriteControl.pauseAndFailSequences.has(sequence)) {
            if (entered) entered();
            if (release) await release;
            throw new Error("stage29j_injected_ledger_projection_failure");
          }

          if (!ledgerProjectionWriteControl.pauseAfterSuccessSequences.has(sequence) && ledgerProjectionFailures.remainingWrites > 0) {
            ledgerProjectionFailures.remainingWrites -= 1;
            throw new Error("stage29j_injected_ledger_projection_failure");
          }

          const result = await realLedger.writeAccountLinkedLedgerEntry(...args);

          if (ledgerProjectionWriteControl.pauseAfterSuccessSequences.has(sequence)) {
            if (entered) entered();
            if (release) await release;
          }

          return result;
        }
      };
    }
    if (specifier === "@/lib/student-app/student-app-mappers") {
      return {
        recordFromSnapshot,
        mapWorkspaceForStudent: (record, workspaceId) => ({ workspaceId, name: record.name || "Stage 29J QA Workspace" }),
        mapStudentProfile: () => ({
          signalAccess: true,
          signalAccessReason: "Signals are available for this test student."
        })
      };
    }
    if (specifier === "@/lib/practice/practice-instrument-specs") {
      return {
        getPracticeInstrumentSpec: (assetClass, symbol) => ({ symbol, assetClass }),
        practiceNotionalForInstrument: (_instrument, price, size) => Number(price) * Number(size)
      };
    }
    throw new Error(`Unexpected require in Stage 29J routing QA: ${specifier}`);
  };
  const runner = new Function(
    "require",
    "exports",
    "module",
    "console",
    "Buffer",
    "Date",
    "URL",
    "Request",
    "process",
    `${compiled}\n//# sourceURL=${relativePath}`
  );
  runner(localRequire, exports, module, console, Buffer, Date, URL, Request, process);
  moduleCache.set(relativePath, module.exports);
  return module.exports;
}

function normalizeIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : safeNow();
}

function recordFromSnapshot(snapshot, idField = "id") {
  return { ...(snapshot.data() ?? {}), [idField]: snapshot.id };
}

function normalizeSignalSource(value) {
  if (value === undefined || value === null || value === "") return "legacy_in_app";
  if (value === "in_app") return "in_app";
  if (value === "telegram_channel" || value === "webhook_source" || value === "master_trader_feed" || value === "external_preview") return value;
  return "unknown";
}

function normalizeSignalStatus(value) {
  return value === "draft" || value === "published" || value === "cancelled" ? value : "unknown";
}

function mapSignalRecordForQa(record, workspaceId) {
  return {
    signalId: String(record.signalId || ""),
    workspaceId: String(record.workspaceId || workspaceId),
    source: normalizeSignalSource(record.source),
    status: normalizeSignalStatus(record.status),
    lifecycle: record.lifecycle === "closed" ? "closed" : record.lifecycle === "open" ? "open" : undefined,
    market: record.market === "forex" ? "forex" : "crypto",
    pair: String(record.pair || ""),
    direction: record.direction === "sell" ? "sell" : "buy",
    entry: String(record.entry || ""),
    stopLoss: String(record.stopLoss || ""),
    takeProfit: String(record.takeProfit || ""),
    riskLabel: record.riskLabel === "low" || record.riskLabel === "high" ? record.riskLabel : "medium",
    deliveryMode: "alerts_only",
    createdAt: String(record.createdAt || safeNow()),
    updatedAt: String(record.updatedAt || record.createdAt || safeNow()),
    publishedAt: record.publishedAt ? String(record.publishedAt) : undefined
  };
}

function autoCopyPreferences({ workspaceId, studentId, market, record }) {
  return {
    workspaceId,
    studentId,
    market,
    executionMode: record?.executionMode === "full_auto" ? "full_auto" : "alerts_only",
    consentStatus: record?.consentStatus === "accepted" ? "accepted" : "not_started",
    studentPaused: record?.studentPaused === true,
    killSwitchEnabled: record?.killSwitchEnabled === true,
    allowedSymbols: Array.isArray(record?.allowedSymbols) ? record.allowedSymbols.map(String) : [],
    allowedPairs: Array.isArray(record?.allowedPairs) ? record.allowedPairs.map(String) : [],
    maxFixedNotional: Number(record?.maxFixedNotional ?? 5),
    maxSignalAgeMinutes: Number(record?.maxSignalAgeMinutes ?? 90),
    updatedAt: normalizeIsoDate(record?.updatedAt)
  };
}

async function tradeCopierBilling(workspaceId, studentId) {
  const snapshot = await db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_subscriptions/current`).get();
  const active = snapshot.exists && snapshot.data()?.status === "active";
  return {
    active,
    entitled: active,
    status: active ? "active" : "inactive",
    reason: active ? "Trade Copier subscription is active." : "Trade Copier subscription is required."
  };
}

async function deleteCollection(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) return;
  let batch = db.batch();
  let writes = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    writes += 1;
    if (writes === 450) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }
  if (writes > 0) await batch.commit();
}

async function cleanupWorkspace(workspaceId, studentId = "stage29j_student") {
  await Promise.all([
    deleteCollection(`workspaces/${workspaceId}/signals`),
    deleteCollection(`workspaces/${workspaceId}/live_gate_decisions`),
    deleteCollection(`workspaces/${workspaceId}/live_execution_intents`),
    deleteCollection(`workspaces/${workspaceId}/live_order_attempts`),
    deleteCollection(`workspaces/${workspaceId}/forex_live_canary_gate_decisions`),
    deleteCollection(`workspaces/${workspaceId}/forex_live_canary_intents`),
    deleteCollection(`workspaces/${workspaceId}/forex_live_canary_order_attempts`),
    deleteCollection(`workspaces/${workspaceId}/students/${studentId}/account_linked_trade_ledger`)
  ]);
}

async function seedWorkspaceStudent(workspaceId, studentId, options = {}) {
  const now = safeNow();
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Stage 29J Routing Workspace", updatedAt: now }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({
    studentId,
    status: "active",
    autoCopyEligible: options.autoCopyEligible !== false,
    riskPosture: options.riskPosture ?? "personal_account",
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}/subscriptions/current`).set({ status: "active", updatedAt: now }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}/trade_copier_subscriptions/current`).set({
    status: options.tradeCopierActive === false ? "inactive" : "active",
    updatedAt: now
  }, { merge: true });
}

async function seedCryptoReady(workspaceId, studentId, options = {}) {
  const now = safeNow();
  const platformKill = options.platformKillSwitch === true;
  const workspaceKill = options.workspaceKillSwitch === true;
  const studentPaused = options.studentPaused === true;
  const consentAccepted = options.missingConsent !== true;
  const connected = options.disconnected !== true;
  await db.doc("platform_live_execution_controls/current").set({
    productionBetaEnabled: !platformKill,
    productionOrdersEnabled: !platformKill,
    productionDryRun: false,
    killSwitchEnabled: platformKill,
    allowedExchanges: ["binance"],
    allowedSymbols: ["BTCUSDT"],
    maxOrderUsdt: 5,
    maxDailyNotionalUsdt: 25,
    maxOpenOrdersPerStudent: 1,
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/live_execution_controls/current`).set({
    productionBetaEnabled: !workspaceKill,
    productionOrdersEnabled: !workspaceKill,
    productionDryRun: false,
    killSwitchEnabled: workspaceKill,
    allowedExchanges: ["binance"],
    allowedSymbols: ["BTCUSDT"],
    maxOrderUsdt: 5,
    maxDailyNotionalUsdt: 25,
    maxOpenOrdersPerStudent: 1,
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/live_allowlists/production_students`).set({ studentIds: [studentId] }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/live_allowlists/production_exchanges`).set({ exchanges: ["binance"] }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/live_allowlists/production_symbols`).set({ symbols: ["BTCUSDT"] }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}/live_consents/current`).set({
    productionStatus: consentAccepted ? "accepted" : "not_started",
    personalExchangeConfirmed: consentAccepted,
    notFundedOrPropFirmConfirmed: consentAccepted,
    withdrawalsDisabledConfirmed: consentAccepted,
    productionLiveLossRiskConfirmed: consentAccepted,
    tradeHubNoCustodyConfirmed: consentAccepted,
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}/live_execution_preferences/current`).set({
    studentPaused,
    fixedNotionalUsdt: 5,
    maxDailyNotionalUsdt: 25,
    maxOpenOrders: 1,
    allowedSymbols: ["BTCUSDT"],
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/crypto`).set({
    executionMode: "full_auto",
    consentStatus: "accepted",
    studentPaused,
    killSwitchEnabled: options.studentKillSwitch === true,
    allowedSymbols: ["BTCUSDT"],
    maxSignalAgeMinutes: options.stale ? 0 : 90,
    maxFixedNotional: 5,
    updatedAt: now
  }, { merge: true });
  if (connected) {
    await db.doc(`workspaces/${workspaceId}/students/${studentId}/exchange_connections/crypto_conn`).set({
      exchange: "binance",
      environment: "production",
      status: "verified",
      permissionVerification: "passed",
      withdrawalPermission: "confirmed_disabled",
      lastVerifiedAt: now,
      updatedAt: now
    }, { merge: true });
  }
}

async function seedForexReady(workspaceId, studentId, options = {}) {
  const now = safeNow();
  const platformKill = options.platformKillSwitch === true;
  const workspaceKill = options.workspaceKillSwitch === true;
  const studentPaused = options.studentPaused === true;
  const connected = options.disconnected !== true;
  await db.doc("platform_forex_live_canary_controls/current").set({
    productionConnectionSetupEnabled: true,
    canaryEnabled: !platformKill,
    orderCallsEnabled: !platformKill,
    dryRun: false,
    killSwitchEnabled: platformKill,
    allowedWorkspaceIds: [workspaceId],
    allowedStudentIds: [studentId],
    allowedPairs: ["EURUSD"],
    accountAllowlist: [{ accountFingerprint: "forex_account_safe", noWithdrawalCapabilityConfirmed: true }],
    maxNotionalUsd: 5,
    maxDailyNotionalUsd: 25,
    maxVolume: 0.01,
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/forex_live_canary_controls/current`).set({
    productionConnectionSetupEnabled: true,
    canaryEnabled: !workspaceKill,
    orderCallsEnabled: !workspaceKill,
    dryRun: false,
    killSwitchEnabled: workspaceKill,
    allowedWorkspaceIds: [workspaceId],
    allowedStudentIds: [studentId],
    allowedPairs: ["EURUSD"],
    accountAllowlist: [{ accountFingerprint: "forex_account_safe", noWithdrawalCapabilityConfirmed: true }],
    maxNotionalUsd: 5,
    maxDailyNotionalUsd: 25,
    maxVolume: 0.01,
    updatedAt: now
  }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/forex`).set({
    executionMode: "full_auto",
    consentStatus: options.missingConsent ? "not_started" : "accepted",
    studentPaused,
    killSwitchEnabled: options.studentKillSwitch === true,
    allowedPairs: ["EURUSD"],
    maxFixedNotional: 5,
    maxSignalAgeMinutes: options.stale ? 0 : 90,
    updatedAt: now
  }, { merge: true });
  if (connected) {
    await db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_connections/forex_conn`).set({
      provider: "metaapi",
      environment: "production",
      status: "verified",
      readinessStatus: "paper_only_ready",
      tokenVaultStatus: "encrypted_reference_ready",
      providerAccountFingerprint: "forex_account_safe",
      platform: "mt5",
      updatedAt: now
    }, { merge: true });
  }
}

async function seedSignal(workspaceId, signalId, overrides = {}) {
  const now = safeNow();
  const signal = {
    signalId,
    workspaceId,
    source: "in_app",
    status: "published",
    market: "crypto",
    pair: "BTCUSDT",
    direction: "buy",
    entry: "68420",
    stopLoss: "67800",
    takeProfit: "70000",
    riskLabel: "medium",
    lifecycle: "open",
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    ...overrides
  };
  await db.doc(`workspaces/${workspaceId}/signals/${signalId}`).set(signal, { merge: true });
  return mapSignalRecordForQa(signal, workspaceId);
}

async function countDocs(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  return snapshot.docs.length;
}

async function countReadyIntents(workspaceId, collection, status) {
  const snapshot = await db.collection(`workspaces/${workspaceId}/${collection}`).where("status", "==", status).get();
  return snapshot.docs.length;
}

async function ledgerRecords(workspaceId, studentId) {
  const snapshot = await db.collection(`workspaces/${workspaceId}/students/${studentId}/account_linked_trade_ledger`).get();
  return snapshot.docs.map((doc) => ({ ledgerEntryId: doc.id, ...doc.data() }));
}

async function assertBlockedNoExecution(workspaceId, studentId, countersBefore, label) {
  const ledger = await ledgerRecords(workspaceId, studentId);
  assert(ledger.length === 0, `${label} wrote no provider-confirmed canonical ledger.`);
  assert(await countDocs(`workspaces/${workspaceId}/live_order_attempts`) === 0, `${label} wrote no crypto provider attempt.`);
  assert(await countDocs(`workspaces/${workspaceId}/forex_live_canary_order_attempts`) === 0, `${label} wrote no forex provider attempt.`);
  assert(providerCalls.cryptoBalance === countersBefore.cryptoBalance, `${label} made no crypto balance/provider precheck.`);
  assert(providerCalls.cryptoOrders === countersBefore.cryptoOrders, `${label} made no crypto provider request.`);
  assert(providerCalls.forexOrders === countersBefore.forexOrders, `${label} made no forex provider request.`);
}

async function collectionRecords(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function assertPostRoutingRaceBlocked({ workspaceId, studentId, market, countersBefore, label }) {
  const ledger = await ledgerRecords(workspaceId, studentId);
  assert(ledger.length === 0, `${label} leaves no canonical ledger after the post-routing race.`);
  assert(providerCalls.cryptoBalance === countersBefore.cryptoBalance, `${label} makes no crypto balance/provider precheck after the post-routing race.`);
  assert(providerCalls.cryptoOrders === countersBefore.cryptoOrders, `${label} makes no crypto provider order request after the post-routing race.`);
  assert(providerCalls.forexOrders === countersBefore.forexOrders, `${label} makes no Forex provider order request after the post-routing race.`);
  const attempts = await collectionRecords(
    market === "crypto"
      ? `workspaces/${workspaceId}/live_order_attempts`
      : `workspaces/${workspaceId}/forex_live_canary_order_attempts`
  );
  assert(attempts.length === 1, `${label} records one safe terminal attempt after the post-routing race.`);
  assert(String(attempts[0].status).includes("failed"), `${label} terminates the claimed intent safely instead of submitting.`);
  assert(attempts[0].ledgerProjectionStatus === "not_applicable", `${label} does not create provider-confirmed ledger projection work.`);
}

async function assertWorkspaceMismatchRejected({ workspaceId, signalWorkspaceId, signal, route, label }) {
  const countersBefore = { ...providerCalls };
  const result = await route({ actor: { uid: "stage29j_other_workspace", workspaceId }, signal });
  assert(result.routed === false && result.workspaceId === workspaceId, `${label} rejects actor/signal workspace mismatch at the production routing export.`);
  assert(await countDocs(`workspaces/${workspaceId}/live_execution_intents`) === 0, `${label} writes no cross-workspace crypto intent.`);
  assert(await countDocs(`workspaces/${workspaceId}/forex_live_canary_intents`) === 0, `${label} writes no cross-workspace Forex intent.`);
  assert(await countDocs(`workspaces/${signalWorkspaceId}/live_execution_intents`) === 0, `${label} writes no signal-workspace crypto intent from the wrong actor.`);
  assert(await countDocs(`workspaces/${signalWorkspaceId}/forex_live_canary_intents`) === 0, `${label} writes no signal-workspace Forex intent from the wrong actor.`);
  assert(providerCalls.cryptoOrders === countersBefore.cryptoOrders && providerCalls.forexOrders === countersBefore.forexOrders, `${label} makes no provider call on workspace mismatch.`);
}

function cryptoProjectionAttempt(workspaceId, studentId, suffix, overrides = {}) {
  const now = safeNow();
  return {
    orderAttemptId: `stage29j_crypto_projection_${suffix}`,
    workspaceId,
    intentId: `stage29j_crypto_projection_intent_${suffix}`,
    signalId: `stage29j_crypto_projection_signal_${suffix}`,
    studentId,
    connectionId: `stage29j_crypto_projection_connection_${suffix}`,
    exchange: "binance",
    environment: "production",
    executionMode: "live",
    symbol: "BTCUSDT",
    side: "buy",
    orderType: "market",
    status: "filled_live",
    idempotencyKey: `stage29j_crypto_projection_${suffix}`,
    exchangeClientOrderId: `stage29j_crypto_projection_client_${suffix}`,
    exchangeOrderId: `stage29j_crypto_projection_order_${suffix}`,
    providerExecutionIdentity: `stage29j_provider_identity_crypto_${suffix}`,
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionAttempts: 0,
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
    ledgerProjectionLeaseOwner: "",
    ledgerProjectionLeaseExpiresAt: "",
    productionCanaryOnly: true,
    updatedAt: now,
    ...overrides
  };
}

function forexProjectionAttempt(workspaceId, studentId, suffix, overrides = {}) {
  const now = safeNow();
  return {
    attemptId: `stage29j_forex_projection_${suffix}`,
    workspaceId,
    intentId: `stage29j_forex_projection_intent_${suffix}`,
    signalId: `stage29j_forex_projection_signal_${suffix}`,
    studentId,
    connectionId: `stage29j_forex_projection_connection_${suffix}`,
    provider: "metaapi",
    environment: "production",
    executionMode: "forex_live_canary",
    pair: "EURUSD",
    side: "buy",
    orderType: "market",
    status: "filled_live_forex_canary",
    volume: 0.01,
    requestedNotionalUsd: 5,
    idempotencyKey: `stage29j_forex_projection_${suffix}`,
    providerClientOrderId: `stage29j_forex_projection_client_${suffix}`,
    providerOrderId: `stage29j_forex_projection_order_${suffix}`,
    providerExecutionIdentity: `stage29j_provider_identity_forex_${suffix}`,
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionAttempts: 0,
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
    ledgerProjectionLeaseOwner: "",
    ledgerProjectionLeaseExpiresAt: "",
    dryRun: false,
    updatedAt: now,
    ...overrides
  };
}

async function seedProjectionAttempt(collectionPath, attempt) {
  const id = attempt.orderAttemptId ?? attempt.attemptId;
  await db.doc(`${collectionPath}/${id}`).set(attempt, { merge: true });
}

async function assertEmulatorReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/`, { signal: controller.signal });
    assert(response.ok || response.status === 404, "Firestore emulator is reachable for executable Stage 29J QA.");
  } catch (error) {
    throw new Error(`Firestore emulator is not reachable at ${process.env.FIRESTORE_EMULATOR_HOST}; start it before running stage29j:routing:qa. ${error instanceof Error ? error.message : ""}`);
  } finally {
    clearTimeout(timer);
  }
}

async function runCryptoRoutingCoverage() {
  const workspaceId = "stage29j_crypto_route_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await seedCryptoReady(workspaceId, studentId);
  const signal = await seedSignal(workspaceId, "stage29j_crypto_route_signal", { market: "crypto", pair: "BTCUSDT" });
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");

  const firstRoute = await cryptoRouting.routePublishedCryptoSignalForLiveProductionExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal });
  const secondRoute = await cryptoRouting.routePublishedCryptoSignalForLiveProductionExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal });
  assert(firstRoute.readyCount === 1 && secondRoute.readyCount === 1, "Production crypto routing evaluates the eligible direct in-app signal through the real routing gate.");
  assert(await countReadyIntents(workspaceId, "live_execution_intents", "ready_for_live") === 1, "Repeated production crypto routing remains idempotent at the executable intent document.");

  const firstWorker = await cryptoRouting.runLiveProductionCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_LIVE_CANARY" });
  const secondWorker = await cryptoRouting.runLiveProductionCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_LIVE_CANARY" });
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(firstWorker.submittedCount === 1 && secondWorker.submittedCount === 0, "Production crypto canary worker is idempotent after a provider-confirmed fill.");
  assert(providerCalls.cryptoOrders === 1 && ledgers.length === 1, "Production crypto worker used injected provider transport once and wrote one canonical ledger row.");
  assert(ledgers[0].tradeHubSignalId === signal.signalId && ledgers[0].assetClass === "crypto" && ledgers[0].tradeOrigin === "copied", "Crypto canonical ledger row preserves server-only signal linkage, market, and copied origin.");

  const blockedCases = [
    ["wrong market", { market: "forex", pair: "EURUSD" }, {}],
    ["telegram source", { source: "telegram_channel" }, {}],
    ["unknown source", { source: "future_source" }, {}],
    ["unpaid Trade Copier", {}, { tradeCopierActive: false }],
    ["disconnected setup", {}, { disconnected: true }],
    ["missing consent", {}, { missingConsent: true }],
    ["paused setup", {}, { studentPaused: true }],
    ["stale signal", { publishedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }, { stale: true }],
    ["cancelled signal", { status: "cancelled" }, {}],
    ["platform kill switch", {}, { platformKillSwitch: true }],
    ["workspace kill switch", {}, { workspaceKillSwitch: true }],
    ["student kill switch", {}, { studentKillSwitch: true }]
  ];

  for (const [label, signalOverrides, options] of blockedCases) {
    const ws = `stage29j_crypto_block_${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    await seedWorkspaceStudent(ws, studentId, options);
    await seedCryptoReady(ws, studentId, options);
    const blockedSignal = await seedSignal(ws, `stage29j_crypto_${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`, signalOverrides);
    const before = { ...providerCalls };
    await cryptoRouting.routePublishedCryptoSignalForLiveProductionExecution({ actor: { uid: "stage29j_workspace", workspaceId: ws }, signal: blockedSignal });
    assert(await countReadyIntents(ws, "live_execution_intents", "ready_for_live") === 0, `Production crypto routing blocks ${label} before an executable intent.`);
    await assertBlockedNoExecution(ws, studentId, before, `Production crypto ${label}`);
  }
}

async function runCryptoFinalBoundaryRaceCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const studentId = "stage29j_student";
  const raceCases = [
    {
      label: "route then cancel",
      mutate: async (workspaceId, signalId) => db.doc(`workspaces/${workspaceId}/signals/${signalId}`).set({
        status: "cancelled",
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then edit",
      mutate: async (workspaceId, signalId) => db.doc(`workspaces/${workspaceId}/signals/${signalId}`).set({
        pair: "ETHUSDT",
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then pause",
      mutate: async (workspaceId) => db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/crypto`).set({
        studentPaused: true,
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then revoke",
      mutate: async (workspaceId) => Promise.all([
        db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/crypto`).set({
          consentStatus: "revoked",
          updatedAt: safeNow()
        }, { merge: true }),
        db.doc(`workspaces/${workspaceId}/students/${studentId}/live_consents/current`).set({
          productionStatus: "paused",
          updatedAt: safeNow()
        }, { merge: true })
      ])
    },
    {
      label: "route then student kill switch",
      mutate: async (workspaceId) => db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/crypto`).set({
        killSwitchEnabled: true,
        updatedAt: safeNow()
      }, { merge: true })
    }
  ];

  for (const raceCase of raceCases) {
    const workspaceId = `stage29j_crypto_race_${raceCase.label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    const signalId = `${workspaceId}_signal`;
    await seedWorkspaceStudent(workspaceId, studentId);
    await seedCryptoReady(workspaceId, studentId);
    const signal = await seedSignal(workspaceId, signalId, { market: "crypto", pair: "BTCUSDT" });
    await cryptoRouting.routePublishedCryptoSignalForLiveProductionExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal });
    assert(await countReadyIntents(workspaceId, "live_execution_intents", "ready_for_live") === 1, `Production crypto ${raceCase.label} creates one ready intent before the race mutation.`);
    const before = { ...providerCalls };
    await raceCase.mutate(workspaceId, signalId);
    const run = await cryptoRouting.runLiveProductionCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_LIVE_CANARY" });
    assert(run.submittedCount === 0, `Production crypto ${raceCase.label} submits no provider order after final revalidation.`);
    await assertPostRoutingRaceBlocked({ workspaceId, studentId, market: "crypto", countersBefore: before, label: `Production crypto ${raceCase.label}` });
  }

  const signalWorkspaceId = "stage29j_crypto_signal_owner_ws";
  const actorWorkspaceId = "stage29j_crypto_wrong_actor_ws";
  await seedWorkspaceStudent(signalWorkspaceId, studentId);
  await seedWorkspaceStudent(actorWorkspaceId, studentId);
  await seedCryptoReady(signalWorkspaceId, studentId);
  await seedCryptoReady(actorWorkspaceId, studentId);
  const signal = await seedSignal(signalWorkspaceId, "stage29j_crypto_workspace_mismatch_signal", { market: "crypto", pair: "BTCUSDT" });
  await assertWorkspaceMismatchRejected({
    workspaceId: actorWorkspaceId,
    signalWorkspaceId,
    signal,
    route: (payload) => cryptoRouting.routePublishedCryptoSignalForLiveProductionExecution(payload),
    label: "Production crypto routing"
  });
}

async function runCryptoLedgerProjectionFailureCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_failure_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await seedCryptoReady(workspaceId, studentId);
  const signal = await seedSignal(workspaceId, "stage29j_crypto_projection_failure_signal", { market: "crypto", pair: "BTCUSDT" });
  await cryptoRouting.routePublishedCryptoSignalForLiveProductionExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal });
  const before = { ...providerCalls };
  ledgerProjectionFailures.remainingWrites = 1;
  const firstRun = await cryptoRouting.runLiveProductionCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_LIVE_CANARY" });
  ledgerProjectionFailures.remainingWrites = 0;
  const attemptsAfterFailure = await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`);
  assert(firstRun.submittedCount === 1 && providerCalls.cryptoOrders === before.cryptoOrders + 1, "Production crypto provider success is committed before an injected ledger projection failure.");
  assert(attemptsAfterFailure.length === 1 && attemptsAfterFailure[0].status === "filled_live", "Production crypto attempt remains truthfully provider-filled when ledger projection fails.");
  assert(attemptsAfterFailure[0].ledgerProjectionStatus === "retry_scheduled", "Production crypto attempt records retryable ledger projection failure state.");
  assert((await ledgerRecords(workspaceId, studentId)).length === 0, "Production crypto injected projection failure leaves no partial canonical ledger row.");
  await db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptsAfterFailure[0].orderAttemptId}`).set({
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z"
  }, { merge: true });

  const secondRun = await cryptoRouting.runLiveProductionCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_LIVE_CANARY" });
  const repairedAttempts = await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(secondRun.submittedCount === 0 && providerCalls.cryptoOrders === before.cryptoOrders + 1, "Production crypto ledger projection repair calls the provider zero additional times.");
  assert(ledgers.length === 1 && repairedAttempts[0].ledgerProjectionStatus === "projected", "Production crypto ledger projection repair writes exactly one canonical ledger row and marks the attempt projected.");
  assert(secondRun.projectionRepair?.repairedCount === 1 && secondRun.projectionRepair?.attemptedCount === 1, "Production crypto projection repair reports attempted and repaired counts truthfully.");
}

async function runCryptoLedgerProjectionRepairDiscoveryCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_discovery_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection discovery", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 7; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, `old_projected_${index}`, {
      ledgerProjectionStatus: "projected",
      ledgerProjectedAt: `2026-09-01T00:0${index}:00.000Z`,
      updatedAt: `2026-09-01T00:0${index}:00.000Z`
    }));
  }

  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "new_failed", {
    ledgerProjectionStatus: "failed",
    updatedAt: "2026-09-01T00:10:00.000Z"
  }));

  const before = { ...providerCalls };
  const repair = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(repair.attemptedCount === 1 && repair.repairedCount === 1, "Production crypto projection repair queries due failed work directly instead of scanning a small projected prefix.");
  assert(ledgers.some((entry) => entry.ledgerEntryId === "crypto_production_stage29j_crypto_projection_new_failed"), "Production crypto projection repair writes the newer failed projection through the canonical ledger mapper.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Production crypto projection repair loads no credentials and calls no provider.");
}

async function runCryptoLedgerProjectionDisabledGateCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_disabled_gate_ws";
  const studentId = "stage29j_student";
  const originalCanary = process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED;
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection disabled gate", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "disabled_gate"));
  const before = { ...providerCalls };

  try {
    process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED = "false";
    const run = await cryptoRouting.runLiveProductionCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_LIVE_CANARY" });
    const ledgers = await ledgerRecords(workspaceId, studentId);
    assert(run.projectionRepair?.repairedCount === 1 && ledgers.length === 1, "Production crypto projection repair runs before disabled canary/live/order/vault gate returns.");
    assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Disabled-gate crypto projection repair performs zero provider or credential-dependent work.");
  } finally {
    process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED = originalCanary ?? "true";
  }
}

async function runCryptoLedgerProjectionRetryBoundCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_retry_bound_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection retry bound", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "poisoned", {
    ledgerProjectionAttempts: 2,
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z"
  }));
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "next_due", {
    ledgerProjectionNextAttemptAt: "2026-09-01T00:01:00.000Z"
  }));

  ledgerProjectionFailures.remainingWrites = 1;
  const repair = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  ledgerProjectionFailures.remainingWrites = 0;
  const attempts = await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const poisoned = attempts.find((attempt) => attempt.orderAttemptId.endsWith("poisoned"));
  assert(repair.attemptedCount === 2 && repair.finalFailedCount === 1 && repair.repairedCount === 1, "Production crypto projection repair reports attempted, repaired, and final-failed counts truthfully.");
  assert(poisoned?.ledgerProjectionStatus === "final_failed" && poisoned?.ledgerProjectionAttempts === 3, "Production crypto projection repair marks a permanently failing record final_failed without changing provider truth.");
  assert(ledgers.length === 1 && ledgers[0].ledgerEntryId.endsWith("next_due"), "Production crypto final-failed projection does not starve the next due record.");
}

async function runCryptoLedgerProjectionConcurrentCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_concurrent_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection concurrent", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "concurrent"));
  const before = { ...providerCalls };
  const [first, second] = await Promise.all([
    cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10),
    cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10)
  ]);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(first.attemptedCount + second.attemptedCount === 1 && first.repairedCount + second.repairedCount === 1, "Concurrent production crypto projection repair workers lease exactly one owner for the same due attempt.");
  assert(ledgers.length === 1, "Concurrent production crypto projection repair creates exactly one deterministic canonical ledger row.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Concurrent production crypto projection repair makes zero provider requests.");
}

async function runCryptoLedgerProjectionFencedLateSuccessCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_late_success_ws";
  const studentId = "stage29j_student";
  const attempt = cryptoProjectionAttempt(workspaceId, studentId, "late_success");
  resetLedgerProjectionWriteControl();
  prepareLedgerProjectionWriteGate(1, "after_success");
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection late success", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, attempt);
  const before = { ...providerCalls };

  const staleWorker = cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  await waitForLedgerProjectionWriteGate(1);
  assert((await ledgerRecords(workspaceId, studentId)).length === 1, "Production crypto stale-success worker can create only the deterministic ledger row before its lease expires.");
  await db.doc(`workspaces/${workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set({
    ledgerProjectionLeaseExpiresAt: "2026-09-01T00:00:00.000Z"
  }, { merge: true });

  const currentWorker = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  releaseLedgerProjectionWriteGate(1);
  const staleSummary = await staleWorker;
  const finalAttempt = (await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`))[0];
  const ledgers = await ledgerRecords(workspaceId, studentId);

  assert(currentWorker.attemptedCount === 1 && currentWorker.repairedCount === 1, "Current crypto projection owner reconciles a stale-created deterministic ledger row to projected.");
  assert(staleSummary.attemptedCount === 1 && staleSummary.skippedCount === 1, "Late crypto stale-success worker reports its stale finalization without claiming repair.");
  assert(finalAttempt.ledgerProjectionStatus === "projected" && finalAttempt.ledgerProjectionAttempts === 1 && !finalAttempt.ledgerProjectionLeaseOwner, "Late crypto stale-success worker cannot overwrite attempts, clear another lease, or regress projected state.");
  assert(ledgers.length === 1, "Late crypto stale-success and current-owner repair produce exactly one canonical ledger row.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fenced crypto stale-success projection repair performs zero credential loads and zero provider calls.");
  resetLedgerProjectionWriteControl();
}

async function runCryptoLedgerProjectionFencedLateFailureCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_late_failure_ws";
  const studentId = "stage29j_student";
  const attempt = cryptoProjectionAttempt(workspaceId, studentId, "late_failure");
  resetLedgerProjectionWriteControl();
  prepareLedgerProjectionWriteGate(1, "fail");
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection late failure", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, attempt);
  const before = { ...providerCalls };

  const staleWorker = cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  await waitForLedgerProjectionWriteGate(1);
  await db.doc(`workspaces/${workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set({
    ledgerProjectionLeaseExpiresAt: "2026-09-01T00:00:00.000Z"
  }, { merge: true });

  const currentWorker = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  releaseLedgerProjectionWriteGate(1);
  const staleSummary = await staleWorker;
  const finalAttempt = (await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`))[0];
  const ledgers = await ledgerRecords(workspaceId, studentId);

  assert(currentWorker.attemptedCount === 1 && currentWorker.repairedCount === 1, "Current crypto projection owner repairs after an expired first owner.");
  assert(staleSummary.attemptedCount === 1 && staleSummary.skippedCount === 1, "Late crypto stale-failure worker reports stale finalization without retrying or final-failing durable state.");
  assert(finalAttempt.ledgerProjectionStatus === "projected" && finalAttempt.ledgerProjectionAttempts === 1 && !finalAttempt.ledgerProjectionLeaseOwner, "Late crypto stale failure cannot regress projected state or increment attempts.");
  assert(ledgers.length === 1, "Late crypto stale failure leaves exactly one canonical ledger row.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fenced crypto stale-failure projection repair performs zero credential loads and zero provider calls.");
  resetLedgerProjectionWriteControl();
}

async function runCryptoLedgerProjectionLeaseStarvationCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_lease_starvation_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection lease starvation", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  const futureLease = new Date(Date.now() + 60_000).toISOString();
  for (let index = 0; index < 10; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, `active_lease_${index}`, {
      ledgerProjectionStatus: "in_progress",
      ledgerProjectionLeaseOwner: `active_owner_${index}`,
      ledgerProjectionLeaseExpiresAt: futureLease,
      ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
      updatedAt: `2026-09-01T00:0${index}:00.000Z`
    }));
  }
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "later_due", {
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:10:00.000Z",
    updatedAt: "2026-09-01T00:10:00.000Z"
  }));
  const before = { ...providerCalls };
  const repair = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 1);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const attempts = await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`);
  assert(repair.attemptedCount === 1 && repair.repairedCount === 1 && ledgers[0]?.ledgerEntryId.endsWith("later_due"), "Unexpired crypto in-progress leases do not consume every actionable projection repair batch slot.");
  assert(attempts.filter((entry) => entry.ledgerProjectionStatus === "in_progress").length === 10, "Crypto projection repair leaves unexpired leased work untouched while processing later due work.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Crypto lease-starvation repair performs zero credential loads and zero provider calls.");
}

async function runCryptoLedgerProjectionFairExpiredOrderingCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_fair_expired_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection fair expired ordering", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 3; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, `due_full_${index}`, {
      ledgerProjectionStatus: "retry_scheduled",
      ledgerProjectionNextAttemptAt: `2026-09-01T00:0${index + 1}:00.000Z`,
      updatedAt: `2026-09-01T00:1${index}:00.000Z`
    }));
  }
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "older_expired", {
    ledgerProjectionStatus: "in_progress",
    ledgerProjectionLeaseOwner: "expired_owner",
    ledgerProjectionLeaseExpiresAt: "2026-09-01T00:00:00.000Z",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:30.000Z"
  }));

  const before = { ...providerCalls };
  const repair = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 3);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const ledgerIds = new Set(ledgers.map((entry) => entry.ledgerEntryId));
  assert(repair.attemptedCount === 3 && repair.repairedCount === 3 && ledgers.length === 3, "Crypto projection repair remains bounded while merging full due and expired-lease queues.");
  assert(ledgerIds.has("crypto_production_stage29j_crypto_projection_older_expired"), "Crypto projection repair selects an older expired lease even when the normal due query fills the batch.");
  assert(ledgerIds.has("crypto_production_stage29j_crypto_projection_due_full_0") && ledgerIds.has("crypto_production_stage29j_crypto_projection_due_full_1") && !ledgerIds.has("crypto_production_stage29j_crypto_projection_due_full_2"), "Crypto projection repair tie-breaks by global eligible time before applying the batch limit.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fair crypto expired-lease ordering performs zero credential loads and zero provider calls.");
}

async function runCryptoLedgerProjectionFairDueOrderingCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_fair_due_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection fair due ordering", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 3; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, `expired_full_${index}`, {
      ledgerProjectionStatus: "in_progress",
      ledgerProjectionLeaseOwner: `expired_owner_${index}`,
      ledgerProjectionLeaseExpiresAt: `2026-09-01T00:0${index + 1}:00.000Z`,
      ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
      updatedAt: `2026-09-01T00:1${index}:00.000Z`
    }));
  }
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "older_due", {
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:30.000Z"
  }));

  const before = { ...providerCalls };
  const repair = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 3);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const ledgerIds = new Set(ledgers.map((entry) => entry.ledgerEntryId));
  assert(repair.attemptedCount === 3 && repair.repairedCount === 3 && ledgers.length === 3, "Crypto projection repair remains bounded while merging full expired and due queues.");
  assert(ledgerIds.has("crypto_production_stage29j_crypto_projection_older_due"), "Crypto projection repair selects an older normal due item even when the expired-lease query fills the batch.");
  assert(ledgerIds.has("crypto_production_stage29j_crypto_projection_expired_full_0") && ledgerIds.has("crypto_production_stage29j_crypto_projection_expired_full_1") && !ledgerIds.has("crypto_production_stage29j_crypto_projection_expired_full_2"), "Crypto projection repair applies deterministic global ordering across due and expired work.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fair crypto due ordering performs zero credential loads and zero provider calls.");
}

async function runCryptoLedgerProjectionClaimFinalFailedCoverage() {
  const cryptoRouting = loadTsModule("src/lib/crypto-execution/crypto-live-production.ts");
  const workspaceId = "stage29j_crypto_projection_claim_final_failed_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Projection final failed", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/live_order_attempts`, cryptoProjectionAttempt(workspaceId, studentId, "already_exhausted", {
    ledgerProjectionAttempts: 3,
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z"
  }));
  const before = { ...providerCalls };
  const repair = await cryptoRouting.repairPendingCryptoLedgerProjections(workspaceId, 10);
  const attempts = await collectionRecords(`workspaces/${workspaceId}/live_order_attempts`);
  assert(repair.attemptedCount === 0 && repair.finalFailedCount === 1, "Crypto projection repair counts claim-time final_failed transitions without reporting a projection attempt.");
  assert(attempts[0].ledgerProjectionStatus === "final_failed" && !attempts[0].ledgerProjectionLeaseOwner, "Crypto already-exhausted projection work becomes final_failed without an owner lease.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Crypto claim-time final_failed repair performs zero credential loads and zero provider calls.");
}

async function runForexRoutingCoverage() {
  const workspaceId = "stage29j_forex_route_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await seedForexReady(workspaceId, studentId);
  const signal = await seedSignal(workspaceId, "stage29j_forex_route_signal", {
    market: "forex",
    pair: "EURUSD",
    direction: "buy",
    entry: "1.0872",
    stopLoss: "1.0800",
    takeProfit: "1.0950"
  });
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");

  const firstRoute = await forexRouting.routePublishedForexSignalForLiveCanaryExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal, trigger: "created_published" });
  const secondRoute = await forexRouting.routePublishedForexSignalForLiveCanaryExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal, trigger: "patched_published" });
  assert(firstRoute.readyCount === 1 && secondRoute.readyCount === 1, "Production Forex live-canary routing evaluates the eligible direct in-app signal through the real routing gate.");
  assert(await countReadyIntents(workspaceId, "forex_live_canary_intents", "ready_live_forex_canary") === 1, "Repeated Forex live-canary routing remains idempotent at the executable intent document.");

  const firstWorker = await forexRouting.runForexLiveCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_FOREX_LIVE_CANARY" });
  const secondWorker = await forexRouting.runForexLiveCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_FOREX_LIVE_CANARY" });
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(firstWorker.submittedCount === 1 && secondWorker.submittedCount === 0, "Production Forex canary worker is idempotent after a provider-confirmed fill.");
  assert(providerCalls.forexOrders === 1 && ledgers.length === 1, "Production Forex worker used injected provider transport once and wrote one canonical ledger row through the shared writer.");
  assert(ledgers[0].tradeHubSignalId === signal.signalId && ledgers[0].source === "forex_autocopy" && ledgers[0].providerConfirmed === true && ledgers[0].journalLifecycle === "open", "Forex canonical ledger row preserves signal linkage, provider confirmation, copied origin, lifecycle, and market.");

  const blockedCases = [
    ["wrong market", { market: "crypto", pair: "BTCUSDT" }, {}],
    ["telegram source", { source: "telegram_channel" }, {}],
    ["unknown source", { source: "future_source" }, {}],
    ["unpaid Trade Copier", {}, { tradeCopierActive: false }],
    ["disconnected setup", {}, { disconnected: true }],
    ["missing consent", {}, { missingConsent: true }],
    ["paused setup", {}, { studentPaused: true }],
    ["stale signal", { publishedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }, { stale: true }],
    ["cancelled signal", { status: "cancelled" }, {}],
    ["platform kill switch", {}, { platformKillSwitch: true }],
    ["workspace kill switch", {}, { workspaceKillSwitch: true }],
    ["student kill switch", {}, { studentKillSwitch: true }]
  ];

  for (const [label, signalOverrides, options] of blockedCases) {
    const ws = `stage29j_forex_block_${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    await seedWorkspaceStudent(ws, studentId, options);
    await seedForexReady(ws, studentId, options);
    const blockedSignal = await seedSignal(ws, `stage29j_forex_${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`, {
      market: "forex",
      pair: "EURUSD",
      direction: "buy",
      entry: "1.0872",
      stopLoss: "1.0800",
      takeProfit: "1.0950",
      ...signalOverrides
    });
    const before = { ...providerCalls };
    await forexRouting.routePublishedForexSignalForLiveCanaryExecution({ actor: { uid: "stage29j_workspace", workspaceId: ws }, signal: blockedSignal, trigger: "created_published" });
    assert(await countReadyIntents(ws, "forex_live_canary_intents", "ready_live_forex_canary") === 0, `Production Forex routing blocks ${label} before an executable intent.`);
    await assertBlockedNoExecution(ws, studentId, before, `Production Forex ${label}`);
  }
}

async function runForexFinalBoundaryRaceCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const studentId = "stage29j_student";
  const raceCases = [
    {
      label: "route then cancel",
      mutate: async (workspaceId, signalId) => db.doc(`workspaces/${workspaceId}/signals/${signalId}`).set({
        status: "cancelled",
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then edit",
      mutate: async (workspaceId, signalId) => db.doc(`workspaces/${workspaceId}/signals/${signalId}`).set({
        pair: "GBPUSD",
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then pause",
      mutate: async (workspaceId) => db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/forex`).set({
        studentPaused: true,
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then revoke",
      mutate: async (workspaceId) => db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/forex`).set({
        consentStatus: "revoked",
        updatedAt: safeNow()
      }, { merge: true })
    },
    {
      label: "route then student kill switch",
      mutate: async (workspaceId) => db.doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/forex`).set({
        killSwitchEnabled: true,
        updatedAt: safeNow()
      }, { merge: true })
    }
  ];

  for (const raceCase of raceCases) {
    const workspaceId = `stage29j_forex_race_${raceCase.label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    const signalId = `${workspaceId}_signal`;
    await seedWorkspaceStudent(workspaceId, studentId);
    await seedForexReady(workspaceId, studentId);
    const signal = await seedSignal(workspaceId, signalId, {
      market: "forex",
      pair: "EURUSD",
      direction: "buy",
      entry: "1.0872",
      stopLoss: "1.0800",
      takeProfit: "1.0950"
    });
    await forexRouting.routePublishedForexSignalForLiveCanaryExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal, trigger: "created_published" });
    assert(await countReadyIntents(workspaceId, "forex_live_canary_intents", "ready_live_forex_canary") === 1, `Production Forex ${raceCase.label} creates one ready intent before the race mutation.`);
    const before = { ...providerCalls };
    await raceCase.mutate(workspaceId, signalId);
    const run = await forexRouting.runForexLiveCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_FOREX_LIVE_CANARY" });
    assert(run.submittedCount === 0, `Production Forex ${raceCase.label} submits no provider order after final revalidation.`);
    await assertPostRoutingRaceBlocked({ workspaceId, studentId, market: "forex", countersBefore: before, label: `Production Forex ${raceCase.label}` });
  }

  const signalWorkspaceId = "stage29j_forex_signal_owner_ws";
  const actorWorkspaceId = "stage29j_forex_wrong_actor_ws";
  await seedWorkspaceStudent(signalWorkspaceId, studentId);
  await seedWorkspaceStudent(actorWorkspaceId, studentId);
  await seedForexReady(signalWorkspaceId, studentId);
  await seedForexReady(actorWorkspaceId, studentId);
  const signal = await seedSignal(signalWorkspaceId, "stage29j_forex_workspace_mismatch_signal", {
    market: "forex",
    pair: "EURUSD",
    direction: "buy",
    entry: "1.0872",
    stopLoss: "1.0800",
    takeProfit: "1.0950"
  });
  await assertWorkspaceMismatchRejected({
    workspaceId: actorWorkspaceId,
    signalWorkspaceId,
    signal,
    route: (payload) => forexRouting.routePublishedForexSignalForLiveCanaryExecution({ ...payload, trigger: "created_published" }),
    label: "Production Forex routing"
  });
}

async function runForexLedgerProjectionFailureCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_failure_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await seedForexReady(workspaceId, studentId);
  const signal = await seedSignal(workspaceId, "stage29j_forex_projection_failure_signal", {
    market: "forex",
    pair: "EURUSD",
    direction: "buy",
    entry: "1.0872",
    stopLoss: "1.0800",
    takeProfit: "1.0950"
  });
  await forexRouting.routePublishedForexSignalForLiveCanaryExecution({ actor: { uid: "stage29j_workspace", workspaceId }, signal, trigger: "created_published" });
  const before = { ...providerCalls };
  ledgerProjectionFailures.remainingWrites = 1;
  const firstRun = await forexRouting.runForexLiveCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_FOREX_LIVE_CANARY" });
  ledgerProjectionFailures.remainingWrites = 0;
  const attemptsAfterFailure = await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`);
  assert(firstRun.submittedCount === 1 && providerCalls.forexOrders === before.forexOrders + 1, "Production Forex provider success is committed before an injected ledger projection failure.");
  assert(attemptsAfterFailure.length === 1 && attemptsAfterFailure[0].status === "filled_live_forex_canary", "Production Forex attempt remains truthfully provider-filled when ledger projection fails.");
  assert(attemptsAfterFailure[0].ledgerProjectionStatus === "retry_scheduled", "Production Forex attempt records retryable ledger projection failure state.");
  assert((await ledgerRecords(workspaceId, studentId)).length === 0, "Production Forex injected projection failure leaves no partial canonical ledger row.");
  await db.doc(`workspaces/${workspaceId}/forex_live_canary_order_attempts/${attemptsAfterFailure[0].attemptId}`).set({
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z"
  }, { merge: true });

  const secondRun = await forexRouting.runForexLiveCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_FOREX_LIVE_CANARY" });
  const repairedAttempts = await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(secondRun.submittedCount === 0 && providerCalls.forexOrders === before.forexOrders + 1, "Production Forex ledger projection repair calls the provider zero additional times.");
  assert(ledgers.length === 1 && repairedAttempts[0].ledgerProjectionStatus === "projected", "Production Forex ledger projection repair writes exactly one canonical ledger row and marks the attempt projected.");
  assert(secondRun.projectionRepair?.repairedCount === 1 && secondRun.projectionRepair?.attemptedCount === 1, "Production Forex projection repair reports attempted and repaired counts truthfully.");
}

async function runForexLedgerProjectionRepairDiscoveryCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_discovery_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection discovery", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 7; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, `old_projected_${index}`, {
      ledgerProjectionStatus: "projected",
      ledgerProjectedAt: `2026-09-01T00:0${index}:00.000Z`,
      updatedAt: `2026-09-01T00:0${index}:00.000Z`
    }));
  }

  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "new_failed", {
    ledgerProjectionStatus: "failed",
    updatedAt: "2026-09-01T00:10:00.000Z"
  }));

  const before = { ...providerCalls };
  const repair = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(repair.attemptedCount === 1 && repair.repairedCount === 1, "Production Forex projection repair queries due failed work directly instead of scanning a small projected prefix.");
  assert(ledgers.some((entry) => entry.ledgerEntryId === "forex_live_canary_stage29j_forex_projection_new_failed"), "Production Forex projection repair writes the newer failed projection through the canonical ledger mapper.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Production Forex projection repair loads no credentials and calls no provider.");
}

async function runForexLedgerProjectionDisabledGateCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_disabled_gate_ws";
  const studentId = "stage29j_student";
  const originalCanary = process.env.FOREX_LIVE_CANARY_ENABLED;
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection disabled gate", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "disabled_gate"));
  const before = { ...providerCalls };

  try {
    process.env.FOREX_LIVE_CANARY_ENABLED = "false";
    const run = await forexRouting.runForexLiveCanaryWorker({ uid: "stage29j_super_admin" }, { workspaceId, confirmation: "RUN_FOREX_LIVE_CANARY" });
    const ledgers = await ledgerRecords(workspaceId, studentId);
    assert(run.projectionRepair?.repairedCount === 1 && ledgers.length === 1, "Production Forex projection repair runs before disabled live-canary/order gate returns.");
    assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Disabled-gate Forex projection repair performs zero provider or credential-dependent work.");
  } finally {
    process.env.FOREX_LIVE_CANARY_ENABLED = originalCanary ?? "true";
  }
}

async function runForexLedgerProjectionRetryBoundCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_retry_bound_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection retry bound", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "poisoned", {
    ledgerProjectionAttempts: 2,
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z"
  }));
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "next_due", {
    ledgerProjectionNextAttemptAt: "2026-09-01T00:01:00.000Z"
  }));

  ledgerProjectionFailures.remainingWrites = 1;
  const repair = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  ledgerProjectionFailures.remainingWrites = 0;
  const attempts = await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const poisoned = attempts.find((attempt) => attempt.attemptId.endsWith("poisoned"));
  assert(repair.attemptedCount === 2 && repair.finalFailedCount === 1 && repair.repairedCount === 1, "Production Forex projection repair reports attempted, repaired, and final-failed counts truthfully.");
  assert(poisoned?.ledgerProjectionStatus === "final_failed" && poisoned?.ledgerProjectionAttempts === 3, "Production Forex projection repair marks a permanently failing record final_failed without changing provider truth.");
  assert(ledgers.length === 1 && ledgers[0].ledgerEntryId.endsWith("next_due"), "Production Forex final-failed projection does not starve the next due record.");
}

async function runForexLedgerProjectionConcurrentCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_concurrent_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection concurrent", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "concurrent"));
  const before = { ...providerCalls };
  const [first, second] = await Promise.all([
    forexRouting.repairPendingForexLedgerProjections(workspaceId, 10),
    forexRouting.repairPendingForexLedgerProjections(workspaceId, 10)
  ]);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  assert(first.attemptedCount + second.attemptedCount === 1 && first.repairedCount + second.repairedCount === 1, "Concurrent production Forex projection repair workers lease exactly one owner for the same due attempt.");
  assert(ledgers.length === 1, "Concurrent production Forex projection repair creates exactly one deterministic canonical ledger row.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Concurrent production Forex projection repair makes zero provider requests.");
}

async function runForexLedgerProjectionFencedLateSuccessCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_late_success_ws";
  const studentId = "stage29j_student";
  const attempt = forexProjectionAttempt(workspaceId, studentId, "late_success");
  resetLedgerProjectionWriteControl();
  prepareLedgerProjectionWriteGate(1, "after_success");
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection late success", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, attempt);
  const before = { ...providerCalls };

  const staleWorker = forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  await waitForLedgerProjectionWriteGate(1);
  assert((await ledgerRecords(workspaceId, studentId)).length === 1, "Production Forex stale-success worker can create only the deterministic ledger row before its lease expires.");
  await db.doc(`workspaces/${workspaceId}/forex_live_canary_order_attempts/${attempt.attemptId}`).set({
    ledgerProjectionLeaseExpiresAt: "2026-09-01T00:00:00.000Z"
  }, { merge: true });

  const currentWorker = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  releaseLedgerProjectionWriteGate(1);
  const staleSummary = await staleWorker;
  const finalAttempt = (await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`))[0];
  const ledgers = await ledgerRecords(workspaceId, studentId);

  assert(currentWorker.attemptedCount === 1 && currentWorker.repairedCount === 1, "Current Forex projection owner reconciles a stale-created deterministic ledger row to projected.");
  assert(staleSummary.attemptedCount === 1 && staleSummary.skippedCount === 1, "Late Forex stale-success worker reports its stale finalization without claiming repair.");
  assert(finalAttempt.ledgerProjectionStatus === "projected" && finalAttempt.ledgerProjectionAttempts === 1 && !finalAttempt.ledgerProjectionLeaseOwner, "Late Forex stale-success worker cannot overwrite attempts, clear another lease, or regress projected state.");
  assert(ledgers.length === 1, "Late Forex stale-success and current-owner repair produce exactly one canonical ledger row.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fenced Forex stale-success projection repair performs zero credential loads and zero provider calls.");
  resetLedgerProjectionWriteControl();
}

async function runForexLedgerProjectionFencedLateFailureCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_late_failure_ws";
  const studentId = "stage29j_student";
  const attempt = forexProjectionAttempt(workspaceId, studentId, "late_failure");
  resetLedgerProjectionWriteControl();
  prepareLedgerProjectionWriteGate(1, "fail");
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection late failure", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, attempt);
  const before = { ...providerCalls };

  const staleWorker = forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  await waitForLedgerProjectionWriteGate(1);
  await db.doc(`workspaces/${workspaceId}/forex_live_canary_order_attempts/${attempt.attemptId}`).set({
    ledgerProjectionLeaseExpiresAt: "2026-09-01T00:00:00.000Z"
  }, { merge: true });

  const currentWorker = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  releaseLedgerProjectionWriteGate(1);
  const staleSummary = await staleWorker;
  const finalAttempt = (await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`))[0];
  const ledgers = await ledgerRecords(workspaceId, studentId);

  assert(currentWorker.attemptedCount === 1 && currentWorker.repairedCount === 1, "Current Forex projection owner repairs after an expired first owner.");
  assert(staleSummary.attemptedCount === 1 && staleSummary.skippedCount === 1, "Late Forex stale-failure worker reports stale finalization without retrying or final-failing durable state.");
  assert(finalAttempt.ledgerProjectionStatus === "projected" && finalAttempt.ledgerProjectionAttempts === 1 && !finalAttempt.ledgerProjectionLeaseOwner, "Late Forex stale failure cannot regress projected state or increment attempts.");
  assert(ledgers.length === 1, "Late Forex stale failure leaves exactly one canonical ledger row.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fenced Forex stale-failure projection repair performs zero credential loads and zero provider calls.");
  resetLedgerProjectionWriteControl();
}

async function runForexLedgerProjectionLeaseStarvationCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_lease_starvation_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection lease starvation", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  const futureLease = new Date(Date.now() + 60_000).toISOString();
  for (let index = 0; index < 10; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, `active_lease_${index}`, {
      ledgerProjectionStatus: "in_progress",
      ledgerProjectionLeaseOwner: `active_owner_${index}`,
      ledgerProjectionLeaseExpiresAt: futureLease,
      ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
      updatedAt: `2026-09-01T00:0${index}:00.000Z`
    }));
  }
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "later_due", {
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:10:00.000Z",
    updatedAt: "2026-09-01T00:10:00.000Z"
  }));
  const before = { ...providerCalls };
  const repair = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 1);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const attempts = await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`);
  assert(repair.attemptedCount === 1 && repair.repairedCount === 1 && ledgers[0]?.ledgerEntryId.endsWith("later_due"), "Unexpired Forex in-progress leases do not consume every actionable projection repair batch slot.");
  assert(attempts.filter((entry) => entry.ledgerProjectionStatus === "in_progress").length === 10, "Forex projection repair leaves unexpired leased work untouched while processing later due work.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Forex lease-starvation repair performs zero credential loads and zero provider calls.");
}

async function runForexLedgerProjectionFairExpiredOrderingCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_fair_expired_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection fair expired ordering", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 3; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, `due_full_${index}`, {
      ledgerProjectionStatus: "retry_scheduled",
      ledgerProjectionNextAttemptAt: `2026-09-01T00:0${index + 1}:00.000Z`,
      updatedAt: `2026-09-01T00:1${index}:00.000Z`
    }));
  }
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "older_expired", {
    ledgerProjectionStatus: "in_progress",
    ledgerProjectionLeaseOwner: "expired_owner",
    ledgerProjectionLeaseExpiresAt: "2026-09-01T00:00:00.000Z",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:30.000Z"
  }));

  const before = { ...providerCalls };
  const repair = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 3);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const ledgerIds = new Set(ledgers.map((entry) => entry.ledgerEntryId));
  assert(repair.attemptedCount === 3 && repair.repairedCount === 3 && ledgers.length === 3, "Forex projection repair remains bounded while merging full due and expired-lease queues.");
  assert(ledgerIds.has("forex_live_canary_stage29j_forex_projection_older_expired"), "Forex projection repair selects an older expired lease even when the normal due query fills the batch.");
  assert(ledgerIds.has("forex_live_canary_stage29j_forex_projection_due_full_0") && ledgerIds.has("forex_live_canary_stage29j_forex_projection_due_full_1") && !ledgerIds.has("forex_live_canary_stage29j_forex_projection_due_full_2"), "Forex projection repair tie-breaks by global eligible time before applying the batch limit.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fair Forex expired-lease ordering performs zero credential loads and zero provider calls.");
}

async function runForexLedgerProjectionFairDueOrderingCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_fair_due_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection fair due ordering", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 3; index += 1) {
    await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, `expired_full_${index}`, {
      ledgerProjectionStatus: "in_progress",
      ledgerProjectionLeaseOwner: `expired_owner_${index}`,
      ledgerProjectionLeaseExpiresAt: `2026-09-01T00:0${index + 1}:00.000Z`,
      ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
      updatedAt: `2026-09-01T00:1${index}:00.000Z`
    }));
  }
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "older_due", {
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:30.000Z"
  }));

  const before = { ...providerCalls };
  const repair = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 3);
  const ledgers = await ledgerRecords(workspaceId, studentId);
  const ledgerIds = new Set(ledgers.map((entry) => entry.ledgerEntryId));
  assert(repair.attemptedCount === 3 && repair.repairedCount === 3 && ledgers.length === 3, "Forex projection repair remains bounded while merging full expired and due queues.");
  assert(ledgerIds.has("forex_live_canary_stage29j_forex_projection_older_due"), "Forex projection repair selects an older normal due item even when the expired-lease query fills the batch.");
  assert(ledgerIds.has("forex_live_canary_stage29j_forex_projection_expired_full_0") && ledgerIds.has("forex_live_canary_stage29j_forex_projection_expired_full_1") && !ledgerIds.has("forex_live_canary_stage29j_forex_projection_expired_full_2"), "Forex projection repair applies deterministic global ordering across due and expired work.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Fair Forex due ordering performs zero credential loads and zero provider calls.");
}

async function runForexLedgerProjectionClaimFinalFailedCoverage() {
  const forexRouting = loadTsModule("src/lib/crypto-execution/forex-live-canary-execution.ts");
  const workspaceId = "stage29j_forex_projection_claim_final_failed_ws";
  const studentId = "stage29j_student";
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Forex projection final failed", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedProjectionAttempt(`workspaces/${workspaceId}/forex_live_canary_order_attempts`, forexProjectionAttempt(workspaceId, studentId, "already_exhausted", {
    ledgerProjectionAttempts: 3,
    ledgerProjectionStatus: "retry_scheduled",
    ledgerProjectionNextAttemptAt: "2026-09-01T00:00:00.000Z"
  }));
  const before = { ...providerCalls };
  const repair = await forexRouting.repairPendingForexLedgerProjections(workspaceId, 10);
  const attempts = await collectionRecords(`workspaces/${workspaceId}/forex_live_canary_order_attempts`);
  assert(repair.attemptedCount === 0 && repair.finalFailedCount === 1, "Forex projection repair counts claim-time final_failed transitions without reporting a projection attempt.");
  assert(attempts[0].ledgerProjectionStatus === "final_failed" && !attempts[0].ledgerProjectionLeaseOwner, "Forex already-exhausted projection work becomes final_failed without an owner lease.");
  assert(providerCalls.cryptoBalance === before.cryptoBalance && providerCalls.cryptoOrders === before.cryptoOrders && providerCalls.forexOrders === before.forexOrders, "Forex claim-time final_failed repair performs zero credential loads and zero provider calls.");
}

async function runFeedPaginationCoverage() {
  const workspaceId = "stage29j_feed_pagination_ws";
  const studentId = "stage29j_student";
  const repository = loadTsModule("src/lib/student-app/student-signals-repository.ts");
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Stage 29J Feed Workspace", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });

  for (let index = 0; index < 250; index += 1) {
    const minutes = String(59 - (index % 60)).padStart(2, "0");
    const hours = String(12 - Math.floor(index / 60)).padStart(2, "0");
    await seedSignal(workspaceId, `stage29j_exact_${String(index).padStart(3, "0")}`, {
      market: index % 2 === 0 ? "crypto" : "forex",
      pair: index % 2 === 0 ? "BTCUSDT" : "EURUSD",
      updatedAt: `2026-09-06T${hours}:${minutes}:00.000Z`,
      publishedAt: `2026-09-06T${hours}:${minutes}:00.000Z`
    });
  }

  const seen = new Set();
  let cursor = "";
  let pageCount = 0;
  let lastPayload = null;
  do {
    const payload = await repository.listStudentSignalFeed(
      { workspaceId, studentId, uid: "stage29j_student_uid" },
      new Request(`http://localhost/api/student/signals?filter=all&limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`)
    );
    lastPayload = payload;
    payload.signals.forEach((signal) => {
      assert(!seen.has(signal.signalRef), "Stable equal-timestamp pagination does not duplicate a visible signal.");
      seen.add(signal.signalRef);
    });
    cursor = payload.pageInfo.nextCursor || "";
    pageCount += 1;
  } while (cursor && pageCount < 12);

  assert(seen.size === 250 && lastPayload?.pageInfo.hasMore === false && lastPayload?.pageInfo.truncated === false, "Exactly 250 visible direct signals page to the final page without false Load More or truncation.");

  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Stage 29J Feed Workspace", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  for (let index = 0; index < 260; index += 1) {
    const updatedAt = `2026-09-05T${String(23 - Math.floor(index / 60)).padStart(2, "0")}:${String(59 - (index % 60)).padStart(2, "0")}:00.000Z`;
    await seedSignal(workspaceId, `stage29j_mixed_${String(index).padStart(3, "0")}`, {
      source: index % 13 === 0 ? "telegram_channel" : "in_app",
      market: index === 248 || index === 249 || index % 5 === 0 ? "forex" : "crypto",
      pair: index === 248 || index === 249 || index % 5 === 0 ? "EURUSD" : "BTCUSDT",
      updatedAt,
      publishedAt: updatedAt
    });
  }
  const forexPayload = await repository.listStudentSignalFeed(
    { workspaceId, studentId, uid: "stage29j_student_uid" },
    new Request("http://localhost/api/student/signals?filter=forex&limit=25")
  );
  assert(forexPayload.signals.length > 0 && forexPayload.signals.every((signal) => signal.market === "forex"), "Sparse Forex filter finds matching records inside the disclosed 250-record scan cohort.");
  assert(forexPayload.pageInfo.truncated === true && forexPayload.notices.some((notice) => notice.includes("Older records may be omitted")), "More-than-250 mixed records disclose bounded-history truncation separately from Load More.");
}

async function runFeedExecutionCoverage() {
  const workspaceId = "stage29j_feed_execution_ws";
  const studentId = "stage29j_student";
  const ledger = loadTsModule("src/lib/journal/account-linked-performance-ledger.ts");
  const repository = loadTsModule("src/lib/student-app/student-signals-repository.ts");
  await seedWorkspaceStudent(workspaceId, studentId);
  await cleanupWorkspace(workspaceId, studentId);
  await db.doc(`workspaces/${workspaceId}`).set({ workspaceId, name: "Stage 29J QA Workspace", updatedAt: safeNow() }, { merge: true });
  await db.doc(`workspaces/${workspaceId}/students/${studentId}`).set({ studentId, status: "active", updatedAt: safeNow() }, { merge: true });
  await seedSignal(workspaceId, "stage29j_feed_crypto", { pair: "BTCUSDT", market: "crypto", updatedAt: "2026-09-07T08:30:00.000Z" });
  await seedSignal(workspaceId, "stage29j_feed_forex", { pair: "EURUSD", market: "forex", direction: "sell", lifecycle: "closed", updatedAt: "2026-09-07T08:29:00.000Z" });
  await seedSignal(workspaceId, "stage29j_feed_unknown_source", { source: "telegram", pair: "DOGEUSDT", updatedAt: "2026-09-07T08:31:00.000Z" });
  await seedSignal(workspaceId, "stage29j_feed_future_source", { source: "future_source", pair: "XRPUSDT", updatedAt: "2026-09-07T08:32:00.000Z" });
  for (let index = 0; index < 30; index += 1) {
    await seedSignal(workspaceId, `stage29j_feed_bulk_${String(index).padStart(2, "0")}`, {
      pair: index % 2 === 0 ? "SOLUSDT" : "XAUUSD",
      market: index % 2 === 0 ? "crypto" : "forex",
      lifecycle: index % 3 === 0 ? "closed" : "open",
      updatedAt: `2026-09-07T07:${String(index).padStart(2, "0")}:00.000Z`
    });
  }

  await ledger.writeAccountLinkedLedgerEntry(ledger.mapCryptoProductionAttemptToLedgerEntry({
    orderAttemptId: "stage29j_feed_attempt_crypto",
    intentId: "stage29j_feed_intent_crypto",
    signalId: "stage29j_feed_crypto",
    workspaceId,
    studentId,
    connectionId: "stage29j_feed_conn_crypto",
    exchange: "binance",
    environment: "production",
    executionMode: "live",
    symbol: "BTCUSDT",
    side: "buy",
    orderType: "market",
    status: "filled_live",
    idempotencyKey: "stage29j_feed_attempt_crypto",
    exchangeClientOrderId: "stage29j_feed_client_crypto",
    providerExecutionIdentity: "provider_order_exec_stage29j_feed_crypto",
    requestedQuantity: "0.01",
    authoritativePnl: {
      kind: "floating",
      value: 240,
      currency: "USD",
      authoritative: true,
      source: "provider_valuation",
      valuedAt: "2026-09-07T08:35:00.000Z"
    },
    updatedAt: "2026-09-07T08:35:00.000Z"
  }));
  await ledger.writeAccountLinkedLedgerEntry({
    ...ledger.mapForexLiveCanaryAttemptToLedgerEntry({
    attemptId: "stage29j_feed_attempt_forex",
    intentId: "stage29j_feed_intent_forex",
    signalId: "stage29j_feed_forex",
    workspaceId,
    studentId,
    connectionId: "stage29j_feed_conn_forex",
    provider: "metaapi",
    environment: "production",
    pair: "EURUSD",
    side: "sell",
    orderType: "market",
    status: "filled_live_forex_canary",
    volume: 0.01,
    requestedNotionalUsd: 5,
    providerOrderRef: "fx...feed",
    providerExecutionIdentity: "provider_order_exec_stage29j_feed_forex",
    updatedAt: "2026-09-07T08:34:00.000Z"
    }),
    status: "closed",
    journalLifecycle: "closed",
    providerClosureConfirmed: true,
    authoritativePnl: {
      kind: "realized",
      value: 94,
      currency: "USD",
      authoritative: true,
      source: "provider_closure",
      valuedAt: "2026-09-07T08:34:00.000Z"
    },
    updatedAt: "2026-09-07T08:34:00.000Z"
  });

  const response = await repository.listStudentSignalFeed({ workspaceId, studentId, uid: "stage29j_uid" }, new Request("http://localhost/api/student/signals?filter=all&limit=25"));
  const reloadedResponse = await repository.listStudentSignalFeed({ workspaceId, studentId, uid: "stage29j_uid" }, new Request("http://localhost/api/student/signals?filter=all&limit=25"));
  const cryptoSignal = response.signals.find((signal) => signal.symbol === "BTCUSDT");
  const forexSignal = response.signals.find((signal) => signal.symbol === "EURUSD");

  assert(response.signals.length === 25, "Executable Stage 29J feed QA returns the first bounded visible page.");
  assert(response.pageInfo.hasMore === true && typeof response.pageInfo.nextCursor === "string", "Executable Stage 29J feed QA exposes Load More only when a next visible page exists.");
  assert(!response.pageInfo.nextCursor.includes("stage29j"), "Executable Stage 29J feed QA cursor does not expose raw signal ids.");
  assert(response.signals.every((signal) => signal.symbol !== "DOGEUSDT" && signal.symbol !== "XRPUSDT"), "Executable Stage 29J feed QA hides unknown Telegram-like and future signal sources.");
  assert(cryptoSignal?.copied?.copiedState === "executed", "Executable Stage 29J QA maps a provider-confirmed crypto mapper output to the signal execution badge.");
  assert(cryptoSignal?.copied?.pnl?.value === 240 && cryptoSignal?.copied?.pnl?.currency === "USD", "Executable Stage 29J QA shows only typed authoritative floating P&L with explicit currency.");
  assert(forexSignal?.copied?.copiedState === "executed", "Executable Stage 29J QA maps a provider-confirmed Forex mapper output to the signal execution badge.");
  assert(forexSignal?.copied?.pnl?.value === 94 && forexSignal?.copied?.pnl?.currency === "USD", "Executable Stage 29J QA shows only typed authoritative realized P&L with explicit currency.");
  assert(JSON.stringify(response) === JSON.stringify(reloadedResponse), "Executable Stage 29J QA proves mapped executions survive reload/readback.");
}

async function main() {
  await assertEmulatorReachable();
  await runCryptoRoutingCoverage();
  await runCryptoFinalBoundaryRaceCoverage();
  await runCryptoLedgerProjectionFailureCoverage();
  await runCryptoLedgerProjectionRepairDiscoveryCoverage();
  await runCryptoLedgerProjectionDisabledGateCoverage();
  await runCryptoLedgerProjectionRetryBoundCoverage();
  await runCryptoLedgerProjectionConcurrentCoverage();
  await runCryptoLedgerProjectionFencedLateSuccessCoverage();
  await runCryptoLedgerProjectionFencedLateFailureCoverage();
  await runCryptoLedgerProjectionLeaseStarvationCoverage();
  await runCryptoLedgerProjectionFairExpiredOrderingCoverage();
  await runCryptoLedgerProjectionFairDueOrderingCoverage();
  await runCryptoLedgerProjectionClaimFinalFailedCoverage();
  await runForexRoutingCoverage();
  await runForexFinalBoundaryRaceCoverage();
  await runForexLedgerProjectionFailureCoverage();
  await runForexLedgerProjectionRepairDiscoveryCoverage();
  await runForexLedgerProjectionDisabledGateCoverage();
  await runForexLedgerProjectionRetryBoundCoverage();
  await runForexLedgerProjectionConcurrentCoverage();
  await runForexLedgerProjectionFencedLateSuccessCoverage();
  await runForexLedgerProjectionFencedLateFailureCoverage();
  await runForexLedgerProjectionLeaseStarvationCoverage();
  await runForexLedgerProjectionFairExpiredOrderingCoverage();
  await runForexLedgerProjectionFairDueOrderingCoverage();
  await runForexLedgerProjectionClaimFinalFailedCoverage();
  await runFeedPaginationCoverage();
  await runFeedExecutionCoverage();
  console.log("Stage 29J executable production routing/feed emulator QA passed.");
}

await main();
