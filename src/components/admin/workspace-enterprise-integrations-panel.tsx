"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestAdminApi } from "@/lib/admin/admin-api-client";
import type {
  AdminWorkspaceEnterpriseIntegrationAction,
  AdminWorkspaceEnterpriseIntegrationFilter,
  AdminWorkspaceEnterpriseIntegrationInsight,
  AdminWorkspaceEnterpriseIntegrationOpsUpdateResponse,
  AdminWorkspaceEnterpriseIntegrationOverview
} from "@/types/workspace-package";

const filters: AdminWorkspaceEnterpriseIntegrationFilter[] = [
  "all",
  "crm",
  "payment",
  "analytics",
  "broker",
  "telegram_discord",
  "external_lms",
  "data_export",
  "custom",
  "requested",
  "triage",
  "scoping",
  "approved_for_build",
  "blocked",
  "completed",
  "rejected",
  "custom_review",
  "critical",
  "security_review",
  "legal_sla"
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function toneFor(insight: AdminWorkspaceEnterpriseIntegrationInsight) {
  if (insight.status === "blocked" || insight.status === "rejected") {
    return "red" as const;
  }

  if (insight.status === "completed" || insight.status === "approved_for_build") {
    return "green" as const;
  }

  if (insight.priority === "critical" || insight.securityReviewRequired || insight.legalSlaDependency) {
    return "amber" as const;
  }

  return "neutral" as const;
}

function matchesFilter(insight: AdminWorkspaceEnterpriseIntegrationInsight, filter: AdminWorkspaceEnterpriseIntegrationFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "security_review") {
    return insight.securityReviewRequired;
  }

  if (filter === "legal_sla") {
    return insight.legalSlaDependency;
  }

  return insight.category === filter || insight.status === filter || insight.priority === filter;
}

export function WorkspaceEnterpriseIntegrationsPanel({
  overview,
  onUpdated,
  onMessage,
  onError
}: {
  overview: AdminWorkspaceEnterpriseIntegrationOverview;
  onUpdated?: () => Promise<void> | void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [filter, setFilter] = useState<AdminWorkspaceEnterpriseIntegrationFilter>("all");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [workspaceNotes, setWorkspaceNotes] = useState<Record<string, string>>({});
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const filteredRequests = useMemo(
    () => overview.latestRequests.filter((request) => matchesFilter(request, filter)),
    [filter, overview.latestRequests]
  );

  async function updateRequest(
    requestRef: string,
    action: AdminWorkspaceEnterpriseIntegrationAction
  ) {
    setUpdatingRef(requestRef);
    onError?.("");

    try {
      const adminNote = adminNotes[requestRef]?.trim();
      const workspaceVisibleNote = workspaceNotes[requestRef]?.trim();
      const response = await requestAdminApi<AdminWorkspaceEnterpriseIntegrationOpsUpdateResponse>(
        "/api/admin/workspace-enterprise-integrations",
        {
          method: "PATCH",
          body: JSON.stringify({
            requestRef,
            action,
            adminNote,
            workspaceVisibleNote,
            statusReason: adminNote
          })
        }
      );

      onMessage?.(response.message);
      setAdminNotes((current) => ({ ...current, [requestRef]: "" }));
      setWorkspaceNotes((current) => ({ ...current, [requestRef]: "" }));
      await onUpdated?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "TradeHub could not update that integration request.");
    } finally {
      setUpdatingRef(null);
    }
  }

  return (
    <GlassCard className="space-y-5 border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)]" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Enterprise integration queue</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Custom request review
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Super Admin queue for contract-scoped integration requests. This records request status,
            safe scope metadata, and bounded notes only. No CRM, payment, analytics, broker, Telegram,
            Discord, LMS, webhook, provider, credential, AutoCopy, or live execution adapter is created here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={overview.blockedRequests > 0 ? "red" : "green"}>
            {overview.blockedRequests} blocked
          </Badge>
          <Badge tone={overview.securityReviewRequired > 0 ? "amber" : "neutral"}>
            {overview.securityReviewRequired} security
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <StatChip label="Requests" value={String(overview.totalRequests)} tone="accent" />
        <StatChip label="Enterprise" value={String(overview.enterpriseWorkspaceRequests)} tone="amber" />
        <StatChip label="Triage" value={String(overview.triageRequests)} tone="amber" />
        <StatChip label="Scoping" value={String(overview.scopingRequests)} tone="amber" />
        <StatChip label="Build review" value={String(overview.approvedForBuildRequests)} tone="green" />
        <StatChip label="Legal/SLA" value={String(overview.legalSlaDependencies)} tone="neutral" />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((entry) => (
          <Button
            key={entry}
            type="button"
            size="sm"
            variant={filter === entry ? "primary" : "secondary"}
            onClick={() => setFilter(entry)}
          >
            {entry === "all" ? "All" : label(entry)}
          </Button>
        ))}
      </div>

      {filteredRequests.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredRequests.map((request) => {
            const busy = updatingRef === request.requestRef;

            return (
              <div
                key={request.requestRef}
                className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_36%,transparent)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                      {request.title}
                    </p>
                    <p className="break-safe mt-1 text-xs text-[color:var(--label3)]">
                      {request.requestRef} / {request.workspaceRef}
                    </p>
                  </div>
                  <Badge tone={toneFor(request)}>{label(request.status)}</Badge>
                </div>

                <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                  <StatChip label="Package" value={request.packageName} tone="accent" />
                  <StatChip label="Category" value={label(request.category)} tone="neutral" />
                  <StatChip label="Priority" value={label(request.priority)} tone={toneFor(request)} />
                  <StatChip label="Complexity" value={label(request.estimatedComplexity)} tone="neutral" />
                  <StatChip
                    label="Provider"
                    value={request.requestedProviderLabel ?? request.requestedProviderHostname ?? "Not set"}
                    tone="neutral"
                  />
                </div>

                <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                  Workspace: {request.workspaceName}. Provider host metadata is hostname-only; raw source IDs,
                  credentials, private URLs, provider payloads, payment refs, and AutoCopy internals are not shown.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.dataSensitivityFlags.map((flag) => (
                    <Badge key={flag} tone="neutral">{label(flag)}</Badge>
                  ))}
                  {request.securityReviewRequired ? <Badge tone="amber">Security review</Badge> : null}
                  {request.legalSlaDependency ? <Badge tone="amber">Legal/SLA</Badge> : null}
                </div>
                {request.workspaceVisibleNote ? (
                  <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                    Workspace note: {request.workspaceVisibleNote}
                  </p>
                ) : null}
                {request.adminStatusReason ? (
                  <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label2)]">
                    Admin reason: {request.adminStatusReason}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Internal admin note
                    <textarea
                      value={adminNotes[request.requestRef] ?? ""}
                      onChange={(event) =>
                        setAdminNotes((current) => ({
                          ...current,
                          [request.requestRef]: event.target.value.slice(0, 500)
                        }))
                      }
                      rows={2}
                      maxLength={500}
                      className="mt-1 min-h-[70px] w-full resize-y rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none transition focus:border-[color:var(--accent)]"
                      placeholder="Bounded internal metadata only. No secrets or provider internals."
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Workspace-visible note
                    <textarea
                      value={workspaceNotes[request.requestRef] ?? ""}
                      onChange={(event) =>
                        setWorkspaceNotes((current) => ({
                          ...current,
                          [request.requestRef]: event.target.value.slice(0, 360)
                        }))
                      }
                      rows={2}
                      maxLength={360}
                      className="mt-1 min-h-[70px] w-full resize-y rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none transition focus:border-[color:var(--accent)]"
                      placeholder="Safe status note visible to workspace."
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_triage")}>
                    Triage
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_scoping")}>
                    Scoping
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_security_review")}>
                    Security
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_legal_sla_review")}>
                    Legal/SLA
                  </Button>
                  <Button type="button" size="sm" variant="primary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_approved_for_build")}>
                    Build review
                  </Button>
                  <Button type="button" size="sm" variant="primary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_completed")}>
                    Complete
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_custom_review")}>
                    Custom review
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_blocked")}>
                    Block
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateRequest(request.requestRef, "mark_rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[color:var(--line)] p-5">
          <p className="text-sm text-[color:var(--label2)]">
            No Enterprise integration requests match this filter in the bounded admin queue.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
