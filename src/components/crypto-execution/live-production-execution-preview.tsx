import { Badge } from "@/components/ui/badge";
import { productSafeText, productionBetaStatusLabel } from "@/components/crypto-execution/display-safety";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  LiveProductionAuditEventSummary,
  LiveProductionExecutionPreview,
  LiveProductionIntentSummary,
  LiveProductionOrderAttemptSummary,
  LiveProductionPreflightCheck,
  LiveProductionReconciliationSummary
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
  if (status.includes("filled") || status.includes("submitted") || status === "dry_run_live" || status === "reconciled") {
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

function checkTone(status: LiveProductionPreflightCheck["status"]) {
  if (status === "ready") {
    return "green" as const;
  }

  if (status === "blocked") {
    return "red" as const;
  }

  return "amber" as const;
}

function PreflightRow({ check }: { check: LiveProductionPreflightCheck }) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_50%,transparent)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{check.label}</p>
        <Badge tone={checkTone(check.status)}>{check.status}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">{productSafeText(check.safeMessage)}</p>
    </div>
  );
}

function IntentRow({
  intent,
  productionEnabled
}: {
  intent: LiveProductionIntentSummary;
  productionEnabled: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {intent.symbol || "Unknown symbol"} - {intent.side}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Intent {shortRef(intent.intentId)} / {intent.exchange} production
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{productionBetaStatusLabel(intent.status, productionEnabled)}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {intent.orderType} / ${intent.notionalUsdt.toFixed(2)} / {intent.environment}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AttemptRow({
  attempt,
  productionEnabled
}: {
  attempt: LiveProductionOrderAttemptSummary;
  productionEnabled: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {attempt.symbol || "Unknown symbol"} {productionEnabled ? "production attempt" : "recorded beta check"}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Attempt {shortRef(attempt.orderAttemptId)}
          </p>
        </div>
        <Badge tone={statusTone(attempt.status)}>{productionBetaStatusLabel(attempt.status, productionEnabled)}</Badge>
      </div>
      {attempt.exchangeOrderRef ? (
      <p className="mt-2 break-safe text-xs text-[color:var(--label3)]">Exchange ref {shortRef(attempt.exchangeOrderRef)}</p>
      ) : null}
      {attempt.balancePrecheckStatus ? (
        <p className="mt-2 break-safe text-xs text-[color:var(--label3)]">
          Balance precheck {attempt.balancePrecheckStatus.replace(/_/g, " ")}
          {attempt.balancePrecheckCheckedAsset ? ` / ${attempt.balancePrecheckCheckedAsset}` : ""}
        </p>
      ) : null}
      {attempt.sanitizedFailureReason ? (
        <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--amber)]">
          {productSafeText(attempt.sanitizedFailureReason)}
        </p>
      ) : null}
    </div>
  );
}

function ReconciliationRow({
  record,
  productionEnabled
}: {
  record: LiveProductionReconciliationSummary;
  productionEnabled: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Production reconciliation</p>
        <Badge tone={statusTone(record.status)}>{productionBetaStatusLabel(record.status, productionEnabled)}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">{productSafeText(record.safeMessage)}</p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Checked {formatDate(record.checkedAt)}</p>
    </div>
  );
}

function AuditRow({
  event,
  productionEnabled
}: {
  event: LiveProductionAuditEventSummary;
  productionEnabled: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{event.action}</p>
        <Badge tone={statusTone(event.severity)}>{productionEnabled ? event.severity : "beta check"}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">{productSafeText(event.safeMessage)}</p>
      <p className="mt-1 break-safe text-xs text-[color:var(--label3)]">
        {event.targetType} {shortRef(event.targetId)} / {formatDate(event.createdAt)}
      </p>
    </div>
  );
}

export function LiveProductionExecutionPreviewCard({
  title,
  subtitle,
  preview
}: {
  title: string;
  subtitle: string;
  preview?: LiveProductionExecutionPreview;
}) {
  if (!preview) {
    return null;
  }

  const productionRealMoneyEnabled =
    preview.env.productionBetaEnabled &&
    preview.env.productionOrdersEnabled &&
    preview.env.productionVaultReady &&
    !preview.env.productionDryRun;

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Production beta</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone={preview.env.productionBetaEnabled ? "amber" : "red"}>
          {preview.env.productionBetaEnabled ? "Gated beta" : "Production disabled"}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Dry run" value={preview.env.productionDryRun ? "On" : "Off"} tone={preview.env.productionDryRun ? "amber" : "red"} />
        <StatChip label="Order env" value={preview.env.productionOrdersEnabled ? "Enabled" : "Disabled"} tone={preview.env.productionOrdersEnabled ? "amber" : "green"} />
        <StatChip label="Canary env" value={preview.env.productionCanaryEnabled ? "Enabled" : "Disabled"} tone={preview.env.productionCanaryEnabled ? "red" : "green"} />
        <StatChip label="Vault" value={preview.env.productionVaultReady ? "Ready" : "Blocked"} tone={preview.env.productionVaultReady ? "green" : "red"} />
        <StatChip label="Production state" value={preview.env.legacyLiveFlagIneffective ? "Gated" : "Unknown"} tone="green" />
      </div>

      <section className="space-y-3 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_42%,transparent)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--label)]">Production readiness preflight</p>
            <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
              Server-derived gates for the loaded workspace/candidate. Values are support-safe and do not include credentials, vault refs, raw balances, or full order IDs.
            </p>
          </div>
          <Badge tone={preview.preflightReady ? "green" : "amber"}>
            {preview.preflightReady ? "Ready for review" : "Gated"}
          </Badge>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
          <StatChip
            label="Balance precheck"
            value={preview.balancePrecheck.status.replace(/_/g, " ")}
            tone={preview.balancePrecheck.status === "sufficient" ? "green" : "amber"}
          />
          <StatChip
            label="Checked asset"
            value={preview.balancePrecheck.checkedAsset ?? "pending"}
            tone="neutral"
          />
        </div>
        <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
          {productSafeText(preview.balancePrecheck.safeMessage)}
        </p>
        <div className="bounded-list-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          {preview.preflightChecks.length > 0
            ? preview.preflightChecks.map((check) => <PreflightRow key={check.key} check={check} />)
            : <EmptyRow label="No production preflight checks are available for this preview." />}
        </div>
      </section>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Production intents" value={String(preview.intents.length)} tone="amber" />
        <StatChip label="Attempts" value={String(preview.orderAttempts.length)} />
        <StatChip label="Reconciliations" value={String(preview.reconciliations.length)} />
        <StatChip label="Audit events" value={String(preview.auditEvents.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Production intents</p>
          <div className="bounded-list-4 space-y-3">
            {preview.intents.length > 0
              ? preview.intents.map((intent) => (
                <IntentRow key={intent.intentId} intent={intent} productionEnabled={productionRealMoneyEnabled} />
              ))
              : <EmptyRow label="No Production Beta intents are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Production attempts</p>
          <div className="bounded-list-4 space-y-3">
            {preview.orderAttempts.length > 0
              ? preview.orderAttempts.map((attempt) => (
                <AttemptRow key={attempt.orderAttemptId} attempt={attempt} productionEnabled={productionRealMoneyEnabled} />
              ))
              : <EmptyRow label="No Production Beta checks are visible. Dry-run mode is the default." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Production reconciliation</p>
          <div className="bounded-list-4 space-y-3">
            {preview.reconciliations.length > 0
              ? preview.reconciliations.map((record) => (
                <ReconciliationRow key={record.reconciliationId} record={record} productionEnabled={productionRealMoneyEnabled} />
              ))
              : <EmptyRow label="No production reconciliation records are visible in this bounded window yet." />}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Production audit</p>
          <div className="bounded-list-4 space-y-3">
            {preview.auditEvents.length > 0
              ? preview.auditEvents.map((event) => (
                <AuditRow key={event.eventId} event={event} productionEnabled={productionRealMoneyEnabled} />
              ))
              : <EmptyRow label="No production audit events are visible in this bounded window yet." />}
          </div>
        </section>
      </div>
    </GlassCard>
  );
}
