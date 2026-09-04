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
  const hits = forbidden.filter((entry) => source.includes(entry));
  assert(hits.length === 0, `${message}${hits.length ? ` Hits: ${hits.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const firestoreRules = read("firestore.rules");

const types = read("src/types/workspace-dashboard.ts");
const validation = read("src/lib/workspace/dashboard-validation.ts");
const mappers = read("src/lib/workspace/dashboard-mappers.ts");
const repository = read("src/lib/workspace/dashboard-repository.ts");
const studentsRoute = read("src/app/api/workspace/students/route.ts");
const supportRoutePath = "src/app/api/workspace/students/[studentId]/support/route.ts";
const supportRoute = read(supportRoutePath);
const workspacePage = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const studentCrm = read("src/components/workspace/student-management-section.tsx");

const crmSurface = [types, validation, mappers, repository, supportRoute, workspacePage, studentCrm].join("\n");

assert(
  packageJson.scripts?.["stage20b:qa"] === "node scripts/qa-stage20b-workspace-student-crm-lifecycle.mjs",
  "package.json exposes npm run stage20b:qa."
);

assert(exists(supportRoutePath), "Workspace student support mutation route exists.");

assertIncludesAll(
  types,
  [
    "WorkspaceStudentLifecycleStatus",
    "pending_onboarding",
    "payment_access_issue",
    "needs_support",
    "WorkspaceStudentSupportPatchPayload",
    "supportFollowUpNeeded",
    "supportNoteSummary",
    "WorkspaceStudentSupportMutationResponse"
  ],
  "Workspace student types include lifecycle and support action fields."
);

assertIncludesAll(
  validation,
  [
    "validateStudentSupportPatchPayload",
    "supportActions",
    "mark_support_follow_up",
    "clear_support_follow_up",
    "save_support_note",
    "update_operational_status",
    "sanitizeText(payload.supportNoteSummary, 280)",
    "Use plain text only"
  ],
  "Student support action validation is bounded and plain-text only."
);

assertIncludesAll(
  mappers,
  [
    "resolveWorkspaceStudentLifecycleStatus",
    "supportFollowUpNeeded",
    "payment_access_issue",
    "pending_onboarding",
    "supportUpdatedByRef"
  ],
  "Student mapper derives safe lifecycle and support summary fields."
);

assertIncludesAll(
  repository + supportRoute,
  [
    "requireInfluencer",
    "updateWorkspaceStudentSupportState",
    "validateStudentSupportPatchPayload",
    "workspaces/${actor.workspaceId}/students/${studentId}",
    "supportActorRef",
    "supportUpdatedByRef",
    "audit_log",
    "Notes are internal summaries and are not returned through student APIs"
  ],
  "Support actions are influencer-only, workspace-scoped, Admin SDK writes."
);

assertIncludesAll(
  repository,
  [
    "practiceStudentRef",
    "student.practiceStudentRef",
    "student.lifecycleStatus",
    "student.paymentRail"
  ],
  "Workspace CRM search includes safe support refs and lifecycle metadata."
);

assertIncludesAll(
  studentCrm,
  [
    "Lifecycle",
    "Support needed",
    "Course readiness",
    "Practice readiness",
    "Billing / access",
    "AutoCopy readiness",
    "Safe operational events",
    "Internal support note",
    "Mark follow-up",
    "Clear follow-up",
    "Operational status",
    "payment refs",
    "provider payloads",
    "credentials"
  ],
  "Student CRM renders lifecycle filters, safe detail summaries, and support actions."
);

assertIncludesAll(
  workspacePage,
  [
    "updateStudentSupportState",
    "/api/workspace/students/${encodeURIComponent(student.studentId)}/support",
    "WorkspaceStudentSupportMutationResponse",
    "Student CRM support state updated",
    "onSupportAction={updateStudentSupportState}"
  ],
  "Workspace page wires support mutations through the protected workspace API."
);

assertIncludesAll(
  firestoreRules,
  [
    "match /workspaces/{workspaceId}/students/{studentId} {",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct browser reads/writes to workspace student CRM records."
);

assertIncludesAll(
  plan,
  [
    "Stage 20B - Workspace Student CRM Lifecycle And Support Actions",
    "TH-2026-08-21-STAGE20B-WORKSPACE-STUDENT-CRM-LIFECYCLE-HANDOFF"
  ],
  "plan.md documents the Stage 20B handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 20B Workspace Student CRM Lifecycle And Support Actions",
    "Mark support follow-up needed.",
    "Confirm student cannot see workspace-only internal support note."
  ],
  "manual-test-backlog.md records deferred Stage 20B manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 20B - Workspace Student CRM Lifecycle And Support Actions",
    "TH-2026-08-21-STAGE20B-WORKSPACE-STUDENT-CRM-LIFECYCLE-HANDOFF",
    "npm run stage20b:qa"
  ],
  "prompt summary moves current stop to Stage 20B."
);

assertExcludesAll(
  crmSurface,
  [
    "refund",
    "payout",
    "withdrawal",
    "sendEmail",
    "sendSms",
    "whatsapp",
    "MetaApi",
    "binance.private",
    "bybit.private",
    "brokerPassword",
    "webhookPayload",
    "rawProviderPayload"
  ],
  "Stage 20B CRM lifecycle patch adds no forbidden payment, messaging, provider, or execution behavior."
);

assertIncludesAll(
  studentsRoute,
  ["requireInfluencer", "listWorkspaceStudents"],
  "Existing workspace student list remains influencer-gated."
);

console.log("Stage 20B workspace student CRM lifecycle QA passed.");
