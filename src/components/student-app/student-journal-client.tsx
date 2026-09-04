"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import { cn } from "@/lib/utils";
import type {
  ConnectedJournalTradeSummary,
  JournalCryptoConnectionSummary,
  JournalCryptoExchange,
  StudentConnectedJournalResponse
} from "@/types/journal-workspace";
import type { StudentPracticeAnalyticsResponse } from "@/types/practice";

type JournalTab = "my_trades" | "backtesting";
type QuickFilter = "all" | "forex" | "crypto" | "open" | "closed";
type JournalCryptoSyncOverview = {
  ok: true;
  enabled: boolean;
  connections: JournalCryptoConnectionSummary[];
  supportedExchanges: readonly JournalCryptoExchange[];
  supportedSymbols: string[];
  safeMessage: string;
};

const emptyConnectedFilters = {
  account: "",
  market: "",
  symbol: "",
  source: "",
  status: "",
  dateRange: "all" as "all" | "30d" | "90d" | "year"
};

function money(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const absolute = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value > 0 ? `+${absolute}` : value < 0 ? `-${absolute}` : "0";
}

function price(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: 8 })
    : "-";
}

function percent(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function dateLabel(value?: string) {
  if (!value) return "Open";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function pnlTone(value: number | null | undefined) {
  if ((value ?? 0) > 0) return "text-[color:var(--green)]";
  if ((value ?? 0) < 0) return "text-[color:var(--red)]";
  return "text-[color:var(--label2)]";
}

function JournalTabs({ active, onChange }: { active: JournalTab; onChange: (tab: JournalTab) => void }) {
  return (
    <div className="inline-grid w-full grid-cols-2 rounded-[8px] border border-[color:var(--line)] bg-black p-1 sm:w-auto" role="tablist" aria-label="Journal views" data-testid="journal-tabs">
      {([["my_trades", "My Trades"], ["backtesting", "Backtesting"]] as const).map(([tab, label]) => (
        <button key={tab} type="button" role="tab" aria-selected={active === tab} data-testid={`journal-tab-${tab}`} onClick={() => onChange(tab)} className={cn("focus-ring min-h-10 rounded-[6px] border px-5 text-sm font-semibold transition", active === tab ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]" : "border-transparent text-[color:var(--label2)] hover:text-[color:var(--label)]")}>
          {label}
        </button>
      ))}
    </div>
  );
}

function KpiStrip({ items }: { items: Array<{ label: string; value: string; tone?: "positive" | "negative" }> }) {
  return (
    <div className={cn("grid overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-black sm:grid-cols-2", items.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4")} data-testid="journal-kpi-strip">
      {items.map((item, index) => (
        <div key={item.label} data-testid={`journal-kpi-${item.label.toLowerCase().replace(/&/g, "n").replace(/[^a-z0-9]+/g, "-")}`} className={cn("min-w-0 px-4 py-4", index > 0 && "border-t border-[color:var(--line)] sm:border-l sm:border-t-0", index === 2 && "sm:border-l-0 xl:border-l")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--label3)]">{item.label}</p>
          <p className={cn("mt-2 truncate text-xl font-semibold tabular-nums text-[color:var(--label)]", item.tone === "positive" && "text-[color:var(--green)]", item.tone === "negative" && "text-[color:var(--red)]")}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function EquityChart({ points, emptyCopy }: { points: Array<{ equity: number; date: string; drawdown?: number }>; emptyCopy: string }) {
  const chart = useMemo(() => {
    if (points.length === 0) return null;
    if (points.length === 1) {
      return {
        path: null,
        area: null,
        drawdownPath: null,
        singlePoint: { x: 350, y: 97 }
      };
    }
    const values = points.map((point) => point.equity);
    const min = Math.min(...values);
    const range = Math.max(Math.max(...values) - min, 1);
    const coords = points.map((point, index) => ({ x: 8 + (index / Math.max(points.length - 1, 1)) * 684, y: 174 - ((point.equity - min) / range) * 142 }));
    const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const drawdowns = points.map((point) => point.drawdown).filter((value): value is number => typeof value === "number");
    const maxDrawdown = Math.max(...drawdowns, 1);
    const drawdownPath = drawdowns.length === points.length
      ? points.map((point, index) => `${index === 0 ? "M" : "L"}${coords[index].x.toFixed(1)},${(32 + ((point.drawdown ?? 0) / maxDrawdown) * 142).toFixed(1)}`).join(" ")
      : null;
    return { path, area: `${path} L692,186 L8,186 Z`, drawdownPath, singlePoint: null };
  }, [points]);

  return (
    <section className="min-w-0" aria-labelledby="journal-equity-title">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Performance</p><h2 id="journal-equity-title" className="mt-1 text-lg font-semibold text-[color:var(--label)]">Equity curve</h2></div>
        {chart ? <div className="text-right" data-testid="journal-equity-final-value"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--label3)]">Final equity</p><span className={cn("mt-1 block text-sm font-semibold tabular-nums", pnlTone(points.at(-1)?.equity))}>{money(points.at(-1)?.equity)}</span>{chart.drawdownPath ? <p className="mt-1 text-[10px] font-semibold uppercase text-[color:var(--red)]">Drawdown</p> : null}</div> : null}
      </div>
      <div className="mt-3 h-52 overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-black">
        {chart ? (
          <svg viewBox="0 0 700 194" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={chart.singlePoint ? "Equity curve with one completed result" : "Equity curve"} data-testid="journal-equity-visual">
            <defs><linearGradient id="journal-equity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
            {[38, 76, 114, 152].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />)}
            {chart.path && chart.area ? <><path d={chart.area} fill="url(#journal-equity-fill)" /><path d={chart.path} fill="none" stroke="var(--accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" /></> : null}
            {chart.singlePoint ? <g data-testid="journal-equity-single-point"><line x1="8" x2="692" y1={chart.singlePoint.y} y2={chart.singlePoint.y} stroke="var(--accent)" strokeDasharray="4 5" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" /><circle cx={chart.singlePoint.x} cy={chart.singlePoint.y} r="6" fill="var(--accent)" stroke="black" strokeWidth="2" vectorEffect="non-scaling-stroke" /></g> : null}
            {chart.drawdownPath ? <path d={chart.drawdownPath} fill="none" stroke="var(--red)" strokeDasharray="5 4" strokeOpacity="0.7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
        ) : <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[color:var(--label3)]" data-testid="journal-equity-empty-state">{emptyCopy}</div>}
      </div>
    </section>
  );
}

function MonthlyResults({ months }: { months: Array<{ period: string; pnl: number; trades: number }> }) {
  return <section className="border-y border-[color:var(--line)] py-4" aria-label="Monthly performance"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Monthly results</p>{months.length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{months.slice(-6).map((month) => <div key={month.period} data-testid="journal-month-result" className="min-w-0 rounded-[6px] border border-[color:var(--line)] bg-black px-3 py-3"><p className="truncate text-xs text-[color:var(--label3)]">{month.period}</p><p className={cn("mt-1 truncate text-sm font-semibold tabular-nums", pnlTone(month.pnl))}>{money(month.pnl)}</p><p className="mt-1 text-[10px] text-[color:var(--label3)]">{month.trades} trades</p></div>)}</div> : <p className="mt-2 text-sm text-[color:var(--label3)]">No monthly results yet.</p>}</section>;
}

function groupPracticeMonths(days: StudentPracticeAnalyticsResponse["dailyPnl"]) {
  const grouped = new Map<string, { period: string; pnl: number; trades: number }>();
  for (const day of days) {
    const period = day.date.slice(0, 7);
    const current = grouped.get(period) ?? { period, pnl: 0, trades: 0 };
    current.pnl += day.pnl;
    current.trades += day.trades;
    grouped.set(period, current);
  }
  return [...grouped.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function PerformanceCalendar({ days, emptyCopy }: { days: Array<{ period: string; pnl: number; trades: number }>; emptyCopy: string }) {
  const byDay = useMemo(() => new Map(days.map((day) => [day.period, day])), [days]);
  const calendar = useMemo(() => {
    const latest = days.at(-1)?.period ? new Date(`${days.at(-1)?.period}T12:00:00Z`) : new Date();
    const start = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), 1));
    const cells: Array<{ key: string; date?: string; label?: number }> = [];
    for (let index = 0; index < start.getUTCDay(); index += 1) cells.push({ key: `blank-${index}` });
    const cursor = new Date(start);
    while (cursor.getUTCMonth() === start.getUTCMonth()) {
      const date = cursor.toISOString().slice(0, 10);
      cells.push({ key: date, date, label: cursor.getUTCDate() });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return { label: new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(start), cells };
  }, [days]);

  return (
    <section aria-labelledby="journal-calendar-title">
      <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Daily results</p><h2 id="journal-calendar-title" className="mt-1 text-lg font-semibold text-[color:var(--label)]">Performance calendar</h2></div><span className="text-xs text-[color:var(--label3)]">{calendar.label}</span></div>
      <div className="mt-3 rounded-[8px] border border-[color:var(--line)] bg-black p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-[color:var(--label3)]">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1" data-testid="journal-performance-calendar">
          {calendar.cells.map((cell) => {
            const result = cell.date ? byDay.get(cell.date) : undefined;
            return <div key={cell.key} title={result ? `${cell.date}: ${money(result.pnl)} across ${result.trades} trades` : cell.date} className={cn("aspect-square min-w-0 rounded-[5px] border border-transparent p-1 text-[10px] tabular-nums", cell.date && "border-[color:var(--line)] text-[color:var(--label3)]", result && result.pnl > 0 && "border-[color:color-mix(in_srgb,var(--green)_45%,transparent)] bg-[color:var(--green-bg)] text-[color:var(--green)]", result && result.pnl < 0 && "border-[color:color-mix(in_srgb,var(--red)_45%,transparent)] bg-[color:var(--red-bg)] text-[color:var(--red)]")}>{cell.label}</div>;
          })}
        </div>
        {days.length === 0 ? <p className="mt-3 text-center text-xs text-[color:var(--label3)]">{emptyCopy}</p> : null}
      </div>
    </section>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn("focus-ring min-h-9 rounded-full border px-4 text-xs font-semibold transition", active ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]" : "border-[color:var(--line)] bg-black text-[color:var(--label2)] hover:text-[color:var(--label)]")}>{children}</button>;
}

function JournalSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--label3)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-1 h-10 w-full min-w-0 rounded-[6px] border border-[color:var(--line)] bg-black px-3 text-sm normal-case tracking-normal text-[color:var(--label)] sm:w-auto sm:min-w-36">{children}</select></label>;
}

function ConnectedTradeRow({ trade }: { trade: ConnectedJournalTradeSummary }) {
  const isProfit = (trade.realizedPnl ?? 0) > 0;
  const isLoss = (trade.realizedPnl ?? 0) < 0;
  return (
    <article className="rounded-[8px] border border-[color:var(--line)] bg-black px-4 py-4" data-testid="connected-trade-row">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-[color:var(--label)]">{trade.symbol}</h3><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase", trade.side === "buy" ? "bg-[color:var(--green-bg)] text-[color:var(--green)]" : "bg-[color:var(--red-bg)] text-[color:var(--red)]")}>{trade.side}</span><span className="rounded-full bg-[color:var(--accent-bg)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent)]">{trade.source === "copied" ? "Copied" : "Placed at provider"}</span><span className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[color:var(--label2)]">{trade.status.replace(/_/g, " ")}</span></div>
        <div className="text-right"><p className={cn("text-base font-semibold tabular-nums", isProfit && "text-[color:var(--green)]", isLoss && "text-[color:var(--red)]", !isProfit && !isLoss && "text-[color:var(--label2)]")}>{money(trade.realizedPnl)}</p><p className="mt-1 text-xs text-[color:var(--label3)]">{dateLabel(trade.closedAt ?? trade.openedAt)}</p></div>
      </div>
      <div className="mt-4 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-5"><p><span className="text-[color:var(--label3)]">Entry </span><span className="font-semibold tabular-nums text-[color:var(--label)]">{price(trade.entryPrice)}</span></p><p><span className="text-[color:var(--label3)]">Exit </span><span className="font-semibold tabular-nums text-[color:var(--label)]">{price(trade.exitPrice)}</span></p><p><span className="text-[color:var(--label3)]">SL </span><span className="font-semibold tabular-nums text-[color:var(--red)]">{price(trade.stopLoss)}</span></p><p><span className="text-[color:var(--label3)]">TP </span><span className="font-semibold tabular-nums text-[color:var(--green)]">{price(trade.takeProfit)}</span></p><p className="truncate"><span className="text-[color:var(--label3)]">Account </span><span className="font-semibold text-[color:var(--label2)]">{trade.accountLabel}</span></p></div>
    </article>
  );
}

function JournalLoading({ label }: { label: string }) {
  return <div className="rounded-[8px] border border-[color:var(--line)] bg-black px-5 py-10 text-center text-sm text-[color:var(--label2)]" role="status">{label}</div>;
}

function JournalError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return <div className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_45%,var(--line))] bg-black px-5 py-5"><p className="text-sm text-[color:var(--red)]">{message}</p><button type="button" onClick={() => void onRetry()} className="focus-ring mt-3 rounded-[6px] border border-[color:var(--line)] px-3 py-2 text-xs font-semibold text-[color:var(--label)]">Try again</button></div>;
}

function JournalSyncPanel({ readiness, onHistoryChanged }: { readiness: StudentConnectedJournalResponse["readiness"]; onHistoryChanged: () => Promise<void> }) {
  const [overview, setOverview] = useState<JournalCryptoSyncOverview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [exchange, setExchange] = useState<JournalCryptoExchange>("binance");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["BTCUSDT", "ETHUSDT"]);
  const [accountLabel, setAccountLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const loadOverview = useCallback(async () => {
    try {
      setOverview(await requestCourseHubApi<JournalCryptoSyncOverview>("/api/student/journal/crypto-sync"));
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Journal Sync status is unavailable.");
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const connections = overview?.connections ?? readiness.cryptoConnections;
  const supportedSymbols = overview?.supportedSymbols ?? ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LINKUSDT"];
  const submitConnection = async () => {
    setStatus("Verifying read-only access...");
    try {
      const next = await requestCourseHubApi<JournalCryptoSyncOverview>("/api/student/journal/crypto-sync", {
        method: "POST",
        body: JSON.stringify({ exchange, selectedSymbols, accountLabel, apiKey, apiSecret })
      });
      setOverview(next);
      setApiKey("");
      setApiSecret("");
      setStatus("Read-only Journal Sync connection is ready.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Journal Sync could not verify that connection.");
    }
  };
  const syncConnection = async (connection: JournalCryptoConnectionSummary) => {
    setStatus("Syncing confirmed crypto history...");
    try {
      const next = await requestCourseHubApi<JournalCryptoSyncOverview>(`/api/student/journal/crypto-sync/${encodeURIComponent(connection.connectionRef)}/sync`, { method: "POST" });
      setOverview(next);
      await onHistoryChanged();
      setStatus("Journal Sync finished.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Journal Sync failed safely.");
    }
  };
  const disconnectConnection = async (connection: JournalCryptoConnectionSummary) => {
    setStatus("Disconnecting Journal Sync...");
    try {
      const next = await requestCourseHubApi<JournalCryptoSyncOverview>(`/api/student/journal/crypto-sync/${encodeURIComponent(connection.connectionRef)}/disconnect`, { method: "POST" });
      setOverview(next);
      await onHistoryChanged();
      setStatus("Journal Sync is disconnected.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Journal Sync could not finish disconnecting.");
    }
  };

  return (
    <section className="border-y border-[color:var(--line)] py-4" aria-label="Journal Sync" data-testid="journal-crypto-sync-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Journal Sync</p>
          <h2 className="mt-1 text-lg font-semibold text-[color:var(--label)]">Read-only crypto history</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--label2)]">Connect Binance or Bybit with read-only history access. Copier setup and practice results stay separate.</p>
        </div>
        <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-semibold capitalize text-[color:var(--label2)]" data-testid="journal-sync-readiness-state">{readiness.state.replace(/_/g, " ")}</span>
      </div>
      {connections.length > 0 ? <div className="mt-4 grid gap-2 lg:grid-cols-2">{connections.map((connection) => <div key={connection.connectionRef} className="rounded-[8px] border border-[color:var(--line)] bg-black px-3 py-3" data-testid="journal-sync-connection-row"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[color:var(--label)]">{connection.accountLabel}</p><p className="mt-1 text-xs text-[color:var(--label3)]">{connection.exchange.toUpperCase()} · {connection.selectedSymbols.join(", ") || "No symbols"}</p></div><span className="rounded-full bg-[color:var(--accent-bg)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[color:var(--accent)]">{connection.status.replace(/_/g, " ")}</span></div><p className="mt-2 text-xs leading-5 text-[color:var(--label3)]">Imported {connection.importedCount} · Skipped {connection.skippedCount}{connection.truncated ? " · Bounded history" : ""}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void syncConnection(connection)} disabled={connection.syncDisabled || connection.status === "syncing"} className="focus-ring min-h-9 rounded-[6px] border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--label)]">Sync now</button><button type="button" onClick={() => void disconnectConnection(connection)} disabled={connection.status === "disconnected"} className="focus-ring min-h-9 rounded-[6px] border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--label2)]">Disconnect</button></div></div>)}</div> : null}
      <div className="mt-4 grid gap-3 rounded-[8px] border border-[color:var(--line)] bg-black p-3 lg:grid-cols-[9rem_minmax(0,1fr)_minmax(8rem,0.45fr)_minmax(9rem,0.55fr)]">
        <JournalSelect label="Exchange" value={exchange} onChange={(value) => setExchange(value === "bybit" ? "bybit" : "binance")}><option value="binance">Binance</option><option value="bybit">Bybit</option></JournalSelect>
        <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--label3)]">Symbols<div className="mt-2 flex flex-wrap gap-2 normal-case tracking-normal">{supportedSymbols.map((symbol) => <button key={symbol} type="button" aria-pressed={selectedSymbols.includes(symbol)} onClick={() => setSelectedSymbols((current) => current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol].slice(0, 8))} className={cn("focus-ring rounded-full border px-3 py-1 text-xs font-semibold", selectedSymbols.includes(symbol) ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]" : "border-[color:var(--line)] text-[color:var(--label2)]")}>{symbol}</button>)}</div></label>
        <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--label3)]">Label<input value={accountLabel} onChange={(event) => setAccountLabel(event.target.value)} maxLength={48} className="focus-ring mt-1 h-10 w-full rounded-[6px] border border-[color:var(--line)] bg-black px-3 text-sm normal-case tracking-normal text-[color:var(--label)]" placeholder="Crypto history" /></label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" className="focus-ring h-10 rounded-[6px] border border-[color:var(--line)] bg-black px-3 text-sm text-[color:var(--label)]" placeholder="Read-only API key" />
          <input value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} type="password" autoComplete="off" className="focus-ring h-10 rounded-[6px] border border-[color:var(--line)] bg-black px-3 text-sm text-[color:var(--label)]" placeholder="API secret" />
          <button type="button" onClick={() => void submitConnection()} className="focus-ring min-h-10 rounded-[6px] border border-[color:var(--accent)] bg-[color:var(--accent-bg)] px-3 text-xs font-semibold text-[color:var(--accent)]">Connect read-only</button>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-[color:var(--label3)]" data-testid="journal-sync-safe-status">{status ?? overview?.safeMessage ?? readiness.message}</p>
    </section>
  );
}

function MyTradesView() {
  const [response, setResponse] = useState<StudentConnectedJournalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [filters, setFilters] = useState(emptyConnectedFilters);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ dateRange: filters.dateRange });
    if (filters.account) params.set("account", filters.account);
    if (filters.market) params.set("market", filters.market);
    if (filters.symbol) params.set("symbol", filters.symbol);
    if (filters.source) params.set("source", filters.source);
    if (filters.status) params.set("status", filters.status);
    if (!filters.market && (quickFilter === "crypto" || quickFilter === "forex")) params.set("market", quickFilter);
    if (!filters.status && (quickFilter === "open" || quickFilter === "closed")) params.set("status", quickFilter);
    try { setResponse(await requestCourseHubApi<StudentConnectedJournalResponse>(`/api/student/journal/connected-trades?${params}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "TradeHub could not load connected-account history."); }
    finally { setLoading(false); }
  }, [filters, quickFilter]);
  useEffect(() => { void load(); }, [load]);
  const performance = response?.performance;

  return <div className="space-y-6" data-testid="journal-my-trades-view">
    {loading && !response ? <JournalLoading label="Loading connected-account performance..." /> : null}
    {error ? <JournalError message={error} onRetry={load} /> : null}
    {response ? <>
      <KpiStrip items={[{ label: "Realized P&L", value: money(performance?.netPnl), tone: (performance?.netPnl ?? 0) < 0 ? "negative" : "positive" }, { label: "Win rate", value: percent(performance?.winRate) }, { label: "Closed trades", value: String(performance?.closedTrades ?? 0) }, { label: "Average R", value: performance?.averageR == null ? "-" : `${performance.averageR.toFixed(2)}R` }, { label: "Max drawdown", value: money(performance?.maxDrawdown), tone: (performance?.maxDrawdown ?? 0) > 0 ? "negative" : undefined }]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.7fr)]"><EquityChart points={response.equityCurve} emptyCopy="The equity curve will appear after provider-confirmed real trades are available." /><PerformanceCalendar days={response.dailyPnl} emptyCopy="No confirmed daily results yet." /></div><MonthlyResults months={response.monthlyPnl} />
      <JournalSyncPanel readiness={response.readiness} onHistoryChanged={load} />
      <section className="border-y border-[color:var(--line)] py-4" aria-label="Connected trade filters">
        <div className="flex flex-wrap gap-2">{(["all", "forex", "crypto", "open", "closed"] as const).map((filter) => <FilterButton key={filter} active={quickFilter === filter} onClick={() => { setQuickFilter(filter); setFilters((current) => ({ ...current, market: "", status: "" })); }}>{filter[0].toUpperCase() + filter.slice(1)}</FilterButton>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6 xl:items-end"><JournalSelect label="Account" value={filters.account} onChange={(account) => setFilters((current) => ({ ...current, account }))}><option value="">All accounts</option>{response.filters.accounts.map((account) => <option key={account} value={account}>{account}</option>)}</JournalSelect><JournalSelect label="Market" value={filters.market} onChange={(market) => { setQuickFilter("all"); setFilters((current) => ({ ...current, market })); }}><option value="">All markets</option><option value="forex">Forex</option><option value="cfd">CFD</option><option value="crypto">Crypto</option></JournalSelect><JournalSelect label="Symbol" value={filters.symbol} onChange={(symbol) => setFilters((current) => ({ ...current, symbol }))}><option value="">All symbols</option>{response.filters.symbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}</JournalSelect><JournalSelect label="Status" value={filters.status} onChange={(status) => { setQuickFilter("all"); setFilters((current) => ({ ...current, status })); }}><option value="">All statuses</option><option value="open">Open</option><option value="partial">Partial</option><option value="closed">Closed</option><option value="execution_only">Execution only</option></JournalSelect><JournalSelect label="Source" value={filters.source} onChange={(source) => setFilters((current) => ({ ...current, source }))}><option value="">All sources</option><option value="copied">Copied</option><option value="provider_manual">Placed at provider</option></JournalSelect><JournalSelect label="Period" value={filters.dateRange} onChange={(dateRange) => setFilters((current) => ({ ...current, dateRange: dateRange as typeof current.dateRange }))}><option value="all">All time</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="year">Last year</option></JournalSelect></div>
      </section>
      <section aria-labelledby="connected-trades-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Confirmed history</p><h2 id="connected-trades-title" className="mt-1 text-xl font-semibold text-[color:var(--label)]">Trade history</h2></div><button type="button" onClick={() => void load()} disabled={loading} className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-[6px] border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--label2)]"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh</button></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--label3)]" data-testid="connected-journal-result-window"><span>Showing {response.resultWindow.visibleCount} of {response.resultWindow.matchedCount} matching trades from {response.resultWindow.scannedCount} recent ledger records.</span><span>Journal Sync: {response.readiness.state.replace(/_/g, " ")}</span></div>
        {response.resultWindow.truncated ? <p className="mt-2 rounded-[6px] border border-[color:var(--accent)] bg-[color:var(--accent-bg)] px-3 py-2 text-xs text-[color:var(--label2)]" data-testid="connected-journal-truncated">{response.safeMessage}</p> : null}
        {response.trades.length > 0 ? <div className="mt-4 space-y-3">{response.trades.map((trade) => <ConnectedTradeRow key={trade.tradeRef} trade={trade} />)}</div> : <div className="mt-4 rounded-[8px] border border-dashed border-[color:var(--line)] bg-black px-5 py-10 text-center" data-testid="connected-trades-empty"><h3 className="text-base font-semibold text-[color:var(--label)]">No confirmed trades to show</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[color:var(--label2)]">{response.readiness.message}</p><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[color:var(--label3)]">Practice sessions and older personal journal records are kept separate from this view.</p></div>}
      </section>
    </> : null}
  </div>;
}

function practiceSummary(response: StudentPracticeAnalyticsResponse) {
  const closedTrades = response.sessionSummaries.reduce((total, session) => total + session.closedTrades, 0);
  return { closedTrades, netPnl: response.sessionSummaries.reduce((total, session) => total + session.netPnl, 0), winRate: closedTrades > 0 ? response.sessionSummaries.reduce((total, session) => total + session.winRate * session.closedTrades, 0) / closedTrades : 0, averageR: closedTrades > 0 ? response.sessionSummaries.reduce((total, session) => total + session.averageR * session.closedTrades, 0) / closedTrades : 0 };
}

function BacktestingView() {
  const [response, setResponse] = useState<StudentPracticeAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("all");
  const load = useCallback(async () => { setLoading(true); setError(null); try { setResponse(await requestCourseHubApi<StudentPracticeAnalyticsResponse>("/api/student/practice/analytics")); } catch (reason) { setError(reason instanceof Error ? reason.message : "TradeHub could not load backtesting analytics."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const summary = response ? practiceSummary(response) : null;
  const sessions = response?.recentCompletedSessions.filter((session) => symbol === "all" || session.symbol === symbol) ?? [];
  const curve = response?.equityCurve.map((point) => ({ equity: point.equity, date: point.date, drawdown: point.drawdown })) ?? [];
  const days = response?.dailyPnl.map((day) => ({ period: day.date, pnl: day.pnl, trades: day.trades })) ?? [];
  const months = response ? groupPracticeMonths(response.dailyPnl) : [];

  return <div className="space-y-6" data-testid="journal-backtesting-view">
    <div className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color:var(--accent-bg)] px-4 py-3 text-sm text-[color:var(--label2)]">Backtesting contains simulated practice results only. These figures are never combined with connected-account performance.</div>
    {loading && !response ? <JournalLoading label="Loading backtesting performance..." /> : null}{error ? <JournalError message={error} onRetry={load} /> : null}
    {response ? <>{response.cohortCoverage.excludedOrderCount > 0 ? <p className="rounded-[6px] border border-[color:color-mix(in_srgb,var(--accent)_55%,var(--line))] bg-[color:color-mix(in_srgb,var(--accent)_8%,black)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]" data-testid="journal-backtesting-coverage-warning" role="status">{response.cohortCoverage.safeMessage} Displayed analytics use {response.cohortCoverage.eligibleClosedOrderCount} eligible closed {response.cohortCoverage.eligibleClosedOrderCount === 1 ? "trade" : "trades"}.</p> : null}<KpiStrip items={[{ label: "Simulated P&L", value: money(summary?.netPnl), tone: (summary?.netPnl ?? 0) < 0 ? "negative" : "positive" }, { label: "Win rate", value: percent(summary?.winRate) }, { label: "Closed trades", value: String(summary?.closedTrades ?? 0) }, { label: "Average R", value: `${(summary?.averageR ?? 0).toFixed(2)}R` }]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.7fr)]"><EquityChart points={curve} emptyCopy="Complete simulated trades to build a backtesting equity curve." /><PerformanceCalendar days={days} emptyCopy="No simulated daily results yet." /></div><MonthlyResults months={months} />
      <section className="grid gap-6 border-y border-[color:var(--line)] py-5 lg:grid-cols-2"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Symbols</p><div className="mt-3 space-y-2">{response.symbolBreakdown.slice(0, 6).map((item) => <div key={item.symbol} data-testid="journal-symbol-result" className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-[color:var(--label)]">{item.symbol}</span><span className={cn("tabular-nums", pnlTone(item.netPnl))}>{money(item.netPnl)} · {Math.round(item.winRate * 100)}%</span></div>)}{response.symbolBreakdown.length === 0 ? <p className="text-sm text-[color:var(--label3)]">No symbol results yet.</p> : null}</div></div><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Strategies</p><div className="mt-3 space-y-2">{response.playbookBreakdown.slice(0, 6).map((item) => <div key={item.playbookId} data-testid="journal-strategy-result" className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-[color:var(--label)]">{item.playbookName}</span><span className={cn("shrink-0 tabular-nums", pnlTone(item.netPnl))}>{money(item.netPnl)} · {item.trades} trades</span></div>)}{response.playbookBreakdown.length === 0 ? <p className="text-sm text-[color:var(--label3)]">No strategy results yet.</p> : null}</div></div></section>
      <section aria-labelledby="backtesting-sessions-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Simulated sessions</p><h2 id="backtesting-sessions-title" className="mt-1 text-xl font-semibold text-[color:var(--label)]">Recent reviews</h2></div><JournalSelect label="Symbol" value={symbol} onChange={setSymbol}><option value="all">All symbols</option>{response.symbolBreakdown.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}</JournalSelect></div>
        {sessions.length > 0 ? <div className="mt-4 space-y-3">{sessions.map((session) => <article key={session.sessionId} data-testid="journal-backtesting-session" className="rounded-[8px] border border-[color:var(--line)] bg-black px-4 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-[color:var(--label)]">{session.symbol}</h3><span className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--label2)]">Simulated</span>{session.playbookName ? <span className="rounded-full bg-[color:var(--accent-bg)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent)]">{session.playbookName}</span> : null}</div><p className="mt-2 text-xs text-[color:var(--label3)]">{session.closedTrades} closed trades · {session.timeframeMinutes}m · {dateLabel(session.completedAt)}</p></div><div className="flex items-center gap-4"><span className={cn("text-base font-semibold tabular-nums", pnlTone(session.netPnl))}>{money(session.netPnl)}</span><Link href={`/app/practice/${session.sessionId}/report`} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-[6px] border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--label2)] hover:text-[color:var(--label)]">Review <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></div></article>)}</div> : <div className="mt-4 rounded-[8px] border border-dashed border-[color:var(--line)] bg-black px-5 py-10 text-center text-sm text-[color:var(--label2)]">No completed sessions match this filter.</div>}
      </section>
    </> : null}
  </div>;
}

function StudentJournalBody() {
  const [activeTab, setActiveTab] = useState<JournalTab>("my_trades");
  return <StudentShell active="journal" eyebrow="Performance workspace" title="Journal" subtitle="Review confirmed account performance or switch to your separate simulated backtesting results." action={<JournalTabs active={activeTab} onChange={setActiveTab} />}><div data-testid="student-journal-workspace" data-active-tab={activeTab}>{activeTab === "my_trades" ? <MyTradesView /> : <BacktestingView />}</div></StudentShell>;
}

export function StudentJournalClient() {
  return <RoleGate allowedRole="student" nextPath="/app/journal"><StudentJournalBody /></RoleGate>;
}
