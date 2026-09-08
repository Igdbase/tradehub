import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { formatPracticeMoney } from "@/lib/practice/practice-instrument-specs";
import type {
  WorkspacePracticeInsightsFilters,
  WorkspacePracticeInsightsResponse,
  WorkspacePracticeInsightsStatusFilter
} from "@/types/practice";

const inputClass =
  "focus-ring min-h-10 rounded-[12px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function dateInputValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function WorkspacePracticeInsightsSection({
  insights,
  filters,
  loading,
  errorMessage,
  onFiltersChange,
  onRefresh
}: {
  insights: WorkspacePracticeInsightsResponse | null;
  filters: WorkspacePracticeInsightsFilters;
  loading: boolean;
  errorMessage: string | null;
  onFiltersChange: (filters: WorkspacePracticeInsightsFilters) => void;
  onRefresh: () => void;
}) {
  if (!insights) {
    return (
      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow !text-[color:var(--label3)]">Practice Insights</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">Student practice progress</h2>
          </div>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </Button>
        </div>
        <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "Workspace practice insights have not loaded yet."}
        </p>
      </GlassCard>
    );
  }

  const hasPracticeData = insights.summary.totalPracticeSessions > 0;

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Practice Insights</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
            Student backtesting progress
          </h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Aggregate simulated-practice activity only. Use this to spot participation, symbols,
            strategies, and challenge outcomes without seeing private student journals, raw trade
            history, or hidden candles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={insights.bounded ? "amber" : "green"}>
            {insights.bounded ? "Bounded sample" : "Within limits"}
          </Badge>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Status
          <select
            className={inputClass}
            value={filters.status}
            onChange={(event) => onFiltersChange({ ...filters, status: event.target.value as WorkspacePracticeInsightsStatusFilter })}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="abandoned">Abandoned</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Symbol
          <input
            className={inputClass}
            value={filters.symbol ?? ""}
            placeholder="BTCUSDT"
            onChange={(event) => onFiltersChange({ ...filters, symbol: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || undefined })}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          Timeframe
          <select
            className={inputClass}
            value={filters.timeframeMinutes ?? ""}
            onChange={(event) => onFiltersChange({ ...filters, timeframeMinutes: event.target.value ? Number(event.target.value) : undefined })}
          >
            <option value="">All</option>
            <option value="15">M15</option>
            <option value="60">H1</option>
            <option value="240">H4</option>
            <option value="1440">D1</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          From
          <input
            className={inputClass}
            type="date"
            value={dateInputValue(filters.dateStart)}
            onChange={(event) => onFiltersChange({ ...filters, dateStart: event.target.value ? `${event.target.value}T00:00:00.000Z` : undefined })}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[color:var(--label)]">
          To
          <input
            className={inputClass}
            type="date"
            value={dateInputValue(filters.dateEnd)}
            onChange={(event) => onFiltersChange({ ...filters, dateEnd: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined })}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onFiltersChange({ status: "all" })}
          disabled={loading}
        >
          Reset
        </Button>
      </div>

      {errorMessage ? (
        <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
          {errorMessage}
        </p>
      ) : null}

      {hasPracticeData ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatChip label="Active students" value={String(insights.summary.totalActivePracticeStudents)} tone="green" />
            <StatChip label="Sessions" value={String(insights.summary.totalPracticeSessions)} />
            <StatChip label="Completed" value={String(insights.summary.completedPracticeSessions)} tone="green" />
            <StatChip label="Archived" value={String(insights.summary.archivedPracticeSessions)} tone="amber" />
            <StatChip label="Closed trades" value={String(insights.summary.totalSimulatedClosedTrades)} />
            <StatChip label="Practice P&L" value={formatPracticeMoney(insights.summary.aggregatePracticePnl)} tone={insights.summary.aggregatePracticePnl >= 0 ? "green" : "red"} />
            <StatChip label="Win" value={formatPercent(insights.summary.averageWinRate)} />
            <StatChip label="Avg R" value={insights.summary.averageR.toFixed(2)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[color:var(--label)]">Challenge status</p>
                <Badge tone="accent">Simulated</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <StatChip label="Passed" value={String(insights.summary.challengePassed)} tone="green" />
                <StatChip label="Failed" value={String(insights.summary.challengeFailed)} tone="red" />
                <StatChip label="In progress" value={String(insights.summary.challengeInProgress)} tone="amber" />
              </div>
            </div>

            <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
              <p className="text-sm font-semibold text-[color:var(--label)]">Most practiced symbols</p>
              {insights.mostPracticedSymbols.length ? (
                insights.mostPracticedSymbols.map((symbol) => (
                  <div key={`${symbol.assetClass}-${symbol.symbol}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate font-semibold text-[color:var(--label)]">{symbol.symbol} · {symbol.assetClass}</span>
                    <span className="text-[color:var(--label2)]">{symbol.sessions} sessions · {formatPracticeMoney(symbol.netPnl)}</span>
                  </div>
                ))
              ) : (
                <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">No symbol activity matches these filters yet. Ask students to complete simulated sessions for aggregate symbol trends.</p>
              )}
            </div>

            <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
              <p className="text-sm font-semibold text-[color:var(--label)]">Most used playbooks</p>
              {insights.mostUsedPlaybooks.length ? (
                insights.mostUsedPlaybooks.map((playbook) => (
                  <div key={playbook.playbookName} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate font-semibold text-[color:var(--label)]">{playbook.playbookName}</span>
                    <span className="text-[color:var(--label2)]">{playbook.uses} uses · {playbook.closedTrades} closed</span>
                  </div>
                ))
              ) : (
                <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">No playbook usage matches these filters yet. Playbook names appear only as aggregate-safe labels.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">Recent completed sessions</p>
            {insights.recentCompletedSessions.length ? (
              <div className="grid gap-2">
                {insights.recentCompletedSessions.map((session) => (
                  <div key={session.maskedSessionRef} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[color:var(--label)]">
                        {session.maskedStudentId} · {session.symbol} · {session.timeframeMinutes}m
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--label2)]">
                        {session.completedAt ? new Date(session.completedAt).toLocaleDateString("en-NG") : "Completed"} · {session.closedTrades} closed · Win {formatPercent(session.winRate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Badge tone={session.netPnl >= 0 ? "green" : "red"}>{formatPracticeMoney(session.netPnl)}</Badge>
                      <Badge tone="accent">{session.averageR.toFixed(2)}R</Badge>
                      {session.challengeStatus ? <Badge tone={session.challengeStatus === "passed" ? "green" : session.challengeStatus === "failed" ? "red" : "amber"}>{session.challengeStatus}</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">No completed practice sessions match these filters yet. Recent rows use masked student and session references only.</p>
            )}
          </div>
        </>
      ) : (
        <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          No student practice data matches these filters yet. As students create and complete simulated sessions, aggregate progress appears here without raw trades, notes, hidden candles, or journal text.
        </p>
      )}
    </GlassCard>
  );
}
