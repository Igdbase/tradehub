import { expect, test } from "@playwright/test";
import { demoUsers, signInAs } from "./helpers/auth.mjs";
import { assertTradeHubPageHealthy } from "./helpers/assertions.mjs";

const route = "/app/internal/klinechart-spike";
const spikeSessionId = "practice_demo_klinechart_spike";

async function getStudentEmulatorToken(page) {
  const response = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=stage15f-local",
    {
      data: {
        email: demoUsers.student.email,
        password: demoUsers.student.password,
        returnSecureToken: true
      }
    }
  );
  expect(response.ok(), "seeded student should authenticate against the local emulator").toBeTruthy();
  const payload = await response.json();
  expect(typeof payload.idToken).toBe("string");
  return payload.idToken;
}

async function studentPracticeApi(page, token, path, options = {}) {
  return page.request.fetch(new URL(path, page.url()).toString(), {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
}

async function assertAuthoritativeRevealBoundary(page, token, expectedIndex, expectedCount) {
  const response = await studentPracticeApi(
    page,
    token,
    `/api/student/practice/sessions/${spikeSessionId}/candles?index=71`
  );
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.currentCandleIndex).toBe(expectedIndex);
  expect(payload.session.currentCandleIndex).toBe(expectedIndex);
  expect(payload.revealedCandleCount).toBe(expectedCount);
  expect(payload.candles).toHaveLength(expectedCount);
}

async function gotoSpikeAfterSignIn(page) {
  try {
    await page.goto(route);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("interrupted by another navigation")) {
      throw error;
    }
    await page.waitForURL((url) => url.pathname === "/app", { timeout: 10_000 });
    await page.goto(route);
  }
  await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, "\\/")}$`));
}

async function chartPoint(chart, xRatio, yRatio) {
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error("KLineChart spike canvas does not have a bounding box.");
  return {
    x: box.x + box.width * xRatio,
    y: box.y + box.height * yRatio
  };
}

async function clickPoint(page, point) {
  await page.mouse.click(point.x, point.y);
}

async function drawTwoClickOverlay(page, chart, startRatio, endRatio) {
  const start = await chartPoint(chart, startRatio[0], startRatio[1]);
  const end = await chartPoint(chart, endRatio[0], endRatio[1]);
  await clickPoint(page, start);
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await clickPoint(page, end);
  return { start, end };
}

async function drawStockOverlay(page, chart, startRatio, endRatio, confirmationClicks) {
  const points = await drawTwoClickOverlay(page, chart, startRatio, endRatio);
  for (let index = 0; index < confirmationClicks; index += 1) {
    await clickPoint(page, points.end);
  }
  return points;
}

async function expectPersistedCount(page, count) {
  await expect(page.getByTestId("klinechart-spike-persisted-count")).toHaveText(String(count));
}

async function overlayPointToPage(page, chart, point) {
  const pixel = await page.evaluate((overlayPoint) => {
    const spikeChart = window.__TRADEHUB_KLINECHART_SPIKE__;
    if (!spikeChart) throw new Error("KLineChart spike test hook is unavailable.");
    return spikeChart.convertToPixel(overlayPoint);
  }, point);
  const box = await chart.boundingBox();
  if (!box || typeof pixel.x !== "number" || typeof pixel.y !== "number") {
    throw new Error("KLineChart could not convert the overlay point to a testable pixel.");
  }
  return { x: box.x + pixel.x, y: box.y + pixel.y };
}

for (const viewport of [
  { label: "laptop", width: 1366, height: 820 },
  { label: "tablet", width: 900, height: 760 }
]) {
  test(`KLineChart native overlays and revealed replay work at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signInAs(page, "student", "/app");
    const studentToken = await getStudentEmulatorToken(page);
    const resetResponse = await studentPracticeApi(
      page,
      studentToken,
      `/api/student/practice/sessions/${spikeSessionId}`,
      { method: "PATCH", data: { currentCandleIndex: 23 } }
    );
    expect(resetResponse.status()).toBe(200);
    await assertAuthoritativeRevealBoundary(page, studentToken, 23, 24);
    await gotoSpikeAfterSignIn(page);
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await assertTradeHubPageHealthy(page);

    const chart = page.getByTestId("klinechart-spike-chart");
    await expect(chart).toBeVisible();
    await expect(page.getByTestId("klinechart-spike-candle-count")).toContainText("24 revealed");
    await expectPersistedCount(page, 0);

    await page.getByTestId("klinechart-spike-next-candle").click();
    await expect(page.getByTestId("klinechart-spike-candle-count")).toContainText("25 revealed");
    await expect(page.getByTestId("klinechart-spike-status")).toContainText("no later candles were returned");
    await assertAuthoritativeRevealBoundary(page, studentToken, 24, 25);

    await page.getByTestId("klinechart-tool-segment").click();
    const firstStart = await chartPoint(chart, 0.25, 0.35);
    const firstEnd = await chartPoint(chart, 0.58, 0.58);
    await clickPoint(page, firstStart);
    await expectPersistedCount(page, 0);
    await page.mouse.move(firstEnd.x, firstEnd.y, { steps: 10 });
    await expect(page.getByTestId("klinechart-spike-tool-state")).toContainText("preview is updating");
    await clickPoint(page, firstEnd);
    await expectPersistedCount(page, 1);

    await drawTwoClickOverlay(page, chart, [0.32, 0.68], [0.72, 0.28]);
    await expectPersistedCount(page, 2);
    const twoSegments = JSON.parse(await page.getByTestId("klinechart-spike-overlay-json").innerText());
    expect(twoSegments).toHaveLength(2);
    expect(new Set(twoSegments.map((overlay) => overlay.id)).size).toBe(2);
    expect(twoSegments.every((overlay) => overlay.name === "segment" && overlay.points.length === 2)).toBeTruthy();

    const secondOverlay = twoSegments[1];
    const secondStartPixel = await overlayPointToPage(page, chart, secondOverlay.points[0]);
    const secondEndPixel = await overlayPointToPage(page, chart, secondOverlay.points[1]);
    await page.getByTestId("klinechart-tool-select").click();
    await clickPoint(page, {
      x: (secondStartPixel.x + secondEndPixel.x) / 2,
      y: (secondStartPixel.y + secondEndPixel.y) / 2
    });
    await expect(page.getByTestId("klinechart-spike-selected-id")).toHaveText(secondOverlay.id);
    const beforeMove = await page.getByTestId("klinechart-spike-overlay-json").innerText();
    await page.mouse.move(secondStartPixel.x, secondStartPixel.y);
    await page.mouse.down();
    await page.mouse.move(secondStartPixel.x + 36, secondStartPixel.y - 28, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.getByTestId("klinechart-spike-overlay-json").innerText()).not.toBe(beforeMove);

    await page.getByTestId("klinechart-spike-delete-selected").click();
    await expectPersistedCount(page, 1);
    const remaining = JSON.parse(await page.getByTestId("klinechart-spike-overlay-json").innerText());
    expect(remaining).toHaveLength(1);

    await page.getByTestId("klinechart-tool-horizontalStraightLine").click();
    await drawStockOverlay(page, chart, [0.46, 0.44], [0.58, 0.44], 0);
    await expectPersistedCount(page, 2);
    await page.getByTestId("klinechart-tool-verticalStraightLine").click();
    await drawStockOverlay(page, chart, [0.52, 0.42], [0.52, 0.58], 0);
    await expectPersistedCount(page, 3);

    await page.getByTestId("klinechart-tool-fibonacciLine").click();
    await drawStockOverlay(page, chart, [0.2, 0.7], [0.65, 0.32], 1);
    await expectPersistedCount(page, 4);
    await page.getByTestId("klinechart-tool-rect").click();
    await drawStockOverlay(page, chart, [0.36, 0.35], [0.68, 0.66], 1);
    await expectPersistedCount(page, 5);
    await page.getByTestId("klinechart-tool-measure").click();
    await drawStockOverlay(page, chart, [0.3, 0.64], [0.7, 0.4], 1);
    await expectPersistedCount(page, 6);

    const serialized = JSON.parse(await page.getByTestId("klinechart-spike-overlay-json").innerText());
    expect(new Set(serialized.map((overlay) => overlay.name))).toEqual(
      new Set(["segment", "horizontalStraightLine", "verticalStraightLine", "fibonacciLine", "rect", "measure"])
    );
    expect(JSON.stringify(serialized)).not.toMatch(/candle|order|event|bookmark|provider|credential/i);

    await page.reload();
    await assertTradeHubPageHealthy(page);
    await expectPersistedCount(page, 6);
    await expect(page.getByTestId("klinechart-spike-status")).toContainText("Restored 6 spike-only overlays");
    await page.getByTestId("klinechart-spike-clear-all").click();
    await expectPersistedCount(page, 0);
    await expect(page.getByTestId("klinechart-spike-overlay-json")).toHaveText("[]");
  });
}
