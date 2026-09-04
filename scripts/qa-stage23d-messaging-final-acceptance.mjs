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
const packageSource = read("package.json");
const rules = read("firestore.rules");
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const types = read("src/types/messaging.ts");
const contract = read("src/lib/messaging/messaging-provider-contract.ts");
const adapters = read("src/lib/messaging/messaging-provider-adapters.ts");
const repository = read("src/lib/messaging/message-intent-repository.ts");
const worker = read("src/lib/messaging/messaging-delivery-worker.ts");
const overviewRoute = read("src/app/api/admin/messaging/overview/route.ts");
const workerRoute = read("src/app/api/admin/messaging/worker/run/route.ts");
const studentPreferencesRoute = read("src/app/api/student/messaging/preferences/route.ts");
const adminPanel = read("src/components/admin/messaging-readiness-panel.tsx");
const studentPreferenceCard = read("src/components/student-app/student-messaging-preferences-card.tsx");
const studentHome = read("src/app/(student)/app/student-app-page-client.tsx");

[
  "scripts/qa-stage23a-messaging-provider-contract.mjs",
  "scripts/qa-stage23b-messaging-dry-run-worker.mjs",
  "scripts/qa-stage23c-messaging-preferences-suppression.mjs"
].forEach((relativePath) => assert(exists(relativePath), `${relativePath} remains present.`));

assert(
  packageJson.scripts?.["stage23d:qa"] === "node scripts/qa-stage23d-messaging-final-acceptance.mjs",
  "package.json exposes npm run stage23d:qa."
);

assertIncludesAll(
  packageJson.scripts ?? {},
  [],
  "package.json scripts object is readable."
);

assertIncludesAll(
  packageSource,
  [
    "\"stage23a:qa\"",
    "\"stage23b:qa\"",
    "\"stage23c:qa\"",
    "\"stage23d:qa\""
  ],
  "Stage 23A through Stage 23D QA scripts are wired."
);

assertIncludesAll(
  contract,
  [
    "import \"server-only\";",
    "MESSAGING_ENABLED",
    "MESSAGING_DRY_RUN",
    "MESSAGING_EMAIL_ENABLED",
    "MESSAGING_WHATSAPP_ENABLED",
    "MESSAGING_SMS_ENABLED",
    "MESSAGING_PROVIDER",
    "MESSAGING_VAULT_READY",
    "externalSendAvailable: false",
    "assertExternalMessagingSendUnavailable",
    "external_messaging_send_unavailable_stage23b"
  ],
  "Provider contract exists, is server-only, env-gated, and keeps external send unavailable."
);

assertIncludesAll(
  adapters,
  [
    "import \"server-only\";",
    "deliverEmailPlaceholder",
    "deliverWhatsAppPlaceholder",
    "deliverSmsPlaceholder",
    "deliverMessageWithPlaceholderAdapter",
    "if (!input.dryRun)",
    "assertExternalMessagingSendUnavailable()",
    "dry_run_processed"
  ],
  "Placeholder adapters exist and fail closed outside dry-run."
);

assertIncludesAll(
  worker,
  [
    "import \"server-only\";",
    "runMessagingDryRunDeliveryWorker",
    "MESSAGE_WORKER_MAX_INTENTS_PER_RUN = 10",
    "getMessagingProviderReadiness()",
    "!readiness.enabled || readiness.provider === \"disabled\"",
    "!readiness.dryRun",
    "messaging_worker_real_send_blocked",
    "evaluateMessagingIntentSafety",
    "safety.status === \"blocked\"",
    "deliverMessageWithPlaceholderAdapter",
    "createMessagingDeliveryAttempt",
    "updateMessageIntentAfterDeliveryAttempt"
  ],
  "Dry-run worker exists, is bounded, provider-gated, dry-run-only, and rechecks safety before placeholder delivery."
);

assertIncludesAll(
  repository,
  [
    "createDryRunMessageIntentFromReminderState",
    "createDryRunMessageIntentFromPracticeNotification",
    "evaluateMessagingIntentSafety",
    "MESSAGING_PREFERENCE_COLLECTION_ID = \"messaging_preferences\"",
    "MESSAGING_PREFERENCE_SUMMARY_COLLECTION_ID = \"messaging_preference_summaries\"",
    "MESSAGING_SUPPRESSION_COLLECTION_ID = \"messaging_suppressions\"",
    "DEFAULT_CONTACT_READINESS",
    "email: \"contact_unavailable\"",
    "DEFAULT_MESSAGING_PREFERENCES",
    "email: false",
    "student_channel_opted_out",
    "student_purpose_opted_out",
    "recipient_suppressed",
    "contact_unavailable",
    "contact_unverified",
    "provider_disabled",
    "dry_run_only",
    "getStudentMessagingPreferences",
    "updateStudentMessagingPreferences",
    "getAdminMessagingOverview"
  ],
  "Repository covers Stage 23A intents, Stage 23B worker records, and Stage 23C preference/suppression safety."
);

const intentType = sourceSlice(types, "export interface MessageIntentRecord", "export interface MessagingDeliveryAttemptRecord");
const attemptType = sourceSlice(types, "export interface MessagingDeliveryAttemptRecord", "export interface MessagingDeliveryWorkerRunResponse");
const preferenceType = sourceSlice(types, "export interface StudentMessagingPreferencesResponse", "export interface MessagingSuppressionRecord");
const suppressionType = sourceSlice(types, "export interface MessagingSuppressionRecord", "export interface AdminMessagingOverviewResponse");

[
  intentType,
  attemptType,
  preferenceType,
  suppressionType
].forEach((slice, index) => {
  assertExcludesAll(
    slice,
    [
      "phoneNumber",
      "emailAddress",
      "messageBody",
      "providerPayload",
      "token",
      "vaultRef",
      "paymentRef",
      "paystackReference",
      "solanaSignature",
      "rawStudentId",
      "rawSessionId",
      "answerKey",
      "hiddenCandle",
      "credential",
      "autoCopy"
    ],
    `Messaging browser-visible type slice ${index + 1} excludes contact details, bodies, provider data, raw IDs, secrets, and private internals.`
  );
});

assertIncludesAll(
  overviewRoute,
  [
    "requireSuperAdmin(request)",
    "getAdminMessagingOverview(actor)"
  ],
  "Super Admin messaging overview route remains Super Admin-only."
);

assertIncludesAll(
  workerRoute,
  [
    "requireSuperAdmin(request)",
    "runMessagingDryRunDeliveryWorker(actor, payload)"
  ],
  "Super Admin worker route remains Super Admin-only."
);

assertIncludesAll(
  studentPreferencesRoute,
  [
    "requireStudent(request)",
    "getStudentMessagingPreferences(actor)",
    "updateStudentMessagingPreferences(actor, payload)"
  ],
  "Student messaging preferences route remains signed-in-student protected."
);

assertIncludesAll(
  adminPanel,
  [
    "External reminders contract",
    "Run dry-run worker",
    "Preference summaries",
    "Suppressions",
    "No contact route",
    "latestSuppressions",
    "maskedStudentRef",
    "does not expose contact details",
    "message bodies",
    "provider payloads",
    "vault refs"
  ],
  "Super Admin UI remains support-safe and masked/status-only."
);

assertIncludesAll(
  studentPreferenceCard,
  [
    "Reminder preferences",
    "External email, WhatsApp, and SMS reminders are not enabled yet",
    "in-app and dry-run only",
    "No verified external contact route is available",
    "/api/student/messaging/preferences",
    "CHANNEL_OPTIONS",
    "PURPOSE_OPTIONS"
  ],
  "Dormant student preference component remains available for historical compatibility without collecting contact details."
);

assertExcludesAll(
  studentHome,
  [
    "StudentMessagingPreferencesCard",
    "Reminder preferences",
    "/api/student/messaging/preferences",
    "External email",
    "WhatsApp",
    "SMS",
    "dry-run"
  ],
  "Normal student home no longer exposes dormant reminder preferences or external messaging copy."
);

assertIncludesAll(
  rules,
  [
    "match /workspaces/{workspaceId}/message_intents/{documentId}",
    "match /workspaces/{workspaceId}/messaging_delivery_attempts/{documentId}",
    "match /workspaces/{workspaceId}/messaging_preference_summaries/{documentId}",
    "match /workspaces/{workspaceId}/messaging_suppressions/{documentId}",
    "match /messaging_suppressions/{documentId}",
    "match /workspaces/{workspaceId}/students/{studentId}/messaging_preferences/{documentId}",
    "match /workspaces/{workspaceId}/messaging_provider_status/{documentId}",
    "match /messaging_provider_status/{documentId}",
    "match /messaging_audit_events/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules keep messaging internals deny-by-default for browser access."
);

assertExcludesAll(
  contract + adapters + worker + repository + studentPreferenceCard + adminPanel + packageSource,
  [
    "new Twilio",
    "Twilio(",
    "Resend(",
    "SendGrid",
    "Mailgun",
    "Nodemailer",
    "sendEmail(",
    "sendSms(",
    "sendWhatsApp(",
    "whatsapp.cloud",
    "graph.facebook.com",
    "api.twilio.com",
    "api.resend.com",
    "smtp",
    "providerWebhook",
    "webhookSecret",
    "phoneNumber:",
    "emailAddress:",
    "messageBody:",
    "providerPayload:",
    "vaultRef:",
    "rawStudentId:",
    "rawSessionId:"
  ],
  "Messaging MVP source/package add no real provider SDKs, network sends, webhooks, contact fields, bodies, provider payloads, vault refs, or raw IDs."
);

assertIncludesAll(
  plan,
  [
    "Stage 23D - Messaging MVP Final Acceptance Freeze",
    "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF",
    "Stage 24A"
  ],
  "plan.md records Stage 23D final freeze and points next to Stage 24A."
);

assertIncludesAll(
  manualBacklog,
  [
    "Messaging Manual QA - Must Test Before Demo",
    "Messaging Manual QA - Nice To Test",
    "Messaging Manual QA - Later Regression",
    "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF"
  ],
  "manual-test-backlog.md organizes messaging manual QA and advances current reference to Stage 23D."
);

assertIncludesAll(
  promptSummary,
  [
    "messaging/reminders MVP is source-QA frozen",
    "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF",
    "Stage 24A external master-trader / Telegram signal ingestion"
  ],
  "prompt summary marks messaging frozen and recommends Stage 24A next."
);

console.log("Stage 23D messaging MVP final acceptance freeze QA passed.");
