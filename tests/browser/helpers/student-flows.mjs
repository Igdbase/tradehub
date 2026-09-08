import { expect } from "@playwright/test";
import crypto from "node:crypto";
import {
  assertNoForbiddenRenderedText,
  assertSafeRoleBoundary,
  assertTradeHubPageHealthy
} from "./assertions.mjs";
import { demoUsers, waitForSettledApplicationPath } from "./auth.mjs";

export const demoStudentIds = {
  courseId: "course_demo_foundations",
  practiceSessionId: "practice_demo_closed_session",
  manualTradeId: "manual_aaaaaaaaaaaaaaaaaaaaaaaa"
};

export const connectedJournalFixtureIds = [
  "stage29f_browser_open",
  "stage29f_browser_filled_entry",
  "stage29f_browser_partial",
  "stage29f_browser_closed_win",
  "stage29f_browser_closed_loss"
];

export const cryptoJournalSyncFixtureIds = {
  connectionId: `journal_crypto_${crypto
    .createHash("sha256")
    .update(["ws_demo_pro", "student_demo_active", "binance", "Stage 29G browser sync"].join("|"))
    .digest("hex")
    .slice(0, 28)}`,
  connectionRef: "",
  legacyConnectionId: "stage29g_browser_journal_crypto_connection",
  legacyOpenImportId: "stage29g_browser_journal_crypto_open",
  legacyClosedImportId: "stage29g_browser_journal_crypto_closed"
};
cryptoJournalSyncFixtureIds.connectionRef = `journal_conn_${crypto
  .createHash("sha256")
  .update(cryptoJournalSyncFixtureIds.connectionId)
  .digest("hex")
  .slice(0, 12)}`;

export const practiceAnalyticsLossFixtureIds = {
  sessionId: "stage29f_browser_practice_loss_session",
  orderId: "stage29f_browser_practice_loss_order"
};

export const practiceAnalyticsUnmatchedFixtureIds = {
  missingSessionId: "stage29f_browser_practice_missing_session",
  orderId: "stage29f_browser_practice_unmatched_order"
};

export const studentSignalFixtureIds = {
  cryptoOpen: "stage29j_browser_crypto_open",
  forexOpen: "stage29j_browser_forex_open",
  cryptoCancelled: "stage29j_browser_crypto_cancelled",
  forexClosed: "stage29j_browser_forex_closed",
  externalPreview: "stage29j_browser_external_preview",
  externalTelegramLike: "stage29j_browser_external_telegram_like",
  externalUnknown: "stage29j_browser_external_unknown",
  equalTimestampA: "stage29j_browser_equal_a",
  equalTimestampB: "stage29j_browser_equal_b",
  cryptoExecution: "stage29j_browser_crypto_execution",
  forexExecution: "stage29j_browser_forex_execution",
  wrongMarketExecution: "stage29j_browser_wrong_market_execution",
  paperExecution: "stage29j_browser_paper_execution",
  missingCurrencyExecution: "stage29j_browser_missing_currency_execution",
  unconfirmedExecution: "stage29j_browser_unconfirmed_execution"
};

const connectedJournalFixturePath =
  "workspaces/ws_demo_pro/students/student_demo_active/account_linked_trade_ledger";
const studentSignalsFixturePath = "workspaces/ws_demo_pro/signals";

function encodeFirestoreValue(value) {
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (value && typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, encodeFirestoreValue(nestedValue)])) } };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
}

export async function writeEmulatorDocument(page, documentPath, record) {
  const response = await page.request.patch(
    `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${documentPath}`,
    {
      headers: { Authorization: "Bearer owner" },
      data: { fields: Object.fromEntries(Object.entries(record).map(([key, value]) => [key, encodeFirestoreValue(value)])) }
    }
  );
  expect(response.ok(), `emulator fixture ${documentPath} should be writable`).toBeTruthy();
}

export async function patchEmulatorDocumentFields(page, documentPath, record) {
  const mask = Object.keys(record)
    .map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`)
    .join("&");
  const response = await page.request.patch(
    `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${documentPath}?${mask}`,
    {
      headers: { Authorization: "Bearer owner" },
      data: { fields: Object.fromEntries(Object.entries(record).map(([key, value]) => [key, encodeFirestoreValue(value)])) }
    }
  );
  expect(response.ok(), `emulator fixture ${documentPath} fields should be patchable`).toBeTruthy();
}

async function deleteEmulatorDocument(page, documentPath) {
  const response = await page.request.delete(
    `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${documentPath}`,
    { headers: { Authorization: "Bearer owner" } }
  );
  expect([200, 404]).toContain(response.status());
}

async function listEmulatorCollection(page, collectionPath) {
  const response = await page.request.get(
    `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${collectionPath}`,
    { headers: { Authorization: "Bearer owner" } }
  );
  if (response.status() === 404) return [];
  expect(response.ok(), `emulator fixture ${collectionPath} should be readable`).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload.documents) ? payload.documents : [];
}

export async function deleteCollectionDocuments(page, collectionPath, predicate = () => true) {
  const docs = await listEmulatorCollection(page, collectionPath);
  for (const doc of docs) {
    const name = typeof doc.name === "string" ? doc.name : "";
    const id = decodeURIComponent(name.split("/").at(-1) ?? "");
    if (id && predicate(id, doc)) {
      await deleteEmulatorDocument(page, `${collectionPath}/${id}`);
    }
  }
}

export async function clearCryptoJournalSyncFixtures(page) {
  const basePath = "workspaces/ws_demo_pro/students/student_demo_active";
  const generations = await listEmulatorCollection(page, `${basePath}/journal_crypto_import_generations`);
  for (const generation of generations) {
    const fields = generation.fields ?? {};
    const generationConnectionRef = fields.connectionRef?.stringValue ?? "";
    const name = typeof generation.name === "string" ? generation.name : "";
    const generationId = decodeURIComponent(name.split("/").at(-1) ?? "");
    if (!generationId || (generationConnectionRef && generationConnectionRef !== cryptoJournalSyncFixtureIds.connectionRef)) continue;
    await deleteCollectionDocuments(page, `${basePath}/journal_crypto_import_generations/${generationId}/entries`);
    await deleteEmulatorDocument(page, `${basePath}/journal_crypto_import_generations/${generationId}`);
  }
  await deleteEmulatorDocument(page, `${basePath}/journal_crypto_connections/${cryptoJournalSyncFixtureIds.connectionId}`);
  await deleteEmulatorDocument(page, `${basePath}/journal_crypto_connections/${cryptoJournalSyncFixtureIds.legacyConnectionId}`);
  await deleteEmulatorDocument(page, `journal_crypto_keys/ws_demo_pro/students/student_demo_active/connections/${cryptoJournalSyncFixtureIds.connectionId}`);
  await deleteEmulatorDocument(page, `journal_crypto_keys/ws_demo_pro/students/student_demo_active/connections/${cryptoJournalSyncFixtureIds.legacyConnectionId}`);
  await deleteEmulatorDocument(page, `${basePath}/account_linked_trade_ledger/${cryptoJournalSyncFixtureIds.legacyOpenImportId}`);
  await deleteEmulatorDocument(page, `${basePath}/account_linked_trade_ledger/${cryptoJournalSyncFixtureIds.legacyClosedImportId}`);
  await deleteCollectionDocuments(page, `${basePath}/journal_crypto_sync_runs`, (id) => id.startsWith(cryptoJournalSyncFixtureIds.connectionId) || id.startsWith(cryptoJournalSyncFixtureIds.legacyConnectionId));
  await deleteCollectionDocuments(page, `${basePath}/account_linked_trade_ledger`, (id) => id.startsWith("journal_crypto_"));
}

const copierStudentPath = "workspaces/ws_demo_pro/students/student_demo_active";
const copierWorkspacePath = "workspaces/ws_demo_pro";

const demoCoreTierWithoutCopier = [
  {
    tierId: "demo_core",
    name: "Demo Core Access",
    description: "Courses, practice, journal, assignments, and safe support visibility.",
    priceNgn: 0,
    billingPeriod: "monthly",
    features: ["course", "signalAlerts", "journal", "calculators"],
    featured: true
  }
];

const demoCoreTierWithCopier = [
  {
    ...demoCoreTierWithoutCopier[0],
    features: ["course", "signalAlerts", "autoCopy", "journal", "calculators"]
  }
];

export async function clearCopierBrowserFixtures(page) {
  await deleteEmulatorDocument(page, `${copierStudentPath}/trade_copier_subscriptions/current`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/crypto_autocopy_subscriptions/current`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/forex_autocopy_subscriptions/current`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/trade_copier_cleanup_tasks/legacy_subscription_cleanup`);
  await deleteCollectionDocuments(page, "workspaces/ws_demo_pro/trade_copier_payment_intents", (id) => id.startsWith("stage29i_") || id.startsWith("tcpi_"));
  await deleteEmulatorDocument(page, `${copierStudentPath}/execution_preferences/current`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/auto_copy_preferences/crypto`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/auto_copy_preferences/forex`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/exchange_connections/stage29i_browser_binance`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/forex_provisioning/current`);
  await deleteEmulatorDocument(page, `${copierStudentPath}/forex_provisioning_requests/stage29i_browser_forex_request`);
  await deleteEmulatorDocument(page, "workspaces/ws_demo_pro/forex_provisioned_accounts/stage29i_browser_forex_account");
  await deleteEmulatorDocument(page, "broker_keys/ws_demo_pro/students/student_demo_active/connections/stage29i_browser_binance");
  await patchEmulatorDocumentFields(page, copierStudentPath, {
    accountMode: "auto_copy",
    autoCopyEligible: true
  });
  await patchEmulatorDocumentFields(page, copierWorkspacePath, {
    tiers: demoCoreTierWithCopier
  });
}

export async function installCopierBrowserEligibility(page) {
  await patchEmulatorDocumentFields(page, copierStudentPath, {
    accountMode: "auto_copy",
    autoCopyEligible: true
  });
  await patchEmulatorDocumentFields(page, copierWorkspacePath, {
    tiers: demoCoreTierWithCopier
  });
}

export async function installCopierBrowserIneligibleState(page) {
  await patchEmulatorDocumentFields(page, copierStudentPath, {
    accountMode: "signal_alerts",
    autoCopyEligible: false
  });
  await patchEmulatorDocumentFields(page, copierWorkspacePath, {
    tiers: demoCoreTierWithoutCopier
  });
}

export async function installCryptoCopierBrowserEntitlement(page) {
  await installCopierBrowserEligibility(page);
  await writeEmulatorDocument(page, `${copierStudentPath}/crypto_autocopy_subscriptions/current`, {
    subscriptionId: "current",
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    status: "active_paid",
    billingState: "paid",
    rail: "manual",
    currentPeriodEnd: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-08-24T12:00:00.000Z",
    updatedAt: "2026-08-24T12:00:00.000Z"
  });
}

export async function installPendingTradeCopierBrowserPayment(page) {
  await installCopierBrowserEligibility(page);
  await writeEmulatorDocument(page, `${copierStudentPath}/trade_copier_subscriptions/current`, {
    subscriptionId: "current",
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    product: "trade_copier",
    status: "payment_pending",
    billingState: "pending",
    rail: "paystack",
    latestReferenceRef: "ref:stag...ding",
    createdAt: "2026-09-06T08:00:00.000Z",
    updatedAt: "2026-09-06T08:00:00.000Z"
  });
}

export async function installCryptoCopierBrowserConnection(page) {
  await installCryptoCopierBrowserEntitlement(page);
  await writeEmulatorDocument(page, `${copierStudentPath}/exchange_connections/stage29i_browser_binance`, {
    connectionId: "stage29i_browser_binance",
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    exchange: "binance",
    environment: "sandbox",
    market: "crypto",
    accountKind: "personal_exchange",
    status: "verified",
    connectionLabel: "Binance personal account",
    credentialMetadataId: "stage29i_browser_binance",
    credentialRefPath: "broker_keys/ws_demo_pro/students/student_demo_active/connections/stage29i_browser_binance",
    credentialStorageState: "encrypted_reference_ready",
    permissionVerification: "passed",
    withdrawalPermission: "confirmed_disabled",
    keyFingerprint: "stage29i_browser_hidden_fingerprint",
    lastVerifiedAt: "2026-09-06T09:00:00.000Z",
    lastHealthCheckAt: "2026-09-06T09:00:00.000Z",
    supportSafeMessage: "Provider dry-run vault canary worker fingerprint credential version diagnostics must not render.",
    createdAt: "2026-09-06T09:00:00.000Z",
    updatedAt: "2026-09-06T09:00:00.000Z"
  });
}

export async function installForexCopierBrowserEntitlement(page) {
  await installCopierBrowserEligibility(page);
  await writeEmulatorDocument(page, `${copierStudentPath}/forex_autocopy_subscriptions/current`, {
    subscriptionId: "current",
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    status: "active_paid",
    billingState: "paid",
    rail: "manual",
    currentPeriodEnd: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-08-24T12:00:00.000Z",
    updatedAt: "2026-08-24T12:00:00.000Z"
  });
}

export async function installOperationalForexCopierBrowserState(page) {
  await installForexCopierBrowserEntitlement(page);
  const record = {
    accountId: "stage29i_browser_forex_account",
    requestId: "stage29i_browser_forex_request",
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    platform: "mt5",
    provider: "mock",
    providerMode: "dry_run",
    status: "provisioning_dry_run_complete",
    active: true,
    label: "Stage 29I Forex setup",
    brokerServerRef: "server:hidden",
    brokerLoginRef: "login:hidden",
    brokerServerFingerprint: "stage29i_hidden_server_fingerprint",
    brokerLoginFingerprint: "stage29i_hidden_login_fingerprint",
    noBrokerExecution: true,
    noMetaApiResourceCreated: true,
    cleanupStatus: "not_required",
    safeMessage: "MetaAPI provider vault canary worker fingerprint credential versions dry-run diagnostics must not render.",
    createdAt: "2026-09-06T10:00:00.000Z",
    updatedAt: "2026-09-06T10:00:00.000Z"
  };

  await writeEmulatorDocument(page, `${copierStudentPath}/forex_provisioning/current`, record);
  await writeEmulatorDocument(page, "workspaces/ws_demo_pro/forex_provisioned_accounts/stage29i_browser_forex_account", record);
  await writeEmulatorDocument(page, `${copierStudentPath}/forex_provisioning_requests/stage29i_browser_forex_request`, {
    ...record,
    status: "mock_completed"
  });
}

export async function clearConnectedJournalFixtures(page) {
  for (const fixtureId of connectedJournalFixtureIds) {
    const response = await page.request.delete(
      `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${connectedJournalFixturePath}/${fixtureId}`,
      { headers: { Authorization: "Bearer owner" } }
    );
    expect([200, 404]).toContain(response.status());
  }
}

export async function installConnectedJournalFixtures(page) {
  await clearConnectedJournalFixtures(page);
  const base = {
    providerConfirmed: true,
    confirmationState: "provider_confirmed",
    executionMode: "production_gated",
    environment: "production",
    assetClass: "crypto",
    quantity: 1,
    safeBrokerOrExchangeLabel: "Journal QA account"
  };
  const fixtures = [
    [connectedJournalFixtureIds[0], { ...base, source: "crypto_autocopy", status: "open", journalLifecycle: "open", symbol: "BTCUSDT", side: "buy", entryPrice: 60000, openedAt: "2026-08-27T09:00:00.000Z", updatedAt: "2026-08-31T09:05:00.000Z" }],
    [connectedJournalFixtureIds[1], { ...base, source: "crypto_autocopy", status: "filled", symbol: "ETHUSDT", side: "buy", entryPrice: 3000, openedAt: "2026-08-27T10:00:00.000Z", updatedAt: "2026-08-31T09:04:00.000Z" }],
    [connectedJournalFixtureIds[2], { ...base, source: "crypto_autocopy", status: "partially_filled", journalLifecycle: "partial", symbol: "SOLUSDT", side: "sell", entryPrice: 150, exitPrice: 145, realizedPnl: 5, openedAt: "2026-08-27T11:00:00.000Z", updatedAt: "2026-08-31T09:03:00.000Z" }],
    [connectedJournalFixtureIds[3], { ...base, source: "crypto_autocopy", status: "closed", journalLifecycle: "closed", providerClosureConfirmed: true, symbol: "XAUUSD", assetClass: "cfd", side: "buy", entryPrice: 2300, exitPrice: 2375, realizedPnl: 75, rMultiple: 1.5, openedAt: "2026-08-28T09:00:00.000Z", closedAt: "2026-08-30T09:00:00.000Z", updatedAt: "2026-08-31T09:02:00.000Z" }],
    [connectedJournalFixtureIds[4], { ...base, source: "connected_provider", tradeOrigin: "provider_manual", status: "closed", journalLifecycle: "closed", providerClosureConfirmed: true, symbol: "EURUSD", assetClass: "forex", side: "sell", entryPrice: 1.09, exitPrice: 1.095, realizedPnl: -25, rMultiple: -0.5, openedAt: "2026-08-26T09:00:00.000Z", closedAt: "2026-08-29T09:00:00.000Z", updatedAt: "2026-08-31T09:01:00.000Z" }]
  ];

  for (const [fixtureId, record] of fixtures) {
    await writeEmulatorDocument(page, `${connectedJournalFixturePath}/${fixtureId}`, record);
  }
}

export async function clearStudentSignalFixtures(page) {
  for (const fixtureId of [
    studentSignalFixtureIds.cryptoOpen,
    studentSignalFixtureIds.forexOpen,
    studentSignalFixtureIds.cryptoCancelled,
    studentSignalFixtureIds.forexClosed,
    studentSignalFixtureIds.externalPreview,
    studentSignalFixtureIds.externalTelegramLike,
    studentSignalFixtureIds.externalUnknown,
    studentSignalFixtureIds.equalTimestampA,
    studentSignalFixtureIds.equalTimestampB
  ]) {
    await deleteEmulatorDocument(page, `${studentSignalsFixturePath}/${fixtureId}`);
  }
  await deleteCollectionDocuments(page, studentSignalsFixturePath, (id) => id.startsWith("stage29j_browser_bulk_"));

  for (const ledgerId of [
    studentSignalFixtureIds.cryptoExecution,
    studentSignalFixtureIds.forexExecution,
    studentSignalFixtureIds.wrongMarketExecution,
    studentSignalFixtureIds.paperExecution,
    studentSignalFixtureIds.missingCurrencyExecution,
    studentSignalFixtureIds.unconfirmedExecution
  ]) {
    await deleteEmulatorDocument(page, `${connectedJournalFixturePath}/${ledgerId}`);
  }
}

export async function installStudentSignalFixtures(page) {
  await clearStudentSignalFixtures(page);
  const baseSignal = {
    workspaceId: "ws_demo_pro",
    source: "in_app",
    status: "published",
    riskLabel: "medium",
    deliveryMode: "alerts_only",
    createdAt: "2026-09-06T08:00:00.000Z"
  };
  const signals = [
    [
      studentSignalFixtureIds.equalTimestampA,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.equalTimestampA,
        market: "crypto",
        pair: "ADAUSDT",
        direction: "buy",
        entry: "0.52",
        stopLoss: "0.49",
        takeProfit: "0.58",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:12:00.000Z",
        updatedAt: "2026-09-06T08:12:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.equalTimestampB,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.equalTimestampB,
        market: "crypto",
        pair: "BNBUSDT",
        direction: "buy",
        entry: "610",
        stopLoss: "590",
        takeProfit: "650",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:12:00.000Z",
        updatedAt: "2026-09-06T08:12:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.cryptoOpen,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.cryptoOpen,
        market: "crypto",
        pair: "BTCUSDT",
        direction: "buy",
        entry: "68420",
        stopLoss: "67800",
        takeProfit: "70000",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:10:00.000Z",
        updatedAt: "2026-09-06T08:10:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.forexOpen,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.forexOpen,
        market: "forex",
        pair: "XAUUSD",
        direction: "buy",
        entry: "2310.50",
        stopLoss: "2300.00",
        takeProfit: "2340.00",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:09:00.000Z",
        updatedAt: "2026-09-06T08:09:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.cryptoCancelled,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.cryptoCancelled,
        market: "crypto",
        pair: "ETHUSDT",
        direction: "sell",
        entry: "3280",
        stopLoss: "3340",
        takeProfit: "3140",
        status: "cancelled",
        publishedAt: "2026-09-05T08:08:00.000Z",
        updatedAt: "2026-09-06T08:08:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.forexClosed,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.forexClosed,
        market: "forex",
        pair: "EURUSD",
        direction: "sell",
        entry: "1.0872",
        stopLoss: "1.0900",
        takeProfit: "1.0810",
        lifecycle: "closed",
        publishedAt: "2026-09-04T08:07:00.000Z",
        updatedAt: "2026-09-06T08:07:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.externalPreview,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.externalPreview,
        source: "telegram_channel",
        market: "crypto",
        pair: "DOGEUSDT",
        direction: "buy",
        entry: "0.22",
        stopLoss: "0.20",
        takeProfit: "0.26",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:11:00.000Z",
        updatedAt: "2026-09-06T08:11:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.externalTelegramLike,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.externalTelegramLike,
        source: "telegram",
        market: "crypto",
        pair: "XRPUSDT",
        direction: "buy",
        entry: "0.60",
        stopLoss: "0.55",
        takeProfit: "0.70",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:10:30.000Z",
        updatedAt: "2026-09-06T08:10:30.000Z"
      }
    ],
    [
      studentSignalFixtureIds.externalUnknown,
      {
        ...baseSignal,
        signalId: studentSignalFixtureIds.externalUnknown,
        source: "future_source",
        market: "forex",
        pair: "USDCHF",
        direction: "sell",
        entry: "1.2600",
        stopLoss: "1.2660",
        takeProfit: "1.2500",
        lifecycle: "open",
        publishedAt: "2026-09-06T08:10:15.000Z",
        updatedAt: "2026-09-06T08:10:15.000Z"
      }
    ]
  ];

  for (const [fixtureId, signal] of signals) {
    await writeEmulatorDocument(page, `${studentSignalsFixturePath}/${fixtureId}`, signal);
  }

  for (let index = 0; index < 260; index += 1) {
    const signalId = `stage29j_browser_bulk_${String(index).padStart(3, "0")}`;
    const updatedAt = `2026-09-${String(5 - Math.floor(index / 120)).padStart(2, "0")}T08:${String(index % 60).padStart(2, "0")}:00.000Z`;
    await writeEmulatorDocument(page, `${studentSignalsFixturePath}/${signalId}`, {
      ...baseSignal,
      signalId,
      market: index % 2 === 0 ? "crypto" : "forex",
      pair: index % 2 === 0 ? `SOLUSDT` : `GBPUSD`,
      direction: index % 3 === 0 ? "sell" : "buy",
      entry: index % 2 === 0 ? "150" : "1.2600",
      stopLoss: index % 2 === 0 ? "145" : "1.2550",
      takeProfit: index % 2 === 0 ? "170" : "1.2720",
      lifecycle: index % 5 === 0 ? "closed" : "open",
      publishedAt: updatedAt,
      updatedAt
    });
  }

  const baseLedger = {
    providerConfirmed: true,
    confirmationState: "provider_confirmed",
    executionMode: "production_gated",
    environment: "production",
    tradeOrigin: "copied",
    quantity: 1,
    safeBrokerOrExchangeLabel: "TradeHub Copier",
    openedAt: "2026-09-06T08:12:00.000Z"
  };
  const ledgers = [
    [
      studentSignalFixtureIds.cryptoExecution,
      {
        ...baseLedger,
        source: "crypto_autocopy",
        tradeHubSignalId: studentSignalFixtureIds.cryptoOpen,
        status: "filled",
        providerStatus: "filled",
        journalLifecycle: "open",
        assetClass: "crypto",
        symbol: "BTCUSDT",
        side: "buy",
        entryPrice: 68420,
        authoritativePnl: {
          kind: "floating",
          value: 240,
          currency: "USD",
          authoritative: true,
          source: "provider_valuation",
          valuedAt: "2026-09-06T08:13:00.000Z"
        },
        updatedAt: "2026-09-06T08:13:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.forexExecution,
      {
        ...baseLedger,
        source: "forex_autocopy",
        tradeHubSignalId: studentSignalFixtureIds.forexClosed,
        status: "closed",
        providerStatus: "filled",
        journalLifecycle: "closed",
        providerClosureConfirmed: true,
        assetClass: "forex",
        symbol: "EURUSD",
        side: "sell",
        entryPrice: 1.0872,
        exitPrice: 1.0810,
        authoritativePnl: {
          kind: "realized",
          value: 94,
          currency: "USD",
          authoritative: true,
          source: "provider_closure",
          valuedAt: "2026-09-06T08:20:00.000Z"
        },
        closedAt: "2026-09-06T08:20:00.000Z",
        updatedAt: "2026-09-06T08:20:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.wrongMarketExecution,
      {
        ...baseLedger,
        source: "forex_autocopy",
        tradeHubSignalId: studentSignalFixtureIds.cryptoOpen,
        status: "filled",
        providerStatus: "filled",
        journalLifecycle: "open",
        assetClass: "forex",
        symbol: "BTCUSDT",
        side: "buy",
        updatedAt: "2026-09-06T08:21:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.paperExecution,
      {
        ...baseLedger,
        source: "crypto_autocopy",
        tradeHubSignalId: studentSignalFixtureIds.cryptoOpen,
        status: "filled",
        providerStatus: "filled",
        executionMode: "paper",
        environment: "paper",
        journalLifecycle: "open",
        assetClass: "crypto",
        symbol: "BTCUSDT",
        side: "buy",
        updatedAt: "2026-09-06T08:22:00.000Z"
      }
    ],
    [
      studentSignalFixtureIds.missingCurrencyExecution,
      {
        ...baseLedger,
        source: "crypto_autocopy",
        tradeHubSignalId: studentSignalFixtureIds.equalTimestampA,
        status: "filled",
        providerStatus: "filled",
        journalLifecycle: "open",
        assetClass: "crypto",
        symbol: "ADAUSDT",
        side: "buy",
        authoritativePnl: {
          kind: "floating",
          value: 88,
          authoritative: true,
          source: "provider_valuation"
        },
        updatedAt: "2026-09-06T08:22:30.000Z"
      }
    ],
    [
      studentSignalFixtureIds.unconfirmedExecution,
      {
        ...baseLedger,
        providerConfirmed: false,
        confirmationState: "blocked",
        source: "crypto_autocopy",
        tradeHubSignalId: studentSignalFixtureIds.cryptoCancelled,
        status: "blocked",
        journalLifecycle: "open",
        assetClass: "crypto",
        symbol: "ETHUSDT",
        side: "sell",
        entryPrice: 3280,
        updatedAt: "2026-09-06T08:19:00.000Z"
      }
    ]
  ];

  for (const [ledgerId, ledger] of ledgers) {
    await writeEmulatorDocument(page, `${connectedJournalFixturePath}/${ledgerId}`, ledger);
  }
}

export async function clearPracticeAnalyticsLossFixture(page) {
  const basePath = "workspaces/ws_demo_pro/students/student_demo_active";
  for (const documentPath of [
    `${basePath}/practice_orders/${practiceAnalyticsLossFixtureIds.orderId}`,
    `${basePath}/practice_sessions/${practiceAnalyticsLossFixtureIds.sessionId}`
  ]) {
    const response = await page.request.delete(
      `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${documentPath}`,
      { headers: { Authorization: "Bearer owner" } }
    );
    expect([200, 404]).toContain(response.status());
  }
}

export async function installPracticeAnalyticsLossFixture(page) {
  await clearPracticeAnalyticsLossFixture(page);
  const basePath = "workspaces/ws_demo_pro/students/student_demo_active";
  await writeEmulatorDocument(page, `${basePath}/practice_sessions/${practiceAnalyticsLossFixtureIds.sessionId}`, {
    sessionId: practiceAnalyticsLossFixtureIds.sessionId,
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    sessionName: "Stage 29F net loss regression",
    assetClass: "crypto",
    platformSource: "binance",
    symbol: "ETHUSDT",
    timeframeMinutes: 60,
    dateStart: "2026-08-25T08:00:00.000Z",
    dateEnd: "2026-08-25T12:00:00.000Z",
    startingBalance: 10000,
    riskPct: 1,
    feeBps: 4,
    spreadBps: 2,
    slippageBps: 2,
    playbookId: "playbook_demo_breakout",
    status: "completed",
    currentCandleIndex: 23,
    createdAt: "2026-08-25T08:00:00.000Z",
    completedAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z"
  });
  await writeEmulatorDocument(page, `${basePath}/practice_orders/${practiceAnalyticsLossFixtureIds.orderId}`, {
    orderId: practiceAnalyticsLossFixtureIds.orderId,
    sessionId: practiceAnalyticsLossFixtureIds.sessionId,
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    orderType: "market",
    direction: "buy",
    status: "closed",
    requestedPrice: 100,
    filledPrice: 100,
    size: 100,
    remainingSize: 0,
    closedSize: 100,
    notional: 10000,
    riskAmount: 100,
    pnl: -100,
    fees: 4,
    rMultiple: -1,
    playbookId: "playbook_demo_breakout",
    openedAtCandleTime: "2026-08-25T09:00:00.000Z",
    closedAtCandleTime: "2026-08-25T11:00:00.000Z",
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z"
  });
}

export async function clearPracticeAnalyticsUnmatchedFixture(page) {
  const basePath = "workspaces/ws_demo_pro/students/student_demo_active";
  const response = await page.request.delete(
    `http://127.0.0.1:8080/v1/projects/trade-hub-4d8df/databases/(default)/documents/${basePath}/practice_orders/${practiceAnalyticsUnmatchedFixtureIds.orderId}`,
    { headers: { Authorization: "Bearer owner" } }
  );
  expect([200, 404]).toContain(response.status());
}

export async function installPracticeAnalyticsUnmatchedFixture(page) {
  await clearPracticeAnalyticsUnmatchedFixture(page);
  const basePath = "workspaces/ws_demo_pro/students/student_demo_active";
  await writeEmulatorDocument(page, `${basePath}/practice_orders/${practiceAnalyticsUnmatchedFixtureIds.orderId}`, {
    orderId: practiceAnalyticsUnmatchedFixtureIds.orderId,
    sessionId: practiceAnalyticsUnmatchedFixtureIds.missingSessionId,
    workspaceId: "ws_demo_pro",
    studentId: "student_demo_active",
    orderType: "market",
    direction: "buy",
    status: "closed",
    requestedPrice: 100,
    filledPrice: 100,
    size: 100,
    remainingSize: 0,
    closedSize: 100,
    notional: 10000,
    riskAmount: 100,
    pnl: 9999,
    fees: 0,
    rMultiple: 99.99,
    playbookId: "playbook_demo_breakout",
    openedAtCandleTime: "2026-08-26T09:00:00.000Z",
    closedAtCandleTime: "2026-08-26T11:00:00.000Z",
    createdAt: "2026-08-26T09:00:00.000Z",
    updatedAt: "2026-08-26T12:00:00.000Z"
  });
}

const studentForbiddenTextPatterns = [
  /providerPayload/i,
  /vaultRef/i,
  /rawPayment/i,
  /rawProvider/i,
  /webhookSecret/i,
  /brokerPassword/i,
  /metaapiToken/i,
  /paystackReference/i,
  /solanaSignature/i,
  /telegramToken/i,
  /correctIndex/i,
  /answerKey/i,
  /workspace raw access/i,
  /full external order id/i
];

const studentCourseEngineeringCopyPatterns = [
  /\bAPI\b/i,
  /endpoint/i,
  /server-owned/i,
  /server-derived/i,
  /server-verified/i,
  /server-side/i,
  /metadata/i,
  /HTTPS metadata/i,
  /Firestore/i,
  /repository/i,
  /provider/i,
  /source-QA/i,
  /implementation boundary/i,
  /Stage\s+\d+/i
];

export async function assertStudentPageSafe(page, expectedText) {
  await assertTradeHubPageHealthy(page);

  if (expectedText) {
    await expect(page.locator("body")).toContainText(expectedText);
  }

  await assertNoForbiddenRenderedText(page, studentForbiddenTextPatterns, "student browser flow");
}

export async function assertStudentCourseCopySimplified(page) {
  await assertNoForbiddenRenderedText(
    page,
    studentCourseEngineeringCopyPatterns,
    "student course learning copy"
  );
}

export async function openStudentPage(page, path, expectedText) {
  if (new URL(page.url()).pathname !== path) {
    const inAppLink = page.locator(`a[href="${path}"]:visible`).first();
    if (await inAppLink.count()) {
      await inAppLink.click();
    } else {
      await page.goto(path);
    }
  }
  await waitForSettledApplicationPath(page, path);
  await assertStudentPageSafe(page, expectedText);
}

export async function openPracticeSessions(page) {
  await openStudentPage(page, "/app/practice", /Backtesting Session|Sessions/i);
  await page.getByTestId("practice-open-sessions").click();
  await expect(page.getByTestId("practice-sessions-view")).toBeVisible();
}

export async function openQuickPracticeSession(page) {
  await openStudentPage(page, "/app/practice", /Backtesting Session|Sessions/i);
  await page.getByTestId("practice-start-session").click();
  const modal = page.getByTestId("practice-quick-session-modal");

  await expect(modal).toBeVisible();
  return modal;
}

export async function fillQuickPracticeSession(page, {
  name,
  balance = "1000",
  dateStart = "2026-07-01",
  dateEnd = "2026-07-02",
  openTerminal = false
}) {
  const modal = page.getByTestId("practice-quick-session-modal");

  await modal.getByTestId("practice-quick-session-name").fill(name);
  await modal.getByTestId("practice-quick-session-balance").fill(balance);
  await modal.getByTestId("practice-quick-session-start").fill(dateStart);
  await modal.getByTestId("practice-quick-session-end").fill(dateEnd);
  const openTerminalToggle = modal.getByLabel("Open terminal after creation");

  if (await openTerminalToggle.isChecked() !== openTerminal) {
    await openTerminalToggle.click();
  }
}

export async function deleteStandalonePracticeSession(page, sessionName, sessionCard) {
  await sessionCard.getByRole("button", { name: "Session settings" }).click();
  const drawer = page.getByTestId("practice-session-settings-drawer");

  await expect(drawer).toBeVisible();
  const deleteButton = drawer.getByRole("button", { name: "Delete session" });
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();
  await page.getByTestId("practice-delete-confirmation-name").fill(sessionName);
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByTestId("practice-delete-session-dialog")).toHaveCount(0);
}

export async function archiveStandalonePracticeSession(sessionCard) {
  const archiveButton = sessionCard.getByRole("button", { name: "Archive" });
  await expect(archiveButton).toBeEnabled();
  await archiveButton.click();
}

export async function observeNextPracticeSessionCreation(page) {
  const routePattern = /\/api\/student\/practice\/sessions$/;
  let resolvePayload;
  let rejectPayload;
  const payloadPromise = new Promise((resolve, reject) => {
    resolvePayload = resolve;
    rejectPayload = reject;
  });
  const handler = async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    try {
      const response = await route.fetch();
      const payload = await response.json();
      resolvePayload(payload);
      await route.fulfill({ response, json: payload });
    } catch (error) {
      rejectPayload(error);
      await route.abort();
    }
  };

  await page.route(routePattern, handler);
  return {
    payloadPromise,
    stop: () => page.unroute(routePattern, handler)
  };
}

export async function deleteStandalonePracticeSessionByApi(page, sessionId, confirmationName) {
  const authResponse = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=stage15f-local",
    {
      data: {
        email: demoUsers.student.email,
        password: demoUsers.student.password,
        returnSecureToken: true
      }
    }
  );
  expect(authResponse.ok(), "demo student cleanup token should be available").toBeTruthy();
  const studentToken = (await authResponse.json()).idToken;
  const origin = new URL(page.url()).origin;
  const response = await page.request.delete(
    `${origin}/api/student/practice/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: { confirmationName }
    }
  );

  expect(response.ok(), `created Practice session ${sessionId} should be removed during cleanup`).toBeTruthy();
}

export async function dragPracticeChartCapture(page, {
  from = { x: 0.28, y: 0.32 },
  to = { x: 0.58, y: 0.62 },
  steps = 10
} = {}) {
  const capture = page.getByTestId("practice-terminal-drawing-capture-layer");

  await expect(capture).toBeVisible();
  const box = await capture.boundingBox();
  expect(box, "practice chart capture layer should have a measurable browser box").not.toBeNull();

  const startX = box.x + (box.width * from.x);
  const startY = box.y + (box.height * from.y);
  const endX = box.x + (box.width * to.x);
  const endY = box.y + (box.height * to.y);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps });
  await page.mouse.up();
}

export async function clickPracticeChartCapture(page, at = { x: 0.48, y: 0.46 }) {
  const capture = page.getByTestId("practice-terminal-drawing-capture-layer");

  await expect(capture).toBeVisible();
  const box = await capture.boundingBox();
  expect(box, "practice chart capture layer should have a measurable browser box").not.toBeNull();

  await page.mouse.click(
    box.x + (box.width * at.x),
    box.y + (box.height * at.y)
  );
}

export async function movePracticeChartPointer(page, at = { x: 0.58, y: 0.42 }, steps = 8) {
  const capture = page.getByTestId("practice-terminal-drawing-capture-layer");

  await expect(capture).toBeVisible();
  const box = await capture.boundingBox();
  expect(box, "practice chart capture layer should have a measurable browser box").not.toBeNull();

  await page.mouse.move(
    box.x + (box.width * at.x),
    box.y + (box.height * at.y),
    { steps }
  );
}

export async function assertWrongRoleBlocked(page, path) {
  await page.goto(path);
  await assertStudentPageSafe(page);
  await assertSafeRoleBoundary(page, { allowedRedirectPaths: ["/app"] });
}
