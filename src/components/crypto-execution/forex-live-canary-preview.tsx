import { productSafeText } from "@/components/crypto-execution/display-safety";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  ForexLiveCanaryExecutionPreview,
  ForexLiveCanaryGateDecisionSummary,
  ForexLiveCanaryIntentSummary,
  ForexLiveCanaryOrderAttemptSummary
} from "@/types/crypto-execution";

function statusTone(status: string) {
  if (status.includes("filled") || status.includes("submitted")) {
    return "green" as const;
  }

  if (status.includes("failed") || status.includes("blocked")) {
    return "red" as const;
  }

  return "amber" as const;
}

function shortRef(value?: string) {
  if (!value) {
    return "unknown";
  }

  return value.length <= 14 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-[18px] border border-dashed border-[color:var(--line)] px-4 py-5 text-sm leading-6 text-[color:var(--label2)]">
      {label}
    </p>
  );
}

function IntentRow({ intent }: { intent: ForexLiveCanaryIntentSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {intent.pair || "Forex"} tiny live canary - {intent.side}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Intent {shortRef(intent.intentId)} / real money risk / ${intent.requestedNotionalUsd.toFixed(2)}
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{intent.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: ForexLiveCanaryOrderAttemptSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {attempt.pair || "Forex"} live canary attempt
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Attempt {shortRef(attempt.attemptId)}{attempt.providerOrderRef ? ` / Provider ${attempt.providerOrderRef}` : ""}
          </p>
        </div>
        <Badge tone={statusTone(attempt.status)}>{attempt.status.replace(/_/g, " ")}</Badge>
      </div>
      {attempt.sanitizedFailureReason ? (
        <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--amber)]">
          {productSafeText(attempt.sanitizedFailureReason)}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(attempt.updatedAt)}</p>
    </div>
  );
}

function DecisionRow({ decision }: { decision: ForexLiveCanaryGateDecisionSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
          {decision.pair || "Forex"} canary gate
        </p>
        <Badge tone={statusTone(decision.status)}>{decision.failedCheckKeys.length} flags</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(decision.blockedReason) || decision.failedCheckKeys.join(", ") || `${decision.checkCount} checks recorded`}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Decided {formatDate(decision.decidedAt)}</p>
    </div>
  );
}

export function ForexLiveCanaryPreviewCard({
  title,
  subtitle,
  preview
}: {
  title: string;
  subtitle: string;
  preview?: ForexLiveCanaryExecutionPreview;
}) {
  if (!preview) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Tiny live canary</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            {subtitle} Real money risk; only safe summaries are shown.
          </p>
        </div>
        <Badge tone={preview.env.liveCanaryEnabled && preview.env.liveOrderCallsEnabled && !preview.env.liveDryRun ? "red" : "green"}>
          {preview.env.liveCanaryEnabled && preview.env.liveOrderCallsEnabled && !preview.env.liveDryRun ? "Live canary gated" : "Disabled/dry-run"}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Ready canary" value={String(preview.routing.readyCount)} tone="amber" />
        <StatChip label="Dry runs" value={String(preview.routing.dryRunCount)} tone="amber" />
        <StatChip label="Submitted" value={String(preview.routing.submittedCount)} tone="red" />
        <StatChip label="Gate blocks" value={String(preview.routing.blockedCount)} tone={preview.routing.blockedCount > 0 ? "amber" : "green"} />
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Canary intents</p>
          <div className="bounded-list-4 space-y-3">
            {preview.intents.length > 0
              ? preview.intents.map((intent) => <IntentRow key={intent.intentId} intent={intent} />)
              : <EmptyRow label="No tiny live canary intents are visible yet." />}
          </div>
        </section>
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Attempts</p>
          <div className="bounded-list-4 space-y-3">
            {preview.attempts.length > 0
              ? preview.attempts.map((attempt) => <AttemptRow key={attempt.attemptId} attempt={attempt} />)
              : <EmptyRow label="No live canary attempts are visible yet." />}
          </div>
        </section>
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Gate decisions</p>
          <div className="bounded-list-4 space-y-3">
            {preview.gateDecisions.length > 0
              ? preview.gateDecisions.map((decision) => <DecisionRow key={decision.decisionId} decision={decision} />)
              : <EmptyRow label="No live canary gate decisions are visible yet." />}
          </div>
        </section>
      </div>
    </GlassCard>
  );
}
