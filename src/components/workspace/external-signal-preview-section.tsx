import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestWorkspaceDashboardApi } from "@/lib/workspace/dashboard-api-client";
import type {
  ExternalSignalAssetClass,
  WorkspaceExternalSignalPromotionResponse,
  WorkspaceExternalSignalPreviewRecord,
  WorkspaceExternalSignalPreviewResponse
} from "@/types/external-signal-ingestion";

const inputClass =
  "focus-ring min-h-10 rounded-[12px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

function formatDateTime(value: string) {
  const date = new Date(value);

  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date)
    : "Unknown time";
}

function formatEntryRange(preview: WorkspaceExternalSignalPreviewRecord) {
  return preview.entryRange.max
    ? `${preview.entryRange.min} - ${preview.entryRange.max}`
    : preview.entryRange.min;
}

export function ExternalSignalPreviewSection({
  preview,
  loading,
  errorMessage,
  onRefresh
}: {
  preview: WorkspaceExternalSignalPreviewResponse | null;
  loading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
}) {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [assetClassFilter, setAssetClassFilter] = useState<ExternalSignalAssetClass | "all">("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<"all" | "approved_for_workspace_preview">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [publishingPreviewId, setPublishingPreviewId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredPreviews = useMemo(() => {
    const normalizedSymbol = symbolFilter.trim().toUpperCase();
    const normalizedSource = sourceFilter.trim().toLowerCase();

    return (preview?.previews ?? []).filter((entry) => {
      if (normalizedSymbol && !entry.symbol.includes(normalizedSymbol)) {
        return false;
      }

      if (assetClassFilter !== "all" && entry.assetClass !== assetClassFilter) {
        return false;
      }

      if (normalizedSource && !entry.sourceLabel.toLowerCase().includes(normalizedSource)) {
        return false;
      }

      if (reviewStatusFilter !== "all" && entry.reviewStatus !== reviewStatusFilter) {
        return false;
      }

      if (dateFilter && entry.updatedAt.slice(0, 10) !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [assetClassFilter, dateFilter, preview?.previews, reviewStatusFilter, sourceFilter, symbolFilter]);

  async function publishPreview(entry: WorkspaceExternalSignalPreviewRecord) {
    const confirmed = window.confirm(
      `Publish ${entry.symbol} as a moderated TradeHub signal? Existing Copier gates still decide student routing.`
    );

    if (!confirmed) return;

    setPublishingPreviewId(entry.previewId);
    setLocalMessage(null);
    setLocalError(null);

    try {
      const body = await requestWorkspaceDashboardApi<WorkspaceExternalSignalPromotionResponse>(
        "/api/workspace/signals/external-preview/publish",
        {
        method: "POST",
        body: JSON.stringify({ previewId: entry.previewId })
        }
      );

      if (body?.ok !== true) {
        throw new Error("TradeHub could not publish this preview.");
      }

      setLocalMessage(typeof body.safeMessage === "string" ? body.safeMessage : "Preview published as a moderated TradeHub signal.");
      onRefresh();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "TradeHub could not publish this preview.");
    } finally {
      setPublishingPreviewId(null);
    }
  }

  if (!preview) {
    return (
      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow !text-[color:var(--label3)]">External preview only</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              External signal preview
            </h2>
          </div>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </Button>
        </div>
        <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "Approved external preview records have not loaded yet."}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">External preview only</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
            Reviewed master-trader candidates
          </h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Read-only candidates approved by Super Admin for workspace inspection. Not a TradeHub signal.
            Not student-visible. Not AutoCopy executable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">Preview only</Badge>
          <Badge tone="neutral">Read-only</Badge>
          <Badge tone="red">No execution</Badge>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatChip label="Preview" value={String(preview.summary.previewCount)} tone="green" />
        <StatChip label="Sampled" value={String(preview.summary.sampledCount)} />
        <StatChip label="Symbols" value={String(preview.summary.symbolCount)} />
        <StatChip label="Sources" value={String(preview.summary.sourceCount)} />
        <StatChip
          label="Risk flags"
          value={String(preview.summary.riskFlaggedCount)}
          tone={preview.summary.riskFlaggedCount ? "amber" : "green"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.85fr_0.85fr_1fr_1fr_0.9fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Symbol
          <input
            className={inputClass}
            value={symbolFilter}
            placeholder="BTCUSDT"
            onChange={(event) => setSymbolFilter(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Asset
          <select
            className={inputClass}
            value={assetClassFilter}
            onChange={(event) => setAssetClassFilter(event.target.value as ExternalSignalAssetClass | "all")}
          >
            <option value="all">All</option>
            <option value="crypto">Crypto</option>
            <option value="forex">Forex</option>
            <option value="cfd">CFD</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Source label
          <input
            className={inputClass}
            value={sourceFilter}
            placeholder="Manual seed"
            onChange={(event) => setSourceFilter(event.target.value.slice(0, 80))}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Review status
          <select
            className={inputClass}
            value={reviewStatusFilter}
            onChange={(event) => setReviewStatusFilter(event.target.value as "all" | "approved_for_workspace_preview")}
          >
            <option value="all">All approved</option>
            <option value="approved_for_workspace_preview">Approved preview</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Date
          <input
            className={inputClass}
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setSymbolFilter("");
            setAssetClassFilter("all");
            setSourceFilter("");
            setReviewStatusFilter("all");
            setDateFilter("");
          }}
        >
          Reset
        </Button>
      </div>

      {errorMessage ? (
        <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
          {errorMessage}
        </p>
      ) : null}

      {localMessage ? (
        <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--green)_30%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {localMessage}
        </p>
      ) : null}

      {localError ? (
        <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
          {localError}
        </p>
      ) : null}

      <div className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
        Only approved Telegram previews can be published as moderated TradeHub signals. Publishing never bypasses
        student billing, setup, consent, risk, pause, or execution gates.
      </div>

      {filteredPreviews.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredPreviews.map((entry) => (
            <article
              key={entry.previewId}
              className="grid gap-3 rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_70%,transparent)] p-4"
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[color:var(--label)]">
                    {entry.symbol} · {entry.side}
                  </h3>
                  <p className="mt-1 truncate text-xs text-[color:var(--label3)]">
                    {entry.sourceLabel} · {entry.assetClass} · {formatDateTime(entry.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={entry.publishedSignalRef ? "green" : "amber"}>
                    {entry.publishedSignalRef ? "Published" : "Approved preview"}
                  </Badge>
                  {entry.publishable ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={publishingPreviewId === entry.previewId}
                      onClick={() => publishPreview(entry)}
                    >
                      {publishingPreviewId === entry.previewId ? "Publishing..." : "Publish"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-[color:var(--label2)]">
                  <span className="text-[color:var(--label3)]">Entry </span>
                  <span className="font-semibold text-[color:var(--label)]">{formatEntryRange(entry)}</span>
                </p>
                <p className="text-[color:var(--label2)]">
                  <span className="text-[color:var(--label3)]">SL </span>
                  <span className="font-semibold text-[color:var(--label)]">{entry.stopLoss ?? "Not provided"}</span>
                </p>
                <p className="text-[color:var(--label2)]">
                  <span className="text-[color:var(--label3)]">TP </span>
                  <span className="font-semibold text-[color:var(--label)]">
                    {entry.takeProfits.length ? entry.takeProfits.join(", ") : "Not provided"}
                  </span>
                </p>
                <p className="text-[color:var(--label2)]">
                  <span className="text-[color:var(--label3)]">Confidence </span>
                  <span className="font-semibold text-[color:var(--label)]">{entry.confidence}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{entry.maskedSourceRef}</Badge>
                <Badge tone={entry.riskFlags.length ? "amber" : "green"}>
                  {entry.riskFlags.length ? `${entry.riskFlags.length} risk flag${entry.riskFlags.length === 1 ? "" : "s"}` : "No risk flags"}
                </Badge>
                <Badge tone="neutral">{entry.reviewStatus.replace(/_/g, " ")}</Badge>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-[color:var(--line)] p-5 text-sm leading-6 text-[color:var(--label2)]">
          No approved external preview candidates match these filters. Rejected, quarantined, duplicate, and unreviewed
          candidates stay out of workspace preview.
        </div>
      )}

      {preview.warnings.length ? (
        <div className="grid gap-2">
          {preview.warnings.map((warning) => (
            <p key={warning} className="break-safe rounded-[8px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </GlassCard>
  );
}
