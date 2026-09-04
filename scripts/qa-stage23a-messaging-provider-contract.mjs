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

function assertExistsAll(paths, message) {
  const missing = paths.filter((entry) => !exists(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
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
const envExample = read(".env.example");
const rules = read("firestore.rules");
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

const types = read("src/types/messaging.ts");
const contract = read("src/lib/messaging/messaging-provider-contract.ts");
const repository = read("src/lib/messaging/message-intent-repository.ts");
const adminRoute = read("src/app/api/admin/messaging/overview/route.ts");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const adminPanel = read("src/components/admin/messaging-readiness-panel.tsx");

const stage20dQa = read("scripts/qa-stage20d-ops-support-final-acceptance.mjs");
const stage19iQa = read("scripts/qa-stage19i-course-mvp-final-acceptance.mjs");
const stage18xQa = read("scripts/qa-stage18x-practice-mvp-final-acceptance.mjs");
const stage21dQa = read("scripts/qa-stage21d-manual-journal-final-acceptance.mjs");
const stage22bQa = read("scripts/qa-stage22b-forex-cfd-real-history-adapter.mjs");

assert(
  packageJson.scripts?.["stage23a:qa"] === "node scripts/qa-stage23a-messaging-provider-contract.mjs",
  "package.json exposes npm run stage23a:qa."
);

assertExistsAll(
  [
    "src/types/messaging.ts",
    "src/lib/messaging/messaging-provider-contract.ts",
    "src/lib/messaging/message-intent-repository.ts",
    "src/app/api/admin/messaging/overview/route.ts",
    "src/components/admin/messaging-readiness-panel.tsx"
  ],
  "Stage 23A messaging contract, repository, API, and Super Admin preview files exist."
);

assertIncludesAll(
  envExample,
  [
    "MESSAGING_ENABLED=false",
    "MESSAGING_DRY_RUN=true",
    "MESSAGING_EMAIL_ENABLED=false",
    "MESSAGING_WHATSAPP_ENABLED=false",
    "MESSAGING_SMS_ENABLED=false",
    "MESSAGING_PROVIDER=disabled",
    "MESSAGING_VAULT_READY=false",
    "MESSAGING_SECRET_MANAGER_PROJECT_ID=",
    "MESSAGING_SECRET_NAME="
  ],
  ".env.example keeps external messaging disabled, dry-run, and vault-blocked by default."
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
    "MESSAGING_SECRET_MANAGER_PROJECT_ID",
    "MESSAGING_SECRET_NAME",
    "vaultConfigured",
    "vault_config_missing",
    "externalSendAvailable: false",
    "stage23b_send_unavailable",
    "assertExternalMessagingSendUnavailable"
  ],
  "Messaging provider contract is server-only and fail-closed with no Stage 23A external send capability."
);

assertIncludesAll(
  types,
  [
    "MessagingChannel",
    "\"email\"",
    "\"whatsapp\"",
    "\"sms\"",
    "MessagingIntentPurpose",
    "\"assignment_reminder\"",
    "\"feedback_published\"",
    "\"resubmission_due\"",
    "\"course_reminder\"",
    "\"billing_access_issue_reminder\"",
    "MessageIntentRecord",
    "maskedStudentRef",
    "safeReason",
    "sourceSafeRef",
    "AdminMessagingOverviewResponse"
  ],
  "Messaging types model future channels and support-safe intent metadata."
);

const intentRecord = sourceSlice(types, "export interface MessageIntentRecord", "export interface MessageIntentSeedInput");
assertExcludesAll(
  intentRecord,
  [
    "studentId",
    "emailAddress",
    "phoneNumber",
    "messageBody",
    "body:",
    "providerPayload",
    "vaultRef",
    "token",
    "accountId",
    "paystackReference",
    "solanaSignature",
    "raw"
  ],
  "Stored MessageIntentRecord excludes raw student/contact/provider/payment/private fields."
);

assertIncludesAll(
  repository,
  [
    "import \"server-only\";",
    "createHash(\"sha256\")",
    "createMessagingSafeRef(studentId, \"student\")",
    "sourceSafeRef: input.sourceRef ? createMessagingSafeRef(input.sourceRef, \"source\") : undefined",
    "sanitizeText(input.safeReason)",
    "SAFE_REASON_MAX_LENGTH = 180",
    "status === \"blocked\" ? readiness.failClosedReason : safeReason",
    "workspaces/${workspaceId}/${MESSAGE_INTENT_COLLECTION_ID}",
    "collectionGroup(MESSAGE_INTENT_COLLECTION_ID)",
    "limit(MESSAGE_INTENT_OVERVIEW_LIMIT)",
    "createDryRunMessageIntentFromPracticeNotification",
    "purposeForPracticeNotification(input.notification.kind)",
    "sourceType: \"practice_notification\"",
    "sourceRef: input.notification.notificationId",
    "Message bodies and contact details stay out of browser responses"
  ],
  "Message intent repository hashes refs, sanitizes text, stores safe metadata only, and returns bounded Super Admin previews."
);

assertExcludesAll(
  repository,
  [
    "sendEmail",
    "sendSms",
    "sendWhatsApp",
    "Twilio(",
    "Resend(",
    "fetch(\"https://api.twilio.com",
    "fetch(\"https://graph.facebook.com",
    "fetch(\"https://api.resend.com",
    "messageBody:",
    "providerPayload:",
    "paystackReference:",
    "solanaSignature:",
    "vaultRef:",
    "brokerPassword:",
    "metaApiToken:"
  ],
  "Message intent repository contains no real provider send calls or raw sensitive fields."
);

assertIncludesAll(
  adminRoute,
  [
    "requireSuperAdmin(request)",
    "getAdminMessagingOverview(actor)",
    "apiJson(response)",
    "apiError(error)"
  ],
  "Messaging overview API is Super Admin-only."
);

assertIncludesAll(
  adminPanel + adminPage,
  [
    "MessagingReadinessPanel",
    "/api/admin/messaging/overview",
    "AdminMessagingOverviewResponse",
    "Stage 23B messaging readiness",
    "External reminders contract",
    "dry-run delivery attempts against placeholder adapters only",
    "does not expose contact",
    "Send disabled",
    "Latest safe intents"
  ],
  "Super Admin UI shows support-safe messaging readiness without contact details or provider payloads."
);

assertIncludesAll(
  rules,
  [
    "match /workspaces/{workspaceId}/message_intents/{documentId}",
    "match /workspaces/{workspaceId}/messaging_provider_status/{documentId}",
    "match /messaging_provider_status/{documentId}",
    "match /messaging_audit_events/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct browser access to messaging intents/provider/audit paths."
);

assertIncludesAll(
  plan + manualBacklog + promptSummary,
  [
    "Stage 23A",
    "External Messaging/Reminder Provider Contract And Gates",
    "TH-2026-08-22-STAGE23A-MESSAGING-PROVIDER-CONTRACT-HANDOFF",
    "No real email, SMS, or WhatsApp messages are sent"
  ],
  "Docs record Stage 23A handoff and no-send boundary."
);

const combinedMessagingSurface = [contract, repository, adminRoute, adminPanel, adminPage].join("\n");
assertExcludesAll(
  combinedMessagingSurface,
  [
    "from \"resend\"",
    "from \"twilio\"",
    "@sendgrid",
    "nodemailer",
    "mailgun",
    "whatsapp-web",
    "MESSAGING_PROVIDER_WEBHOOK_SECRET",
    "unsubscribeToken",
    "publicUnsubscribe"
  ],
  "Stage 23A adds no paid messaging provider packages, webhook secrets, or public unsubscribe flow."
);

assertIncludesAll(
  stage18xQa + stage19iQa + stage20dQa + stage21dQa + stage22bQa,
  [
    "stage18x",
    "stage19i",
    "stage20d",
    "stage21d",
    "stage22b"
  ],
  "Frozen Practice, Course, Ops, Manual Journal, and Forex/CFD history QA scripts remain present for regression coverage."
);

console.log("Stage 23A messaging provider contract QA complete.");
