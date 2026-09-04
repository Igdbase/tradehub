"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { formatPracticeMoney } from "@/lib/practice/practice-instrument-specs";
import type {
  PracticeAssignmentReviewQueueFilter,
  PracticeAssetClass,
  PracticeCohortSummary,
  WorkspacePracticeAssignmentFeedbackCompletionSummary,
  WorkspacePracticeAssignmentFeedbackResponse,
  WorkspacePracticeAssignmentSummary,
  WorkspacePracticeAssignmentsResponse
} from "@/types/practice";
import type { WorkspaceStudentRecord } from "@/types/workspace-dashboard";

type AssignmentForm = {
  title: string;
  description: string;
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: string;
  dateStart: string;
  dateEnd: string;
  availabilityStartDate: string;
  randomStartEnabled: boolean;
  startingBalance: string;
  dueDate: string;
  closeDate: string;
  targetCohortIds: string[];
  status: "draft" | "active";
  challengeEnabled: boolean;
  challengeName: string;
  suggestedPlaybookName: string;
  suggestedPlaybookRules: string;
};

type CohortForm = {
  cohortId: string;
  name: string;
  description: string;
  studentRefs: string[];
  status: "active" | "archived";
};

type AssignmentScheduleFilters = {
  status: "all" | "active" | "draft" | "archived";
  cohortId: string;
  timing: "all" | "due_soon" | "overdue" | "closed";
};

type FeedbackForm = {
  feedbackTargetRef: string;
  setupQuality: string;
  riskManagement: string;
  executionDiscipline: string;
  reviewQuality: string;
  overallScore: string;
  feedbackNote: string;
  recommendedNextDrill: string;
  resubmissionReason: string;
  resubmissionDueDate: string;
  resubmissionRubricArea: string;
  status: "reviewed" | "not_reviewed";
  publicationStatus: "draft" | "published";
};

const inputClass =
  "focus-ring min-h-10 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

const defaultForm: AssignmentForm = {
  title: "",
  description: "",
  assetClass: "crypto",
  symbol: "BTCUSDT",
  timeframeMinutes: "60",
  dateStart: "",
  dateEnd: "",
  availabilityStartDate: "",
  randomStartEnabled: false,
  startingBalance: "1000",
  dueDate: "",
  closeDate: "",
  targetCohortIds: [],
  status: "draft",
  challengeEnabled: false,
  challengeName: "Practice challenge",
  suggestedPlaybookName: "",
  suggestedPlaybookRules: ""
};

const defaultCohortForm: CohortForm = {
  cohortId: "",
  name: "",
  description: "",
  studentRefs: [],
  status: "active"
};

const defaultScheduleFilters: AssignmentScheduleFilters = {
  status: "all",
  cohortId: "",
  timing: "all"
};

const defaultFeedbackForm: FeedbackForm = {
  feedbackTargetRef: "",
  setupQuality: "3",
  riskManagement: "3",
  executionDiscipline: "3",
  reviewQuality: "3",
  overallScore: "3",
  feedbackNote: "",
  recommendedNextDrill: "",
  resubmissionReason: "",
  resubmissionDueDate: "",
  resubmissionRubricArea: "",
  status: "reviewed",
  publicationStatus: "draft"
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function buildPayload(form: AssignmentForm) {
  return {
    title: form.title,
    description: form.description,
    assetClass: form.assetClass,
    symbol: form.symbol,
    timeframeMinutes: Number(form.timeframeMinutes),
    dateStart: form.dateStart ? `${form.dateStart}T00:00:00.000Z` : undefined,
    dateEnd: form.dateEnd ? `${form.dateEnd}T23:59:59.999Z` : undefined,
    randomStartEnabled: form.randomStartEnabled,
    startingBalance: form.startingBalance ? Number(form.startingBalance) : undefined,
    availabilityStartDate: form.availabilityStartDate ? `${form.availabilityStartDate}T00:00:00.000Z` : undefined,
    dueDate: form.dueDate ? `${form.dueDate}T23:59:59.999Z` : undefined,
    closeDate: form.closeDate ? `${form.closeDate}T23:59:59.999Z` : undefined,
    targetCohortIds: form.targetCohortIds,
    status: form.status,
    challenge: form.challengeEnabled ? {
      enabled: true,
      challengeName: form.challengeName,
      startingBalance: Number(form.startingBalance || 1000),
      profitTargetPercent: 10,
      maxDailyLossPercent: 5,
      maxTotalDrawdownPercent: 10,
      maxOpenSimulatedTrades: 3,
      maxTradesPerSession: 20
    } : undefined,
    suggestedPlaybook: form.suggestedPlaybookName ? {
      name: form.suggestedPlaybookName,
      setupRules: form.suggestedPlaybookRules
    } : undefined
  };
}

function buildCohortPayload(form: CohortForm) {
  return {
    cohortId: form.cohortId || undefined,
    name: form.name,
    description: form.description,
    studentRefs: form.studentRefs,
    status: form.status
  };
}

function scheduleState(assignment: WorkspacePracticeAssignmentSummary, now = Date.now()) {
  const dueTime = assignment.dueDate ? Date.parse(assignment.dueDate) : Number.NaN;
  const closeTime = assignment.closeDate ? Date.parse(assignment.closeDate) : Number.NaN;
  const dueSoonWindowMs = 1000 * 60 * 60 * 48;

  if (Number.isFinite(closeTime) && now > closeTime) {
    return "closed" as const;
  }

  if (Number.isFinite(dueTime) && now > dueTime) {
    return "overdue" as const;
  }

  if (Number.isFinite(dueTime) && dueTime - now <= dueSoonWindowMs) {
    return "due_soon" as const;
  }

  return "scheduled" as const;
}

function studentLabel(student: WorkspaceStudentRecord) {
  return `${student.displayName}${student.email ? ` · ${student.email}` : ""}`;
}

function AssignmentProgress({ assignment }: { assignment: WorkspacePracticeAssignmentSummary }) {
  return (
    <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--label)]">{assignment.title}</p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
            {assignment.symbol} · {assignment.assetClass} · {assignment.timeframeMinutes}m
            {assignment.targetCohorts.length ? ` · ${assignment.targetCohorts.map((cohort) => cohort.name).join(", ")}` : " · All students"}
            {assignment.availabilityStartDate ? ` · Opens ${new Date(assignment.availabilityStartDate).toLocaleDateString("en-NG")}` : ""}
            {assignment.dueDate ? ` · Due ${new Date(assignment.dueDate).toLocaleDateString("en-NG")}` : ""}
            {assignment.closeDate ? ` · Closes ${new Date(assignment.closeDate).toLocaleDateString("en-NG")}` : ""}
          </p>
        </div>
        <Badge tone={assignment.status === "active" ? "green" : assignment.status === "archived" ? "neutral" : "amber"}>
          {assignment.status}
        </Badge>
      </div>
      <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
        {assignment.description || "No extra instructions."}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Assigned" value={String(assignment.progress.assignedCount)} />
        <StatChip label="Started" value={String(assignment.progress.startedCount)} tone="amber" />
        <StatChip label="Completed" value={String(assignment.progress.completedCount)} tone="green" />
        <StatChip label="Overdue" value={String(assignment.progress.overdueCount)} tone="red" />
        <StatChip label="Reviewed" value={String(assignment.progress.reviewedCount)} tone="green" />
        <StatChip label="Resub req" value={String(assignment.progress.resubmissionRequestedCount)} tone="amber" />
        <StatChip label="Resub done" value={String(assignment.progress.resubmissionCompletedCount)} tone="green" />
        <StatChip label="Avg score" value={assignment.progress.averageRubricScore.toFixed(1)} tone="accent" />
        <StatChip label="Avg P&L" value={formatPracticeMoney(assignment.progress.averagePnl)} tone={assignment.progress.averagePnl >= 0 ? "green" : "red"} />
        <StatChip label="Avg R" value={assignment.progress.averageR.toFixed(2)} />
        <StatChip label="Pass" value={String(assignment.progress.challengePassed)} tone="green" />
        <StatChip label="Fail" value={String(assignment.progress.challengeFailed)} tone="red" />
        <StatChip label="In progress" value={String(assignment.progress.challengeInProgress)} tone="amber" />
      </div>
      {assignment.progress.maskedRecentCompletions.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Masked recent completions</p>
          {assignment.progress.maskedRecentCompletions.slice(0, 3).map((completion) => (
            <div key={completion.maskedSessionRef} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs">
              <span className="truncate text-[color:var(--label)]">{completion.maskedStudentId} · {completion.closedTrades} closed · Win {formatPercent(completion.winRate)}</span>
              <span className="text-[color:var(--label2)]">{formatPracticeMoney(completion.netPnl)} · {completion.averageR.toFixed(2)}R</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function feedbackPayload(form: FeedbackForm, action: "save_draft" | "publish") {
  return {
    feedbackTargetRef: form.feedbackTargetRef,
    action,
    publicationStatus: action === "publish" ? "published" : "draft",
    status: form.status,
    rubric: {
      setupQuality: Number(form.setupQuality),
      riskManagement: Number(form.riskManagement),
      executionDiscipline: Number(form.executionDiscipline),
      reviewQuality: Number(form.reviewQuality),
      overallScore: Number(form.overallScore)
    },
    feedbackNote: form.feedbackNote,
    recommendedNextDrill: form.recommendedNextDrill,
    resubmissionRequest: form.resubmissionReason.trim()
      ? {
          status: "requested",
          reason: form.resubmissionReason,
          dueDate: form.resubmissionDueDate ? `${form.resubmissionDueDate}T23:59:59.999Z` : undefined,
          rubricArea: form.resubmissionRubricArea || undefined
        }
      : undefined
  };
}

function CompletionSummary({ completion }: { completion: WorkspacePracticeAssignmentFeedbackCompletionSummary }) {
  return (
    <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[color:var(--label)]">
            {completion.assignmentTitle} · {completion.maskedStudentId}
          </p>
          <p className="mt-1 text-[color:var(--label2)]">
            {completion.symbol} · {completion.timeframeMinutes}m · {completion.closedTrades} closed · {formatPercent(completion.winRate)} win
          </p>
        </div>
        <Badge tone={completion.feedback?.status === "reviewed" ? "green" : "amber"}>
          {completion.feedback?.publicationStatus === "published" ? "Published" : completion.feedback ? "Draft" : "Needs review"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2 text-[color:var(--label2)]">
        <span>{formatPracticeMoney(completion.netPnl)}</span>
        <span>{completion.averageR.toFixed(2)}R</span>
        <span>{completion.challengeStatus ?? "no challenge"}</span>
        <span>{completion.queueStatus.replace(/_/g, " ")}</span>
        <span>Attempt {completion.attemptNumber}</span>
        <span>{completion.maskedSessionRef}</span>
      </div>
      {completion.feedback?.resubmissionRequest ? (
        <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)] px-3 py-2 leading-5 text-[color:var(--label2)]">
          Resubmission {completion.feedback.resubmissionRequest.status}: {completion.feedback.resubmissionRequest.reason}
        </p>
      ) : null}
      {completion.feedback ? (
        <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 leading-5 text-[color:var(--label2)]">
          Score {completion.feedback.rubric.overallScore}/5 · {completion.feedback.feedbackNote || "No written note yet."}
        </p>
      ) : null}
    </div>
  );
}

function formFromCompletion(completion: WorkspacePracticeAssignmentFeedbackCompletionSummary): FeedbackForm {
  return {
    feedbackTargetRef: completion.feedbackTargetRef,
    setupQuality: String(completion.feedback?.rubric.setupQuality ?? 3),
    riskManagement: String(completion.feedback?.rubric.riskManagement ?? 3),
    executionDiscipline: String(completion.feedback?.rubric.executionDiscipline ?? 3),
    reviewQuality: String(completion.feedback?.rubric.reviewQuality ?? 3),
    overallScore: String(completion.feedback?.rubric.overallScore ?? 3),
    feedbackNote: completion.feedback?.feedbackNote ?? "",
    recommendedNextDrill: completion.feedback?.recommendedNextDrill ?? "",
    resubmissionReason: completion.feedback?.resubmissionRequest?.reason ?? "",
    resubmissionDueDate: completion.feedback?.resubmissionRequest?.dueDate?.slice(0, 10) ?? "",
    resubmissionRubricArea: completion.feedback?.resubmissionRequest?.rubricArea ?? "",
    status: completion.feedback?.status ?? "reviewed",
    publicationStatus: completion.feedback?.publicationStatus ?? "draft"
  };
}

export function WorkspacePracticeAssignmentsSection({
  overview,
  students,
  feedbackOverview,
  feedbackFilters,
  loading,
  feedbackLoading,
  errorMessage,
  feedbackErrorMessage,
  onCreateAssignment,
  onArchiveAssignment,
  onSaveCohort,
  onSaveFeedback,
  onFeedbackFiltersChange,
  onRefresh,
  onRefreshFeedback
}: {
  overview: WorkspacePracticeAssignmentsResponse | null;
  students: WorkspaceStudentRecord[];
  feedbackOverview: WorkspacePracticeAssignmentFeedbackResponse | null;
  feedbackFilters: { queue: PracticeAssignmentReviewQueueFilter; assignmentId?: string };
  loading: boolean;
  feedbackLoading: boolean;
  errorMessage: string | null;
  feedbackErrorMessage: string | null;
  onCreateAssignment: (payload: ReturnType<typeof buildPayload>) => Promise<void>;
  onArchiveAssignment: (assignmentId: string) => Promise<void>;
  onSaveCohort: (payload: ReturnType<typeof buildCohortPayload>) => Promise<void>;
  onSaveFeedback: (payload: ReturnType<typeof feedbackPayload>) => Promise<void>;
  onFeedbackFiltersChange: (filters: { queue: PracticeAssignmentReviewQueueFilter; assignmentId?: string }) => void;
  onRefresh: () => void;
  onRefreshFeedback: () => void;
}) {
  const [form, setForm] = useState<AssignmentForm>(defaultForm);
  const [cohortForm, setCohortForm] = useState<CohortForm>(defaultCohortForm);
  const [rosterQuery, setRosterQuery] = useState("");
  const [scheduleFilters, setScheduleFilters] = useState<AssignmentScheduleFilters>(defaultScheduleFilters);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>(defaultFeedbackForm);

  const selectedCompletion = feedbackOverview?.completions.find((completion) => completion.feedbackTargetRef === feedbackForm.feedbackTargetRef);
  const studentByPracticeRef = new Map(students.map((student) => [student.practiceStudentRef, student]));
  const selectedStudents = cohortForm.studentRefs
    .map((studentRef) => studentByPracticeRef.get(studentRef))
    .filter((student): student is WorkspaceStudentRecord => Boolean(student));
  const unmatchedStudentRefs = cohortForm.studentRefs.filter((studentRef) => !studentByPracticeRef.has(studentRef));
  const rosterSearch = rosterQuery.trim().toLowerCase();
  const visibleRosterStudents = students
    .filter((student) =>
      !rosterSearch ||
      `${student.displayName} ${student.email ?? ""} ${student.tierLabel} ${student.status} ${student.practiceStudentRef}`.toLowerCase().includes(rosterSearch)
    )
    .slice(0, 12);
  const visibleAssignments = (overview?.assignments ?? []).filter((assignment) => {
    const timing = scheduleState(assignment);

    if (scheduleFilters.status !== "all" && assignment.status !== scheduleFilters.status) {
      return false;
    }

    if (scheduleFilters.cohortId && !assignment.targetCohortIds?.includes(scheduleFilters.cohortId)) {
      return false;
    }

    if (scheduleFilters.timing !== "all" && timing !== scheduleFilters.timing) {
      return false;
    }

    return true;
  });

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateAssignment(buildPayload(form));
    setForm(defaultForm);
  }

  async function submitCohort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveCohort(buildCohortPayload(cohortForm));
    setCohortForm(defaultCohortForm);
  }

  function selectCohortForEdit(cohort: PracticeCohortSummary) {
    setCohortForm({
      cohortId: cohort.cohortId,
      name: cohort.name,
      description: cohort.description ?? "",
      studentRefs: cohort.studentRefs,
      status: cohort.status
    });
  }

  function addStudentToCohort(studentRef: string) {
    setCohortForm((current) => ({
      ...current,
      studentRefs: current.studentRefs.includes(studentRef)
        ? current.studentRefs
        : [...current.studentRefs, studentRef]
    }));
  }

  function removeStudentFromCohort(studentRef: string) {
    setCohortForm((current) => ({
      ...current,
      studentRefs: current.studentRefs.filter((ref) => ref !== studentRef)
    }));
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveFeedback(feedbackPayload(feedbackForm, "save_draft"));
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">Practice Assignments</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">Workspace drills</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Create simulated practice tasks, schedule availability, and review aggregate progress. Workspace progress is aggregate only; student trades, notes, candles, and reflections stay private. Hidden candles stay private too.
          </p>
        </div>
        <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {errorMessage ? (
        <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Needs review" value={String(overview?.notificationCounts.needsReview ?? 0)} tone="amber" />
        <StatChip label="Overdue" value={String(overview?.notificationCounts.overdue ?? 0)} tone="red" />
        <StatChip label="Resub req" value={String(overview?.notificationCounts.resubmissionsRequested ?? 0)} tone="accent" />
        <StatChip label="Draft feedback" value={String(overview?.notificationCounts.feedbackDraftsNotPublished ?? 0)} tone="neutral" />
      </div>

      <div className="grid gap-4 rounded-[8px] border border-[color:var(--line)] p-3 xl:grid-cols-[0.9fr_1.1fr]">
        <form className="grid gap-3" onSubmit={submitCohort}>
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Practice cohorts</p>
            <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
              Group students for assignment targeting using opaque student refs only.
            </p>
          </div>
          <input className={inputClass} value={cohortForm.name} onChange={(event) => setCohortForm((current) => ({ ...current, name: event.target.value }))} placeholder="Cohort name" />
          <textarea className={inputClass} rows={2} value={cohortForm.description} onChange={(event) => setCohortForm((current) => ({ ...current, description: event.target.value }))} placeholder="Optional cohort description" />
          <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Selected members</p>
              <Badge tone={cohortForm.studentRefs.length ? "green" : "amber"}>{cohortForm.studentRefs.length} selected</Badge>
            </div>
            {selectedStudents.length || unmatchedStudentRefs.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <button
                    key={student.practiceStudentRef}
                    type="button"
                    className="focus-ring rounded-[999px] border border-[color:var(--line)] px-3 py-1 text-left text-xs font-semibold text-[color:var(--label)]"
                    onClick={() => removeStudentFromCohort(student.practiceStudentRef)}
                    title="Remove from cohort"
                  >
                    {student.displayName} · {student.status}
                  </button>
                ))}
                {unmatchedStudentRefs.map((studentRef) => (
                  <button
                    key={studentRef}
                    type="button"
                    className="focus-ring rounded-[999px] border border-[color:var(--line)] px-3 py-1 text-left text-xs font-semibold text-[color:var(--label2)]"
                    onClick={() => removeStudentFromCohort(studentRef)}
                    title="Remove saved ref"
                  >
                    Saved ref · {studentRef}
                  </button>
                ))}
              </div>
            ) : (
            <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">No members selected yet. Use the roster picker below, or leave assignments untargeted for all active students.</p>
            )}
          </div>
          <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
            <label className="grid gap-1 text-xs font-semibold text-[color:var(--label)]">
              Roster picker
              <input
                className={inputClass}
                value={rosterQuery}
                onChange={(event) => setRosterQuery(event.target.value)}
                placeholder="Search loaded students"
              />
            </label>
            {visibleRosterStudents.length ? (
              <div className="max-h-56 overflow-auto pr-1">
                <div className="grid gap-2">
                  {visibleRosterStudents.map((student) => {
                    const selected = cohortForm.studentRefs.includes(student.practiceStudentRef);

                    return (
                      <button
                        key={student.practiceStudentRef}
                        type="button"
                        className="focus-ring flex min-h-10 items-center justify-between gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-left"
                        onClick={() => selected ? removeStudentFromCohort(student.practiceStudentRef) : addStudentToCohort(student.practiceStudentRef)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-[color:var(--label)]">{studentLabel(student)}</span>
                          <span className="block truncate text-[11px] text-[color:var(--label2)]">{student.tierLabel} · {student.status} · {student.practiceStudentRef}</span>
                        </span>
                        <Badge tone={selected ? "green" : "neutral"}>{selected ? "Added" : "Add"}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">No loaded students match this search. The picker only uses students already visible to this workspace.</p>
            )}
          </div>
          <select className={inputClass} value={cohortForm.status} onChange={(event) => setCohortForm((current) => ({ ...current, status: event.target.value as CohortForm["status"] }))}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading || cohortForm.name.trim().length < 2}>
              {cohortForm.cohortId ? "Update cohort" : "Create cohort"}
            </Button>
            {cohortForm.cohortId ? (
              <Button type="button" variant="secondary" onClick={() => setCohortForm(defaultCohortForm)}>
                Clear
              </Button>
            ) : null}
          </div>
        </form>
        <div className="grid content-start gap-2">
          {overview?.cohorts.length ? overview.cohorts.map((cohort) => (
            <button
              key={cohort.cohortId}
              type="button"
              className="focus-ring grid gap-1 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-left"
              onClick={() => selectCohortForEdit(cohort)}
            >
              <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[color:var(--label)]">
                {cohort.name}
                <Badge tone={cohort.status === "active" ? "green" : "neutral"}>{cohort.status}</Badge>
              </span>
              <span className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                {cohort.studentRefs.length} member refs · {cohort.description || "No description"}
              </span>
            </button>
          )) : (
            <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
              No cohorts yet. Create a cohort for targeted drills, or leave assignment targeting empty for all active students.
            </p>
          )}
        </div>
      </div>

      <form className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3 xl:grid-cols-4" onSubmit={submitAssignment}>
        <input className={inputClass} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Assignment title" />
        <select className={inputClass} value={form.assetClass} onChange={(event) => setForm((current) => ({ ...current, assetClass: event.target.value as PracticeAssetClass, symbol: event.target.value === "crypto" ? "BTCUSDT" : "XAUUSD" }))}>
          <option value="crypto">Crypto</option>
          <option value="forex_cfd">Forex-CFD</option>
        </select>
        <input className={inputClass} value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) }))} placeholder="BTCUSDT" />
        <select className={inputClass} value={form.timeframeMinutes} onChange={(event) => setForm((current) => ({ ...current, timeframeMinutes: event.target.value }))}>
          <option value="15">M15</option>
          <option value="60">H1</option>
          <option value="240">H4</option>
          <option value="1440">D1</option>
        </select>
        <input className={inputClass} type="date" value={form.dateStart} onChange={(event) => setForm((current) => ({ ...current, dateStart: event.target.value }))} aria-label="Assignment date start" />
        <input className={inputClass} type="date" value={form.dateEnd} onChange={(event) => setForm((current) => ({ ...current, dateEnd: event.target.value }))} aria-label="Assignment date end" />
        <input className={inputClass} type="date" value={form.availabilityStartDate} onChange={(event) => setForm((current) => ({ ...current, availabilityStartDate: event.target.value }))} aria-label="Assignment availability start date" />
        <input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} aria-label="Assignment due date" />
        <input className={inputClass} type="date" value={form.closeDate} onChange={(event) => setForm((current) => ({ ...current, closeDate: event.target.value }))} aria-label="Assignment close date" />
        <input className={inputClass} inputMode="decimal" value={form.startingBalance} onChange={(event) => setForm((current) => ({ ...current, startingBalance: event.target.value }))} placeholder="Starting balance" />
        <input className={inputClass} value={form.suggestedPlaybookName} onChange={(event) => setForm((current) => ({ ...current, suggestedPlaybookName: event.target.value }))} placeholder="Suggested playbook name" />
        <input className={inputClass} value={form.suggestedPlaybookRules} onChange={(event) => setForm((current) => ({ ...current, suggestedPlaybookRules: event.target.value }))} placeholder="Suggested rules" />
        <select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AssignmentForm["status"] }))}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 rounded-[12px] border border-[color:var(--line)] px-3 py-2 text-sm font-semibold text-[color:var(--label)]">
          <input type="checkbox" checked={form.randomStartEnabled} onChange={(event) => setForm((current) => ({ ...current, randomStartEnabled: event.target.checked }))} />
          Random start
        </label>
        <label className="flex min-h-10 items-center gap-2 rounded-[12px] border border-[color:var(--line)] px-3 py-2 text-sm font-semibold text-[color:var(--label)]">
          <input type="checkbox" checked={form.challengeEnabled} onChange={(event) => setForm((current) => ({ ...current, challengeEnabled: event.target.checked }))} />
          Challenge
        </label>
        <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3 xl:col-span-2">
          <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Target cohorts</p>
          {overview?.cohorts.filter((cohort) => cohort.status === "active").length ? overview.cohorts.filter((cohort) => cohort.status === "active").map((cohort) => (
            <label key={cohort.cohortId} className="flex min-h-8 items-center gap-2 text-xs font-semibold text-[color:var(--label)]">
              <input
                type="checkbox"
                checked={form.targetCohortIds.includes(cohort.cohortId)}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  targetCohortIds: event.target.checked
                    ? [...current.targetCohortIds, cohort.cohortId]
                    : current.targetCohortIds.filter((id) => id !== cohort.cohortId)
                }))}
              />
              {cohort.name} · {cohort.studentRefs.length} refs
            </label>
          )) : (
            <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">No active cohorts. Leaving this empty targets all active students.</p>
          )}
        </div>
        <input className={inputClass} value={form.challengeName} onChange={(event) => setForm((current) => ({ ...current, challengeName: event.target.value }))} placeholder="Challenge name" />
        <textarea className={`${inputClass} xl:col-span-3`} rows={2} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Instructions for students" />
        <Button type="submit" disabled={loading || form.title.trim().length < 3}>Create assignment</Button>
      </form>

      <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Assignment calendar</p>
            <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
              Schedule view explains available, due soon, overdue but still open, closed, draft, and archived drill states using aggregate-safe progress only.
            </p>
          </div>
          <Badge tone={visibleAssignments.length ? "green" : "amber"}>{visibleAssignments.length} shown</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-[color:var(--label)]">
            Status
            <select className={inputClass} value={scheduleFilters.status} onChange={(event) => setScheduleFilters((current) => ({ ...current, status: event.target.value as AssignmentScheduleFilters["status"] }))}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[color:var(--label)]">
            Cohort
            <select className={inputClass} value={scheduleFilters.cohortId} onChange={(event) => setScheduleFilters((current) => ({ ...current, cohortId: event.target.value }))}>
              <option value="">All cohorts</option>
              {overview?.cohorts.map((cohort) => (
                <option key={cohort.cohortId} value={cohort.cohortId}>{cohort.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[color:var(--label)]">
            Timing
            <select className={inputClass} value={scheduleFilters.timing} onChange={(event) => setScheduleFilters((current) => ({ ...current, timing: event.target.value as AssignmentScheduleFilters["timing"] }))}>
              <option value="all">All timing</option>
              <option value="due_soon">Due soon</option>
              <option value="overdue">Overdue</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
      </div>

      {visibleAssignments.length ? (
        <div className="grid gap-3">
          {visibleAssignments.map((assignment) => (
            <div key={assignment.assignmentId} className="grid gap-2">
              <AssignmentProgress assignment={assignment} />
              {assignment.status !== "archived" ? (
                <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => onArchiveAssignment(assignment.assignmentId)}>
                  Archive assignment
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          No assignments match this schedule filter. Create a draft, activate a drill, or adjust filters to inspect available, due, overdue, and closed practice work.
        </p>
      )}

      <div className="grid gap-4 rounded-[8px] border border-[color:var(--line)] p-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Instructor feedback</p>
              <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                Review completed assignment summaries only. Raw trades, journal notes, candles, annotations, drawings, and reflections stay private; students see feedback only after it is published.
              </p>
            </div>
            <Button onClick={onRefreshFeedback} variant="secondary" size="sm" disabled={feedbackLoading}>
              {feedbackLoading ? "Refreshing..." : "Refresh feedback"}
            </Button>
          </div>
          {feedbackErrorMessage ? (
            <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--red)]">
              {feedbackErrorMessage}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className={inputClass}
              value={feedbackFilters.queue}
              onChange={(event) => onFeedbackFiltersChange({
                ...feedbackFilters,
                queue: event.target.value as PracticeAssignmentReviewQueueFilter
              })}
              aria-label="Review queue filter"
            >
              <option value="all">All review items</option>
              <option value="needs_review">Needs review</option>
              <option value="feedback_draft">Feedback draft</option>
              <option value="feedback_published">Feedback published</option>
              <option value="resubmission_requested">Resubmission requested</option>
              <option value="completed">Completed</option>
            </select>
            <select
              className={inputClass}
              value={feedbackFilters.assignmentId ?? ""}
              onChange={(event) => onFeedbackFiltersChange({
                ...feedbackFilters,
                assignmentId: event.target.value || undefined
              })}
              aria-label="Review assignment filter"
            >
              <option value="">All assignments</option>
              {overview?.assignments.map((assignment) => (
                <option key={assignment.assignmentId} value={assignment.assignmentId}>{assignment.title}</option>
              ))}
            </select>
          </div>
          {feedbackOverview?.completions.length ? (
            <div className="bounded-list-4 grid gap-2">
              {feedbackOverview.completions.slice(0, 8).map((completion) => (
                <button
                  key={completion.feedbackTargetRef}
                  type="button"
                  className={`focus-ring rounded-[8px] text-left ${feedbackForm.feedbackTargetRef === completion.feedbackTargetRef ? "outline outline-2 outline-[color:var(--accent)]" : ""}`}
                  onClick={() => setFeedbackForm(formFromCompletion(completion))}
                >
                  <CompletionSummary completion={completion} />
                </button>
              ))}
            </div>
          ) : (
            <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
              No completed assignment sessions are ready for feedback yet. Completed student attempts will appear here with masked refs and rubric-safe summaries only.
            </p>
          )}
        </div>

        <form className="grid content-start gap-3" onSubmit={submitFeedback}>
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">
              {selectedCompletion ? `Feedback for ${selectedCompletion.maskedStudentId}` : "Select a completed assignment"}
            </p>
            <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
              Scores are 1-5. Feedback attaches to the student&apos;s completed assignment session through a server-owned route.
            </p>
          </div>
          <select
            className={inputClass}
            value={feedbackForm.feedbackTargetRef}
            onChange={(event) => {
              const completion = feedbackOverview?.completions.find((entry) => entry.feedbackTargetRef === event.target.value);

              setFeedbackForm(completion ? formFromCompletion(completion) : defaultFeedbackForm);
            }}
          >
            <option value="">Choose completion</option>
            {feedbackOverview?.completions.map((completion) => (
              <option key={completion.feedbackTargetRef} value={completion.feedbackTargetRef}>
                {completion.assignmentTitle} · {completion.maskedStudentId} · {completion.symbol}
              </option>
            ))}
          </select>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["setupQuality", "Setup"],
              ["riskManagement", "Risk"],
              ["executionDiscipline", "Discipline"],
              ["reviewQuality", "Review"],
              ["overallScore", "Overall"]
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs font-semibold text-[color:var(--label)]">
                {label}
                <select
                  className={inputClass}
                  value={feedbackForm[key as keyof FeedbackForm]}
                  onChange={(event) => setFeedbackForm((current) => ({ ...current, [key]: event.target.value }))}
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <textarea
            className={inputClass}
            rows={4}
            value={feedbackForm.feedbackNote}
            onChange={(event) => setFeedbackForm((current) => ({ ...current, feedbackNote: event.target.value.slice(0, 900) }))}
            placeholder="Short instructor feedback note"
          />
          <input
            className={inputClass}
            value={feedbackForm.recommendedNextDrill}
            onChange={(event) => setFeedbackForm((current) => ({ ...current, recommendedNextDrill: event.target.value.slice(0, 160) }))}
            placeholder="Recommended next drill"
          />
          <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
            <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Resubmission request</p>
            <textarea
              className={inputClass}
              rows={2}
              value={feedbackForm.resubmissionReason}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, resubmissionReason: event.target.value.slice(0, 700) }))}
              placeholder="Optional safe reason for resubmission"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={inputClass}
                type="date"
                value={feedbackForm.resubmissionDueDate}
                onChange={(event) => setFeedbackForm((current) => ({ ...current, resubmissionDueDate: event.target.value }))}
                aria-label="Resubmission due date"
              />
              <select
                className={inputClass}
                value={feedbackForm.resubmissionRubricArea}
                onChange={(event) => setFeedbackForm((current) => ({ ...current, resubmissionRubricArea: event.target.value }))}
                aria-label="Rubric area to improve"
              >
                <option value="">Area to improve</option>
                <option value="setupQuality">Setup</option>
                <option value="riskManagement">Risk</option>
                <option value="executionDiscipline">Discipline</option>
                <option value="reviewQuality">Review</option>
                <option value="overallScore">Overall</option>
              </select>
            </div>
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-[12px] border border-[color:var(--line)] px-3 py-2 text-sm font-semibold text-[color:var(--label)]">
            <input
              type="checkbox"
              checked={feedbackForm.status === "reviewed"}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, status: event.target.checked ? "reviewed" : "not_reviewed" }))}
            />
            Mark reviewed
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={feedbackLoading || !feedbackForm.feedbackTargetRef}>
              Save draft
            </Button>
            <Button type="button" disabled={feedbackLoading || !feedbackForm.feedbackTargetRef} onClick={() => onSaveFeedback(feedbackPayload(feedbackForm, "publish"))}>
              Publish feedback
            </Button>
          </div>
        </form>
      </div>
    </GlassCard>
  );
}
