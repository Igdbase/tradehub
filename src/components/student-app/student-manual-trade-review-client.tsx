"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { formatDateTime, formatStatusLabel } from "@/components/student-app/student-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  ManualJournalTrade,
  ManualJournalTradeInput,
  ManualJournalTradeMutationResponse,
  ManualJournalTradeReviewResponse
} from "@/types/manual-journal";
import type { NormalizedCandle } from "@/types/practice";

type ReviewFormState = {
  strategyName: string;
  tags: string;
  notes: string;
  lessonLearned: string;
};

function candleToChartData(candle: NormalizedCandle): CandlestickData<UTCTimestamp> {
  return {
    time: Math.floor(Date.parse(candle.openTime) / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  };
}

function formatNumber(value?: number, maximumFractionDigits = 8) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits });
}

function formatMoney(value?: number) {
  return formatNumber(value, 2);
}

function outcomeTone(outcome: ManualJournalTrade["outcome"]) {
  if (outcome === "win") {
    return "green";
  }

  if (outcome === "loss") {
    return "red";
  }

  if (outcome === "breakeven") {
    return "amber";
  }

  return "accent";
}

function tradeToReviewForm(trade: ManualJournalTrade): ReviewFormState {
  return {
    strategyName: trade.strategyName ?? "",
    tags: trade.tags.join(", "),
    notes: trade.notes ?? "",
    lessonLearned: trade.lessonLearned ?? ""
  };
}

function reviewFormToPayload(trade: ManualJournalTrade, form: ReviewFormState): ManualJournalTradeInput {
  return {
    market: trade.market,
    symbol: trade.symbol,
    side: trade.side,
    status: trade.status,
    entryPrice: trade.entryPrice ?? "",
    exitPrice: trade.exitPrice ?? "",
    quantity: trade.quantity ?? "",
    stopLoss: trade.stopLoss ?? "",
    takeProfit: trade.takeProfit ?? "",
    fees: trade.fees ?? 0,
    openedAt: trade.openedAt ?? "",
    closedAt: trade.closedAt ?? "",
    strategyName: form.strategyName,
    tags: form.tags,
    emotion: trade.emotion ?? "",
    mistakeCategory: trade.mistakeCategory ?? "",
    setupQuality: trade.setupQuality ?? "",
    notes: form.notes,
    lessonLearned: form.lessonLearned
  };
}

function ManualTradeReviewChart({
  trade,
  candles,
  message
}: {
  trade: ManualJournalTrade;
  candles: NormalizedCandle[];
  message: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<Array<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>>>([]);
  const chartData = useMemo(() => candles.map(candleToChartData), [candles]);
  const isLong = trade.side === "buy_long";
  const tradeColor = trade.outcome === "loss" ? "#ef4444" : "#18a999";

  useEffect(() => {
    const container = containerRef.current;

    if (!container || candles.length === 0) {
      return undefined;
    }

    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--label2").trim() || "#d8dde8";
    const gridColor = styles.getPropertyValue("--line").trim() || "rgba(148, 163, 184, 0.28)";
    const chart = createChart(container, {
      autoSize: true,
      height: 430,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor
      },
      grid: {
        horzLines: { color: gridColor },
        vertLines: { color: gridColor }
      },
      rightPriceScale: {
        borderColor: gridColor
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true
      },
      crosshair: {
        mode: 1
      }
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#18a999",
      borderUpColor: "#18a999",
      wickUpColor: "#18a999",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      wickDownColor: "#ef4444"
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [candles.length]);

  useEffect(() => {
    const series = seriesRef.current;

    if (!series) {
      return;
    }

    series.setData(chartData);

    for (const line of priceLinesRef.current) {
      series.removePriceLine(line);
    }

    priceLinesRef.current = [];

    if (trade.entryPrice) {
      priceLinesRef.current.push(series.createPriceLine({
        price: trade.entryPrice,
        color: tradeColor,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: isLong ? "Entry long" : "Entry short"
      }));
    }

    if (trade.exitPrice) {
      priceLinesRef.current.push(series.createPriceLine({
        price: trade.exitPrice,
        color: "#d9c28c",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "Exit"
      }));
    }

    if (trade.stopLoss) {
      priceLinesRef.current.push(series.createPriceLine({
        price: trade.stopLoss,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL"
      }));
    }

    if (trade.takeProfit) {
      priceLinesRef.current.push(series.createPriceLine({
        price: trade.takeProfit,
        color: "#18a999",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP"
      }));
    }

    if (chartData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [chartData, isLong, trade.entryPrice, trade.exitPrice, trade.stopLoss, trade.takeProfit, tradeColor]);

  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--ink)_86%,black_8%)]">
      {candles.length ? (
        <>
          <div ref={containerRef} className="h-[430px] w-full" data-manual-review-chart />
          <div className="pointer-events-none absolute left-3 top-3 flex max-w-[min(92%,34rem)] flex-wrap gap-2">
            <Badge tone={outcomeTone(trade.outcome)}>
              {trade.side === "buy_long" ? "Long" : "Short"} · {trade.outcome}
            </Badge>
            {trade.status === "open" ? <Badge tone="amber">No exit yet</Badge> : null}
            {trade.status === "planned" ? <Badge tone="accent">Planned</Badge> : null}
          </div>
        </>
      ) : (
        <div className="grid min-h-[430px] place-items-center px-6 text-center">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-[color:var(--label)]">No review candles available</p>
            <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentManualTradeReviewBody({ tradeId }: { tradeId: string }) {
  const [response, setResponse] = useState<ManualJournalTradeReviewResponse | null>(null);
  const [form, setForm] = useState<ReviewFormState>({
    strategyName: "",
    tags: "",
    notes: "",
    lessonLearned: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadReview = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<ManualJournalTradeReviewResponse>(
        `/api/student/journal/manual-trades/${encodeURIComponent(tradeId)}/review`
      );
      setResponse(payload);
      setForm(tradeToReviewForm(payload.trade));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load this manual trade review."
      );
    } finally {
      setIsLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const saveReview = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!response?.trade || response.review.readOnly) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = await requestCourseHubApi<ManualJournalTradeMutationResponse>(
        `/api/student/journal/manual-trades/${encodeURIComponent(tradeId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(reviewFormToPayload(response.trade, form))
        }
      );

      setSuccessMessage(payload.message);
      await loadReview();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not save the review fields."
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, loadReview, response?.review.readOnly, response?.trade, tradeId]);

  const trade = response?.trade;

  return (
    <StudentShell
      active="journal"
      eyebrow="Manual journal"
      title={trade ? `${trade.symbol} trade review` : "Manual trade review"}
      subtitle="Private trade review uses your student-owned manual journal row and approved practice historical candle sources only."
      action={
        <div className="flex flex-wrap gap-2">
          <Button href="/app/journal" variant="secondary">Back to journal</Button>
          {trade ? <Badge tone={outcomeTone(trade.outcome)}>{formatStatusLabel(trade.outcome)}</Badge> : null}
        </div>
      }
    >
      {errorMessage ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="break-safe text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          <Button onClick={loadReview} variant="secondary">Retry</Button>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading manual trade review...</p>
        </GlassCard>
      ) : trade && response ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <GlassCard className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--label)]">Trade review chart</p>
                  <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                    {response.chart.safeMessage}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={response.chart.available ? "green" : "amber"}>
                    {response.chart.available ? "Candles loaded" : "Chart empty"}
                  </Badge>
                  {response.chart.provider ? <Badge tone="neutral">{response.chart.provider}</Badge> : null}
                </div>
              </div>
              <ManualTradeReviewChart
                trade={trade}
                candles={response.chart.candles}
                message={response.chart.safeMessage}
              />
              {response.chart.warnings.map((warning) => (
                <p key={warning} className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                  {warning}
                </p>
              ))}
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--label)]">{trade.symbol}</p>
                  <p className="mt-1 text-xs text-[color:var(--label2)]">
                    {trade.market.toUpperCase()} · {trade.side === "buy_long" ? "Buy / Long" : "Sell / Short"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={trade.archivedAt ? "amber" : "accent"}>{trade.archivedAt ? "Read-only" : trade.status}</Badge>
                  <Badge tone={outcomeTone(trade.outcome)}>{trade.outcome}</Badge>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatChip label="Entry" value={formatNumber(trade.entryPrice)} />
                <StatChip label="Exit" value={formatNumber(trade.exitPrice)} />
                <StatChip label="SL" value={formatNumber(trade.stopLoss)} />
                <StatChip label="TP" value={formatNumber(trade.takeProfit)} />
                <StatChip label="Size" value={formatNumber(trade.quantity)} />
                <StatChip label="Fees" value={formatMoney(trade.fees)} />
                <StatChip label="Gross P&L" value={formatMoney(trade.grossPnl)} tone={(trade.grossPnl ?? 0) >= 0 ? "green" : "red"} />
                <StatChip label="Net P&L" value={formatMoney(trade.netPnl)} tone={(trade.netPnl ?? 0) >= 0 ? "green" : "red"} />
                <StatChip label="Risk" value={formatMoney(trade.riskAmount)} />
                <StatChip label="R" value={typeof trade.rMultiple === "number" ? `${trade.rMultiple.toFixed(2)}R` : "-"} />
              </div>
              <div className="grid gap-2 text-xs leading-5 text-[color:var(--label2)]">
                <p className="break-safe">Opened: {trade.openedAt ? formatDateTime(trade.openedAt) : "Not set"}</p>
                <p className="break-safe">Closed: {trade.closedAt ? formatDateTime(trade.closedAt) : trade.status === "open" ? "Open trade has no exit yet" : "Not set"}</p>
                <p className="break-safe">Emotion: {trade.emotion || "Not recorded"}</p>
                <p className="break-safe">Mistake: {trade.mistakeCategory || "Not recorded"}</p>
                <p className="break-safe">Setup quality: {trade.setupQuality ? trade.setupQuality.replace(/_/g, " ").toUpperCase() : "Not scored"}</p>
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <GlassCard className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--label)]">Strategy, tags, and review notes</p>
                <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  {response.review.safeMessage}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                  <p className="text-xs font-semibold text-[color:var(--label)]">Strategy/playbook</p>
                  <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                    {trade.strategyName || "No strategy saved yet."}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                  <p className="text-xs font-semibold text-[color:var(--label)]">Tags</p>
                  <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                    {trade.tags.length ? trade.tags.join(", ") : "No tags saved yet."}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                  <p className="text-xs font-semibold text-[color:var(--label)]">Private notes</p>
                  <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                    {trade.notes || "No private note saved yet."}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                  <p className="text-xs font-semibold text-[color:var(--label)]">Lesson learned</p>
                  <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                    {trade.lessonLearned || "No lesson learned saved yet."}
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="space-y-4">
              <form onSubmit={saveReview} className="space-y-4" data-manual-review-editor>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--label)]">Review editing shortcuts</p>
                    <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                      Update only journal review fields. Price, size, status, and outcome edits remain on the main journal form.
                    </p>
                  </div>
                  {trade.archivedAt ? <Badge tone="amber">Archived read-only</Badge> : null}
                </div>
                {successMessage ? (
                  <p className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--green)_34%,transparent)] px-3 py-2 text-sm leading-6 text-[color:var(--green)]">
                    {successMessage}
                  </p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-[color:var(--label2)]">
                    Strategy / playbook
                    <input
                      value={form.strategyName}
                      disabled={response.review.readOnly}
                      onChange={(event) => setForm((current) => ({ ...current, strategyName: event.target.value }))}
                      className="min-h-10 rounded-[8px] border border-[color:var(--line)] bg-transparent px-3 text-sm text-[color:var(--label)]"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[color:var(--label2)]">
                    Tags
                    <input
                      value={form.tags}
                      disabled={response.review.readOnly}
                      onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                      className="min-h-10 rounded-[8px] border border-[color:var(--line)] bg-transparent px-3 text-sm text-[color:var(--label)]"
                    />
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-semibold text-[color:var(--label2)]">
                  Notes
                  <textarea
                    value={form.notes}
                    disabled={response.review.readOnly}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={4}
                    className="min-h-28 resize-y rounded-[8px] border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[color:var(--label)]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[color:var(--label2)]">
                  Lesson learned
                  <textarea
                    value={form.lessonLearned}
                    disabled={response.review.readOnly}
                    onChange={(event) => setForm((current) => ({ ...current, lessonLearned: event.target.value }))}
                    rows={4}
                    className="min-h-28 resize-y rounded-[8px] border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[color:var(--label)]"
                  />
                </label>
                <Button type="submit" disabled={response.review.readOnly || isSaving}>
                  {isSaving ? "Saving..." : "Save review fields"}
                </Button>
              </form>
            </GlassCard>
          </div>
        </>
      ) : null}
    </StudentShell>
  );
}

export function StudentManualTradeReviewClient({ tradeId }: { tradeId: string }) {
  return (
    <RoleGate allowedRole="student" nextPath={`/app/journal/trades/${encodeURIComponent(tradeId)}`}>
      <StudentManualTradeReviewBody tradeId={tradeId} />
    </RoleGate>
  );
}
