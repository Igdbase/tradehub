import { Badge } from "@/components/ui/badge";
import { productSafeText } from "@/components/crypto-execution/display-safety";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  CryptoExecutionAuditEventSummary,
  CryptoExecutionIntentSummary,
  CryptoOrderAttemptSummary,
  CryptoPaperExecutionPreview,
  CryptoPaperRoutingOverview,
  CryptoRiskDecisionSummary
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
  if (status.includes("completed") || status === "filled" || status === "allowed") {
    return "green" as const;
  }

  if (status.includes("blocked") || status === "failed" || status === "critical") {
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

function IntentRow({ intent }: { intent: CryptoExecutionIntentSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {intent.symbol || "Unknown symbol"} - {intent.side}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Intent {shortRef(intent.intentId)} / Signal {shortRef(intent.signalId)}
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{intent.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {intent.exchange} / {intent.orderType} / {intent.paperTradingOnly ? "paper only" : "not paper"}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: CryptoOrderAttemptSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {attempt.symbol || "Unknown symbol"} paper activity
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Attempt {shortRef(attempt.orderAttemptId)}
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

function DecisionRow({ decision }: { decision: CryptoRiskDecisionSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            Risk {decision.status.replace(/_/g, " ")}
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

function AuditRow({ event }: { event: CryptoExecutionAuditEventSummary }) {
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

export function PaperExecutionPreview({
  title,
  subtitle,
  routing,
  preview,
  showAudit = true
}: {
  title: string;
  subtitle: string;
  routing?: CryptoPaperRoutingOverview;
  preview: CryptoPaperExecutionPreview;
  showAudit?: boolean;
}) {
  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Paper execution</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone="amber">Paper only</Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Recent intents" value={String(routing?.recentIntentCount ?? preview.intents.length)} />
        <StatChip label="Ready for paper" value={String(routing?.readyForPaperCount ?? 0)} tone="amber" />
        <StatChip label="Risk blocked" value={String(routing?.riskBlockedCount ?? preview.riskDecisions.filter((entry) => entry.status === "blocked").length)} tone="red" />
        <StatChip label="Paper activity" value={String(preview.orderAttempts.length)} tone="green" />
      </div>

      {[...preview.warnings, ...(routing?.boundedRoutingWarningCount ? ["Routing reached a bounded processing window."] : [])].map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Recent intents</p>
          <div className="bounded-list-4 space-y-3">
            {preview.intents.length > 0
              ? preview.intents.map((intent) => <IntentRow key={intent.intentId} intent={intent} />)
              : <EmptyRow label="No paper intents are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Paper activity</p>
          <div className="bounded-list-4 space-y-3">
            {preview.orderAttempts.length > 0
              ? preview.orderAttempts.map((attempt) => <AttemptRow key={attempt.orderAttemptId} attempt={attempt} />)
              : <EmptyRow label="No paper activity has been recorded yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Risk decisions</p>
          <div className="bounded-list-4 space-y-3">
            {preview.riskDecisions.length > 0
              ? preview.riskDecisions.map((decision) => <DecisionRow key={decision.decisionId} decision={decision} />)
              : <EmptyRow label="No risk decisions are visible in this bounded window yet." />}
          </div>
        </section>

        {showAudit ? (
          <section className="space-y-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">Execution audit</p>
            <div className="bounded-list-4 space-y-3">
              {preview.auditEvents.length > 0
                ? preview.auditEvents.map((event) => <AuditRow key={event.eventId} event={event} />)
                : <EmptyRow label="No execution audit events are visible in this bounded window yet." />}
            </div>
          </section>
        ) : null}
      </div>
    </GlassCard>
  );
}
