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
    console.error(`Stage 27I QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const packageHelper = read("src/lib/workspace/workspace-package-licence.ts");
const licenceOps = read("src/lib/workspace/workspace-package-licence-ops.ts");
const brandingHelper = read("src/lib/workspace/workspace-branding-readiness.ts");
const brandingOps = read("src/lib/workspace/workspace-branding-domain-ops.ts");
const enterpriseHelper = read("src/lib/workspace/workspace-enterprise-readiness.ts");
const enterpriseOps = read("src/lib/workspace/workspace-enterprise-deployment-ops.ts");
const integrationRequests = read("src/lib/workspace/workspace-enterprise-integration-requests.ts");
const integrationOps = read("src/lib/workspace/workspace-enterprise-integration-ops.ts");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const integrationWorkspaceSection = read("src/components/workspace/workspace-enterprise-integration-requests-section.tsx");
const adminPackagePanel = read("src/components/admin/workspace-package-overview-panel.tsx");
const adminBrandingPanel = read("src/components/admin/workspace-branding-domain-panel.tsx");
const adminEnterprisePanel = read("src/components/admin/workspace-enterprise-readiness-panel.tsx");
const adminIntegrationPanel = read("src/components/admin/workspace-enterprise-integrations-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminOverviewRoute = read("src/app/api/admin/overview/route.ts");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  scripts["stage27i:qa"] === "node scripts/qa-stage27i-package-sales-readiness-smoke.mjs",
  "package.json exposes npm run stage27i:qa."
);

for (const scriptName of [
  "stage27e:qa",
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
  "src/lib/workspace/workspace-package-licence.ts",
  "src/lib/workspace/workspace-package-licence-ops.ts",
  "src/lib/workspace/workspace-branding-readiness.ts",
  "src/lib/workspace/workspace-branding-domain-ops.ts",
  "src/lib/workspace/workspace-enterprise-readiness.ts",
  "src/lib/workspace/workspace-enterprise-deployment-ops.ts",
  "src/lib/workspace/workspace-enterprise-integration-requests.ts",
  "src/lib/workspace/workspace-enterprise-integration-ops.ts",
  "src/components/workspace/workspace-overview.tsx",
  "src/components/admin/workspace-package-overview-panel.tsx",
  "src/components/admin/workspace-branding-domain-panel.tsx",
  "src/components/admin/workspace-enterprise-readiness-panel.tsx",
  "src/components/admin/workspace-enterprise-integrations-panel.tsx"
]) {
  assert(exists(filePath), `${filePath} exists for package sales readiness.`);
}

assert(packageTypes.includes("WorkspacePackageTier"), "Package tier type exists.");
assert(packageTypes.includes("\"launch\"") && packageTypes.includes("\"pro\"") && packageTypes.includes("\"enterprise\""), "Launch, Pro, and Enterprise tiers exist.");
assert(packageTypes.includes("tradeCopierIncluded: false"), "Trade Copier is explicitly excluded from base package status.");
assert(packageHelper.includes("LAUNCH_SEAT_CAP = 50"), "Launch package seat cap is 50 active students.");
assert(packageHelper.includes("PRO_SEAT_CAP = 500"), "Pro package seat cap is 500 active students.");
assert(packageHelper.includes("enterpriseCustomCapacity") && packageHelper.includes("studentSeatCap === null"), "Enterprise capacity remains custom-reviewed.");
assert(workspaceOverview.includes("Pricing is handled by private quote/contact sales"), "Workspace package UI keeps pricing private quote/contact sales.");
assert(packageHelper.includes("Trade Copier is a separate optional add-on."), "Trade Copier copy remains separate optional add-on.");
assert(packageHelper.includes("assertWorkspacePackageSeatAvailable"), "Seat-cap enforcement helper remains present.");

for (const snippet of [
  "Workspace licence",
  "Seat cap",
  "Seats left",
  "Pricing is handled by private quote/contact sales",
  "Trade Copier remains a separate optional add-on",
  "Workspace brand",
  "Logo values are HTTPS metadata only",
  "custom domains are admin-reviewed",
  "Enterprise readiness",
  "Deployment and SLA scope",
  "contract-scoped",
  "does not provision",
  "automate payments",
  "enable live execution",
  "WorkspaceEnterpriseIntegrationRequestsSection"
]) {
  assert(workspaceOverview.includes(snippet), `/workspace includes package sales smoke copy/control: ${snippet}.`);
}

for (const snippet of [
  "Launch supports 50 active students",
  "Pro supports 500",
  "Enterprise is custom-reviewed",
  "Trade Copier remains a separate optional add-on",
  "Licence actions here record support status only",
  "they do not collect payment or trigger money movement"
]) {
  assert(adminPackagePanel.includes(snippet), `Super Admin package panel includes sales-safe ${snippet}.`);
}

for (const snippet of [
  "Branding and domains",
  "No DNS secrets, provider refs, credentials, or student private data",
  "No DNS automation was performed",
  "No provider call was made"
]) {
  assert((adminBrandingPanel + brandingOps).includes(snippet), `Branding/domain surface remains metadata-only: ${snippet}.`);
}

for (const snippet of [
  "Enterprise deployment and SLA",
  "Contract-scoped readiness",
  "No credentials, infrastructure refs, payment refs, or student private data",
  "Metadata only. No infrastructure provisioning",
  "No provider, credential, or DNS change was made"
]) {
  assert((adminEnterprisePanel + enterpriseOps).includes(snippet), `Enterprise deployment/SLA surface remains metadata-only: ${snippet}.`);
}

for (const snippet of [
  "Enterprise integration queue",
  "Custom request review",
  "No CRM, payment, analytics, broker, Telegram",
  "live execution adapter",
  "Metadata only. No CRM",
  "No adapter, provider call, credential collection, or automation",
  "packageStatus.packageTier !== \"enterprise\"",
  "enterprise_integration_not_available"
]) {
  assert((adminIntegrationPanel + integrationOps + integrationRequests).includes(snippet), `Enterprise integration workflow remains metadata-only and Enterprise-gated: ${snippet}.`);
}

assert(integrationWorkspaceSection.includes("packageStatus.packageTier === \"enterprise\""), "Workspace integration intake is gated to Enterprise package status.");
assert(integrationWorkspaceSection.includes("Launch and Pro packages stay on standard TradeHub integrations"), "Launch/Pro receive contact-sales copy instead of Enterprise intake.");
assert(integrationWorkspaceSection.includes("Trade Copier remains a separate optional add-on"), "Enterprise integration intake keeps Trade Copier separate.");

for (const snippet of [
  "WorkspacePackageOverviewPanel",
  "WorkspaceBrandingDomainPanel",
  "WorkspaceEnterpriseReadinessPanel",
  "WorkspaceEnterpriseIntegrationsPanel"
]) {
  assert(adminPage.includes(snippet), `Super Admin app renders ${snippet}.`);
}

for (const snippet of [
  "workspacePackages",
  "workspaceBranding",
  "workspaceEnterpriseDeployment",
  "workspaceEnterpriseIntegrations"
]) {
  assert(adminOverviewRoute.includes(snippet), `Super Admin overview route returns ${snippet}.`);
}

for (const deniedPath of [
  "platform_package_licences",
  "platform_package_licenses",
  "package_licence_ops",
  "package_license_ops",
  "platform_workspace_branding_domains",
  "platform_branding_domain_ops",
  "branding_domains",
  "branding_domain_ops",
  "platform_enterprise_deployment_readiness",
  "platform_enterprise_deployment_ops",
  "enterprise_deployment_readiness",
  "enterprise_deployment_ops",
  "platform_enterprise_integration_requests",
  "platform_enterprise_integration_ops",
  "enterprise_integration_requests",
  "enterprise_integration_ops"
]) {
  assert(rules.includes(deniedPath), `Firestore rules deny direct browser access to ${deniedPath}.`);
}

const salesSurfaces = [
  workspaceOverview,
  integrationWorkspaceSection,
  adminPackagePanel,
  adminBrandingPanel,
  adminEnterprisePanel,
  adminIntegrationPanel,
  packageHelper,
  brandingHelper,
  enterpriseHelper,
  integrationRequests
].join("\n");

for (const pricePattern of [
  /Launch Workspace[^`]*[₦$]\s*\d/i,
  /Pro Workspace[^`]*[₦$]\s*\d/i,
  /Enterprise Workspace[^`]*[₦$]\s*\d/i,
  /launch[^.\n]*(?:price|cost|fee)[^.\n]*[₦$]\s*\d/i,
  /pro[^.\n]*(?:price|cost|fee)[^.\n]*[₦$]\s*\d/i,
  /enterprise[^.\n]*(?:price|cost|fee)[^.\n]*[₦$]\s*\d/i
]) {
  assert(!pricePattern.test(salesSurfaces), "Package sales surfaces do not expose public package prices.");
}

const changedSurface = [
  packageTypes,
  packageHelper,
  licenceOps,
  brandingHelper,
  brandingOps,
  enterpriseHelper,
  enterpriseOps,
  integrationRequests,
  integrationOps,
  workspaceOverview,
  integrationWorkspaceSection,
  adminPackagePanel,
  adminBrandingPanel,
  adminEnterprisePanel,
  adminIntegrationPanel,
  adminPage,
  adminOverviewRoute
].join("\n");

for (const forbidden of [
  "collectLicencePayment",
  "createLicenceCheckout",
  "refundPayment",
  "createRefund",
  "createPayout",
  "withdrawal",
  "walletTransfer",
  "settlementAutomation",
  "uploadLogo",
  "createUpload",
  "cloudStorage",
  "provisionDns",
  "provisionSsl",
  "provisionInfrastructure",
  "createCloudProject",
  "createCrmAdapter",
  "createPaymentAdapter",
  "createAnalyticsAdapter",
  "createBrokerAdapter",
  "connectTelegram",
  "connectDiscord",
  "connectLms",
  "webhookSecret",
  "providerPayload",
  "vaultRef",
  "brokerPassword",
  "createLiveOrder",
  "routeToAutoCopy",
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "generatePdf",
  "openai"
]) {
  assert(!changedSurface.includes(forbidden), `Stage 27I source does not add forbidden ${forbidden} behavior.`);
}

for (const frozenRef of [
  "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
  "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
  "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF",
  "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF",
  "TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF"
]) {
  assert((plan + backlog + promptSummary).includes(frozenRef), `Frozen reference remains documented: ${frozenRef}.`);
}

for (const [filePath, fileContents] of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(fileContents.includes("Stage 27I"), `${filePath} documents Stage 27I.`);
  assert(
    fileContents.includes("TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF"),
    `${filePath} records the Stage 27I handoff reference.`
  );
}

console.log("Stage 27I package sales readiness smoke QA passed.");
