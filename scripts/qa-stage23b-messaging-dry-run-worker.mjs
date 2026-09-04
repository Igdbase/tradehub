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
const rules = read("firestore.rules");
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const types = read("src/types/messaging.ts");
const contract = read("src/lib/messaging/messaging-provider-contract.ts");
const adapters = read("src/lib/messaging/messaging-provider-adapters.ts");
const worker = read("src/lib/messaging/messaging-delivery-worker.ts");
const repository = read("src/lib/messaging/message-intent-repository.ts");
const workerRoute = read("src/app/api/admin/messaging/worker/run/route.ts");
const overviewRoute = read("src/app/api/admin/messaging/overview/route.ts");
const adminPanel = read("src/components/admin/messaging-readiness-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");

const stage23aQa = read("scripts/qa-stage23a-messaging-provider-contract.mjs");
const stage22bQa = read("scripts/qa-stage22b-forex-cfd-real-history-adapter.mjs");
const stage20dQa = read("scripts/qa-stage20d-ops-support-final-acceptance.mjs");
const stage19iQa = read("scripts/qa-stage19i-course-mvp-final-acceptance.mjs");
const stage18xQa = read("scripts/qa-stage18x-practice-mvp-final-acceptance.mjs");
const stage21dQa = read("scripts/qa-stage21d-manual-journal-final-acceptance.mjs");

assert(
  packageJson.scripts?.["stage23b:qa"] === "node scripts/qa-stage23b-messaging-dry-run-worker.mjs",
  "package.json exposes npm run stage23b:qa."
);

assertExistsAll(
  [
    "src/lib/messaging/messaging-delivery-worker.ts",
    "src/lib/messaging/messaging-provider-adapters.ts",
    "src/app/api/admin/messaging/worker/run/route.ts",
    "src/app/api/admin/messaging/overview/route.ts",
    "src/components/admin/messaging-readiness-panel.tsx"
  ],
  "Stage 23B worker, placeholder adapters, route, and admin UI files exist."
);

assertIncludesAll(
  types,
  [
    "MessagingDeliveryAttemptRecord",
    "MessagingDeliveryWorkerRunResponse",
    "\"dry_run_processed\"",
    "\"sent_placeholder\"",
    "pendingIntentCount",
    "dryRunProcessedIntentCount",
    "sentPlaceholderIntentCount",
    "latestDeliveryAttempts",
    "maskedWorkspaceRef",
    "messageIntentRef"
  ],
  "Messaging types include dry-run processed statuses, safe delivery attempts, and admin counts."
);

const deliveryAttemptType = sourceSlice(types, "export interface MessagingDeliveryAttemptRecord", "export interface MessagingDeliveryWorkerRunResponse");
assertExcludesAll(
  deliveryAttemptType,
  [
    "studentId",
    "sessionId",
    "email",
    "phone",
    "messageBody",
    "body:",
    "providerPayload",
    "vaultRef",
    "token",
    "paymentRef",
    "paystackReference",
    "solanaSignature",
    "raw"
  ],
  "Delivery attempt type excludes raw identity, contact, payment, provider, and private message fields."
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
    "dry_run_processed",
    "dry_run_${input.channel}_placeholder_processed"
  ],
  "Provider adapter placeholders are server-only, dry-run only, and return safe simulated results."
);

assertExcludesAll(
  adapters,
  [
    "fetch(",
    "Twilio(",
    "Resend(",
    "sendEmail",
    "sendSms",
    "sendWhatsApp",
    "https://api.twilio.com",
    "https://graph.facebook.com",
    "https://api.resend.com",
    "providerPayload",
    "messageBody",
    "phoneNumber",
    "emailAddress"
  ],
  "Provider placeholders contain no network calls, paid SDK calls, message bodies, or contact fields."
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
    "listMessageIntentsForDryRunWorker(limit)",
    "isMessagingChannelEnabled(candidate.intent.channel)",
    "deliverMessageWithPlaceholderAdapter",
    "createMessagingDeliveryAttempt",
    "updateMessageIntentAfterDeliveryAttempt",
    "dry_run_processed",
    "channel_disabled",
    "messaging_placeholder_failed_closed"
  ],
  "Messaging worker is bounded, Super Admin callable, gate-aware, dry-run only, and updates safe attempts/statuses."
);

assertExcludesAll(
  worker,
  [
    "fetch(",
    "Twilio(",
    "Resend(",
    "sendEmail",
    "sendSms",
    "sendWhatsApp",
    "providerPayload",
    "messageBody",
    "phoneNumber",
    "emailAddress",
    "paystackReference",
    "solanaSignature",
    "vaultRef",
    "brokerPassword",
    "metaApiToken"
  ],
  "Messaging worker contains no real external provider calls or raw sensitive fields."
);

assertIncludesAll(
  repository,
  [
    "MESSAGE_DELIVERY_ATTEMPT_COLLECTION_ID = \"messaging_delivery_attempts\"",
    "MESSAGE_WORKER_BATCH_LIMIT = 10",
    "mapDeliveryAttempt",
    "listMessageIntentsForDryRunWorker",
    "isMessageIntentWorkerEligible",
    "status === \"dry_run_recorded\" || intent.status === \"queued\"",
    "createMessagingDeliveryAttempt",
    "maskedWorkspaceRef: createMessagingSafeRef(input.intent.workspaceId, \"ws\")",
    "messageIntentRef: createMessagingSafeRef(input.intent.messageIntentId, \"msg\")",
    "updateMessageIntentAfterDeliveryAttempt",
    "latestDeliveryAttempts",
    "dryRunProcessedAttemptCount",
    "sentPlaceholderAttemptCount"
  ],
  "Repository supports bounded worker reads, safe attempt writes, status updates, and expanded admin counts."
);

assertExcludesAll(
  repository,
  [
    "messageBody:",
    "providerPayload:",
    "phoneNumber:",
    "emailAddress:",
    "paystackReference:",
    "solanaSignature:",
    "vaultRef:",
    "brokerPassword:",
    "metaApiToken:"
  ],
  "Repository still excludes raw contact/provider/payment/credential fields."
);

assertIncludesAll(
  workerRoute,
  [
    "requireSuperAdmin(request)",
    "runMessagingDryRunDeliveryWorker(actor, payload)",
    "export async function POST",
    "apiJson(response)",
    "apiError(error)"
  ],
  "Messaging worker route is Super Admin-only POST."
);

assertIncludesAll(
  overviewRoute,
  [
    "requireSuperAdmin(request)",
    "getAdminMessagingOverview(actor)"
  ],
  "Messaging overview route remains Super Admin-only."
);

assertIncludesAll(
  adminPanel + adminPage,
  [
    "Run dry-run worker",
    "/api/admin/messaging/worker/run",
    "MessagingDeliveryWorkerRunResponse",
    "Latest safe delivery attempts",
    "dry-run placeholders only",
    "Processed",
    "Attempts",
    "does not expose contact"
  ],
  "Super Admin UI exposes dry-run worker action and safe delivery attempts only."
);

assertIncludesAll(
  rules,
  [
    "match /workspaces/{workspaceId}/message_intents/{documentId}",
    "match /workspaces/{workspaceId}/messaging_delivery_attempts/{documentId}",
    "match /workspaces/{workspaceId}/messaging_provider_status/{documentId}",
    "match /messaging_audit_events/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct browser access to messaging intents, attempts, provider, and audit paths."
);

assertIncludesAll(
  contract,
  [
    "externalSendAvailable: false",
    "stage23b_send_unavailable",
    "external_messaging_send_unavailable_stage23b",
    "Stage 23B supports server-only dry-run delivery attempts. External email, WhatsApp, and SMS sends remain disabled."
  ],
  "Messaging readiness remains fail-closed for real sends after Stage 23B."
);

assertIncludesAll(
  plan + manualBacklog + promptSummary,
  [
    "Stage 23B",
    "Messaging Dry-Run Delivery Worker And Provider Adapter Placeholders",
    "TH-2026-08-22-STAGE23B-MESSAGING-DRY-RUN-WORKER-HANDOFF",
    "No real email, SMS, or WhatsApp messages are sent"
  ],
  "Docs record Stage 23B handoff and no-send boundary."
);

assertExcludesAll(
  [types, contract, adapters, worker, repository, workerRoute, overviewRoute, adminPanel, adminPage].join("\n"),
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
  "Stage 23B adds no paid messaging packages, provider webhooks, public unsubscribe flow, or external send integrations."
);

assertIncludesAll(
  stage23aQa + stage22bQa + stage20dQa + stage19iQa + stage18xQa + stage21dQa,
  [
    "stage23a",
    "stage22b",
    "stage20d",
    "stage19i",
    "stage18x",
    "stage21d"
  ],
  "Required frozen-stage QA scripts remain present for regression coverage."
);

console.log("Stage 23B messaging dry-run worker QA complete.");
