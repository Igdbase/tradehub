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
    console.error(`Stage 27D QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const workspaceTypes = read("src/types/workspace.ts");
const enterpriseHelper = read("src/lib/workspace/workspace-enterprise-readiness.ts");
const enterpriseOps = read("src/lib/workspace/workspace-enterprise-deployment-ops.ts");
const enterpriseOpsRoute = read("src/app/api/admin/workspace-enterprise-deployment/route.ts");
const dashboardTypes = read("src/types/workspace-dashboard.ts");
const dashboardMappers = read("src/lib/workspace/dashboard-mappers.ts");
const dashboardRepository = read("src/lib/workspace/dashboard-repository.ts");
const adminTypes = read("src/types/admin-api.ts");
const adminRepository = read("src/lib/admin/firestore-admin-repository.ts");
const mockAdminRepository = read("src/lib/admin/mock-admin-repository.ts");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const adminPanel = read("src/components/admin/workspace-enterprise-readiness-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  scripts["stage27d:qa"] === "node scripts/qa-stage27d-enterprise-deployment-sla-readiness.mjs",
  "package.json exposes npm run stage27d:qa."
);

for (const scriptName of [
  "stage27c:qa",
  "stage27b:qa",
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

assert(exists("src/lib/workspace/workspace-enterprise-readiness.ts"), "Workspace Enterprise readiness helper exists.");
assert(exists("src/lib/workspace/workspace-enterprise-deployment-ops.ts"), "Workspace Enterprise deployment ops helper exists.");
assert(exists("src/components/admin/workspace-enterprise-readiness-panel.tsx"), "Super Admin Enterprise readiness panel exists.");
assert(exists("src/app/api/admin/workspace-enterprise-deployment/route.ts"), "Super Admin Enterprise deployment route exists.");

for (const snippet of [
  "WorkspaceEnterpriseDeploymentMode",
  "\"shared_tradehub_cloud\"",
  "\"isolated_tenant_ready\"",
  "\"dedicated_deployment_ready\"",
  "\"custom_contract\"",
  "WorkspaceEnterpriseDeploymentStatus",
  "\"requested\"",
  "\"scoping\"",
  "\"security_review\"",
  "\"ready_for_contract\"",
  "\"active\"",
  "\"blocked\"",
  "\"custom_review\"",
  "WorkspaceEnterpriseSlaStatus",
  "\"enterprise_sla_ready\"",
  "WorkspaceEnterpriseBackupRestoreStatus",
  "\"documented\"",
  "WorkspaceEnterpriseDeploymentReadiness",
  "AdminWorkspaceEnterpriseDeploymentOverview"
]) {
  assert(packageTypes.includes(snippet), `Workspace package types include ${snippet}.`);
}

for (const snippet of [
  "WorkspaceEnterpriseDeployment",
  "enterpriseDeployment",
  "deploymentMode",
  "deploymentStatus",
  "slaStatus",
  "backupRestoreStatus",
  "dataResidencyStatus"
]) {
  assert(workspaceTypes.includes(snippet), `Workspace type includes ${snippet}.`);
}

for (const snippet of [
  "deriveWorkspaceEnterpriseDeploymentReadiness",
  "packageStatus.packageTier === \"enterprise\"",
  "Enterprise workspaces can be scoped",
  "Pro workspaces use the standard TradeHub cloud",
  "Launch workspaces use the standard TradeHub cloud",
  "No infrastructure provider action is triggered",
  "Live AutoCopy gates remain separate",
  "Dedicated deployment, SLA, and data residency remain custom contract items",
  "summarizeAdminWorkspaceEnterpriseDeployment",
  "maskedWorkspaceRef"
]) {
  assert(enterpriseHelper.includes(snippet), `Enterprise helper includes ${snippet}.`);
}

for (const snippet of [
  "requireSuperAdmin",
  "updateWorkspaceEnterpriseDeploymentOps",
  "workspaceRef",
  "maskedWorkspaceRef",
  "enterprise_deployment_ops",
  "sanitizeWorkspacePackageAdminText",
  "ENTERPRISE_OPS_WORKSPACE_SCAN_LIMIT",
  "mark_requested",
  "mark_scoping",
  "mark_security_review",
  "mark_ready_for_contract",
  "mark_active",
  "mark_blocked",
  "mark_custom_review",
  "Metadata only. No infrastructure provisioning",
  "No provider, credential, or DNS change was made"
]) {
  assert((enterpriseOps + enterpriseOpsRoute).includes(snippet), `Enterprise ops route/helper includes ${snippet}.`);
}

assert(!enterpriseOpsRoute.includes("getAdminRepositoryForRequest"), "Enterprise deployment route does not use mock fallback for writes.");
assert(!/params:\s*\{[^}]*workspaceId/.test(enterpriseOpsRoute), "Enterprise deployment route does not accept raw workspaceId path params.");
assert(!/payload\.workspaceId|rawWorkspaceId/.test(enterpriseOps), "Enterprise helper does not trust browser-supplied raw workspace IDs.");
assert(enterpriseOps.includes("maskedActorRef"), "Enterprise ops audit stores masked admin actor refs.");

assert(dashboardTypes.includes("enterpriseReadiness: WorkspaceEnterpriseDeploymentReadiness"), "Workspace dashboard summary includes Enterprise readiness.");
assert(dashboardMappers.includes("deriveWorkspaceEnterpriseDeploymentReadiness"), "Workspace dashboard mapper derives Enterprise readiness.");
assert(dashboardRepository.includes("deriveWorkspaceEnterpriseDeploymentReadiness"), "Workspace dashboard repository derives Enterprise readiness server-side.");
assert(adminTypes.includes("workspaceEnterpriseDeployment: AdminWorkspaceEnterpriseDeploymentOverview"), "Admin overview includes Enterprise deployment overview.");
assert(adminRepository.includes("buildWorkspaceEnterpriseDeploymentOverview"), "Admin repository builds Enterprise deployment overview.");
assert(mockAdminRepository.includes("workspaceEnterpriseDeployment") && mockAdminRepository.includes("shared_tradehub_cloud"), "Mock admin overview includes Enterprise deployment payload.");

for (const snippet of [
  "Enterprise readiness",
  "Deployment and SLA scope",
  "contract-scoped",
  "does not provision",
  "automate payments",
  "enable live execution",
  "deploymentChecklist",
  "contractScopePrompt"
]) {
  assert(workspaceOverview.includes(snippet), `Workspace overview includes safe ${snippet} Enterprise copy.`);
}

for (const snippet of [
  "Enterprise deployment and SLA",
  "Contract-scoped readiness",
  "deploymentFilters",
  "enterprise",
  "requested",
  "scoping",
  "security_review",
  "ready_for_contract",
  "active",
  "blocked",
  "custom_review",
  "Bounded Enterprise note",
  "/api/admin/workspace-enterprise-deployment",
  "workspaceRef",
  "No credentials, infrastructure refs, payment refs, or student private data"
]) {
  assert(adminPanel.includes(snippet), `Super Admin Enterprise panel includes ${snippet}.`);
}

assert(adminPage.includes("WorkspaceEnterpriseReadinessPanel"), "Super Admin page renders the Enterprise readiness panel.");

for (const deniedPath of [
  "platform_enterprise_deployment_readiness",
  "platform_enterprise_deployment_ops",
  "enterprise_deployment_ops",
  "enterprise_deployment_readiness",
  "enterprise_deployments"
]) {
  assert(rules.includes(deniedPath), `Firestore rules deny direct browser access to ${deniedPath}.`);
}

for (const source of [workspaceOverview, adminPanel]) {
  assert(!/Launch Workspace[^`]*[₦$]\s*\d/i.test(source), "Launch Enterprise UI does not expose public prices.");
  assert(!/Pro Workspace[^`]*[₦$]\s*\d/i.test(source), "Pro Enterprise UI does not expose public prices.");
  assert(!/Enterprise Workspace[^`]*[₦$]\s*\d/i.test(source), "Enterprise UI does not expose public prices.");
}

const changedSurface = [
  packageTypes,
  workspaceTypes,
  enterpriseHelper,
  enterpriseOps,
  enterpriseOpsRoute,
  dashboardTypes,
  dashboardMappers,
  dashboardRepository,
  adminTypes,
  adminRepository,
  mockAdminRepository,
  workspaceOverview,
  adminPanel,
  adminPage
].join("\n");

for (const forbidden of [
  "createDeployment(",
  "provisionInfrastructure(",
  "createCloudProject(",
  "terraform",
  "kubernetes",
  "cloudflare",
  "vercel",
  "aws-sdk",
  "googleapis",
  "uploadFile",
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
  "providerPayload",
  "vaultRef",
  "apiKey",
  "Trade Copier is included"
]) {
  assert(!changedSurface.includes(forbidden), `Stage 27D source does not add forbidden ${forbidden} behavior.`);
}

for (const file of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(file[1].includes("Stage 27D"), `${file[0]} documents Stage 27D.`);
  assert(
    file[1].includes("TH-2026-08-24-STAGE27D-ENTERPRISE-DEPLOYMENT-SLA-HANDOFF"),
    `${file[0]} carries the Stage 27D handoff reference.`
  );
}

console.log("Stage 27D Enterprise deployment and SLA readiness QA passed.");
