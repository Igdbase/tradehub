import { productSafeText } from "@/components/crypto-execution/display-safety";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  BroadLiveAutoCopyCohortStatus,
  BroadLiveAutoCopyIncidentPostureStatus,
  BroadLiveAutoCopyIncidentStreamSummary,
  BroadLiveAutoCopyLaunchGateState,
  BroadLiveAutoCopyReadinessCheck,
  BroadLiveAutoCopyReadinessCheckStatus,
  BroadLiveAutoCopyReadinessOverview,
  StudentBroadLiveAutoCopyStatus
} from "@/types/crypto-execution";

function gateTone(state: BroadLiveAutoCopyLaunchGateState) {
  if (state === "broad_live_ready" || state === "cohort_ready") {
    return "green" as const;
  }

  if (state === "blocked") {
    return "red" as const;
  }

  return "amber" as const;
}

function checkTone(status: BroadLiveAutoCopyReadinessCheckStatus) {
  if (status === "ready") {
    return "green" as const;
  }

  if (status === "blocked") {
    return "red" as const;
  }

  return "amber" as const;
}

function formatState(state: BroadLiveAutoCopyLaunchGateState) {
  return state.replace(/_/g, " ");
}

function cohortTone(status: BroadLiveAutoCopyCohortStatus) {
  if (status === "approved_for_cohort" || status === "eligible_for_review") {
    return "green" as const;
  }

  if (status === "blocked" || status === "cohort_removed") {
    return "red" as const;
  }

  return "amber" as const;
}

function incidentTone(status: BroadLiveAutoCopyIncidentPostureStatus) {
  if (status === "ready") {
    return "green" as const;
  }

  if (status === "blocked" || status === "needs_review") {
    return "red" as const;
  }

  return "amber" as const;
}

function formatCohortStatus(status: BroadLiveAutoCopyCohortStatus) {
  return status.replace(/_/g, " ");
}

function CheckRow({ check }: { check: BroadLiveAutoCopyReadinessCheck }) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_50%,transparent)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{check.label}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--label3)]">
            {check.market} / {check.scope}
          </p>
        </div>
        <Badge tone={checkTone(check.status)}>{check.status}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(check.safeMessage)}
      </p>
    </div>
  );
}

function IncidentStreamCard({ stream }: { stream: BroadLiveAutoCopyIncidentStreamSummary }) {
  return (
    <div className="space-y-3 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_50%,transparent)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{stream.label}</p>
        <Badge tone={incidentTone(stream.status)}>{stream.status.replace(/_/g, " ")}</Badge>
      </div>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(82px,1fr))]">
        <StatChip label="Stale" value={String(stream.staleAttemptCount)} tone={stream.staleAttemptCount > 0 ? "amber" : "green"} />
        <StatChip label="Review" value={String(stream.requiresReviewCount)} tone={stream.requiresReviewCount > 0 ? "red" : "green"} />
        <StatChip label="Blocked" value={String(stream.blockedCount)} tone={stream.blockedCount > 0 ? "red" : "green"} />
      </div>
      {stream.latestSafeMessage ? (
        <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
          {productSafeText(stream.latestSafeMessage)}
        </p>
      ) : null}
    </div>
  );
}

export function BroadLiveAutoCopyReadinessCard({
  readiness,
  title,
  subtitle,
  showRunbook = true
}: {
  readiness?: BroadLiveAutoCopyReadinessOverview;
  title: string;
  subtitle: string;
  showRunbook?: boolean;
}) {
  if (!readiness) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Stage 25A launch gates</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone={gateTone(readiness.state)}>{readiness.stateLabel}</Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <StatChip label="Broad gate" value={readiness.broadLiveEnabled ? "Enabled" : "Blocked"} tone={readiness.broadLiveEnabled ? "amber" : "green"} />
        <StatChip label="Crypto" value={formatState(readiness.cryptoState)} tone={gateTone(readiness.cryptoState)} />
        <StatChip label="Forex" value={formatState(readiness.forexState)} tone={gateTone(readiness.forexState)} />
        <StatChip label="Scope" value={readiness.workspaceId ? "Workspace" : readiness.scope} />
      </div>

      {readiness.cohortGate ? (
        <div className="space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_46%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Controlled live cohort gate</p>
              <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                Review-only cohort posture for future limited rollout. Approval does not place live orders by itself.
              </p>
            </div>
            <Badge tone={cohortTone(readiness.cohortGate.status)}>
              {readiness.cohortGate.statusLabel}
            </Badge>
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            <StatChip
              label="Approvals"
              value={readiness.cohortGate.approvalsEnabled ? "Enabled" : "Disabled"}
              tone={readiness.cohortGate.approvalsEnabled ? "amber" : "green"}
            />
            <StatChip
              label="Order calls"
              value={readiness.cohortGate.orderCallsEnabled ? "Enabled" : "Disabled"}
              tone={readiness.cohortGate.orderCallsEnabled ? "red" : "green"}
            />
            <StatChip
              label="Dry-run"
              value={readiness.cohortGate.dryRun ? "On" : "Off"}
              tone={readiness.cohortGate.dryRun ? "amber" : "red"}
            />
            <StatChip label="Eligible" value={String(readiness.cohortGate.eligibleCandidateCount)} tone="amber" />
            <StatChip label="Blocked" value={String(readiness.cohortGate.blockedCandidateCount)} tone={readiness.cohortGate.blockedCandidateCount > 0 ? "red" : "green"} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {readiness.cohortGate.checks.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </div>
          {readiness.cohortGate.warnings.map((warning) => (
            <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-xs leading-5 text-[color:var(--label2)]">
              {productSafeText(warning)}
            </p>
          ))}
        </div>
      ) : null}

      {readiness.incidentReadiness ? (
        <div className="space-y-4 rounded-[20px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--amber)_7%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Live AutoCopy support, incident, and rollback posture</p>
              <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                Support-safe readiness for crypto production/canary, crypto cohort dry-run, and Forex live canary. This panel records no orders and exposes no provider internals.
              </p>
            </div>
            <Badge tone={incidentTone(readiness.incidentReadiness.status)}>
              {readiness.incidentReadiness.statusLabel}
            </Badge>
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <IncidentStreamCard stream={readiness.incidentReadiness.cryptoProduction} />
            <IncidentStreamCard stream={readiness.incidentReadiness.cryptoCohortDryRun} />
            <IncidentStreamCard stream={readiness.incidentReadiness.forexLiveCanary} />
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            <StatChip
              label="Platform kill"
              value={readiness.incidentReadiness.killSwitchStatus.platform}
              tone={readiness.incidentReadiness.killSwitchStatus.platform === "active" ? "red" : "green"}
            />
            <StatChip
              label="Workspace kill"
              value={readiness.incidentReadiness.killSwitchStatus.workspace}
              tone={readiness.incidentReadiness.killSwitchStatus.workspace === "active" ? "red" : "green"}
            />
            <StatChip
              label="Crypto calls"
              value={readiness.incidentReadiness.dryRunOrderCallPosture.cryptoProduction.replace(/_/g, " ")}
              tone={readiness.incidentReadiness.dryRunOrderCallPosture.cryptoProduction === "order_calls_possible" ? "red" : "green"}
            />
            <StatChip
              label="Cohort calls"
              value={readiness.incidentReadiness.dryRunOrderCallPosture.cryptoCohort.replace(/_/g, " ")}
              tone={readiness.incidentReadiness.dryRunOrderCallPosture.cryptoCohort === "order_calls_possible" ? "red" : "green"}
            />
            <StatChip
              label="Forex calls"
              value={readiness.incidentReadiness.dryRunOrderCallPosture.forexLiveCanary.replace(/_/g, " ")}
              tone={readiness.incidentReadiness.dryRunOrderCallPosture.forexLiveCanary === "order_calls_possible" ? "red" : "green"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[18px] border border-[color:var(--line)] p-4">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Rollback checklist</p>
              <ul className="mt-3 space-y-2">
                {readiness.incidentReadiness.rollbackChecklist.map((item) => (
                  <li key={item} className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                    {productSafeText(item)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[18px] border border-[color:var(--line)] p-4">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Incident checklist</p>
              <ul className="mt-3 space-y-2">
                {readiness.incidentReadiness.incidentChecklist.map((item) => (
                  <li key={item} className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                    {productSafeText(item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
            {readiness.incidentReadiness.auditSummary.map((entry) => (
              <div key={entry.label} className="rounded-[16px] border border-[color:var(--line)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="break-safe text-xs font-semibold text-[color:var(--label)]">{entry.label}</p>
                  <Badge tone={entry.count > 0 ? "amber" : "green"}>{entry.count}</Badge>
                </div>
                <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  {productSafeText(entry.safeMessage)}
                </p>
              </div>
            ))}
          </div>

          <p className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-xs leading-5 text-[color:var(--label2)]">
            {productSafeText(readiness.incidentReadiness.supportNotePolicy.safeMessage)} Max length: {readiness.incidentReadiness.supportNotePolicy.maxLength} chars.
          </p>

          {readiness.incidentReadiness.warnings.map((warning) => (
            <p key={warning} className="break-safe text-xs leading-5 text-[color:var(--label2)]">
              {productSafeText(warning)}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {readiness.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </div>

      {readiness.warnings.map((warning) => (
        <p
          key={warning}
          className="break-safe rounded-[16px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]"
        >
          {productSafeText(warning)}
        </p>
      ))}

      {showRunbook ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {readiness.runbooks.map((section) => (
            <div key={section.title} className="rounded-[18px] border border-[color:var(--line)] p-4">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{section.title}</p>
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                    {productSafeText(item)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </GlassCard>
  );
}

export function StudentBroadLiveAutoCopyStatusCard({
  status
}: {
  status?: StudentBroadLiveAutoCopyStatus;
}) {
  if (!status) {
    return null;
  }

  return (
    <GlassCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Broad live AutoCopy</p>
          <h2 className="mt-2 break-safe text-lg font-semibold text-[color:var(--label)]">
            Launch status
          </h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            {productSafeText(status.safeMessage)}
          </p>
        </div>
        <Badge tone={gateTone(status.state)}>{status.stateLabel}</Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Crypto" value={formatState(status.cryptoState)} tone={gateTone(status.cryptoState)} />
        <StatChip label="Forex" value={formatState(status.forexState)} tone={gateTone(status.forexState)} />
        {status.cohortStatus ? (
          <StatChip
            label="Cohort"
            value={formatCohortStatus(status.cohortStatus)}
            tone={cohortTone(status.cohortStatus)}
          />
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {status.visibleChecks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </div>
    </GlassCard>
  );
}
