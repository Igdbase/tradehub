import {
  STAGE15F_FIXED_NOW,
  STAGE15F_PROJECT_ID,
  connectionDoc,
  ids,
  isoMinutes,
  signalDoc,
  studentDoc,
  subscriptionDoc,
  workspaceDoc
} from "./stage15f-paper-beta-fixtures.mjs";

const stage15i = {
  intents: {
    dryRunReady: "live_prod_stage15i_dry_run_ready",
    missingVaultBlocked: "live_prod_stage15i_missing_vault_blocked",
    withdrawalBlocked: "live_prod_stage15i_withdrawal_blocked",
    stalePermissionBlocked: "live_prod_stage15i_stale_permission_blocked",
    sandboxRefused: "live_prod_stage15i_sandbox_refused",
    submittedUnsettled: "live_prod_stage15i_submitted_unsettled",
    filledTerminal: "live_prod_stage15i_filled_terminal"
  },
  attempts: {
    dryRunReady: "live_prod_attempt_live_prod_stage15i_dry_run_ready_1",
    submittedUnsettled: "live_prod_attempt_live_prod_stage15i_submitted_unsettled_1",
    filledTerminal: "live_prod_attempt_live_prod_stage15i_filled_terminal_1",
    sandboxRefused: "live_prod_attempt_live_prod_stage15i_sandbox_refused_1"
  },
  connections: {
    productionBinance: "conn_stage15i_binance_production",
    withdrawalEnabled: "conn_stage15i_withdrawal_enabled",
    stalePermission: "conn_stage15i_stale_permission"
  },
  students: {
    trial: "student_stage15i_trial_blocked",
    pastDue: "student_stage15i_past_due_blocked",
    revokedConsent: "student_stage15i_revoked_consent",
    unallowlisted: "student_stage15i_unallowlisted"
  }
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function configureEmulatorSafety() {
  if (process.env.TRADEHUB_ALLOW_LIVE_STAGE15I_SEED === "true") {
    fail("Stage 15I seed refuses live Firestore writes. Use the Firestore emulator for production-beta fixture data.");
  }

  process.env.GCLOUD_PROJECT ||= STAGE15F_PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: STAGE15F_PROJECT_ID });
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
}

const writes = [];

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

function batchSet(path, data) {
  writes.push({ path, data: stripUndefined(data) });
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
      fields: Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, encodeFirestoreValue(entry)])
      )
    }
  };
}

async function writeDocument(path, data) {
  const baseUrl = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${STAGE15F_PROJECT_ID}/databases/(default)/documents`;
  const response = await fetch(`${baseUrl}/${path}`, {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer owner",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)])
      )
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to seed ${path}: ${response.status} ${await response.text()}`);
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
    acceptedAt: isoMinutes(-45),
    productionStatus: "accepted",
    productionConsentVersion: "stage15i-production-live-v1",
    productionRiskDisclosureVersion: "stage15i-live-risk-v1",
    productionAcceptedAt: isoMinutes(-40),
    source: "fixture",
    personalExchangeConfirmed: true,
    notFundedOrPropFirmConfirmed: true,
    withdrawalsDisabledConfirmed: true,
    liveLossRiskConfirmed: true,
    productionLiveLossRiskConfirmed: true,
    tradeHubNoCustodyConfirmed: true,
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
    maxDailyNotionalUsdt: 25,
    maxOpenOrders: 1,
    allowedSymbols: ["BTCUSDT"],
    updatedAt: STAGE15F_FIXED_NOW,
    updatedBy: "stage15i-seed",
    ...overrides
  };
}

function productionIntent({ intentId, studentId, connectionId, status = "ready_for_live", environment = "production", executionMode = "live" }) {
  return {
    intentId,
    workspaceId: ids.workspaceId,
    signalId: ids.signals.buyValid,
    studentId,
    connectionId,
    exchange: "binance",
    environment,
    executionMode,
    market: "crypto",
    symbol: "BTCUSDT",
    side: "buy",
    orderType: "market",
    quoteOrderQty: "10.00",
    notionalUsdt: 10,
    status,
    idempotencyKey: `crypto-live-production-intent:${ids.workspaceId}:${ids.signals.buyValid}:${studentId}:${connectionId}:stage15i`,
    sourceSignalVersion: isoMinutes(-10),
    liveGateDecisionId: `live_gate_${intentId}`,
    exchangeClientOrderId: `thp_stage15i_${intentId.slice(-24)}`,
    entitlementSnapshot: {
      tierId: "pro_auto_copy",
      tierLabel: "Pro Auto-Copy",
      subscriptionStatus: "active",
      riskPosture: "personal_account",
      autoCopyAccess: "allowed"
    },
    gateSnapshot: {
      platformProductionBetaEnabled: true,
      workspaceProductionBetaEnabled: true,
      studentAllowlisted: true,
      exchangeAllowlisted: true,
      symbolAllowlisted: true,
      productionVaultReady: true,
      dryRun: true,
      maxOrderUsdt: 10
    },
    createdAt: isoMinutes(-20),
    updatedAt: STAGE15F_FIXED_NOW,
    expiresAt: isoMinutes(30)
  };
}

function productionAttempt({ attemptId, intentId, status, studentId = ids.students.binanceSandbox, environment = "production", executionMode = "live" }) {
  return {
    orderAttemptId: attemptId,
    workspaceId: ids.workspaceId,
    intentId,
    signalId: ids.signals.buyValid,
    studentId,
    connectionId: stage15i.connections.productionBinance,
    exchange: "binance",
    environment,
    executionMode,
    symbol: "BTCUSDT",
    side: "buy",
    orderType: "market",
    status,
    idempotencyKey: `crypto-live-production-intent:${ids.workspaceId}:${ids.signals.buyValid}:${studentId}:attempt:1`,
    exchangeClientOrderId: `thp_stage15i_${intentId.slice(-24)}`,
    exchangeOrderRef: "ord...safe",
    requestedQuoteOrderQty: "10.00",
    sanitizedFailureCode: status === "dry_run_live" ? "production_dry_run" : undefined,
    sanitizedFailureReason: status === "dry_run_live" ? "Production dry-run recorded a safe no-exchange-call attempt." : undefined,
    submittedAt: isoMinutes(-5),
    acknowledgedAt: isoMinutes(-5),
    completedAt: status === "filled_live" || status === "dry_run_live" ? isoMinutes(-4) : undefined,
    updatedAt: STAGE15F_FIXED_NOW
  };
}

function gateDecision(intentId, status, checks) {
  return {
    decisionId: `live_gate_${intentId}`,
    workspaceId: ids.workspaceId,
    intentId,
    signalId: ids.signals.buyValid,
    environment: "production",
    executionMode: "live",
    status,
    checks,
    blockedReason: status === "blocked" ? checks.find((check) => check.status === "blocked")?.message : undefined,
    decidedAt: STAGE15F_FIXED_NOW,
    decidedBy: "stage15i-fixture"
  };
}

function auditEvent(eventId, action, targetType, targetId, message) {
  return {
    eventId,
    action,
    actorType: "system",
    actorId: "stage15i-seed",
    workspaceId: ids.workspaceId,
    targetType,
    targetId,
    safeMessage: message,
    severity: "warning",
    createdAt: STAGE15F_FIXED_NOW
  };
}

configureEmulatorSafety();

batchSet(`workspaces/${ids.workspaceId}`, workspaceDoc());
batchSet(`workspaces/${ids.workspaceId}/dashboard/current`, {
  workspaceId: ids.workspaceId,
  ownerApprovalStatus: "approved",
  activeStudentCount: 8,
  healthStatus: "healthy",
  updatedAt: STAGE15F_FIXED_NOW
});
batchSet("platform_live_execution_controls/current", {
  scope: "platform",
  sandboxTestnetEnabled: true,
  productionBetaEnabled: true,
  productionOrdersEnabled: false,
  productionDryRun: true,
  killSwitchEnabled: false,
  allowedExchanges: ["binance"],
  allowedSymbols: ["BTCUSDT"],
  maxOrderUsdt: 10,
  maxDailyNotionalUsdt: 25,
  maxOpenOrdersPerStudent: 1,
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15i-seed"
});
batchSet(`workspaces/${ids.workspaceId}/live_execution_controls/current`, {
  scope: "workspace",
  workspaceId: ids.workspaceId,
  sandboxTestnetEnabled: true,
  productionBetaEnabled: true,
  productionOrdersEnabled: false,
  productionDryRun: true,
  killSwitchEnabled: false,
  allowedExchanges: ["binance"],
  allowedSymbols: ["BTCUSDT"],
  maxOrderUsdt: 10,
  maxDailyNotionalUsdt: 25,
  maxOpenOrdersPerStudent: 1,
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15i-seed"
});
batchSet(`workspaces/${ids.workspaceId}/live_allowlists/production_students`, {
  workspaceId: ids.workspaceId,
  allowlistId: "production_students",
  studentIds: [ids.students.binanceSandbox],
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15i-seed"
});
batchSet(`workspaces/${ids.workspaceId}/live_allowlists/production_exchanges`, {
  workspaceId: ids.workspaceId,
  allowlistId: "production_exchanges",
  exchanges: ["binance"],
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15i-seed"
});
batchSet(`workspaces/${ids.workspaceId}/live_allowlists/production_symbols`, {
  workspaceId: ids.workspaceId,
  allowlistId: "production_symbols",
  symbols: ["BTCUSDT"],
  updatedAt: STAGE15F_FIXED_NOW,
  updatedBy: "stage15i-seed"
});
batchSet(`workspaces/${ids.workspaceId}/signals/${ids.signals.buyValid}`, signalDoc(ids.signals.buyValid));

const seededStudents = [
  ids.students.binanceSandbox,
  ids.students.fundedBlocked,
  stage15i.students.trial,
  stage15i.students.pastDue,
  stage15i.students.revokedConsent,
  stage15i.students.unallowlisted
];

for (const studentId of seededStudents) {
  const overrides =
    studentId === ids.students.fundedBlocked
      ? { brokerLink: { type: "prop_firm", status: "linked" }, accountMode: "signal_alerts" }
      : {};
  batchSet(`workspaces/${ids.workspaceId}/students/${studentId}`, studentDoc(studentId, overrides));
  batchSet(
    `workspaces/${ids.workspaceId}/students/${studentId}/subscriptions/current`,
    subscriptionDoc(studentId, studentId === stage15i.students.trial
      ? { status: "trial" }
      : studentId === stage15i.students.pastDue
        ? { status: "past_due" }
        : {})
  );
  batchSet(`workspaces/${ids.workspaceId}/students/${studentId}/live_consents/current`, liveConsent(studentId, studentId === stage15i.students.revokedConsent ? { productionStatus: "revoked" } : {}));
  batchSet(`workspaces/${ids.workspaceId}/students/${studentId}/live_execution_preferences/current`, livePreferences(studentId));
}

batchSet(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/${stage15i.connections.productionBinance}`, connectionDoc({
  connectionId: stage15i.connections.productionBinance,
  studentId: ids.students.binanceSandbox,
  exchange: "binance",
  environment: "production",
  keyFingerprint: "stage15i-prod-safe-fp"
}));
batchSet(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/${stage15i.connections.withdrawalEnabled}`, {
  ...connectionDoc({
    connectionId: stage15i.connections.withdrawalEnabled,
    studentId: ids.students.binanceSandbox,
    exchange: "binance",
    environment: "production",
    keyFingerprint: "stage15i-withdrawal-safe-fp"
  }),
  withdrawalPermission: "detected_enabled",
  permissionVerification: "failed"
});
batchSet(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/${stage15i.connections.stalePermission}`, {
  ...connectionDoc({
    connectionId: stage15i.connections.stalePermission,
    studentId: ids.students.binanceSandbox,
    exchange: "binance",
    environment: "production",
    keyFingerprint: "stage15i-stale-safe-fp"
  }),
  permissionVerification: "stale",
  lastVerifiedAt: isoMinutes(-60 * 48)
});

for (const intent of [
  productionIntent({ intentId: stage15i.intents.dryRunReady, studentId: ids.students.binanceSandbox, connectionId: stage15i.connections.productionBinance }),
  productionIntent({ intentId: stage15i.intents.submittedUnsettled, studentId: ids.students.binanceSandbox, connectionId: stage15i.connections.productionBinance, status: "submitted_live" }),
  productionIntent({ intentId: stage15i.intents.filledTerminal, studentId: ids.students.binanceSandbox, connectionId: stage15i.connections.productionBinance, status: "filled_live" }),
  productionIntent({ intentId: stage15i.intents.sandboxRefused, studentId: ids.students.binanceSandbox, connectionId: ids.connections.binanceSandbox, environment: "sandbox", executionMode: "live_sandbox" })
]) {
  batchSet(`workspaces/${ids.workspaceId}/live_execution_intents/${intent.intentId}`, intent);
}

batchSet(`workspaces/${ids.workspaceId}/live_order_attempts/${stage15i.attempts.dryRunReady}`, productionAttempt({
  attemptId: stage15i.attempts.dryRunReady,
  intentId: stage15i.intents.dryRunReady,
  status: "dry_run_live"
}));
batchSet(`workspaces/${ids.workspaceId}/live_order_attempts/${stage15i.attempts.submittedUnsettled}`, productionAttempt({
  attemptId: stage15i.attempts.submittedUnsettled,
  intentId: stage15i.intents.submittedUnsettled,
  status: "submitted_live"
}));
batchSet(`workspaces/${ids.workspaceId}/live_order_attempts/${stage15i.attempts.filledTerminal}`, productionAttempt({
  attemptId: stage15i.attempts.filledTerminal,
  intentId: stage15i.intents.filledTerminal,
  status: "filled_live"
}));
batchSet(`workspaces/${ids.workspaceId}/live_order_attempts/${stage15i.attempts.sandboxRefused}`, productionAttempt({
  attemptId: stage15i.attempts.sandboxRefused,
  intentId: stage15i.intents.sandboxRefused,
  status: "submitted_live",
  environment: "sandbox",
  executionMode: "live_sandbox"
}));

batchSet(`workspaces/${ids.workspaceId}/live_gate_decisions/live_gate_${stage15i.intents.missingVaultBlocked}`, gateDecision(stage15i.intents.missingVaultBlocked, "blocked", [
  { key: "production_vault_ready", status: "blocked", message: "Production credential vault is unavailable." }
]));
batchSet(`workspaces/${ids.workspaceId}/live_gate_decisions/live_gate_${stage15i.intents.withdrawalBlocked}`, gateDecision(stage15i.intents.withdrawalBlocked, "blocked", [
  { key: "withdrawal_permission", status: "blocked", message: "Withdrawal permission must be confirmed disabled." }
]));
batchSet(`workspaces/${ids.workspaceId}/live_gate_decisions/live_gate_${stage15i.intents.stalePermissionBlocked}`, gateDecision(stage15i.intents.stalePermissionBlocked, "blocked", [
  { key: "connection_freshness", status: "blocked", message: "Production permission verification must be fresh." }
]));

batchSet(`workspaces/${ids.workspaceId}/live_execution_audit_events/stage15i_dry_run`, auditEvent(
  "stage15i_dry_run",
  "live_production.order.dry_run",
  "live_order_attempt",
  stage15i.attempts.dryRunReady,
  "Production dry-run recorded a safe no-exchange-call attempt."
));

await commitWrites();

console.log("Stage 15I production live beta fixtures seeded.");
console.log(`Workspace: ${ids.workspaceId}`);
console.log(`Dry-run ready intent: ${stage15i.intents.dryRunReady}`);
console.log(`Unsettled production attempt: ${stage15i.attempts.submittedUnsettled}`);
console.log("No production API keys, secrets, encrypted blobs, or credential refs were seeded.");
