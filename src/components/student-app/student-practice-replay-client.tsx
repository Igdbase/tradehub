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
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import {
  formatPracticeMoney,
  formatPracticePrice,
  formatPracticeQuantity,
  getPracticeInstrumentSpec,
  practiceNotionalForInstrument,
  practicePipDistance,
  quantizePracticeQuantityDown
} from "@/lib/practice/practice-instrument-specs";
import type {
  PracticeAnnotationDeleteResponse,
  PracticeAnnotationKind,
  PracticeAnnotationMutationResponse,
  PracticeAnnotationSummary,
  StudentPracticeCandle,
  PracticeInstrumentSpecSummary,
  PracticeOrderDirection,
  PracticeOrderEvaluationResponse,
  PracticeReplayIndexMutationResponse,
  PracticeSessionDetailResponse,
  PracticeSessionFinishMutationResponse,
  PracticeOrderMutationResponse,
  PracticeOrderSummary,
  PracticeOrderType,
  PracticeSessionReflectionMutationResponse,
  PracticeSessionAssumptionsMutationResponse,
  RevealedPracticeCandlesResponse
} from "@/types/practice";

type StudentPracticeReplayClientProps = {
  sessionId: string;
};

const speedOptions = [
  { label: "Slow", value: 1600 },
  { label: "Normal", value: 900 },
  { label: "Fast", value: 450 }
];

function replayOrderSpec(order: PracticeOrderSummary, fallback?: PracticeInstrumentSpecSummary) {
  return order.instrument ?? fallback;
}

function formatReplayPrice(value: number | undefined, spec?: PracticeInstrumentSpecSummary) {
  return value === undefined || !Number.isFinite(value) ? "-" : formatPracticePrice(value, spec);
}

function formatReplayQuantity(value: number | undefined, spec?: PracticeInstrumentSpecSummary) {
  return value === undefined || !Number.isFinite(value) ? "0" : formatPracticeQuantity(value, spec);
}

const annotationKindOptions: Array<{ value: PracticeAnnotationKind; label: string }> = [
  { value: "entry_note", label: "Entry note" },
  { value: "mistake_note", label: "Mistake note" },
  { value: "structure_note", label: "Structure note" },
  { value: "support_resistance_zone", label: "Support/resistance zone" },
  { value: "chart_marker_note", label: "Screenshot-free chart marker" }
];

const inputClass =
  "focus-ring min-h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-4 py-3 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

type OrderFormState = {
  orderType: PracticeOrderType;
  direction: PracticeOrderDirection;
  requestedPrice: string;
  stopLoss: string;
  takeProfit: string;
  playbookId: string;
  checklistNotes: string;
  notes: string;
  tags: string;
};

type ReflectionFormState = {
  whatWentWell: string;
  whatWentWrong: string;
  improveNextTime: string;
  confidenceScore: string;
};

type AnnotationFormState = {
  kind: PracticeAnnotationKind;
  text: string;
  orderId: string;
  candleIndex: string;
  priceLevel: string;
  isMainLesson: boolean;
};

const defaultOrderForm: OrderFormState = {
  orderType: "market",
  direction: "buy",
  requestedPrice: "",
  stopLoss: "",
  takeProfit: "",
  playbookId: "",
  checklistNotes: "",
  notes: "",
  tags: ""
};

const defaultReflectionForm: ReflectionFormState = {
  whatWentWell: "",
  whatWentWrong: "",
  improveNextTime: "",
  confidenceScore: "3"
};

const defaultAnnotationForm: AnnotationFormState = {
  kind: "chart_marker_note",
  text: "",
  orderId: "",
  candleIndex: "",
  priceLevel: "",
  isMainLesson: false
};

function candleToChartData(candle: StudentPracticeCandle): CandlestickData<UTCTimestamp> {
  return {
    time: Math.floor(Date.parse(candle.openTime) / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  };
}

function ReplayCandlestickChart({
  candles,
  orders,
  annotations
}: {
  candles: StudentPracticeCandle[];
  orders: PracticeOrderSummary[];
  annotations: PracticeAnnotationSummary[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartData = useMemo(() => candles.map(candleToChartData), [candles]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--label2").trim() || "#d8dde8";
    const gridColor = styles.getPropertyValue("--line").trim() || "rgba(148, 163, 184, 0.28)";
    const chart = createChart(container, {
      autoSize: true,
      height: 380,
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
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    seriesRef.current.setData(chartData);

    if (chartData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [chartData]);

  return (
    <div className="relative min-h-[380px] overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--ink)_86%,black_8%)]">
      <div ref={containerRef} className="h-[380px] w-full" />
      {orders.length > 0 ? (
        <div className="pointer-events-none absolute left-3 top-3 grid max-w-[min(92%,24rem)] gap-2">
          {orders.slice(0, 5).map((order) => (
            <div
              key={order.orderId}
              className="rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--ink)_82%,black_12%)] px-3 py-2 text-xs shadow-[0_14px_34px_-26px_rgba(0,0,0,0.8)]"
            >
              <p className="break-safe font-semibold text-[color:var(--label)]">
                {order.direction.toUpperCase()} {order.orderType} · {order.status}
              </p>
              <p className="mt-1 break-safe leading-5 text-[color:var(--label2)]">
                Entry {formatReplayPrice(order.filledPrice ?? order.requestedPrice, order.instrument)} · SL {formatReplayPrice(order.stopLoss, order.instrument)} · TP {formatReplayPrice(order.takeProfit, order.instrument)}
              </p>
              <p className="mt-1 break-safe leading-5 text-[color:var(--label2)]">
                P&L {order.pnl === undefined ? "-" : formatPracticeMoney(order.pnl)} · R {order.rMultiple === undefined ? "-" : `${order.rMultiple.toFixed(2)}R`}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {annotations.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-3 grid max-w-[min(92%,26rem)] gap-2">
          {annotations.slice(0, 4).map((annotation) => (
            <div
              key={annotation.annotationId}
              className="rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--ink)_82%,black_12%)] px-3 py-2 text-xs shadow-[0_14px_34px_-26px_rgba(0,0,0,0.8)]"
            >
              <p className="break-safe font-semibold text-[color:var(--label)]">
                {annotation.isMainLesson ? "Main lesson" : annotation.kind.replace(/_/g, " ")}
              </p>
              <p className="mt-1 break-safe leading-5 text-[color:var(--label2)]">
                {annotation.candleIndex === undefined ? "Session" : `Candle ${annotation.candleIndex}`} · {annotation.priceLevel === undefined ? "No price" : annotation.priceLevel}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {chartData.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            No candles are revealed yet. Fetching an unsupported or empty range will stay safely blank.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StudentPracticeReplayBody({ sessionId }: StudentPracticeReplayClientProps) {
  const [detail, setDetail] = useState<PracticeSessionDetailResponse | null>(null);
  const [revealed, setRevealed] = useState<RevealedPracticeCandlesResponse | null>(null);
  const [orderForm, setOrderForm] = useState<OrderFormState>(defaultOrderForm);
  const [reflectionForm, setReflectionForm] = useState<ReflectionFormState>(defaultReflectionForm);
  const [annotationForm, setAnnotationForm] = useState<AnnotationFormState>(defaultAnnotationForm);
  const [orderPlaybookFilter, setOrderPlaybookFilter] = useState("");
  const [speedMs, setSpeedMs] = useState(900);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentIndex = revealed?.currentCandleIndex ?? detail?.session.currentCandleIndex ?? 0;
  const availableCount = revealed?.availableCandleCount ?? 0;
  const session = revealed?.session ?? detail?.session;
  const instrumentSpec = session?.instrument ?? (session ? getPracticeInstrumentSpec(session.assetClass, session.symbol) : undefined);
  const isSessionCompleted = session?.status === "completed";
  const isSessionLocked = isSessionCompleted || session?.status === "abandoned";
  const canUseControls = !isLoading && !isSaving && !isSessionLocked && availableCount > 0;
  const canStepBack = canUseControls && currentIndex > 0;
  const canStepForward = canUseControls && currentIndex < availableCount - 1;
  const canAutoAdvance = !isLoading && availableCount > 0 && currentIndex < availableCount - 1;
  const lastCandle = revealed?.candles[revealed.candles.length - 1];
  const orders = detail?.orders ?? [];
  const annotations = detail?.annotations ?? [];
  const unresolvedOrders = orders.filter((order) => order.status === "open" || order.status === "pending" || order.status === "draft");
  const activePlaybooks = detail?.playbooks.filter((playbook) => playbook.status === "active") ?? [];
  const filteredOrders = orders.filter((order) => !orderPlaybookFilter || order.playbookId === orderPlaybookFilter);
  const orderEntryPrice = orderForm.orderType === "market"
    ? lastCandle?.close
    : Number(orderForm.requestedPrice);
  const orderStopLoss = Number(orderForm.stopLoss);
  const estimatedRiskAmount = session ? session.startingBalance * session.riskPct / 100 : 0;
  const estimatedStopDistance = Number.isFinite(orderEntryPrice) && Number.isFinite(orderStopLoss)
    ? Math.abs((orderEntryPrice ?? 0) - orderStopLoss)
    : 0;
  const estimatedSize = estimatedStopDistance > 0 && instrumentSpec
    ? quantizePracticeQuantityDown(estimatedRiskAmount / (estimatedStopDistance * instrumentSpec.contractMultiplier), instrumentSpec)
    : estimatedStopDistance > 0 ? estimatedRiskAmount / estimatedStopDistance : 0;
  const estimatedNotional = estimatedSize > 0 && orderEntryPrice
    ? practiceNotionalForInstrument(instrumentSpec, orderEntryPrice, estimatedSize)
    : 0;
  const estimatedPipDistance = orderEntryPrice && orderStopLoss > 0
    ? practicePipDistance({ spec: instrumentSpec, firstPrice: orderEntryPrice, secondPrice: orderStopLoss })
    : 0;

  const loadRevealedCandles = useCallback(async (index?: number) => {
    const suffix = index === undefined ? "" : `?index=${encodeURIComponent(String(index))}`;
    const payload = await requestCourseHubApi<RevealedPracticeCandlesResponse>(
      `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/candles${suffix}`
    );

    setRevealed(payload);
    setDetail((current) => current ? { ...current, session: payload.session } : current);
  }, [sessionId]);

  const loadReplay = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<PracticeSessionDetailResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}`
      );
      setDetail(payload);
      setReflectionForm({
        whatWentWell: payload.session.reflection?.whatWentWell ?? "",
        whatWentWrong: payload.session.reflection?.whatWentWrong ?? "",
        improveNextTime: payload.session.reflection?.improveNextTime ?? "",
        confidenceScore: String(payload.session.reflection?.confidenceScore ?? 3)
      });
      setOrderForm((current) => ({
        ...current,
        playbookId: current.playbookId || payload.session.playbookId || ""
      }));
      await loadRevealedCandles(payload.session.currentCandleIndex);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load that practice replay.");
    } finally {
      setIsLoading(false);
    }
  }, [loadRevealedCandles, sessionId]);

  const evaluateOrders = useCallback(async () => {
    const evaluation = await requestCourseHubApi<PracticeOrderEvaluationResponse>(
      `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/evaluate`,
      { method: "POST" }
    );

    setDetail((current) => current ? {
      ...current,
      session: evaluation.session,
      orders: evaluation.orders,
      performance: evaluation.performance,
      playbookPerformance: evaluation.playbookPerformance
    } : current);

    return evaluation;
  }, [sessionId]);

  const persistReplayIndex = useCallback(async (nextIndex: number) => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const mutation = await requestCourseHubApi<PracticeReplayIndexMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ currentCandleIndex: nextIndex })
        }
      );
      setDetail((current) => current ? { ...current, session: mutation.session } : current);
      await loadRevealedCandles(mutation.currentCandleIndex);
      await evaluateOrders();
    } catch (error) {
      setIsPlaying(false);
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update the replay position.");
    } finally {
      setIsSaving(false);
    }
  }, [evaluateOrders, loadRevealedCandles, sessionId]);

  async function submitPracticeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            ...orderForm,
            requestedPrice: orderForm.orderType === "market" ? undefined : Number(orderForm.requestedPrice),
            stopLoss: Number(orderForm.stopLoss),
            takeProfit: Number(orderForm.takeProfit),
            playbookId: orderForm.playbookId,
            checklistNotes: orderForm.checklistNotes,
            tags: orderForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          })
        }
      );
      setDetail((current) => current ? {
        ...current,
        orders: [payload.order, ...current.orders.filter((order) => order.orderId !== payload.order.orderId)]
      } : current);
      setOrderForm((current) => ({
        ...defaultOrderForm,
        playbookId: current.playbookId
      }));
      await evaluateOrders();
      await loadReplay();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not create that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelPracticeOrder(orderId: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/cancel`,
        { method: "POST" }
      );
      await loadReplay();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not cancel that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function manuallyClosePracticeOrder(orderId: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/close`,
        { method: "POST" }
      );
      await loadReplay();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not manually close that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePracticeOrderLevels(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const form = new FormData(event.currentTarget);

      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/levels`,
        {
          method: "PATCH",
          body: JSON.stringify({
            stopLoss: Number(form.get("stopLoss")),
            takeProfit: Number(form.get("takeProfit"))
          })
        }
      );
      await loadReplay();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update those simulated SL/TP levels.");
    } finally {
      setIsSaving(false);
    }
  }

  async function partiallyClosePracticeOrder(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const form = new FormData(event.currentTarget);

      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/partial-close`,
        {
          method: "POST",
          body: JSON.stringify({
            percent: Number(form.get("percent")),
            quantity: Number(form.get("quantity"))
          })
        }
      );
      await loadReplay();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not partially close that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePracticeAssumptions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await requestCourseHubApi<PracticeSessionAssumptionsMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/assumptions`,
        {
          method: "PATCH",
          body: JSON.stringify({
            feeBps: Number(form.get("feeBps")),
            spreadBps: Number(form.get("spreadBps")),
            slippageBps: Number(form.get("slippageBps"))
          })
        }
      );

      setDetail((current) => current ? {
        ...current,
        session: response.session,
        performance: response.performance
      } : current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update practice assumptions.");
    } finally {
      setIsSaving(false);
    }
  }

  async function finishPracticeSession() {
    setIsSaving(true);
    setErrorMessage(null);
    setIsPlaying(false);

    try {
      const response = await requestCourseHubApi<PracticeSessionFinishMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/finish`,
        { method: "POST" }
      );

      setDetail((current) => current ? {
        ...current,
        session: response.session,
        performance: response.performance,
        completedReview: response.completedReview
      } : current);
      await loadReplay();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not finish that practice session.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeSessionReflectionMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/reflection`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...reflectionForm,
            confidenceScore: Number(reflectionForm.confidenceScore)
          })
        }
      );

      setDetail((current) => current ? {
        ...current,
        session: response.session,
        completedReview: response.completedReview
      } : current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save that completed-session reflection.");
    } finally {
      setIsSaving(false);
    }
  }

  function applyAnnotationMutation(response: PracticeAnnotationMutationResponse | PracticeAnnotationDeleteResponse) {
    setDetail((current) => current ? {
      ...current,
      annotations: response.annotations,
      completedReview: response.completedReview ?? current.completedReview
    } : current);
  }

  async function createAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeAnnotationMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/annotations`,
        {
          method: "POST",
          body: JSON.stringify({
            ...annotationForm,
            orderId: annotationForm.orderId || undefined,
            candleIndex: annotationForm.candleIndex ? Number(annotationForm.candleIndex) : undefined,
            priceLevel: annotationForm.priceLevel ? Number(annotationForm.priceLevel) : undefined
          })
        }
      );

      applyAnnotationMutation(response);
      setAnnotationForm(defaultAnnotationForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save that practice annotation.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateAnnotation(event: FormEvent<HTMLFormElement>, annotationId: string) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await requestCourseHubApi<PracticeAnnotationMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/annotations/${encodeURIComponent(annotationId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            kind: form.get("kind"),
            text: form.get("text"),
            orderId: form.get("orderId") || undefined,
            candleIndex: form.get("candleIndex") ? Number(form.get("candleIndex")) : undefined,
            priceLevel: form.get("priceLevel") ? Number(form.get("priceLevel")) : undefined,
            isMainLesson: form.get("isMainLesson") === "on"
          })
        }
      );

      applyAnnotationMutation(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that practice annotation.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAnnotation(annotationId: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeAnnotationDeleteResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/annotations/${encodeURIComponent(annotationId)}`,
        { method: "DELETE" }
      );

      applyAnnotationMutation(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not delete that practice annotation.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadReplay();
  }, [loadReplay]);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    if (!canAutoAdvance) {
      setIsPlaying(false);
      return undefined;
    }

    if (isSaving) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void persistReplayIndex(currentIndex + 1);
    }, speedMs);

    return () => window.clearTimeout(timer);
  }, [canAutoAdvance, currentIndex, isPlaying, isSaving, persistReplayIndex, speedMs]);

  return (
    <StudentShell
      active="practice"
      eyebrow="Practice replay"
      title={session ? `${session.symbol} replay` : "Practice replay"}
      subtitle="Review the same practice-only session outside the terminal. Candles are revealed by the server through the current index, and simulated orders never call broker or exchange execution."
      action={
        <div className="flex flex-wrap gap-2">
          <Button href="/app/practice" variant="ghost">Back to practice</Button>
          <Button href={`/app/practice/${encodeURIComponent(sessionId)}/terminal`} variant="secondary">Open terminal</Button>
          <Button href={`/app/practice/${encodeURIComponent(sessionId)}/report`} variant="secondary">Report</Button>
        </div>
      }
      side={
        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Forward-bias lock</p>
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              This replay page receives only candles up to the persisted reveal index. Unrevealed future candles stay server-side.
            </p>
          </GlassCard>
          <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Simulation boundary</p>
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              Market orders fill at the latest revealed candle close. Pending orders and SL/TP checks evaluate only as candles are revealed.
            </p>
          </GlassCard>
        </div>
      }
    >
      {errorMessage ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="break-safe text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
        </GlassCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Symbol" value={session?.symbol ?? "..."} />
        <StatChip label="Timeframe" value={session ? `${session.timeframeMinutes}m` : "..."} />
        <StatChip label="Asset" value={session?.assetClass ?? "..."} />
        <StatChip label="Status" value={session?.status ?? "..."} tone={session?.status === "completed" ? "green" : session?.status === "active" ? "amber" : "amber"} />
      </div>

      {isSessionCompleted ? (
        <GlassCard>
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            This practice session is completed. Candle reveal, new simulated orders, SL/TP edits, partial closes, manual closes, and pending-order cancels are locked; history and analytics remain available.
          </p>
        </GlassCard>
      ) : null}

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Performance analytics</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Server-computed from your closed simulated practice orders only.
            </p>
          </div>
          <Badge tone="green">Practice only</Badge>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]">
          <StatChip label="Start balance" value={detail?.performance.startingBalance.toFixed(2) ?? "0"} />
          <StatChip label="End balance" value={detail?.performance.endingBalance.toFixed(2) ?? "0"} />
          <StatChip label="Net P&L" value={detail?.performance.netPnl.toFixed(2) ?? "0"} tone={(detail?.performance.netPnl ?? 0) >= 0 ? "green" : "red"} />
          <StatChip label="Win rate" value={`${((detail?.performance.winRate ?? 0) * 100).toFixed(0)}%`} />
          <StatChip label="Loss rate" value={`${((detail?.performance.lossRate ?? 0) * 100).toFixed(0)}%`} />
          <StatChip label="Trades" value={String(detail?.performance.totalTrades ?? 0)} />
          <StatChip label="Open" value={String(detail?.performance.openTrades ?? 0)} tone="amber" />
          <StatChip label="Closed" value={String(detail?.performance.closedTrades ?? 0)} tone="green" />
          <StatChip label="Avg R" value={(detail?.performance.averageR ?? 0).toFixed(2)} />
          <StatChip label="Best" value={(detail?.performance.bestTrade ?? 0).toFixed(2)} tone="green" />
          <StatChip label="Worst" value={(detail?.performance.worstTrade ?? 0).toFixed(2)} tone="red" />
          <StatChip label="Max DD" value={(detail?.performance.maxDrawdown ?? 0).toFixed(2)} tone="red" />
          <StatChip label="Profit factor" value={(detail?.performance.profitFactor ?? 0).toFixed(2)} />
          <StatChip label="Expectancy" value={(detail?.performance.expectancy ?? 0).toFixed(2)} />
          <StatChip label="Costs" value={(detail?.performance.totalCosts ?? 0).toFixed(2)} />
        </div>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={updatePracticeAssumptions}>
          <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
            Fee bps
            <input className={inputClass} name="feeBps" inputMode="decimal" defaultValue={session?.feeBps ?? 0} />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
            Spread bps
            <input className={inputClass} name="spreadBps" inputMode="decimal" defaultValue={session?.spreadBps ?? 0} />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
            Slippage bps
            <input className={inputClass} name="slippageBps" inputMode="decimal" defaultValue={session?.slippageBps ?? 0} />
          </label>
          <Button className="self-end" size="sm" type="submit" disabled={isSaving || isSessionLocked}>
            Save assumptions
          </Button>
        </form>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Strategy performance</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Closed simulated orders are grouped by the Strategy saved on each order.
            </p>
          </div>
          <select
            className="focus-ring min-h-11 min-w-[min(100%,14rem)] rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-3 text-sm text-[color:var(--label)] outline-none"
            value={orderPlaybookFilter}
            onChange={(event) => setOrderPlaybookFilter(event.target.value)}
          >
            <option value="">All Strategies</option>
            {detail?.playbooks.map((playbook) => (
              <option key={playbook.playbookId} value={playbook.playbookId}>
                {playbook.name}
              </option>
            ))}
          </select>
        </div>
        {detail?.playbookPerformance.length ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
            {detail.playbookPerformance.map((summary) => (
              <div key={summary.playbookId} className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{summary.playbookName}</p>
                <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  {summary.strategyType ?? "general"} · {summary.trades} trades · Win {(summary.winRate * 100).toFixed(0)}%
                </p>
                <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  Net {summary.netPnl.toFixed(2)} · Avg R {summary.averageR.toFixed(2)} · PF {summary.profitFactor.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            No Strategy activity yet. Close a simulated order with a selected Strategy to see performance here.
          </p>
        )}
      </GlassCard>

      {isSessionCompleted ? (
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Completed session review</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Final practice analytics are computed from closed simulated orders only.
              </p>
            </div>
            <Badge tone="green">Completed</Badge>
          </div>
          {detail?.completedReview ? (
            <>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]">
                <StatChip label="Final balance" value={detail.completedReview.finalBalance.toFixed(2)} />
                <StatChip label="Net P&L" value={detail.completedReview.netPnl.toFixed(2)} tone={detail.completedReview.netPnl >= 0 ? "green" : "red"} />
                <StatChip label="Win rate" value={`${(detail.completedReview.winRate * 100).toFixed(0)}%`} />
                <StatChip label="Avg R" value={detail.completedReview.averageR.toFixed(2)} />
                <StatChip label="Profit factor" value={detail.completedReview.profitFactor.toFixed(2)} />
                <StatChip label="Max DD" value={detail.completedReview.maxDrawdown.toFixed(2)} tone="red" />
                <StatChip label="Best trade" value={detail.completedReview.bestTrade.toFixed(2)} tone="green" />
                <StatChip label="Worst trade" value={detail.completedReview.worstTrade.toFixed(2)} tone="red" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Best Strategy</p>
                  <p className="mt-2 break-safe text-sm font-semibold text-[color:var(--label)]">
                    {detail.completedReview.bestPlaybook?.playbookName ?? "No Strategy closed trades"}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Worst Strategy</p>
                  <p className="mt-2 break-safe text-sm font-semibold text-[color:var(--label)]">
                    {detail.completedReview.worstPlaybook?.playbookName ?? "No Strategy closed trades"}
                  </p>
                </div>
              </div>
              {detail.completedReview.challengeStatus ? (
                <div className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[color:var(--label)]">
                      Simulated challenge · {detail.completedReview.challengeStatus.challengeName}
                    </p>
                    <Badge tone={detail.completedReview.challengeStatus.status === "passed" ? "green" : detail.completedReview.challengeStatus.status === "failed" ? "red" : "amber"}>
                      {detail.completedReview.challengeStatus.status}
                    </Badge>
                  </div>
                  <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
                    Equity {detail.completedReview.challengeStatus.currentEquity.toFixed(2)} · Target {detail.completedReview.challengeStatus.profitTargetAmount.toFixed(2)} · Trades {detail.completedReview.challengeStatus.tradesUsed}/{detail.completedReview.challengeStatus.maxTradesPerSession} · Breaches {detail.completedReview.challengeStatus.breachCodes.length}
                  </p>
                </div>
              ) : null}
              {detail.completedReview.eventMarkers.length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-[color:var(--label)]">Visible practice events</p>
                  {detail.completedReview.eventMarkers.slice(-5).reverse().map((eventMarker) => (
                    <div key={eventMarker.eventId} className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-safe text-xs font-semibold text-[color:var(--label)]">{eventMarker.title}</p>
                        <Badge tone={eventMarker.impact === "high" ? "red" : eventMarker.impact === "medium" ? "amber" : "green"}>
                          {eventMarker.impact}
                        </Badge>
                      </div>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                        {eventMarker.category.replace(/_/g, " ")} · {new Date(eventMarker.eventTime).toLocaleString("en-NG")} · {eventMarker.safeSummary}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {detail.completedReview.annotations.length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-[color:var(--label)]">Review annotations</p>
                  {detail.completedReview.mainLesson ? (
                    <div className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--green)_30%,transparent)] px-3 py-2">
                      <p className="break-safe text-xs font-semibold text-[color:var(--label)]">
                        Main lesson · {detail.completedReview.mainLesson.kind.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                        {detail.completedReview.mainLesson.text}
                      </p>
                    </div>
                  ) : null}
                  {detail.completedReview.annotations.slice(0, 5).map((annotation) => (
                    <div key={annotation.annotationId} className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                      <p className="break-safe text-xs font-semibold text-[color:var(--label)]">
                        {annotation.kind.replace(/_/g, " ")} · {annotation.candleIndex === undefined ? "Session" : `Candle ${annotation.candleIndex}`}
                      </p>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                        {annotation.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                  No annotations were saved for this completed review. Add text-only notes or mark a main lesson during replay if you want review context here.
                </p>
              )}
              {detail.completedReview.recentClosedOrders.length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-[color:var(--label)]">Recent closed orders</p>
                  {detail.completedReview.recentClosedOrders.map((order) => (
                    <div key={order.orderId} className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                      <p className="break-safe text-xs font-semibold text-[color:var(--label)]">
                        {order.playbookName ?? "No strategy"} · {order.direction.toUpperCase()} · {order.closeReason ?? "closed"}
                      </p>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                        P&L {order.pnl?.toFixed(2) ?? "0.00"} · R {order.rMultiple?.toFixed(2) ?? "0.00"} · {order.closedAtCandleTime ? new Date(order.closedAtCandleTime).toLocaleString("en-NG") : "Closed"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                  No closed trades yet. The session is complete, but review stats stay at zero until simulated orders are closed.
                </p>
              )}
            </>
          ) : (
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              Completed review is loading.
            </p>
          )}
        </GlassCard>
      ) : null}

      {isSessionCompleted ? (
        <GlassCard>
          <form className="space-y-4" onSubmit={saveReflection}>
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Session reflection</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Bounded practice notes for your completed-session review. Reflection stays in the practice journal summary and is separate from AutoCopy.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              What went well
              <textarea
                className={inputClass}
                rows={3}
                value={reflectionForm.whatWentWell}
                onChange={(event) => setReflectionForm((current) => ({ ...current, whatWentWell: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              What went wrong
              <textarea
                className={inputClass}
                rows={3}
                value={reflectionForm.whatWentWrong}
                onChange={(event) => setReflectionForm((current) => ({ ...current, whatWentWrong: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              What to improve next time
              <textarea
                className={inputClass}
                rows={3}
                value={reflectionForm.improveNextTime}
                onChange={(event) => setReflectionForm((current) => ({ ...current, improveNextTime: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              Confidence score
              <select
                className={inputClass}
                value={reflectionForm.confidenceScore}
                onChange={(event) => setReflectionForm((current) => ({ ...current, confidenceScore: event.target.value }))}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <Button type="submit" variant="primary" disabled={isSaving}>
              Save reflection
            </Button>
          </form>
        </GlassCard>
      ) : null}

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Chart replay</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              {session ? `${session.symbol} from ${new Date(session.dateStart).toLocaleDateString("en-NG")} to ${new Date(session.dateEnd).toLocaleDateString("en-NG")}` : "Loading session range..."}
            </p>
          </div>
          <Badge tone="accent">Simulated</Badge>
        </div>
        <ReplayCandlestickChart candles={revealed?.candles ?? []} orders={filteredOrders} annotations={annotations} />
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Practice annotations</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Text-only review notes for the session, a simulated order, or a revealed candle.
            </p>
          </div>
          <Badge tone="accent">Text only</Badge>
        </div>
        <form className="grid gap-3" onSubmit={createAnnotation}>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
              Annotation type
              <select
                className={inputClass}
                value={annotationForm.kind}
                onChange={(event) => setAnnotationForm((current) => ({ ...current, kind: event.target.value as PracticeAnnotationKind }))}
              >
                {annotationKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
              Simulated order
              <select
                className={inputClass}
                value={annotationForm.orderId}
                onChange={(event) => setAnnotationForm((current) => ({ ...current, orderId: event.target.value }))}
              >
                <option value="">Session note</option>
                {orders.map((order) => (
                  <option key={order.orderId} value={order.orderId}>
                    {order.playbookName ?? "No strategy"} · {order.direction} · {order.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
              Candle index
              <input
                className={inputClass}
                inputMode="numeric"
                value={annotationForm.candleIndex}
                onChange={(event) => setAnnotationForm((current) => ({ ...current, candleIndex: event.target.value }))}
                placeholder={`0-${currentIndex}`}
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
              Price level
              <input
                className={inputClass}
                inputMode="decimal"
                value={annotationForm.priceLevel}
                onChange={(event) => setAnnotationForm((current) => ({ ...current, priceLevel: event.target.value }))}
                placeholder="Optional"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-[14px] border border-[color:var(--line)] px-4 py-3 text-xs font-semibold text-[color:var(--label)] md:mt-6">
              <input
                type="checkbox"
                checked={annotationForm.isMainLesson}
                onChange={(event) => setAnnotationForm((current) => ({ ...current, isMainLesson: event.target.checked }))}
              />
              Main lesson
            </label>
          </div>
          <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
            Note
            <textarea
              className={inputClass}
              rows={3}
              value={annotationForm.text}
              onChange={(event) => setAnnotationForm((current) => ({ ...current, text: event.target.value }))}
              placeholder="What did the chart teach you here?"
            />
          </label>
          <Button type="submit" variant="primary" disabled={isSaving || !annotationForm.text.trim()}>
            Add annotation
          </Button>
          {!lastCandle ? (
            <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
              Session-level annotations are allowed before a candle is revealed; candle annotations cannot point beyond the current revealed index.
            </p>
          ) : null}
        </form>
        {annotations.length ? (
          <div className="grid gap-3">
            {annotations.map((annotation) => (
              <form
                key={annotation.annotationId}
                className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-4"
                onSubmit={(event) => updateAnnotation(event, annotation.annotationId)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={annotation.isMainLesson ? "green" : "accent"}>
                      {annotation.isMainLesson ? "Main lesson" : annotation.kind.replace(/_/g, " ")}
                    </Badge>
                    <Badge tone="neutral">
                      {annotation.candleIndex === undefined ? "Session" : `Candle ${annotation.candleIndex}`}
                    </Badge>
                  </div>
                  <Button size="sm" type="button" disabled={isSaving} onClick={() => deleteAnnotation(annotation.annotationId)}>
                    Delete
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                    Type
                    <select className={inputClass} name="kind" defaultValue={annotation.kind}>
                      {annotationKindOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                    Order
                    <select className={inputClass} name="orderId" defaultValue={annotation.orderId ?? ""}>
                      <option value="">Session note</option>
                      {orders.map((order) => (
                        <option key={order.orderId} value={order.orderId}>
                          {order.playbookName ?? "No strategy"} · {order.direction} · {order.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                    Candle
                    <input className={inputClass} name="candleIndex" inputMode="numeric" defaultValue={annotation.candleIndex ?? ""} />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                    Price
                    <input className={inputClass} name="priceLevel" inputMode="decimal" defaultValue={annotation.priceLevel ?? ""} />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 rounded-[14px] border border-[color:var(--line)] px-4 py-3 text-xs font-semibold text-[color:var(--label)] md:mt-6">
                    <input name="isMainLesson" type="checkbox" defaultChecked={annotation.isMainLesson} />
                    Main lesson
                  </label>
                </div>
                <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                  Note
                  <textarea className={inputClass} name="text" rows={3} defaultValue={annotation.text} />
                </label>
                <Button size="sm" type="submit" disabled={isSaving}>
                  Save annotation
                </Button>
              </form>
            ))}
          </div>
        ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            No annotations yet. Add text notes for entries, mistakes, structure, support/resistance, or chart markers.
          </p>
        )}
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatChip label="Progress" value={availableCount > 0 ? `${currentIndex + 1}/${availableCount}` : "0/0"} />
          <StatChip label="Revealed" value={String(revealed?.revealedCandleCount ?? 0)} />
          <StatChip label="Current candle" value={lastCandle ? new Date(lastCandle.closeTime).toLocaleString("en-NG") : "None"} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={isPlaying ? "primary" : "secondary"}
            disabled={!canStepForward && !isPlaying}
            onClick={() => setIsPlaying((current) => !current)}
          >
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button disabled={!canStepBack} onClick={() => persistReplayIndex(currentIndex - 1)}>
            Step back
          </Button>
          <Button disabled={!canStepForward} onClick={() => persistReplayIndex(currentIndex + 1)}>
            Step forward
          </Button>
          <Button disabled={!canUseControls || currentIndex === 0} onClick={() => persistReplayIndex(0)}>
            Jump to start
          </Button>
          <Button
            variant="primary"
            disabled={isSaving || session?.status !== "active" || unresolvedOrders.length > 0}
            onClick={finishPracticeSession}
          >
            Finish session
          </Button>
          <label className="grid min-w-[160px] gap-2 text-sm font-semibold text-[color:var(--label)]">
            Speed
            <select
              className="focus-ring h-11 rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-3 text-sm text-[color:var(--label)] outline-none"
              value={speedMs}
              onChange={(event) => setSpeedMs(Number(event.target.value))}
            >
              {speedOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        {isSessionLocked ? (
          <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
            Candle reveal is locked for this completed session.
          </p>
        ) : null}
        {session?.status === "active" && unresolvedOrders.length > 0 ? (
          <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
            Close or cancel open and pending simulated orders before finishing this session.
          </p>
        ) : null}
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <GlassCard>
          <form className="space-y-5" onSubmit={submitPracticeOrder}>
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Simulated order</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Size uses starting balance, risk %, entry, stop distance, and TradeHub practice instrument specs. Estimates may differ by broker; no live order endpoint is called.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Type
                <select
                  className={inputClass}
                  value={orderForm.orderType}
                  onChange={(event) => setOrderForm((current) => ({ ...current, orderType: event.target.value as PracticeOrderType }))}
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                  <option value="stop">Stop</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Direction
                <select
                  className={inputClass}
                  value={orderForm.direction}
                  onChange={(event) => setOrderForm((current) => ({ ...current, direction: event.target.value as PracticeOrderDirection }))}
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Strategy (optional)
                <select
                  className={inputClass}
                  value={orderForm.playbookId}
                  onChange={(event) => setOrderForm((current) => ({ ...current, playbookId: event.target.value }))}
                >
                  <option value="">No strategy</option>
                  {activePlaybooks
                    .filter((playbook) => !session || playbook.market === session.assetClass)
                    .map((playbook) => (
                      <option key={playbook.playbookId} value={playbook.playbookId}>
                        {playbook.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Entry/requested price
                <input
                  className={inputClass}
                  disabled={orderForm.orderType === "market"}
                  inputMode="decimal"
                  value={orderForm.orderType === "market" ? (lastCandle?.close ? String(lastCandle.close) : "") : orderForm.requestedPrice}
                  onChange={(event) => setOrderForm((current) => ({ ...current, requestedPrice: event.target.value }))}
                  placeholder="Market uses latest close"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Stop loss
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={orderForm.stopLoss}
                  onChange={(event) => setOrderForm((current) => ({ ...current, stopLoss: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Take profit
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={orderForm.takeProfit}
                  onChange={(event) => setOrderForm((current) => ({ ...current, takeProfit: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
                Tags
                <input
                  className={inputClass}
                  value={orderForm.tags}
                  onChange={(event) => setOrderForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="breakout, london"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              Checklist notes
              <textarea
                className={inputClass}
                rows={3}
                value={orderForm.checklistNotes}
                onChange={(event) => setOrderForm((current) => ({ ...current, checklistNotes: event.target.value }))}
                placeholder="What passed, what was skipped, and why"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              Notes
              <textarea
                className={inputClass}
                rows={3}
                value={orderForm.notes}
                onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatChip label="Risk amount" value={estimatedRiskAmount > 0 ? formatPracticeMoney(estimatedRiskAmount) : "0"} />
              <StatChip label={`Size ${instrumentSpec?.quantityLabel ?? "Qty"}`} value={estimatedSize > 0 ? formatReplayQuantity(estimatedSize, instrumentSpec) : "0"} />
              <StatChip label={instrumentSpec?.pipLabel === "pip" ? "Pips" : "Ticks"} value={estimatedPipDistance > 0 ? estimatedPipDistance.toFixed(2) : "0"} />
              <StatChip label="Notional" value={estimatedNotional > 0 ? formatPracticeMoney(estimatedNotional) : "0"} />
            </div>
            <Button type="submit" variant="primary" disabled={!lastCandle || isSaving || isSessionLocked}>
              Submit simulated order
            </Button>
            {isSessionLocked ? (
              <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                Completed sessions are review-only; new simulated order creation is locked.
              </p>
            ) : null}
            {!orderForm.playbookId ? (
              <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                This trade will count in overall analytics but not in a Strategy breakdown.
              </p>
            ) : null}
            {!lastCandle ? (
              <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                Reveal at least one candle before submitting simulated orders.
              </p>
            ) : null}
          </form>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Practice orders</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Pending, open, and closed simulated orders for this replay session.
              </p>
            </div>
            <Badge tone="amber">Simulated</Badge>
          </div>
          {filteredOrders.length > 0 ? (
            <div className="grid gap-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="grid gap-3 rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                        {order.direction.toUpperCase()} {order.orderType} · {order.status}
                      </p>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                        Entry {formatReplayPrice(order.filledPrice ?? order.requestedPrice, replayOrderSpec(order, instrumentSpec))} · SL {formatReplayPrice(order.stopLoss, replayOrderSpec(order, instrumentSpec))} · TP {formatReplayPrice(order.takeProfit, replayOrderSpec(order, instrumentSpec))}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge tone={order.playbookName ? "accent" : "red"}>
                        {order.playbookName ?? "No strategy"}
                      </Badge>
                      <Badge tone={order.status === "closed" ? "green" : order.status === "open" ? "amber" : "red"}>
                        {order.closeReason ?? order.status}
                      </Badge>
                    </div>
                  </div>
                  {!order.playbookName ? (
                    <p className="break-safe text-xs leading-5 text-[color:var(--red)]">
                      This simulated order has no Strategy, so it will not count toward Strategy analytics.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={isSaving || isSessionLocked || order.status !== "open"}
                      onClick={() => manuallyClosePracticeOrder(order.orderId)}
                    >
                      Manual close
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSaving || isSessionLocked || order.status !== "pending"}
                      onClick={() => cancelPracticeOrder(order.orderId)}
                    >
                      Cancel pending
                    </Button>
                  </div>
                  {order.status === "open" || order.status === "pending" ? (
                    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => updatePracticeOrderLevels(event, order.orderId)}>
                      <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                        Edit SL
                        <input
                          className={inputClass}
                          name="stopLoss"
                          inputMode="decimal"
                          defaultValue={order.stopLoss ?? ""}
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                        Edit TP
                        <input
                          className={inputClass}
                          name="takeProfit"
                          inputMode="decimal"
                          defaultValue={order.takeProfit ?? ""}
                        />
                      </label>
                      <Button className="self-end" size="sm" type="submit" disabled={isSaving || isSessionLocked}>
                        Save SL/TP
                      </Button>
                    </form>
                  ) : null}
                  {order.status === "open" ? (
                    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => partiallyClosePracticeOrder(event, order.orderId)}>
                      <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                        Close %
                        <input
                          className={inputClass}
                          name="percent"
                          inputMode="decimal"
                          placeholder="25"
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-[color:var(--label)]">
                        Or quantity
                        <input
                          className={inputClass}
                          name="quantity"
                          inputMode="decimal"
                          placeholder="Optional"
                        />
                      </label>
                      <Button className="self-end" size="sm" type="submit" disabled={isSaving || isSessionLocked || !lastCandle}>
                        Close partial
                      </Button>
                    </form>
                  ) : null}
                  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr))]">
                    {(() => {
                      const orderSpec = replayOrderSpec(order, instrumentSpec);

                      return (
                        <>
                          <StatChip label={`Size ${orderSpec?.quantityLabel ?? "Qty"}`} value={order.size ? formatReplayQuantity(order.size, orderSpec) : "0"} />
                          <StatChip label="Remaining" value={formatReplayQuantity(order.remainingSize ?? order.size, orderSpec)} />
                          <StatChip label="Notional" value={order.notional ? formatPracticeMoney(order.notional) : "0"} />
                          <StatChip label={orderSpec?.pipLabel === "pip" ? "Pips" : "Ticks"} value={order.stopDistanceInPips === undefined ? "-" : order.stopDistanceInPips.toFixed(2)} />
                        </>
                      );
                    })()}
                    <StatChip label="P&L" value={order.pnl === undefined ? "-" : formatPracticeMoney(order.pnl)} tone={(order.pnl ?? 0) >= 0 ? "green" : "red"} />
                    <StatChip label="R" value={order.rMultiple === undefined ? "-" : `${order.rMultiple.toFixed(2)}R`} />
                  </div>
                  {order.closeEvents?.length ? (
                    <div className="grid gap-2">
                      {order.closeEvents.slice(-3).map((event) => (
                        <div key={event.eventId} className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                          <p className="break-safe text-xs font-semibold text-[color:var(--label)]">
                            {event.eventType === "partial_close" ? "Partial close" : "Full close"} · {formatReplayQuantity(event.closedSize, event.instrument ?? order.instrument)} @ {formatReplayPrice(event.exitPrice, event.instrument ?? order.instrument)}
                          </p>
                          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                            P&L {formatPracticeMoney(event.pnl)} · Remaining {formatReplayQuantity(event.remainingSize, event.instrument ?? order.instrument)} · {event.closeReason.replace(/_/g, " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {order.safeMessage ? (
                    <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">{order.safeMessage}</p>
                  ) : null}
                  {order.checklistNotes ? (
                    <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      Checklist notes: {order.checklistNotes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {orderPlaybookFilter ? "No simulated practice orders match that Strategy." : "No simulated practice orders yet. Reveal a candle and submit a simulated order from the ticket."}
          </p>
        )}
        </GlassCard>
      </div>

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading replay shell...</p>
        </GlassCard>
      ) : null}
    </StudentShell>
  );
}

export function StudentPracticeReplayClient(props: StudentPracticeReplayClientProps) {
  return (
    <RoleGate allowedRole="student" nextPath={`/app/practice/${props.sessionId}`}>
      <StudentPracticeReplayBody {...props} />
    </RoleGate>
  );
}
