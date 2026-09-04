import { productSafeText } from "@/components/crypto-execution/display-safety";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  ForexConfirmationSummary,
  ForexExecutionAuditEventSummary,
  ForexPaperAttemptSummary,
  ForexPaperExecutionPreview,
  ForexPaperIntentSummary,
  ForexRiskDecisionSummary
} from "@/types/crypto-execution";

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

function statusTone(status: string) {
  if (status.includes("completed") || status === "simulated" || status === "allowed") {
    return "green" as const;
  }

  if (status.includes("blocked") || status.includes("failed") || status.includes("expired")) {
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

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-[18px] border border-dashed border-[color:var(--line)] px-4 py-5 text-sm leading-6 text-[color:var(--label2)]">
      {label}
    </p>
  );
}

function IntentRow({ intent }: { intent: ForexPaperIntentSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {intent.pair || "Unknown pair"} - {intent.side}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Intent {shortRef(intent.intentId)} / Signal {shortRef(intent.signalId)}
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{intent.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {intent.executionMode.replace(/_/g, " ")} / {intent.sizingMode.replace(/_/g, " ")} / simulated {intent.simulatedNotional}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: ForexPaperAttemptSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {attempt.pair || "Unknown pair"} paper simulation
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Attempt {shortRef(attempt.attemptId)}
          </p>
        </div>
        <Badge tone={statusTone(attempt.status)}>{attempt.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(attempt.safeMessage)}
      </p>
      {attempt.sanitizedFailureReason ? (
        <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--amber)]">
          {productSafeText(attempt.sanitizedFailureReason)}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(attempt.updatedAt)}</p>
    </div>
  );
}

function DecisionRow({ decision }: { decision: ForexRiskDecisionSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {decision.pair || "Forex"} risk {decision.status.replace(/_/g, " ")}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Decision {shortRef(decision.decisionId)}
          </p>
        </div>
        <Badge tone={statusTone(decision.status)}>{decision.failedCheckKeys.length} flags</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(decision.blockedReason) || decision.failedCheckKeys.join(", ") || `${decision.checkCount} checks recorded`}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Decided {formatDate(decision.decidedAt)}</p>
    </div>
  );
}

function ConfirmationRow({ confirmation }: { confirmation: ForexConfirmationSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {confirmation.symbolOrPair || "Forex"} confirmation
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            {confirmation.reason.replace(/_/g, " ")} / {shortRef(confirmation.confirmationId)}
          </p>
        </div>
        <Badge tone={statusTone(confirmation.status)}>{confirmation.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(confirmation.safeMessage)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Expires {formatDate(confirmation.expiresAt)}</p>
    </div>
  );
}

function AuditRow({ event }: { event: ForexExecutionAuditEventSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{event.action}</p>
        <Badge tone={statusTone(event.severity)}>{event.severity}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">{productSafeText(event.safeMessage)}</p>
      <p className="mt-1 break-safe text-xs text-[color:var(--label3)]">
        {event.targetType} {shortRef(event.targetId)} / {formatDate(event.createdAt)}
      </p>
    </div>
  );
}

export function ForexPaperExecutionPreviewCard({
  title,
  subtitle,
  preview,
  showAudit = true
}: {
  title: string;
  subtitle: string;
  preview?: ForexPaperExecutionPreview;
  showAudit?: boolean;
}) {
  if (!preview) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Forex paper simulation</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone="amber">Paper only</Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Forex intents" value={String(preview.routing.recentIntentCount)} />
        <StatChip label="Ready paper" value={String(preview.routing.readyForPaperCount)} tone="amber" />
        <StatChip label="Confirm needed" value={String(preview.routing.confirmationRequiredCount)} tone="amber" />
        <StatChip label="Simulated attempts" value={String(preview.attempts.length)} tone="green" />
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Forex paper intents</p>
          <div className="bounded-list-4 space-y-3">
            {preview.intents.length > 0
              ? preview.intents.map((intent) => <IntentRow key={intent.intentId} intent={intent} />)
              : <EmptyRow label="No forex paper intents are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Simulated attempts</p>
          <div className="bounded-list-4 space-y-3">
            {preview.attempts.length > 0
              ? preview.attempts.map((attempt) => <AttemptRow key={attempt.attemptId} attempt={attempt} />)
              : <EmptyRow label="No forex paper attempts have been simulated yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Confirmation queue</p>
          <div className="bounded-list-4 space-y-3">
            {preview.confirmations.length > 0
              ? preview.confirmations.map((confirmation) => (
                  <ConfirmationRow key={confirmation.confirmationId} confirmation={confirmation} />
                ))
              : <EmptyRow label="No forex confirmation records are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Risk decisions</p>
          <div className="bounded-list-4 space-y-3">
            {preview.riskDecisions.length > 0
              ? preview.riskDecisions.map((decision) => <DecisionRow key={decision.decisionId} decision={decision} />)
              : <EmptyRow label="No forex risk decisions are visible in this bounded window yet." />}
          </div>
        </section>

        {showAudit ? (
          <section className="space-y-3 xl:col-span-2">
            <p className="text-sm font-semibold text-[color:var(--label)]">Forex paper audit</p>
            <div className="bounded-list-4 space-y-3">
              {preview.auditEvents.length > 0
                ? preview.auditEvents.map((event) => <AuditRow key={event.eventId} event={event} />)
                : <EmptyRow label="No forex paper audit events are visible in this bounded window yet." />}
            </div>
          </section>
        ) : null}
      </div>
    </GlassCard>
  );
}
