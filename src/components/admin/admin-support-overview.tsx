"use client";

import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type { AdminCryptoExecutionOverviewResponse } from "@/types/crypto-execution";
import type { AdminOverviewResponse } from "@/types/admin-api";
import type { AdminPaymentsOverviewResponse } from "@/types/payments";

function issueTone(count: number) {
  return count > 0 ? "amber" as const : "green" as const;
}

export function AdminSupportOverview({
  overview,
  payments,
  cryptoExecution
}: {
  overview: AdminOverviewResponse | null;
  payments: AdminPaymentsOverviewResponse | null;
  cryptoExecution: AdminCryptoExecutionOverviewResponse | null;
}) {
  const pendingApplications = overview?.summary.pendingApplicationCount ?? 0;
  const paymentIssues =
    payments?.opsSummary.paymentSupportQueueCount ??
    ((payments?.latestPaymentIntents ?? []).filter((intent) =>
        intent.status === "failed" ||
        intent.status === "expired" ||
        intent.status === "cancelled" ||
        intent.status === "abandoned"
      ).length + (payments?.opsSummary.pendingSolanaPayoutCount ?? 0));
  const workspaceReadinessIssues =
    (overview?.summary.openDisputeCount ?? 0) +
    (overview?.summary.riskFlagCount ?? 0) +
    (overview?.warnings?.length ?? 0);
  const autoCopyGateBlocks =
    (cryptoExecution?.summary.workspaceKillSwitchCount ?? 0) +
    (cryptoExecution?.summary.riskyWorkspaceCount ?? 0) +
    (cryptoExecution?.summary.recentFailureCount ?? 0);
  const deferredMvpQa = 2;

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Stage 20A support audit</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Safe operator issue summary
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            This overview is aggregate-only. It does not show raw payment payloads, private journal
            entries, private course notes, practice trades, provider payloads, vault references, account
            IDs, credentials, broker passwords, or answer keys.
          </p>
        </div>
        <Badge tone={pendingApplications + paymentIssues + autoCopyGateBlocks > 0 ? "amber" : "green"}>
          View only
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <StatChip label="Pending apps" value={String(pendingApplications)} tone={issueTone(pendingApplications)} />
        <StatChip label="Payment issues" value={String(paymentIssues)} tone={issueTone(paymentIssues)} />
        <StatChip
          label="Workspace readiness"
          value={String(workspaceReadinessIssues)}
          detail="disputes, flags, warnings"
          tone={issueTone(workspaceReadinessIssues)}
        />
        <StatChip
          label="AutoCopy blocks"
          value={String(autoCopyGateBlocks)}
          detail="gates and failures"
          tone={issueTone(autoCopyGateBlocks)}
        />
        <StatChip
          label="MVP browser QA"
          value={String(deferredMvpQa)}
          detail="practice + courses deferred"
          tone="amber"
        />
      </div>

      <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
        Use the existing application, payment support queue, reconciliation, execution, audit-log,
        and trust/safety panels for follow-up. Stage 20C adds no refunds, payouts, messaging,
        credential flows, entitlement shortcuts, or live execution actions.
      </p>
    </GlassCard>
  );
}
