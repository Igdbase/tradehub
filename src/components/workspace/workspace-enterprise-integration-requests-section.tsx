"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestWorkspaceDashboardApi } from "@/lib/workspace/dashboard-api-client";
import { formatDate } from "@/components/workspace/workspace-formatters";
import type {
  WorkspaceEnterpriseIntegrationCategory,
  WorkspaceEnterpriseIntegrationComplexity,
  WorkspaceEnterpriseIntegrationCreateResponse,
  WorkspaceEnterpriseIntegrationDataSensitivityFlag,
  WorkspaceEnterpriseIntegrationPriority,
  WorkspaceEnterpriseIntegrationRequestsResponse,
  WorkspacePackageStatus
} from "@/types/workspace-package";

const categories: WorkspaceEnterpriseIntegrationCategory[] = [
  "crm",
  "payment",
  "analytics",
  "broker",
  "telegram_discord",
  "external_lms",
  "data_export",
  "custom"
];
const priorities: WorkspaceEnterpriseIntegrationPriority[] = ["low", "medium", "high", "critical"];
const complexities: WorkspaceEnterpriseIntegrationComplexity[] = ["small", "medium", "large", "custom"];
const sensitivityFlags: WorkspaceEnterpriseIntegrationDataSensitivityFlag[] = [
  "student_profile",
  "billing_status",
  "course_progress",
  "practice_aggregates",
  "manual_journal_aggregates",
  "signals_metadata",
  "custom_review"
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function statusTone(value: string) {
  if (value === "blocked" || value === "rejected") {
    return "red" as const;
  }

  if (value === "completed" || value === "approved_for_build") {
    return "green" as const;
  }

  return "amber" as const;
}

export function WorkspaceEnterpriseIntegrationRequestsSection({
  packageStatus
}: {
  packageStatus: WorkspacePackageStatus;
}) {
  const [response, setResponse] = useState<WorkspaceEnterpriseIntegrationRequestsResponse | null>(null);
  const [category, setCategory] = useState<WorkspaceEnterpriseIntegrationCategory>("crm");
  const [priority, setPriority] = useState<WorkspaceEnterpriseIntegrationPriority>("medium");
  const [estimatedComplexity, setEstimatedComplexity] =
    useState<WorkspaceEnterpriseIntegrationComplexity>("custom");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestedProviderLabel, setRequestedProviderLabel] = useState("");
  const [requestedProviderHostname, setRequestedProviderHostname] = useState("");
  const [workspaceVisibleNote, setWorkspaceVisibleNote] = useState("");
  const [dataSensitivityFlags, setDataSensitivityFlags] = useState<WorkspaceEnterpriseIntegrationDataSensitivityFlag[]>([]);
  const [securityReviewRequired, setSecurityReviewRequired] = useState(false);
  const [legalSlaDependency, setLegalSlaDependency] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const enterpriseAvailable = packageStatus.packageTier === "enterprise";

  async function loadRequests() {
    setLoading(true);
    setError(null);

    try {
      const next = await requestWorkspaceDashboardApi<WorkspaceEnterpriseIntegrationRequestsResponse>(
        "/api/workspace/enterprise-integration-requests"
      );
      setResponse(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "TradeHub could not load Enterprise integration requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  function toggleSensitivityFlag(flag: WorkspaceEnterpriseIntegrationDataSensitivityFlag) {
    setDataSensitivityFlags((current) =>
      current.includes(flag)
        ? current.filter((entry) => entry !== flag)
        : [...current, flag].slice(0, 6)
    );
  }

  async function submitRequest() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const next = await requestWorkspaceDashboardApi<WorkspaceEnterpriseIntegrationCreateResponse>(
        "/api/workspace/enterprise-integration-requests",
        {
          method: "POST",
          body: JSON.stringify({
            category,
            priority,
            estimatedComplexity,
            title,
            description,
            requestedProviderLabel,
            requestedProviderHostname,
            workspaceVisibleNote,
            dataSensitivityFlags,
            securityReviewRequired,
            legalSlaDependency
          })
        }
      );

      setResponse(next);
      setMessage(next.message);
      setTitle("");
      setDescription("");
      setRequestedProviderLabel("");
      setRequestedProviderHostname("");
      setWorkspaceVisibleNote("");
      setDataSensitivityFlags([]);
      setSecurityReviewRequired(false);
      setLegalSlaDependency(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "TradeHub could not record that request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard className="space-y-5 border-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Enterprise integration requests</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Custom integration intake
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            {response?.overview.availabilityMessage ??
              (enterpriseAvailable
                ? "Enterprise workspaces can request custom integration scoping."
                : "Custom integrations require an Enterprise agreement.")}
            {" "}Do not include credentials, API keys, tokens, webhook secrets, private URLs,
            broker passwords, vault refs, payment refs, or provider payloads.
          </p>
        </div>
        <Badge tone={enterpriseAvailable ? "green" : "amber"}>
          {enterpriseAvailable ? "Enterprise intake" : "Contact TradeHub"}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <StatChip label="Requests" value={String(response?.overview.totalRequests ?? 0)} tone="accent" />
        <StatChip label="Open" value={String(response?.overview.openRequests ?? 0)} tone="amber" />
        <StatChip label="Security" value={String(response?.overview.securityReviewRequiredCount ?? 0)} tone="amber" />
        <StatChip label="Legal/SLA" value={String(response?.overview.legalSlaDependencyCount ?? 0)} tone="neutral" />
      </div>

      {message ? (
        <p className="rounded-[14px] border border-[color:color-mix(in_srgb,var(--green)_34%,transparent)] px-4 py-3 text-sm text-[color:var(--green)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[14px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-3 text-sm text-[color:var(--red)]">
          {error}
        </p>
      ) : null}

      {!enterpriseAvailable ? (
        <div className="rounded-[18px] border border-dashed border-[color:var(--line)] p-5">
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            Launch and Pro packages stay on standard TradeHub integrations. Enterprise integration scoping
            is private quote/contact-sales only, and Trade Copier remains a separate optional add-on.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-3 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as WorkspaceEnterpriseIntegrationCategory)}
                  className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                >
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>{label(entry)}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Priority
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as WorkspaceEnterpriseIntegrationPriority)}
                  className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                >
                  {priorities.map((entry) => (
                    <option key={entry} value={entry}>{label(entry)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 96))}
                maxLength={96}
                className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                placeholder="Example: CRM student status sync"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, 700))}
                maxLength={700}
                rows={4}
                className="mt-1 w-full resize-y rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                placeholder="Describe the workflow and desired business outcome. Leave out credentials, URLs, account IDs, tokens, and secrets."
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Provider label
                <input
                  value={requestedProviderLabel}
                  onChange={(event) => setRequestedProviderLabel(event.target.value.slice(0, 80))}
                  maxLength={80}
                  className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                  placeholder="HubSpot, Moodle, custom CRM"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Safe hostname
                <input
                  value={requestedProviderHostname}
                  onChange={(event) => setRequestedProviderHostname(event.target.value.slice(0, 120))}
                  maxLength={120}
                  className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                  placeholder="crm.example.com"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Complexity
                <select
                  value={estimatedComplexity}
                  onChange={(event) => setEstimatedComplexity(event.target.value as WorkspaceEnterpriseIntegrationComplexity)}
                  className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                >
                  {complexities.map((entry) => (
                    <option key={entry} value={entry}>{label(entry)}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Workspace-visible note
                <input
                  value={workspaceVisibleNote}
                  onChange={(event) => setWorkspaceVisibleNote(event.target.value.slice(0, 360))}
                  maxLength={360}
                  className="mt-1 w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--label)]"
                  placeholder="Optional note visible to this workspace"
                />
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Safe data sensitivity flags
              </p>
              <div className="flex flex-wrap gap-2">
                {sensitivityFlags.map((flag) => (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleSensitivityFlag(flag)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      dataSensitivityFlags.includes(flag)
                        ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                        : "border-[color:var(--line)] text-[color:var(--label2)]"
                    }`}
                  >
                    {label(flag)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-[color:var(--label2)]">
                <input
                  type="checkbox"
                  checked={securityReviewRequired}
                  onChange={(event) => setSecurityReviewRequired(event.target.checked)}
                />
                Security review needed
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[color:var(--label2)]">
                <input
                  type="checkbox"
                  checked={legalSlaDependency}
                  onChange={(event) => setLegalSlaDependency(event.target.checked)}
                />
                Legal/SLA dependency
              </label>
            </div>
            <Button type="button" onClick={submitRequest} disabled={saving} size="sm">
              {saving ? "Recording..." : "Submit integration request"}
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="rounded-[18px] border border-dashed border-[color:var(--line)] p-5 text-sm text-[color:var(--label2)]">
                Loading Enterprise integration requests...
              </p>
            ) : response?.overview.requests.length ? (
              response.overview.requests.map((request) => (
                <div
                  key={request.requestRef}
                  className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                        {request.title}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--label3)]">
                        {request.requestRef} - {formatDate(request.updatedAt)}
                      </p>
                    </div>
                    <Badge tone={statusTone(request.status)}>{label(request.status)}</Badge>
                  </div>
                  <p className="break-safe mt-3 text-sm leading-6 text-[color:var(--label2)]">
                    {request.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="neutral">{label(request.category)}</Badge>
                    <Badge tone={request.priority === "critical" || request.priority === "high" ? "amber" : "neutral"}>
                      {label(request.priority)}
                    </Badge>
                    <Badge tone="neutral">{label(request.estimatedComplexity)}</Badge>
                    {request.securityReviewRequired ? <Badge tone="amber">Security review</Badge> : null}
                    {request.legalSlaDependency ? <Badge tone="amber">Legal/SLA</Badge> : null}
                  </div>
                  {request.workspaceVisibleNote ? (
                    <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                      Note: {request.workspaceVisibleNote}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-[18px] border border-dashed border-[color:var(--line)] p-5 text-sm text-[color:var(--label2)]">
                No Enterprise integration requests yet. Submit one when a contract-scoped workflow needs TradeHub review.
              </p>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
