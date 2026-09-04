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
    console.error(`Stage 27J QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const packageHelper = read("src/lib/workspace/workspace-package-licence.ts");
const packageOps = read("src/lib/workspace/workspace-package-licence-ops.ts");
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
const demoQa = read("manual-demo-qa.md");
const promptSummary = read("prompt/promptsumary.md");
const pitchDeck = exists("generated/TradeHub_Pitch_Deck_No_Public_Pricing_2026.md")
  ? read("generated/TradeHub_Pitch_Deck_No_Public_Pricing_2026.md")
  : "";

assert(
  scripts["stage27j:qa"] === "node scripts/qa-stage27j-package-sales-final-acceptance.mjs",
  "package.json exposes npm run stage27j:qa."
);

for (const scriptName of [
  "stage27i:qa",
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
  assert(typeof scripts[scriptName] === "string", `${scriptName} remains wired for final package acceptance.`);
}

for (const filePath of [
  "src/types/workspace-package.ts",
  "src/lib/workspace/workspace-package-licence.ts",
  "src/lib/workspace/workspace-package-licence-ops.ts",
  "src/lib/workspace/workspace-branding-readiness.ts",
  "src/lib/workspace/workspace-branding-domain-ops.ts",
  "src/lib/workspace/workspace-enterprise-readiness.ts",
  "src/lib/workspace/workspace-enterprise-deployment-ops.ts",
  "src/lib/workspace/workspace-enterprise-integration-requests.ts",
  "src/lib/workspace/workspace-enterprise-integration-ops.ts",
  "src/components/workspace/workspace-overview.tsx",
  "src/components/workspace/workspace-enterprise-integration-requests-section.tsx",
  "src/components/admin/workspace-package-overview-panel.tsx",
  "src/components/admin/workspace-branding-domain-panel.tsx",
  "src/components/admin/workspace-enterprise-readiness-panel.tsx",
  "src/components/admin/workspace-enterprise-integrations-panel.tsx",
  "generated/TradeHub_Pitch_Deck_No_Public_Pricing_2026.md"
]) {
  assert(exists(filePath), `${filePath} exists for package sales final acceptance.`);
}

assert(packageTypes.includes("WorkspacePackageTier"), "Workspace package tier type exists.");
assert(packageTypes.includes("\"launch\"") && packageTypes.includes("\"pro\"") && packageTypes.includes("\"enterprise\""), "Launch, Pro, and Enterprise package tiers exist.");
assert(packageHelper.includes("LAUNCH_SEAT_CAP = 50"), "Launch package remains capped at 50 active students.");
assert(packageHelper.includes("PRO_SEAT_CAP = 500"), "Pro package remains capped at 500 active students.");
assert(packageHelper.includes("enterpriseCustomCapacity") && packageHelper.includes("studentSeatCap === null"), "Enterprise remains custom capacity/custom-reviewed.");
assert(packageHelper.includes("assertWorkspacePackageSeatAvailable"), "Server-side seat-cap enforcement helper remains present.");
assert(packageHelper.includes("tradeCopierIncluded: false"), "Base package status explicitly excludes Trade Copier.");
assert(packageHelper.includes("Trade Copier is a separate optional add-on."), "Trade Copier package copy remains separate optional add-on.");

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
  assert(workspaceOverview.includes(snippet), `/workspace package sales surface includes final-safe copy/control: ${snippet}.`);
}

for (const snippet of [
  "Launch supports 50 active students",
  "Pro supports 500",
  "Enterprise is custom-reviewed",
  "Trade Copier remains a separate optional add-on",
  "Licence actions here record support status only",
  "they do not collect payment or trigger money movement"
]) {
  assert(adminPackagePanel.includes(snippet), `Super Admin package/licence overview stays sales-safe: ${snippet}.`);
}

for (const snippet of [
  "WorkspacePackageLicenseTermType",
  "WorkspacePackageMaintenanceRenewalStatus",
  "WorkspacePackageSupportStatus",
  "adminNoteSummary",
  "lastReviewedAt",
  "No payment automation was performed",
  "updateWorkspacePackageLicenceOps"
]) {
  assert((packageTypes + packageHelper + packageOps).includes(snippet), `Licence/support/maintenance remains metadata-only: ${snippet}.`);
}

for (const snippet of [
  "sanitizeWorkspaceLogoUrl",
  "url.protocol === \"https:\"",
  "No DNS automation was performed",
  "No provider call was made",
  "Branding and domains",
  "No DNS secrets, provider refs, credentials, or student private data"
]) {
  assert((brandingHelper + brandingOps + adminBrandingPanel).includes(snippet), `Branding/domain readiness remains HTTPS metadata/no automation: ${snippet}.`);
}

for (const snippet of [
  "WorkspaceEnterpriseDeploymentMode",
  "WorkspaceEnterpriseSlaStatus",
  "Contract-scoped readiness",
  "Metadata only. No infrastructure provisioning",
  "No provider, credential, or DNS change was made",
  "Enterprise deployment and SLA"
]) {
  assert((packageTypes + enterpriseHelper + enterpriseOps + adminEnterprisePanel).includes(snippet), `Enterprise deployment/SLA readiness remains metadata-only: ${snippet}.`);
}

for (const snippet of [
  "WorkspaceEnterpriseIntegrationCategory",
  "WorkspaceEnterpriseIntegrationStatus",
  "packageStatus.packageTier === \"enterprise\"",
  "packageStatus.packageTier !== \"enterprise\"",
  "enterprise_integration_not_available",
  "Launch and Pro packages stay on standard TradeHub integrations",
  "No adapter, provider call, credential collection, or automation",
  "Enterprise integration queue",
  "No CRM, payment, analytics, broker, Telegram"
]) {
  assert(
    (packageTypes + integrationRequests + integrationOps + integrationWorkspaceSection + adminIntegrationPanel).includes(snippet),
    `Enterprise integration workflow remains Enterprise-only metadata intake: ${snippet}.`
  );
}

for (const snippet of [
  "WorkspacePackageOverviewPanel",
  "WorkspaceBrandingDomainPanel",
  "WorkspaceEnterpriseReadinessPanel",
  "WorkspaceEnterpriseIntegrationsPanel"
]) {
  assert(adminPage.includes(snippet), `Super Admin renders final package sales panel: ${snippet}.`);
}

for (const snippet of [
  "workspacePackages",
  "workspaceBranding",
  "workspaceEnterpriseDeployment",
  "workspaceEnterpriseIntegrations"
]) {
  assert(adminOverviewRoute.includes(snippet), `Super Admin overview API includes ${snippet}.`);
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
  const pathIndex = rules.indexOf(deniedPath);
  assert(pathIndex >= 0, `Firestore rules mention protected path ${deniedPath}.`);
  assert(
    rules.slice(pathIndex, pathIndex + 180).includes("allow read, write: if false"),
    `Firestore direct browser access is denied for ${deniedPath}.`
  );
}

const appSalesSurfaces = [
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
  assert(!pricePattern.test(appSalesSurfaces), "App package sales surfaces do not expose public package prices.");
}

assert(pitchDeck.includes("Public pricing is private"), "Pitch deck states public pricing is private.");
assert(pitchDeck.includes("Packages and scope are visible"), "Pitch deck separates visible package scope from private pricing.");
assert(pitchDeck.includes("Launch Workspace") && pitchDeck.includes("up to 50 active students"), "Pitch deck aligns Launch package to 50 active students.");
assert(pitchDeck.includes("Pro Workspace") && pitchDeck.includes("up to 500 active students"), "Pitch deck aligns Pro package to 500 active students.");
assert(pitchDeck.includes("Enterprise Workspace") && pitchDeck.includes("Custom capacity and custom agreement"), "Pitch deck keeps Enterprise custom-agreement scoped.");
assert(pitchDeck.includes("Trade Copier is not included by default"), "Pitch deck keeps Trade Copier out of base package.");
assert(pitchDeck.includes("Trade Copier remains a separate optional add on"), "Pitch deck keeps Trade Copier as optional add-on.");
assert(!/[₦$]\s*\d/.test(pitchDeck), "No-public-pricing pitch deck contains no currency-number public prices.");

const changedSurface = [
  packageTypes,
  packageHelper,
  packageOps,
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
  "createLifetimeCheckout",
  "refundPayment",
  "createRefund",
  "createPayout",
  "createWithdrawal",
  "walletTransfer",
  "settlementAutomation",
  "invoiceAutomation",
  "uploadLogo",
  "createUpload",
  "cloudStorage",
  "provisionDns",
  "provisionSsl",
  "provisionInfrastructure",
  "createTenant",
  "createCloudProject",
  "cloudflare",
  "vercel",
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
  assert(!changedSurface.includes(forbidden), `Stage 27J package sales source does not add forbidden ${forbidden} behavior.`);
}

for (const frozenRef of [
  "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
  "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
  "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF",
  "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF",
  "TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF",
  "TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF",
  "TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF",
  "TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF"
]) {
  assert((plan + backlog + promptSummary).includes(frozenRef), `Frozen/current reference remains documented: ${frozenRef}.`);
}

for (const [filePath, fileContents] of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(fileContents.includes("Stage 27J"), `${filePath} documents Stage 27J.`);
  assert(
    fileContents.includes("Package Sales MVP") || fileContents.includes("package sales"),
    `${filePath} marks package sales readiness in plain language.`
  );
}

for (const heading of [
  "Must Test Before Sales Demo",
  "Nice To Test",
  "Later Regression"
]) {
  assert(backlog.includes(heading), `manual-test-backlog.md organizes Stage 27 manual QA under ${heading}.`);
}

assert(demoQa.includes("/workspace") && demoQa.includes("/admin"), "manual-demo-qa.md still includes workspace and admin demo routes.");
assert(promptSummary.includes("Package Sales MVP is source-QA frozen"), "prompt summary marks Package Sales MVP source-QA frozen.");
assert(plan.includes("Package Sales MVP is source-QA frozen"), "plan marks Package Sales MVP source-QA frozen.");

console.log("Stage 27J package sales final acceptance QA passed.");
