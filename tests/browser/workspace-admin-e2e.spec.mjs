import { expect, test } from "@playwright/test";
import { getDemoAuthToken, signInAs, signOutIfSignedIn } from "./helpers/auth.mjs";
import { deleteCollectionDocuments, openStudentPage } from "./helpers/student-flows.mjs";
import {
  assertAdminBlockedFromStudentPrivatePage,
  assertOpsPageSafe,
  assertWorkspaceBlockedFromAdmin
} from "./helpers/workspace-admin-flows.mjs";

async function clearStage29KBrowserFixtures(page) {
  await deleteCollectionDocuments(page, "external_signal_candidates");
  await deleteCollectionDocuments(page, "external_signal_sources");
  await deleteCollectionDocuments(page, "external_signal_delivery_markers");
  await deleteCollectionDocuments(page, "external_signal_fingerprint_markers");
  await deleteCollectionDocuments(page, "external_signal_ingress_rate");
  await deleteCollectionDocuments(page, "external_signal_bridge_attestations");
  await deleteCollectionDocuments(page, "external_signal_routing_outbox");
  await deleteCollectionDocuments(page, "workspaces/ws_demo_pro/signals", (id) => id.startsWith("sig_tg_"));
}

function bearer(token) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  };
}

const focusedWorkspaceRoutes = [
  { path: "/workspace", nav: "home", expected: /Workspace home|Workspace snapshot/i },
  { path: "/workspace/students", nav: "students", expected: /Student management|Workspace-scoped students/i },
  { path: "/workspace/signals", nav: "signals", expected: /Signal management|Reviewed master-trader candidates/i },
  { path: "/workspace/courses", nav: "courses", expected: /Course visibility|Drafts and published courses/i },
  { path: "/workspace/practice", nav: "practice", expected: /Practice Insights|Workspace drills/i },
  { path: "/workspace/copier", nav: "copier", expected: /Trade Copier readiness|Workspace setup readiness/i },
  { path: "/workspace/billing", nav: "billing", expected: /Workspace licence|Workspace billing/i },
  { path: "/workspace/branding", nav: "branding", expected: /Workspace brand|Brand and domain readiness/i },
  { path: "/workspace/enterprise", nav: "enterprise", expected: /Enterprise readiness|Enterprise integration requests/i }
];

function workspaceApiCollector(page) {
  const paths = [];
  const handler = (request) => {
    try {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/workspace/")) {
        paths.push(`${request.method()} ${url.pathname}`);
      }
    } catch {
      // Ignore non-standard URLs emitted by the browser.
    }
  };

  page.on("request", handler);

  return {
    paths,
    stop: () => page.off("request", handler)
  };
}

async function expectCollectedRequest(collector, expectedPath) {
  await expect.poll(() => collector.paths.includes(expectedPath)).toBeTruthy();
}

async function expectNoDocumentHorizontalOverflow(page) {
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }))
    )
    .toEqual(expect.objectContaining({ clientWidth: expect.any(Number), scrollWidth: expect.any(Number) }));

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(metrics.scrollWidth, `Document should not overflow horizontally: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.clientWidth + 2);
}

async function expectActiveWorkspaceNavVisible(page, nav) {
  const navLocator = page.getByTestId("workspace-focused-nav-scroll");
  const activeLocator = page.getByTestId(`workspace-nav-${nav}`);

  await expect(activeLocator).toHaveAttribute("aria-current", "page");
  await expect
    .poll(async () =>
      page.evaluate((activeTestId) => {
        const navElement = document.querySelector("[data-testid='workspace-focused-nav-scroll']");
        const activeElement = document.querySelector(`[data-testid='${activeTestId}']`);

        if (!navElement || !activeElement) {
          return { visible: false, reason: "missing" };
        }

        const navRect = navElement.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        const centerX = activeRect.left + activeRect.width / 2;
        const centerY = activeRect.top + activeRect.height / 2;
        const hit = document.elementFromPoint(centerX, centerY);

        return {
          visible:
            activeRect.left >= navRect.left - 1 &&
            activeRect.right <= navRect.right + 1 &&
            activeRect.top >= navRect.top - 1 &&
            activeRect.bottom <= navRect.bottom + 1 &&
            Boolean(hit && activeElement.contains(hit)),
          navLeft: navRect.left,
          navRight: navRect.right,
          activeLeft: activeRect.left,
          activeRight: activeRect.right,
          hitText: hit?.textContent ?? ""
        };
      }, `workspace-nav-${nav}`)
    )
    .toMatchObject({ visible: true });

  const navBox = await navLocator.boundingBox();
  const activeBox = await activeLocator.boundingBox();
  const viewport = page.viewportSize();

  expect(navBox, "Workspace focused nav should have a bounding box").toBeTruthy();
  expect(activeBox, "Active workspace nav item should have a bounding box").toBeTruthy();
  expect(viewport, "Viewport should be known").toBeTruthy();

  if (navBox && activeBox && viewport) {
    expect(navBox.x).toBeGreaterThanOrEqual(0);
    expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(activeBox.x).toBeGreaterThanOrEqual(navBox.x - 1);
    expect(activeBox.x + activeBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
  }
}

test.describe("TradeHub seeded workspace browser E2E", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "workspace", "/workspace");
  });

  test("workspace focused navigation supports direct URLs, active state, and browser history", async ({ page }) => {
    for (const route of focusedWorkspaceRoutes) {
      await page.goto(route.path);
      await assertOpsPageSafe(page, route.expected);
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/\//g, "\\/")}$`));
      await expect(page.getByTestId(`workspace-nav-${route.nav}`)).toHaveAttribute("aria-current", "page");
    }

    await page.goto("/workspace");
    await page.getByTestId("workspace-nav-students").click();
    await expect(page).toHaveURL(/\/workspace\/students$/);
    await page.getByTestId("workspace-nav-signals").click();
    await expect(page).toHaveURL(/\/workspace\/signals$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/workspace\/students$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/workspace\/signals$/);
  });

  test("workspace focused navigation is visible and usable across desktop tablet and mobile deep links", async ({ page }) => {
    test.setTimeout(150_000);

    const viewports = [
      { name: "desktop", width: 1440, height: 980 },
      { name: "tablet", width: 900, height: 1100 },
      { name: "mobile", width: 390, height: 860 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of focusedWorkspaceRoutes) {
        await page.goto(route.path);
        await assertOpsPageSafe(page, route.expected);
        await expectActiveWorkspaceNavVisible(page, route.nav);
        await expectNoDocumentHorizontalOverflow(page);
      }
    }
  });

  test("workspace focused routes fetch only active-view data", async ({ page }) => {
    test.setTimeout(90_000);

    const routeExpectations = [
      {
        path: "/workspace",
        expected: ["GET /api/workspace/dashboard"],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/crypto-execution/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/students",
        expected: ["GET /api/workspace/dashboard", "GET /api/workspace/students"],
        forbidden: [
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/crypto-execution/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/signals",
        expected: [
          "GET /api/workspace/dashboard",
          "GET /api/workspace/signals",
          "GET /api/workspace/signals/external-preview",
          "GET /api/workspace/crypto-execution/overview"
        ],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/courses",
        expected: ["GET /api/workspace/dashboard", "GET /api/workspace/courses"],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/crypto-execution/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/practice",
        expected: [
          "GET /api/workspace/dashboard",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/practice/assignments",
          "GET /api/workspace/practice/assignments/feedback",
          "GET /api/workspace/students"
        ],
        forbidden: [
          "GET /api/workspace/signals",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/crypto-execution/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/copier",
        expected: ["GET /api/workspace/dashboard", "GET /api/workspace/crypto-execution/overview"],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/billing",
        expected: ["GET /api/workspace/dashboard", "GET /api/workspace/billing/overview"],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/crypto-execution/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/branding",
        expected: ["GET /api/workspace/dashboard"],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/crypto-execution/overview",
          "GET /api/workspace/enterprise-integration-requests"
        ]
      },
      {
        path: "/workspace/enterprise",
        expected: ["GET /api/workspace/dashboard", "GET /api/workspace/enterprise-integration-requests"],
        forbidden: [
          "GET /api/workspace/students",
          "GET /api/workspace/signals",
          "GET /api/workspace/practice/insights",
          "GET /api/workspace/billing/overview",
          "GET /api/workspace/crypto-execution/overview"
        ]
      }
    ];

    for (const route of routeExpectations) {
      const collector = workspaceApiCollector(page);

      try {
        await page.goto(route.path);
        await assertOpsPageSafe(page, focusedWorkspaceRoutes.find((entry) => entry.path === route.path)?.expected ?? /Workspace/i);

        for (const expectedPath of route.expected) {
          await expectCollectedRequest(collector, expectedPath);
        }

        await page.waitForTimeout(300);
        for (const forbiddenPath of route.forbidden) {
          expect(collector.paths, `${route.path} should not request ${forbiddenPath}`).not.toContain(forbiddenPath);
        }
      } finally {
        collector.stop();
      }
    }
  });

  test("workspace home stays summary-only and does not fetch every focused section", async ({ page }) => {
    const collector = workspaceApiCollector(page);
    try {
      await page.goto("/workspace");
      await assertOpsPageSafe(page, /Workspace home|Workspace snapshot/i);
      await expect(page.getByTestId("workspace-home-summary")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Workspace-scoped students|Structured signal drafts|Workspace drills|Enterprise integration requests/i);
      await expect.poll(() => collector.paths).toContain("GET /api/workspace/dashboard");
      expect(collector.paths).not.toContain("GET /api/workspace/students");
      expect(collector.paths).not.toContain("GET /api/workspace/signals");
      expect(collector.paths).not.toContain("GET /api/workspace/practice/insights");
      expect(collector.paths).not.toContain("GET /api/workspace/billing/overview");
      expect(collector.paths).not.toContain("GET /api/workspace/crypto-execution/overview");
    } finally {
      collector.stop();
    }
  });

  test("workspace students route exposes student support summaries only", async ({ page }) => {
    await page.goto("/workspace/students");
    await assertOpsPageSafe(page, /Student management|Workspace-scoped students/i);
    await expect(page.locator("body")).toContainText(/Lifecycle|Search loaded page|support ref/i);
    await expect(page.locator("body")).toContainText(/Course ready|Practice ready|AutoCopy blocked/i);
    await expect(page.locator("body")).toContainText(/Student rows come from this workspace only|Private notes/i);
  });

  test("workspace student support mutation stays scoped to student data", async ({ page }) => {
    await page.goto("/workspace/students");
    await assertOpsPageSafe(page, /Student management|Workspace-scoped students/i);
    await page.getByRole("button", { name: /View safe details/i }).first().click();

    const collector = workspaceApiCollector(page);
    try {
      await page.getByPlaceholder("Short internal support summary, no secrets or payment refs").fill("Stage 29L scoped support note");
      const supportResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/workspace/students/") &&
        response.url().includes("/support") &&
        response.request().method() === "PATCH"
      );
      await page.getByRole("button", { name: /^Save note$/i }).click();
      const supportResponse = await supportResponsePromise;
      expect(supportResponse.ok(), "Student support mutation should succeed").toBeTruthy();

      await expect
        .poll(() => collector.paths.some((path) => path.startsWith("PATCH /api/workspace/students/") && path.endsWith("/support")))
        .toBeTruthy();
      await expectCollectedRequest(collector, "GET /api/workspace/students");
      await expectCollectedRequest(collector, "GET /api/workspace/dashboard");
      await page.waitForTimeout(300);
      expect(collector.paths, "Student support mutation must not fetch billing overview").not.toContain("GET /api/workspace/billing/overview");
      expect(collector.paths, "Student support mutation must not fetch practice insights").not.toContain("GET /api/workspace/practice/insights");
      expect(collector.paths, "Student support mutation must not fetch signals").not.toContain("GET /api/workspace/signals");
    } finally {
      collector.stop();
    }
  });

  test("workspace practice route exposes aggregate practice and assignment tools", async ({ page }) => {
    await page.goto("/workspace/practice");
    await assertOpsPageSafe(page, /Practice Insights|Workspace drills/i);
    await expect(page.locator("body")).toContainText(/Aggregate simulated-practice activity only/i);
    await expect(page.locator("body")).toContainText(/Workspace progress is aggregate only/i);
  });

  test("workspace courses route exposes visibility summary and Course Hub navigation", async ({ page }) => {
    await page.goto("/workspace/courses");
    await assertOpsPageSafe(page, /Course visibility|Drafts and published courses/i);
    await expect(page.locator("body")).toContainText(/Drafts and published courses|Open Course Hub/i);
    const courseHubLinks = page.getByRole("link", { name: /Open Course Hub/i });
    await expect(courseHubLinks).toHaveCount(2);
    await expect(courseHubLinks.first()).toHaveAttribute("href", "/workspace/courses/hub");
  });

  test("workspace signals route exposes direct signal management and approved preview publishing", async ({ page }) => {
    await page.goto("/workspace/signals");
    await assertOpsPageSafe(page, /Signal management|Reviewed master-trader candidates/i);
    await expect(page.locator("body")).toContainText(/External preview only|Not a TradeHub signal|Preview only/i);
    await expect(page.locator("body")).not.toContainText(/vault|worker|canary|source-QA|Stage 29/i);
  });

  test("workspace signal publication mutation stays scoped to signal readiness", async ({ page }) => {
    await page.goto("/workspace/signals");
    await assertOpsPageSafe(page, /Signal management|Reviewed master-trader candidates/i);

    const collector = workspaceApiCollector(page);
    try {
      await page.getByLabel("Market").selectOption("forex");
      await page.getByLabel("Pair").fill("GBPUSD");
      await page.getByLabel("Direction").selectOption("buy");
      await page.getByLabel("Entry").fill("1.2500");
      await page.getByLabel("Take profit").fill("1.2600");
      await page.getByLabel("Stop loss").fill("1.2400");
      await page.getByLabel("Notes").fill("Stage 29L scoped signal publication.");

      const signalResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/workspace/signals") &&
        !response.url().includes("external-preview") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /^Mark published$/i }).click();
      const signalResponse = await signalResponsePromise;
      expect(signalResponse.ok(), "Signal publication should succeed").toBeTruthy();
      const signalPayload = await signalResponse.json();
      expect(signalPayload.signal?.pair).toBe("GBPUSD");

      await expectCollectedRequest(collector, "POST /api/workspace/signals");
      await expectCollectedRequest(collector, "GET /api/workspace/signals");
      await expectCollectedRequest(collector, "GET /api/workspace/signals/external-preview");
      await expectCollectedRequest(collector, "GET /api/workspace/crypto-execution/overview");
      await expectCollectedRequest(collector, "GET /api/workspace/dashboard");
      await page.waitForTimeout(300);
      expect(collector.paths, "Signal mutation must not fetch practice insights").not.toContain("GET /api/workspace/practice/insights");
      expect(collector.paths, "Signal mutation must not fetch practice assignments").not.toContain("GET /api/workspace/practice/assignments");
      expect(collector.paths, "Signal mutation must not fetch practice feedback").not.toContain("GET /api/workspace/practice/assignments/feedback");
      expect(collector.paths, "Signal mutation must not fetch students").not.toContain("GET /api/workspace/students");
      expect(collector.paths, "Signal mutation must not fetch billing").not.toContain("GET /api/workspace/billing/overview");
    } finally {
      collector.stop();
      await deleteCollectionDocuments(page, "workspaces/ws_demo_pro/signals", (_id, doc) => {
        const fields = doc.fields ?? {};
        return fields.pair?.stringValue === "GBPUSD" && fields.notes?.stringValue === "Stage 29L scoped signal publication.";
      });
    }
  });

  test("workspace copier and billing routes expose focused safe operations", async ({ page }) => {
    await page.goto("/workspace/copier");
    await assertOpsPageSafe(page, /Trade Copier readiness|Workspace setup readiness/i);
    await expect(page.locator("body")).toContainText(/Student setup remains gated by subscription, account connection, consent, risk limits, and workspace controls/i);
    await expect(page.locator("body")).not.toContainText(/vault|canary|worker|provider payload|credential version/i);

    await page.goto("/workspace/billing");
    await assertOpsPageSafe(page, /Workspace licence|Workspace billing/i);
    await expect(page.locator("body")).toContainText(/Pricing is handled by private quote\/contact sales/i);
    await expect(page.locator("body")).toContainText(/Trade Copier remains a separate optional add-on/i);
    await expect(page.locator("body")).toContainText(/Pro Workspace|Seat cap|Seats left/i);
  });

  test("workspace branding and enterprise routes are focused and metadata-only", async ({ page }) => {
    await page.goto("/workspace/branding");
    await assertOpsPageSafe(page, /Workspace brand|Brand and domain readiness/i);
    await expect(page.locator("body")).toContainText(/Logo and domain changes stay reviewed by TradeHub/i);

    await page.goto("/workspace/enterprise");
    await assertOpsPageSafe(page, /Enterprise readiness|Deployment and SLA scope/i);
    await expect(page.locator("body")).toContainText(/contract-scoped|does not provision cloud infrastructure/i);
    await expect(page.locator("body")).toContainText(/Launch and Pro packages stay on standard TradeHub integrations|Enterprise integration/i);
    await expect(page.locator("body")).toContainText(/Do not include passwords, private links, payment references, or account details/i);
    await expect(page.locator("body")).toContainText(/Enterprise integration scoping is private quote\/contact-sales only/i);
  });

  test("workspace persona is safely blocked from Super Admin", async ({ page }) => {
    await assertWorkspaceBlockedFromAdmin(page);
  });
});

test.describe("TradeHub seeded Super Admin browser E2E", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "admin", "/admin");
  });

  test("admin shell and package ops panels load safely", async ({ page }) => {
    await assertOpsPageSafe(page, /Super Admin|Package licences|Workspace package/i);
    await expect(page.locator("body")).toContainText(/Launch supports 50 active students/i);
    await expect(page.locator("body")).toContainText(/Pro supports 500/i);
    await expect(page.locator("body")).toContainText(/Enterprise is custom-reviewed/i);
    await expect(page.locator("body")).toContainText(/Trade Copier remains a separate optional add-on/i);
    await expect(page.locator("body")).toContainText(/masked|support status only|do not collect payment|trigger money movement/i);
  });

  test("admin branding, enterprise, and integration panels render masked metadata", async ({ page }) => {
    await assertOpsPageSafe(page, /Branding and domains|Enterprise deployment and SLA|Enterprise integration queue/i);
    await expect(page.locator("body")).toContainText(/does not upload logos, change DNS, provision SSL, or call hosting providers/i);
    await expect(page.locator("body")).toContainText(/metadata only|does not provision cloud infrastructure/i);
    await expect(page.locator("body")).toContainText(/No CRM, payment, analytics, broker/i);
    await expect(page.locator("body")).toContainText(/raw source IDs|credentials|private URLs|provider payloads/i);
  });

  test("admin support, payments, messaging, signals, and AutoCopy readiness load safely", async ({ page }) => {
    await assertOpsPageSafe(page, /Support overview|Payment operations|External reminders contract/i);
    await expect(page.locator("body")).toContainText(/Messaging readiness|External sending remains disabled|dry-run/i);
    await expect(page.locator("body")).toContainText(/External signal ingestion|No AutoCopy execution|Telegram source setup/i);
    await expect(page.locator("body")).toContainText(/Broad live AutoCopy readiness|Live AutoCopy support, incident, and rollback posture/i);
    await expect(page.locator("body")).toContainText(/does not enable broad live order execution|dry-run|kill-switch/i);
  });

  test("admin approves Telegram candidate, workspace publishes it, and student sees safe source label", async ({ page }) => {
    test.setTimeout(150_000);
    await clearStage29KBrowserFixtures(page);

    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertOpsPageSafe(page, /External signal ingestion|Telegram source setup/i);

      await page.getByLabel("Source reference").fill("stage29k_visible_source");
      await page.getByLabel("Telegram channel identity").fill("-1002999000001");
      await page.getByLabel("Source label").fill("Stage 29K Partner");
      await page.getByLabel("Source type").selectOption("telegram_channel");
      await page.getByLabel("Source status").selectOption("enabled");
      await page.getByLabel("Allowed symbols").fill("BTCUSDT");
      await page.getByLabel("Workspace scope").fill("ws_demo_pro");
      await page.getByLabel("Allowed markets").fill("crypto");

      const sourceResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/admin/signals/external-ingestion/sources") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /^Save source$/i }).click();
      const sourceResponse = await sourceResponsePromise;
      expect(sourceResponse.ok(), "Visible Admin source setup form should accept the Telegram source").toBeTruthy();
      expect(sourceResponse.request().postDataJSON().parserMode, "Telegram source form should submit the required server parser mode without exposing it as a visible owner control").toBe("telegram_like_mock");
      const sourcePayload = await sourceResponse.json();
      expect(JSON.stringify(sourcePayload)).not.toMatch(/-1002999000001|expectedSourceIdentity|chatId|webhookSecret|token/i);
      await expect(page.locator("body")).toContainText(/Stage 29K Partner/i);
      await expect(page.locator("body")).not.toContainText(/-1002999000001|telegram like mock|manual mock/i);

      const adminToken = await getDemoAuthToken(page, "admin");
      const webhookResponse = await page.request.post("/api/integrations/telegram/signals/webhook", {
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "stage29k_local_webhook_secret"
        },
        data: {
          update_id: 299001,
          channel_post: {
            message_id: 901,
            date: Math.floor(Date.now() / 1000),
            chat: { id: "-1002999000001", type: "channel" },
            text: "BUY BTCUSDT\nEntry 68000\nSL 67000\nTP 70000"
          }
        }
      });
      expect(webhookResponse.ok(), "Webhook route should accept the allowlisted Telegram update").toBeTruthy();
      const webhookPayload = await webhookResponse.json();
      expect(webhookPayload.accepted).toBeTruthy();
      expect(JSON.stringify(webhookPayload)).not.toMatch(/-1002999000001|BTCUSDT BUY Entry|chatId|message_id|webhookSecret|token/i);

      let candidate;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const overviewResponse = await page.request.get("/api/admin/signals/external-ingestion/overview", {
          headers: bearer(adminToken)
        });
        expect(overviewResponse.ok(), "Admin overview should include the quarantined Telegram candidate").toBeTruthy();
        const overview = await overviewResponse.json();
        candidate = (overview.latestCandidates ?? []).find((entry) => entry.normalized?.symbol === "BTCUSDT");

        if (candidate) break;
        await page.waitForTimeout(250);
      }
      expect(candidate, "Admin overview should expose a safe candidate ref for moderation").toBeTruthy();
      expect(candidate.status).toMatch(/parsed|needs_review/);
      expect(JSON.stringify(candidate)).not.toMatch(/-1002999000001|chatId|message_id|rawText|webhookSecret|token/i);

      const reviewResponse = await page.request.post(
        `/api/admin/signals/external-ingestion/candidates/${encodeURIComponent(candidate.candidateId)}/review`,
        {
          headers: bearer(adminToken),
          data: {
            action: "approve_for_workspace_preview",
            reviewReason: "Stage 29K browser moderation approval."
          }
        }
      );
      expect(reviewResponse.ok(), "Admin review API should approve the Telegram candidate").toBeTruthy();

      await signOutIfSignedIn(page);
      await signInAs(page, "workspace", "/workspace/signals");
      await expect(page.locator("body")).toContainText(/Reviewed master-trader candidates|Stage 29K Partner|BTCUSDT/i);
      page.once("dialog", (dialog) => dialog.accept());
      const previewCard = page.locator("article", { hasText: "BTCUSDT" }).first();
      const publishResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/workspace/signals/external-preview/publish") &&
        response.request().method() === "POST"
      );
      await previewCard.getByRole("button", { name: /^Publish$/i }).click();
      const publishPayload = await (await publishResponsePromise).json();
      expect(publishPayload.ok, `Publish response should be ok: ${JSON.stringify(publishPayload)}`).toBeTruthy();
      expect(JSON.stringify(publishPayload)).not.toMatch(/candidateId|workspaceId|studentId|chatId|message_id|webhookSecret|token|providerPayload|vault/i);
      await expect(page.locator("body")).toContainText(/moderated TradeHub signal|Published/i);

      await signOutIfSignedIn(page);
      await signInAs(page, "student", "/app");
      await openStudentPage(page, "/app/signals", /TradeHub signals/i);
      await expect(page.locator("body")).toContainText(/BTCUSDT|Stage 29K Partner|Open/i);
      await expect(page.locator("body")).not.toContainText(/Telegram chat|external preview|provider payload|vault|worker|canary|webhook secret|message id/i);
    } finally {
      await clearStage29KBrowserFixtures(page);
    }
  });

  test("Wrong role admin does not get student private route context by accident", async ({ page }) => {
    await assertAdminBlockedFromStudentPrivatePage(page, "/app/journal");
  });
});
