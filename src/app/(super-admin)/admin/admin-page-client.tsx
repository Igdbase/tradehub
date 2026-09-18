"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { AdminSourceBanner } from "@/components/admin/admin-source-banner";
import { AdminStatGrid } from "@/components/admin/admin-stat-grid";
import { AdminSupportOverview } from "@/components/admin/admin-support-overview";
import { ApplicationDetailPanel } from "@/components/admin/application-detail-panel";
import { ApplicationPipeline } from "@/components/admin/application-pipeline";
import { AuditLogPreview } from "@/components/admin/audit-log-preview";
import { CryptoExecutionOpsPanel } from "@/components/admin/crypto-execution-ops-panel";
import { ExternalSignalIngestionPanel } from "@/components/admin/external-signal-ingestion-panel";
import { MessagingReadinessPanel } from "@/components/admin/messaging-readiness-panel";
import { PaymentRailOverview } from "@/components/admin/payment-rail-overview";
import { PaymentSupportQueue } from "@/components/admin/payment-support-queue";
import { PaystackPaymentOps } from "@/components/admin/paystack-payment-ops";
import { SolanaSettlementLedger } from "@/components/admin/solana-settlement-ledger";
import { TrustSafetyPanel } from "@/components/admin/trust-safety-panel";
import { WorkspaceBrandingDomainPanel } from "@/components/admin/workspace-branding-domain-panel";
import { WorkspaceEnterpriseIntegrationsPanel } from "@/components/admin/workspace-enterprise-integrations-panel";
import { WorkspaceEnterpriseReadinessPanel } from "@/components/admin/workspace-enterprise-readiness-panel";
import { WorkspacePackageOverviewPanel } from "@/components/admin/workspace-package-overview-panel";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { requestAdminApi } from "@/lib/admin/admin-api-client";
import type {
  AdminCryptoExecutionOverviewResponse,
  CryptoLiveCohortRolloutWorkerRunResponse,
  CryptoExecutionWorkerRunResponse,
  ForexDemoCancelResponse,
  ForexLiveCanaryWorkerRunResponse,
  ForexDemoReconciliationRunResponse,
  ForexDemoWorkerRunResponse,
  ForexPaperWorkerRunResponse,
  LiveProductionReconciliationRunResponse,
  LiveProductionWorkerRunResponse,
  LiveSandboxReconciliationRunResponse,
  LiveSandboxWorkerRunResponse,
  WorkspaceCryptoExecutionOverviewResponse
} from "@/types/crypto-execution";
import type {
  AdminApplicationListResponse,
  AdminApplicationPatch,
  AdminApplicationUpdateResponse,
  AdminAuditLogResponse,
  AdminOverviewResponse
} from "@/types/admin-api";
import type { AdminWorkspaceCreateResponse } from "@/types/onboarding";
import type {
  AdminPaystackReconcileResponse,
  AdminPaymentsOverviewResponse,
  AdminSolanaSettlementUpdateResponse,
  SolanaSettlementPatchPayload
} from "@/types/payments";
import type { AdminMessagingOverviewResponse, MessagingDeliveryWorkerRunResponse } from "@/types/messaging";
import type { ExternalSignalIngestionOverviewResponse } from "@/types/external-signal-ingestion";
import type { ApplicationSource, ApplicationStatus, WorkspaceApplication } from "@/types/tradehub";
import { getWorkspaceHandleSuggestion, getWorkspaceIdSuggestion } from "@/lib/admin/admin-labels";
import { cn } from "@/lib/utils";

export type AdminView =
  | "overview"
  | "workspaces"
  | "licences"
  | "payments"
  | "integrations"
  | "execution-safety"
  | "audit";

const adminNavItems: Array<{ label: string; href: string; view: AdminView; description: string }> = [
  { label: "Overview", href: "/admin", view: "overview", description: "Attention summary and next actions" },
  { label: "Workspaces", href: "/admin/workspaces", view: "workspaces", description: "Applications and workspace shells" },
  { label: "Licences", href: "/admin/licences", view: "licences", description: "Packages and licence operations" },
  { label: "Payments", href: "/admin/payments", view: "payments", description: "Payment support and settlement review" },
  { label: "Integrations", href: "/admin/integrations", view: "integrations", description: "Branding, Enterprise, and signal intake" },
  { label: "Execution Safety", href: "/admin/execution-safety", view: "execution-safety", description: "AutoCopy gates and runbooks" },
  { label: "Audit", href: "/admin/audit", view: "audit", description: "Trust, safety, and audit trail" }
];

const adminViewCopy: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Super Admin",
    title: "Control room overview",
    description: "High-level platform attention items, demo-source status, and safe next actions."
  },
  workspaces: {
    eyebrow: "Super Admin",
    title: "Workspaces",
    description: "Review applications and create workspace shells without loading unrelated operations panels."
  },
  licences: {
    eyebrow: "Super Admin",
    title: "Package licences",
    description: "Review package, support, and maintenance posture with private quote and metadata-only boundaries."
  },
  payments: {
    eyebrow: "Super Admin",
    title: "Payments",
    description: "Review payment rails, support queues, and settlement posture without automating money movement."
  },
  integrations: {
    eyebrow: "Super Admin",
    title: "Integrations",
    description: "Review branding, Enterprise readiness, and approved signal-ingestion setup without exposing raw provider data."
  },
  "execution-safety": {
    eyebrow: "Super Admin",
    title: "Execution safety",
    description: "Isolated AutoCopy readiness, canary, reconciliation, incident, and rollback controls."
  },
  audit: {
    eyebrow: "Super Admin",
    title: "Audit",
    description: "Masked audit, trust, safety, and risk summaries for operator review."
  }
};

function buildApplicationsPath(filters: {
  status: ApplicationStatus | "all";
  source: ApplicationSource | "all";
  market: WorkspaceApplication["market"] | "all";
  solana: "all" | "interested" | "not_interested";
  query: string;
}) {
  const params = new URLSearchParams({
    limit: "25",
    status: filters.status,
    source: filters.source,
    market: filters.market,
    solana: filters.solana
  });

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  return `/api/admin/applications?${params.toString()}`;
}

function AdminNavigation({ activeView }: { activeView: AdminView }) {
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
    <nav
      ref={navRef}
      aria-label="Super Admin sections"
      data-testid="admin-focused-nav-scroll"
      className="no-scrollbar flex max-w-full gap-2 overflow-x-auto overscroll-x-contain rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] p-2"
    >
      {adminNavItems.map((item) => {
        const isActive = item.view === activeView;

        return (
          <Link
            key={item.view}
            ref={isActive ? activeLinkRef : undefined}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            data-testid={`admin-nav-${item.view}`}
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
  );
}

function AdminViewFrame({
  activeView,
  isLoading,
  onRefresh,
  children
}: {
  activeView: AdminView;
  isLoading: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const copy = adminViewCopy[activeView];

  return (
    <div className="space-y-6" data-testid="admin-focused-shell">
      <section className="space-y-5 rounded-[24px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-4xl">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="mt-3 break-safe text-3xl font-semibold text-[color:var(--label)] sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 break-safe text-sm leading-6 text-[color:var(--label2)]">
              {copy.description}
            </p>
          </div>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh view"}
          </Button>
        </div>
        <AdminNavigation activeView={activeView} />
      </section>
      {children}
    </div>
  );
}

function AdminDashboard({ activeView }: { activeView: AdminView }) {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [applications, setApplications] = useState<AdminApplicationListResponse | null>(null);
  const [auditLog, setAuditLog] = useState<AdminAuditLogResponse | null>(null);
  const [cryptoExecution, setCryptoExecution] = useState<AdminCryptoExecutionOverviewResponse | null>(null);
  const [cryptoWorkspaceExecution, setCryptoWorkspaceExecution] =
    useState<WorkspaceCryptoExecutionOverviewResponse | null>(null);
  const [cryptoWorkerResult, setCryptoWorkerResult] = useState<CryptoExecutionWorkerRunResponse | null>(null);
  const [forexPaperWorkerResult, setForexPaperWorkerResult] = useState<ForexPaperWorkerRunResponse | null>(null);
  const [forexDemoWorkerResult, setForexDemoWorkerResult] = useState<ForexDemoWorkerRunResponse | null>(null);
  const [forexDemoReconciliationResult, setForexDemoReconciliationResult] =
    useState<ForexDemoReconciliationRunResponse | null>(null);
  const [forexDemoCancelResult, setForexDemoCancelResult] = useState<ForexDemoCancelResponse | null>(null);
  const [forexLiveCanaryResult, setForexLiveCanaryResult] =
    useState<ForexLiveCanaryWorkerRunResponse | null>(null);
  const [liveSandboxWorkerResult, setLiveSandboxWorkerResult] = useState<LiveSandboxWorkerRunResponse | null>(null);
  const [liveSandboxReconciliationResult, setLiveSandboxReconciliationResult] =
    useState<LiveSandboxReconciliationRunResponse | null>(null);
  const [liveProductionWorkerResult, setLiveProductionWorkerResult] =
    useState<LiveProductionWorkerRunResponse | null>(null);
  const [liveProductionCanaryResult, setLiveProductionCanaryResult] =
    useState<LiveProductionWorkerRunResponse | null>(null);
  const [cryptoLiveCohortResult, setCryptoLiveCohortResult] =
    useState<CryptoLiveCohortRolloutWorkerRunResponse | null>(null);
  const [liveProductionReconciliationResult, setLiveProductionReconciliationResult] =
    useState<LiveProductionReconciliationRunResponse | null>(null);
  const [payments, setPayments] = useState<AdminPaymentsOverviewResponse | null>(null);
  const [messaging, setMessaging] = useState<AdminMessagingOverviewResponse | null>(null);
  const [externalSignalIngestion, setExternalSignalIngestion] =
    useState<ExternalSignalIngestionOverviewResponse | null>(null);
  const [messagingWorkerResult, setMessagingWorkerResult] = useState<MessagingDeliveryWorkerRunResponse | null>(null);
  const [cryptoWorkerWorkspaceId, setCryptoWorkerWorkspaceId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [source, setSource] = useState<ApplicationSource | "all">("all");
  const [market, setMarket] = useState<WorkspaceApplication["market"] | "all">("all");
  const [solana, setSolana] = useState<"all" | "interested" | "not_interested">("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reconcilingPaymentIntentId, setReconcilingPaymentIntentId] = useState<string | null>(null);
  const [updatingSettlementId, setUpdatingSettlementId] = useState<string | null>(null);
  const [isRunningCryptoWorker, setIsRunningCryptoWorker] = useState(false);
  const [isRunningForexPaperWorker, setIsRunningForexPaperWorker] = useState(false);
  const [isRunningForexDemoWorker, setIsRunningForexDemoWorker] = useState(false);
  const [isRunningForexLiveCanary, setIsRunningForexLiveCanary] = useState(false);
  const [isReconcilingForexDemo, setIsReconcilingForexDemo] = useState(false);
  const [isRunningLiveSandboxWorker, setIsRunningLiveSandboxWorker] = useState(false);
  const [isReconcilingLiveSandbox, setIsReconcilingLiveSandbox] = useState(false);
  const [isRunningLiveProductionWorker, setIsRunningLiveProductionWorker] = useState(false);
  const [isRunningLiveProductionCanary, setIsRunningLiveProductionCanary] = useState(false);
  const [isRunningCryptoLiveCohort, setIsRunningCryptoLiveCohort] = useState(false);
  const [isReconcilingLiveProduction, setIsReconcilingLiveProduction] = useState(false);
  const [isLoadingCryptoWorkspace, setIsLoadingCryptoWorkspace] = useState(false);
  const [isRunningMessagingWorker, setIsRunningMessagingWorker] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overviewErrorMessage, setOverviewErrorMessage] = useState<string | null>(null);
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);
  const [paymentsErrorMessage, setPaymentsErrorMessage] = useState<string | null>(null);
  const [messagingErrorMessage, setMessagingErrorMessage] = useState<string | null>(null);
  const [externalSignalIngestionErrorMessage, setExternalSignalIngestionErrorMessage] = useState<string | null>(null);
  const [cryptoExecutionErrorMessage, setCryptoExecutionErrorMessage] = useState<string | null>(null);
  const [cryptoWorkspaceErrorMessage, setCryptoWorkspaceErrorMessage] = useState<string | null>(null);
  const [applicationsRefreshNonce, setApplicationsRefreshNonce] = useState(0);

  const selectedApplication = useMemo(
    () =>
      applications?.applications.find((application) => application.applicationId === selectedId) ??
      applications?.applications[0] ??
      null,
    [applications, selectedId]
  );

  async function loadOverview() {
    const nextOverview = await requestAdminApi<AdminOverviewResponse>("/api/admin/overview");
    setOverview(nextOverview);
  }

  async function loadCryptoExecution() {
    try {
      const nextOverview = await requestAdminApi<AdminCryptoExecutionOverviewResponse>(
        "/api/admin/crypto-execution/overview"
      );
      setCryptoExecution(nextOverview);
      setCryptoExecutionErrorMessage(null);
    } catch (error) {
      setCryptoExecution(null);
      setCryptoExecutionErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load crypto paper execution."
      );
    }
  }

  async function loadMessagingOverview() {
    try {
      const nextOverview = await requestAdminApi<AdminMessagingOverviewResponse>("/api/admin/messaging/overview");
      setMessaging(nextOverview);
      setMessagingErrorMessage(null);
    } catch (error) {
      setMessaging(null);
      setMessagingErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load messaging readiness."
      );
    }
  }

  async function loadExternalSignalIngestionOverview() {
    try {
      const nextOverview = await requestAdminApi<ExternalSignalIngestionOverviewResponse>(
        "/api/admin/signals/external-ingestion/overview"
      );
      setExternalSignalIngestion(nextOverview);
      setExternalSignalIngestionErrorMessage(null);
    } catch (error) {
      setExternalSignalIngestion(null);
      setExternalSignalIngestionErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load external signal ingestion readiness."
      );
    }
  }

  async function loadAuditLog() {
    try {
      const nextAuditLog = await requestAdminApi<AdminAuditLogResponse>("/api/admin/audit-log?limit=25");
      setAuditLog(nextAuditLog);
      setAuditErrorMessage(null);
    } catch (error) {
      setAuditLog(null);
      setAuditErrorMessage(error instanceof Error ? error.message : "TradeHub could not load audit history.");
    }
  }

  async function loadPaymentsOverview() {
    try {
      const nextPayments = await requestAdminApi<AdminPaymentsOverviewResponse>("/api/admin/payments/overview");
      setPayments(nextPayments);
      setPaymentsErrorMessage(null);
    } catch (error) {
      setPayments(null);
      setPaymentsErrorMessage(error instanceof Error ? error.message : "TradeHub could not load payment operations.");
    }
  }

  async function loadCryptoWorkspaceExecution(workspaceIdValue = cryptoWorkerWorkspaceId.trim()) {
    const workspaceId = workspaceIdValue.trim();

    if (!workspaceId) {
      setCryptoWorkspaceErrorMessage("Choose a workspace ID before loading crypto execution details.");
      return;
    }

    setIsLoadingCryptoWorkspace(true);
    setCryptoWorkspaceErrorMessage(null);

    try {
      const nextOverview = await requestAdminApi<WorkspaceCryptoExecutionOverviewResponse>(
        `/api/admin/crypto-execution/workspaces/${encodeURIComponent(workspaceId)}/overview`
      );
      setCryptoWorkspaceExecution(nextOverview);
    } catch (error) {
      setCryptoWorkspaceExecution(null);
      setCryptoWorkspaceErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load workspace crypto execution."
      );
    } finally {
      setIsLoadingCryptoWorkspace(false);
    }
  }

  function refreshApplications() {
    // The dedicated applications effect owns the fetch; bumping this nonce re-runs it.
    setApplicationsRefreshNonce((nonce) => nonce + 1);
  }

  async function loadActiveView(view = activeView) {
    const loaders: Array<() => Promise<void>> = [];

    if (
      view === "overview" ||
      view === "licences" ||
      view === "payments" ||
      view === "integrations" ||
      view === "audit"
    ) {
      loaders.push(loadOverview);
    }

    if (view === "payments") {
      loaders.push(loadPaymentsOverview);
    }

    if (view === "integrations") {
      loaders.push(loadMessagingOverview, loadExternalSignalIngestionOverview);
    }

    if (view === "execution-safety") {
      loaders.push(loadCryptoExecution);
    }

    if (view === "audit") {
      loaders.push(loadAuditLog);
    }

    const results = await Promise.allSettled(loaders.map((loader) => loader()));
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

    if (rejected) {
      throw rejected.reason;
    }
  }

  async function refreshAll() {
    setErrorMessage(null);
    setMessage(null);
    setOverviewErrorMessage(null);
    setAuditErrorMessage(null);
    setPaymentsErrorMessage(null);
    setMessagingErrorMessage(null);
    setExternalSignalIngestionErrorMessage(null);
    setCryptoExecutionErrorMessage(null);
    setCryptoWorkspaceErrorMessage(null);
    setIsLoading(true);

    try {
      if (activeView === "workspaces") {
        refreshApplications();
      }

      await loadActiveView(activeView);
      setMessage("Admin view refreshed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not refresh this admin view.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runMessagingWorker() {
    setIsRunningMessagingWorker(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<MessagingDeliveryWorkerRunResponse>(
        "/api/admin/messaging/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ limit: 10 })
        }
      );

      setMessagingWorkerResult(response);
      setMessage(response.safeMessage);
      await loadMessagingOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the messaging worker.");
    } finally {
      setIsRunningMessagingWorker(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function run() {
      setErrorMessage(null);
      setOverviewErrorMessage(null);
      setAuditErrorMessage(null);
      setPaymentsErrorMessage(null);
      setMessagingErrorMessage(null);
      setExternalSignalIngestionErrorMessage(null);
      setIsLoading(true);

      try {
        if (!active) {
          return;
        }

        await loadActiveView(activeView);
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load admin data.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (activeView !== "workspaces") {
        return;
      }

      setErrorMessage(null);
      setIsListLoading(true);

      try {
        const path = buildApplicationsPath({ status, source, market, solana, query });
        const nextApplications = await requestAdminApi<AdminApplicationListResponse>(path);

        if (!active) {
          return;
        }

        setApplications(nextApplications);
        setSelectedId((current) => {
          if (current && nextApplications.applications.some((application) => application.applicationId === current)) {
            return current;
          }

          return nextApplications.applications[0]?.applicationId ?? null;
        });
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load applications.");
        }
      } finally {
        if (active) {
          setIsListLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [activeView, applicationsRefreshNonce, market, query, solana, source, status]);

  async function updateApplication(applicationId: string, patch: AdminApplicationPatch) {
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<AdminApplicationUpdateResponse>(
        `/api/admin/applications/${applicationId}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch)
        }
      );

      setApplications((current) =>
        current
          ? {
              ...current,
              source: response.source,
              sourceLabel: response.sourceLabel,
              sourceMessage: response.sourceMessage,
              warnings: response.warnings,
              applications: current.applications.map((application) =>
                application.applicationId === response.application.applicationId
                  ? response.application
                  : application
              )
            }
          : current
      );

      if (response.auditEvent) {
        setAuditLog((current) =>
          current
            ? {
                ...current,
                events: [response.auditEvent!, ...current.events].slice(0, 25)
              }
            : current
        );
      }

      setMessage(
        response.source === "firestore"
          ? "Application updated and audit event written."
          : "Mock update returned for UI proof. Configure Admin SDK credentials to persist it."
      );
      refreshApplications();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that application.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createWorkspaceShell(application: WorkspaceApplication, workspaceId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<AdminWorkspaceCreateResponse>(
        "/api/admin/workspaces",
        {
          method: "POST",
          body: JSON.stringify({
            applicationId: application.applicationId,
            workspaceId: workspaceId || application.workspaceId || getWorkspaceIdSuggestion(application),
            handle: getWorkspaceHandleSuggestion(application),
            ownerEmail: application.email,
            ownerDisplayName: application.name
          })
        }
      );

      setApplications((current) =>
        current
          ? {
              ...current,
              source: response.source,
              sourceLabel: response.sourceLabel,
              sourceMessage: response.sourceMessage,
              warnings: response.warnings,
              applications: current.applications.map((entry) =>
                entry.applicationId === response.application.applicationId ? response.application : entry
              )
            }
          : current
      );

      if (response.auditEvent) {
        setAuditLog((current) =>
          current
            ? {
                ...current,
                events: [response.auditEvent!, ...current.events].slice(0, 25)
              }
            : current
        );
      }

      setMessage(
        `Workspace shell ${response.workspace.workspaceId} created. Create the influencer Auth user, set INFLUENCER_EMAIL and INFLUENCER_WORKSPACE_ID, then run npm run firebase:bootstrap-influencer.`
      );
      refreshApplications();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not create that workspace shell.");
    } finally {
      setIsSaving(false);
    }
  }

  async function reconcilePaystackIntent(paymentIntentId: string) {
    setReconcilingPaymentIntentId(paymentIntentId);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<AdminPaystackReconcileResponse>(
        `/api/admin/payments/paystack/${paymentIntentId}/reconcile`,
        { method: "POST" }
      );

      setMessage(response.message);
      await Promise.all([loadOverview(), loadPaymentsOverview()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not reconcile that Paystack intent.");
    } finally {
      setReconcilingPaymentIntentId(null);
    }
  }

  async function patchSolanaSettlement(settlementId: string, payload: SolanaSettlementPatchPayload) {
    setUpdatingSettlementId(settlementId);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<AdminSolanaSettlementUpdateResponse>(
        `/api/admin/payments/solana-settlements/${settlementId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload)
        }
      );

      setPayments((current) =>
        current
          ? {
              ...current,
              latestSolanaSettlements: current.latestSolanaSettlements.map((settlement) =>
                settlement.settlementId === response.settlement.settlementId
                  ? response.settlement
                  : settlement
              )
            }
          : current
      );
      setMessage(response.message);
      await Promise.all([loadOverview(), loadPaymentsOverview()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that settlement record.");
    } finally {
      setUpdatingSettlementId(null);
    }
  }

  async function runCryptoPaperWorker() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the crypto paper worker.");
      return;
    }

    setIsRunningCryptoWorker(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<CryptoExecutionWorkerRunResponse>(
        "/api/admin/crypto-execution/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setCryptoWorkerResult(response);
      setMessage(
        `Paper worker processed ${response.processedCount} intent${response.processedCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the crypto paper worker.");
    } finally {
      setIsRunningCryptoWorker(false);
    }
  }

  async function runForexPaperWorker() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the forex paper worker.");
      return;
    }

    setIsRunningForexPaperWorker(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<ForexPaperWorkerRunResponse>(
        "/api/admin/crypto-execution/forex-paper/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setForexPaperWorkerResult(response);
      setMessage(
        `Forex paper worker processed ${response.processedCount} intent${response.processedCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the forex paper worker.");
    } finally {
      setIsRunningForexPaperWorker(false);
    }
  }

  async function runForexDemoWorker(confirmation: string) {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the forex demo worker.");
      return;
    }

    setIsRunningForexDemoWorker(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<ForexDemoWorkerRunResponse>(
        "/api/admin/crypto-execution/forex-demo/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, confirmation })
        }
      );

      setForexDemoWorkerResult(response);
      setMessage(
        `Forex demo worker processed ${response.processedCount} intent${response.processedCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the forex demo worker.");
    } finally {
      setIsRunningForexDemoWorker(false);
    }
  }

  async function runForexLiveCanary(confirmation: string) {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the tiny live Forex canary.");
      return;
    }

    setIsRunningForexLiveCanary(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<ForexLiveCanaryWorkerRunResponse>(
        "/api/admin/crypto-execution/forex-live-canary/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, confirmation })
        }
      );

      setForexLiveCanaryResult(response);
      setMessage(
        `Tiny live Forex canary checked ${response.candidateCount} intent${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the tiny live Forex canary.");
    } finally {
      setIsRunningForexLiveCanary(false);
    }
  }

  async function runForexDemoReconciliation() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running forex demo reconciliation.");
      return;
    }

    setIsReconcilingForexDemo(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<ForexDemoReconciliationRunResponse>(
        "/api/admin/crypto-execution/forex-demo/reconcile/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setForexDemoReconciliationResult(response);
      setMessage(
        `Forex demo reconciliation checked ${response.candidateCount} attempt${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not reconcile forex demo attempts.");
    } finally {
      setIsReconcilingForexDemo(false);
    }
  }

  async function cancelForexDemoAttempt(attemptId: string, confirmation: string) {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId || !attemptId) {
      setErrorMessage("Load a workspace with a forex demo attempt before cancelling.");
      return;
    }

    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<ForexDemoCancelResponse>(
        `/api/admin/crypto-execution/forex-demo/orders/${encodeURIComponent(attemptId)}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, confirmation })
        }
      );

      setForexDemoCancelResult(response);
      setMessage(`Forex demo attempt ${response.attemptId} was cancelled for ${response.workspaceId}.`);
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not cancel that forex demo attempt.");
    }
  }

  async function runLiveSandboxWorker() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the live sandbox worker.");
      return;
    }

    setIsRunningLiveSandboxWorker(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<LiveSandboxWorkerRunResponse>(
        "/api/admin/crypto-execution/live-sandbox/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setLiveSandboxWorkerResult(response);
      setMessage(
        `Live sandbox worker processed ${response.processedCount} intent${response.processedCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the live sandbox worker.");
    } finally {
      setIsRunningLiveSandboxWorker(false);
    }
  }

  async function runLiveSandboxReconciliation() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running live sandbox reconciliation.");
      return;
    }

    setIsReconcilingLiveSandbox(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<LiveSandboxReconciliationRunResponse>(
        "/api/admin/crypto-execution/live-sandbox/reconcile/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setLiveSandboxReconciliationResult(response);
      setMessage(
        `Live sandbox reconciliation checked ${response.candidateCount} attempt${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not reconcile live sandbox attempts.");
    } finally {
      setIsReconcilingLiveSandbox(false);
    }
  }

  async function runLiveProductionWorker() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the production live worker.");
      return;
    }

    setIsRunningLiveProductionWorker(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<LiveProductionWorkerRunResponse>(
        "/api/admin/crypto-execution/live-production/worker/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setLiveProductionWorkerResult(response);
      setMessage(
        `Production live worker checked ${response.candidateCount} intent${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the production live worker.");
    } finally {
      setIsRunningLiveProductionWorker(false);
    }
  }

  async function runCryptoLiveCohortDryRun() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the crypto live cohort dry-run.");
      return;
    }

    setIsRunningCryptoLiveCohort(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<CryptoLiveCohortRolloutWorkerRunResponse>(
        "/api/admin/crypto-execution/live-production/cohort/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, mode: "dry_run" })
        }
      );

      setCryptoLiveCohortResult(response);
      setMessage(
        `Crypto live cohort dry-run checked ${response.candidateCount} candidate${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the crypto live cohort dry-run.");
    } finally {
      setIsRunningCryptoLiveCohort(false);
    }
  }

  async function runLiveProductionReconciliation() {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running production live reconciliation.");
      return;
    }

    setIsReconcilingLiveProduction(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<LiveProductionReconciliationRunResponse>(
        "/api/admin/crypto-execution/live-production/reconcile/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId })
        }
      );

      setLiveProductionReconciliationResult(response);
      setMessage(
        `Production reconciliation checked ${response.candidateCount} attempt${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not reconcile production live attempts.");
    } finally {
      setIsReconcilingLiveProduction(false);
    }
  }

  async function runLiveProductionCanary(confirmation: string) {
    const workspaceId = cryptoWorkerWorkspaceId.trim();

    if (!workspaceId) {
      setErrorMessage("Choose a workspace ID before running the production canary.");
      return;
    }

    setIsRunningLiveProductionCanary(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await requestAdminApi<LiveProductionWorkerRunResponse>(
        "/api/admin/crypto-execution/live-production/canary/run",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, confirmation })
        }
      );

      setLiveProductionCanaryResult(response);
      setMessage(
        `Production canary checked ${response.candidateCount} intent${response.candidateCount === 1 ? "" : "s"} for ${response.workspaceId}.`
      );
      await Promise.all([
        loadCryptoExecution(),
        loadCryptoWorkspaceExecution(response.workspaceId)
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not run the production canary.");
    } finally {
      setIsRunningLiveProductionCanary(false);
    }
  }

  const overviewFallback = (
    <GlassCard>
      <p className="text-sm text-[color:var(--label2)]">
        {overviewErrorMessage ?? "Loading platform summary..."}
      </p>
    </GlassCard>
  );

  return (
    <AdminViewFrame activeView={activeView} isLoading={isLoading} onRefresh={refreshAll}>
      {errorMessage ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="eyebrow !text-[color:var(--red)]">Admin API</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">{errorMessage}</p>
        </GlassCard>
      ) : null}

      {message ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--green)_30%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--label2)]">{message}</p>
        </GlassCard>
      ) : null}

      {activeView === "overview" ? (
        overview ? (
          <div className="space-y-6" data-testid="admin-view-overview">
            <AdminSourceBanner
              source={overview.source}
              sourceLabel={overview.sourceLabel}
              sourceMessage={overview.sourceMessage}
              warnings={overview.warnings}
            />
            <AdminStatGrid summary={overview.summary} />
            <AdminSupportOverview overview={overview} />
          </div>
        ) : (
          overviewFallback
        )
      ) : null}

      {activeView === "workspaces" ? (
        <section
          className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(420px,1.04fr)]"
          data-testid="admin-view-workspaces"
        >
          <ApplicationPipeline
            response={applications}
            selectedId={selectedApplication?.applicationId ?? selectedId}
            status={status}
            source={source}
            market={market}
            solana={solana}
            query={query}
            loading={isListLoading}
            onSelect={setSelectedId}
            onStatusChange={setStatus}
            onSourceChange={setSource}
            onMarketChange={setMarket}
            onSolanaChange={setSolana}
            onQueryChange={setQuery}
            onRefresh={refreshApplications}
          />
          <ApplicationDetailPanel
            application={selectedApplication}
            saving={isSaving}
            onPatch={updateApplication}
            onCreateWorkspaceShell={createWorkspaceShell}
          />
        </section>
      ) : null}

      {activeView === "licences" ? (
        overview ? (
          <div className="space-y-6" data-testid="admin-view-licences">
            <WorkspacePackageOverviewPanel
              overview={overview.workspacePackages}
              onUpdated={loadOverview}
              onMessage={setMessage}
              onError={(nextMessage) => {
                if (nextMessage) {
                  setErrorMessage(nextMessage);
                }
              }}
            />
          </div>
        ) : (
          overviewFallback
        )
      ) : null}

      {activeView === "payments" ? (
        <section
          className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]"
          data-testid="admin-view-payments"
        >
          <div className="space-y-6">
            {overview ? <PaymentRailOverview paymentRails={overview.paymentRails} /> : overviewFallback}
            {payments ? (
              <>
                <PaymentSupportQueue payments={payments} />
                <PaystackPaymentOps
                  payments={payments}
                  reconcilingPaymentIntentId={reconcilingPaymentIntentId}
                  onReconcile={reconcilePaystackIntent}
                />
              </>
            ) : (
              <GlassCard className="space-y-3 border-[color:color-mix(in_srgb,var(--red)_28%,transparent)]">
                <p className="eyebrow !text-[color:var(--red)]">Payment operations</p>
                <p className="break-words text-sm leading-6 text-[color:var(--label2)]">
                  {paymentsErrorMessage ?? "TradeHub could not load payment operations yet."}
                </p>
              </GlassCard>
            )}
          </div>
          {payments ? (
            <SolanaSettlementLedger
              settlements={payments.latestSolanaSettlements}
              updatingSettlementId={updatingSettlementId}
              onPatchSettlement={patchSolanaSettlement}
            />
          ) : (
            <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_28%,transparent)]">
              <p className="eyebrow !text-[color:var(--red)]">Solana settlement ledger</p>
              <p className="break-words text-sm leading-6 text-[color:var(--label2)]">
                {paymentsErrorMessage ?? "TradeHub could not load the Solana settlement ledger yet."}
              </p>
            </GlassCard>
          )}
        </section>
      ) : null}

      {activeView === "integrations" ? (
        overview ? (
          <div className="space-y-6" data-testid="admin-view-integrations">
            <WorkspaceBrandingDomainPanel
              overview={overview.workspaceBranding}
              onUpdated={loadOverview}
              onMessage={setMessage}
              onError={(nextMessage) => {
                if (nextMessage) {
                  setErrorMessage(nextMessage);
                }
              }}
            />
            <WorkspaceEnterpriseReadinessPanel
              overview={overview.workspaceEnterpriseDeployment}
              onUpdated={loadOverview}
              onMessage={setMessage}
              onError={(nextMessage) => {
                if (nextMessage) {
                  setErrorMessage(nextMessage);
                }
              }}
            />
            <WorkspaceEnterpriseIntegrationsPanel
              overview={overview.workspaceEnterpriseIntegrations}
              onUpdated={loadOverview}
              onMessage={setMessage}
              onError={(nextMessage) => {
                if (nextMessage) {
                  setErrorMessage(nextMessage);
                }
              }}
            />
            <ExternalSignalIngestionPanel
              overview={externalSignalIngestion}
              errorMessage={externalSignalIngestionErrorMessage}
              onRefresh={loadExternalSignalIngestionOverview}
            />
            <MessagingReadinessPanel
              overview={messaging}
              errorMessage={messagingErrorMessage}
              workerResult={messagingWorkerResult}
              runningWorker={isRunningMessagingWorker}
              onRunWorker={runMessagingWorker}
            />
          </div>
        ) : (
          overviewFallback
        )
      ) : null}

      {activeView === "execution-safety" ? (
        <div data-testid="admin-view-execution-safety">
          <CryptoExecutionOpsPanel
            overview={cryptoExecution}
            workspaceOverview={cryptoWorkspaceExecution}
            loading={isLoading}
            loadingWorkspace={isLoadingCryptoWorkspace}
            errorMessage={cryptoExecutionErrorMessage}
            workspaceErrorMessage={cryptoWorkspaceErrorMessage}
            workspaceId={cryptoWorkerWorkspaceId}
            running={isRunningCryptoWorker}
            runningForexPaper={isRunningForexPaperWorker}
            runningForexDemo={isRunningForexDemoWorker}
            runningForexLiveCanary={isRunningForexLiveCanary}
            runningLiveSandbox={isRunningLiveSandboxWorker}
            runningLiveProduction={isRunningLiveProductionWorker}
            runningLiveProductionCanary={isRunningLiveProductionCanary}
            runningCryptoLiveCohort={isRunningCryptoLiveCohort}
            reconcilingLiveSandbox={isReconcilingLiveSandbox}
            reconcilingForexDemo={isReconcilingForexDemo}
            reconcilingLiveProduction={isReconcilingLiveProduction}
            workerResult={cryptoWorkerResult}
            forexPaperWorkerResult={forexPaperWorkerResult}
            forexDemoWorkerResult={forexDemoWorkerResult}
            forexDemoReconciliationResult={forexDemoReconciliationResult}
            forexDemoCancelResult={forexDemoCancelResult}
            forexLiveCanaryResult={forexLiveCanaryResult}
            liveSandboxWorkerResult={liveSandboxWorkerResult}
            liveSandboxReconciliationResult={liveSandboxReconciliationResult}
            liveProductionWorkerResult={liveProductionWorkerResult}
            liveProductionCanaryResult={liveProductionCanaryResult}
            cryptoLiveCohortResult={cryptoLiveCohortResult}
            liveProductionReconciliationResult={liveProductionReconciliationResult}
            onWorkspaceIdChange={setCryptoWorkerWorkspaceId}
            onRefresh={loadCryptoExecution}
            onLoadWorkspace={() => loadCryptoWorkspaceExecution()}
            onRunWorker={runCryptoPaperWorker}
            onRunForexPaperWorker={runForexPaperWorker}
            onRunForexDemoWorker={runForexDemoWorker}
            onRunForexLiveCanary={runForexLiveCanary}
            onRunForexDemoReconciliation={runForexDemoReconciliation}
            onCancelForexDemoAttempt={cancelForexDemoAttempt}
            onRunLiveSandboxWorker={runLiveSandboxWorker}
            onRunLiveSandboxReconciliation={runLiveSandboxReconciliation}
            onRunLiveProductionWorker={runLiveProductionWorker}
            onRunLiveProductionCanary={runLiveProductionCanary}
            onRunCryptoLiveCohortDryRun={runCryptoLiveCohortDryRun}
            onRunLiveProductionReconciliation={runLiveProductionReconciliation}
          />
        </div>
      ) : null}

      {activeView === "audit" ? (
        overview || auditLog ? (
          <section className="grid gap-6 xl:grid-cols-2" data-testid="admin-view-audit">
            {overview ? (
              <TrustSafetyPanel disputes={overview.disputes} riskFlags={overview.riskFlags} />
            ) : (
              overviewFallback
            )}
            <AuditLogPreview events={auditLog?.events ?? []} />
          </section>
        ) : (
          <GlassCard>
            <p className="text-sm text-[color:var(--label2)]">
              {auditErrorMessage ?? "Loading audit and trust/safety summary..."}
            </p>
          </GlassCard>
        )
      ) : null}
    </AdminViewFrame>
  );
}

export function AdminPageClient({ activeView = "overview" }: { activeView?: AdminView }) {
  return (
    <RoleGate allowedRole="super_admin" nextPath="/admin">
      <AdminDashboard activeView={activeView} />
    </RoleGate>
  );
}
