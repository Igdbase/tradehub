"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestAdminApi } from "@/lib/admin/admin-api-client";
import type {
  ExternalSignalAssetClass,
  ExternalSignalCandidateRecord,
  ExternalSignalCandidateReviewPayload,
  ExternalSignalCandidateReviewResponse,
  ExternalSignalCandidateStatus,
  ExternalSignalCandidateCreateResponse,
  ExternalSignalIngestionOverviewResponse,
  ExternalSignalSourceAllowlistMutationResponse,
  ExternalSignalSourceAllowlistUpsertInput,
  ExternalSignalSourceType
} from "@/types/external-signal-ingestion";

const statusOptions: Array<ExternalSignalCandidateStatus | "all"> = [
  "all",
  "parsed",
  "needs_review",
  "approved_for_workspace_preview",
  "rejected",
  "quarantined",
  "duplicate"
];

const sourceTypes: ExternalSignalSourceType[] = [
  "manual_admin_seed",
  "telegram_channel",
  "webhook_source",
  "master_trader_feed"
];

const assetClasses: ExternalSignalAssetClass[] = ["crypto", "forex", "cfd"];

function candidateTitle(candidate: ExternalSignalCandidateRecord) {
  if (!candidate.normalized) {
    return `${candidate.sourceType.replace(/_/g, " ")} candidate`;
  }

  return `${candidate.normalized.symbol} - ${candidate.normalized.side}`;
}

function statusTone(status: ExternalSignalCandidateRecord["status"]) {
  if (status === "rejected" || status === "quarantined") {
    return "red" as const;
  }

  if (status === "duplicate" || status === "needs_review") {
    return "amber" as const;
  }

  return "green" as const;
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function ExternalSignalIngestionPanel({
  overview,
  errorMessage,
  onRefresh
}: {
  overview: ExternalSignalIngestionOverviewResponse | null;
  errorMessage?: string | null;
  onRefresh?: () => Promise<void> | void;
}) {
  const readiness = overview?.readiness;
  const [statusFilter, setStatusFilter] = useState<ExternalSignalCandidateStatus | "all">("all");
  const [reviewReason, setReviewReason] = useState("Super Admin moderation review.");
  const [candidateForm, setCandidateForm] = useState({
    sourceId: "manual_seed_stage24b",
    workspaceId: "",
    symbol: "BTCUSDT",
    assetClass: "crypto" as ExternalSignalAssetClass,
    side: "buy" as "buy" | "sell",
    entryMin: "",
    entryMax: "",
    stopLoss: "",
    takeProfits: "",
    confidence: "unknown" as "low" | "medium" | "high" | "unknown",
    safeTextHint: ""
  });
  const [sourceForm, setSourceForm] = useState({
    sourceRef: "manual_seed_stage24b",
    telegramChatIdentity: "",
    safeLabel: "Manual seed source",
    sourceType: "manual_admin_seed" as ExternalSignalSourceType,
    workspaceId: "",
    status: "disabled" as "enabled" | "disabled",
    parserMode: "manual_mock" as "manual_mock" | "telegram_like_mock" | "disabled",
    allowedSymbols: "BTCUSDT, ETHUSDT, XAUUSD, EURUSD",
    allowedAssetClasses: "crypto,cfd,forex",
    maxTakeProfitCount: "3",
    requiresStopLoss: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    const candidates = overview?.latestCandidates ?? [];

    return statusFilter === "all"
      ? candidates
      : candidates.filter((candidate) => candidate.status === statusFilter);
  }, [overview?.latestCandidates, statusFilter]);

  async function refreshAfterMutation(message: string) {
    setLocalMessage(message);
    await onRefresh?.();
  }

  async function createCandidate() {
    setIsSubmitting(true);
    setLocalError(null);
    setLocalMessage(null);

    try {
      const response = await requestAdminApi<ExternalSignalCandidateCreateResponse>(
        "/api/admin/signals/external-ingestion/candidates",
        {
          method: "POST",
          body: JSON.stringify({
            ...candidateForm,
            takeProfits: splitList(candidateForm.takeProfits)
          })
        }
      );

      await refreshAfterMutation(`Created ${response.candidate.status.replace(/_/g, " ")} mock candidate.`);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "TradeHub could not create the mock candidate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewCandidate(candidateId: string, payload: ExternalSignalCandidateReviewPayload) {
    setIsSubmitting(true);
    setLocalError(null);
    setLocalMessage(null);

    try {
      const response = await requestAdminApi<ExternalSignalCandidateReviewResponse>(
        `/api/admin/signals/external-ingestion/candidates/${encodeURIComponent(candidateId)}/review`,
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      await refreshAfterMutation(`Candidate marked ${response.candidate.status.replace(/_/g, " ")}.`);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "TradeHub could not update candidate review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function upsertSource(payload: ExternalSignalSourceAllowlistUpsertInput) {
    setIsSubmitting(true);
    setLocalError(null);
    setLocalMessage(null);

    try {
      const response = await requestAdminApi<ExternalSignalSourceAllowlistMutationResponse>(
        "/api/admin/signals/external-ingestion/sources",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      await refreshAfterMutation(`Source ${response.source.status} as ${response.source.safeLabel}.`);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "TradeHub could not update source allowlist.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitSource() {
    const sourceType = sourceForm.sourceType;

    await upsertSource({
      action: "upsert",
      ...sourceForm,
      parserMode: sourceType === "telegram_channel" ? "telegram_like_mock" : sourceForm.parserMode,
      allowedSymbols: splitList(sourceForm.allowedSymbols),
      allowedAssetClasses: splitList(sourceForm.allowedAssetClasses) as ExternalSignalAssetClass[],
      riskLimits: {
        maxTakeProfitCount: Number(sourceForm.maxTakeProfitCount) || 3,
        requiresStopLoss: sourceForm.requiresStopLoss,
        maxEntryRangePercent: 2
      }
    });
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">
            Stage 24B external signal review / Stage 24A external signal ingestion
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Master-trader candidate moderation
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Super Admin-only workflow for manual/mock parsing, Telegram source setup, source allowlists,
            and preview review. Telegram webhook ingestion stays disabled unless configured, and approved
            previews publish only through the controlled workspace bridge with existing Copier gates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={readiness?.enabled ? "amber" : "neutral"}>
            {readiness?.enabled ? "Dry-run contract" : "Ingestion disabled"}
          </Badge>
          <Badge tone="amber">Preview only</Badge>
          <Badge tone="amber">No AutoCopy execution</Badge>
        </div>
      </div>

      {localMessage ? (
        <p className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--green)_30%,transparent)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]">
          {localMessage}
        </p>
      ) : null}

      {localError ? (
        <p className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]">
          {localError}
        </p>
      ) : null}

      {overview && readiness ? (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            <StatChip label="Provider" value={readiness.providerLabel} detail={readiness.failClosedReason} />
            <StatChip label="Dry-run" value={readiness.dryRun ? "On" : "Off"} tone={readiness.dryRun ? "amber" : "red"} />
            <StatChip label="Sources" value={String(overview.summary.sourceCount)} tone="accent" />
            <StatChip label="Candidates" value={String(overview.summary.candidateCount)} tone="accent" />
            <StatChip label="Risk flags" value={String(overview.summary.riskFlaggedCount)} tone={overview.summary.riskFlaggedCount ? "amber" : "green"} />
            <StatChip label="Reviewed" value={String(overview.summary.reviewedCount)} tone="accent" />
            <StatChip label="Preview" value={String(overview.summary.workspacePreviewCount)} tone="green" />
            <StatChip label="Quarantined" value={String(overview.summary.quarantinedCount)} tone={overview.summary.quarantinedCount ? "amber" : "green"} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-4">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Mock candidate parser</h3>
              <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
                Enter normalized fields only. Do not paste raw Telegram messages, chat IDs, source handles, tokens, or provider payloads.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={candidateForm.sourceId} onChange={(event) => setCandidateForm((current) => ({ ...current, sourceId: event.target.value }))} placeholder="Source ref" />
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={candidateForm.workspaceId} onChange={(event) => setCandidateForm((current) => ({ ...current, workspaceId: event.target.value }))} placeholder="Workspace scope optional" />
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={candidateForm.symbol} onChange={(event) => setCandidateForm((current) => ({ ...current, symbol: event.target.value }))} placeholder="Symbol" />
                <select className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--surface)] px-4 py-2 text-sm" value={candidateForm.assetClass} onChange={(event) => setCandidateForm((current) => ({ ...current, assetClass: event.target.value as ExternalSignalAssetClass }))}>
                  {assetClasses.map((assetClass) => <option key={assetClass} value={assetClass}>{assetClass}</option>)}
                </select>
                <select className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--surface)] px-4 py-2 text-sm" value={candidateForm.side} onChange={(event) => setCandidateForm((current) => ({ ...current, side: event.target.value as "buy" | "sell" }))}>
                  <option value="buy">buy</option>
                  <option value="sell">sell</option>
                </select>
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={candidateForm.entryMin} onChange={(event) => setCandidateForm((current) => ({ ...current, entryMin: event.target.value }))} placeholder="Entry" />
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={candidateForm.entryMax} onChange={(event) => setCandidateForm((current) => ({ ...current, entryMax: event.target.value }))} placeholder="Entry max optional" />
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={candidateForm.stopLoss} onChange={(event) => setCandidateForm((current) => ({ ...current, stopLoss: event.target.value }))} placeholder="Stop loss" />
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm sm:col-span-2" value={candidateForm.takeProfits} onChange={(event) => setCandidateForm((current) => ({ ...current, takeProfits: event.target.value }))} placeholder="Take profits comma-separated" />
                <input className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm sm:col-span-2" value={candidateForm.safeTextHint} onChange={(event) => setCandidateForm((current) => ({ ...current, safeTextHint: event.target.value }))} placeholder="Safe risk hint only, not raw message" />
              </div>
              <Button className="mt-4" type="button" size="sm" disabled={isSubmitting} onClick={createCandidate}>
                Create mock candidate
              </Button>
            </div>

            <div className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-4">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Source allowlist controls</h3>
              <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
                Telegram chat/channel identity is converted server-side into a keyed opaque identity. Raw identities,
                tokens, handles, provider payloads, and webhook secrets are not stored or returned.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input aria-label="Source reference" className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={sourceForm.sourceRef} onChange={(event) => setSourceForm((current) => ({ ...current, sourceRef: event.target.value }))} placeholder="Source ref" />
                <input aria-label="Telegram channel identity" className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={sourceForm.telegramChatIdentity} onChange={(event) => setSourceForm((current) => ({ ...current, telegramChatIdentity: event.target.value }))} placeholder="Telegram chat/channel identity" />
                <input aria-label="Source label" className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={sourceForm.safeLabel} onChange={(event) => setSourceForm((current) => ({ ...current, safeLabel: event.target.value }))} placeholder="Safe label" />
                <select aria-label="Source type" className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--surface)] px-4 py-2 text-sm" value={sourceForm.sourceType} onChange={(event) => setSourceForm((current) => ({ ...current, sourceType: event.target.value as ExternalSignalSourceType }))}>
                  {sourceTypes.map((sourceType) => <option key={sourceType} value={sourceType}>{sourceType.replace(/_/g, " ")}</option>)}
                </select>
                <select aria-label="Source status" className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--surface)] px-4 py-2 text-sm" value={sourceForm.status} onChange={(event) => setSourceForm((current) => ({ ...current, status: event.target.value as "enabled" | "disabled" }))}>
                  <option value="disabled">disabled</option>
                  <option value="enabled">enabled</option>
                </select>
                <input aria-label="Allowed symbols" className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={sourceForm.allowedSymbols} onChange={(event) => setSourceForm((current) => ({ ...current, allowedSymbols: event.target.value }))} placeholder="Allowed symbols" />
                <input aria-label="Workspace scope" className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm" value={sourceForm.workspaceId} onChange={(event) => setSourceForm((current) => ({ ...current, workspaceId: event.target.value }))} placeholder="Workspace scope" />
                <input aria-label="Allowed markets" className="rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm sm:col-span-2" value={sourceForm.allowedAssetClasses} onChange={(event) => setSourceForm((current) => ({ ...current, allowedAssetClasses: event.target.value }))} placeholder="Allowed markets" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={isSubmitting} onClick={submitSource}>
                  Save source
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--label3)]" htmlFor="external-signal-status-filter">
              Candidate filter
            </label>
            <select
              id="external-signal-status-filter"
              className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--surface)] px-4 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ExternalSignalCandidateStatus | "all")}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input
              className="min-w-[240px] rounded-full border border-[color:var(--glass-border)] bg-transparent px-4 py-2 text-sm"
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              placeholder="Bounded review reason"
            />
          </div>

          {filteredCandidates.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Safe candidate moderation queue</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredCandidates.slice(0, 8).map((candidate) => (
                  <div
                    key={candidate.candidateId}
                    className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                          {candidateTitle(candidate)}
                        </p>
                        <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                          {candidate.maskedSourceRef} / {candidate.parserVersion} / {candidate.reviewStatus.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge tone={statusTone(candidate.status)}>{candidate.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                      {candidate.safeReason}
                    </p>
                    {candidate.riskFlags.length ? (
                      <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label3)]">
                        Risk flags: {candidate.riskFlags.slice(0, 5).join(", ")}
                      </p>
                    ) : null}
                    {candidate.parseWarnings.length ? (
                      <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label3)]">
                        Warnings: {candidate.parseWarnings.slice(0, 5).join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" disabled={isSubmitting} onClick={() => reviewCandidate(candidate.candidateId, { action: "approve_for_workspace_preview", reviewReason })}>
                        Preview only
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={isSubmitting} onClick={() => reviewCandidate(candidate.candidateId, { action: "mark_needs_review", reviewReason })}>
                        Needs review
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={isSubmitting} onClick={() => reviewCandidate(candidate.candidateId, { action: "quarantine", reviewReason })}>
                        Quarantine
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={isSubmitting} onClick={() => reviewCandidate(candidate.candidateId, { action: "reject", reviewReason })}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[18px] border border-dashed border-[color:var(--glass-border)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              No external signal candidates are visible yet for this filter. Mock candidates stay in this
              Super Admin review lane and do not become workspace or student signals.
            </p>
          )}

          {overview.latestSources.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Safe source allowlist records</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {overview.latestSources.slice(0, 6).map((source) => (
                  <div
                    key={source.sourceId}
                    className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                          {source.safeLabel}
                        </p>
                        <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                          {source.maskedSourceRef} / {source.sourceType.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge tone={source.status === "enabled" ? "amber" : "neutral"}>{source.status}</Badge>
                    </div>
                    <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                      Symbols: {source.allowedSymbols.length ? source.allowedSymbols.slice(0, 6).join(", ") : "none configured"}
                    </p>
                    <Button
                      className="mt-3"
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isSubmitting || source.status === "disabled"}
                      onClick={() => upsertSource({ action: "disable", sourceId: source.sourceId })}
                    >
                      Disable source
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[18px] border border-dashed border-[color:var(--glass-border)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              No source allowlist records exist yet. Sources are disabled by default and store masked refs only.
            </p>
          )}

          {overview.warnings.map((warning) => (
            <p
              key={warning}
              className="break-safe rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]"
            >
              {warning}
            </p>
          ))}
        </>
      ) : (
        <p className="break-safe rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "External signal ingestion readiness is loading. Ingestion remains disabled."}
        </p>
      )}
    </GlassCard>
  );
}
