import { Badge } from "@/components/ui/badge";
import { productSafeText } from "@/components/crypto-execution/display-safety";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  LiveSandboxAuditEventSummary,
  LiveSandboxExecutionPreview,
  LiveSandboxIntentSummary,
  LiveSandboxOrderAttemptSummary,
  LiveSandboxReconciliationSummary
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

  if (status.includes("rejected") || status.includes("failed") || status.includes("blocked") || status === "requires_review") {
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

function IntentRow({ intent }: { intent: LiveSandboxIntentSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {intent.symbol || "Unknown symbol"} - {intent.side}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Intent {shortRef(intent.intentId)} / {intent.exchange} testnet
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{intent.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {intent.orderType} / ${intent.notionalUsdt.toFixed(2)} / {intent.environment}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: LiveSandboxOrderAttemptSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {attempt.symbol || "Unknown symbol"} testnet activity
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
      <p className="mt-1 break-safe text-xs text-[color:var(--label3)]">
        Order ref {shortRef(attempt.exchangeClientOrderId)}
      </p>
    </div>
  );
}

function ReconciliationRow({ record }: { record: LiveSandboxReconciliationSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Reconciliation</p>
        <Badge tone={statusTone(record.status)}>{record.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">{productSafeText(record.safeMessage)}</p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Checked {formatDate(record.checkedAt)}</p>
    </div>
  );
}

function AuditRow({ event }: { event: LiveSandboxAuditEventSummary }) {
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

export function LiveSandboxExecutionPreviewCard({
  title,
  subtitle,
  preview
}: {
  title: string;
  subtitle: string;
  preview?: LiveSandboxExecutionPreview;
}) {
  if (!preview) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Testnet Proof</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone="amber">Testnet only</Badge>
      </div>

      <p className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
        These records show Binance/Bybit sandbox/testnet exchange lifecycle handling. Production Beta remains gated.
      </p>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Testnet intents" value={String(preview.intents.length)} tone="amber" />
        <StatChip label="Testnet activity" value={String(preview.orderAttempts.length)} tone="green" />
        <StatChip label="Reconciliations" value={String(preview.reconciliations.length)} />
        <StatChip label="Audit events" value={String(preview.auditEvents.length)} />
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Testnet intents</p>
          <div className="bounded-list-4 space-y-3">
            {preview.intents.length > 0
              ? preview.intents.map((intent) => <IntentRow key={intent.intentId} intent={intent} />)
              : <EmptyRow label="No testnet intents are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Testnet activity</p>
          <div className="bounded-list-4 space-y-3">
            {preview.orderAttempts.length > 0
              ? preview.orderAttempts.map((attempt) => <AttemptRow key={attempt.orderAttemptId} attempt={attempt} />)
              : <EmptyRow label="No testnet order activity is visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Reconciliation</p>
          <div className="bounded-list-4 space-y-3">
            {preview.reconciliations.length > 0
              ? preview.reconciliations.map((record) => <ReconciliationRow key={record.reconciliationId} record={record} />)
              : <EmptyRow label="No testnet reconciliation records are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Testnet audit</p>
          <div className="bounded-list-4 space-y-3">
            {preview.auditEvents.length > 0
              ? preview.auditEvents.map((event) => <AuditRow key={event.eventId} event={event} />)
              : <EmptyRow label="No testnet audit events are visible in this bounded window yet." />}
          </div>
        </section>
      </div>
    </GlassCard>
  );
}
