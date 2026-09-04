import { useState } from "react";
import { ForexDemoExecutionPreviewCard } from "@/components/crypto-execution/forex-demo-execution-preview";
import { ForexLiveCanaryPreviewCard } from "@/components/crypto-execution/forex-live-canary-preview";
import { ForexConnectionReadinessCard } from "@/components/crypto-execution/forex-connection-readiness-preview";
import { ForexPaperExecutionPreviewCard } from "@/components/crypto-execution/forex-paper-execution-preview";
import { ForexProvisioningPreviewCard } from "@/components/crypto-execution/forex-provisioning-preview";
import { BroadLiveAutoCopyReadinessCard } from "@/components/crypto-execution/broad-live-autocopy-readiness";
import { PaperExecutionPreview } from "@/components/crypto-execution/paper-execution-preview";
import { LiveProductionExecutionPreviewCard } from "@/components/crypto-execution/live-production-execution-preview";
import { LiveSandboxExecutionPreviewCard } from "@/components/crypto-execution/live-sandbox-execution-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
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

const inputClass =
  "focus-ring min-h-11 w-full rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] placeholder:text-[color:var(--label3)]";

export function CryptoExecutionOpsPanel({
  overview,
  workspaceOverview,
  loading,
  loadingWorkspace,
  errorMessage,
  workspaceErrorMessage,
  workspaceId,
  running,
  runningForexPaper,
  runningForexDemo,
  runningForexLiveCanary,
  runningLiveSandbox,
  runningLiveProduction,
  runningLiveProductionCanary,
  runningCryptoLiveCohort,
  reconcilingLiveSandbox,
  reconcilingForexDemo,
  reconcilingLiveProduction,
  workerResult,
  forexPaperWorkerResult,
  forexDemoWorkerResult,
  forexDemoReconciliationResult,
  forexDemoCancelResult,
  forexLiveCanaryResult,
  liveSandboxWorkerResult,
  liveSandboxReconciliationResult,
  liveProductionWorkerResult,
  liveProductionCanaryResult,
  cryptoLiveCohortResult,
  liveProductionReconciliationResult,
  onWorkspaceIdChange,
  onRefresh,
  onLoadWorkspace,
  onRunWorker,
  onRunForexPaperWorker,
  onRunForexDemoWorker,
  onRunForexLiveCanary,
  onRunForexDemoReconciliation,
  onCancelForexDemoAttempt,
  onRunLiveSandboxWorker,
  onRunLiveSandboxReconciliation,
  onRunLiveProductionWorker,
  onRunLiveProductionCanary,
  onRunCryptoLiveCohortDryRun,
  onRunLiveProductionReconciliation
}: {
  overview: AdminCryptoExecutionOverviewResponse | null;
  workspaceOverview: WorkspaceCryptoExecutionOverviewResponse | null;
  loading: boolean;
  loadingWorkspace: boolean;
  errorMessage: string | null;
  workspaceErrorMessage: string | null;
  workspaceId: string;
  running: boolean;
  runningForexPaper: boolean;
  runningForexDemo: boolean;
  runningForexLiveCanary: boolean;
  runningLiveSandbox: boolean;
  runningLiveProduction: boolean;
  runningLiveProductionCanary: boolean;
  runningCryptoLiveCohort: boolean;
  reconcilingLiveSandbox: boolean;
  reconcilingForexDemo: boolean;
  reconcilingLiveProduction: boolean;
  workerResult: CryptoExecutionWorkerRunResponse | null;
  forexPaperWorkerResult: ForexPaperWorkerRunResponse | null;
  forexDemoWorkerResult: ForexDemoWorkerRunResponse | null;
  forexDemoReconciliationResult: ForexDemoReconciliationRunResponse | null;
  forexDemoCancelResult: ForexDemoCancelResponse | null;
  forexLiveCanaryResult: ForexLiveCanaryWorkerRunResponse | null;
  liveSandboxWorkerResult: LiveSandboxWorkerRunResponse | null;
  liveSandboxReconciliationResult: LiveSandboxReconciliationRunResponse | null;
  liveProductionWorkerResult: LiveProductionWorkerRunResponse | null;
  liveProductionCanaryResult: LiveProductionWorkerRunResponse | null;
  cryptoLiveCohortResult: CryptoLiveCohortRolloutWorkerRunResponse | null;
  liveProductionReconciliationResult: LiveProductionReconciliationRunResponse | null;
  onWorkspaceIdChange: (value: string) => void;
  onRefresh: () => void;
  onLoadWorkspace: () => void;
  onRunWorker: () => void;
  onRunForexPaperWorker: () => void;
  onRunForexDemoWorker: (confirmation: string) => void;
  onRunForexLiveCanary: (confirmation: string) => void;
  onRunForexDemoReconciliation: () => void;
  onCancelForexDemoAttempt: (attemptId: string, confirmation: string) => void;
  onRunLiveSandboxWorker: () => void;
  onRunLiveSandboxReconciliation: () => void;
  onRunLiveProductionWorker: () => void;
  onRunLiveProductionCanary: (confirmation: string) => void;
  onRunCryptoLiveCohortDryRun: () => void;
  onRunLiveProductionReconciliation: () => void;
}) {
  const [canaryConfirmation, setCanaryConfirmation] = useState("");
  const [forexLiveCanaryConfirmation, setForexLiveCanaryConfirmation] = useState("");
  const [forexDemoConfirmation, setForexDemoConfirmation] = useState("");
  const [forexDemoCancelConfirmation, setForexDemoCancelConfirmation] = useState("");
  const previewOverview = workspaceOverview ?? overview;
  const latestForexDemoAttemptId = previewOverview?.summary.forexDemo?.attempts[0]?.attemptId ?? "";
  const previewTitle = workspaceOverview
    ? `Workspace Paper Auto-Copy: ${workspaceOverview.workspaceId}`
    : "Platform Paper Auto-Copy is zero-safe";
  const previewSubtitle = workspaceOverview
    ? "Workspace-scoped paper intents, simulated order attempts, risk decisions, and audit events after bounded Admin SDK reads."
    : "Select a workspace ID and load its preview. The platform overview intentionally does not scan workspace execution collections.";

  return (
    <section className="space-y-4">
      <GlassCard className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow !text-[color:var(--label3)]">Crypto execution ops</p>
            <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
              Execution controls
            </h2>
            <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Super Admin can inspect platform state, load a workspace preview, and run bounded paper/testnet/production dry-run controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={overview?.platformControl.killSwitchEnabled ? "red" : "green"}>
              {overview?.platformControl.killSwitchEnabled ? "Platform paused" : "Platform active"}
            </Badge>
            <Badge tone={overview?.platformControl.sandboxOnly === false ? "green" : "amber"}>
              {overview?.platformControl.sandboxOnly === false ? "Sandbox control off" : "Sandbox only"}
            </Badge>
            <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <p className="break-safe rounded-[16px] border border-[color:color-mix(in_srgb,var(--red)_30%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
            {errorMessage}
          </p>
        ) : null}

        {overview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip label="Workspace pauses" value={String(overview.summary.workspaceKillSwitchCount)} />
              <StatChip label="Risky workspaces" value={String(overview.summary.riskyWorkspaceCount)} tone={overview.summary.riskyWorkspaceCount > 0 ? "amber" : "green"} />
              <StatChip label="Recent failures" value={String(overview.summary.recentFailureCount)} tone={overview.summary.recentFailureCount > 0 ? "red" : "green"} />
              <StatChip label="Sampled workspaces" value={String(overview.summary.sampledWorkspaceCount)} />
            </div>
            {overview.warnings.map((warning) => (
              <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                {warning}
              </p>
            ))}
          </>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-end">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Workspace ID</span>
            <input
              value={workspaceId}
              onChange={(event) => onWorkspaceIdChange(event.target.value)}
              className={inputClass}
              placeholder="workspace_id"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onLoadWorkspace} variant="secondary" disabled={loadingWorkspace || !workspaceId.trim()}>
              {loadingWorkspace ? "Loading..." : "Load workspace preview"}
            </Button>
            <Button onClick={onRunWorker} variant="primary" disabled={running || !workspaceId.trim()}>
              {running ? "Running..." : "Run paper worker"}
            </Button>
            <Button onClick={onRunForexPaperWorker} variant="secondary" disabled={runningForexPaper || !workspaceId.trim()}>
              {runningForexPaper ? "Running..." : "Run forex paper"}
            </Button>
            <Button onClick={() => onRunForexDemoWorker(forexDemoConfirmation)} variant="secondary" disabled={runningForexDemo || !workspaceId.trim()}>
              {runningForexDemo ? "Running..." : "Run forex demo"}
            </Button>
            <Button onClick={onRunForexDemoReconciliation} variant="secondary" disabled={reconcilingForexDemo || !workspaceId.trim()}>
              {reconcilingForexDemo ? "Reconciling..." : "Reconcile forex demo"}
            </Button>
            <Button onClick={onRunLiveSandboxWorker} variant="secondary" disabled={runningLiveSandbox || !workspaceId.trim()}>
              {runningLiveSandbox ? "Running..." : "Run testnet worker"}
            </Button>
            <Button onClick={onRunLiveSandboxReconciliation} variant="secondary" disabled={reconcilingLiveSandbox || !workspaceId.trim()}>
              {reconcilingLiveSandbox ? "Reconciling..." : "Reconcile testnet"}
            </Button>
            <Button onClick={onRunLiveProductionWorker} variant="secondary" disabled={runningLiveProduction || !workspaceId.trim()}>
              {runningLiveProduction ? "Running..." : "Run production dry-run"}
            </Button>
            <Button onClick={onRunCryptoLiveCohortDryRun} variant="secondary" disabled={runningCryptoLiveCohort || !workspaceId.trim()}>
              {runningCryptoLiveCohort ? "Checking..." : "Run crypto cohort dry-run"}
            </Button>
            <Button onClick={onRunLiveProductionReconciliation} variant="secondary" disabled={reconcilingLiveProduction || !workspaceId.trim()}>
              {reconcilingLiveProduction ? "Reconciling..." : "Reconcile production"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Forex demo confirmation</span>
            <input
              value={forexDemoConfirmation}
              onChange={(event) => setForexDemoConfirmation(event.target.value)}
              className={inputClass}
              placeholder="RUN_FOREX_DEMO"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Tiny live Forex canary</span>
            <input
              value={forexLiveCanaryConfirmation}
              onChange={(event) => setForexLiveCanaryConfirmation(event.target.value)}
              className={inputClass}
              placeholder="RUN_FOREX_LIVE_CANARY"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[color:var(--label)]">Cancel latest forex demo</span>
              <input
                value={forexDemoCancelConfirmation}
                onChange={(event) => setForexDemoCancelConfirmation(event.target.value)}
                className={inputClass}
                placeholder="CANCEL_FOREX_DEMO"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <Button
              onClick={() => onCancelForexDemoAttempt(latestForexDemoAttemptId, forexDemoCancelConfirmation)}
              variant="secondary"
              disabled={!workspaceId.trim() || !latestForexDemoAttemptId}
            >
              Cancel demo
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--red)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--red)_8%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Tiny live Forex canary</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Real money risk. Super Admin only; max one eligible production MetaAPI intent per run after env, paid billing, consent, allowlists, caps, quote, and kill-switch gates.
              </p>
            </div>
            <Badge tone="red">Real money risk</Badge>
          </div>
          <Button
            onClick={() => onRunForexLiveCanary(forexLiveCanaryConfirmation)}
            variant="secondary"
            disabled={runningForexLiveCanary || !workspaceId.trim() || forexLiveCanaryConfirmation !== "RUN_FOREX_LIVE_CANARY"}
          >
            {runningForexLiveCanary ? "Running..." : "Run tiny live Forex canary"}
          </Button>
        </div>

        {workspaceErrorMessage ? (
          <p className="break-safe rounded-[16px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--amber)]">
            {workspaceErrorMessage}
          </p>
        ) : null}

        <div className="space-y-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--amber)_8%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Controlled crypto live cohort</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Stage 25C checks a tiny crypto-only cohort candidate window in dry-run by default. It does not broaden live execution, does not include Forex, and cannot use external preview signals.
              </p>
            </div>
            <Badge tone="amber">Dry-run review</Badge>
          </div>
          <p className="break-safe text-xs leading-5 text-[color:var(--label3)]">
            Required gates remain Super Admin cohort approval env, cohort order-call env, production dry-run off, production vault readiness, paid Crypto AutoCopy, consent, connection readiness, kill switches off, and reconciliation posture.
          </p>
        </div>

        <div className="space-y-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--red)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--red)_8%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Production canary</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                One Super Admin-controlled real-money canary, max 5 USDT by default, only when env, vault, beta, dry-run, order-call, allowlist, consent, cap, and kill-switch gates all pass.
              </p>
            </div>
            <Badge tone="red">Typed confirmation</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[color:var(--label)]">Type RUN_LIVE_CANARY</span>
              <input
                value={canaryConfirmation}
                onChange={(event) => setCanaryConfirmation(event.target.value)}
                className={inputClass}
                placeholder="RUN_LIVE_CANARY"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <Button
              onClick={() => onRunLiveProductionCanary(canaryConfirmation)}
              variant="secondary"
              disabled={runningLiveProductionCanary || !workspaceId.trim() || canaryConfirmation !== "RUN_LIVE_CANARY"}
            >
              {runningLiveProductionCanary ? "Running..." : "Run production canary"}
            </Button>
          </div>
        </div>

        {workspaceOverview ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Workspace preview loaded: {workspaceOverview.workspaceId}
              </p>
              <Badge tone={workspaceOverview.workspaceControl.killSwitchEnabled ? "red" : "green"}>
                {workspaceOverview.workspaceControl.killSwitchEnabled ? "Workspace paused" : "Workspace active"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip label="Verified connections" value={String(workspaceOverview.summary.connectionCounts.verified)} tone="green" />
              <StatChip label="Paper ready students" value={String(workspaceOverview.summary.readinessCounts.paper_ready)} tone="amber" />
              <StatChip label="Recent failures" value={String(workspaceOverview.summary.recentFailureCount)} tone={workspaceOverview.summary.recentFailureCount > 0 ? "red" : "green"} />
              <StatChip label="Sampled connections" value={String(workspaceOverview.summary.sampledConnectionCount)} />
            </div>
            {workspaceOverview.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : (
          <p className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
            Platform crypto overview is intentionally zero-safe. Load a workspace preview to inspect support-safe paper execution activity.
          </p>
        )}

        {workspaceOverview?.summary.liveProduction ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Production readiness preflight</p>
                <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  Workspace-scoped gate checklist for production canary/beta. No credentials, vault refs, raw balances, or full exchange order IDs are returned.
                </p>
              </div>
              <Badge tone={workspaceOverview.summary.liveProduction.preflightReady ? "green" : "amber"}>
                {workspaceOverview.summary.liveProduction.preflightReady ? "Ready for operator review" : "Blocked"}
              </Badge>
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <StatChip
                label="Canary env"
                value={workspaceOverview.summary.liveProduction.env.productionCanaryEnabled ? "Enabled" : "Disabled"}
                tone={workspaceOverview.summary.liveProduction.env.productionCanaryEnabled ? "red" : "green"}
              />
              <StatChip
                label="Balance"
                value={workspaceOverview.summary.liveProduction.balancePrecheck.status.replace(/_/g, " ")}
                tone={workspaceOverview.summary.liveProduction.balancePrecheck.status === "sufficient" ? "green" : "amber"}
              />
              <StatChip
                label="Vault"
                value={workspaceOverview.summary.liveProduction.env.productionVaultReady ? "Ready" : "Blocked"}
                tone={workspaceOverview.summary.liveProduction.env.productionVaultReady ? "green" : "red"}
              />
              <StatChip
                label="Dry run"
                value={workspaceOverview.summary.liveProduction.env.productionDryRun ? "On" : "Off"}
                tone={workspaceOverview.summary.liveProduction.env.productionDryRun ? "amber" : "red"}
              />
            </div>
            <div className="bounded-list-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {workspaceOverview.summary.liveProduction.preflightChecks.map((check) => (
                <p key={check.key} className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                  <span className="font-semibold text-[color:var(--label)]">{check.label}: </span>
                  {check.safeMessage}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {workerResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last run: {workerResult.workspaceId}
              </p>
              <Badge tone={workerResult.bounded ? "amber" : "green"}>
                {workerResult.bounded ? "Bounded window reached" : "Bounded run complete"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(workerResult.candidateCount)} />
              <StatChip label="Processed" value={String(workerResult.processedCount)} tone="green" />
              <StatChip label="Completed paper" value={String(workerResult.completedPaperCount)} tone="green" />
              <StatChip label="Skipped" value={String(workerResult.skippedCount)} tone="amber" />
              <StatChip label="Failed" value={String(workerResult.failedCount)} tone={workerResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {workerResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {forexPaperWorkerResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last forex paper run: {forexPaperWorkerResult.workspaceId}
              </p>
              <Badge tone={forexPaperWorkerResult.bounded ? "amber" : "green"}>
                {forexPaperWorkerResult.bounded ? "Bounded window reached" : "Paper-only complete"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(forexPaperWorkerResult.candidateCount)} />
              <StatChip label="Processed" value={String(forexPaperWorkerResult.processedCount)} tone="green" />
              <StatChip label="Simulated" value={String(forexPaperWorkerResult.completedPaperCount)} tone="green" />
              <StatChip label="Skipped" value={String(forexPaperWorkerResult.skippedCount)} tone="amber" />
              <StatChip label="Failed" value={String(forexPaperWorkerResult.failedCount)} tone={forexPaperWorkerResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {forexPaperWorkerResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {forexDemoWorkerResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last forex demo run: {forexDemoWorkerResult.workspaceId}
              </p>
              <Badge tone={forexDemoWorkerResult.demoOrdersEnabled && !forexDemoWorkerResult.demoDryRun ? "amber" : "green"}>
                {forexDemoWorkerResult.demoOrdersEnabled && !forexDemoWorkerResult.demoDryRun ? "Demo calls gated" : "Dry run"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(forexDemoWorkerResult.candidateCount)} />
              <StatChip label="Processed" value={String(forexDemoWorkerResult.processedCount)} tone="green" />
              <StatChip label="Dry runs" value={String(forexDemoWorkerResult.dryRunCount)} tone="amber" />
              <StatChip label="Submitted" value={String(forexDemoWorkerResult.submittedCount)} tone="green" />
              <StatChip label="Failed" value={String(forexDemoWorkerResult.failedCount)} tone={forexDemoWorkerResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {forexDemoWorkerResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {forexDemoReconciliationResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last forex demo reconciliation: {forexDemoReconciliationResult.workspaceId}
              </p>
              <Badge tone={forexDemoReconciliationResult.requiresReviewCount > 0 ? "amber" : "green"}>
                {forexDemoReconciliationResult.requiresReviewCount > 0 ? "Review needed" : "Reconciled"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip label="Candidates" value={String(forexDemoReconciliationResult.candidateCount)} />
              <StatChip label="Reconciled" value={String(forexDemoReconciliationResult.reconciledCount)} tone="green" />
              <StatChip label="Review" value={String(forexDemoReconciliationResult.requiresReviewCount)} tone="amber" />
              <StatChip label="Failed" value={String(forexDemoReconciliationResult.failedCount)} tone={forexDemoReconciliationResult.failedCount > 0 ? "red" : "green"} />
            </div>
          </div>
        ) : null}

        {forexDemoCancelResult ? (
          <p className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
            Forex demo cancel: {forexDemoCancelResult.safeMessage} ({forexDemoCancelResult.status.replace(/_/g, " ")})
          </p>
        ) : null}

        {forexLiveCanaryResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last tiny live Forex canary: {forexLiveCanaryResult.workspaceId}
              </p>
              <Badge tone={forexLiveCanaryResult.liveOrdersEnabled && !forexLiveCanaryResult.liveDryRun ? "red" : "green"}>
                {forexLiveCanaryResult.liveOrdersEnabled && !forexLiveCanaryResult.liveDryRun ? "Live calls gated" : "Dry run"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(forexLiveCanaryResult.candidateCount)} />
              <StatChip label="Processed" value={String(forexLiveCanaryResult.processedCount)} tone="green" />
              <StatChip label="Dry runs" value={String(forexLiveCanaryResult.dryRunCount)} tone="amber" />
              <StatChip label="Submitted" value={String(forexLiveCanaryResult.submittedCount)} tone="red" />
              <StatChip label="Failed" value={String(forexLiveCanaryResult.failedCount)} tone={forexLiveCanaryResult.failedCount > 0 ? "red" : "green"} />
            </div>
          </div>
        ) : null}

        {liveSandboxWorkerResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last testnet worker: {liveSandboxWorkerResult.workspaceId}
              </p>
              <Badge tone={liveSandboxWorkerResult.testnetOrdersEnabled ? "green" : "amber"}>
                {liveSandboxWorkerResult.testnetOrdersEnabled ? "Testnet calls enabled" : "Dry run"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(liveSandboxWorkerResult.candidateCount)} />
              <StatChip label="Processed" value={String(liveSandboxWorkerResult.processedCount)} tone="green" />
              <StatChip label="Submitted" value={String(liveSandboxWorkerResult.submittedCount)} tone="green" />
              <StatChip label="Skipped" value={String(liveSandboxWorkerResult.skippedCount)} tone="amber" />
              <StatChip label="Failed" value={String(liveSandboxWorkerResult.failedCount)} tone={liveSandboxWorkerResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {liveSandboxWorkerResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {liveSandboxReconciliationResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last testnet reconciliation: {liveSandboxReconciliationResult.workspaceId}
              </p>
              <Badge tone={liveSandboxReconciliationResult.requiresReviewCount > 0 ? "amber" : "green"}>
                {liveSandboxReconciliationResult.requiresReviewCount > 0 ? "Review needed" : "Reconciled"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip label="Candidates" value={String(liveSandboxReconciliationResult.candidateCount)} />
              <StatChip label="Reconciled" value={String(liveSandboxReconciliationResult.reconciledCount)} tone="green" />
              <StatChip label="Review" value={String(liveSandboxReconciliationResult.requiresReviewCount)} tone="amber" />
              <StatChip label="Failed" value={String(liveSandboxReconciliationResult.failedCount)} tone={liveSandboxReconciliationResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {liveSandboxReconciliationResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {liveProductionWorkerResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last production worker: {liveProductionWorkerResult.workspaceId}
              </p>
              <Badge tone={liveProductionWorkerResult.env.productionDryRun ? "amber" : "red"}>
                {liveProductionWorkerResult.env.productionDryRun ? "Dry run" : "Order-call mode"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(liveProductionWorkerResult.candidateCount)} />
              <StatChip label="Processed" value={String(liveProductionWorkerResult.processedCount)} tone="green" />
              <StatChip label="Dry runs" value={String(liveProductionWorkerResult.dryRunCount)} tone="amber" />
              <StatChip label="Skipped" value={String(liveProductionWorkerResult.skippedCount)} tone="amber" />
              <StatChip label="Failed" value={String(liveProductionWorkerResult.failedCount)} tone={liveProductionWorkerResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {liveProductionWorkerResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {cryptoLiveCohortResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last crypto cohort dry-run: {cryptoLiveCohortResult.workspaceId}
              </p>
              <Badge tone={cryptoLiveCohortResult.submittedCount > 0 ? "red" : "amber"}>
                {cryptoLiveCohortResult.cohortStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StatChip label="Candidates" value={String(cryptoLiveCohortResult.candidateCount)} />
              <StatChip label="Dry runs" value={String(cryptoLiveCohortResult.dryRunCount)} tone="amber" />
              <StatChip label="Blocked" value={String(cryptoLiveCohortResult.blockedCount)} tone={cryptoLiveCohortResult.blockedCount > 0 ? "red" : "green"} />
              <StatChip label="Skipped" value={String(cryptoLiveCohortResult.skippedCount)} tone="amber" />
              <StatChip label="Submitted" value={String(cryptoLiveCohortResult.submittedCount)} tone={cryptoLiveCohortResult.submittedCount > 0 ? "red" : "green"} />
              <StatChip label="Limit" value={String(cryptoLiveCohortResult.candidateLimit)} />
            </div>
            <div className="bounded-list-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {cryptoLiveCohortResult.candidates.map((candidate) => (
                <div key={candidate.candidateRef} className="space-y-2 rounded-[16px] border border-[color:var(--line)] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{candidate.symbol} {candidate.side}</p>
                    <Badge tone={candidate.status === "dry_run" ? "green" : candidate.status === "blocked" || candidate.status === "failed" ? "red" : "amber"}>
                      {candidate.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="break-safe text-xs leading-5 text-[color:var(--label3)]">
                    {candidate.candidateRef} / {candidate.exchange} / {candidate.orderType} / {candidate.notionalUsdt} USDT
                  </p>
                  <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">{candidate.safeReason}</p>
                </div>
              ))}
            </div>
            <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
              {cryptoLiveCohortResult.rollbackNote}
            </p>
            {cryptoLiveCohortResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {liveProductionCanaryResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:color-mix(in_srgb,var(--red)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last production canary: {liveProductionCanaryResult.workspaceId}
              </p>
              <Badge tone={liveProductionCanaryResult.submittedCount > 0 ? "red" : "amber"}>
                {liveProductionCanaryResult.submittedCount > 0 ? "Canary submitted" : "Canary blocked"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Candidates" value={String(liveProductionCanaryResult.candidateCount)} />
              <StatChip label="Processed" value={String(liveProductionCanaryResult.processedCount)} tone="green" />
              <StatChip label="Submitted" value={String(liveProductionCanaryResult.submittedCount)} tone={liveProductionCanaryResult.submittedCount > 0 ? "red" : "green"} />
              <StatChip label="Skipped" value={String(liveProductionCanaryResult.skippedCount)} tone="amber" />
              <StatChip label="Failed" value={String(liveProductionCanaryResult.failedCount)} tone={liveProductionCanaryResult.failedCount > 0 ? "red" : "green"} />
            </div>
            {liveProductionCanaryResult.warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">{warning}</p>
            ))}
          </div>
        ) : null}

        {liveProductionReconciliationResult ? (
          <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                Last production reconciliation: {liveProductionReconciliationResult.workspaceId}
              </p>
              <Badge tone={liveProductionReconciliationResult.requiresReviewCount > 0 ? "amber" : "green"}>
                {liveProductionReconciliationResult.requiresReviewCount > 0 ? "Review needed" : "No unsettled records"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip label="Candidates" value={String(liveProductionReconciliationResult.candidateCount)} />
              <StatChip label="Reconciled" value={String(liveProductionReconciliationResult.reconciledCount)} tone="green" />
              <StatChip label="Review" value={String(liveProductionReconciliationResult.requiresReviewCount)} tone="amber" />
              <StatChip label="Failed" value={String(liveProductionReconciliationResult.failedCount)} tone={liveProductionReconciliationResult.failedCount > 0 ? "red" : "green"} />
            </div>
          </div>
        ) : null}
      </GlassCard>

      {previewOverview ? (
        <>
          <BroadLiveAutoCopyReadinessCard
            title={workspaceOverview ? `Broad live AutoCopy readiness: ${workspaceOverview.workspaceId}` : "Broad live AutoCopy readiness"}
            subtitle={
              workspaceOverview
                ? "Workspace-scoped launch-gate audit for future controlled live rollout. Stage 25A does not enable broad live order execution."
                : "Platform-level zero-safe launch-gate audit. Load a workspace for bounded student and workspace readiness checks."
            }
            readiness={previewOverview.summary.broadLiveReadiness}
          />

          <PaperExecutionPreview
            title={previewTitle}
            subtitle={previewSubtitle}
            routing={previewOverview.summary.paperRouting}
            preview={previewOverview.summary.paperExecution}
          />
          {previewOverview.summary.accountLinkedDiagnostics ? (
            <GlassCard className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow !text-[color:var(--label3)]">Account-linked ledger diagnostics</p>
                  <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
                    Support-safe journal and AutoCopy ledger
                  </h2>
                  <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                    Recent protected ledger entries, source/status counts, failure counts, and account readiness. No secrets, raw provider payloads, vault refs, or full external IDs are returned.
                  </p>
                </div>
                <Badge tone={previewOverview.summary.accountLinkedDiagnostics.bounded ? "amber" : "green"}>
                  {previewOverview.summary.accountLinkedDiagnostics.bounded ? "Bounded" : "Support-safe"}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatChip label="Failures" value={String(previewOverview.summary.accountLinkedDiagnostics.failureCount)} tone={previewOverview.summary.accountLinkedDiagnostics.failureCount > 0 ? "red" : "green"} />
                <StatChip label="Recent entries" value={String(previewOverview.summary.accountLinkedDiagnostics.recentEntries.length)} />
                <StatChip label="Crypto linked" value={String(previewOverview.summary.accountLinkedDiagnostics.accountReadinessCounts.cryptoLinked)} tone="green" />
                <StatChip label="Forex linked" value={String(previewOverview.summary.accountLinkedDiagnostics.accountReadinessCounts.forexLinked)} tone="green" />
              </div>
            </GlassCard>
          ) : null}
          <ForexPaperExecutionPreviewCard
            title={workspaceOverview ? `Workspace Forex Paper Auto-Copy: ${workspaceOverview.workspaceId}` : "Platform Forex Paper Auto-Copy is workspace-scoped"}
            subtitle={workspaceOverview
              ? "Workspace-scoped forex paper intents, confirmation records, simulated attempts, risk decisions, and audit events."
              : "Select a workspace ID to inspect forex paper simulation records. Platform overview does not scan workspace execution collections."}
            preview={previewOverview.summary.forexPaper}
          />
          <ForexProvisioningPreviewCard
            title={workspaceOverview ? `Workspace Forex AutoCopy Provisioning: ${workspaceOverview.workspaceId}` : "Platform Forex AutoCopy provisioning is workspace-scoped"}
            subtitle={workspaceOverview
              ? "Workspace-scoped paid Forex AutoCopy provisioning requests, mock provisioned accounts, cleanup state, and support-safe audit. Broker passwords, raw broker server/login, MetaAPI IDs, vault refs, and provider payloads are hidden."
              : "Select a workspace ID to inspect billing-gated Forex AutoCopy provisioning. Platform overview does not scan student provisioning collections."}
            preview={previewOverview.summary.forexProvisioning}
            showAudit
          />
          <ForexConnectionReadinessCard
            title={workspaceOverview ? `Workspace Forex Connection Ops: ${workspaceOverview.workspaceId}` : "Platform Forex Connections are workspace-scoped"}
            subtitle={workspaceOverview
              ? "Super Admin diagnostic proof-lane metadata for legacy/demo readiness. Normal student product flow uses billing-gated MT4/MT5 provisioning instead."
              : "Select a workspace ID to inspect forex connection readiness. Platform overview does not scan student connection collections."}
            preview={previewOverview.summary.forexConnections}
          />
          <ForexDemoExecutionPreviewCard
            title={workspaceOverview ? `Workspace Forex Demo Proof: ${workspaceOverview.workspaceId}` : "Platform Forex Demo Proof is workspace-scoped"}
            subtitle={workspaceOverview
              ? "Workspace-scoped MetaAPI demo-only intents, dry-run/demo attempts, reconciliation, gate decisions, and audit events."
              : "Select a workspace ID to inspect forex demo proof records. Platform overview does not scan workspace execution collections."}
            preview={previewOverview.summary.forexDemo}
            showAudit
          />
          <ForexLiveCanaryPreviewCard
            title={workspaceOverview ? `Workspace tiny live Forex canary: ${workspaceOverview.workspaceId}` : "Platform tiny live Forex canary is workspace-scoped"}
            subtitle={workspaceOverview
              ? "Workspace-scoped live Forex canary intents, attempts, gate decisions, and audit records."
              : "Select a workspace ID to inspect tiny live Forex canary records. Platform overview does not scan workspace execution collections."}
            preview={previewOverview.summary.forexLiveCanary}
          />
          <LiveSandboxExecutionPreviewCard
            title={workspaceOverview ? `Workspace Testnet Proof: ${workspaceOverview.workspaceId}` : "Platform Testnet Proof is workspace-scoped"}
            subtitle={workspaceOverview
              ? "Workspace-scoped testnet intents, exchange activity, reconciliation, and audit records."
              : "Select a workspace ID to inspect testnet records. Platform overview does not scan workspace execution collections."}
            preview={previewOverview.summary.liveSandbox}
          />
          <LiveProductionExecutionPreviewCard
            title={workspaceOverview ? `Workspace production beta: ${workspaceOverview.workspaceId}` : "Platform production beta is workspace-scoped"}
            subtitle={workspaceOverview
              ? "Workspace-scoped production live beta intents, dry-run attempts, reconciliation, and audit records."
              : "Select a workspace ID to inspect production beta records. Platform overview does not scan workspace execution collections."}
            preview={previewOverview.summary.liveProduction}
          />
        </>
      ) : null}
    </section>
  );
}
