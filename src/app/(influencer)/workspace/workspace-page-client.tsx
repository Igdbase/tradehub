"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { CryptoExecutionOpsSection } from "@/components/workspace/crypto-execution-ops-section";
import { CourseVisibilitySection } from "@/components/workspace/course-visibility-section";
import { ExternalSignalPreviewSection } from "@/components/workspace/external-signal-preview-section";
import { SignalManagementSection } from "@/components/workspace/signal-management-section";
import { StudentManagementSection } from "@/components/workspace/student-management-section";
import { WorkspaceBillingPanel } from "@/components/workspace/workspace-billing-panel";
import { WorkspaceOverview } from "@/components/workspace/workspace-overview";
import { WorkspacePracticeAssignmentsSection } from "@/components/workspace/workspace-practice-assignments-section";
import { WorkspacePracticeInsightsSection } from "@/components/workspace/workspace-practice-insights-section";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { requestWorkspaceDashboardApi } from "@/lib/workspace/dashboard-api-client";
import type { WorkspaceCryptoExecutionOverviewResponse } from "@/types/crypto-execution";
import type { WorkspaceExternalSignalPreviewResponse } from "@/types/external-signal-ingestion";
import type { WorkspaceBillingOverviewResponse } from "@/types/payments";
import type {
  WorkspacePracticeInsightsFilters,
  WorkspacePracticeInsightsResponse,
  WorkspacePracticeAssignmentMutationResponse,
  WorkspacePracticeCohortMutationResponse,
  WorkspacePracticeAssignmentFeedbackMutationResponse,
  WorkspacePracticeAssignmentFeedbackResponse,
  PracticeAssignmentReviewQueueFilter,
  WorkspacePracticeAssignmentsResponse
} from "@/types/practice";
import type {
  WorkspaceCoursesResponse,
  WorkspaceDashboardResponse,
  WorkspaceSignalDraftPayload,
  WorkspaceSignalMutationResponse,
  WorkspaceSignalsResponse,
  WorkspaceSignalStatus,
  WorkspaceStudentRecord,
  WorkspaceStudentSupportMutationResponse,
  WorkspaceStudentSupportPatchPayload,
  WorkspaceStudentsResponse,
  WorkspaceStudentStatus
} from "@/types/workspace-dashboard";

function WorkspaceNotPrepared() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center py-10">
      <GlassCard className="space-y-6 p-6 sm:p-8">
        <p className="eyebrow">Workspace not prepared</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
          Your influencer claim is valid, but this workspace shell does not exist yet.
        </h1>
        <p className="text-sm leading-7 text-[color:var(--label2)]">
          Ask the owner to create the workspace shell from `/admin`, then refresh your session
          claims and reopen this dashboard.
        </p>
        <Button href="/workspace/onboarding" variant="primary">
          Check onboarding
        </Button>
      </GlassCard>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-[112rem]">
      <GlassCard className="space-y-3">
        <p className="eyebrow !text-[color:var(--label3)]">Influencer workspace</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          Loading workspace data through the verified API...
        </p>
      </GlassCard>
    </div>
  );
}

function buildStudentPath(status: WorkspaceStudentStatus | "all", query: string) {
  const params = new URLSearchParams({
    limit: "10",
    status
  });

  if (query.trim()) {
    params.set("q", query.trim());
  }

  return `/api/workspace/students?${params.toString()}`;
}

function buildSignalPath(status: WorkspaceSignalStatus | "all") {
  const params = new URLSearchParams({
    limit: "10",
    status
  });

  return `/api/workspace/signals?${params.toString()}`;
}

function buildPracticeInsightsPath(filters: WorkspacePracticeInsightsFilters) {
  const params = new URLSearchParams({
    status: filters.status
  });

  if (filters.symbol) {
    params.set("symbol", filters.symbol);
  }

  if (filters.timeframeMinutes) {
    params.set("timeframeMinutes", String(filters.timeframeMinutes));
  }

  if (filters.dateStart) {
    params.set("dateStart", filters.dateStart);
  }

  if (filters.dateEnd) {
    params.set("dateEnd", filters.dateEnd);
  }

  return `/api/workspace/practice/insights?${params.toString()}`;
}

function buildPracticeReviewQueuePath(filters: {
  queue: PracticeAssignmentReviewQueueFilter;
  assignmentId?: string;
}) {
  const params = new URLSearchParams({
    queue: filters.queue
  });

  if (filters.assignmentId) {
    params.set("assignmentId", filters.assignmentId);
  }

  return `/api/workspace/practice/assignments/feedback?${params.toString()}`;
}

function WorkspaceDashboard() {
  const [dashboard, setDashboard] = useState<WorkspaceDashboardResponse | null>(null);
  const [billingOverview, setBillingOverview] = useState<WorkspaceBillingOverviewResponse | null>(null);
  const [cryptoExecution, setCryptoExecution] = useState<WorkspaceCryptoExecutionOverviewResponse | null>(null);
  const [practiceInsights, setPracticeInsights] = useState<WorkspacePracticeInsightsResponse | null>(null);
  const [practiceAssignments, setPracticeAssignments] = useState<WorkspacePracticeAssignmentsResponse | null>(null);
  const [practiceAssignmentFeedback, setPracticeAssignmentFeedback] = useState<WorkspacePracticeAssignmentFeedbackResponse | null>(null);
  const [students, setStudents] = useState<WorkspaceStudentsResponse | null>(null);
  const [courses, setCourses] = useState<WorkspaceCoursesResponse | null>(null);
  const [signals, setSignals] = useState<WorkspaceSignalsResponse | null>(null);
  const [externalSignalPreview, setExternalSignalPreview] = useState<WorkspaceExternalSignalPreviewResponse | null>(null);
  const [practiceInsightsFilters, setPracticeInsightsFilters] = useState<WorkspacePracticeInsightsFilters>({ status: "all" });
  const [practiceReviewQueueFilters, setPracticeReviewQueueFilters] = useState<{ queue: PracticeAssignmentReviewQueueFilter; assignmentId?: string }>({ queue: "all" });
  const [studentStatus, setStudentStatus] = useState<WorkspaceStudentStatus | "all">("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [signalStatus, setSignalStatus] = useState<WorkspaceSignalStatus | "all">("all");
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingBilling, setIsLoadingBilling] = useState(true);
  const [isLoadingCryptoExecution, setIsLoadingCryptoExecution] = useState(true);
  const [isLoadingPracticeInsights, setIsLoadingPracticeInsights] = useState(true);
  const [isLoadingPracticeAssignments, setIsLoadingPracticeAssignments] = useState(true);
  const [isLoadingPracticeAssignmentFeedback, setIsLoadingPracticeAssignmentFeedback] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [isLoadingExternalSignalPreview, setIsLoadingExternalSignalPreview] = useState(true);
  const [isSavingSignal, setIsSavingSignal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cryptoExecutionErrorMessage, setCryptoExecutionErrorMessage] = useState<string | null>(null);
  const [practiceInsightsErrorMessage, setPracticeInsightsErrorMessage] = useState<string | null>(null);
  const [practiceAssignmentsErrorMessage, setPracticeAssignmentsErrorMessage] = useState<string | null>(null);
  const [practiceAssignmentFeedbackErrorMessage, setPracticeAssignmentFeedbackErrorMessage] = useState<string | null>(null);
  const [externalSignalPreviewErrorMessage, setExternalSignalPreviewErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoadingDashboard(true);
    setErrorMessage(null);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceDashboardResponse>(
        "/api/workspace/dashboard"
      );
      setDashboard(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load dashboard.");
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setIsLoadingStudents(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceStudentsResponse>(
        buildStudentPath(studentStatus, studentQuery)
      );
      setStudents(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load students.");
    } finally {
      setIsLoadingStudents(false);
    }
  }, [studentQuery, studentStatus]);

  const loadBillingOverview = useCallback(async () => {
    setIsLoadingBilling(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceBillingOverviewResponse>(
        "/api/workspace/billing/overview"
      );
      setBillingOverview(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load workspace billing."
      );
    } finally {
      setIsLoadingBilling(false);
    }
  }, []);

  const loadCryptoExecution = useCallback(async () => {
    setIsLoadingCryptoExecution(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceCryptoExecutionOverviewResponse>(
        "/api/workspace/crypto-execution/overview"
      );
      setCryptoExecution(response);
      setCryptoExecutionErrorMessage(null);
    } catch (error) {
      setCryptoExecution(null);
      setCryptoExecutionErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load crypto paper execution."
      );
    } finally {
      setIsLoadingCryptoExecution(false);
    }
  }, []);

  const loadPracticeInsights = useCallback(async () => {
    setIsLoadingPracticeInsights(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspacePracticeInsightsResponse>(
        buildPracticeInsightsPath(practiceInsightsFilters)
      );
      setPracticeInsights(response);
      setPracticeInsightsErrorMessage(null);
    } catch (error) {
      setPracticeInsights(null);
      setPracticeInsightsErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load workspace practice insights."
      );
    } finally {
      setIsLoadingPracticeInsights(false);
    }
  }, [practiceInsightsFilters]);

  const loadPracticeAssignments = useCallback(async () => {
    setIsLoadingPracticeAssignments(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspacePracticeAssignmentsResponse>(
        "/api/workspace/practice/assignments"
      );
      setPracticeAssignments(response);
      setPracticeAssignmentsErrorMessage(null);
    } catch (error) {
      setPracticeAssignments(null);
      setPracticeAssignmentsErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load workspace practice assignments."
      );
    } finally {
      setIsLoadingPracticeAssignments(false);
    }
  }, []);

  const loadPracticeAssignmentFeedback = useCallback(async () => {
    setIsLoadingPracticeAssignmentFeedback(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspacePracticeAssignmentFeedbackResponse>(
        buildPracticeReviewQueuePath(practiceReviewQueueFilters)
      );
      setPracticeAssignmentFeedback(response);
      setPracticeAssignmentFeedbackErrorMessage(null);
    } catch (error) {
      setPracticeAssignmentFeedback(null);
      setPracticeAssignmentFeedbackErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load assignment feedback."
      );
    } finally {
      setIsLoadingPracticeAssignmentFeedback(false);
    }
  }, [practiceReviewQueueFilters]);

  const loadCourses = useCallback(async () => {
    setIsLoadingCourses(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceCoursesResponse>(
        "/api/workspace/courses?limit=10"
      );
      setCourses(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load courses.");
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  const loadSignals = useCallback(async () => {
    setIsLoadingSignals(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceSignalsResponse>(
        buildSignalPath(signalStatus)
      );
      setSignals(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load signals.");
    } finally {
      setIsLoadingSignals(false);
    }
  }, [signalStatus]);

  const loadExternalSignalPreview = useCallback(async () => {
    setIsLoadingExternalSignalPreview(true);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceExternalSignalPreviewResponse>(
        "/api/workspace/signals/external-preview"
      );
      setExternalSignalPreview(response);
      setExternalSignalPreviewErrorMessage(null);
    } catch (error) {
      setExternalSignalPreview(null);
      setExternalSignalPreviewErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load external signal preview."
      );
    } finally {
      setIsLoadingExternalSignalPreview(false);
    }
  }, []);

  async function refreshAll() {
    setMessage(null);
    setErrorMessage(null);
    await Promise.all([
      loadDashboard(),
      loadBillingOverview(),
      loadCryptoExecution(),
      loadPracticeInsights(),
      loadPracticeAssignments(),
      loadPracticeAssignmentFeedback(),
      loadStudents(),
      loadCourses(),
      loadSignals(),
      loadExternalSignalPreview()
    ]);
  }

  useEffect(() => {
    void loadDashboard();
    void loadBillingOverview();
    void loadCryptoExecution();
    void loadPracticeInsights();
    void loadPracticeAssignments();
    void loadPracticeAssignmentFeedback();
    void loadCourses();
    void loadExternalSignalPreview();
  }, [loadBillingOverview, loadCourses, loadCryptoExecution, loadDashboard, loadExternalSignalPreview, loadPracticeAssignmentFeedback, loadPracticeAssignments, loadPracticeInsights]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  async function createSignal(payload: WorkspaceSignalDraftPayload) {
    setIsSavingSignal(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceSignalMutationResponse>(
        "/api/workspace/signals",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      setSignals((current) =>
        current
          ? {
              ...current,
              signals: [response.signal, ...current.signals].slice(0, current.pageInfo.limit)
            }
          : current
      );
      setMessage(
        response.cryptoRoutingSummary?.routed
          ? `Crypto signal published. Paper routing created ${response.cryptoRoutingSummary.intentCount} intent${response.cryptoRoutingSummary.intentCount === 1 ? "" : "s"} and blocked ${response.cryptoRoutingSummary.blockedCount} candidate${response.cryptoRoutingSummary.blockedCount === 1 ? "" : "s"}.`
          : response.signal.status === "published"
          ? "Signal marked published inside the workspace. No external delivery was triggered."
          : "Signal draft saved inside the workspace."
      );
      await Promise.all([
        loadDashboard(),
        loadCryptoExecution(),
        loadPracticeAssignments(),
        loadPracticeAssignmentFeedback(),
        loadPracticeInsights()
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save that signal.");
    } finally {
      setIsSavingSignal(false);
    }
  }

  async function updateStudentSupportState(
    student: WorkspaceStudentRecord,
    payload: WorkspaceStudentSupportPatchPayload
  ) {
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestWorkspaceDashboardApi<WorkspaceStudentSupportMutationResponse>(
        `/api/workspace/students/${encodeURIComponent(student.studentId)}/support`,
        {
          method: "PATCH",
          body: JSON.stringify(payload)
        }
      );

      setStudents((current) =>
        current
          ? {
              ...current,
              students: current.students.map((entry) =>
                entry.practiceStudentRef === response.student.practiceStudentRef ? response.student : entry
              )
            }
          : current
      );
      setMessage("Student CRM support state updated.");
      await Promise.all([loadDashboard(), loadBillingOverview()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that student support state.");
      throw error;
    }
  }

  async function createPracticeAssignment(payload: Record<string, unknown>) {
    setMessage(null);
    setErrorMessage(null);
    setIsLoadingPracticeAssignments(true);

    try {
      await requestWorkspaceDashboardApi<WorkspacePracticeAssignmentMutationResponse>(
        "/api/workspace/practice/assignments",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );
      setMessage("Practice assignment created.");
      await Promise.all([loadPracticeAssignments(), loadPracticeAssignmentFeedback(), loadPracticeInsights()]);
    } catch (error) {
      setPracticeAssignmentsErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not create that practice assignment."
      );
    } finally {
      setIsLoadingPracticeAssignments(false);
    }
  }

  async function archivePracticeAssignment(assignmentId: string) {
    setMessage(null);
    setErrorMessage(null);
    setIsLoadingPracticeAssignments(true);

    try {
      await requestWorkspaceDashboardApi<WorkspacePracticeAssignmentMutationResponse>(
        "/api/workspace/practice/assignments",
        {
          method: "PATCH",
          body: JSON.stringify({ assignmentId, action: "archive" })
        }
      );
      setMessage("Practice assignment archived.");
      await Promise.all([loadPracticeAssignments(), loadPracticeAssignmentFeedback(), loadPracticeInsights()]);
    } catch (error) {
      setPracticeAssignmentsErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not archive that practice assignment."
      );
    } finally {
      setIsLoadingPracticeAssignments(false);
    }
  }

  async function savePracticeCohort(payload: Record<string, unknown>) {
    setMessage(null);
    setErrorMessage(null);
    setIsLoadingPracticeAssignments(true);

    try {
      await requestWorkspaceDashboardApi<WorkspacePracticeCohortMutationResponse>(
        "/api/workspace/practice/cohorts",
        {
          method: payload.cohortId ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );
      setMessage(payload.cohortId ? "Practice cohort updated." : "Practice cohort created.");
      await loadPracticeAssignments();
    } catch (error) {
      setPracticeAssignmentsErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not save that practice cohort."
      );
    } finally {
      setIsLoadingPracticeAssignments(false);
    }
  }

  async function savePracticeAssignmentFeedback(payload: Record<string, unknown>) {
    setMessage(null);
    setErrorMessage(null);
    setIsLoadingPracticeAssignmentFeedback(true);

    try {
      await requestWorkspaceDashboardApi<WorkspacePracticeAssignmentFeedbackMutationResponse>(
        "/api/workspace/practice/assignments/feedback",
        {
          method: "PATCH",
          body: JSON.stringify(payload)
        }
      );
      setMessage("Practice assignment feedback saved.");
      await Promise.all([loadPracticeAssignmentFeedback(), loadPracticeAssignments()]);
    } catch (error) {
      setPracticeAssignmentFeedbackErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not save assignment feedback."
      );
    } finally {
      setIsLoadingPracticeAssignmentFeedback(false);
    }
  }

  if (isLoadingDashboard && !dashboard) {
    return <LoadingState />;
  }

  if (!dashboard) {
    return (
      <GlassCard className="mx-auto max-w-3xl space-y-4">
        <p className="eyebrow !text-[color:var(--red)]">Workspace API</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "TradeHub could not load the workspace dashboard."}
        </p>
        <Button onClick={loadDashboard} variant="primary">
          Try again
        </Button>
      </GlassCard>
    );
  }

  if (!dashboard.workspacePrepared || !dashboard.workspace || !dashboard.onboarding) {
    return <WorkspaceNotPrepared />;
  }

  return (
    <div className="mx-auto w-full max-w-[112rem] space-y-6">
      <WorkspaceOverview
        workspace={dashboard.workspace}
        onboarding={dashboard.onboarding}
        summary={dashboard.summary}
        warnings={dashboard.warnings}
        onRefresh={refreshAll}
        loading={
          isLoadingDashboard ||
          isLoadingBilling ||
          isLoadingCryptoExecution ||
          isLoadingPracticeInsights ||
          isLoadingPracticeAssignments ||
          isLoadingPracticeAssignmentFeedback ||
          isLoadingStudents ||
          isLoadingCourses ||
          isLoadingSignals ||
          isLoadingExternalSignalPreview
        }
      />

      <div aria-live="polite" className="space-y-3">
        {errorMessage ? (
          <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
            <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          </GlassCard>
        ) : null}
        {message ? (
          <GlassCard className="border-[color:color-mix(in_srgb,var(--green)_30%,transparent)]">
            <p className="text-sm leading-6 text-[color:var(--green)]">{message}</p>
          </GlassCard>
        ) : null}
      </div>

      <WorkspaceBillingPanel overview={billingOverview} loading={isLoadingBilling} />

      <CryptoExecutionOpsSection
        overview={cryptoExecution}
        loading={isLoadingCryptoExecution}
        errorMessage={cryptoExecutionErrorMessage}
        onRefresh={loadCryptoExecution}
      />

      <WorkspacePracticeInsightsSection
        insights={practiceInsights}
        loading={isLoadingPracticeInsights}
        errorMessage={practiceInsightsErrorMessage}
        filters={practiceInsightsFilters}
        onFiltersChange={setPracticeInsightsFilters}
        onRefresh={loadPracticeInsights}
      />

      <WorkspacePracticeAssignmentsSection
        overview={practiceAssignments}
        students={students?.students ?? []}
        feedbackOverview={practiceAssignmentFeedback}
        feedbackFilters={practiceReviewQueueFilters}
        loading={isLoadingPracticeAssignments}
        feedbackLoading={isLoadingPracticeAssignmentFeedback}
        errorMessage={practiceAssignmentsErrorMessage}
        feedbackErrorMessage={practiceAssignmentFeedbackErrorMessage}
        onCreateAssignment={createPracticeAssignment}
        onArchiveAssignment={archivePracticeAssignment}
        onSaveCohort={savePracticeCohort}
        onSaveFeedback={savePracticeAssignmentFeedback}
        onFeedbackFiltersChange={setPracticeReviewQueueFilters}
        onRefresh={loadPracticeAssignments}
        onRefreshFeedback={loadPracticeAssignmentFeedback}
      />

      <section className="grid gap-6 2xl:grid-cols-[minmax(680px,1.08fr)_minmax(520px,0.92fr)]">
        <StudentManagementSection
          students={students?.students ?? []}
          loading={isLoadingStudents}
          query={studentQuery}
          status={studentStatus}
          warnings={students?.warnings ?? []}
          onQueryChange={setStudentQuery}
          onStatusChange={setStudentStatus}
          onSupportAction={updateStudentSupportState}
          onRefresh={loadStudents}
        />
        <CourseVisibilitySection
          courses={courses?.courses ?? []}
          loading={isLoadingCourses}
          warnings={courses?.warnings ?? []}
          onRefresh={loadCourses}
        />
      </section>

      <SignalManagementSection
        signals={signals?.signals ?? []}
        cryptoExecution={cryptoExecution}
        loading={isLoadingSignals}
        saving={isSavingSignal}
        status={signalStatus}
        warnings={signals?.warnings ?? []}
        onStatusChange={setSignalStatus}
        onRefresh={loadSignals}
        onCreateSignal={createSignal}
      />

      <ExternalSignalPreviewSection
        preview={externalSignalPreview}
        loading={isLoadingExternalSignalPreview}
        errorMessage={externalSignalPreviewErrorMessage}
        onRefresh={loadExternalSignalPreview}
      />
    </div>
  );
}

export function WorkspacePageClient() {
  return (
    <RoleGate allowedRole="influencer" nextPath="/workspace">
      <WorkspaceDashboard />
    </RoleGate>
  );
}
