"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
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

function AdminDashboard() {
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

  async function loadCorePanels() {
    const [
      overviewResult,
      auditResult,
      paymentsResult,
      cryptoExecutionResult,
      messagingResult,
      externalSignalIngestionResult
    ] = await Promise.allSettled([
      requestAdminApi<AdminOverviewResponse>("/api/admin/overview"),
      requestAdminApi<AdminAuditLogResponse>("/api/admin/audit-log?limit=25"),
      requestAdminApi<AdminPaymentsOverviewResponse>("/api/admin/payments/overview"),
      requestAdminApi<AdminCryptoExecutionOverviewResponse>("/api/admin/crypto-execution/overview"),
      requestAdminApi<AdminMessagingOverviewResponse>("/api/admin/messaging/overview"),
      requestAdminApi<ExternalSignalIngestionOverviewResponse>("/api/admin/signals/external-ingestion/overview")
    ]);

    if (overviewResult.status === "fulfilled") {
      setOverview(overviewResult.value);
      setOverviewErrorMessage(null);
    } else {
      setOverview(null);
      setOverviewErrorMessage(
        overviewResult.reason instanceof Error
          ? overviewResult.reason.message
          : "TradeHub could not load platform summary."
      );
    }

    if (auditResult.status === "fulfilled") {
      setAuditLog(auditResult.value);
      setAuditErrorMessage(null);
    } else {
      setAuditLog(null);
      setAuditErrorMessage(
        auditResult.reason instanceof Error
          ? auditResult.reason.message
          : "TradeHub could not load audit history."
      );
    }

    if (paymentsResult.status === "fulfilled") {
      setPayments(paymentsResult.value);
      setPaymentsErrorMessage(null);
    } else {
      setPayments(null);
      setPaymentsErrorMessage(
        paymentsResult.reason instanceof Error
          ? paymentsResult.reason.message
          : "TradeHub could not load payment operations."
      );
    }

    if (cryptoExecutionResult.status === "fulfilled") {
      setCryptoExecution(cryptoExecutionResult.value);
      setCryptoExecutionErrorMessage(null);
    } else {
      setCryptoExecution(null);
      setCryptoExecutionErrorMessage(
        cryptoExecutionResult.reason instanceof Error
          ? cryptoExecutionResult.reason.message
        : "TradeHub could not load crypto paper execution."
      );
    }

    if (messagingResult.status === "fulfilled") {
      setMessaging(messagingResult.value);
      setMessagingErrorMessage(null);
    } else {
      setMessaging(null);
      setMessagingErrorMessage(
        messagingResult.reason instanceof Error
          ? messagingResult.reason.message
          : "TradeHub could not load messaging readiness."
      );
    }

    if (externalSignalIngestionResult.status === "fulfilled") {
      setExternalSignalIngestion(externalSignalIngestionResult.value);
      setExternalSignalIngestionErrorMessage(null);
    } else {
      setExternalSignalIngestion(null);
      setExternalSignalIngestionErrorMessage(
        externalSignalIngestionResult.reason instanceof Error
          ? externalSignalIngestionResult.reason.message
          : "TradeHub could not load external signal ingestion readiness."
      );
    }
  }

  async function loadApplications() {
    setIsListLoading(true);
    try {
      const path = buildApplicationsPath({ status, source, market, solana, query });
      const nextApplications = await requestAdminApi<AdminApplicationListResponse>(path);

      setApplications(nextApplications);
      setSelectedId((current) => {
        if (current && nextApplications.applications.some((application) => application.applicationId === current)) {
          return current;
        }

        return nextApplications.applications[0]?.applicationId ?? null;
      });
    } finally {
      setIsListLoading(false);
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
      const [coreResult, applicationsResult] = await Promise.allSettled([
        loadCorePanels(),
        loadApplications()
      ]);

      if (coreResult.status === "rejected") {
        setErrorMessage(
          coreResult.reason instanceof Error
            ? coreResult.reason.message
            : "TradeHub could not load admin data."
        );
      }

      if (applicationsResult.status === "rejected") {
        setErrorMessage(
          applicationsResult.reason instanceof Error
            ? applicationsResult.reason.message
            : "TradeHub could not load applications."
        );
      }
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

        await loadCorePanels();
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
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
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
  }, [market, query, solana, source, status]);

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
      await loadOverview();
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
      await loadOverview();
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
      await loadCorePanels();
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
      await loadCorePanels();
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

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">Owner control room</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[color:var(--label)] sm:text-5xl">
              Onboarding, vetting, payment rails, risk, and audit visibility.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
              Super Admin data loads through API routes that verify Firebase ID tokens server-side.
              Mock data is labeled when Admin SDK credentials are not configured.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">Stage 20A ops audit</Badge>
            <Button onClick={refreshAll} variant="secondary" size="sm" disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </section>

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

      {overview ? (
        <>
          <AdminSourceBanner
            source={overview.source}
            sourceLabel={overview.sourceLabel}
            sourceMessage={overview.sourceMessage}
            warnings={overview.warnings}
          />
          <AdminStatGrid summary={overview.summary} />
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
          <AdminSupportOverview
            overview={overview}
            payments={payments}
            cryptoExecution={cryptoExecution}
          />
          <MessagingReadinessPanel
            overview={messaging}
            errorMessage={messagingErrorMessage}
            workerResult={messagingWorkerResult}
            runningWorker={isRunningMessagingWorker}
            onRunWorker={runMessagingWorker}
          />
          <ExternalSignalIngestionPanel
            overview={externalSignalIngestion}
            errorMessage={externalSignalIngestionErrorMessage}
            onRefresh={loadExternalSignalIngestionOverview}
          />
        </>
      ) : (
        <GlassCard>
          <p className="text-sm text-[color:var(--label2)]">
            {overviewErrorMessage ?? "Loading platform summary..."}
          </p>
        </GlassCard>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(420px,1.04fr)]">
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
          onRefresh={loadApplications}
        />
        <ApplicationDetailPanel
          application={selectedApplication}
          saving={isSaving}
          onPatch={updateApplication}
          onCreateWorkspaceShell={createWorkspaceShell}
        />
      </section>

      {overview || payments ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <div className="space-y-6">
            {overview ? <PaymentRailOverview paymentRails={overview.paymentRails} /> : null}
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
            {auditErrorMessage ? (
              <GlassCard className="space-y-3 border-[color:color-mix(in_srgb,var(--amber)_24%,transparent)]">
                <p className="eyebrow !text-[color:var(--amber)]">Audit history</p>
                <p className="break-words text-sm leading-6 text-[color:var(--label2)]">{auditErrorMessage}</p>
              </GlassCard>
            ) : null}
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

      {overview || auditLog ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {overview ? <TrustSafetyPanel disputes={overview.disputes} riskFlags={overview.riskFlags} /> : <GlassCard>
            <p className="text-sm text-[color:var(--label2)]">
              {overviewErrorMessage ?? "Platform trust and safety summary is not available yet."}
            </p>
          </GlassCard>}
          <AuditLogPreview events={auditLog?.events ?? []} />
        </section>
      ) : null}
    </div>
  );
}

export function AdminPageClient() {
  return (
    <RoleGate allowedRole="super_admin" nextPath="/admin">
      <AdminDashboard />
    </RoleGate>
  );
}
