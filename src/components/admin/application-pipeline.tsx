import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  applicationSourceLabels,
  applicationStatusLabels,
  applicationStatusOrder,
  getStatusTone
} from "@/lib/admin/admin-labels";
import { formatCompactNumber } from "@/lib/mock-selectors";
import type { AdminApplicationListResponse } from "@/types/admin-api";
import type { ApplicationSource, ApplicationStatus, WorkspaceApplication } from "@/types/tradehub";

type ApplicationPipelineProps = {
  response: AdminApplicationListResponse | null;
  selectedId: string | null;
  status: ApplicationStatus | "all";
  source: ApplicationSource | "all";
  market: WorkspaceApplication["market"] | "all";
  solana: "all" | "interested" | "not_interested";
  query: string;
  loading: boolean;
  onSelect: (applicationId: string) => void;
  onStatusChange: (status: ApplicationStatus | "all") => void;
  onSourceChange: (source: ApplicationSource | "all") => void;
  onMarketChange: (market: WorkspaceApplication["market"] | "all") => void;
  onSolanaChange: (value: "all" | "interested" | "not_interested") => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
};

const fieldClasses =
  "focus-ring h-11 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-3 text-sm text-[color:var(--label)]";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function ApplicationPipeline({
  response,
  selectedId,
  status,
  source,
  market,
  solana,
  query,
  loading,
  onSelect,
  onStatusChange,
  onSourceChange,
  onMarketChange,
  onSolanaChange,
  onQueryChange,
  onRefresh
}: ApplicationPipelineProps) {
  const applications = response?.applications ?? [];

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">Application pipeline</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Onboarder CRM queue.
          </h2>
        </div>
        <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onStatusChange("all")}
          className={status === "all" ? "nav-chip border-[color:var(--accent)]" : "nav-chip"}
        >
          All
        </button>
        {applicationStatusOrder.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onStatusChange(item)}
            className={status === item ? "nav-chip border-[color:var(--accent)]" : "nav-chip"}
          >
            {applicationStatusLabels[item]}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className={fieldClasses}
          placeholder="Search name, email, or handle"
          type="search"
        />
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value as ApplicationSource | "all")}
          className={fieldClasses}
        >
          <option value="all">All sources</option>
          <option value="landing_page">{applicationSourceLabels.landing_page}</option>
          <option value="referral">{applicationSourceLabels.referral}</option>
          <option value="manual">{applicationSourceLabels.manual}</option>
        </select>
        <select
          value={market}
          onChange={(event) => onMarketChange(event.target.value as WorkspaceApplication["market"] | "all")}
          className={fieldClasses}
        >
          <option value="all">All markets</option>
          <option value="forex">Forex</option>
          <option value="crypto">Crypto</option>
          <option value="both">Forex + crypto</option>
        </select>
        <select
          value={solana}
          onChange={(event) => onSolanaChange(event.target.value as "all" | "interested" | "not_interested")}
          className={fieldClasses}
        >
          <option value="all">Solana: all</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not interested</option>
        </select>
      </div>

      <div className="bounded-list-4 space-y-3">
        {applications.length > 0 ? (
          applications.map((application) => (
            <button
              key={application.applicationId}
              type="button"
              onClick={() => onSelect(application.applicationId)}
              className={[
                "focus-ring w-full rounded-[20px] border px-4 py-4 text-left transition",
                selectedId === application.applicationId
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)]"
                  : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_70%,transparent)] hover:border-[color:var(--accent)]"
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-[color:var(--label)]">{application.name}</p>
                  <p className="mt-1 break-all text-sm text-[color:var(--label2)]">
                    {application.email} - {application.handleOrChannel}
                  </p>
                </div>
                <Badge tone={getStatusTone(application.status)}>
                  {applicationStatusLabels[application.status]}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 break-words text-xs text-[color:var(--label3)]">
                <span>{formatCompactNumber(application.audienceSize)} audience</span>
                <span>{application.market}</span>
                <span>{applicationSourceLabels[application.source]}</span>
                <span>Updated {formatDate(application.updatedAt)}</span>
              </div>
            </button>
          ))
        ) : (
          <p className="rounded-[20px] border border-[color:var(--line)] px-4 py-6 text-sm leading-6 text-[color:var(--label2)]">
            No applications match the current filters.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
