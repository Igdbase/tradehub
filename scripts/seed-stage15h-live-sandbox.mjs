import {
  STAGE15F_FIXED_NOW,
  STAGE15F_PROJECT_ID,
  connectionDoc,
  ids,
  isoMinutes,
  preferencesDoc,
  signalDoc,
  studentDoc,
  subscriptionDoc,
  workspaceDoc
} from "./stage15f-paper-beta-fixtures.mjs";

const liveIds = {
  intents: {
    binanceReady: "live_sandbox_stage15h_binance_ready",
    bybitReady: "live_sandbox_stage15h_bybit_ready",
    productionRejected: "live_sandbox_stage15h_production_rejected",
    completedPreview: "live_sandbox_stage15h_completed_preview"
  },
  attempts: {
    completedPreview: "live_attempt_live_sandbox_stage15h_completed_preview_1"
  },
  reconciliations: {
    completedPreview: "reconcile_stage15h_completed_preview"
  }
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function configureEmulatorSafety() {
  if (process.env.TRADEHUB_ALLOW_LIVE_STAGE15H_SEED === "true") {
    fail("Stage 15H seed refuses live Firestore writes. Use the Firestore emulator for sandbox/testnet fixture data.");
  }

  process.env.GCLOUD_PROJECT ||= STAGE15F_PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: STAGE15F_PROJECT_ID });
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
}

const writes = [];

function batchSet(_batch, path, data) {
  writes.push({ path, data: stripUndefined(data) });
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    );
  }

  return value;
}

function encodeFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((entry) => encodeFirestoreValue(entry)) } };
  }

  return {
    mapValue: {
      fields: encodeFirestoreFields(value)
    }
  };
}

function encodeFirestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)])
  );
}

async function writeDocument(path, data) {
  const baseUrl = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${STAGE15F_PROJECT_ID}/databases/(default)/documents`;
  const response = await fetch(`${baseUrl}/${path}`, {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer owner",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to seed ${path}: ${response.status} ${body}`);
  }
}

async function commitWrites() {
  for (const write of writes) {
    await writeDocument(write.path, write.data);
  }
}

function liveConsent(studentId, overrides = {}) {
  return {
    workspaceId: ids.workspaceId,
    studentId,
    status: "accepted",
    consentVersion: "stage15h-live-sandbox-v1",
    acceptedAt: isoMinutes(-40),
    source: "fixture",
    personalExchangeConfirmed: true,
    notFundedOrPropFirmConfirmed: true,
    withdrawalsDisabledConfirmed: true,
    liveLossRiskConfirmed: true,
    updatedAt: STAGE15F_FIXED_NOW,
    ...overrides
  };
}

function livePreferences(studentId, overrides = {}) {
  return {
    workspaceId: ids.workspaceId,
    studentId,
    studentPaused: false,
    fixedNotionalUsdt: 10,
    maxDailyNotionalUsdt: 30,
    maxOpenOrders: 1,
    allowedSymbols: ["BTCUSDT", "ETHUSDT"],
    updatedAt: STAGE15F_FIXED_NOW,
    updatedBy: "stage15h-seed",
    ...overrides
  };
}

function liveIntent({
  intentId,
  signalId,
  studentId,
  connectionId,
  exchange,
  symbol,
  side,
  environment = "sandbox",
  status = "ready_for_live",
  updatedAt = STAGE15F_FIXED_NOW
}) {
  return {
    intentId,
    workspaceId: ids.workspaceId,
    signalId,
    studentId,
    connectionId,
    exchange,
    environment,
    executionMode: "live_sandbox",
    market: "crypto",
    symbol,
    side,
    orderType: "market",
    quoteOrderQty: "10.00",
    notionalUsdt: 10,
    status,
    idempotencyKey: `crypto-live-sandbox-intent:${ids.workspaceId}:${signalId}:${studentId}:${connectionId}:stage15h`,
    sourceSignalVersion: isoMinutes(-10),
    liveGateDecisionId: `live_gate_${intentId}`,
    exchangeClientOrderId: `thl_stage15h_${intentId.slice(-24)}`,
    entitlementSnapshot: {
      tierId: "pro_auto_copy",
      tierLabel: "Pro Auto-Copy",
      subscriptionStatus: "active",
      riskPosture: "personal_account",
      autoCopyAccess: "allowed"
    },
    gateSnapshot: {
      platformSandboxEnabled: true,
      workspaceSandboxEnabled: true,
      studentAllowlisted: true,
      exchangeAllowlisted: true,
      symbolAllowlisted: true,
      productionBlocked: true
    },
    createdAt: isoMinutes(-20),
    updatedAt,
    expiresAt: isoMinutes(40)
  };
}

function liveGateDecision(intentId, status, checks) {
  return {
    decisionId: `live_gate_${intentId}`,
    workspaceId: ids.workspaceId,
    intentId,
    signalId: ids.signals.buyValid,
    status,
    checks,
    blockedReason: status === "blocked" ? checks.find((check) => check.status === "blocked")?.message : undefined,
    decidedAt: STAGE15F_FIXED_NOW,
    decidedBy: "stage15h-qa"
  };
}

function auditEvent(eventId, action, targetType, targetId, message, overrides = {}) {
  return {
    eventId,
    action,
    actorType: "system",
    actorId: "stage15h-seed",
    workspaceId: ids.workspaceId,
    targetType,
    targetId,
    safeMessage: message,
    severity: "info",
    createdAt: STAGE15F_FIXED_NOW,
    ...overrides
  };
}

configureEmulatorSafety();

const batch = null;
const { workspaceId } = ids;

batchSet(batch, `workspaces/${workspaceId}`, workspaceDoc());
batchSet(batch, `workspaces/${workspaceId}/dashboard/current`, {
  workspaceId,
  ownerApprovalStatus: "approved",
  activeStudentCount: Object.keys(ids.students).length,
  healthStatus: "healthy",
  updatedAt: STAGE15F_FIXED_NOW
});

batchSet(batch, "platform_live_execution_controls/current", {
  scope: "platform",
  sandboxTestnetEnabled: true,
  killSwitchEnabled: false,
  allowedExchanges: ["binance", "bybit"],
  allowedSymbols: ["BTCUSDT", "ETHUSDT"],
  maxNotionalUsdt: 10,
  maxDailyNotionalUsdt: 30,
  maxOpenOrdersPerStudent: 1,
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15h-seed"
});
batchSet(batch, `workspaces/${workspaceId}/live_execution_controls/current`, {
  scope: "workspace",
  workspaceId,
  sandboxTestnetEnabled: true,
  killSwitchEnabled: false,
  allowedExchanges: ["binance", "bybit"],
  allowedSymbols: ["BTCUSDT", "ETHUSDT"],
  maxNotionalUsdt: 10,
  maxDailyNotionalUsdt: 30,
  maxOpenOrdersPerStudent: 1,
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15h-seed"
});
batchSet(batch, `workspaces/${workspaceId}/live_allowlists/students`, {
  workspaceId,
  allowlistId: "students",
  studentIds: [ids.students.binanceSandbox, ids.students.bybitSandbox, ids.students.sandboxPreferred],
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15h-seed"
});
batchSet(batch, `workspaces/${workspaceId}/live_allowlists/exchanges`, {
  workspaceId,
  allowlistId: "exchanges",
  exchanges: ["binance", "bybit"],
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15h-seed"
});
batchSet(batch, `workspaces/${workspaceId}/live_allowlists/symbols`, {
  workspaceId,
  allowlistId: "symbols",
  symbols: ["BTCUSDT", "ETHUSDT"],
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15h-seed"
});

const seededStudents = [
  ids.students.binanceSandbox,
  ids.students.bybitSandbox,
  ids.students.sandboxPreferred,
  ids.students.fundedBlocked,
  ids.students.paused,
  ids.students.unconnected
];

for (const studentId of seededStudents) {
  const funded = studentId === ids.students.fundedBlocked;
  const paused = studentId === ids.students.paused;

  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}`, studentDoc(studentId, funded
    ? {
        accountMode: "signal_alerts",
        brokerLink: { type: "prop_firm", exchange: "mt5", status: "unlinked" },
        autoCopyEligible: false
      }
    : {}));
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}/subscriptions/current`, subscriptionDoc(studentId));
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}/execution_preferences/current`, preferencesDoc(studentId));
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}/live_consents/current`, liveConsent(studentId, funded
    ? { status: "not_started", notFundedOrPropFirmConfirmed: false }
    : paused
      ? { status: "paused", pausedAt: isoMinutes(-5) }
      : {}));
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}/live_execution_preferences/current`, livePreferences(studentId, paused
    ? { studentPaused: true }
    : {}));
}

batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/${ids.connections.binanceSandbox}`, connectionDoc({
  connectionId: ids.connections.binanceSandbox,
  studentId: ids.students.binanceSandbox,
  exchange: "binance",
  environment: "sandbox",
  keyFingerprint: "stage15h_binance_sandbox_fp"
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.bybitSandbox}/exchange_connections/${ids.connections.bybitSandbox}`, connectionDoc({
  connectionId: ids.connections.bybitSandbox,
  studentId: ids.students.bybitSandbox,
  exchange: "bybit",
  environment: "sandbox",
  keyFingerprint: "stage15h_bybit_sandbox_fp"
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.sandboxPreferred}/exchange_connections/${ids.connections.preferredSandbox}`, connectionDoc({
  connectionId: ids.connections.preferredSandbox,
  studentId: ids.students.sandboxPreferred,
  exchange: "binance",
  environment: "sandbox",
  keyFingerprint: "stage15h_preferred_sandbox_fp",
  updatedAt: isoMinutes(-90)
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.sandboxPreferred}/exchange_connections/${ids.connections.preferredProduction}`, connectionDoc({
  connectionId: ids.connections.preferredProduction,
  studentId: ids.students.sandboxPreferred,
  exchange: "binance",
  environment: "production",
  keyFingerprint: "stage15h_preferred_production_fp",
  updatedAt: isoMinutes(-5)
}));

batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.buyValid}`, signalDoc(ids.signals.buyValid));
batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.sellValid}`, signalDoc(ids.signals.sellValid, {
  pair: "ETHUSDT",
  direction: "sell",
  entry: "100",
  takeProfit: "90",
  stopLoss: "105"
}));

const readyIntents = [
  liveIntent({
    intentId: liveIds.intents.binanceReady,
    signalId: ids.signals.buyValid,
    studentId: ids.students.binanceSandbox,
    connectionId: ids.connections.binanceSandbox,
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy"
  }),
  liveIntent({
    intentId: liveIds.intents.bybitReady,
    signalId: ids.signals.sellValid,
    studentId: ids.students.bybitSandbox,
    connectionId: ids.connections.bybitSandbox,
    exchange: "bybit",
    symbol: "ETHUSDT",
    side: "sell"
  }),
  liveIntent({
    intentId: liveIds.intents.productionRejected,
    signalId: ids.signals.buyValid,
    studentId: ids.students.sandboxPreferred,
    connectionId: ids.connections.preferredProduction,
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    environment: "production",
    updatedAt: isoMinutes(-1)
  })
];

for (const intent of readyIntents) {
  batchSet(batch, `workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`, intent);
  batchSet(batch, `workspaces/${workspaceId}/live_gate_decisions/live_gate_${intent.intentId}`, liveGateDecision(intent.intentId, intent.environment === "sandbox" ? "allowed" : "blocked", [
    { key: "environment", status: intent.environment === "sandbox" ? "allowed" : "blocked", message: "Testnet worker accepts sandbox/testnet connections only." }
  ]));
}

const completedIntent = liveIntent({
  intentId: liveIds.intents.completedPreview,
  signalId: ids.signals.buyValid,
  studentId: ids.students.binanceSandbox,
  connectionId: ids.connections.binanceSandbox,
  exchange: "binance",
  symbol: "BTCUSDT",
  side: "buy",
  status: "filled_live",
  updatedAt: isoMinutes(-2)
});
batchSet(batch, `workspaces/${workspaceId}/live_execution_intents/${completedIntent.intentId}`, completedIntent);
batchSet(batch, `workspaces/${workspaceId}/live_order_attempts/${liveIds.attempts.completedPreview}`, {
  orderAttemptId: liveIds.attempts.completedPreview,
  workspaceId,
  intentId: completedIntent.intentId,
  signalId: completedIntent.signalId,
  studentId: completedIntent.studentId,
  connectionId: completedIntent.connectionId,
  exchange: completedIntent.exchange,
  environment: "sandbox",
  executionMode: "live_sandbox",
  symbol: completedIntent.symbol,
  side: completedIntent.side,
  orderType: "market",
  status: "filled_live",
  idempotencyKey: `${completedIntent.idempotencyKey}:attempt:1`,
  exchangeClientOrderId: completedIntent.exchangeClientOrderId,
  exchangeOrderId: "stage15h_testnet_order_preview",
  requestedQuoteOrderQty: "10.00",
  submittedAt: isoMinutes(-3),
  acknowledgedAt: isoMinutes(-3),
  completedAt: isoMinutes(-2),
  updatedAt: isoMinutes(-2)
});
batchSet(batch, `workspaces/${workspaceId}/live_reconciliation_records/${liveIds.reconciliations.completedPreview}`, {
  reconciliationId: liveIds.reconciliations.completedPreview,
  workspaceId,
  intentId: completedIntent.intentId,
  orderAttemptId: liveIds.attempts.completedPreview,
  exchange: "binance",
  environment: "sandbox",
  status: "reconciled",
  normalizedOrderStatus: "filled_live",
  safeMessage: "Testnet order was reconciled as filled in sandbox/testnet preview data.",
  checkedAt: isoMinutes(-2),
  updatedAt: isoMinutes(-2)
});

batchSet(batch, `workspaces/${workspaceId}/live_execution_audit_events/audit_stage15h_seed_ready`, auditEvent(
  "audit_stage15h_seed_ready",
  "live_sandbox.seed.ready",
  "live_execution_intent",
  liveIds.intents.binanceReady,
  "Testnet lifecycle QA data is ready."
));

await commitWrites();

console.log("Stage 15H live sandbox seed completed.");
console.log(`Workspace: ${workspaceId}`);
console.log(`Ready sandbox intents: ${liveIds.intents.binanceReady}, ${liveIds.intents.bybitReady}`);
console.log(`Production rejection fixture: ${liveIds.intents.productionRejected}`);
console.log("No API keys, secrets, encrypted blobs, or credential refs were seeded.");
