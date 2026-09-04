import { productSafeText } from "@/components/crypto-execution/display-safety";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  ForexBrokerConnectionSummary,
  ForexConnectionAuditEventSummary,
  ForexConnectionReadinessPreview
} from "@/types/crypto-execution";

function statusTone(status: string): "green" | "amber" | "red" {
  if (status === "verified" || status === "paper_only_ready") {
    return "green";
  }

  if (status === "disabled" || status === "rejected" || status === "error") {
    return "red";
  }

  return "amber";
}

function formatDate(value?: string) {
  if (!value) {
    return "Not checked";
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortRef(value?: string) {
  if (!value) {
    return "not recorded";
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

function ConnectionRow({
  connection,
  onRefresh,
  onDisable,
  busy = false
}: {
  connection: ForexBrokerConnectionSummary;
  onRefresh?: (connectionId: string) => void;
  onDisable?: (connectionId: string) => void;
  busy?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {productSafeText(connection.connectionLabel)}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            MetaAPI / {connection.environment} / Ref {shortRef(connection.providerAccountFingerprint)}
          </p>
        </div>
        <Badge tone={statusTone(connection.status)}>{connection.status.replace(/_/g, " ")}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-[color:var(--label2)] sm:grid-cols-2">
        <p className="break-safe">Readiness: {connection.readinessStatus.replace(/_/g, " ")}</p>
        <p className="break-safe">Vault: {connection.tokenVaultStatus.replace(/_/g, " ")}</p>
        <p className="break-safe">Platform: {connection.platform ?? "unknown"}</p>
        <p className="break-safe">Server: {productSafeText(connection.serverName) || "not shown"}</p>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(connection.supportSafeMessage)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Checked {formatDate(connection.lastCheckedAt)}</p>
      {onRefresh || onDisable ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onRefresh ? (
            <button
              type="button"
              className="focus-ring rounded-full border border-[color:var(--line)] px-3 py-2 text-xs font-semibold text-[color:var(--label)]"
              onClick={() => onRefresh(connection.connectionId)}
              disabled={busy || connection.status === "disabled"}
            >
              Refresh
            </button>
          ) : null}
          {onDisable ? (
            <button
              type="button"
              className="focus-ring rounded-full border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-3 py-2 text-xs font-semibold text-[color:var(--red)]"
              onClick={() => onDisable(connection.connectionId)}
              disabled={busy || connection.status === "disabled"}
            >
              Disable
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AuditRow({ event }: { event: ForexConnectionAuditEventSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{event.action.replace(/_/g, " ")}</p>
        <Badge tone={statusTone(event.severity)}>{event.severity}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(event.safeMessage)}
      </p>
      <p className="mt-1 break-safe text-xs text-[color:var(--label3)]">
        {event.targetType.replace(/_/g, " ")} {shortRef(event.targetId)} / {formatDate(event.createdAt)}
      </p>
    </div>
  );
}

export function ForexConnectionReadinessCard({
  title,
  subtitle,
  preview,
  showAudit = true,
  onRefreshConnection,
  onDisableConnection,
  busy = false
}: {
  title: string;
  subtitle: string;
  preview?: ForexConnectionReadinessPreview;
  showAudit?: boolean;
  onRefreshConnection?: (connectionId: string) => void;
  onDisableConnection?: (connectionId: string) => void;
  busy?: boolean;
}) {
  if (!preview) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Forex connection readiness</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone="amber">No broker execution</Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Verified" value={String(preview.verifiedCount)} tone="green" />
        <StatChip label="Failures" value={String(preview.recentFailureCount)} tone={preview.recentFailureCount > 0 ? "red" : "green"} />
        <StatChip label="Disabled" value={String(preview.disabledCount)} tone={preview.disabledCount > 0 ? "amber" : "green"} />
        <StatChip label="Sampled" value={String(preview.sampledConnectionCount)} />
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Connections</p>
          <div className="bounded-list-4 space-y-3">
            {preview.connections.length > 0
              ? preview.connections.map((connection) => (
                  <ConnectionRow
                    key={connection.connectionId}
                    connection={connection}
                    onRefresh={onRefreshConnection}
                    onDisable={onDisableConnection}
                    busy={busy}
                  />
                ))
              : <EmptyRow label="No MetaAPI connection metadata is visible in this bounded window yet." />}
          </div>
        </section>

        {showAudit ? (
          <section className="space-y-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">Connection audit</p>
            <div className="bounded-list-4 space-y-3">
              {preview.auditEvents.length > 0
                ? preview.auditEvents.map((event) => <AuditRow key={event.eventId} event={event} />)
                : <EmptyRow label="No forex connection audit events are visible yet." />}
            </div>
          </section>
        ) : null}
      </div>
    </GlassCard>
  );
}
