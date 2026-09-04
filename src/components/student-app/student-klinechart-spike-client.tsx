"use client";

import type {
  Chart,
  KLineData,
  OverlayCreate,
  OverlayEvent,
  OverlayTemplate,
  Point
} from "klinecharts";
import {
  Activity,
  ChevronsRight,
  Crosshair,
  Database,
  GitCommitHorizontal,
  Minus,
  MousePointer2,
  Pentagon,
  Ratio,
  Ruler,
  ScanLine,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  PracticeReplayIndexMutationResponse,
  RevealedPracticeCandlesResponse,
  StudentPracticeCandle
} from "@/types/practice";

declare global {
  interface Window {
    __TRADEHUB_KLINECHART_SPIKE__?: Chart;
  }
}

const SPIKE_SESSION_ID = "practice_demo_klinechart_spike";
const SPIKE_GROUP_ID = "tradehub_klinechart_spike_drawings";
const STORAGE_KEY = `tradehub:klinechart-spike:${SPIKE_SESSION_ID}:overlays`;
const ALLOWED_OVERLAYS = new Set([
  "segment",
  "horizontalStraightLine",
  "verticalStraightLine",
  "fibonacciLine",
  "rect",
  "measure"
]);

type SpikeToolName =
  | "segment"
  | "horizontalStraightLine"
  | "verticalStraightLine"
  | "fibonacciLine"
  | "rect"
  | "measure";

type StoredOverlay = {
  id: string;
  name: SpikeToolName;
  points: Array<Partial<Pick<Point, "timestamp" | "dataIndex" | "value">>>;
};

let extensionsRegistered = false;

function registerSpikeExtensions(
  register: (template: OverlayTemplate) => void,
  rect: OverlayTemplate,
  measure: OverlayTemplate
) {
  if (extensionsRegistered) {
    return;
  }

  register(rect);
  register(measure);
  extensionsRegistered = true;
}

function toKLineData(candle: StudentPracticeCandle): KLineData {
  return {
    timestamp: Date.parse(candle.openTime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  };
}

function parseStoredOverlays(value: string | null): StoredOverlay[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return [];
      }
      const record = item as Record<string, unknown>;
      if (
        typeof record.id !== "string" ||
        typeof record.name !== "string" ||
        !ALLOWED_OVERLAYS.has(record.name) ||
        !Array.isArray(record.points)
      ) {
        return [];
      }

      const points = record.points.flatMap((point) => {
        if (!point || typeof point !== "object" || Array.isArray(point)) {
          return [];
        }
        const source = point as Record<string, unknown>;
        const normalized: StoredOverlay["points"][number] = {};
        if (typeof source.timestamp === "number" && Number.isFinite(source.timestamp)) normalized.timestamp = source.timestamp;
        if (typeof source.dataIndex === "number" && Number.isFinite(source.dataIndex)) normalized.dataIndex = source.dataIndex;
        if (typeof source.value === "number" && Number.isFinite(source.value)) normalized.value = source.value;
        return Object.keys(normalized).length > 0 ? [normalized] : [];
      });

      return points.length > 0
        ? [{ id: record.id.slice(0, 120), name: record.name as SpikeToolName, points }]
        : [];
    }).slice(0, 50);
  } catch {
    return [];
  }
}

const toolOptions: Array<{ name: SpikeToolName; label: string; icon: typeof Activity }> = [
  { name: "segment", label: "Trend segment", icon: GitCommitHorizontal },
  { name: "horizontalStraightLine", label: "Horizontal line", icon: Minus },
  { name: "verticalStraightLine", label: "Vertical line", icon: ScanLine },
  { name: "fibonacciLine", label: "Fibonacci", icon: Ratio },
  { name: "rect", label: "Zone", icon: Pentagon },
  { name: "measure", label: "Measure", icon: Ruler }
];

function SpikeBody() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const dataRef = useRef<KLineData[]>([]);
  const completedIdsRef = useRef(new Set<string>());
  const draftIdRef = useRef<string | null>(null);
  const trendAnchorRef = useRef<Partial<Point> | null>(null);
  const activeToolRef = useRef<SpikeToolName | null>(null);
  const restoredRef = useRef(false);
  const [candles, setCandles] = useState<StudentPracticeCandle[]>([]);
  const [availableCandleCount, setAvailableCandleCount] = useState(0);
  const [currentCandleIndex, setCurrentCandleIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<SpikeToolName | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState("");
  const [overlayJson, setOverlayJson] = useState("[]");
  const [persistedOverlayCount, setPersistedOverlayCount] = useState(0);
  const [previewState, setPreviewState] = useState("Idle");
  const [status, setStatus] = useState("Loading the persisted reveal boundary...");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(true);

  const serializeCompletedOverlays = useCallback((chart: Chart) => {
    const overlays = chart.getOverlays({ groupId: SPIKE_GROUP_ID });
    const serializable = overlays
      .filter((overlay) => completedIdsRef.current.has(overlay.id))
      .map<StoredOverlay>((overlay) => ({
        id: overlay.id,
        name: overlay.name as SpikeToolName,
        points: overlay.points.map((point) => ({
          ...(typeof point.timestamp === "number" ? { timestamp: point.timestamp } : {}),
          ...(typeof point.dataIndex === "number" ? { dataIndex: point.dataIndex } : {}),
          ...(typeof point.value === "number" ? { value: point.value } : {})
        }))
      }));
    const json = JSON.stringify(serializable, null, 2);
    sessionStorage.setItem(STORAGE_KEY, json);
    setOverlayJson(json);
    setPersistedOverlayCount(serializable.length);
    return serializable;
  }, []);

  const callbacksFor = useCallback((): Partial<OverlayCreate> => ({
    onDrawStart: (event: OverlayEvent<unknown>) => setPreviewState(`Anchor fixed (${event.overlay.currentStep}/${event.overlay.totalStep}, ${event.overlay.points.length} points); move without holding the pointer.`),
    onDrawing: (event: OverlayEvent<unknown>) => setPreviewState(`Native overlay preview is updating (${event.overlay.currentStep}/${event.overlay.totalStep}, ${event.overlay.points.length} points).`),
    onDrawEnd: (event: OverlayEvent<unknown>) => {
      completedIdsRef.current.add(event.overlay.id);
      draftIdRef.current = null;
      setPreviewState("Overlay saved.");
      setSelectedOverlayId(event.overlay.id);
      window.requestAnimationFrame(() => {
        serializeCompletedOverlays(event.chart);
      });
    },
    onSelected: (event: OverlayEvent<unknown>) => {
      setSelectedOverlayId(event.overlay.id);
      setPreviewState("Overlay selected; drag an endpoint handle to move it.");
    },
    onDeselected: (event: OverlayEvent<unknown>) => {
      setSelectedOverlayId((current) => current === event.overlay.id ? "" : current);
    },
    onPressedMoveEnd: (event: OverlayEvent<unknown>) => {
      setPreviewState("Endpoint movement saved.");
      window.requestAnimationFrame(() => serializeCompletedOverlays(event.chart));
    },
    onRemoved: (event: OverlayEvent<unknown>) => {
      completedIdsRef.current.delete(event.overlay.id);
      setSelectedOverlayId((current) => current === event.overlay.id ? "" : current);
      window.requestAnimationFrame(() => serializeCompletedOverlays(event.chart));
    }
  }), [serializeCompletedOverlays]);

  const cancelDraft = useCallback(() => {
    const chart = chartRef.current;
    const draftId = draftIdRef.current;
    if (chart && draftId && !completedIdsRef.current.has(draftId)) {
      chart.removeOverlay({ id: draftId });
    }
    draftIdRef.current = null;
    trendAnchorRef.current = null;
    setPreviewState("Idle");
  }, []);

  const armOverlay = useCallback((name: SpikeToolName) => {
    const chart = chartRef.current;
    if (!chart) return;
    cancelDraft();
    activeToolRef.current = name;
    setActiveTool(name);
    if (name === "segment") {
      setPreviewState("Trend segment armed; click the first anchor.");
      return;
    }
    const id = chart.createOverlay({
      name,
      groupId: SPIKE_GROUP_ID,
      needDefaultPointFigure: true,
      lock: false,
      ...callbacksFor()
    });
    draftIdRef.current = typeof id === "string" ? id : null;
    setPreviewState(`${toolOptions.find((tool) => tool.name === name)?.label ?? name} armed.`);
  }, [callbacksFor, cancelDraft]);

  const trendPointFromPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const chart = chartRef.current;
    if (!chart) return null;
    const bounds = event.currentTarget.getBoundingClientRect();
    const converted = chart.convertFromPixel([{
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    }]);
    const point = Array.isArray(converted) ? converted[0] : null;
    return point && typeof point.value === "number" ? point : null;
  }, []);

  const handleTrendPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const chart = chartRef.current;
    const anchor = trendAnchorRef.current;
    const draftId = draftIdRef.current;
    if (!chart || !anchor || !draftId) return;
    const point = trendPointFromPointer(event);
    if (!point) return;
    chart.overrideOverlay({ id: draftId, points: [anchor, point] });
    setPreviewState("Native segment preview is updating without a held pointer.");
  }, [trendPointFromPointer]);

  const handleTrendPointerClick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const chart = chartRef.current;
    if (!chart) return;
    const point = trendPointFromPointer(event);
    if (!point) return;
    const anchor = trendAnchorRef.current;
    const draftId = draftIdRef.current;

    if (!anchor || !draftId) {
      const id = chart.createOverlay({
        name: "segment",
        groupId: SPIKE_GROUP_ID,
        points: [point, point],
        needDefaultPointFigure: true,
        lock: false
      });
      if (typeof id !== "string") return;
      trendAnchorRef.current = point;
      draftIdRef.current = id;
      setPreviewState("First anchor fixed; move the pointer, then click the endpoint.");
      return;
    }

    chart.overrideOverlay({
      id: draftId,
      points: [anchor, point],
      ...callbacksFor()
    });
    completedIdsRef.current.add(draftId);
    trendAnchorRef.current = null;
    draftIdRef.current = null;
    setSelectedOverlayId(draftId);
    setPreviewState("Two-click native segment saved; Trend segment remains armed.");
    serializeCompletedOverlays(chart);
  }, [callbacksFor, serializeCompletedOverlays, trendPointFromPointer]);

  const restoreOverlays = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || restoredRef.current) return;
    restoredRef.current = true;
    const stored = parseStoredOverlays(sessionStorage.getItem(STORAGE_KEY));
    for (const overlay of stored) {
      const id = chart.createOverlay({
        id: overlay.id,
        name: overlay.name,
        groupId: SPIKE_GROUP_ID,
        points: overlay.points,
        needDefaultPointFigure: true,
        lock: false,
        ...callbacksFor()
      });
      if (typeof id === "string") completedIdsRef.current.add(id);
    }
    serializeCompletedOverlays(chart);
    if (stored.length > 0) setStatus(`Restored ${stored.length} spike-only overlay${stored.length === 1 ? "" : "s"} from this browser tab.`);
  }, [callbacksFor, serializeCompletedOverlays]);

  const loadRevealedCandles = useCallback(async (requestedIndex?: number) => {
    const query = requestedIndex === undefined ? "" : `?index=${requestedIndex}`;
    const response = await requestCourseHubApi<RevealedPracticeCandlesResponse>(
      `/api/student/practice/sessions/${SPIKE_SESSION_ID}/candles${query}`
    );
    const nextData = response.candles.map(toKLineData);
    dataRef.current = nextData;
    setCandles(response.candles);
    setAvailableCandleCount(response.availableCandleCount);
    setCurrentCandleIndex(response.currentCandleIndex);
    chartRef.current?.resetData();
    window.setTimeout(restoreOverlays, 0);
    return response;
  }, [restoreOverlays]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let disposeChart: ((chart: Chart) => void) | null = null;

    void (async () => {
      const [klinecharts, extensions] = await Promise.all([
        import("klinecharts"),
        import("@klinecharts/extension")
      ]);
      if (cancelled) return;
      registerSpikeExtensions(klinecharts.registerOverlay, extensions.rect, extensions.measure);
      const chart = klinecharts.init(container, {
        locale: "en-US",
        timezone: "UTC",
        styles: "dark",
        zoomAnchor: "cursor",
        layout: {
          barSpaceLimit: { min: 4, max: 34 },
          yAxis: { position: "right", inside: false }
        }
      });
      if (!chart) {
        setError("KLineChart could not initialize in this browser.");
        setIsBusy(false);
        return;
      }
      chartRef.current = chart;
      window.__TRADEHUB_KLINECHART_SPIKE__ = chart;
      disposeChart = klinecharts.dispose;
      chart.setDataLoader({
        getBars: ({ type, callback }) => {
          if (type === "init") callback(dataRef.current, { forward: false, backward: false });
          else callback([], { forward: false, backward: false });
        }
      });
      chart.setSymbol({ ticker: "BTCUSDT", pricePrecision: 2, volumePrecision: 2 });
      chart.setPeriod({ type: "hour", span: 1 });

      resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(container);
      await loadRevealedCandles()
        .then((response) => setStatus(`Showing ${response.revealedCandleCount} revealed candles. Future candles remain server-hidden.`))
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load revealed practice candles."))
        .finally(() => setIsBusy(false));
    })().catch((caught) => {
      if (!cancelled) {
        setError(caught instanceof Error ? caught.message : "KLineChart could not load in this browser.");
        setIsBusy(false);
      }
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (chartRef.current && disposeChart) disposeChart(chartRef.current);
      chartRef.current = null;
      delete window.__TRADEHUB_KLINECHART_SPIKE__;
    };
  }, [loadRevealedCandles]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !draftIdRef.current) return;
      event.preventDefault();
      cancelDraft();
      activeToolRef.current = null;
      setActiveTool(null);
      setStatus("Unfinished overlay cancelled; nothing was stored.");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelDraft]);

  const revealNext = async () => {
    if (isBusy || currentCandleIndex >= availableCandleCount - 1) return;
    setIsBusy(true);
    setError("");
    try {
      const targetIndex = currentCandleIndex + 1;
      await requestCourseHubApi<PracticeReplayIndexMutationResponse>(
        `/api/student/practice/sessions/${SPIKE_SESSION_ID}`,
        { method: "PATCH", body: JSON.stringify({ currentCandleIndex: targetIndex }) }
      );
      const response = await loadRevealedCandles();
      setStatus(`Revealed candle ${response.revealedCandleCount} of ${response.availableCandleCount}; no later candles were returned.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The next candle could not be revealed safely.");
    } finally {
      setIsBusy(false);
    }
  };

  const selectMode = () => {
    cancelDraft();
    activeToolRef.current = null;
    setActiveTool(null);
    setPreviewState("Selection mode; click an overlay to expose its handles.");
  };

  const deleteSelected = () => {
    const chart = chartRef.current;
    if (!chart || !selectedOverlayId || !completedIdsRef.current.has(selectedOverlayId)) return;
    chart.removeOverlay({ id: selectedOverlayId });
    completedIdsRef.current.delete(selectedOverlayId);
    setSelectedOverlayId("");
    serializeCompletedOverlays(chart);
    setStatus("Selected spike overlay deleted; other overlays were preserved.");
  };

  const clearAll = () => {
    const chart = chartRef.current;
    if (!chart) return;
    cancelDraft();
    chart.removeOverlay({ groupId: SPIKE_GROUP_ID });
    completedIdsRef.current.clear();
    setSelectedOverlayId("");
    setActiveTool(null);
    activeToolRef.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
    setOverlayJson("[]");
    setPersistedOverlayCount(0);
    setStatus("All spike-only overlays cleared. Candles and other Practice records were untouched.");
  };

  const latestClose = candles[candles.length - 1]?.close;
  const toolLabel = useMemo(() => toolOptions.find((tool) => tool.name === activeTool)?.label ?? "Select", [activeTool]);

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white sm:px-5" data-testid="klinechart-spike-page">
      <div className="mx-auto grid w-full max-w-[1500px] gap-3">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-amber-300">Internal feasibility spike</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">TradeHub Practice / KLineChart</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
              Isolated comparison surface. It reads only student-owned revealed Practice candles and stores drawings temporarily in this tab.
            </p>
          </div>
          <div className="flex gap-2 text-xs tabular-nums">
            <span className="border border-white/15 bg-zinc-950 px-3 py-2" data-testid="klinechart-spike-candle-count">{candles.length} revealed</span>
            <span className="border border-white/15 bg-zinc-950 px-3 py-2">BTCUSDT · 1h</span>
          </div>
        </header>

        <section className="grid min-w-0 gap-2 xl:grid-cols-[58px_minmax(0,1fr)_280px]">
          <nav className="flex min-w-0 gap-1 overflow-x-auto border border-white/10 bg-zinc-950 p-1 xl:flex-col" aria-label="KLineChart spike drawing tools">
            <button className={`grid h-11 w-11 shrink-0 place-items-center border ${activeTool === null ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 text-zinc-300"}`} onClick={selectMode} title="Select overlays" data-testid="klinechart-tool-select"><MousePointer2 size={18} /></button>
            {toolOptions.map((tool) => {
              const Icon = tool.icon;
              return <button key={tool.name} className={`grid h-11 w-11 shrink-0 place-items-center border ${activeTool === tool.name ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 text-zinc-300 hover:border-white/30"}`} onClick={() => armOverlay(tool.name)} title={tool.label} aria-pressed={activeTool === tool.name} data-testid={`klinechart-tool-${tool.name}`}><Icon size={18} /></button>;
            })}
          </nav>

          <div className="min-w-0 border border-white/10 bg-black">
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
              <span data-testid="klinechart-spike-tool-state">{toolLabel} · {previewState}</span>
              <span className="tabular-nums">Last {latestClose?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "--"}</span>
            </div>
            <div className="relative h-[430px] min-w-0 bg-black sm:h-[520px]" data-testid="klinechart-spike-chart" aria-label="KLineChart revealed-candle drawing canvas">
              <div ref={chartContainerRef} className="absolute inset-0 min-w-0 touch-none bg-black" />
              {activeTool === "segment" ? (
                <div
                  className="absolute inset-0 z-10 cursor-crosshair touch-none"
                  data-testid="klinechart-spike-trend-capture"
                  onPointerMove={handleTrendPointerMove}
                  onPointerUp={handleTrendPointerClick}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-zinc-950 p-2">
              <Button size="sm" type="button" onClick={() => void revealNext()} disabled={isBusy || currentCandleIndex >= availableCandleCount - 1} data-testid="klinechart-spike-next-candle"><ChevronsRight size={15} /> Next candle</Button>
              <Button size="sm" type="button" variant="secondary" onClick={deleteSelected} disabled={!selectedOverlayId} data-testid="klinechart-spike-delete-selected"><Trash2 size={15} /> Delete selected</Button>
              <Button size="sm" type="button" variant="secondary" onClick={clearAll} disabled={persistedOverlayCount === 0 && !draftIdRef.current} data-testid="klinechart-spike-clear-all"><Trash2 size={15} /> Clear all</Button>
            </div>
          </div>

          <aside className="grid content-start gap-2 border border-white/10 bg-zinc-950 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-white/10 bg-black p-3"><p className="text-xs text-zinc-500">Saved overlays</p><p className="mt-1 text-xl font-semibold tabular-nums" data-testid="klinechart-spike-persisted-count">{persistedOverlayCount}</p></div>
              <div className="border border-white/10 bg-black p-3"><p className="text-xs text-zinc-500">Selected</p><p className="mt-1 truncate text-xs font-semibold" data-testid="klinechart-spike-selected-id">{selectedOverlayId || "None"}</p></div>
            </div>
            <div className="border border-white/10 bg-black p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400"><Database size={14} /> getOverlays() JSON</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-4 text-emerald-300" data-testid="klinechart-spike-overlay-json">{overlayJson}</pre>
            </div>
            <p className="border border-white/10 bg-black p-3 text-xs leading-5 text-zinc-400">
              Spike storage contains overlay id, native overlay name, and chart points only. It contains no candles, orders, events, bookmarks, provider data, or credentials.
            </p>
          </aside>
        </section>

        {status ? <p className="border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="status" data-testid="klinechart-spike-status">{status}</p> : null}
        {error ? <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">{error}</p> : null}
        <p className="flex items-center gap-2 text-xs text-zinc-500"><Crosshair size={14} /> Not production. No migration or owner acceptance is implied by this internal comparison route.</p>
      </div>
    </main>
  );
}

export function StudentKLineChartSpikeClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/internal/klinechart-spike">
      <SpikeBody />
    </RoleGate>
  );
}
