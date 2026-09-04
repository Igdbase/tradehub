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
    console.error(`Stage 27A QA failed: ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

function sliceBetween(content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);

  assert(start >= 0, `${startMarker} source marker exists.`);
  assert(end > start, `${endMarker} source marker exists after ${startMarker}.`);

  return content.slice(start, end);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const packageTypes = read("src/types/workspace-package.ts");
const packageHelper = read("src/lib/workspace/workspace-package-licence.ts");
const workspaceTypes = read("src/types/workspace-dashboard.ts");
const workspaceMapper = read("src/lib/workspace/dashboard-mappers.ts");
const workspaceRepository = read("src/lib/workspace/dashboard-repository.ts");
const billingRepository = read("src/lib/billing/billing-repository.ts");
const workspaceOverview = read("src/components/workspace/workspace-overview.tsx");
const adminTypes = read("src/types/admin-api.ts");
const adminRepo = read("src/lib/admin/firestore-admin-repository.ts");
const adminRoute = read("src/app/api/admin/overview/route.ts");
const adminClient = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminPanel = read("src/components/admin/workspace-package-overview-panel.tsx");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const billingPackageSlice = [
  sliceBetween(
    billingRepository,
    "async function assertWorkspacePackageAllowsStudentActivation",
    "function asString"
  ),
  "assertWorkspacePackageAllowsStudentActivation(workspace, student.studentId)"
].join("\n");

assert(
  scripts["stage27a:qa"] === "node scripts/qa-stage27a-package-entitlements-seat-caps.mjs",
  "package.json exposes npm run stage27a:qa."
);

for (const scriptName of [
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

assert(exists("src/types/workspace-package.ts"), "Workspace package/licence type file exists.");
assert(packageTypes.includes("WorkspacePackageTier") && packageTypes.includes("\"launch\"") && packageTypes.includes("\"pro\"") && packageTypes.includes("\"enterprise\""), "Package tiers include launch, pro, and enterprise.");
assert(packageTypes.includes("WorkspacePackageLicenseStatus") && packageTypes.includes("\"custom_review\""), "Licence status model includes active/pending/expired/suspended/custom review.");
assert(packageTypes.includes("WorkspacePackageStatus") && packageTypes.includes("overLimit") && packageTypes.includes("remainingSeats"), "Package status includes seat cap, remaining seats, and over-limit posture.");
assert(packageTypes.includes("tradeCopierIncluded: false"), "Package status explicitly keeps Trade Copier out of base packages.");

assert(packageHelper.includes("LAUNCH_SEAT_CAP = 50"), "Launch package cap is 50 active students.");
assert(packageHelper.includes("PRO_SEAT_CAP = 500"), "Pro package cap is 500 active students.");
assert(packageHelper.includes("enterpriseCustomCapacity") && packageHelper.includes("studentSeatCap === null"), "Enterprise supports custom capacity instead of a hardcoded public cap.");
assert(packageHelper.includes("deriveWorkspacePackageStatus"), "Server-side package status helper exists.");
assert(packageHelper.includes("assertWorkspacePackageSeatAvailable"), "Server-side seat-cap enforcement helper exists for student-capacity create paths.");
assert(packageHelper.includes("workspace_package_seat_cap_reached"), "Seat-cap enforcement fails closed with a safe error code.");
assert(packageHelper.includes("createHash") && packageHelper.includes("workspaceRef"), "Admin package insights use masked workspace refs.");
assert(billingRepository.includes("assertWorkspacePackageAllowsStudentActivation"), "Billing activation path checks package seat capacity before making a student active.");
assert(billingRepository.includes("assertWorkspacePackageSeatAvailable(packageStatus)"), "Billing activation path fails closed through the server package seat helper.");
assert(billingRepository.includes("doc.id !== studentId"), "Billing activation cap check excludes the same student so renewals do not consume a second seat.");

assert(workspaceTypes.includes("packageStatus: WorkspacePackageStatus"), "Workspace dashboard summary carries package status.");
assert(workspaceMapper.includes("deriveWorkspacePackageStatus"), "Workspace mapper creates safe package defaults for persisted/fallback summaries.");
assert(workspaceRepository.includes("deriveWorkspacePackageStatus") && workspaceRepository.includes("activeStudentCount"), "Workspace repository derives package status from workspace/student records.");
assert(workspaceRepository.includes("over the current package seat cap"), "Workspace repository warns when active students exceed package cap.");

assert(workspaceOverview.includes("Workspace licence") && workspaceOverview.includes("Seat cap") && workspaceOverview.includes("Seats left"), "Workspace UI shows package name, seat cap, and remaining seats.");
assert(workspaceOverview.includes("Pricing is handled by private quote/contact sales"), "Workspace UI avoids public prices and directs pricing to private quote/contact sales.");
assert(workspaceOverview.includes("Trade Copier remains a separate optional add-on"), "Workspace UI keeps Trade Copier separate and optional.");
assert(!/Launch Workspace[^`]*[₦$]\s*\d/i.test(workspaceOverview), "Workspace package UI does not show public Launch price.");
assert(!/Pro Workspace[^`]*[₦$]\s*\d/i.test(workspaceOverview), "Workspace package UI does not show public Pro price.");
assert(!/Enterprise Workspace[^`]*[₦$]\s*\d/i.test(workspaceOverview), "Workspace package UI does not show public Enterprise price.");

assert(adminTypes.includes("workspacePackages: AdminWorkspacePackageOverview"), "Admin overview response includes safe package overview.");
assert(adminRepo.includes("buildWorkspacePackageOverview") && adminRepo.includes("ADMIN_PACKAGE_WORKSPACE_LIMIT"), "Super Admin package overview is bounded.");
assert(adminRepo.includes("where(\"status\", \"==\", \"active\")"), "Super Admin package overview counts active students only.");
assert(adminRoute.includes("workspacePackages: overview.workspacePackages"), "Super Admin overview API returns package overview.");
assert(adminClient.includes("WorkspacePackageOverviewPanel") && adminClient.includes("overview.workspacePackages"), "Super Admin page renders package overview panel.");
assert(adminPanel.includes("Package licences") && adminPanel.includes("over limit") && adminPanel.includes("Trade Copier remains a separate optional add-on"), "Super Admin package panel shows support-safe status and add-on separation.");
assert(!adminPanel.includes("studentId") && !adminPanel.includes("paymentIntent") && !adminPanel.includes("providerPayload"), "Super Admin package panel does not render raw student/payment/provider internals.");
assert(!/₦\s*\d|\$\s*\d/.test(adminPanel), "Super Admin package panel does not expose public prices.");

for (const deniedPath of [
  "platform_package_licences",
  "platform_package_licenses",
  "package_licences",
  "package_licenses"
]) {
  assert(rules.includes(deniedPath), `Firestore rules deny direct browser access to ${deniedPath}.`);
}

for (const file of [
  ["plan.md", plan],
  ["manual-test-backlog.md", backlog],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(file[1].includes("Stage 27A"), `${file[0]} documents Stage 27A.`);
  assert(
    file[1].includes("TH-2026-08-24-STAGE27A-PACKAGE-ENTITLEMENTS-SEAT-CAPS-HANDOFF"),
    `${file[0]} carries the Stage 27A handoff reference.`
  );
}

const changedSurface = [
  packageTypes,
  packageHelper,
  workspaceTypes,
  workspaceMapper,
  workspaceRepository,
  billingPackageSlice,
  workspaceOverview,
  adminTypes,
  adminRepo,
  adminRoute,
  adminClient,
  adminPanel
].join("\n");

for (const forbidden of [
  "refund",
  "payout",
  "withdrawal",
  "sendEmail",
  "sendSms",
  "sendWhatsApp",
  "createLiveOrder",
  "MetaAPI token",
  "brokerPassword",
  "providerPayload"
]) {
  assert(!changedSurface.includes(forbidden), `Stage 27A source does not add forbidden ${forbidden} behavior.`);
}

console.log("Stage 27A package entitlements, seat caps, and licence model QA passed.");
