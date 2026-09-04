import { expect, test } from "@playwright/test";
import { demoUsers, signInAs } from "./helpers/auth.mjs";
import {
  archiveStandalonePracticeSession,
  assertStudentCourseCopySimplified,
  assertStudentPageSafe,
  assertWrongRoleBlocked,
  clearConnectedJournalFixtures,
  clearCryptoJournalSyncFixtures,
  clearPracticeAnalyticsLossFixture,
  clearPracticeAnalyticsUnmatchedFixture,
  clickPracticeChartCapture,
  deleteStandalonePracticeSession,
  deleteStandalonePracticeSessionByApi,
  demoStudentIds,
  dragPracticeChartCapture,
  fillQuickPracticeSession,
  installConnectedJournalFixtures,
  installPracticeAnalyticsLossFixture,
  installPracticeAnalyticsUnmatchedFixture,
  movePracticeChartPointer,
  observeNextPracticeSessionCreation,
  openStudentPage,
  openQuickPracticeSession,
  openPracticeSessions
} from "./helpers/student-flows.mjs";

test.describe("TradeHub seeded student browser E2E", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "student", "/app");
  });

  test("Crypto Journal Sync is independent and displays provider-confirmed history safely", async ({ page }) => {
    const requestedUrls = [];
    page.on("request", (request) => requestedUrls.push(request.url()));
    try {
      await clearCryptoJournalSyncFixtures(page);
      await clearConnectedJournalFixtures(page);
      await openStudentPage(page, "/app/journal", /Journal|My Trades/i);
      await expect(page.getByTestId("journal-crypto-sync-panel")).toBeVisible();
      await expect(page.getByTestId("journal-sync-readiness-state")).toContainText(/not configured/i);
      await expect(page.locator("body")).toContainText(/Read-only crypto history|Copier setup and practice results stay separate/i);
      await expect(page.locator("body")).not.toContainText(/provider payload|vault ref|workspace id|student id/i);
      expect(requestedUrls.some((url) => url.includes("/api/student/journal/manual-trades"))).toBe(false);

      await page.getByPlaceholder("Crypto history").fill("Stage 29G browser sync");
      await page.getByPlaceholder("Read-only API key").fill("journal-sync-mock-key");
      await page.getByPlaceholder("API secret").fill("journal-sync-mock-secret");
      await page.getByRole("button", { name: "ETHUSDT", exact: true }).click();
      await page.getByRole("button", { name: "LINKUSDT", exact: true }).click();
      const connectResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/crypto-sync") &&
        response.request().method() === "POST" &&
        response.status() === 201
      );
      await page.getByRole("button", { name: "Connect read-only" }).click();
      const connectPayload = await (await connectResponsePromise).json();
      expect(connectPayload.connections[0]).toMatchObject({
        exchange: "binance",
        status: "ready",
        selectedSymbols: ["BTCUSDT", "LINKUSDT"],
        permissionState: "passed"
      });
      await expect(page.getByTestId("journal-sync-connection-row")).toContainText(/Stage 29G browser sync|BINANCE|BTCUSDT, LINKUSDT/i);

      const populatedResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.request().method() === "GET"
      );
      const syncResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/crypto-sync/") &&
        response.url().includes("/sync") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Sync now" }).click();
      const syncPayload = await (await syncResponsePromise).json();
      expect(syncPayload.connections[0]).toMatchObject({ status: "ready", importedCount: 2 });
      const populatedPayload = await (await populatedResponsePromise).json();
      expect(populatedPayload.readiness).toMatchObject({ state: "ready", journalSyncConfigured: true, providerManualHistoryAvailable: true });
      expect(populatedPayload.readiness.cryptoConnections[0]).toMatchObject({
        exchange: "binance",
        status: "ready",
        selectedSymbols: ["BTCUSDT", "LINKUSDT"],
        permissionState: "passed"
      });
      expect(populatedPayload.trades.find((trade) => trade.symbol === "BTCUSDT")).toMatchObject({ status: "open", providerStatus: "filled", source: "provider_manual" });
      expect(populatedPayload.trades.find((trade) => trade.symbol === "LINKUSDT")).toMatchObject({ status: "open", providerStatus: "filled", source: "provider_manual" });
      expect(populatedPayload.performance).toMatchObject({ totalTrades: 2, openTrades: 2, closedTrades: 0, netPnl: 0 });
      expect(populatedPayload.equityCurve).toEqual([]);
      expect(JSON.stringify(populatedPayload)).not.toMatch(/apiSecret|apiKey|providerPayload|vaultRef|workspaceId|studentId|sourceRecordId/i);
      await expect(page.getByTestId("journal-sync-readiness-state")).toContainText(/ready/i);
      await expect(page.getByTestId("journal-sync-connection-row")).toContainText(/Stage 29G browser sync|BINANCE|BTCUSDT, LINKUSDT|Imported 2/i);
      await expect(page.locator("body")).toContainText(/BTCUSDT|LINKUSDT|Placed at provider/i);
      await expect(page.locator("body")).not.toContainText(/\+39.6/i);

      await page.waitForTimeout(5200);
      const secondPopulatedResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.request().method() === "GET"
      );
      const secondSyncResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/crypto-sync/") &&
        response.url().includes("/sync") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Sync now" }).click();
      const secondSyncPayload = await (await secondSyncResponsePromise).json();
      expect(secondSyncPayload.connections[0]).toMatchObject({ status: "ready", importedCount: 0 });
      const secondPopulatedPayload = await (await secondPopulatedResponsePromise).json();
      expect(secondPopulatedPayload.trades.map((trade) => trade.symbol).sort()).toEqual(["BTCUSDT", "LINKUSDT"]);
      expect(secondPopulatedPayload.performance).toMatchObject({ totalTrades: 2, openTrades: 2, closedTrades: 0, netPnl: 0 });

      const cryptoResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.url().includes("market=crypto")
      );
      await page.getByRole("button", { name: "Crypto" }).click();
      const cryptoPayload = await (await cryptoResponsePromise).json();
      expect(cryptoPayload.trades.every((trade) => trade.market === "crypto")).toBe(true);
      await page.reload();
      await expect(page.getByTestId("journal-sync-connection-row")).toContainText(/Stage 29G browser sync/i);
      const disconnectResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/crypto-sync/") &&
        response.url().includes("/disconnect") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Disconnect" }).click();
      const disconnectPayload = await (await disconnectResponsePromise).json();
      expect(disconnectPayload.connections[0]).toMatchObject({ status: "disconnected", syncDisabled: true });
    } finally {
      await clearCryptoJournalSyncFixtures(page);
      await clearConnectedJournalFixtures(page);
    }
  });

  test("student app home loads without reminder preferences", async ({ page }) => {
    await assertStudentPageSafe(page, /Pro Demo Academy|Student home|Course progress/i);
    await expect(page.locator("body")).toContainText(/Quick links|Journal summary|Copier safety/i);
    await expect(page.locator("body")).toContainText(/Courses|Signals|Copier|Journal|Practice|Billing/i);
    await expect(page.locator("body")).not.toContainText(/Reminder preferences/i);
    await expect(page.locator("body")).not.toContainText(/email|SMS|WhatsApp|messaging provider|dry-run|suppression|contact verification|reminder delivery/i);
  });

  test("practice hub, sessions drawer, seeded terminal, and report load safely", async ({ page }) => {
    await openStudentPage(page, "/app/practice", /Backtesting Session|Sessions/i);
    await expect(page.getByTestId("practice-start-session")).toContainText("Start a new session");
    await expect(page.getByTestId("practice-open-sessions")).toContainText("View and manage previous sessions");
    await expect(page.getByText("Practice Notifications", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Practice analytics", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Export practice data", { exact: true })).toHaveCount(0);

    await openPracticeSessions(page);
    const seededSessionCard = page.getByTestId("practice-session-card").filter({ hasText: "BTCUSDT Demo Replay" });
    await expect(seededSessionCard).toHaveCount(1);
    await seededSessionCard.getByRole("button", { name: "Session settings" }).click();
    const settingsDrawer = page.getByTestId("practice-session-settings-drawer");
    await expect(settingsDrawer).toBeVisible();
    await expect(settingsDrawer).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(page.getByRole("button", { name: "Delete session" })).toBeDisabled();
    await page.getByRole("button", { name: "Close session settings" }).last().click();
    await expect(page.getByTestId("practice-session-settings-drawer")).toHaveCount(0);

    await openStudentPage(
      page,
      `/app/practice/${demoStudentIds.practiceSessionId}/terminal`,
      /Practice only|Simulated only/i
    );
    await expect(page.getByTestId("practice-terminal-chart-first-shell")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-top-toolbar")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-left-tool-rail")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-chart-surface")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-floating-replay-controls")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-bottom-status-bar")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-right-panel")).toBeVisible();
    await expect(page.getByTestId("tradehub-site-header")).toHaveCount(0);
    await expect(page.getByTestId("tradehub-site-footer")).toHaveCount(0);
    const timeframeStrip = page.getByTestId("practice-terminal-timeframe-strip");
    for (const timeframe of ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "D", "W", "M"]) {
      await expect(timeframeStrip.getByRole("button", { name: new RegExp(`^${timeframe} timeframe`) })).toHaveCount(1);
    }
    await expect(page.getByRole("button", { name: "Crosshair and cursor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lines and trend tools" })).toBeEnabled();
    await page.getByRole("button", { name: "Lines and trend tools" }).click();
    await expect(page.getByTestId("practice-terminal-lines-menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Trend line" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Horizontal price line" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Vertical line" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("practice-terminal-lines-menu")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fibonacci retracement" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Measure" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Brush drawing (coming soon)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Lock or unlock drawings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hide or show drawings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete selected drawing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear chart drawings" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/BTCUSDT Demo Replay|Practice orders/i);
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    const terminalTabs = page.getByTestId("practice-terminal-right-panel-tabs");
    await terminalTabs.getByRole("button", { name: "Object tree" }).click();
    await expect(page.getByTestId("practice-terminal-object-tree")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-selected-object-editor")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    await terminalTabs.getByRole("button", { name: "Go To", exact: true }).click();
    await expect(page.getByTestId("practice-terminal-go-to-panel")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    await terminalTabs.getByRole("button", { name: "News and events" }).click();
    await expect(page.getByTestId("practice-terminal-news-panel")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    await terminalTabs.getByRole("button", { name: "Journal", exact: true }).click();
    await expect(page.getByTestId("practice-terminal-journal-panel")).toBeVisible();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    await page.getByRole("button", { name: "Indicators" }).click();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    await page.getByRole("button", { name: "Indicators" }).click();
    await terminalTabs.getByRole("button", { name: "Order", exact: true }).click();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeVisible();
    await expect(page.locator("body")).toContainText(/Simulated orders only|never place a broker or exchange order/i);
    await terminalTabs.getByRole("button", { name: "Go To", exact: true }).click();
    await expect(page.getByTestId("practice-terminal-order-ticket")).toBeHidden();
    await terminalTabs.getByRole("button", { name: "Collapse utility panel" }).click();
    await expect(page.getByTestId("practice-terminal-right-panel")).toBeHidden();
    await page.getByRole("button", { name: "Open utility panel" }).click();
    await expect(page.getByTestId("practice-terminal-right-panel")).toBeVisible();

    await openStudentPage(
      page,
      `/app/practice/${demoStudentIds.practiceSessionId}/report`,
      /browser-printable practice review|Closed Simulated Orders|Trade review/i
    );
    await expect(page.locator("body")).toContainText(/student-owned simulated data only|browser print dialog/i);
  });

  test("quick Practice session modal validates, creates once, and highlights the session", async ({ page }) => {
    let createRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/student/practice/sessions") {
        createRequests += 1;
      }
    });

    let modal = await openQuickPracticeSession(page);
    await expect(modal).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(modal.getByTestId("practice-quick-session-name")).toBeFocused();
    await expect(modal.getByTestId("practice-quick-session-strategy")).toHaveValue("");
    await expect(modal.getByRole("option", { name: "No strategy" })).toHaveCount(1);

    const initialEndDate = await modal.getByTestId("practice-quick-session-end").inputValue();
    await modal.getByTestId("practice-range-30").click();
    const monthStartDate = await modal.getByTestId("practice-quick-session-start").inputValue();
    expect(Date.parse(`${initialEndDate}T00:00:00.000Z`) - Date.parse(`${monthStartDate}T00:00:00.000Z`)).toBe(30 * 24 * 60 * 60 * 1000);
    await modal.getByTestId("practice-range-365").click();
    const yearStartDate = await modal.getByTestId("practice-quick-session-start").inputValue();
    expect(Date.parse(`${initialEndDate}T00:00:00.000Z`) - Date.parse(`${yearStartDate}T00:00:00.000Z`)).toBe(365 * 24 * 60 * 60 * 1000);

    const randomStartCheckbox = modal.getByRole("checkbox", { name: "Random start", exact: true });
    await randomStartCheckbox.check();
    const randomizedStartDate = await modal.getByTestId("practice-quick-session-start").inputValue();
    const randomizedEndDate = await modal.getByTestId("practice-quick-session-end").inputValue();
    expect(randomizedStartDate).not.toBe(yearStartDate);
    expect(Date.parse(`${randomizedEndDate}T00:00:00.000Z`)).toBeGreaterThan(Date.parse(`${randomizedStartDate}T00:00:00.000Z`));
    await expect(modal.getByTestId("practice-randomize-start")).toBeEnabled();
    await randomStartCheckbox.uncheck();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("practice-quick-session-modal")).toHaveCount(0);
    await expect(page.getByTestId("practice-start-session")).toBeFocused();

    modal = await openQuickPracticeSession(page);
    await page.getByTestId("practice-quick-session-layer").click({ position: { x: 2, y: 2 } });
    await expect(page.getByTestId("practice-quick-session-modal")).toHaveCount(0);

    modal = await openQuickPracticeSession(page);
    await expect(modal.getByTestId("practice-asset-catalogue")).toHaveCount(0);
    await modal.getByTestId("practice-asset-toggle").click();
    await expect(modal.getByTestId("practice-asset-catalogue")).toBeVisible();
    const forexCount = modal.getByTestId("practice-asset-category-count-forex");
    await expect.poll(
      async () => Number(await forexCount.textContent()),
      { message: "static-demo Forex catalogue should expose at least 40 available pairs" }
    ).toBeGreaterThanOrEqual(40);
    await expect(modal.getByTestId("practice-asset-category-metals")).toBeVisible();
    await expect(modal.getByTestId("practice-asset-category-indices")).toBeVisible();
    await expect(modal.getByTestId("practice-asset-category-energies")).toBeVisible();
    await modal.getByRole("button", { name: "Metals" }).click();
    await modal.getByTestId("practice-asset-search").fill("Gold");
    await expect(modal.getByRole("option", { name: /XAUUSD, Gold \/ US Dollar, available/i })).toBeEnabled();
    await modal.getByTestId("practice-asset-search").fill("Silver");
    await expect(modal.getByRole("option", { name: /XAGUSD, Silver \/ US Dollar, available/i })).toBeEnabled();

    await modal.getByRole("button", { name: "Forex" }).click();
    await modal.getByTestId("practice-asset-search").fill("EURGBP");
    await expect(modal.getByRole("option", { name: /EURGBP, Euro \/ British Pound, available/i })).toBeEnabled();

    await modal.getByRole("button", { name: "Indices" }).click();
    await modal.getByTestId("practice-asset-search").fill("FRA40");
    await expect(modal.getByRole("option", { name: /FRA40, France 40, unavailable/i })).toBeDisabled();
    await modal.getByTestId("practice-asset-search").fill("NAS100");
    await expect(modal.getByRole("option", { name: /NAS100, US Tech 100, available/i })).toBeEnabled();

    await modal.getByRole("button", { name: "Energies" }).click();
    await modal.getByTestId("practice-asset-search").fill("USOIL");
    const availableOil = modal.getByRole("option", { name: /USOIL, US Crude Oil, available/i });
    await expect(availableOil).toBeEnabled();
    await availableOil.click();
    await modal.getByTestId("practice-quick-session-name").fill("Stage 29C Browser Session");
    await modal.getByTestId("practice-quick-session-balance").fill("0");
    await expect(modal.getByTestId("practice-quick-session-validation")).toContainText("between 1 and 1,000,000");
    await expect(modal.getByTestId("practice-create-session")).toBeDisabled();

    await modal.getByTestId("practice-quick-session-balance").fill("1000");
    await modal.getByTestId("practice-quick-session-start").fill("2026-07-01");
    await modal.getByTestId("practice-quick-session-end").fill("2026-07-01");
    await expect(modal.getByTestId("practice-quick-session-validation")).toContainText("after the initial date");

    await fillQuickPracticeSession(page, { name: "Stage 29C Browser Session" });
    await modal.getByTestId("practice-range-1").click();
    await expect(modal.getByTestId("practice-quick-session-end")).toHaveValue("2026-07-02");
    const createButton = modal.getByTestId("practice-create-session");
    await expect(createButton).toBeEnabled();
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/student/practice/sessions"
    );
    await createButton.evaluate((button) => {
      button.click();
      button.click();
    });
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    await expect(page.getByTestId("practice-created-session")).toContainText(/Stage 29C Browser Session.*USOIL/s);
    expect(createRequests).toBe(1);

    await deleteStandalonePracticeSession(
      page,
      "Stage 29C Browser Session",
      page.getByTestId("practice-created-session")
    );
  });

  test("expanded verified Crypto catalogue creates one instrument-aware LINKUSDT session", async ({ page }) => {
    let createRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/student/practice/sessions") {
        createRequests += 1;
      }
    });

    const modal = await openQuickPracticeSession(page);
    const assetField = modal.getByTestId("practice-asset-search");
    const assetCatalogue = modal.getByTestId("practice-asset-catalogue");
    const assetToggle = modal.getByTestId("practice-asset-toggle");

    await expect(assetCatalogue).toHaveCount(0);
    await expect(assetToggle).toHaveAttribute("aria-label", "Open asset catalogue");
    await assetToggle.click();
    await expect(assetCatalogue).toBeVisible();
    await expect(assetToggle).toHaveAttribute("aria-label", "Close asset catalogue");

    const allCategory = modal.getByTestId("practice-asset-category-all");
    await expect(allCategory).toHaveAttribute("aria-pressed", "true");
    const cryptoCount = modal.getByTestId("practice-asset-category-count-crypto");
    await expect.poll(
      async () => Number(await cryptoCount.textContent()),
      { message: "verified Crypto catalogue should expose at least 40 available instruments" }
    ).toBeGreaterThanOrEqual(40);

    const modalCopy = (await modal.innerText()).toLowerCase();
    for (const hiddenWord of ["exchangeinfo", "payload", "cache id", "api key", "provider metadata", "stage 29"]) {
      expect(modalCopy).not.toContain(hiddenWord);
    }

    await assetField.fill("LINKUSDT");
    const linkAsset = modal.getByRole("option", { name: /LINKUSDT, Chainlink \/ Tether, available/i });
    await expect(linkAsset).toBeEnabled();
    await linkAsset.click();
    await expect(assetCatalogue).toHaveCount(0);
    await expect(assetField).toHaveValue("LINKUSDT · Chainlink / Tether");

    await assetToggle.click();
    await expect(assetCatalogue).toBeVisible();
    await expect(modal.getByTestId("practice-asset-LINKUSDT")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(assetCatalogue).toHaveCount(0);
    await expect(modal).toBeVisible();
    await expect(assetField).toHaveValue("LINKUSDT · Chainlink / Tether");
    await fillQuickPracticeSession(page, { name: "Stage 29C2 LINK Session" });

    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/student/practice/sessions"
    );
    const createButton = modal.getByTestId("practice-create-session");
    await createButton.evaluate((button) => {
      button.click();
      button.click();
    });
    expect((await responsePromise).ok()).toBeTruthy();
    const createdCard = page.getByTestId("practice-created-session");
    await expect(createdCard).toContainText(/Stage 29C2 LINK Session.*LINKUSDT/s);
    expect(createRequests).toBe(1);

    await Promise.all([
      page.waitForURL(/\/app\/practice\/[^/]+\/terminal$/),
      createdCard.getByRole("link", { name: "Continue" }).click()
    ]);
    await expect(page.getByTestId("practice-terminal-instrument-format")).toContainText("Price 3 dp · Qty 2 dp");
    await expect(page.getByTestId("practice-terminal-chart-surface")).toHaveAttribute("data-revealed-candle-count", /[1-9][0-9]*/);
    await expect(page.locator("body")).toContainText(/LINKUSDT|Chainlink \/ Tether/i);

    const ticket = page.getByTestId("practice-terminal-order-ticket");
    await expect(ticket).toBeHidden();
    await page.getByTestId("practice-terminal-open-order-ticket").click();
    await expect(ticket).toBeVisible();
    await expect(ticket.getByRole("button", { name: "Submit simulated order" })).toBeVisible();
    await ticket.getByLabel("SL", { exact: true }).fill("23.019");
    await ticket.getByLabel("TP", { exact: true }).fill("25.019");
    const orderResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      /\/api\/student\/practice\/sessions\/[^/]+\/orders$/.test(new URL(response.url()).pathname)
    );
    await ticket.getByRole("button", { name: "Close order ticket" }).click();
    await expect(ticket).toBeHidden();
    await page.getByTestId("practice-terminal-quick-buy").click();
    await expect(ticket).toBeHidden();
    const orderResponse = await orderResponsePromise;
    expect(orderResponse.ok()).toBeTruthy();
    const openedOrder = (await orderResponse.json()).order;
    expect(openedOrder.status).toBe("open");
    expect(openedOrder.direction).toBe("buy");
    expect(Math.round(openedOrder.size * 100)).toBe(openedOrder.size * 100);
    await expect(page.getByTestId("practice-terminal-quick-order-message")).toContainText("Buy simulated market order accepted");

    await page.getByTestId("practice-terminal-right-panel-tabs").getByRole("button", { name: "Object tree" }).click();
    const orderCard = page.getByTestId("practice-terminal-order-card").filter({ hasText: /BUY market · open/i }).first();
    await expect(orderCard).toBeVisible();
    await expect(orderCard).toContainText(/P&L/);
    await orderCard.getByLabel("Partial close percent").fill("50");
    const partialCloseResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/partial-close")
    );
    await orderCard.getByRole("button", { name: "Close partial" }).click();
    const partialCloseResponse = await partialCloseResponsePromise;
    expect(partialCloseResponse.ok()).toBeTruthy();
    const partiallyClosedOrder = (await partialCloseResponse.json()).order;
    const originalStepUnits = Math.round(openedOrder.size * 100);
    const closedStepUnits = Math.round(partiallyClosedOrder.closedSize * 100);
    const remainingStepUnits = Math.round(partiallyClosedOrder.remainingSize * 100);
    expect(closedStepUnits + remainingStepUnits).toBe(originalStepUnits);
    await expect(orderCard).toContainText(/Partial close/);
    await expect(orderCard).toContainText(/P&L/);

    await page.getByTestId("practice-terminal-open-order-ticket").click();
    await expect(ticket).toBeVisible();
    await ticket.getByRole("button", { name: "Sell" }).click();
    await ticket.getByLabel("SL", { exact: true }).fill("25.019");
    await ticket.getByLabel("TP", { exact: true }).fill("23.019");
    const sellResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      /\/api\/student\/practice\/sessions\/[^/]+\/orders$/.test(new URL(response.url()).pathname)
    );
    await ticket.getByRole("button", { name: "Close order ticket" }).click();
    await expect(ticket).toBeHidden();
    await page.getByTestId("practice-terminal-quick-sell").click();
    await expect(ticket).toBeHidden();
    const sellResponse = await sellResponsePromise;
    expect(sellResponse.ok()).toBeTruthy();
    const sellOrder = (await sellResponse.json()).order;
    expect(sellOrder.status).toBe("open");
    expect(sellOrder.direction).toBe("sell");
    await expect(page.getByTestId("practice-terminal-quick-order-message")).toContainText("Sell simulated market order accepted");

    await openPracticeSessions(page);
    await page.getByLabel("Search").fill("Stage 29C2 LINK Session");
    const sessionCard = page
      .locator('[data-testid="practice-session-card"], [data-testid="practice-created-session"]')
      .filter({ hasText: "Stage 29C2 LINK Session" });
    await expect(sessionCard.first()).toBeVisible();
    while (await sessionCard.count()) {
      const previousCount = await sessionCard.count();
      await archiveStandalonePracticeSession(sessionCard.first());
      await expect(sessionCard).toHaveCount(previousCount - 1);
    }
  });

  test("quick Practice session can open its terminal after creation", async ({ page }) => {
    const modal = await openQuickPracticeSession(page);
    await modal.getByTestId("practice-asset-toggle").click();
    await modal.getByRole("button", { name: "Crypto" }).click();
    await modal.getByTestId("practice-asset-search").fill("BTCUSDT");
    await modal.getByRole("option", { name: /BTCUSDT, Bitcoin \/ Tether, available/i }).click();
    await fillQuickPracticeSession(page, {
      name: "Stage 29C Terminal Session",
      openTerminal: true
    });

    const createObserver = await observeNextPracticeSessionCreation(page);
    const terminalNavigationPromise = page.waitForURL(/\/app\/practice\/[^/]+\/terminal$/);
    await modal.getByTestId("practice-create-session").click();
    const createdSessionId = (await createObserver.payloadPromise).session.sessionId;
    await terminalNavigationPromise;
    await createObserver.stop();
    await expect(page.getByTestId("practice-terminal-chart-first-shell")).toBeVisible();
    await expect(page.locator("body")).toContainText(/Practice only|Simulated only/i);
    await expect.poll(async () => Number(
      await page.getByTestId("practice-terminal-chart-surface").getAttribute("data-revealed-candle-count")
    )).toBeGreaterThanOrEqual(24);

    await deleteStandalonePracticeSessionByApi(page, createdSessionId, "Stage 29C Terminal Session");
  });

  for (const drawingViewport of [
    { label: "laptop", width: 1366, height: 820 },
    { label: "tablet", width: 900, height: 760 }
  ]) {
  test(`Practice drawing tools persist two-click lines, multiline notes, deletion, clear, and zoom at ${drawingViewport.label}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: drawingViewport.width, height: drawingViewport.height });
    const sessionName = `Stage 29D16 Drawing Acceptance ${drawingViewport.label}`;
    let createdSessionId = "";

    try {
      const modal = await openQuickPracticeSession(page);
      await modal.getByTestId("practice-asset-toggle").click();
      await modal.getByRole("button", { name: "Crypto" }).click();
      await modal.getByTestId("practice-asset-search").fill("BTCUSDT");
      await modal.getByRole("option", { name: /BTCUSDT, Bitcoin \/ Tether, available/i }).click();
      await fillQuickPracticeSession(page, {
        name: sessionName,
        dateEnd: "2026-07-04",
        openTerminal: true
      });

      const createObserver = await observeNextPracticeSessionCreation(page);
      const terminalNavigationPromise = page.waitForURL(/\/app\/practice\/[^/]+\/terminal$/);
      await modal.getByTestId("practice-create-session").click();
      createdSessionId = (await createObserver.payloadPromise).session.sessionId;
      await terminalNavigationPromise;
      await createObserver.stop();
      await expect(page.getByTestId("practice-terminal-chart-first-shell")).toBeVisible();
      await expect.poll(async () => Number(
        await page.getByTestId("practice-terminal-chart-surface").getAttribute("data-revealed-candle-count")
      )).toBeGreaterThanOrEqual(24);
      const productionSessionId = createdSessionId;
      const authResponse = await page.request.post(
        "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=stage15f-local",
        { data: { email: demoUsers.student.email, password: demoUsers.student.password, returnSecureToken: true } }
      );
      expect(authResponse.ok()).toBeTruthy();
      const studentToken = (await authResponse.json()).idToken;
      const bypassResponse = await page.request.get(
        new URL(`/api/student/practice/sessions/${productionSessionId}/candles?index=71`, page.url()).toString(),
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      expect(bypassResponse.ok()).toBeTruthy();
      const bypassPayload = await bypassResponse.json();
      expect(bypassPayload.currentCandleIndex).toBe(23);
      expect(bypassPayload.candles).toHaveLength(24);
      await page.getByRole("button", { name: "Next candle" }).click();
      await expect.poll(async () => Number(
        await page.getByTestId("practice-terminal-chart-surface").getAttribute("data-revealed-candle-count")
      )).toBe(25);
      const advancedResponse = await page.request.get(
        new URL(`/api/student/practice/sessions/${productionSessionId}/candles?index=71`, page.url()).toString(),
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      const advancedPayload = await advancedResponse.json();
      expect(advancedPayload.currentCandleIndex).toBe(24);
      expect(advancedPayload.candles).toHaveLength(25);

      const klineIndicators = () => page.evaluate(() => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        if (!chart) return [];
        return chart.getIndicators().map((indicator) => ({
          name: indicator.name,
          shortName: indicator.shortName,
          paneId: indicator.paneId,
          resultLength: indicator.result.length
        }));
      });
      await page.getByRole("button", { name: "Indicators", exact: true }).click();
      for (const indicatorKey of ["sma", "ema", "rsi", "atr", "volumeMa"]) {
        await page.getByTestId(`practice-terminal-indicator-toggle-${indicatorKey}`).check();
      }
      await expect.poll(async () => (await klineIndicators()).map((indicator) => indicator.name).sort()).toEqual([
        "EMA",
        "MA",
        "RSI",
        "TRADEHUB_ATR",
        "VOL"
      ]);
      await expect.poll(async () => (await klineIndicators()).every((indicator) => indicator.resultLength === 25)).toBe(true);
      const enabledIndicators = await klineIndicators();
      expect(enabledIndicators.find((indicator) => indicator.name === "MA")?.paneId).toBe("candle_pane");
      expect(enabledIndicators.find((indicator) => indicator.name === "EMA")?.paneId).toBe("candle_pane");
      expect(enabledIndicators.find((indicator) => indicator.name === "RSI")?.paneId).toBe("practice-rsi-pane");
      expect(enabledIndicators.find((indicator) => indicator.name === "TRADEHUB_ATR")).toMatchObject({
        shortName: "ATR",
        paneId: "practice-atr-pane"
      });
      expect(enabledIndicators.find((indicator) => indicator.name === "VOL")?.paneId).toBe("practice-volume-pane");
      for (const indicator of enabledIndicators) {
        expect(indicator.resultLength).toBe(25);
      }
      for (const indicatorKey of ["sma", "ema", "rsi", "atr", "volumeMa"]) {
        await page.getByTestId(`practice-terminal-indicator-toggle-${indicatorKey}`).uncheck();
      }
      await expect.poll(async () => (await klineIndicators()).length).toBe(0);
      await page.getByRole("button", { name: "Indicators", exact: true }).click();

      const readViewport = (anchorDataIndex = 8) => page.evaluate((dataIndex) => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        if (!chart) return null;
        const range = chart.getVisibleRange();
        const anchorPixel = chart.convertToPixel({ dataIndex });
        return {
          barSpace: chart.getBarSpace().bar,
          offsetRightDistance: chart.getOffsetRightDistance(),
          centerDataIndex: (range.from + range.to) / 2,
          from: range.from,
          to: range.to,
          dataCount: chart.getDataList().length,
          anchorPixelX: Array.isArray(anchorPixel) ? null : anchorPixel.x
        };
      }, anchorDataIndex);
      await page.evaluate(() => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        chart?.setBarSpace(13);
        chart?.scrollToDataIndex(8);
      });
      await page.waitForTimeout(150);
      const historicalViewport = await readViewport();
      expect(historicalViewport).not.toBeNull();
      await page.getByRole("button", { name: "Next candle" }).click();
      await expect.poll(async () => (await readViewport())?.dataCount).toBe(26);
      await expect.poll(async () => Math.abs((await readViewport()).anchorPixelX - historicalViewport.anchorPixelX)).toBeLessThanOrEqual(1);
      const historicalAfterNext = await readViewport();
      expect(historicalAfterNext.barSpace).toBeCloseTo(historicalViewport.barSpace, 5);
      expect(historicalAfterNext.anchorPixelX).toBeCloseTo(historicalViewport.anchorPixelX, 0);

      await page.getByLabel("Replay speed").selectOption("450");
      await page.getByRole("button", { name: "Play replay" }).click();
      await expect.poll(async () => (await readViewport())?.dataCount, { timeout: 8_000 }).toBeGreaterThanOrEqual(28);
      await page.getByRole("button", { name: "Pause replay" }).click();
      await page.waitForTimeout(900);
      await expect.poll(async () => Math.abs((await readViewport()).anchorPixelX - historicalViewport.anchorPixelX)).toBeLessThanOrEqual(1);
      const historicalAfterPlay = await readViewport();
      expect(historicalAfterPlay.barSpace).toBeCloseTo(historicalViewport.barSpace, 5);
      expect(historicalAfterPlay.anchorPixelX).toBeCloseTo(historicalViewport.anchorPixelX, 0);

      await page.evaluate(() => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        chart?.setBarSpace(11);
        chart?.scrollToRealTime();
      });
      await page.waitForTimeout(150);
      const liveViewport = await readViewport();
      await page.getByRole("button", { name: "Next candle" }).click();
      await expect.poll(async () => (await readViewport())?.dataCount).toBe(liveViewport.dataCount + 1);
      const liveAfterNext = await readViewport();
      expect(liveAfterNext.barSpace).toBeCloseTo(liveViewport.barSpace, 5);
      expect(liveAfterNext.to).toBeGreaterThanOrEqual(liveAfterNext.dataCount - 1);
      await page.evaluate(() => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        const plotWidth = chart?.getSize("candle_pane", "main")?.width ?? 0;
        chart?.setBarSpace(10);
        chart?.setOffsetRightDistance(plotWidth * 0.32);
        chart?.scrollToRealTime();
      });
      await page.waitForTimeout(150);
      const drawingViewportState = await readViewport();
      const lastRevealedDataIndex = drawingViewportState.dataCount - 1;
      const emptyPlotRatios = await page.evaluate((lastDataIndex) => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        const plotWidth = chart?.getSize("candle_pane", "main")?.width ?? 0;
        const first = chart?.convertToPixel({ dataIndex: 0 }, { paneId: "candle_pane" });
        const last = chart?.convertToPixel({ dataIndex: lastDataIndex }, { paneId: "candle_pane" });
        const firstX = Array.isArray(first) ? 0 : first?.x ?? 0;
        const lastX = Array.isArray(last) ? plotWidth : last?.x ?? plotWidth;
        return {
          firstCandle: firstX / plotWidth,
          lastCandle: lastX / plotWidth,
          before: Math.max(0.02, (firstX / plotWidth) * 0.45),
          after: Math.min(0.98, (lastX / plotWidth) + ((1 - (lastX / plotWidth)) * 0.6))
        };
      }, lastRevealedDataIndex);
      expect(emptyPlotRatios.firstCandle).toBeGreaterThan(0.08);
      expect(emptyPlotRatios.lastCandle).toBeLessThan(0.92);

      const drawingResponse = (method, suffix = /\/drawings$/) => page.waitForResponse((response) =>
        response.request().method() === method && suffix.test(new URL(response.url()).pathname)
      );
      const overlayNameForKind = {
        trend_line: "segment",
        horizontal_line: "tradehubHorizontalLine",
        vertical_marker: "tradehubVerticalLine",
        fibonacci_retracement: "tradehubBoundedFibonacci",
        zone: "tradehubZone",
        measurement_placeholder: "tradehubDirectionalMeasure",
        text_note: "tradehubTextNote"
      };
      const klineOverlays = () => page.evaluate(() => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        if (!chart) return [];
        return chart.getOverlays({ groupId: "tradehub_practice_drawings_v1" }).map((overlay) => ({
          id: overlay.id,
          name: overlay.name,
          points: overlay.points.map((point) => ({ dataIndex: point.dataIndex, value: point.value })),
          extendData: overlay.extendData,
          styles: overlay.styles
        }));
      });
      const expectOverlayCount = async (kind, count) => {
        await expect.poll(async () => (await klineOverlays()).filter((overlay) => overlay.name === overlayNameForKind[kind]).length).toBe(count);
      };
      const expectTrendOverlayBlue = async (overlayId, groupId = "tradehub_practice_drawings_v1") => {
        await expect.poll(async () => page.evaluate(({ overlayId, groupId }) => {
          const overlay = window.__TRADEHUB_PRACTICE_KLINECHART__?.getOverlays({ groupId }).find((candidate) => candidate.id === overlayId);
          return overlay ? {
            color: overlay.extendData?.color,
            lineColor: overlay.styles?.line?.color,
            pointBorderColor: overlay.styles?.point?.borderColor
          } : null;
        }, { overlayId, groupId })).toEqual({
          color: "#2962ff",
          lineColor: "#2962ff",
          pointBorderColor: groupId === "tradehub_practice_drawings_v1" ? "#2962ff" : "transparent"
        });
      };
      const captureClientPoint = async ({ x, y }) => {
        const capture = page.getByTestId("practice-terminal-drawing-capture-layer");
        const box = await capture.boundingBox();
        expect(box).not.toBeNull();
        return { x: box.x + box.width * x, y: box.y + box.height * y };
      };
      const overlayClientPoints = (overlayId, groupId = "tradehub_practice_drawings_v1") => page.evaluate(({ overlayId, groupId }) => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        const plot = chart?.getDom("candle_pane", "main");
        const overlay = chart?.getOverlays({ groupId }).find((candidate) => candidate.id === overlayId);
        if (!chart || !plot || !overlay) return [];
        const plotRect = plot.getBoundingClientRect();
        return overlay.points.map((point) => {
          const pixel = chart.convertToPixel(point, { paneId: "candle_pane" });
          if (Array.isArray(pixel)) return null;
          return { x: plotRect.left + pixel.x, y: plotRect.top + pixel.y };
        }).filter(Boolean);
      }, { overlayId, groupId });
      const expectOverlayEndpointsNear = async (overlayId, expectedPoints, tolerance = 5) => {
        await expect.poll(async () => (await overlayClientPoints(overlayId)).length).toBe(expectedPoints.length);
        const actualPoints = await overlayClientPoints(overlayId);
        expectedPoints.forEach((expectedPoint, index) => {
          expect(Math.abs(actualPoints[index].x - expectedPoint.x)).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(actualPoints[index].y - expectedPoint.y)).toBeLessThanOrEqual(tolerance);
        });
      };
      const selectTrendFromNativeSegment = async (overlayId) => {
        const editor = page.getByTestId("practice-terminal-selected-object-editor");
        await page.evaluate(() => new Promise((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
        }));
        const points = await overlayClientPoints(overlayId);
        expect(points).toHaveLength(2);
        const deltaX = points[1].x - points[0].x;
        const deltaY = points[1].y - points[0].y;
        const length = Math.max(1, Math.hypot(deltaX, deltaY));
        const normal = { x: -deltaY / length, y: deltaX / length };
        const probes = [0, 1, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88].flatMap((ratio) => {
          const point = {
            x: points[0].x + (deltaX * ratio),
            y: points[0].y + (deltaY * ratio)
          };
          return [
            point,
            { x: point.x + normal.x * 2, y: point.y + normal.y * 2 },
            { x: point.x - normal.x * 2, y: point.y - normal.y * 2 }
          ];
        });
        for (const probe of probes) {
          await page.mouse.move(probe.x, probe.y, { steps: 2 });
          await page.waitForTimeout(40);
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForTimeout(80);
          if (/Trend line/i.test(await editor.innerText())) return;
        }
        const diagnostics = await page.evaluate(({ overlayId, clientPoint }) => {
          const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
          const overlay = chart?.getOverlays({ id: overlayId })[0];
          return {
            overlay: overlay ? {
              id: overlay.id,
              name: overlay.name,
              lock: overlay.lock,
              currentStep: overlay.currentStep,
              totalStep: overlay.totalStep,
              hasOnClick: typeof overlay.onClick === "function",
              hasOnSelected: typeof overlay.onSelected === "function",
              hasOnPressedMoveStart: typeof overlay.onPressedMoveStart === "function"
            } : null,
            hitStack: document.elementsFromPoint(clientPoint.x, clientPoint.y).slice(0, 8).map((element) => ({
              tag: element.tagName,
              className: typeof element.className === "string" ? element.className : "",
              testId: element.getAttribute("data-testid")
            }))
          };
        }, { overlayId, clientPoint: points[0] });
        throw new Error(`KLineChart did not select the saved Trend line through its native segment hit area. ${JSON.stringify(diagnostics)}`);
      };
      const klineDraftOverlays = () => page.evaluate(() => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        if (!chart) return [];
        return chart.getOverlays({ groupId: "tradehub_practice_drawing_draft_v1" }).map((overlay) => ({
          id: overlay.id,
          name: overlay.name,
          points: overlay.points.map((point) => ({ dataIndex: point.dataIndex, value: point.value }))
        }));
      });
      const clickVisibleToolPopoverOption = async ({ menuTestId, optionName }) => {
        const rail = page.getByTestId("practice-terminal-left-tool-rail");
        const menu = page.getByTestId(menuTestId);
        const option = menu.getByRole("menuitem", { name: optionName, exact: true });
        await expect(menu).toBeVisible();
        await expect(option).toBeVisible();

        const [railBox, menuBox, optionBox] = await Promise.all([
          rail.boundingBox(),
          menu.boundingBox(),
          option.boundingBox()
        ]);
        const viewport = page.viewportSize();
        expect(railBox).not.toBeNull();
        expect(menuBox).not.toBeNull();
        expect(optionBox).not.toBeNull();
        expect(viewport).not.toBeNull();

        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height);
        expect(
          menuBox.x < railBox.x ||
          menuBox.y < railBox.y ||
          menuBox.x + menuBox.width > railBox.x + railBox.width ||
          menuBox.y + menuBox.height > railBox.y + railBox.height
        ).toBe(true);

        const optionCenter = {
          x: optionBox.x + (optionBox.width / 2),
          y: optionBox.y + (optionBox.height / 2)
        };
        const hitMenuTestId = await page.evaluate(({ x, y, testId }) => (
          document.elementFromPoint(x, y)?.closest(`[data-testid="${testId}"]`)?.getAttribute("data-testid") ?? null
        ), { ...optionCenter, testId: menuTestId });
        expect(hitMenuTestId).toBe(menuTestId);

        await page.mouse.click(optionCenter.x, optionCenter.y);
        await expect(menu).toHaveCount(0);
      };
      let trendLinePostCount = 0;
      const countTrendLinePosts = (request) => {
        if (
          request.method() === "POST" &&
          /\/api\/student\/practice\/sessions\/[^/]+\/drawings$/.test(new URL(request.url()).pathname)
        ) {
          trendLinePostCount += 1;
        }
      };
      page.on("request", countTrendLinePosts);

      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await clickVisibleToolPopoverOption({ menuTestId: "practice-terminal-lines-menu", optionName: "Trend line" });
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "trend_line");
      await expect(page.locator("body")).toContainText("Trend line selected. Click the start, move the pointer, then click the endpoint.");
      await clickPracticeChartCapture(page, { x: 0.24, y: 0.66 });
      await movePracticeChartPointer(page, { x: 0.46, y: 0.40 });
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(1);
      await page.getByTestId("practice-terminal-drawing-capture-layer").dispatchEvent("pointercancel", {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        bubbles: true,
        cancelable: true
      });
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(0);
      expect(trendLinePostCount).toBe(0);
      await expectOverlayCount("trend_line", 0);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      await page.getByRole("button", { name: "Rectangle zone", exact: true }).click();
      const cancelledDragStart = await captureClientPoint({ x: 0.16, y: 0.32 });
      const cancelledDragEnd = await captureClientPoint({ x: 0.38, y: 0.58 });
      await page.mouse.move(cancelledDragStart.x, cancelledDragStart.y);
      await page.mouse.down();
      await page.mouse.move(cancelledDragEnd.x, cancelledDragEnd.y, { steps: 6 });
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(1);
      await page.getByTestId("practice-terminal-drawing-capture-layer").dispatchEvent("pointercancel", {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        bubbles: true,
        cancelable: true
      });
      await page.mouse.up();
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(0);
      expect(trendLinePostCount).toBe(0);
      await expectOverlayCount("zone", 0);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await clickVisibleToolPopoverOption({ menuTestId: "practice-terminal-lines-menu", optionName: "Trend line" });
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "trend_line");
      const firstTrendStartRatio = { x: emptyPlotRatios.before, y: 0.68 };
      const firstTrendEndRatio = { x: Math.min(0.48, emptyPlotRatios.firstCandle + 0.12), y: 0.42 };
      const firstTrendStart = await captureClientPoint(firstTrendStartRatio);
      await clickPracticeChartCapture(page, firstTrendStartRatio);
      await page.waitForTimeout(120);
      expect(trendLinePostCount).toBe(0);
      await expectOverlayCount("trend_line", 0);
      await movePracticeChartPointer(page, { x: 0.18, y: 0.52 });
      await expect.poll(async () => (await klineDraftOverlays()).find((overlay) => overlay.id === "practice-kline-trend-draft")?.points[1]?.dataIndex).not.toBeUndefined();
      await expectTrendOverlayBlue("practice-kline-trend-draft", "tradehub_practice_drawing_draft_v1");
      const firstPreviewPoint = (await klineDraftOverlays()).find((overlay) => overlay.id === "practice-kline-trend-draft")?.points[1];
      await movePracticeChartPointer(page, { x: 0.28, y: 0.42 });
      await expect.poll(async () => JSON.stringify((await klineDraftOverlays()).find((overlay) => overlay.id === "practice-kline-trend-draft")?.points[1])).not.toBe(JSON.stringify(firstPreviewPoint));
      const firstTrendEnd = await captureClientPoint(firstTrendEndRatio);
      const firstTrendResponsePromise = drawingResponse("POST");
      await clickPracticeChartCapture(page, firstTrendEndRatio);
      const firstTrendResponse = await firstTrendResponsePromise;
      expect(firstTrendResponse.ok()).toBeTruthy();
      const firstTrend = (await firstTrendResponse.json()).annotation;
      expect(firstTrend.coordinateVersion).toBe("klinecharts_v2");
      expect(firstTrend.colorToken).toBe("blue");
      expect(firstTrend.appearanceVersion).toBe("trend_blue_v1");
      expect(firstTrend.chartPoints[0].dataIndex).toBeLessThan(0);
      expect(trendLinePostCount).toBe(1);
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(0);
      await expectOverlayCount("trend_line", 1);
      await expectTrendOverlayBlue(firstTrend.annotationId);
      await expectOverlayEndpointsNear(firstTrend.annotationId, [firstTrendStart, firstTrendEnd]);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await page.getByTestId("practice-terminal-lines-menu").getByRole("menuitem", { name: "Trend line" }).click();
      const secondTrendStartRatio = { x: Math.max(0.52, emptyPlotRatios.lastCandle - 0.12), y: 0.70 };
      const secondTrendEndRatio = { x: emptyPlotRatios.after, y: 0.35 };
      const secondTrendStart = await captureClientPoint(secondTrendStartRatio);
      await clickPracticeChartCapture(page, secondTrendStartRatio);
      await page.waitForTimeout(120);
      expect(trendLinePostCount).toBe(1);
      await movePracticeChartPointer(page, { x: 0.94, y: 0.35 });
      await expect.poll(async () => (await klineDraftOverlays()).find((overlay) => overlay.id === "practice-kline-trend-draft")?.points.length).toBe(2);
      const secondTrendEnd = await captureClientPoint(secondTrendEndRatio);
      const secondTrendResponsePromise = drawingResponse("POST");
      await clickPracticeChartCapture(page, secondTrendEndRatio);
      const secondTrendResponse = await secondTrendResponsePromise;
      expect(secondTrendResponse.ok()).toBeTruthy();
      const secondTrend = (await secondTrendResponse.json()).annotation;
      expect(secondTrend.colorToken).toBe("blue");
      expect(secondTrend.appearanceVersion).toBe("trend_blue_v1");
      expect(secondTrend.chartPoints[1].dataIndex).toBeGreaterThan(lastRevealedDataIndex);
      expect(trendLinePostCount).toBe(2);
      expect(secondTrend.annotationId).not.toBe(firstTrend.annotationId);
      await expectOverlayCount("trend_line", 2);
      await expectTrendOverlayBlue(secondTrend.annotationId);
      await expectOverlayEndpointsNear(secondTrend.annotationId, [secondTrendStart, secondTrendEnd]);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await page.getByTestId("practice-terminal-lines-menu").getByRole("menuitem", { name: "Trend line" }).click();
      await clickPracticeChartCapture(page, { x: 0.30, y: 0.60 });
      await movePracticeChartPointer(page, { x: 0.56, y: 0.28 });
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(1);
      await page.keyboard.press("Escape");
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(0);
      await page.waitForTimeout(120);
      expect(trendLinePostCount).toBe(2);
      await expectOverlayCount("trend_line", 2);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await page.getByTestId("practice-terminal-lines-menu").getByRole("menuitem", { name: "Trend line" }).click();
      await clickPracticeChartCapture(page, { x: 0.32, y: 0.64 });
      await movePracticeChartPointer(page, { x: 0.60, y: 0.36 });
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(1);
      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await page.getByTestId("practice-terminal-lines-menu").getByRole("menuitem", { name: "Horizontal price line" }).click();
      await expect.poll(async () => (await klineDraftOverlays()).length).toBe(0);
      expect(trendLinePostCount).toBe(2);
      const horizontalPoint = await captureClientPoint({ x: 0.52, y: 0.54 });
      const horizontalResponsePromise = drawingResponse("POST");
      await clickPracticeChartCapture(page, { x: 0.52, y: 0.54 });
      const horizontalResponse = await horizontalResponsePromise;
      expect(horizontalResponse.ok()).toBeTruthy();
      const horizontal = (await horizontalResponse.json()).annotation;
      page.off("request", countTrendLinePosts);
      await expectOverlayCount("horizontal_line", 1);
      await expectOverlayEndpointsNear(horizontal.annotationId, [horizontalPoint]);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      const legacyTrendResponse = await page.request.post(
        new URL(`/api/student/practice/sessions/${createdSessionId}/drawings`, page.url()).toString(),
        {
          headers: { Authorization: `Bearer ${studentToken}` },
          data: {
            kind: "trend_line",
            label: "Legacy default trend",
            text: "Legacy default trend",
            candleIndex: Math.max(0, Math.min(lastRevealedDataIndex, Math.round(firstTrend.chartPoints[0].dataIndex))),
            secondCandleIndex: Math.max(0, Math.min(lastRevealedDataIndex, Math.round(secondTrend.chartPoints[1].dataIndex))),
            priceLevel: firstTrend.chartPoints[0].value,
            secondPriceLevel: secondTrend.chartPoints[1].value,
            coordinateVersion: "klinecharts_v2",
            chartPoints: [firstTrend.chartPoints[0], secondTrend.chartPoints[1]],
            colorToken: "accent",
            isMainLesson: false
          }
        }
      );
      const legacyTrendPayload = await legacyTrendResponse.json();
      expect(legacyTrendResponse.ok(), JSON.stringify(legacyTrendPayload)).toBe(true);
      const legacyTrend = legacyTrendPayload.annotation;
      expect(legacyTrend.colorToken).toBe("accent");
      expect(legacyTrend.appearanceVersion).toBeUndefined();
      await page.reload();
      await expect(page.getByTestId("practice-terminal-klinechart")).toBeVisible();
      await expectOverlayCount("trend_line", 3);
      await expectTrendOverlayBlue(firstTrend.annotationId);
      await expectTrendOverlayBlue(secondTrend.annotationId);
      await expectTrendOverlayBlue(legacyTrend.annotationId);
      const legacyDeleteResponse = await page.request.delete(
        new URL(`/api/student/practice/sessions/${createdSessionId}/drawings/${legacyTrend.annotationId}`, page.url()).toString(),
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      expect(legacyDeleteResponse.ok()).toBe(true);

      await page.getByRole("button", { name: "Lines and trend tools" }).click();
      await page.getByTestId("practice-terminal-lines-menu").getByRole("menuitem", { name: "Vertical line" }).click();
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "vertical_marker");
      const verticalPoint = await captureClientPoint({ x: 0.88, y: 0.48 });
      const verticalResponsePromise = drawingResponse("POST");
      await clickPracticeChartCapture(page, { x: 0.88, y: 0.48 });
      const verticalResponse = await verticalResponsePromise;
      expect(verticalResponse.ok()).toBeTruthy();
      const vertical = (await verticalResponse.json()).annotation;
      await expectOverlayCount("trend_line", 2);
      await expectOverlayCount("vertical_marker", 1);
      await expectOverlayEndpointsNear(vertical.annotationId, [verticalPoint]);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      const createdDragDrawings = {};
      const fibonacciStartX = Math.min(0.78, emptyPlotRatios.lastCandle + 0.1);
      const fibonacciEndX = Math.min(0.94, fibonacciStartX + 0.12);
      for (const tool of [
        { button: "Rectangle zone", kind: "zone", from: { x: 0.10, y: 0.30 }, to: { x: 0.34, y: 0.56 } },
        { button: "Fibonacci retracement", kind: "fibonacci_retracement", from: { x: fibonacciStartX, y: 0.72 }, to: { x: fibonacciEndX, y: 0.28 } },
        { button: "Measure", kind: "measurement_placeholder", from: { x: 0.18, y: 0.70 }, to: { x: 0.44, y: 0.38 } }
      ]) {
        await page.getByRole("button", { name: tool.button, exact: true }).click();
        const expectedStart = await captureClientPoint(tool.from);
        const expectedEnd = await captureClientPoint(tool.to);
        const responsePromise = drawingResponse("POST");
        await dragPracticeChartCapture(page, { from: tool.from, to: tool.to });
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        const drawing = (await response.json()).annotation;
        createdDragDrawings[tool.kind] = drawing;
        await expectOverlayCount(tool.kind, 1);
        await expectOverlayEndpointsNear(drawing.annotationId, [expectedStart, expectedEnd]);
        await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");
      }

      const fibonacci = createdDragDrawings.fibonacci_retracement;
      const boundedFibonacciPixels = await page.evaluate((overlayId) => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        const plot = chart?.getDom("candle_pane", "main");
        const overlay = chart?.getOverlays({ groupId: "tradehub_practice_drawings_v1" }).find((candidate) => candidate.id === overlayId);
        if (!chart || !plot || !overlay || overlay.points.length < 2) return null;
        const plotRect = plot.getBoundingClientRect();
        const points = overlay.points.map((point) => chart.convertToPixel(point, { paneId: "candle_pane" }));
        if (points.some(Array.isArray)) return null;
        const start = points[0];
        const end = points[1];
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const levelY = start.y + ((end.y - start.y) * 0.382);
        const size = chart.getSize("candle_pane", "main");
        const createdFigures = overlay.createPointFigures?.({
          chart,
          overlay,
          coordinates: points,
          bounding: { width: size?.width ?? plotRect.width, height: size?.height ?? plotRect.height, left: 0, top: 0 },
          xAxis: null,
          yAxis: null
        });
        const figureList = Array.isArray(createdFigures) ? createdFigures : [createdFigures].filter(Boolean);
        const renderedLevels = figureList.filter((figure) => String(figure?.key ?? "").startsWith("level-") && figure?.type === "line");
        const canvases = [...plot.querySelectorAll("canvas")];
        const target = { r: 34, g: 197, b: 94 };
        const hasTargetColor = (plotX, plotY) => canvases.some((canvas) => {
          const rect = canvas.getBoundingClientRect();
          const clientX = plotRect.left + plotX;
          const clientY = plotRect.top + plotY;
          if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context || rect.width <= 0 || rect.height <= 0) return false;
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const centerX = Math.round((clientX - rect.left) * scaleX);
          const centerY = Math.round((clientY - rect.top) * scaleY);
          for (let y = -3; y <= 3; y += 1) {
            for (let x = -3; x <= 3; x += 1) {
              const sampleX = Math.max(0, Math.min(canvas.width - 1, centerX + x));
              const sampleY = Math.max(0, Math.min(canvas.height - 1, centerY + y));
              const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;
              if (pixel[3] > 60 && Math.abs(pixel[0] - target.r) < 55 && Math.abs(pixel[1] - target.g) < 55 && Math.abs(pixel[2] - target.b) < 55) return true;
            }
          }
          return false;
        });
        const insideXs = [0.1, 0.3, 0.5, 0.7, 0.9].map((ratio) => left + ((right - left) * ratio));
        return {
          anchorWidth: right - left,
          plotWidth: plotRect.width,
          insideLevelMatches: insideXs.filter((x) => hasTargetColor(x, levelY)).length,
          insideSampleCount: insideXs.length,
          renderedLevelCount: renderedLevels.length,
          renderedLevelsBounded: renderedLevels.every((figure) => {
            const coordinates = figure.attrs?.coordinates ?? [];
            return coordinates.length === 2 &&
              Math.abs(coordinates[0].x - left) <= 0.5 &&
              Math.abs(coordinates[1].x - right) <= 0.5;
          }),
          maximumRenderedLevelWidth: Math.max(0, ...renderedLevels.map((figure) => {
            const coordinates = figure.attrs?.coordinates ?? [];
            return coordinates.length === 2 ? Math.abs(coordinates[1].x - coordinates[0].x) : 0;
          }))
        };
      }, fibonacci.annotationId);
      expect(boundedFibonacciPixels).not.toBeNull();
      expect(boundedFibonacciPixels.anchorWidth).toBeLessThan(boundedFibonacciPixels.plotWidth * 0.5);
      expect(boundedFibonacciPixels.insideLevelMatches).toBeGreaterThanOrEqual(4);
      expect(boundedFibonacciPixels.insideSampleCount).toBe(5);
      expect(boundedFibonacciPixels.renderedLevelCount).toBe(7);
      expect(boundedFibonacciPixels.renderedLevelsBounded).toBe(true);
      expect(boundedFibonacciPixels.maximumRenderedLevelWidth).toBeCloseTo(boundedFibonacciPixels.anchorWidth, 1);
      expect((await klineOverlays()).find((overlay) => overlay.id === createdDragDrawings.measurement_placeholder.annotationId)?.extendData?.color).toBe("#60a5fa");
      await expect(page.locator('[data-testid="practice-terminal-chart-drawing"], [data-testid="practice-terminal-drawing-endpoint"]')).toHaveCount(0);

      let textNotePostCount = 0;
      const countTextNotePosts = (request) => {
        if (
          request.method() === "POST" &&
          /\/api\/student\/practice\/sessions\/[^/]+\/drawings$/.test(new URL(request.url()).pathname) &&
          request.postDataJSON()?.kind === "text_note"
        ) {
          textNotePostCount += 1;
        }
      };
      page.on("request", countTextNotePosts);
      await page.getByRole("button", { name: "Text note", exact: true }).click();
      const textAnchor = await captureClientPoint({ x: 0.62, y: 0.30 });
      await clickPracticeChartCapture(page, { x: 0.62, y: 0.30 });
      const textEditor = page.getByTestId("practice-terminal-text-tool-editor");
      await expect(textEditor).toBeVisible();
      await expect(textEditor.getByRole("button", { name: /save|cancel/i })).toHaveCount(0);
      await expect(textEditor).toHaveAttribute("data-practice-text-note-commit", "automatic");
      const [textEditorBox, plotBox] = await Promise.all([
        textEditor.boundingBox(),
        page.evaluate(() => {
          const plot = window.__TRADEHUB_PRACTICE_KLINECHART__?.getDom("candle_pane", "main");
          if (!plot) return null;
          const rect = plot.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })
      ]);
      const viewportSize = page.viewportSize();
      expect(textEditorBox).not.toBeNull();
      expect(plotBox).not.toBeNull();
      expect(viewportSize).not.toBeNull();
      expect(textEditorBox.width).toBeLessThanOrEqual(205);
      expect(textEditorBox.height).toBeLessThanOrEqual(125);
      expect(textEditorBox.x).toBeGreaterThanOrEqual(plotBox.x);
      expect(textEditorBox.y).toBeGreaterThanOrEqual(plotBox.y);
      expect(textEditorBox.x + textEditorBox.width).toBeLessThanOrEqual(plotBox.x + plotBox.width + 1);
      expect(textEditorBox.y + textEditorBox.height).toBeLessThanOrEqual(plotBox.y + plotBox.height + 1);
      expect(textEditorBox.x + textEditorBox.width).toBeLessThanOrEqual(viewportSize.width);
      expect(textEditorBox.y + textEditorBox.height).toBeLessThanOrEqual(viewportSize.height);
      expect(Math.abs(textEditorBox.x - textAnchor.x)).toBeLessThanOrEqual(215);
      expect(Math.abs(textEditorBox.y - textAnchor.y)).toBeLessThanOrEqual(125);
      const createdMultilineText = "First line\nSecond line";
      await textEditor.getByLabel("Chart text note").fill(createdMultilineText);
      const noteCreateResponsePromise = drawingResponse("POST");
      await page.getByRole("button", { name: "Crosshair and cursor" }).click();
      const noteCreateResponse = await noteCreateResponsePromise;
      expect(noteCreateResponse.ok()).toBeTruthy();
      const createdNote = (await noteCreateResponse.json()).annotation;
      expect(createdNote.text).toBe(createdMultilineText);
      expect(textNotePostCount).toBe(1);
      await expect(textEditor).toHaveCount(0);
      await expectOverlayCount("text_note", 1);
      await expect.poll(async () => (await klineOverlays()).find((overlay) => overlay.id === createdNote.annotationId)?.extendData?.text).toBe(createdMultilineText);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      const editedMultilineText = "First line with a deliberately long chart annotation that must still wrap after editing\nSecond line remains intentionally separate\nEdited third line also stays inside the note";
      const selectedEditor = page.getByTestId("practice-terminal-selected-object-editor");
      await expect(selectedEditor).toBeVisible();
      await selectedEditor.getByLabel("Drawing text").fill(editedMultilineText);
      const noteEditResponsePromise = drawingResponse("PATCH", /\/drawings\/[^/]+$/);
      await selectedEditor.getByRole("button", { name: "Save drawing" }).click();
      const noteEditResponse = await noteEditResponsePromise;
      expect(noteEditResponse.ok()).toBeTruthy();
      expect((await noteEditResponse.json()).annotation.text).toBe(editedMultilineText);
      await expectOverlayCount("text_note", 1);
      await expect.poll(async () => (await klineOverlays()).find((overlay) => overlay.id === createdNote.annotationId)?.extendData?.text).toBe(editedMultilineText);

      await page.getByRole("button", { name: "Text note", exact: true }).click();
      await clickPracticeChartCapture(page, { x: 0.40, y: 0.36 });
      const blankEditor = page.getByTestId("practice-terminal-text-tool-editor");
      await expect(blankEditor).toBeVisible();
      await page.getByRole("button", { name: "Rectangle zone", exact: true }).click();
      await expect(blankEditor).toHaveCount(0);
      expect(textNotePostCount).toBe(1);
      await expectOverlayCount("text_note", 1);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "zone");

      await page.getByRole("button", { name: "Text note", exact: true }).click();
      await clickPracticeChartCapture(page, { x: 0.44, y: 0.40 });
      const escapedEditor = page.getByTestId("practice-terminal-text-tool-editor");
      await escapedEditor.getByLabel("Chart text note").fill("Discard this note");
      await page.keyboard.press("Escape");
      await expect(escapedEditor).toHaveCount(0);
      expect(textNotePostCount).toBe(1);
      await expectOverlayCount("text_note", 1);
      await expect(page.getByTestId("practice-terminal-chart-click-layer")).toHaveAttribute("data-active-drawing-tool", "select");

      let failedAutomaticSaveCount = 0;
      const textFailureRoute = /\/api\/student\/practice\/sessions\/[^/]+\/drawings$/;
      await page.route(textFailureRoute, async (route) => {
        if (route.request().method() !== "POST" || route.request().postDataJSON()?.kind !== "text_note" || failedAutomaticSaveCount > 0) {
          await route.continue();
          return;
        }
        failedAutomaticSaveCount += 1;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "simulated_text_note_failure", message: "Simulated automatic note save failure." } })
        });
      });
      await page.getByRole("button", { name: "Text note", exact: true }).click();
      await clickPracticeChartCapture(page, { x: 0.48, y: 0.44 });
      const failedEditor = page.getByTestId("practice-terminal-text-tool-editor");
      const failedText = "Keep this line\nAnd this line";
      await failedEditor.getByLabel("Chart text note").fill(failedText);
      await page.getByRole("button", { name: "Crosshair and cursor" }).click();
      await expect(failedEditor).toHaveAttribute("data-practice-text-note-state", "error");
      await expect(failedEditor.getByLabel("Chart text note")).toHaveValue(failedText);
      await expect(failedEditor).toContainText("Your text is still here");
      expect(failedAutomaticSaveCount).toBe(1);
      expect(textNotePostCount).toBe(2);
      await expectOverlayCount("text_note", 1);
      await page.unroute(textFailureRoute);
      await page.keyboard.press("Escape");
      await expect(failedEditor).toHaveCount(0);
      expect(textNotePostCount).toBe(2);
      await expectOverlayCount("text_note", 1);
      page.off("request", countTextNotePosts);

      const candlePaneClientRect = await page.evaluate(() => {
        const plot = window.__TRADEHUB_PRACTICE_KLINECHART__?.getDom("candle_pane", "main");
        if (!plot) return null;
        const rect = plot.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      expect(candlePaneClientRect).not.toBeNull();
      let movableTrend = null;
      let movableTrendPointIndex = -1;
      let movableTrendPointBefore = null;
      for (const candidate of [firstTrend, secondTrend]) {
        const candidateOverlay = (await klineOverlays()).find((overlay) => overlay.id === candidate.annotationId);
        const candidateEndpoints = await overlayClientPoints(candidate.annotationId);
        const visiblePointIndex = candidateEndpoints.findIndex((point) =>
          point.x >= candlePaneClientRect.left + 8 && point.x <= candlePaneClientRect.right - 8 &&
          point.y >= candlePaneClientRect.top + 8 && point.y <= candlePaneClientRect.bottom - 8
        );
        if (candidateOverlay && visiblePointIndex >= 0) {
          movableTrend = candidate;
          movableTrendPointIndex = visiblePointIndex;
          movableTrendPointBefore = candidateOverlay.points[visiblePointIndex];
          break;
        }
      }
      expect(movableTrend).not.toBeNull();
      expect(movableTrendPointIndex).toBeGreaterThanOrEqual(0);
      expect(movableTrendPointBefore).not.toBeNull();
      const movableTrendEndpoint = (await overlayClientPoints(movableTrend.annotationId))[movableTrendPointIndex];
      expect(movableTrendEndpoint).toBeTruthy();
      await selectTrendFromNativeSegment(movableTrend.annotationId);
      await expect(page.getByTestId("practice-terminal-selected-object-editor")).toContainText(/Trend line/i);
      const selectedTrendEndpoint = (await overlayClientPoints(movableTrend.annotationId))[movableTrendPointIndex];
      expect(selectedTrendEndpoint).toBeTruthy();
      await page.mouse.move(selectedTrendEndpoint.x, selectedTrendEndpoint.y, { steps: 4 });
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.mouse.up();
      await page.evaluate(() => new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      }));
      const endpointPatchPromise = drawingResponse("PATCH", /\/drawings\/[^/]+$/);
      await page.mouse.move(selectedTrendEndpoint.x, selectedTrendEndpoint.y, { steps: 4 });
      await page.waitForTimeout(150);
      await page.mouse.down();
      await page.mouse.move(selectedTrendEndpoint.x + 28, selectedTrendEndpoint.y - 18, { steps: 8 });
      await page.mouse.up();
      await expect.poll(async () => {
        const point = (await klineOverlays()).find((overlay) => overlay.id === movableTrend.annotationId)?.points[movableTrendPointIndex];
        return JSON.stringify(point);
      }).not.toBe(JSON.stringify(movableTrendPointBefore));
      const endpointPatchResponse = await endpointPatchPromise;
      expect(endpointPatchResponse.ok()).toBeTruthy();
      const movedTrend = (await endpointPatchResponse.json()).annotation;
      expect(movedTrend.colorToken).toBe("blue");
      expect(movedTrend.appearanceVersion).toBe("trend_blue_v1");
      expect(JSON.stringify(movedTrend.chartPoints[movableTrendPointIndex])).not.toBe(JSON.stringify(movableTrendPointBefore));
      await expect.poll(async () => {
        const point = (await klineOverlays()).find((overlay) => overlay.id === movableTrend.annotationId)?.points[movableTrendPointIndex];
        return JSON.stringify(point);
      }).not.toBe(JSON.stringify(movableTrendPointBefore));
      const movedTrendPoint = movedTrend.chartPoints[movableTrendPointIndex];
      await page.reload();
      await expect(page.getByTestId("practice-terminal-klinechart")).toBeVisible();
      await expect.poll(async () => JSON.stringify((await klineOverlays()).find((overlay) => overlay.id === movableTrend.annotationId)?.points[movableTrendPointIndex])).toBe(JSON.stringify(movedTrendPoint));
      await expectTrendOverlayBlue(firstTrend.annotationId);
      await expectTrendOverlayBlue(secondTrend.annotationId);
      await expect.poll(async () => (await klineOverlays()).find((overlay) => overlay.id === createdNote.annotationId)?.extendData?.text).toBe(editedMultilineText);
      const noteRenderGeometry = await page.evaluate((overlayId) => {
        const chart = window.__TRADEHUB_PRACTICE_KLINECHART__;
        const overlay = chart?.getOverlays({ id: overlayId })[0];
        const size = chart?.getSize("candle_pane", "main");
        if (!chart || !overlay || !size || !overlay.createPointFigures) return null;
        const coordinates = overlay.points.map((point) => chart.convertToPixel(point, { paneId: "candle_pane" }));
        if (coordinates.some(Array.isArray)) return null;
        const figures = overlay.createPointFigures({
          chart,
          overlay,
          coordinates,
          bounding: { width: size.width, height: size.height, left: 0, top: 0 },
          xAxis: null,
          yAxis: null
        });
        const list = Array.isArray(figures) ? figures : [figures];
        const hitAreaFigure = list.find((figure) => figure?.key === "note-hit-area");
        const hitArea = hitAreaFigure?.attrs;
        const textFigures = list.filter((figure) => String(figure?.key ?? "").startsWith("note-line-"));
        if (!hitArea || textFigures.length === 0) return null;
        const context = document.createElement("canvas").getContext("2d");
        if (!context) return null;
        context.font = "600 11px sans-serif";
        return {
          hitArea,
          hitAreaStyle: hitAreaFigure.styles,
          hasPermanentCard: list.some((figure) => figure?.key === "note-card"),
          rawText: overlay.extendData?.text,
          overlayColor: overlay.extendData?.color,
          renderedLineCount: textFigures.length,
          sourceLineCount: String(overlay.extendData?.text ?? "").split("\n").length,
          lines: textFigures.map((figure) => {
            const attrs = figure.attrs;
            const measuredWidth = context.measureText(String(attrs.text)).width;
            return {
              text: attrs.text,
              left: attrs.x,
              right: attrs.x + measuredWidth,
              top: attrs.y,
              bottom: attrs.y + 11
            };
          })
        };
      }, createdNote.annotationId);
      expect(noteRenderGeometry).not.toBeNull();
      expect(noteRenderGeometry.rawText).toBe(editedMultilineText);
      expect(noteRenderGeometry.overlayColor).toBe("#60a5fa");
      expect(noteRenderGeometry.hasPermanentCard).toBe(false);
      expect(noteRenderGeometry.hitAreaStyle.color).toBe("rgba(41,98,255,0.001)");
      expect(noteRenderGeometry.hitAreaStyle.borderColor).toBe("transparent");
      expect(noteRenderGeometry.renderedLineCount).toBeGreaterThan(noteRenderGeometry.sourceLineCount);
      for (const line of noteRenderGeometry.lines) {
        expect(line.left).toBeGreaterThanOrEqual(noteRenderGeometry.hitArea.x);
        expect(line.right).toBeLessThanOrEqual(noteRenderGeometry.hitArea.x + noteRenderGeometry.hitArea.width);
        expect(line.top).toBeGreaterThanOrEqual(noteRenderGeometry.hitArea.y);
        expect(line.bottom).toBeLessThanOrEqual(noteRenderGeometry.hitArea.y + noteRenderGeometry.hitArea.height);
      }

      const visibleObjectTree = page.locator('[data-testid="practice-terminal-object-tree"]:visible');
      if (await visibleObjectTree.count() === 0) {
        await page.getByRole("button", { name: "Open analytics and objects" }).click();
        await expect(visibleObjectTree).toBeVisible();
      }
      await visibleObjectTree.getByRole("button", { name: "Drawings", exact: true }).click();
      const trendRows = visibleObjectTree
        .getByTestId("practice-terminal-object-tree-row")
        .filter({ hasText: /Trend line/i });
      await expect(trendRows).toHaveCount(2);
      const movableTrendRowIndex = movableTrend.annotationId === firstTrend.annotationId ? 0 : 1;
      await trendRows.nth(movableTrendRowIndex).click();
      await expect(page.locator('[data-testid="practice-terminal-selected-object-editor"]:visible')).toContainText(/Trend line/i);

      const selectedDeleteResponsePromise = drawingResponse("DELETE", /\/drawings\/[^/]+$/);
      await page.getByRole("button", { name: "Clear chart drawings" }).click();
      await clickVisibleToolPopoverOption({ menuTestId: "practice-terminal-delete-menu", optionName: "Delete selected drawing" });
      const selectedDeleteResponse = await selectedDeleteResponsePromise;
      expect(selectedDeleteResponse.ok()).toBeTruthy();
      expect((await selectedDeleteResponse.json()).deletedAnnotationId).toBe(movableTrend.annotationId);
      await expectOverlayCount("text_note", 1);
      await expectOverlayCount("trend_line", 1);
      await expectOverlayCount("horizontal_line", 1);

      const zoomBaseline = await readViewport();
      await page.getByRole("button", { name: "Zoom in" }).click();
      await dragPracticeChartCapture(page, {
        from: { x: 0.26, y: 0.30 },
        to: { x: 0.66, y: 0.72 }
      });
      const zoomOut = page.getByTestId("practice-terminal-zoom-out");
      await expect(zoomOut).toBeVisible();
      expect(Number(await zoomOut.getAttribute("data-practice-terminal-zoom-baseline-bar-space"))).toBeCloseTo(zoomBaseline.barSpace, 5);
      const zoomedViewport = await readViewport();
      const zoomAnchorDataIndex = Math.round(zoomedViewport.centerDataIndex);
      const zoomedAnchoredViewport = await readViewport(zoomAnchorDataIndex);
      await page.getByRole("button", { name: "Next candle" }).click();
      await expect.poll(async () => (await readViewport())?.dataCount).toBe(zoomedViewport.dataCount + 1);
      await expect.poll(async () => Math.abs((await readViewport(zoomAnchorDataIndex)).anchorPixelX - zoomedAnchoredViewport.anchorPixelX)).toBeLessThanOrEqual(1);
      const zoomedAfterNext = await readViewport(zoomAnchorDataIndex);
      expect(zoomedAfterNext.barSpace).toBeCloseTo(zoomedViewport.barSpace, 5);
      expect(zoomedAfterNext.anchorPixelX).toBeCloseTo(zoomedAnchoredViewport.anchorPixelX, 0);
      await expect(zoomOut).toBeVisible();
      await zoomOut.click();
      await expect(zoomOut).toHaveCount(0);
      const restoredViewport = await readViewport();
      expect(restoredViewport.barSpace).toBeCloseTo(zoomBaseline.barSpace, 5);

      let committedClearCount = 0;
      const clearRoutePattern = /\/api\/student\/practice\/sessions\/[^/]+\/drawings$/;
      await page.route(clearRoutePattern, async (route) => {
        if (route.request().method() !== "DELETE") {
          await route.continue();
          return;
        }

        const committedResponse = await route.fetch();
        const committedPayload = await committedResponse.json();
        committedClearCount = committedPayload.deletedDrawingCount;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "simulated_response_loss",
              message: "Simulated response loss after the atomic drawing clear committed."
            }
          })
        });
      });
      await page.getByRole("button", { name: "Clear chart drawings" }).click();
      await clickVisibleToolPopoverOption({ menuTestId: "practice-terminal-delete-menu", optionName: "Clear chart drawings" });
      await expect.poll(() => committedClearCount).toBe(7);
      await expectOverlayCount("trend_line", 0);
      await expectOverlayCount("horizontal_line", 0);
      await expectOverlayCount("vertical_marker", 0);
      await expectOverlayCount("zone", 0);
      await expectOverlayCount("fibonacci_retracement", 0);
      await expectOverlayCount("measurement_placeholder", 0);
      await expectOverlayCount("text_note", 0);
      await expect(page.locator("body")).toContainText("Simulated response loss after the atomic drawing clear committed.");
      await page.unroute(clearRoutePattern);
    } finally {
      if (createdSessionId) {
        await deleteStandalonePracticeSessionByApi(page, createdSessionId, sessionName);
      }
    }
  });
  }

  test("courses, lesson reader, notes, bookmarks, and proof route load safely", async ({ page }) => {
    await openStudentPage(page, "/app/courses", /Courses|Continue learning|Demo Trading Foundations/i);
    await assertStudentCourseCopySimplified(page);
    await expect(page.locator("body")).toContainText(/Private notes|Bookmarked lessons|Locked course/i);

    await openStudentPage(
      page,
      `/app/courses/${demoStudentIds.courseId}`,
      /Demo Trading Foundations|Risk Before Entry|Notes and bookmarks/i
    );
    await assertStudentCourseCopySimplified(page);
    await expect(page.locator("body")).toContainText(/Knowledge check|Pass this check/i);
    await expect(page.locator("body")).toContainText(/Save note|Save bookmark|Save continue point/i);
    await expect(page.locator("body")).not.toContainText(/answer key|correctIndex/i);

    await openStudentPage(
      page,
      `/app/courses/${demoStudentIds.courseId}/proof`,
      /Course completion proof|completion proof|not ready|not complete/i
    );
    await assertStudentCourseCopySimplified(page);
    await expect(page.locator("body")).toContainText(/printable proof|Keep this proof for your records/i);
    await expect(page.locator("body")).not.toContainText(/Proof ref|Safe ref|credentials|payment details|Copier records/i);
  });

  test("Journal separates confirmed account history from simulated backtesting", async ({ page }) => {
    const requestedUrls = [];
    page.on("request", (request) => requestedUrls.push(request.url()));
    try {
      await clearConnectedJournalFixtures(page);
      await clearPracticeAnalyticsLossFixture(page);
      await clearPracticeAnalyticsUnmatchedFixture(page);
      const connectedResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.request().method() === "GET"
      );

      await openStudentPage(page, "/app/journal", /Journal|My Trades|Connected accounts/i);
      const connectedResponse = await connectedResponsePromise;
      const connectedPayload = await connectedResponse.json();

      await expect(page.getByTestId("journal-tab-my_trades")).toHaveAttribute("aria-selected", "true");
      await expect(page.getByTestId("journal-my-trades-view")).toBeVisible();
      await expect(page.getByTestId("journal-backtesting-view")).toHaveCount(0);
      await expect(page.getByTestId("journal-equity-empty-state")).toBeVisible();
      await expect(page.getByTestId("journal-equity-visual")).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(/Add manual trade|Edit manual trade|Manual CRUD|Import \/ export|AI Insight/i);
      expect(requestedUrls.some((url) => url.includes("/api/student/journal/manual-trades"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/student/practice/analytics"))).toBe(false);

      expect(connectedPayload.trades).toEqual([]);
      expect(connectedPayload.readiness).toMatchObject({ state: "not_configured", journalSyncConfigured: false, historyAvailable: false });
      expect(connectedPayload.resultWindow).toMatchObject({ matchedCount: 0, visibleCount: 0, hasMore: false, truncated: false });
      expect(JSON.stringify(connectedPayload)).not.toMatch(/workspaceId|studentId|sourceRecordId|connectionId|sanitizedFailure|providerPayload|vaultRef/i);
      expect(JSON.stringify(connectedPayload)).not.toMatch(/journal_demo_crypto_paper|journal_demo_crypto_testnet|journal_demo_forex_demo|journal_demo_production_unconfirmed/i);

      await installConnectedJournalFixtures(page);
      const populatedResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.request().method() === "GET"
      );
      await page.getByRole("button", { name: "Refresh" }).click();
      const populatedPayload = await (await populatedResponsePromise).json();

      expect(populatedPayload.trades.map((trade) => trade.symbol)).toEqual(["XAUUSD", "EURUSD", "SOLUSDT", "ETHUSDT", "BTCUSDT"]);
      expect(populatedPayload.trades.map((trade) => trade.status)).toEqual(["closed", "closed", "partial", "open", "open"]);
      expect(populatedPayload.trades.find((trade) => trade.symbol === "ETHUSDT")).toMatchObject({ status: "open", providerStatus: "filled" });
      expect(populatedPayload.trades.find((trade) => trade.symbol === "XAUUSD")).toMatchObject({ source: "copied", status: "closed", realizedPnl: 75 });
      expect(populatedPayload.trades.find((trade) => trade.symbol === "EURUSD")).toMatchObject({ source: "provider_manual", status: "closed", realizedPnl: -25 });
      expect(populatedPayload.performance).toMatchObject({ totalTrades: 5, openTrades: 3, closedTrades: 2, wins: 1, losses: 1, winRate: 0.5, netPnl: 50, averageR: 0.5, maxDrawdown: 25 });
      expect(populatedPayload.equityCurve.map((point) => ({ pnl: point.pnl, equity: point.equity, drawdown: point.drawdown }))).toEqual([
        { pnl: -25, equity: -25, drawdown: 25 },
        { pnl: 75, equity: 50, drawdown: 0 }
      ]);
      expect(populatedPayload.dailyPnl).toEqual(expect.arrayContaining([
        expect.objectContaining({ period: "2026-08-29", pnl: -25, trades: 1 }),
        expect.objectContaining({ period: "2026-08-30", pnl: 75, trades: 1 })
      ]));
      expect(populatedPayload.resultWindow).toMatchObject({ matchedCount: 5, visibleCount: 5, hasMore: false, truncated: false });
      expect(populatedPayload.resultWindow.scannedCount).toBeGreaterThanOrEqual(9);
      expect(populatedPayload.readiness).toMatchObject({ state: "not_configured", journalSyncConfigured: false, historyAvailable: true, historyAccountCount: 1 });
      await expect(page.getByTestId("connected-journal-result-window")).toContainText(/Showing 5 of 5 matching trades|Journal Sync: not configured/i);
      await expect(page.locator("body")).toContainText(/Copied|Placed at provider|Realized P&L|Max drawdown/i);

      const closedResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.url().includes("status=closed")
      );
      await page.getByLabel("Status").selectOption("closed");
      const closedPayload = await (await closedResponsePromise).json();
      expect(closedPayload.resultWindow).toMatchObject({ matchedCount: 2, visibleCount: 2 });
      expect(closedPayload.performance).toMatchObject({ totalTrades: 2, closedTrades: 2, netPnl: 50 });
      expect(closedPayload.trades.every((trade) => trade.status === "closed")).toBe(true);

      const manualSourceResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/journal/connected-trades") && response.url().includes("source=provider_manual")
      );
      await page.getByLabel("Source").selectOption("provider_manual");
      const manualSourcePayload = await (await manualSourceResponsePromise).json();
      expect(manualSourcePayload.resultWindow).toMatchObject({ matchedCount: 1, visibleCount: 1 });
      expect(manualSourcePayload.trades[0]).toMatchObject({ symbol: "EURUSD", source: "provider_manual", status: "closed" });

      const practiceResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/practice/analytics") && response.request().method() === "GET"
      );
      await page.getByTestId("journal-tab-backtesting").click();
      const practicePayload = await (await practiceResponsePromise).json();
      await expect(page.getByTestId("journal-backtesting-view")).toBeVisible();
      await expect(page.getByTestId("journal-my-trades-view")).toHaveCount(0);
      await expect(page.locator("body")).toContainText(/simulated practice results only|Simulated sessions|Strategies/i);
      await expect(page.locator("body")).not.toContainText(/Journal QA account|Placed at provider/i);

      const seededSession = practicePayload.sessionSummaries.find((session) => session.sessionId === demoStudentIds.practiceSessionId);
      const seededCurvePoint = practicePayload.equityCurve.find((point) => point.orderId === "practice_order_demo_closed_win");
      expect(seededSession).toMatchObject({ netPnl: 1452, closedTrades: 1 });
      expect(seededCurvePoint).toMatchObject({ pnl: 1452, equity: 101452, drawdown: 0 });
      expect(practicePayload.dailyPnl).toContainEqual(expect.objectContaining({ date: "2026-08-24", pnl: 1452, trades: 1 }));
      expect(practicePayload.symbolBreakdown).toContainEqual(expect.objectContaining({ symbol: "BTCUSDT", netPnl: 1452, trades: 1 }));
      expect(practicePayload.playbookBreakdown).toContainEqual(expect.objectContaining({ playbookId: "playbook_demo_breakout", netPnl: 1452, trades: 1 }));
      expect(practicePayload.cohortCoverage).toMatchObject({ excludedOrderCount: 0, eligibleClosedOrderCount: 1 });
      expect(practicePayload.hasClosedTrades).toBe(practicePayload.cohortCoverage.eligibleClosedOrderCount > 0);
      await expect(page.getByTestId("journal-backtesting-coverage-warning")).toHaveCount(0);
      await expect(page.getByTestId("journal-equity-visual")).toBeVisible();
      await expect(page.getByTestId("journal-equity-single-point")).toBeVisible();
      await expect(page.getByTestId("journal-equity-empty-state")).toHaveCount(0);
      await expect(page.getByTestId("journal-equity-final-value")).toContainText("101,452");
      await expect(page.getByTestId("journal-backtesting-view")).not.toContainText("Complete simulated trades to build a backtesting equity curve.");
      await expect(page.getByTestId("journal-kpi-simulated-pnl")).toContainText("+1,452");
      await expect(page.getByTestId("journal-month-result").filter({ hasText: "2026-08" })).toContainText("+1,452");
      await expect(page.getByTestId("journal-symbol-result").filter({ hasText: "BTCUSDT" })).toContainText("+1,452");
      await expect(page.getByTestId("journal-strategy-result").filter({ hasText: "Demo Breakout" })).toContainText("+1,452");
      await expect(page.getByTestId("journal-backtesting-session").filter({ hasText: "BTCUSDT" })).toContainText("+1,452");

      await installPracticeAnalyticsLossFixture(page);
      await installPracticeAnalyticsUnmatchedFixture(page);
      await page.getByTestId("journal-tab-my_trades").click();
      const lossResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/student/practice/analytics") && response.request().method() === "GET"
      );
      await page.getByTestId("journal-tab-backtesting").click();
      const lossPayload = await (await lossResponsePromise).json();
      expect(lossPayload.sessionSummaries).toContainEqual(expect.objectContaining({ sessionId: "stage29f_browser_practice_loss_session", netPnl: -108, maxDrawdown: 108 }));
      expect(lossPayload.equityCurve).toContainEqual(expect.objectContaining({ orderId: "stage29f_browser_practice_loss_order", pnl: -108, drawdown: 108 }));
      expect(lossPayload.dailyPnl).toContainEqual(expect.objectContaining({ date: "2026-08-25", pnl: -108, trades: 1, losses: 1 }));
      expect(lossPayload.symbolBreakdown).toContainEqual(expect.objectContaining({ symbol: "ETHUSDT", netPnl: -108, maxDrawdown: 108 }));
      expect(lossPayload.cohortCoverage).toMatchObject({ excludedOrderCount: 1, eligibleClosedOrderCount: 2 });
      expect(lossPayload.hasClosedTrades).toBe(lossPayload.cohortCoverage.eligibleClosedOrderCount > 0);
      await expect(page.getByTestId("journal-backtesting-coverage-warning")).toBeVisible();
      await expect(page.getByTestId("journal-backtesting-coverage-warning")).toContainText("1 bounded order record was excluded");
      await expect(page.getByTestId("journal-backtesting-coverage-warning")).toContainText("2 eligible closed trades");
      expect(lossPayload.equityCurve.some((point) => point.orderId === "stage29f_browser_practice_unmatched_order")).toBe(false);
      expect(lossPayload.dailyPnl.some((result) => result.date === "2026-08-26")).toBe(false);
      expect(lossPayload.playbookBreakdown).toContainEqual(expect.objectContaining({ playbookId: "playbook_demo_breakout", netPnl: 1344, trades: 2 }));
      expect(lossPayload.sessionSummaries.some((session) => session.sessionId === "stage29f_browser_practice_missing_session")).toBe(false);
      expect(lossPayload.bestSessions.some((session) => session.sessionId === "stage29f_browser_practice_missing_session")).toBe(false);
      expect(lossPayload.worstSessions.some((session) => session.sessionId === "stage29f_browser_practice_missing_session")).toBe(false);
      expect(lossPayload.challengeSummary).toEqual(practicePayload.challengeSummary);
      expect(JSON.stringify(lossPayload.symbolBreakdown)).not.toContain("9999");
      expect(JSON.stringify({
        equityCurve: lossPayload.equityCurve,
        dailyPnl: lossPayload.dailyPnl,
        symbolBreakdown: lossPayload.symbolBreakdown,
        playbookBreakdown: lossPayload.playbookBreakdown,
        challengeSummary: lossPayload.challengeSummary,
        sessionSummaries: lossPayload.sessionSummaries,
        bestSessions: lossPayload.bestSessions,
        worstSessions: lossPayload.worstSessions,
        recentCompletedSessions: lossPayload.recentCompletedSessions
      })).not.toContain("9999");
      await expect(page.getByTestId("journal-kpi-simulated-pnl")).toContainText("+1,344");
      await expect(page.getByTestId("journal-month-result").filter({ hasText: "2026-08" })).toContainText("+1,344");
      await expect(page.getByTestId("journal-strategy-result").filter({ hasText: "Demo Breakout" })).toContainText("+1,344");
      await expect(page.getByTestId("journal-backtesting-view")).not.toContainText("+11,343");

      for (const viewport of [{ width: 1180, height: 820 }, { width: 820, height: 1080 }]) {
        await page.setViewportSize(viewport);
        await expect(page.getByTestId("student-journal-workspace")).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      }
    } finally {
      await clearPracticeAnalyticsUnmatchedFixture(page);
      await clearPracticeAnalyticsLossFixture(page);
      await clearConnectedJournalFixtures(page);
    }
  });

  test("Wrong role student is safely blocked from workspace and Super Admin routes", async ({ page }) => {
    await assertWrongRoleBlocked(page, "/workspace");
    await assertWrongRoleBlocked(page, "/admin");
  });
});
