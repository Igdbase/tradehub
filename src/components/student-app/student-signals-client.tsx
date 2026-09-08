"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  StudentSignalFeedCard,
  StudentSignalFilter,
  StudentSignalsResponse
} from "@/types/student-signals";

const filters: { value: StudentSignalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "open", label: "Open" }
];

function directionTone(side: StudentSignalFeedCard["side"]) {
  return side === "sell" ? "red" : "green";
}

function lifecycleTone(lifecycle: StudentSignalFeedCard["lifecycle"]) {
  if (lifecycle === "open") return "green" as const;
  if (lifecycle === "closed") return "accent" as const;
  if (lifecycle === "cancelled") return "red" as const;
  return "neutral" as const;
}

function formatMarket(value: StudentSignalFeedCard["market"]) {
  return value === "crypto" ? "Crypto" : "Forex";
}

function formatMoney(value: number, currency: string) {
  const sign = value > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2
  }).format(value);
  return `${sign}${formatted} ${currency}`;
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "focus-ring inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]"
          : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] text-[color:var(--label2)] hover:border-[color:var(--accent)] hover:text-[color:var(--label)]"
      ].join(" ")}
    >
      <span>{label}</span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[color:var(--line)] py-3 sm:border-b-0 sm:border-r sm:pr-4 last:sm:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--label3)]">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-[color:var(--label)]">{value}</p>
    </div>
  );
}

function SignalRow({ signal }: { signal: StudentSignalFeedCard }) {
  const sideTone = directionTone(signal.side);
  const hasPnl = Boolean(signal.copied.pnl);

  return (
    <article
      data-testid="student-signal-card"
      className="signal-ticket-new min-w-0 rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_82%,black)] px-4 py-4 sm:px-5"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-2xl font-bold tracking-[0] text-[color:var(--label)]">
              {signal.symbol}
            </h2>
            <Badge tone={sideTone} uppercase>{signal.side}</Badge>
            <Badge tone={lifecycleTone(signal.lifecycle)} uppercase>{signal.statusLabel}</Badge>
            {signal.copied.copiedState !== "not_copied" ? (
              <Badge tone="accent" uppercase>
                {signal.copied.copiedState === "executed" ? "Executed" : "Copied"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[color:var(--label3)]">
            {formatMarket(signal.market)} · {signal.ageLabel}
          </p>
        </div>
        <div className="text-right text-sm font-semibold text-[color:var(--label3)]">
          {signal.copied.sourceLabel ?? signal.sourceLabel}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--label3)]">Entry</p>
          <p className="tabular-nums truncate text-xl font-semibold text-[color:var(--label)]">{signal.entry}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--label3)]">SL</p>
          <p className="tabular-nums truncate text-xl font-semibold text-[color:var(--red)]">{signal.stopLoss}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--label3)]">TP</p>
          <p className="tabular-nums truncate text-xl font-semibold text-[color:var(--green)]">{signal.takeProfit}</p>
        </div>
        {hasPnl && signal.copied.pnl ? (
          <div className="min-w-0 text-left sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--label3)]">
              {signal.copied.pnl.label}
            </p>
            <p
              data-testid="student-signal-pnl"
              className={[
                "tabular-nums text-xl font-bold",
                signal.copied.pnl.value >= 0 ? "text-[color:var(--green)]" : "text-[color:var(--red)]"
              ].join(" ")}
            >
              {formatMoney(signal.copied.pnl.value, signal.copied.pnl.currency)}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StudentSignalsBody() {
  const [response, setResponse] = useState<StudentSignalsResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<StudentSignalFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSignals = useCallback(async (filter: StudentSignalFilter, cursor?: string | null) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentSignalsResponse>(
        `/api/student/signals?limit=25&filter=${encodeURIComponent(filter)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      );
      setResponse((current) =>
        cursor && current
          ? {
              ...payload,
              signals: [...current.signals, ...payload.signals],
              pageInfo: {
                ...payload.pageInfo,
                visibleCount: current.signals.length + payload.signals.length
              },
              overview: {
                ...payload.overview,
                copiedCount: [...current.signals, ...payload.signals].filter((signal) => signal.copied.copiedState === "copied").length,
                executedCount: [...current.signals, ...payload.signals].filter((signal) => signal.copied.copiedState === "executed").length,
                openCount: [...current.signals, ...payload.signals].filter((signal) => signal.lifecycle === "open").length
              }
            }
          : payload
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load signals.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadSignals(activeFilter);
  }, [activeFilter, loadSignals]);

  return (
    <StudentShell
      active="signals"
      eyebrow="Signals"
      title="TradeHub signals"
      subtitle="Signals shared by your educator, shown as a compact trading feed."
      action={
        <Badge tone={response?.overview.accessState === "available" ? "green" : "amber"}>
          {response?.overview.accessState === "available" ? "Available" : "Locked"}
        </Badge>
      }
    >
      <section data-testid="student-signals-workspace" className="mx-auto w-full max-w-[1180px] space-y-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-testid="student-signals-filters">
          {filters.map((filter) => (
            <FilterButton
              key={filter.value}
              active={activeFilter === filter.value}
              label={filter.label}
              onClick={() => setActiveFilter(filter.value)}
            />
          ))}
        </div>

        <div className="grid min-w-0 gap-4 rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,black)] px-4 py-2 sm:grid-cols-4 sm:px-5">
          <Metric label="Visible" value={String(response?.pageInfo.visibleCount ?? 0)} />
          <Metric label="Open" value={String(response?.overview.openCount ?? 0)} />
          <Metric label="Copied" value={String(response?.overview.copiedCount ?? 0)} />
          <Metric label="Executed" value={String(response?.overview.executedCount ?? 0)} />
        </div>

        {errorMessage ? (
          <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
            <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
            <Button onClick={() => loadSignals(activeFilter)} variant="secondary">
              Retry
            </Button>
          </GlassCard>
        ) : null}

        {response?.notices.map((notice) => (
          <p
            key={notice}
            data-testid="student-signals-truncation-notice"
            className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]"
          >
            {notice}
          </p>
        ))}

        {isLoading ? (
          <GlassCard>
            <p className="text-sm leading-6 text-[color:var(--label2)]">Loading signals...</p>
          </GlassCard>
        ) : response && response.overview.accessState !== "available" ? (
          <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
            <p className="eyebrow !text-[color:var(--amber)]">Signals locked</p>
            <p className="text-sm leading-6 text-[color:var(--label2)]">{response.overview.accessReason}</p>
            <Button href="/app/billing" variant="secondary">
              Review access
            </Button>
          </GlassCard>
        ) : response && response.signals.length > 0 ? (
          <>
            <div className="grid min-w-0 gap-4">
              {response.signals.map((signal) => (
                <SignalRow key={signal.signalRef} signal={signal} />
              ))}
            </div>
            {response.pageInfo.hasMore && response.pageInfo.nextCursor ? (
              <div className="flex justify-center">
                <Button
                  data-testid="student-signals-load-more"
                  onClick={() => loadSignals(activeFilter, response.pageInfo.nextCursor)}
                  variant="secondary"
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div
            data-testid="student-signals-empty-state"
            className="rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,black)] px-5 py-6"
          >
            <p className="text-sm font-semibold text-[color:var(--label)]">No signals in this view</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              When your educator shares a signal that matches this filter, it will appear here.
            </p>
          </div>
        )}
      </section>
    </StudentShell>
  );
}

export function StudentSignalsClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/signals">
      <StudentSignalsBody />
    </RoleGate>
  );
}
