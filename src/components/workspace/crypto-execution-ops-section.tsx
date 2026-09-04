import { PaperExecutionPreview } from "@/components/crypto-execution/paper-execution-preview";
import { ForexDemoExecutionPreviewCard } from "@/components/crypto-execution/forex-demo-execution-preview";
import { ForexPaperExecutionPreviewCard } from "@/components/crypto-execution/forex-paper-execution-preview";
import { ForexProvisioningPreviewCard } from "@/components/crypto-execution/forex-provisioning-preview";
import { BroadLiveAutoCopyReadinessCard } from "@/components/crypto-execution/broad-live-autocopy-readiness";
import { LiveProductionExecutionPreviewCard } from "@/components/crypto-execution/live-production-execution-preview";
import { LiveSandboxExecutionPreviewCard } from "@/components/crypto-execution/live-sandbox-execution-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type { WorkspaceCryptoExecutionOverviewResponse } from "@/types/crypto-execution";

export function CryptoExecutionOpsSection({
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow !text-[color:var(--label3)]">Crypto Auto-Copy</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">Execution readiness</h2>
          </div>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </Button>
        </div>
        <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "Workspace crypto execution data has not loaded yet."}
        </p>
      </GlassCard>
    );
  }

  return (
    <section className="space-y-4">
      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow !text-[color:var(--label3)]">Crypto Auto-Copy</p>
            <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
              Workspace execution health
            </h2>
            <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Crypto paper/testnet/Production Beta state and forex paper simulation posture for this workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={overview.workspaceControl.killSwitchEnabled ? "red" : "green"}>
              {overview.workspaceControl.killSwitchEnabled ? "Workspace paused" : "Workspace active"}
            </Badge>
            <Badge tone={overview.workspaceControl.sandboxOnly ? "amber" : "green"}>
              {overview.workspaceControl.sandboxOnly ? "Sandbox only" : "Sandbox control off"}
            </Badge>
            <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatChip label="Verified connections" value={String(overview.summary.connectionCounts.verified)} tone="green" />
          <StatChip label="Paper ready students" value={String(overview.summary.readinessCounts.paper_ready)} tone="amber" />
          <StatChip label="Recent blocks" value={String(overview.summary.recentFailureCount)} tone={overview.summary.recentFailureCount > 0 ? "red" : "green"} />
          <StatChip label="Sampled students" value={String(overview.summary.sampledConnectionCount)} />
        </div>
        {overview.warnings.map((warning) => (
          <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
            {warning}
          </p>
        ))}
      </GlassCard>

      <BroadLiveAutoCopyReadinessCard
        title="Broad live AutoCopy readiness"
        subtitle="Workspace-safe launch-gate summary for future controlled live rollout. This is audit-only and does not enable broad live order execution."
        readiness={overview.summary.broadLiveReadiness}
        showRunbook={false}
      />

      <PaperExecutionPreview
        title="Workspace Paper Auto-Copy"
        subtitle="Bounded paper intents, simulated activity, risk decisions, and audit events for this workspace."
        routing={overview.summary.paperRouting}
        preview={overview.summary.paperExecution}
      />

      {overview.summary.accountLinkedPerformance ? (
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow !text-[color:var(--label3)]">Account-linked journal</p>
              <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
                Bounded AutoCopy performance summary
              </h2>
              <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Aggregate copied-signal outcomes and journal readiness only. Private trade notes and raw account records are not exposed.
              </p>
            </div>
            <Badge tone={overview.summary.accountLinkedPerformance.bounded ? "amber" : "green"}>
              {overview.summary.accountLinkedPerformance.bounded ? "Bounded sample" : "Within limit"}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatChip label="Active journals" value={String(overview.summary.accountLinkedPerformance.activeJournalSummaryCount)} tone="green" />
            <StatChip label="AutoCopy students" value={String(overview.summary.accountLinkedPerformance.autoCopyActivityStudentCount)} />
            <StatChip label="Failed copied attempts" value={String(overview.summary.accountLinkedPerformance.studentsNeedingAttention.failedAutoCopyAttempts)} tone={overview.summary.accountLinkedPerformance.studentsNeedingAttention.failedAutoCopyAttempts > 0 ? "red" : "green"} />
            <StatChip label="Locked setup" value={String(overview.summary.accountLinkedPerformance.studentsNeedingAttention.lockedSetup)} tone="amber" />
          </div>
        </GlassCard>
      ) : null}

      <ForexPaperExecutionPreviewCard
        title="Workspace Forex Paper Auto-Copy"
        subtitle="Bounded forex paper intents, confirmation records, simulated attempts, and risk decisions. No broker or MetaAPI execution is active."
        preview={overview.summary.forexPaper}
      />

      <ForexProvisioningPreviewCard
        title="Workspace Forex AutoCopy provisioning"
        subtitle="Billing-gated MT4/MT5 provisioning counts for this workspace. Influencers see readiness counts only, never broker login, passwords, raw server values, provider account refs, or payloads."
        preview={overview.summary.forexProvisioning}
        showAudit={false}
      />

      <ForexDemoExecutionPreviewCard
        title="Workspace Forex Demo Proof"
        subtitle="Bounded demo-only proof records for this workspace. Demo calls require paid provisioning and Super Admin gates; production/live broker execution remains unavailable."
        preview={overview.summary.forexDemo}
      />

      <LiveSandboxExecutionPreviewCard
        title="Workspace Testnet Proof"
        subtitle="Bounded Binance/Bybit testnet lifecycle activity, reconciliation records, and audit events for this workspace."
        preview={overview.summary.liveSandbox}
      />

      <LiveProductionExecutionPreviewCard
        title="Workspace Production Beta"
        subtitle="Gated Production Beta intents, dry-run records, reconciliation, and support-safe audit events for this workspace."
        preview={overview.summary.liveProduction}
      />
    </section>
  );
}
