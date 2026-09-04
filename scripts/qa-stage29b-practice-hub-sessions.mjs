import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, values, message) {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, values, message) {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

function sliceFrom(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0, `Found source marker: ${start}`);
  assert(endIndex > startIndex, `Found source marker after ${start}: ${end}`);
  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/practice.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const sessionRoute = read("src/app/api/student/practice/sessions/[sessionId]/route.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const studentFlows = read("tests/browser/helpers/student-flows.mjs");
const stage18l = read("scripts/qa-stage18l-practice-session-management.mjs");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const roadmap = read("complaint-resolution-roadmap.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage29b:qa"] === "node scripts/qa-stage29b-practice-hub-sessions.mjs",
  "package.json exposes npm run stage29b:qa."
);

assertIncludesAll(
  practiceClient,
  [
    "type PracticeHubView",
    'const [activeView, setActiveView] = useState<PracticeHubView>("hub")',
    "Backtesting Session",
    "Start a new session",
    "View and manage previous sessions",
    'data-testid="practice-hub"',
    'data-testid="practice-start-session"',
    'data-testid="practice-open-sessions"',
    "More practice tools",
    "Assigned practice",
    "Strategies",
    "Analytics",
    "Import/export",
    "Archived sessions"
  ],
  "Practice defaults to a focused two-choice hub with secondary navigation."
);

assertIncludesAll(
  practiceClient,
  [
    'activeView === "assigned"',
    'activeView === "strategies"',
    'activeView === "analytics"',
    'activeView === "transfer"',
    'activeView === "sessions"',
    'activeView === "create"'
  ],
  "Supporting Practice features render only in focused views instead of one default stack."
);

assertIncludesAll(
  practiceClient,
  [
    "Practice session dashboard",
    "sessionSearch",
    "sessionStatusFilter",
    "sessionAssetFilter",
    "sessionSymbolFilter",
    "sessionTimeframeFilter",
    "sessionChallengeFilter",
    "sessionRandomFilter",
    "sessionSort",
    "Load more sessions",
    "Open terminal",
    "Continue",
    "Open review",
    "Report",
    "Duplicate setup",
    "Archive",
    "Restore",
    "Session settings"
  ],
  "Sessions view preserves useful search, filters, sorting, load-more, details, and actions."
);

assertIncludesAll(
  practiceClient,
  [
    'data-testid="practice-session-settings-drawer"',
    'data-theme-surface="dark"',
    "bg-black shadow-2xl",
    'role="dialog"',
    'aria-modal="true"',
    "Loading session settings...",
    "Session settings are unavailable",
    "Session setup is read-only here",
    "cannot permanently delete it",
    'event.key !== "Escape"'
  ],
  "Session settings drawer is accessible, fail-safe, and keeps session history read-only."
);

assertExcludesAll(
  practiceClient,
  ["bg-[color:var(--background)]"],
  "Session settings and delete confirmation use real opaque surfaces instead of an undefined transparent background token."
);

assertIncludesAll(
  practiceClient,
  [
    'method: "DELETE"',
    "confirmationName: deleteConfirmationName",
    'data-testid="practice-delete-session-dialog"',
    "Enter ${deleteSessionName} to confirm",
    "Delete permanently",
    "Deleting session...",
    "Delete session",
    "This cannot be undone"
  ],
  "Permanent deletion requires an explicit name-confirmation dialog and visible progress states."
);

assertIncludesAll(
  types,
  [
    "export interface PracticeSessionDeleteResponse",
    "deleted: true",
    "safeMessage: string"
  ],
  "Practice deletion response returns only a safe success contract."
);

assertIncludesAll(
  sessionRoute,
  [
    "export async function DELETE",
    "requireStudent(request)",
    "deleteStudentPracticeSession(actor, context.params.sessionId, payload)"
  ],
  "Practice session DELETE route requires the signed-in student."
);

const deleteFlow = sliceFrom(
  repository,
  "export async function deleteStudentPracticeSession",
  "export async function createStudentPracticeOrder"
);

assertIncludesAll(
  deleteFlow,
  [
    "getPracticeSessionSnapshot(actor, sessionId)",
    "practice_session_delete_confirmation_invalid",
    "confirmationName !== expectedName",
    "session.assignmentId || session.assignmentSnapshot || feedbackSnapshot.exists",
    "practice_session_delete_protected",
    "Archive it instead",
    'status: "archived"',
    "session stays retryable until the final delete",
    "deletePracticeSessionOrdersAndLedger(actor, session.sessionId)",
    "practice_annotations",
    "practice_bookmarks",
    "practice_drawings",
    "await ref.delete()",
    "deleted: true"
  ],
  "Repository confirms ownership/name and protects assignment or reviewed sessions before bounded cleanup."
);

assertIncludesAll(
  repository,
  [
    "PRACTICE_SESSION_DELETE_BATCH_LIMIT = 400",
    "const ledgerReferences:",
    "const orderReferences:",
    "account_linked_trade_ledger/practice_backtest_${order.orderId}",
    "account_linked_trade_ledger/practice_backtest_${event.eventId}",
    ".limit(PRACTICE_SESSION_DELETE_BATCH_LIMIT)",
    "db.batch()"
  ],
  "Standalone session cleanup uses bounded batches and removes practice ledger records."
);

const orderCleanupFlow = sliceFrom(
  repository,
  "async function deletePracticeSessionOrdersAndLedger",
  "export async function deleteStudentPracticeSession"
);
const ledgerDeletionIndex = orderCleanupFlow.indexOf("ledgerReferences.slice");
const orderDeletionIndex = orderCleanupFlow.indexOf("orderReferences.slice");

assert(
  ledgerDeletionIndex >= 0 && orderDeletionIndex > ledgerDeletionIndex,
  "Session cleanup deletes derived ledger entries before source orders so interrupted cleanup stays retryable."
);

assertExcludesAll(
  deleteFlow,
  [
    "record.studentId",
    "record.workspaceId",
    "payload.studentId",
    "payload.workspaceId",
    "return session",
    "rawProviderPayload",
    "vaultRef",
    "brokerPassword",
    "metaApiToken",
    "submitOrder(",
    "postTrade("
  ],
  "Deletion neither trusts browser ownership fields nor returns private records or invokes execution/provider code."
);

assertIncludesAll(
  `${studentSpec}\n${studentFlows}`,
  [
    "practice hub, sessions drawer, seeded terminal, and report load safely",
    'getByTestId("practice-start-session")',
    'getByTestId("practice-open-sessions")',
    'getByText("Practice Notifications", { exact: true })).toHaveCount(0)',
    'getByText("Practice analytics", { exact: true })).toHaveCount(0)',
    'getByText("Export practice data", { exact: true })).toHaveCount(0)',
    "openPracticeSessions",
    'getByTestId("practice-session-settings-drawer")',
    'getByRole("button", { name: "Delete session" })).toBeDisabled()',
    "assertWrongRoleBlocked"
  ],
  "Student browser QA covers the focused hub, seeded session drawer, protected deletion, and role boundaries."
);

assertIncludesAll(
  stage18l,
  [
    "Session settings",
    "Duplicate setup",
    "Practice session dashboard"
  ],
  "Stage 18L compatibility QA reflects the focused session management wording."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "practice_instructor_feedback",
    "practice_drawings",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for Practice session-owned paths."
);

assertIncludesAll(
  `${plan}\n${backlog}\n${roadmap}\n${promptSummary}`,
  [
    "Stage 29B - Practice Hub And Sessions Navigation",
    "TH-2026-08-24-STAGE29B-PRACTICE-HUB-SESSIONS-HANDOFF",
    "Stage 29C",
    "pending"
  ],
  "Docs record Stage 29B source-QA posture and keep Stage 29C pending."
);

assertIncludesAll(
  backlog,
  [
    "Confirm only the two main Practice choices are emphasized.",
    "Open a session settings drawer.",
    "Delete a disposable standalone session",
    "Confirm assignment/review sessions cannot be improperly deleted.",
    "another student cannot access or delete the session"
  ],
  "Manual backlog records Stage 29B owner browser checks without claiming completion."
);

console.log("Stage 29B Practice hub and sessions navigation QA passed.");
