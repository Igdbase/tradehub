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

const connectedJournalFixturePath =
  "workspaces/ws_demo_pro/students/student_demo_active/account_linked_trade_ledger";

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

async function deleteCollectionDocuments(page, collectionPath, predicate = () => true) {
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
