import { productSafeText } from "@/components/crypto-execution/display-safety";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  ForexDemoAuditEventSummary,
  ForexDemoExecutionPreview,
  ForexDemoGateDecisionSummary,
  ForexDemoIntentSummary,
  ForexDemoOrderAttemptSummary,
  ForexDemoReconciliationSummary
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
  if (status.includes("filled") || status.includes("submitted") || status === "reconciled") {
    return "green" as const;
  }

  if (status.includes("failed") || status.includes("blocked") || status.includes("cancelled")) {
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

function IntentRow({ intent }: { intent: ForexDemoIntentSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {intent.pair || "Unknown pair"} demo - {intent.side}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Intent {shortRef(intent.intentId)} / MetaAPI demo
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{intent.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {intent.dryRun ? "Dry-run proof" : "Demo broker proof"} / volume {intent.volume.toFixed(2)} / ${intent.simulatedNotional.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: ForexDemoOrderAttemptSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {attempt.pair || "Unknown pair"} demo attempt
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

function DecisionRow({ decision }: { decision: ForexDemoGateDecisionSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
          {decision.pair || "Forex"} gate {decision.status.replace(/_/g, " ")}
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

function ReconciliationRow({ record }: { record: ForexDemoReconciliationSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Demo reconciliation</p>
        <Badge tone={statusTone(record.status)}>{record.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">{productSafeText(record.safeMessage)}</p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Checked {formatDate(record.checkedAt)}</p>
    </div>
  );
}

function AuditRow({ event }: { event: ForexDemoAuditEventSummary }) {
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

export function ForexDemoExecutionPreviewCard({
  title,
  subtitle,
  preview,
  showAudit = false
}: {
  title: string;
  subtitle: string;
  preview?: ForexDemoExecutionPreview;
  showAudit?: boolean;
}) {
  if (!preview) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Forex demo proof</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone={preview.env.demoOrderCallsEnabled && !preview.env.demoDryRun ? "amber" : "green"}>
          {preview.env.demoOrderCallsEnabled && !preview.env.demoDryRun ? "Demo calls gated" : "Dry-run"}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Ready demo" value={String(preview.routing.readyForDemoCount)} tone="amber" />
        <StatChip label="Submitted demo" value={String(preview.routing.submittedDemoCount)} tone="green" />
        <StatChip label="Filled demo" value={String(preview.routing.filledDemoCount)} tone="green" />
        <StatChip label="Gate blocks" value={String(preview.routing.blockedCount)} tone={preview.routing.blockedCount > 0 ? "amber" : "green"} />
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Demo intents</p>
          <div className="bounded-list-4 space-y-3">
            {preview.intents.length > 0
              ? preview.intents.map((intent) => <IntentRow key={intent.intentId} intent={intent} />)
              : <EmptyRow label="No forex demo intents are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Demo attempts</p>
          <div className="bounded-list-4 space-y-3">
            {preview.attempts.length > 0
              ? preview.attempts.map((attempt) => <AttemptRow key={attempt.attemptId} attempt={attempt} />)
              : <EmptyRow label="No forex demo attempts are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Gate decisions</p>
          <div className="bounded-list-4 space-y-3">
            {preview.gateDecisions.length > 0
              ? preview.gateDecisions.map((decision) => <DecisionRow key={decision.decisionId} decision={decision} />)
              : <EmptyRow label="No forex demo gate decisions are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Reconciliation</p>
          <div className="bounded-list-4 space-y-3">
            {preview.reconciliations.length > 0
              ? preview.reconciliations.map((record) => <ReconciliationRow key={record.reconciliationId} record={record} />)
              : <EmptyRow label="No forex demo reconciliation records are visible in this bounded window yet." />}
          </div>
        </section>

        {showAudit ? (
          <section className="space-y-3 xl:col-span-2">
            <p className="text-sm font-semibold text-[color:var(--label)]">Demo audit</p>
            <div className="bounded-list-4 space-y-3">
              {preview.auditEvents.length > 0
                ? preview.auditEvents.map((event) => <AuditRow key={event.eventId} event={event} />)
                : <EmptyRow label="No forex demo audit events are visible in this bounded window yet." />}
            </div>
          </section>
        ) : null}
      </div>
    </GlassCard>
  );
}
