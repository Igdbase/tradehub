import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};
const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

const packageJson = JSON.parse(read("package.json"));
const adminClient = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminOverviewComponent = read("src/components/admin/admin-support-overview.tsx");
const browserSpec = read("tests/browser/workspace-admin-e2e.spec.mjs");
const authHelper = read("tests/browser/helpers/auth.mjs");
const seed = read("scripts/seed-demo-data.mjs");
const docs = [
  "plan.md",
  "complaint-resolution-roadmap.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md",
].map(read).join("\n");

assert(
  packageJson.scripts?.["stage29m:qa"] === "node scripts/qa-stage29m-super-admin-navigation-demo-reliability.mjs",
  "package.json exposes npm run stage29m:qa."
);

[
  "src/app/(super-admin)/admin/page.tsx",
  "src/app/(super-admin)/admin/workspaces/page.tsx",
  "src/app/(super-admin)/admin/licences/page.tsx",
  "src/app/(super-admin)/admin/payments/page.tsx",
  "src/app/(super-admin)/admin/integrations/page.tsx",
  "src/app/(super-admin)/admin/execution-safety/page.tsx",
  "src/app/(super-admin)/admin/audit/page.tsx",
].forEach((relativePath) => {
  assert(exists(relativePath), `${relativePath} exists.`);
});

includesAll(
  adminClient,
  [
    "export type AdminView",
    "adminNavItems",
    "admin-focused-nav-scroll",
    "data-testid={`admin-nav-${item.view}`}",
    "view: \"overview\"",
    "view: \"workspaces\"",
    "view: \"licences\"",
    "view: \"payments\"",
    "view: \"integrations\"",
    "view: \"execution-safety\"",
    "view: \"audit\"",
    "loadActiveView",
    "activeView === \"overview\"",
    "activeView === \"workspaces\"",
    "activeView === \"licences\"",
    "activeView === \"payments\"",
    "activeView === \"integrations\"",
    "activeView === \"execution-safety\"",
    "activeView === \"audit\"",
    "loadPaymentsOverview",
    "loadAuditLog",
  ],
  "Admin client defines focused routes, nav, and scoped loaders."
);

excludesAll(
  adminClient,
  [
    "loadCorePanels",
    "Stage 20A ops audit",
    "Stage 06 Super Admin CRM",
    "{ label: \"Messaging\"",
    "href: \"/admin/messaging\"",
    "payments={null}",
    "cryptoExecution={null}",
  ],
  "Admin client no longer keeps a load-everything helper, stage hero copy, Messaging as a top-level normal nav item, or explicit unloaded null props on the overview render."
);

const loadActiveViewBody = adminClient.slice(
  adminClient.indexOf("async function loadActiveView"),
  adminClient.indexOf("async function refreshAll")
);
excludesAll(
  loadActiveViewBody,
  ["workspaces", "loadApplications"],
  "loadActiveView no longer fetches overview or applications for the workspaces view (the dedicated effect owns application loading)."
);
includesAll(
  loadActiveViewBody,
  [
    "view === \"overview\"",
    "view === \"licences\"",
    "view === \"payments\"",
    "loadPaymentsOverview",
    "loadMessagingOverview, loadExternalSignalIngestionOverview",
    "loadCryptoExecution",
    "loadAuditLog",
  ],
  "loadActiveView keeps scoped loading for every other admin view unchanged."
);

const updateApplicationBody = adminClient.slice(
  adminClient.indexOf("async function updateApplication"),
  adminClient.indexOf("async function createWorkspaceShell")
);
const createWorkspaceShellBody = adminClient.slice(
  adminClient.indexOf("async function createWorkspaceShell"),
  adminClient.indexOf("async function reconcilePaystackIntent")
);
for (const [label, body] of [["updateApplication", updateApplicationBody], ["createWorkspaceShell", createWorkspaceShellBody]]) {
  includesAll(body, ["refreshApplications();"], `${label} ends with a scoped applications refresh only.`);
  excludesAll(body, ["loadOverview()"], `${label} must not fetch /api/admin/overview from the workspaces view.`);
}

includesAll(
  adminClient,
  [
    "const [applicationsRefreshNonce, setApplicationsRefreshNonce] = useState(0);",
    "}, [activeView, applicationsRefreshNonce, market, query, solana, source, status]);",
  ],
  "Exactly one applications fetch path owns initial+filter loading via the dedicated effect with a refresh nonce."
);

includesAll(
  adminOverviewComponent,
  [
    "not measured on this view — open Payments",
    "not measured on this view — open Execution Safety",
    "Chips marked not measured load only on",
  ],
  "Admin support overview renders truthful non-numeric states for unloaded chip data."
);
excludesAll(
  adminOverviewComponent,
  ["deferredMvpQa", "MVP browser QA", "practice + courses deferred"],
  "Admin support overview no longer contains the hardcoded MVP browser QA constant or chip."
);

includesAll(
  browserSpec,
  [
    "focusedAdminRoutes",
    "adminApiCollector",
    "expectActiveAdminNavVisible",
    "admin focused navigation supports direct URLs, active state, and browser history",
    "admin focused navigation is visible across desktop tablet and mobile deep links",
    "admin focused routes fetch only active-view data",
    "admin overview stays concise",
    "not.toContain(\"GET /api/admin/payments/overview\")",
    "not.toContain(\"GET /api/admin/crypto-execution/overview\")",
    "\"GET /api/admin/messaging/overview\"",
    "\"GET /api/admin/signals/external-ingestion/overview\"",
    "should not request ${forbiddenPath}",
    "path: \"/admin/workspaces\",\n        expected: [\"GET /api/admin/applications\"],",
    "/admin/workspaces",
    "/admin/licences",
    "/admin/payments",
    "/admin/integrations",
    "/admin/execution-safety",
    "/admin/audit",
  ],
  "Workspace/Admin browser coverage verifies focused Super Admin navigation, responsive visibility, and scoped requests."
);

const workspacesRouteBlock = browserSpec.slice(
  browserSpec.indexOf("path: \"/admin/workspaces\",\n        expected:"),
  browserSpec.indexOf("path: \"/admin/licences\",\n        expected:")
);
excludesAll(
  workspacesRouteBlock.split("forbidden:")[0],
  ["GET /api/admin/overview"],
  "Browser spec's /admin/workspaces expectation no longer includes GET /api/admin/overview."
);
includesAll(
  workspacesRouteBlock,
  ["GET /api/admin/overview"],
  "Browser spec's /admin/workspaces forbidden list includes GET /api/admin/overview."
);

const personaEmails = [
  "demo.superadmin@example.test",
  "demo.launch.influencer@example.test",
  "demo.pro.influencer@example.test",
  "demo.enterprise.influencer@example.test",
  "demo.student.active@example.test",
  "demo.student.pending@example.test",
  "demo.student.payment@example.test",
];
includesAll(
  authHelper,
  personaEmails,
  "Auth helper exposes all seven seeded persona emails with the TradeHubDemo!123 password."
);
includesAll(
  browserSpec,
  [
    "all seven seeded personas sign in and land on their truthful surfaces",
    "workspaceLaunch",
    "workspacePro",
    "workspaceEnterprise",
    "studentActive",
    "studentPending",
    "studentPayment",
    "assertWorkspaceBlockedFromAdmin",
  ],
  "Browser spec covers all seven seeded personas landing on their truthful surfaces."
);
includesAll(
  seed,
  personaEmails,
  "Seed script creates all seven deterministic persona emails."
);

includesAll(
  `${seed}\n${authHelper}`,
  [
    "demo.superadmin@example.test",
    "super_admin_demo_tradehub",
    "TradeHubDemo!123",
    "claims: { role: \"super_admin\" }",
    "demo.pro.influencer@example.test",
    "demo.student.active@example.test",
  ],
  "Demo seed/auth helpers keep deterministic Super Admin, workspace, and student personas."
);

includesAll(
  docs,
  [
    "Stage 29M",
    "Super Admin Navigation And Demo Account Reliability",
    "TH-2026-09-08-STAGE29M-SUPER-ADMIN-NAVIGATION-DEMO-RELIABILITY-HANDOFF",
    "implemented/source-QA ready",
    "Overview, Workspaces, Licences, Payments, Integrations, Execution Safety, and Audit",
    "default Overview",
    "scoped loading",
    "all seeded personas",
    "Stage 29M adviser correction",
    "not measured on this view",
    "TradeHubDemo!123",
    "Stage 29N remains unstarted and next",
    "Stage 29L is owner-accepted, closed, and frozen",
    "Stage 29K is owner-accepted, closed, and frozen",
    "Stage 29J remains owner-accepted, closed, and frozen",
    "Stage 29I remains closed and frozen",
    "Stage 29G external Binance/Bybit acceptance remains deferred",
    "Stage 29H remains deferred/unstarted",
  ],
  "Authoritative docs record Stage 29M implementation status and the adviser correction while preserving frozen/deferred stages."
);

excludesAll(
  docs,
  [
    "Stage 29M is owner-accepted",
    "Stage 29M is closed and frozen",
    "Stage 29N is implemented",
    "Real Telegram/provider acceptance is complete",
    "Stage 29G external Binance/Bybit acceptance is complete",
  ],
  "Stage 29M docs do not claim owner acceptance, Stage 29N, or deferred external acceptance."
);

console.log("Stage 29M Super Admin navigation and demo reliability source QA passed.");
