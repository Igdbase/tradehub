"use client";

import { useState } from "react";
import { requestAdminFile } from "@/lib/admin/admin-api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { Dispute, RiskFlag } from "@/types/tradehub";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityTone(severity: RiskFlag["severity"]) {
  if (severity === "high") {
    return "red" as const;
  }

  return severity === "medium" ? "amber" as const : "neutral" as const;
}

function disputeTone(status: Dispute["status"]) {
  if (status === "escalated") {
    return "amber" as const;
  }

  return status === "resolved" ? "green" as const : "neutral" as const;
}

export function TrustSafetyPanel({
  disputes,
  riskFlags
}: {
  disputes: Dispute[];
  riskFlags: RiskFlag[];
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const openDisputes = disputes.filter((dispute) => dispute.status !== "resolved").length;
  const escalatedDisputes = disputes.filter((dispute) => dispute.status === "escalated").length;
  const highSeverityFlags = riskFlags.filter((flag) => flag.severity === "high").length;

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await requestAdminFile("/api/admin/trust-safety/export");
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `tradehub-trust-safety-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "TradeHub could not export the trust and safety CSV."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Trust and safety</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
            Review feed for disputes, risk flags, and platform intervention.
          </h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            This panel stays bounded and operator-safe. Empty states mean no unresolved records were returned by the current source, not that the app skipped review controls.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={openDisputes + riskFlags.length > 0 ? "amber" : "green"}>
            {openDisputes + riskFlags.length} open
          </Badge>
          <Button onClick={handleExport} variant="secondary" size="sm" disabled={isExporting}>
            {isExporting ? "Exporting..." : "Protected CSV export"}
          </Button>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
          {exportError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="metric-pill min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Open disputes
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-[color:var(--label)]">{openDisputes}</p>
          <p className="mt-1 text-sm text-[color:var(--label3)]">Bounded queue, newest first.</p>
        </div>
        <div className="metric-pill min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Escalated
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-[color:var(--amber)]">{escalatedDisputes}</p>
          <p className="mt-1 text-sm text-[color:var(--label3)]">Needs operator follow-through.</p>
        </div>
        <div className="metric-pill min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            High-risk flags
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-[color:var(--red)]">{highSeverityFlags}</p>
          <p className="mt-1 text-sm text-[color:var(--label3)]">Raised records needing judgment.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Disputes
            </p>
            <Badge tone={openDisputes > 0 ? "amber" : "green"}>{openDisputes} awaiting review</Badge>
          </div>
          {disputes.length > 0 ? (
            disputes.map((dispute) => (
              <div key={dispute.disputeId} className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                    {formatLabel(dispute.type)}
                  </p>
                  <Badge tone={disputeTone(dispute.status)}>{formatLabel(dispute.status)}</Badge>
                </div>
                <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  Workspace {dispute.workspaceId}
                  {dispute.raisedBy ? ` • Raised by ${dispute.raisedBy}` : ""}
                  {dispute.relatedId ? ` • Related ${dispute.relatedId}` : ""}
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
                  Logged {formatDate(dispute.createdAt)}
                  {dispute.resolvedAt ? ` • Resolved ${formatDate(dispute.resolvedAt)}` : ""}
                </p>
                {dispute.resolution ? (
                  <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label3)]">
                    Resolution note: {dispute.resolution}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
              No unresolved dispute records were returned by the current bounded feed.
            </p>
          )}
        </div>

        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Risk flags
            </p>
            <Badge tone={riskFlags.length > 0 ? "amber" : "green"}>{riskFlags.length} active</Badge>
          </div>
          {riskFlags.length > 0 ? (
            riskFlags.map((flag) => (
              <div key={flag.flagId} className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{flag.title}</p>
                  <Badge tone={severityTone(flag.severity)}>{formatLabel(flag.severity)}</Badge>
                </div>
                <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  Workspace {flag.workspaceId} • {flag.detail}
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
                  Logged {formatDate(flag.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
              No active risk flags were returned by the current bounded review feed.
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
