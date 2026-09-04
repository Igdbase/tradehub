import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, forbidden, message) {
  const found = forbidden.filter((entry) => source.includes(entry));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert(start >= 0, `Found source slice start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert(end > start, `Found source slice end marker: ${endMarker}`);

  return source.slice(start, end);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/messaging.ts");
const contract = read("src/lib/messaging/messaging-provider-contract.ts");
const repository = read("src/lib/messaging/message-intent-repository.ts");
const worker = read("src/lib/messaging/messaging-delivery-worker.ts");
const studentRoute = read("src/app/api/student/messaging/preferences/route.ts");
const studentCard = read("src/components/student-app/student-messaging-preferences-card.tsx");
const studentHome = read("src/app/(student)/app/student-app-page-client.tsx");
const adminPanel = read("src/components/admin/messaging-readiness-panel.tsx");
const adminOverviewRoute = read("src/app/api/admin/messaging/overview/route.ts");
const rules = read("firestore.rules");
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage23c:qa"] === "node scripts/qa-stage23c-messaging-preferences-suppression.mjs",
  "package.json exposes npm run stage23c:qa."
);

[
  "src/app/api/student/messaging/preferences/route.ts",
  "src/components/student-app/student-messaging-preferences-card.tsx",
  "src/lib/messaging/message-intent-repository.ts",
  "src/lib/messaging/messaging-delivery-worker.ts"
].forEach((relativePath) => assert(exists(relativePath), `${relativePath} exists.`));

assertIncludesAll(
  types,
  [
    "StudentMessagingPreferences",
    "StudentMessagingPreferencesResponse",
    "MessagingPreferenceSummaryRecord",
    "MessagingSuppressionRecord",
    "MessagingContactReadinessStatus",
    "student_channel_opted_out",
    "student_purpose_opted_out",
    "recipient_suppressed",
    "contact_unavailable",
    "contact_unverified",
    "provider_disabled",
    "dry_run_only",
    "channelPreferenceEnabled",
    "purposePreferenceEnabled",
    "recipientSuppressed",
    "contactStatus",
    "latestSuppressions",
    "suppressedRecipientCount",
    "contactUnavailableCount"
  ],
  "Messaging types include preferences, masked suppressions, contact readiness, and safe block reasons."
);

const responseType = sourceSlice(types, "export interface StudentMessagingPreferencesResponse", "export interface MessagingSuppressionRecord");
assertExcludesAll(
  responseType,
  [
    "phone",
    "emailAddress",
    "phoneNumber",
    "messageBody",
    "providerPayload",
    "vaultRef",
    "token",
    "rawStudentId",
    "rawSessionId"
  ],
  "Student preference response exposes no contact details, message bodies, provider payloads, refs, or raw IDs."
);

assertIncludesAll(
  studentRoute,
  [
    "requireStudent(request)",
    "getStudentMessagingPreferences(actor)",
    "updateStudentMessagingPreferences(actor, payload)"
  ],
  "Student messaging preference API is protected by requireStudent for read and update."
);

assertIncludesAll(
  repository,
  [
    "MESSAGING_PREFERENCE_COLLECTION_ID = \"messaging_preferences\"",
    "MESSAGING_PREFERENCE_SUMMARY_COLLECTION_ID = \"messaging_preference_summaries\"",
    "MESSAGING_SUPPRESSION_COLLECTION_ID = \"messaging_suppressions\"",
    "DEFAULT_CONTACT_READINESS",
    "email: \"contact_unavailable\"",
    "DEFAULT_MESSAGING_PREFERENCES",
    "email: false",
    "whatsapp: false",
    "sms: false",
    "practice_assignment: false",
    "getStudentMessagingPreferences",
    "updateStudentMessagingPreferences",
    "preferenceRef.set",
    "summaryRef.set",
    "maskedStudentRef",
    "createMessagingSafeRef(actor.studentId, \"student\")"
  ],
  "Repository stores student-owned preferences and masked worker-readable summaries with fail-closed defaults."
);

assertIncludesAll(
  repository,
  [
    "evaluateMessagingIntentSafety",
    "student_channel_opted_out",
    "student_purpose_opted_out",
    "recipient_suppressed",
    "contact_unavailable",
    "contact_unverified",
    "provider_disabled",
    "dry_run_only",
    "listActiveSuppressionsForMaskedStudent",
    "getPreferenceSummaryForMaskedStudent",
    "channelPreferenceEnabled",
    "purposePreferenceEnabled",
    "recipientSuppressed",
    "contactStatus"
  ],
  "Intent creation evaluates preferences, suppressions, contact readiness, and provider gates before delivery."
);

assertExcludesAll(
  repository,
  [
    "phoneNumber:",
    "emailAddress:",
    "messageBody:",
    "providerPayload:",
    "vaultRef:",
    "paymentRef:",
    "paystackReference:",
    "solanaSignature:",
    "rawStudentId:",
    "rawSessionId:",
    "answerKey:",
    "hiddenCandle"
  ],
  "Messaging repository excludes contact details, message bodies, payment refs, provider payloads, answer keys, and hidden candle fields."
);

assertIncludesAll(
  worker,
  [
    "evaluateMessagingIntentSafety",
    "safety.status === \"blocked\"",
    "createMessagingDeliveryAttempt",
    "updateMessageIntentAfterDeliveryAttempt",
    "Stage 23C worker is dry-run only",
    "messaging_worker_real_send_blocked",
    "deliverMessageWithPlaceholderAdapter"
  ],
  "Worker rechecks preference/suppression/contact/provider safety before dry-run placeholder processing."
);

assertExcludesAll(
  worker,
  [
    "fetch(",
    "Twilio(",
    "Resend(",
    "SendGrid",
    "Mailgun",
    "Nodemailer",
    "sendEmail",
    "sendSms",
    "sendWhatsApp",
    "phoneNumber",
    "emailAddress",
    "messageBody",
    "providerPayload",
    "vaultRef",
    "brokerPassword",
    "metaApiToken"
  ],
  "Worker still contains no real messaging provider calls, contact details, message bodies, or credential fields."
);

assertIncludesAll(
  studentCard,
  [
    "Reminder preferences",
    "External email, WhatsApp, and SMS reminders are not enabled yet",
    "in-app and dry-run only",
    "/api/student/messaging/preferences",
    "CHANNEL_OPTIONS",
    "PURPOSE_OPTIONS",
    "Save preferences",
    "No verified external contact route is available"
  ],
  "Student UI exposes a reachable consent/preferences card with no-send and contact-unavailable copy."
);

assertIncludesAll(
  studentHome,
  [
    "StudentMessagingPreferencesCard",
    "<StudentMessagingPreferencesCard />"
  ],
  "Student home includes a reachable Reminder preferences entry point."
);

assertExcludesAll(
  studentCard,
  [
    "phone",
    "email address",
    "WhatsApp number",
    "message body",
    "provider payload",
    "vault ref",
    "token"
  ],
  "Student preference UI does not collect or render contact details, message bodies, provider payloads, or secrets."
);

assertIncludesAll(
  adminPanel,
  [
    "Stage 23C messaging readiness",
    "suppression safety",
    "Preference summaries",
    "Suppressions",
    "No contact route",
    "latestSuppressions",
    "maskedStudentRef",
    "Suppression reason is support-safe only"
  ],
  "Super Admin panel shows preference/suppression-safe counts and masked suppression status only."
);

assertIncludesAll(
  adminOverviewRoute,
  [
    "requireSuperAdmin(request)",
    "getAdminMessagingOverview(actor)"
  ],
  "Admin messaging overview remains Super Admin-only."
);

assertIncludesAll(
  contract,
  [
    "MESSAGING_ENABLED",
    "MESSAGING_DRY_RUN",
    "MESSAGING_EMAIL_ENABLED",
    "MESSAGING_WHATSAPP_ENABLED",
    "MESSAGING_SMS_ENABLED",
    "externalSendAvailable: false",
    "External email, WhatsApp, and SMS sends remain disabled"
  ],
  "Messaging provider contract remains gated and external sends remain unavailable."
);

assertIncludesAll(
  rules,
  [
    "match /workspaces/{workspaceId}/students/{studentId}/messaging_preferences/{documentId}",
    "match /workspaces/{workspaceId}/messaging_preference_summaries/{documentId}",
    "match /workspaces/{workspaceId}/messaging_suppressions/{documentId}",
    "match /messaging_suppressions/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct browser access to messaging preferences, summaries, and suppressions."
);

assertIncludesAll(
  plan + manualBacklog + promptSummary,
  [
    "Stage 23C",
    "TH-2026-08-22-STAGE23C-MESSAGING-PREFERENCES-SUPPRESSION-HANDOFF"
  ],
  "Docs include Stage 23C handoff reference."
);

console.log("Stage 23C messaging preferences, consent, and suppression QA passed.");
