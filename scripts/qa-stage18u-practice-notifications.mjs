import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
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

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `Found ${start}.`);
  assert(endIndex > startIndex, `Found ${end} after ${start}.`);

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const notificationRoute = read("src/app/api/student/practice/notifications/route.ts");
const studentPracticeClient = read("src/components/student-app/student-practice-client.tsx");
const assignmentSection = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const rules = read("firestore.rules");

const notificationTypes = sliceBetween(
  practiceTypes,
  "export type PracticeNotificationKind",
  "export interface StudentPracticeAssignmentStartResponse"
);
const notificationRepository = sliceBetween(
  practiceRepo,
  "function notificationIdFor",
  "export async function startStudentPracticeAssignment"
);
const stage18uModules = [
  practiceTypes,
  practiceRepo,
  notificationRoute,
  studentPracticeClient,
  assignmentSection,
  rules
].join("\n");

assert(
  packageJson.scripts?.["stage18u:qa"] === "node scripts/qa-stage18u-practice-notifications.mjs",
  "package.json exposes npm run stage18u:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18U - In-App Practice Notifications And Task Reminders",
    "Practice Notifications / Task Alerts",
    "read/dismiss state",
    "workspace aggregate notification counts",
    "Do not add email, SMS, WhatsApp, push"
  ],
  "plan.md documents Stage 18U notification/reminder scope."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18U In-App Practice Notifications And Task Reminders",
    "Student sees available assignment alert.",
    "Student sees feedback published alert only after feedback is published.",
    "Student marks alert read and dismisses an alert.",
    "Workspace sees aggregate notification counts only"
  ],
  "manual-test-backlog.md records Stage 18U manual QA."
);

assertIncludesAll(
  notificationTypes,
  [
    "PracticeNotificationKind",
    "assignment_available",
    "assignment_due_soon",
    "assignment_overdue",
    "assignment_closed",
    "feedback_published",
    "resubmission_requested",
    "resubmission_due_soon",
    "resubmission_overdue",
    "StudentPracticeNotificationSummary",
    "StudentPracticeNotificationsResponse",
    "StudentPracticeNotificationMutationResponse",
    "WorkspacePracticeAssignmentNotificationCounts"
  ],
  "Practice types define student notifications and workspace aggregate notification counts."
);

assertIncludesAll(
  notificationRepository,
  [
    "deriveStudentPracticeNotifications",
    "getStudentPracticeNotifications",
    "updateStudentPracticeNotificationState",
    "practice_notification_state/current",
    "dismiss_all",
    "read_all",
    "dismiss",
    "read",
    "STUDENT_PRACTICE_NOTIFICATION_LIMIT",
    "No raw session IDs, student IDs, trades, journal entries, candles"
  ],
  "Practice repository derives bounded student alerts and stores read/dismiss state server-side."
);

assert(
  !notificationRepository.includes("actionHref:") &&
    !notificationRepository.includes("sessionId:") &&
    !notificationRepository.includes("studentId:") &&
    !notificationRepository.includes("practice_orders") &&
    !notificationRepository.includes("practice_annotations") &&
    !notificationRepository.includes("journal_activity"),
  "Notification payload derivation avoids raw session IDs, student IDs, orders, annotations, and journal internals."
);

assertIncludesAll(
  practiceRepo,
  [
    "buildWorkspaceAssignmentNotificationCounts",
    "needsReview",
    "overdue",
    "resubmissionsRequested",
    "feedbackDraftsNotPublished",
    "notificationCounts"
  ],
  "Workspace assignment response includes aggregate notification counts only."
);

assertIncludesAll(
  notificationRoute,
  [
    "requireStudent(request)",
    "getStudentPracticeNotifications",
    "updateStudentPracticeNotificationState",
    "request.json()"
  ],
  "Practice notification route is signed-in student protected for GET and PATCH."
);

assertIncludesAll(
  studentPracticeClient,
  [
    "Practice Notifications",
    "/api/student/practice/notifications",
    "Mark all read",
    "Mark read",
    "Dismiss",
    "Start assignment",
    "Continue session",
    "View feedback",
    "Start resubmission"
  ],
  "Student practice UI renders in-app alerts with safe actions and read/dismiss controls."
);

assertIncludesAll(
  assignmentSection,
  [
    "notificationCounts.needsReview",
    "notificationCounts.overdue",
    "notificationCounts.resubmissionsRequested",
    "notificationCounts.feedbackDraftsNotPublished"
  ],
  "Workspace assignments UI renders aggregate notification counts only."
);

assertIncludesAll(
  rules,
  [
    "practice_notification_state",
    "allow read, write: if false"
  ],
  "Firestore browser rules deny direct practice notification state access."
);

const dangerousPatterns = [
  "sendEmail",
  "sendSms",
  "twilio",
  "whatsapp",
  "pushSubscription",
  "Notification.requestPermission",
  "binance-adapter",
  "bybit-adapter",
  "metaapi-adapter",
  "submitOrder(",
  "placeOrder(",
  "loadForexMetaApiToken",
  "brokerPassword:",
  "metaApiToken:",
  "vaultRef:",
  "rawProviderPayload:",
  "uploadBytes(",
  "pdfkit",
  "puppeteer"
];
const dangerousHits = dangerousPatterns.filter((pattern) => stage18uModules.includes(pattern));

assert(
  dangerousHits.length === 0,
  `Stage 18U does not add forbidden messaging, execution/provider/credential, upload, screenshot, PDF, or paid-service surfaces.${dangerousHits.length ? ` Hits: ${dangerousHits.join(", ")}` : ""}`
);

console.log("Stage 18U in-app practice notifications and task reminders QA passed.");
