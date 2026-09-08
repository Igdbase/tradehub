"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { CourseVisibilitySection } from "@/components/workspace/course-visibility-section";
import { ExternalSignalPreviewSection } from "@/components/workspace/external-signal-preview-section";
import { SignalManagementSection } from "@/components/workspace/signal-management-section";
import { StudentManagementSection } from "@/components/workspace/student-management-section";
import { WorkspaceBillingPanel } from "@/components/workspace/workspace-billing-panel";
import { WorkspaceEnterpriseIntegrationRequestsSection } from "@/components/workspace/workspace-enterprise-integration-requests-section";
import { WorkspaceOverview } from "@/components/workspace/workspace-overview";
import { WorkspacePracticeAssignmentsSection } from "@/components/workspace/workspace-practice-assignments-section";
import { WorkspacePracticeInsightsSection } from "@/components/workspace/workspace-practice-insights-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { cn } from "@/lib/utils";
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

export type WorkspaceView =
  | "home"
  | "students"
  | "signals"
  | "courses"
  | "practice"
  | "copier"
  | "billing"
  | "branding"
  | "enterprise";

const workspaceNavItems: Array<{ label: string; href: string; view: WorkspaceView; description: string }> = [
  { label: "Home", href: "/workspace", view: "home", description: "Summary and next actions" },
  { label: "Students", href: "/workspace/students", view: "students", description: "Student support and access" },
  { label: "Signals", href: "/workspace/signals", view: "signals", description: "Signal drafts and previews" },
  { label: "Courses", href: "/workspace/courses", view: "courses", description: "Visibility and authoring" },
  { label: "Practice", href: "/workspace/practice", view: "practice", description: "Assignments and insights" },
  { label: "Copier", href: "/workspace/copier", view: "copier", description: "Setup readiness" },
  { label: "Billing", href: "/workspace/billing", view: "billing", description: "Licence and payments" },
  { label: "Branding", href: "/workspace/branding", view: "branding", description: "Brand and domain state" },
  { label: "Enterprise", href: "/workspace/enterprise", view: "enterprise", description: "SLA and integrations" }
];

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
          Loading workspace data...
        </p>
      </GlassCard>
    </div>
  );
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatSeatCap(value: number | null) {
  return value === null ? "Custom" : String(value);
}

function statusTone(value?: string, dangerValues: string[] = [], warningValues: string[] = []) {
  if (value && dangerValues.includes(value)) {
    return "red" as const;
  }

  if (value && warningValues.includes(value)) {
    return "amber" as const;
  }

  return value ? "green" as const : "neutral" as const;
}

function WorkspaceNavigation({
  activeView,
  workspaceName
}: {
  activeView: WorkspaceView;
  workspaceName?: string;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    const activeLink = activeLinkRef.current;

    if (!nav || !activeLink) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const leftOverflow = linkRect.left - navRect.left;
    const rightOverflow = linkRect.right - navRect.right;

    if (leftOverflow < 0) {
      nav.scrollLeft += leftOverflow - 8;
      return;
    }

    if (rightOverflow > 0) {
      nav.scrollLeft += rightOverflow + 8;
    }
  }, [activeView]);

  return (
    <div className="space-y-4" data-testid="workspace-focused-navigation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Workspace</p>
          <h1 className="mt-2 break-safe text-2xl font-semibold text-[color:var(--label)] sm:text-3xl">
            {workspaceName ?? "TradeHub workspace"}
          </h1>
        </div>
        <Button href="/workspace/onboarding" variant="ghost" size="sm">
          Setup wizard
        </Button>
      </div>
      <nav
        ref={navRef}
        aria-label="Workspace sections"
        data-testid="workspace-focused-nav-scroll"
        className="no-scrollbar max-w-full overscroll-x-contain flex gap-2 overflow-x-auto rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] p-2"
      >
        {workspaceNavItems.map((item) => {
          const isActive = item.view === activeView;

          return (
            <Link
              key={item.view}
              ref={isActive ? activeLinkRef : undefined}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              data-testid={`workspace-nav-${item.view}`}
              className={cn(
                "focus-ring min-w-fit rounded-[16px] border px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent-bg)_72%,transparent)] text-[color:var(--label)]"
                  : "border-transparent text-[color:var(--label2)] hover:border-[color:var(--line)] hover:text-[color:var(--label)]"
              )}
              title={item.description}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function WorkspaceViewFrame({
  eyebrow,
  title,
  description,
  children,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="space-y-5" data-testid="workspace-active-view">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">{eyebrow}</p>
          <h2 className="mt-2 break-safe text-2xl font-semibold text-[color:var(--label)]">
            {title}
          </h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function WorkspacePackageStatusSection({ summary }: { summary: WorkspaceDashboardResponse["summary"] }) {
  const packageStatus = summary.packageStatus;
  const tone = packageStatus.overLimit
    ? "red"
    : statusTone(packageStatus.licenceHealth, ["blocked", "expired", "suspended"], ["custom_review", "needs_attention", "due_soon"]);

  return (
    <GlassCard className="space-y-4" data-testid="workspace-billing-package-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Workspace licence</p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            {packageStatus.packageName}
          </h3>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            {packageStatus.safeSummary} Pricing is handled by private quote/contact sales, and
            Trade Copier remains a separate optional add-on.
          </p>
        </div>
        <Badge tone={tone}>{packageStatus.overLimit ? "Over limit" : label(packageStatus.licenceHealth)}</Badge>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Active students" value={String(packageStatus.activeStudentCount)} tone="green" />
        <StatChip label="Seat cap" value={formatSeatCap(packageStatus.studentSeatCap)} tone={tone} />
        <StatChip label="Seats left" value={formatSeatCap(packageStatus.remainingSeats)} tone={tone} />
        <StatChip label="Support" value={label(packageStatus.supportStatus)} tone={tone} />
        <StatChip label="Renewal" value={label(packageStatus.maintenanceRenewalStatus)} tone={tone} />
      </div>
      <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
        {packageStatus.overLimit
          ? packageStatus.upgradePrompt
          : `${packageStatus.supportPrompt} ${packageStatus.maintenanceSummary} ${packageStatus.tradeCopierAddOnLabel}`}
      </p>
    </GlassCard>
  );
}

function WorkspaceBrandingStatusSection({ summary }: { summary: WorkspaceDashboardResponse["summary"] }) {
  const branding = summary.brandingReadiness;
  const tone = statusTone(
    branding.customDomainStatus,
    ["blocked"],
    ["requested", "dns_pending", "verifying", "custom_review"]
  );

  return (
    <GlassCard className="space-y-4" data-testid="workspace-branding-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Workspace brand</p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            {branding.displayName}
          </h3>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            {branding.packageAvailabilityMessage} Logo and domain changes stay reviewed by TradeHub.
          </p>
        </div>
        <Badge tone={tone}>{label(branding.brandingMode)}</Badge>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Mode" value={label(branding.brandingMode)} tone="accent" />
        <StatChip label="Student view" value={label(branding.studentFacingBrandVisibilityStatus)} tone="green" />
        <StatChip label="Logo" value={branding.logoUrl ? "Ready" : "Not set"} tone={branding.logoUrl ? "green" : "neutral"} />
        <StatChip label="Domain" value={label(branding.customDomainStatus)} tone={tone} />
        <StatChip label="Checklist" value={label(branding.dnsChecklistStatus)} tone={tone} />
      </div>
      <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
        {branding.contactPrompt}
      </p>
    </GlassCard>
  );
}

function WorkspaceEnterpriseStatusSection({ summary }: { summary: WorkspaceDashboardResponse["summary"] }) {
  const enterprise = summary.enterpriseReadiness;
  const tone = statusTone(
    enterprise.deploymentStatus,
    ["blocked"],
    ["requested", "scoping", "security_review", "ready_for_contract", "custom_review"]
  );

  return (
    <GlassCard className="space-y-4" data-testid="workspace-enterprise-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Enterprise readiness</p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Deployment and SLA scope
          </h3>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            {enterprise.packageAvailabilityMessage} Enterprise deployment, data residency, support,
            backup, and rollback terms are contract-scoped.
          </p>
        </div>
        <Badge tone={tone}>{label(enterprise.deploymentStatus)}</Badge>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Mode" value={label(enterprise.deploymentMode)} tone="accent" />
        <StatChip label="SLA" value={label(enterprise.slaStatus)} tone={tone} />
        <StatChip label="Backup" value={label(enterprise.backupRestoreStatus)} tone={tone} />
        <StatChip label="Residency" value={label(enterprise.dataResidencyStatus)} tone="neutral" />
      </div>
      <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
        {enterprise.contractScopePrompt}
      </p>
    </GlassCard>
  );
}

function WorkspaceCopierFocusedSection({
  overview,
  loading,
  errorMessage,
  onRefresh
}: {
  overview: WorkspaceCryptoExecutionOverviewResponse | null;
  loading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
}) {
  if (!overview) {
    return (
      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow !text-[color:var(--label3)]">Trade Copier</p>
            <h3 className="mt-2 text-xl font-semibold text-[color:var(--label)]">Setup readiness</h3>
          </div>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </Button>
        </div>
        <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "Trade Copier readiness has not loaded yet."}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-4" data-testid="workspace-copier-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Trade Copier</p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--label)]">Workspace setup readiness</h3>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Student setup remains gated by subscription, account connection, consent, risk limits, and workspace controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={overview.workspaceControl.killSwitchEnabled ? "red" : "green"}>
            {overview.workspaceControl.killSwitchEnabled ? "Workspace paused" : "Workspace active"}
          </Badge>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <StatChip label="Verified crypto setup" value={String(overview.summary.connectionCounts.verified)} tone="green" />
        <StatChip label="Ready for paper" value={String(overview.summary.readinessCounts.paper_ready)} tone="amber" />
        <StatChip label="Forex setup requests" value={String(overview.summary.forexProvisioning?.requests.length ?? 0)} tone="accent" />
        <StatChip label="Needs attention" value={String(overview.summary.recentFailureCount)} tone={overview.summary.recentFailureCount > 0 ? "red" : "green"} />
      </div>
      {overview.warnings.length > 0 ? (
        <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {overview.warnings.length} setup note{overview.warnings.length === 1 ? "" : "s"} need review in
          this workspace. Student controls remain gated by their own setup and consent.
        </p>
      ) : null}
    </GlassCard>
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

function WorkspaceDashboard({ activeView }: { activeView: WorkspaceView }) {
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

  async function refreshActiveView() {
    setMessage(null);
    setErrorMessage(null);

    if (activeView === "students") {
      await Promise.all([loadDashboard(), loadStudents()]);
      return;
    }

    if (activeView === "signals") {
      await Promise.all([loadDashboard(), loadSignals(), loadExternalSignalPreview(), loadCryptoExecution()]);
      return;
    }

    if (activeView === "courses") {
      await Promise.all([loadDashboard(), loadCourses()]);
      return;
    }

    if (activeView === "practice") {
      await Promise.all([
        loadDashboard(),
        loadPracticeInsights(),
        loadPracticeAssignments(),
        loadPracticeAssignmentFeedback(),
        loadStudents()
      ]);
      return;
    }

    if (activeView === "copier") {
      await Promise.all([loadDashboard(), loadCryptoExecution()]);
      return;
    }

    if (activeView === "billing") {
      await Promise.all([loadDashboard(), loadBillingOverview()]);
      return;
    }

    if (activeView === "enterprise") {
      await loadDashboard();
      return;
    }

    await loadDashboard();
  }

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeView === "students") {
      void loadStudents();
    }
  }, [activeView, loadStudents]);

  useEffect(() => {
    if (activeView === "signals") {
      void loadSignals();
      void loadExternalSignalPreview();
      void loadCryptoExecution();
    }
  }, [activeView, loadCryptoExecution, loadExternalSignalPreview, loadSignals]);

  useEffect(() => {
    if (activeView === "courses") {
      void loadCourses();
    }
  }, [activeView, loadCourses]);

  useEffect(() => {
    if (activeView === "practice") {
      void loadPracticeInsights();
      void loadPracticeAssignments();
      void loadPracticeAssignmentFeedback();
      void loadStudents();
    }
  }, [activeView, loadPracticeAssignmentFeedback, loadPracticeAssignments, loadPracticeInsights, loadStudents]);

  useEffect(() => {
    if (activeView === "copier") {
      void loadCryptoExecution();
    }
  }, [activeView, loadCryptoExecution]);

  useEffect(() => {
    if (activeView === "billing") {
      void loadBillingOverview();
    }
  }, [activeView, loadBillingOverview]);

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
      await Promise.all([loadDashboard(), loadSignals(), loadExternalSignalPreview(), loadCryptoExecution()]);
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
      await Promise.all([loadDashboard(), loadStudents()]);
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
        <p className="eyebrow !text-[color:var(--red)]">Workspace unavailable</p>
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

  const activeContent = (() => {
    if (activeView === "students") {
      return (
        <WorkspaceViewFrame
          eyebrow="Students"
          title="Student management"
          description="Review workspace students, access posture, progress summaries, and support follow-up without exposing private student records."
          actions={
            <Button onClick={refreshActiveView} variant="secondary" size="sm" disabled={isLoadingStudents}>
              {isLoadingStudents ? "Refreshing..." : "Refresh"}
            </Button>
          }
        >
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
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "signals") {
      return (
        <WorkspaceViewFrame
          eyebrow="Signals"
          title="Signal management"
          description="Create direct TradeHub signals, review drafts, and publish approved Telegram previews through the existing protected flow."
          actions={
            <Button onClick={refreshActiveView} variant="secondary" size="sm" disabled={isLoadingSignals || isLoadingExternalSignalPreview}>
              {isLoadingSignals || isLoadingExternalSignalPreview ? "Refreshing..." : "Refresh"}
            </Button>
          }
        >
          <div className="space-y-6">
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
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "courses") {
      return (
        <WorkspaceViewFrame
          eyebrow="Courses"
          title="Course visibility"
          description="Review which courses are visible to students and open the Course Hub when you need to author or edit lessons."
          actions={
            <>
              <Button href="/workspace/courses/hub" variant="primary" size="sm">
                Open Course Hub
              </Button>
              <Button onClick={loadCourses} variant="secondary" size="sm" disabled={isLoadingCourses}>
                {isLoadingCourses ? "Refreshing..." : "Refresh"}
              </Button>
            </>
          }
        >
          <CourseVisibilitySection
            courses={courses?.courses ?? []}
            loading={isLoadingCourses}
            warnings={courses?.warnings ?? []}
            onRefresh={loadCourses}
          />
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "practice") {
      return (
        <WorkspaceViewFrame
          eyebrow="Practice"
          title="Practice insights and assignments"
          description="See aggregate practice participation, manage drills, review cohorts, and handle feedback without opening private student journals."
          actions={
            <Button onClick={refreshActiveView} variant="secondary" size="sm" disabled={isLoadingPracticeInsights || isLoadingPracticeAssignments}>
              {isLoadingPracticeInsights || isLoadingPracticeAssignments ? "Refreshing..." : "Refresh"}
            </Button>
          }
        >
          <div className="space-y-6">
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
          </div>
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "copier") {
      return (
        <WorkspaceViewFrame
          eyebrow="Copier"
          title="Trade Copier readiness"
          description="Review workspace-level student setup readiness. Student billing, consent, risk, and connection checks remain separate per account."
        >
          <WorkspaceCopierFocusedSection
            overview={cryptoExecution}
            loading={isLoadingCryptoExecution}
            errorMessage={cryptoExecutionErrorMessage}
            onRefresh={loadCryptoExecution}
          />
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "billing") {
      return (
        <WorkspaceViewFrame
          eyebrow="Billing"
          title="Licence and billing status"
          description="Review package capacity, support status, checkout readiness, and verified workspace revenue without changing payment rails."
        >
          <div className="space-y-6">
            <WorkspacePackageStatusSection summary={dashboard.summary} />
            <WorkspaceBillingPanel overview={billingOverview} loading={isLoadingBilling} />
          </div>
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "branding") {
      return (
        <WorkspaceViewFrame
          eyebrow="Branding"
          title="Brand and domain readiness"
          description="Review workspace display, logo, and domain readiness. TradeHub still reviews brand and domain changes before they appear to students."
        >
          <WorkspaceBrandingStatusSection summary={dashboard.summary} />
        </WorkspaceViewFrame>
      );
    }

    if (activeView === "enterprise") {
      return (
        <WorkspaceViewFrame
          eyebrow="Enterprise"
          title="Deployment, SLA, and integrations"
          description="Review Enterprise readiness and submit contract-scoped integration requests when this workspace is eligible."
        >
          <div className="space-y-6">
            <WorkspaceEnterpriseStatusSection summary={dashboard.summary} />
            <WorkspaceEnterpriseIntegrationRequestsSection packageStatus={dashboard.summary.packageStatus} />
          </div>
        </WorkspaceViewFrame>
      );
    }

    return (
      <WorkspaceOverview
        workspace={dashboard.workspace}
        onboarding={dashboard.onboarding}
        summary={dashboard.summary}
        warnings={dashboard.warnings}
        onRefresh={refreshActiveView}
        loading={isLoadingDashboard}
      />
    );
  })();

  return (
    <div className="mx-auto w-full max-w-[112rem] space-y-6">
      <WorkspaceNavigation activeView={activeView} workspaceName={dashboard.workspace.name} />

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

      {activeContent}
    </div>
  );
}

export function WorkspacePageClient({ activeView = "home" }: { activeView?: WorkspaceView }) {
  return (
    <RoleGate allowedRole="influencer" nextPath="/workspace">
      <WorkspaceDashboard activeView={activeView} />
    </RoleGate>
  );
}
