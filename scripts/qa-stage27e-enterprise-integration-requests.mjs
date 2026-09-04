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
    console.error(`Stage 27E QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const requestsHelper = read("src/lib/workspace/workspace-enterprise-integration-requests.ts");
const opsHelper = read("src/lib/workspace/workspace-enterprise-integration-ops.ts");
const workspaceRoute = read("src/app/api/workspace/enterprise-integration-requests/route.ts");
const adminRoute = read("src/app/api/admin/workspace-enterprise-integrations/route.ts");
const adminTypes = read("src/types/admin-api.ts");
const firestoreAdminRepository = read("src/lib/admin/firestore-admin-repository.ts");
const mockAdminRepository = read("src/lib/admin/mock-admin-repository.ts");
const workspaceSection = read("src/components/workspace/workspace-enterprise-integration-requests-section.tsx");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const adminPanel = read("src/components/admin/workspace-enterprise-integrations-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  scripts["stage27e:qa"] === "node scripts/qa-stage27e-enterprise-integration-requests.mjs",
  "package.json exposes npm run stage27e:qa."
);

for (const scriptName of [
  "stage27d:qa",
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

for (const filePath of [
  "src/lib/workspace/workspace-enterprise-integration-requests.ts",
  "src/lib/workspace/workspace-enterprise-integration-ops.ts",
  "src/app/api/workspace/enterprise-integration-requests/route.ts",
  "src/app/api/admin/workspace-enterprise-integrations/route.ts",
  "src/components/workspace/workspace-enterprise-integration-requests-section.tsx",
  "src/components/admin/workspace-enterprise-integrations-panel.tsx"
]) {
  assert(exists(filePath), `${filePath} exists.`);
}

for (const snippet of [
  "WorkspaceEnterpriseIntegrationCategory",
  "\"crm\"",
  "\"payment\"",
  "\"analytics\"",
  "\"broker\"",
  "\"telegram_discord\"",
  "\"external_lms\"",
  "\"data_export\"",
  "\"custom\"",
  "WorkspaceEnterpriseIntegrationStatus",
  "\"requested\"",
  "\"triage\"",
  "\"scoping\"",
  "\"approved_for_build\"",
  "\"blocked\"",
  "\"completed\"",
  "\"rejected\"",
  "\"custom_review\"",
  "WorkspaceEnterpriseIntegrationPriority",
  "\"critical\"",
  "WorkspaceEnterpriseIntegrationDataSensitivityFlag",
  "WorkspaceEnterpriseIntegrationRequest",
  "WorkspaceEnterpriseIntegrationOverview",
  "AdminWorkspaceEnterpriseIntegrationOverview",
  "AdminWorkspaceEnterpriseIntegrationOpsPatchPayload"
]) {
  assert(packageTypes.includes(snippet), `Workspace package types include ${snippet}.`);
}

for (const snippet of [
  "sanitizeEnterpriseIntegrationText",
  "sanitizeEnterpriseProviderHostname",
  "containsEnterpriseIntegrationSecretLikeText",
  "enterpriseIntegrationRequestRef",
  "packageStatus.packageTier !== \"enterprise\"",
  "enterprise_integration_not_available",
  "workspaces/${actor.workspaceId}/enterprise_integration_requests",
  "requestedByRef: maskedActorRef",
  "No adapter, provider call, credential collection, or automation",
  "buildAdminWorkspaceEnterpriseIntegrationOverview",
  "summarizeAdminWorkspaceEnterpriseIntegrations",
  "resolveEnterpriseIntegrationRequestByRef",
  "maskedWorkspaceRef"
]) {
  assert(requestsHelper.includes(snippet), `Enterprise integration request helper includes ${snippet}.`);
}

for (const snippet of [
  "requireInfluencer",
  "listWorkspaceEnterpriseIntegrationRequests",
  "createWorkspaceEnterpriseIntegrationRequest",
  "GET(request: Request)",
  "POST(request: Request)"
]) {
  assert(workspaceRoute.includes(snippet), `Workspace integration route includes ${snippet}.`);
}

assert(!/payload\.workspaceId|payload\.studentId|rawWorkspaceId|rawStudentId/.test(requestsHelper), "Workspace helper does not trust browser-supplied workspace/student IDs.");
assert(!workspaceRoute.includes("params"), "Workspace route does not accept raw workspace path params for integration requests.");

for (const snippet of [
  "requireSuperAdmin",
  "buildAdminWorkspaceEnterpriseIntegrationOverview",
  "updateWorkspaceEnterpriseIntegrationOps",
  "GET(request: Request)",
  "PATCH(request: Request)",
  "source: \"firestore\""
]) {
  assert(adminRoute.includes(snippet), `Super Admin integration route includes ${snippet}.`);
}

for (const snippet of [
  "requestRef",
  "maskedWorkspaceRef",
  "enterprise_integration_ops",
  "mark_triage",
  "mark_scoping",
  "mark_approved_for_build",
  "mark_blocked",
  "mark_completed",
  "mark_rejected",
  "mark_security_review",
  "mark_legal_sla_review",
  "Metadata only. No CRM",
  "containsEnterpriseIntegrationSecretLikeText"
]) {
  assert(opsHelper.includes(snippet), `Super Admin integration ops helper includes ${snippet}.`);
}

assert(!adminRoute.includes("getAdminRepositoryForRequest"), "Super Admin integration write route does not use mock fallback.");
assert(adminTypes.includes("workspaceEnterpriseIntegrations: AdminWorkspaceEnterpriseIntegrationOverview"), "Admin overview payload includes Enterprise integrations.");
assert(firestoreAdminRepository.includes("buildAdminWorkspaceEnterpriseIntegrationOverview"), "Firestore admin repository builds Enterprise integration overview.");
assert(mockAdminRepository.includes("workspaceEnterpriseIntegrations"), "Mock admin repository includes Enterprise integration overview.");

for (const snippet of [
  "Enterprise integration requests",
  "Custom integration intake",
  "packageStatus.packageTier === \"enterprise\"",
  "Contact TradeHub",
  "/api/workspace/enterprise-integration-requests",
  "Submit integration request",
  "Do not include credentials",
  "API keys",
  "tokens",
  "webhook secrets",
  "broker passwords",
  "vault refs",
  "provider payloads"
]) {
  assert(workspaceSection.includes(snippet), `Workspace integration section includes safe ${snippet} copy/control.`);
}

assert(workspaceOverview.includes("WorkspaceEnterpriseIntegrationRequestsSection"), "Workspace overview renders Enterprise integration request section.");

for (const snippet of [
  "Enterprise integration queue",
  "Custom request review",
  "/api/admin/workspace-enterprise-integrations",
  "requestRef",
  "workspaceRef",
  "Internal admin note",
  "Workspace-visible note",
  "No CRM, payment, analytics, broker, Telegram",
  "AutoCopy",
  "live execution adapter"
]) {
  assert(adminPanel.includes(snippet), `Super Admin integration panel includes ${snippet}.`);
}

assert(adminPage.includes("WorkspaceEnterpriseIntegrationsPanel"), "Super Admin page renders Enterprise integration panel.");

for (const deniedPath of [
  "platform_enterprise_integration_requests",
  "platform_enterprise_integration_ops",
  "enterprise_integration_requests",
  "enterprise_integration_ops"
]) {
  assert(rules.includes(deniedPath), `Firestore rules deny direct browser access to ${deniedPath}.`);
}

for (const source of [workspaceSection, adminPanel, workspaceOverview]) {
  assert(!/Launch Workspace[^`]*[₦$]\s*\d/i.test(source), "Launch UI does not expose public prices.");
  assert(!/Pro Workspace[^`]*[₦$]\s*\d/i.test(source), "Pro UI does not expose public prices.");
  assert(!/Enterprise Workspace[^`]*[₦$]\s*\d/i.test(source), "Enterprise UI does not expose public prices.");
  assert(!source.includes("Trade Copier is included"), "Trade Copier is not bundled into package copy.");
}

const changedSurface = [
  packageTypes,
  requestsHelper,
  opsHelper,
  workspaceRoute,
  adminRoute,
  adminTypes,
  firestoreAdminRepository,
  mockAdminRepository,
  workspaceSection,
  workspaceOverview,
  adminPanel,
  adminPage
].join("\n");

for (const forbidden of [
  "createCrmAdapter",
  "createPaymentAdapter",
  "createAnalyticsAdapter",
  "createBrokerAdapter",
  "connectTelegram",
  "connectDiscord",
  "connectLms",
  "publicWebhookReceiver",
  "telegramBotToken",
  "webhookSecret",
  "providerPayload",
  "vaultRef",
  "brokerPassword",
  "createLiveOrder",
  "routeToAutoCopy",
  "publishExternalSignal",
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "refundPayment",
  "createPayout",
  "withdrawal",
  "uploadFile",
  "generatePdf",
  "openai"
]) {
  assert(!changedSurface.includes(forbidden), `Stage 27E source does not add forbidden ${forbidden} behavior.`);
}

for (const [filePath, fileContents] of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(fileContents.includes("Stage 27E"), `${filePath} documents Stage 27E.`);
  assert(
    fileContents.includes("TH-2026-08-24-STAGE27E-ENTERPRISE-INTEGRATION-REQUEST-HANDOFF"),
    `${filePath} records the Stage 27E handoff reference.`
  );
}

console.log("Stage 27E Enterprise integration request workflow QA passed.");
