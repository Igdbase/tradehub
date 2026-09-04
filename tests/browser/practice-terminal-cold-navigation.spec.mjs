import { expect, test } from "@playwright/test";
import { signInAs, waitForSettledApplicationPath } from "./helpers/auth.mjs";
import {
  assertStudentPageSafe,
  deleteStandalonePracticeSessionByApi,
  fillQuickPracticeSession,
  observeNextPracticeSessionCreation,
  openStudentPage
} from "./helpers/student-flows.mjs";

const viewportName = process.env.TRADEHUB_COLD_VIEWPORT === "tablet" ? "tablet" : "laptop";
const viewport = viewportName === "tablet"
  ? { width: 900, height: 760 }
  : { width: 1366, height: 820 };

test(`cold login keeps Open terminal navigation settled at ${viewportName}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize(viewport);

  const sessionName = `Stage 29D16 Cold Navigation ${viewportName}`;
  let createdSessionId = "";
  let createObserver;

  try {
    await signInAs(page, "student", "/app");
    await openStudentPage(page, "/app/practice", /Backtesting Session|Sessions/i);
    await page.getByTestId("practice-start-session").click();
    await expect(page.getByTestId("practice-quick-session-modal")).toBeVisible();
    await fillQuickPracticeSession(page, {
      name: sessionName,
      dateEnd: "2026-07-04",
      openTerminal: true
    });

    createObserver = await observeNextPracticeSessionCreation(page);
    const terminalNavigation = page.waitForURL(/\/app\/practice\/[^/]+\/terminal$/);
    await page.getByTestId("practice-create-session").click();
    createdSessionId = (await createObserver.payloadPromise).session.sessionId;
    await terminalNavigation;
    await createObserver.stop();
    createObserver = undefined;

    const terminalPath = `/app/practice/${createdSessionId}/terminal`;
    await waitForSettledApplicationPath(page, terminalPath, { stableFor: 1_200 });
    await assertStudentPageSafe(page, /Practice only|Simulated only/i);
    await expect(page.getByTestId("practice-terminal-chart-first-shell")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${terminalPath.replace(/\//g, "\\/")}$`));
  } finally {
    if (createObserver) {
      await createObserver.stop().catch(() => undefined);
    }
    if (createdSessionId) {
      await deleteStandalonePracticeSessionByApi(page, createdSessionId, sessionName);
    }
  }
});
