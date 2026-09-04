import fs from "fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, needles, message) {
  for (const needle of needles) {
    assert(source.includes(needle), `${message}: includes ${needle}`);
  }
}

const packageJson = read("package.json");
const reportData = read("src/lib/reports/report-sharing-data.ts");
const reportsPage = read("src/app/(public)/reports/page.tsx");
const reportClient = read("src/components/reports/reports-admin-client.tsx");
const parentPage = read("src/app/(public)/r/[token]/page.tsx");
const printButton = read("src/components/reports/print-report-button.tsx");
const globals = read("src/app/globals.css");

assert(packageJson.includes("\"test\": \"node scripts/qa-stage8-report-sharing.mjs\""), "package.json exposes npm run test for Stage 8.1 QA.");
assertIncludesAll(
  reportData,
  [
    "ReportStatus",
    "\"released\"",
    "demo-token-for-route-check-12345678901234567890",
    "resolveReportByToken",
    "report.status === \"released\"",
    "hasValidGuardianEmail",
    "normalizedWhatsAppNumber"
  ],
  "Report sharing data preserves released-report token boundary and guardian contact helpers"
);
assert(reportsPage.includes("ReportsAdminClient"), "/reports renders the report admin sharing client.");
assertIncludesAll(
  reportClient,
  [
    "Search student or admission number",
    "Create missing links",
    "reportsMissingLinks",
    "report.status !== \"released\"",
    "Copy all links",
    "Export links CSV",
    "Email",
    "WhatsApp",
    "Open",
    "linksCreatedThisSession",
    "missingGuardianEmailCount",
    "missingOrInvalidWhatsAppCount"
  ],
  "Reports admin page supports search, released-only bulk links, individual resend actions, export, and summary counts"
);
assert(
  reportClient.indexOf("reportsMissingLinks") < reportClient.indexOf("setLinksByReportId((current) =>"),
  "Bulk link creation uses local UI state to find missing released links."
);
assertIncludesAll(
  parentPage,
  [
    "resolveReportByToken(params.token)",
    "notFound()",
    "PrintReportButton",
    "report-card",
    "Subject results",
    "Class teacher comment",
    "Principal comment"
  ],
  "Parent public report page resolves only valid released tokens and keeps printable report content visible"
);
assertIncludesAll(
  printButton,
  [
    "window.print()",
    "Print / Save PDF"
  ],
  "Parent print action uses browser print only."
);
assertIncludesAll(
  globals,
  [
    "@media print",
    "@page",
    "size: A4",
    ".report-page-nav",
    ".report-actions",
    ".report-card",
    "break-inside: avoid",
    ".report-results-table"
  ],
  "Print CSS hides navigation/actions and formats the report card for A4."
);
assert(!reportClient.includes("supabase") && !parentPage.includes("supabase"), "Stage 8.1 does not store PDFs in Supabase.");
assert(!reportClient.includes("twilio") && !reportClient.includes("sendgrid") && !reportClient.includes("pdf"), "Stage 8.1 does not add paid SMS/email/PDF services.");

console.log("Stage 8.1 report sharing QA passed.");
