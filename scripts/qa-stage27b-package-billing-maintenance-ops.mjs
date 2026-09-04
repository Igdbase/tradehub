import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Stage 27B QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const packageHelper = read("src/lib/workspace/workspace-package-licence.ts");
const licenceOps = read("src/lib/workspace/workspace-package-licence-ops.ts");
const licenceOpsRoute = read("src/app/api/admin/workspace-package-licences/route.ts");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const adminPanel = read("src/components/admin/workspace-package-overview-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const mockAdminRepository = read("src/lib/admin/mock-admin-repository.ts");
const billingRepository = read("src/lib/billing/billing-repository.ts");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  scripts["stage27b:qa"] === "node scripts/qa-stage27b-package-billing-maintenance-ops.mjs",
  "package.json exposes npm run stage27b:qa."
);

for (const scriptName of [
  "stage27a:qa",
  "stage26a:qa",
  "stage25e:qa",
  "stage24c:qa",
  "stage23d:qa",
  "stage22b:qa",
  "stage21d:qa",
  "stage20d:qa",
  "stage19i:qa",
  "stage18x:qa",
  "stage15y:qa"
]) {
  assert(typeof scripts[scriptName] === "string", `${scriptName} remains wired.`);
}

assert(exists("src/lib/workspace/workspace-package-licence-ops.ts"), "Workspace package licence ops helper exists.");
assert(exists("src/app/api/admin/workspace-package-licences/route.ts"), "Super Admin licence ops route exists.");

for (const snippet of [
  "WorkspacePackageLicenseTermType",
  "\"lifetime\"",
  "\"fixed_term\"",
  "\"custom\"",
  "WorkspacePackageMaintenanceRenewalStatus",
  "\"not_required\"",
  "\"active\"",
  "\"due_soon\"",
  "\"overdue\"",
  "\"waived\"",
  "\"custom_review\"",
  "WorkspacePackageSupportStatus",
  "\"included\"",
  "\"maintenance_active\"",
  "\"maintenance_due\"",
  "\"support_limited\"",
  "\"suspended\"",
  "adminStatusReason",
  "adminNoteSummary",
  "lastReviewedAt"
]) {
  assert(packageTypes.includes(snippet), `Workspace package types include ${snippet}.`);
}

for (const snippet of [
  "INCLUDED_SUPPORT_MONTHS",
  "MAINTENANCE_DUE_SOON_DAYS",
  "licenseTermTypes",
  "maintenanceRenewalStatuses",
  "supportStatuses",
  "sanitizeWorkspacePackageAdminText",
  "deriveMaintenanceRenewalStatus",
  "deriveSupportStatus",
  "deriveLicenceHealth",
  "supportPromptFor",
  "maintenanceSummaryFor",
  "tradeCopierIncluded: false",
  "Trade Copier is a separate optional add-on."
]) {
  assert(packageHelper.includes(snippet), `Package helper includes ${snippet}.`);
}

assert(packageHelper.includes("LAUNCH_SEAT_CAP = 50"), "Stage 27A Launch seat cap remains 50.");
assert(packageHelper.includes("PRO_SEAT_CAP = 500"), "Stage 27A Pro seat cap remains 500.");
assert(packageHelper.includes("assertWorkspacePackageSeatAvailable"), "Stage 27A seat-cap enforcement helper remains intact.");
assert(billingRepository.includes("assertWorkspacePackageSeatAvailable(packageStatus)"), "Billing activation still checks package seat capacity.");

for (const snippet of [
  "requireSuperAdmin",
  "updateWorkspacePackageLicenceOps",
  "workspaceRef",
  "maskedWorkspaceRef",
  "package_licence_ops",
  "sanitizeWorkspacePackageAdminText",
  "LICENCE_OPS_WORKSPACE_SCAN_LIMIT",
  "mark_maintenance_active",
  "mark_maintenance_waived",
  "mark_custom_review",
  "mark_suspended",
  "No payment automation was performed"
]) {
  assert((licenceOps + licenceOpsRoute).includes(snippet), `Licence ops route/helper includes ${snippet}.`);
}

assert(!licenceOpsRoute.includes("getAdminRepositoryForRequest"), "Licence ops route does not use mock fallback for writes.");
assert(!/params:\s*\{[^}]*workspaceId/.test(licenceOpsRoute), "Licence ops route does not accept raw workspaceId path params.");
assert(!/workspaceId:\s*parsed|payload\.workspaceId|rawWorkspaceId/.test(licenceOps), "Licence ops helper does not trust browser-supplied raw workspace IDs.");
assert(licenceOps.includes("maskedActorRef"), "Licence ops audit stores masked admin actor refs.");

for (const snippet of [
  "Workspace licence",
  "support terms are reviewed by TradeHub",
  "supportPrompt",
  "maintenanceSummary",
  "maintenanceRenewalStatus",
  "maintenanceRenewalDueDate",
  "Pricing is handled by private quote/contact sales",
  "Trade Copier remains a separate optional add-on"
]) {
  assert(workspaceOverview.includes(snippet), `Workspace package UI includes safe ${snippet} copy/state.`);
}

for (const snippet of [
  "Package licences",
  "Workspace package, support, and maintenance posture",
  "licenceFilters",
  "due_soon",
  "overdue",
  "custom_review",
  "Bounded licence note",
  "requestAdminApi<AdminWorkspacePackageLicenceOpsUpdateResponse>",
  "/api/admin/workspace-package-licences",
  "workspaceRef",
  "No payment refs, provider payloads, or student private data"
]) {
  assert(adminPanel.includes(snippet), `Super Admin package panel includes ${snippet}.`);
}

assert(adminPage.includes("onUpdated={loadOverview}"), "Super Admin package panel refreshes overview after licence ops updates.");
assert(mockAdminRepository.includes("maintenanceRenewalStatus") && mockAdminRepository.includes("supportStatus"), "Mock admin overview includes Stage 27B licence fields.");

for (const deniedPath of [
  "platform_package_licence_ops",
  "platform_package_license_ops",
  "package_licence_ops",
  "package_license_ops"
]) {
  assert(rules.includes(deniedPath), `Firestore rules deny direct browser access to ${deniedPath}.`);
}

for (const source of [workspaceOverview, adminPanel]) {
  assert(!/Launch Workspace[^`]*[₦$]\s*\d/i.test(source), "Launch package UI does not expose public prices.");
  assert(!/Pro Workspace[^`]*[₦$]\s*\d/i.test(source), "Pro package UI does not expose public prices.");
  assert(!/Enterprise Workspace[^`]*[₦$]\s*\d/i.test(source), "Enterprise package UI does not expose public prices.");
}

const changedSurface = [
  packageTypes,
  packageHelper,
  licenceOps,
  licenceOpsRoute,
  workspaceOverview,
  adminPanel,
  adminPage,
  mockAdminRepository
].join("\n");

for (const forbidden of [
  "refundPayment",
  "createRefund",
  "createPayout",
  "withdrawal",
  "walletTransfer",
  "settlementAutomation",
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "createLiveOrder",
  "MetaAPI token",
  "brokerPassword",
  "providerPayload",
  "vaultRef",
  "apiKey"
]) {
  assert(!changedSurface.includes(forbidden), `Stage 27B source does not add forbidden ${forbidden} behavior.`);
}

for (const file of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(file[1].includes("Stage 27B"), `${file[0]} documents Stage 27B.`);
  assert(
    file[1].includes("TH-2026-08-24-STAGE27B-PACKAGE-BILLING-MAINTENANCE-OPS-HANDOFF"),
    `${file[0]} carries the Stage 27B handoff reference.`
  );
}

console.log("Stage 27B package billing terms, maintenance windows, and admin licence ops QA passed.");
