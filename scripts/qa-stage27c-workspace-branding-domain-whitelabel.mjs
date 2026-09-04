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
    console.error(`Stage 27C QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const workspaceTypes = read("src/types/workspace.ts");
const brandingHelper = read("src/lib/workspace/workspace-branding-readiness.ts");
const brandingOps = read("src/lib/workspace/workspace-branding-domain-ops.ts");
const brandingOpsRoute = read("src/app/api/admin/workspace-branding-domain/route.ts");
const dashboardTypes = read("src/types/workspace-dashboard.ts");
const dashboardRepository = read("src/lib/workspace/dashboard-repository.ts");
const adminTypes = read("src/types/admin-api.ts");
const adminRepository = read("src/lib/admin/firestore-admin-repository.ts");
const mockAdminRepository = read("src/lib/admin/mock-admin-repository.ts");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const adminPanel = read("src/components/admin/workspace-branding-domain-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  scripts["stage27c:qa"] === "node scripts/qa-stage27c-workspace-branding-domain-whitelabel.mjs",
  "package.json exposes npm run stage27c:qa."
);

for (const scriptName of [
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

assert(exists("src/lib/workspace/workspace-branding-readiness.ts"), "Workspace branding readiness helper exists.");
assert(exists("src/lib/workspace/workspace-branding-domain-ops.ts"), "Workspace branding/domain ops helper exists.");
assert(exists("src/components/admin/workspace-branding-domain-panel.tsx"), "Super Admin branding/domain panel exists.");
assert(exists("src/app/api/admin/workspace-branding-domain/route.ts"), "Super Admin branding/domain route exists.");

for (const snippet of [
  "WorkspaceBrandingMode",
  "\"tradehub_branded\"",
  "\"co_branded\"",
  "\"white_label_ready\"",
  "WorkspaceCustomDomainStatus",
  "\"not_configured\"",
  "\"requested\"",
  "\"dns_pending\"",
  "\"verifying\"",
  "\"active\"",
  "\"blocked\"",
  "\"custom_review\"",
  "WorkspaceDnsChecklistStatus",
  "WorkspaceBrandingReadiness",
  "AdminWorkspaceBrandingOverview"
]) {
  assert(packageTypes.includes(snippet), `Workspace package types include ${snippet}.`);
}

for (const snippet of [
  "brandingMode",
  "displayName",
  "customDomainStatus",
  "requestedDomainHostname",
  "dnsChecklistStatus",
  "studentFacingBrandVisibilityStatus"
]) {
  assert(workspaceTypes.includes(snippet), `Workspace branding type includes ${snippet}.`);
}

for (const snippet of [
  "sanitizeWorkspaceLogoUrl",
  "url.protocol === \"https:\"",
  "sanitizeWorkspaceDomainHostname",
  "sanitizeWorkspaceBrandColor",
  "allowedBrandingModes",
  "packageStatus.packageTier === \"launch\"",
  "\"tradehub_branded\", \"co_branded\"",
  "Pro workspaces can use co-branded and white-label-ready controls",
  "Enterprise branding, white-label posture, and custom domains are custom-reviewed",
  "No custom domain is configured.",
  "No DNS provider automation is performed from this app."
]) {
  assert(brandingHelper.includes(snippet), `Branding helper includes ${snippet}.`);
}

for (const snippet of [
  "requireSuperAdmin",
  "updateWorkspaceBrandingDomainOps",
  "workspaceRef",
  "maskedWorkspaceRef",
  "branding_domain_ops",
  "sanitizeWorkspaceDomainHostname",
  "sanitizeWorkspacePackageAdminText",
  "BRANDING_OPS_WORKSPACE_SCAN_LIMIT",
  "mark_requested",
  "mark_dns_pending",
  "mark_verifying",
  "mark_active",
  "mark_blocked",
  "mark_custom_review",
  "No DNS automation was performed",
  "No provider call was made"
]) {
  assert((brandingOps + brandingOpsRoute).includes(snippet), `Branding/domain route/helper includes ${snippet}.`);
}

assert(!brandingOpsRoute.includes("getAdminRepositoryForRequest"), "Branding/domain route does not use mock fallback for writes.");
assert(!/params:\s*\{[^}]*workspaceId/.test(brandingOpsRoute), "Branding/domain route does not accept raw workspaceId path params.");
assert(!/payload\.workspaceId|rawWorkspaceId/.test(brandingOps), "Branding/domain helper does not trust browser-supplied raw workspace IDs.");
assert(brandingOps.includes("maskedActorRef"), "Branding/domain ops audit stores masked admin actor refs.");

assert(dashboardTypes.includes("brandingReadiness: WorkspaceBrandingReadiness"), "Workspace dashboard summary includes branding readiness.");
assert(dashboardRepository.includes("deriveWorkspaceBrandingReadiness"), "Workspace dashboard derives branding readiness server-side.");
assert(adminTypes.includes("workspaceBranding: AdminWorkspaceBrandingOverview"), "Admin overview includes workspace branding overview.");
assert(adminRepository.includes("buildWorkspaceBrandingOverview"), "Admin repository builds workspace branding overview.");
assert(mockAdminRepository.includes("workspaceBranding") && mockAdminRepository.includes("customDomainStatus"), "Mock admin overview includes branding/domain payload.");

for (const snippet of [
  "Workspace brand",
  "packageAvailabilityMessage",
  "Logo values are HTTPS metadata only",
  "custom domains are admin-reviewed",
  "pricing remains private quote/contact sales",
  "contactPrompt",
  "dnsChecklistSummary"
]) {
  assert(workspaceOverview.includes(snippet), `Workspace overview includes safe ${snippet} branding/domain copy.`);
}

for (const snippet of [
  "Branding and domains",
  "Workspace brand readiness",
  "domainFilters",
  "requested",
  "dns_pending",
  "verifying",
  "active",
  "blocked",
  "custom_review",
  "Requested domain hostname",
  "Bounded review note",
  "/api/admin/workspace-branding-domain",
  "workspaceRef",
  "No DNS secrets, provider refs, credentials, or student private data"
]) {
  assert(adminPanel.includes(snippet), `Super Admin branding/domain panel includes ${snippet}.`);
}

assert(adminPage.includes("WorkspaceBrandingDomainPanel"), "Super Admin page renders the branding/domain panel.");

for (const deniedPath of [
  "platform_workspace_branding_domains",
  "platform_branding_domain_ops",
  "custom_domains",
  "branding_domain_ops",
  "branding_domains"
]) {
  assert(rules.includes(deniedPath), `Firestore rules deny direct browser access to ${deniedPath}.`);
}

for (const source of [workspaceOverview, adminPanel]) {
  assert(!/Launch Workspace[^`]*[₦$]\s*\d/i.test(source), "Launch branding UI does not expose public prices.");
  assert(!/Pro Workspace[^`]*[₦$]\s*\d/i.test(source), "Pro branding UI does not expose public prices.");
  assert(!/Enterprise Workspace[^`]*[₦$]\s*\d/i.test(source), "Enterprise branding UI does not expose public prices.");
}

const changedSurface = [
  packageTypes,
  workspaceTypes,
  brandingHelper,
  brandingOps,
  brandingOpsRoute,
  dashboardTypes,
  dashboardRepository,
  adminTypes,
  adminRepository,
  mockAdminRepository,
  workspaceOverview,
  adminPanel,
  adminPage
].join("\n");

for (const forbidden of [
  "uploadLogo",
  "createUpload",
  "cloudStorage",
  "Cloudflare",
  "Vercel",
  "createDns",
  "provisionSsl",
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
  assert(!changedSurface.includes(forbidden), `Stage 27C source does not add forbidden ${forbidden} behavior.`);
}

for (const file of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(file[1].includes("Stage 27C"), `${file[0]} documents Stage 27C.`);
  assert(
    file[1].includes("TH-2026-08-24-STAGE27C-WORKSPACE-BRANDING-DOMAIN-WHITELABEL-HANDOFF"),
    `${file[0]} carries the Stage 27C handoff reference.`
  );
}

console.log("Stage 27C workspace branding, custom domain readiness, and white-label controls QA passed.");
