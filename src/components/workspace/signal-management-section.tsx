"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { formatDate } from "@/components/workspace/workspace-formatters";
import {
  isSupportedCryptoSpotSymbol,
  isSupportedForexDemoProofSymbol
} from "@/lib/workspace/signal-symbols";
import type {
  WorkspaceCryptoExecutionOverviewResponse
} from "@/types/crypto-execution";
import type {
  WorkspaceSignalDraftPayload,
  WorkspaceSignalRecord,
  WorkspaceSignalStatus
} from "@/types/workspace-dashboard";

const fieldClasses =
  "focus-ring min-h-11 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] placeholder:text-[color:var(--label3)]";

function signalTone(status: WorkspaceSignalStatus) {
  if (status === "published") {
    return "green" as const;
  }

  if (status === "cancelled") {
    return "red" as const;
  }

  return "amber" as const;
}

const emptyDraft: WorkspaceSignalDraftPayload = {
  market: "forex",
  pair: "EURUSD",
  direction: "buy",
  entry: "",
  takeProfit: "",
  stopLoss: "",
  riskLabel: "medium",
  deliveryMode: "alerts_only",
  notes: ""
};

function pairForMarket(currentPair: string, market: "forex" | "crypto") {
  if (market === "crypto") {
    return currentPair.trim() && isSupportedCryptoSpotSymbol(currentPair)
      ? currentPair.toUpperCase()
      : "BTCUSDT";
  }

  return currentPair.trim() && isSupportedForexDemoProofSymbol(currentPair)
    ? currentPair.toUpperCase()
    : "EURUSD";
}

function firstNumericLevel(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function directionalLevelError(draft: WorkspaceSignalDraftPayload) {
  const entry = firstNumericLevel(draft.entry);
  const takeProfit = firstNumericLevel(draft.takeProfit);
  const stopLoss = firstNumericLevel(draft.stopLoss);

  if (!entry || !takeProfit || !stopLoss) {
    return null;
  }

  if (draft.direction === "buy" && (takeProfit <= entry || stopLoss >= entry)) {
    return "For buy signals, take profit must be above entry and stop loss below entry.";
  }

  if (draft.direction === "sell" && (takeProfit >= entry || stopLoss <= entry)) {
    return "For sell signals, take profit must be below entry and stop loss above entry.";
  }

  return null;
}

export function SignalManagementSection({
  signals,
  cryptoExecution,
  loading,
  saving,
  status,
  warnings,
  onStatusChange,
  onRefresh,
  onCreateSignal
}: {
  signals: WorkspaceSignalRecord[];
  cryptoExecution?: WorkspaceCryptoExecutionOverviewResponse | null;
  loading: boolean;
  saving: boolean;
  status: WorkspaceSignalStatus | "all";
  warnings: string[];
  onStatusChange: (value: WorkspaceSignalStatus | "all") => void;
  onRefresh: () => void;
  onCreateSignal: (payload: WorkspaceSignalDraftPayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState<WorkspaceSignalDraftPayload>(emptyDraft);
  const missingLevels =
    !draft.entry.trim() || !draft.takeProfit.trim() || !draft.stopLoss.trim();
  const levelError = directionalLevelError(draft);
  const validMarketPair = draft.market === "crypto"
    ? isSupportedCryptoSpotSymbol(draft.pair)
    : isSupportedForexDemoProofSymbol(draft.pair);
  const marketPairError = validMarketPair
    ? null
    : draft.market === "crypto"
      ? "Crypto signals require a supported spot symbol such as BTCUSDT or ETHUSDT."
      : "Forex demo proof supports EURUSD, GBPUSD, XAUUSD, or BTCUSD.";
  const cryptoSummary = cryptoExecution?.summary;
  const autoCopyPosture = cryptoSummary?.autoCopyPosture;
  const forexSummary = cryptoSummary?.forexPaper;
  const estimatedEligibleCount = draft.market === "crypto"
    ? cryptoSummary?.readinessCounts.paper_ready ?? 0
    : forexSummary?.routing.readyForPaperCount ?? 0;
  const fullAutoCount = autoCopyPosture?.fullAutoCount ?? 0;
  const confirmationCount = draft.market === "crypto"
    ? autoCopyPosture?.confirmationRequiredCount ?? 0
    : forexSummary?.routing.confirmationRequiredCount ?? autoCopyPosture?.confirmationRequiredCount ?? 0;
  const alertsOnlyCount = autoCopyPosture?.alertsOnlyCount ?? 0;
  const blockedPreferenceCount = draft.market === "crypto"
    ? autoCopyPosture?.blockedCount ?? 0
    : forexSummary?.routing.riskBlockedCount ?? autoCopyPosture?.blockedCount ?? 0;
  const expectedRoutingMode = draft.market === "forex"
    ? "Forex student review"
    : estimatedEligibleCount > 0
      ? "Crypto student review"
      : "No ready students in view";

  async function submit(publish: boolean) {
    if (levelError || marketPairError) {
      return;
    }

    await onCreateSignal({
      ...draft,
      publish
    });
    setDraft(emptyDraft);
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">Signal management</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            Structured signal drafts
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--label2)]">
            Create direct TradeHub signals for students in this workspace. Student setup, consent,
            risk limits, and workspace controls still decide who can copy a published signal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as WorkspaceSignalStatus | "all")}
            className={`${fieldClasses} h-10 min-h-10`}
          >
            <option value="all">All signals</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {warnings.map((warning) => (
        <p key={warning} className="rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {warning}
        </p>
      ))}

      <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Market</span>
            <select
              value={draft.market}
              onChange={(event) =>
                setDraft((current) => {
                  const nextMarket = event.target.value as "forex" | "crypto";
                  return {
                    ...current,
                    market: nextMarket,
                    pair: pairForMarket(current.pair, nextMarket)
                  };
                })
              }
              className={`${fieldClasses} w-full`}
            >
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Pair</span>
            <input
              value={draft.pair}
              onChange={(event) => setDraft((current) => ({ ...current, pair: event.target.value }))}
              className={`${fieldClasses} w-full uppercase`}
              placeholder={draft.market === "crypto" ? "BTCUSDT, ETHUSDT" : "EURUSD, BTCUSD"}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Direction</span>
            <select
              value={draft.direction}
              onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value as "buy" | "sell" }))}
              className={`${fieldClasses} w-full`}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Risk</span>
            <select
              value={draft.riskLabel}
              onChange={(event) => setDraft((current) => ({ ...current, riskLabel: event.target.value as "low" | "medium" | "high" }))}
              className={`${fieldClasses} w-full`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Entry</span>
            <input
              value={draft.entry}
              onChange={(event) => setDraft((current) => ({ ...current, entry: event.target.value }))}
              className={`${fieldClasses} w-full tabular-nums`}
              placeholder="1.0845"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Take profit</span>
            <input
              value={draft.takeProfit}
              onChange={(event) => setDraft((current) => ({ ...current, takeProfit: event.target.value }))}
              className={`${fieldClasses} w-full tabular-nums`}
              placeholder="1.0920"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Stop loss</span>
            <input
              value={draft.stopLoss}
              onChange={(event) => setDraft((current) => ({ ...current, stopLoss: event.target.value }))}
              className={`${fieldClasses} w-full tabular-nums`}
              placeholder="1.0790"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Delivery mode</span>
            <select
              value={draft.deliveryMode}
              onChange={(event) => setDraft((current) => ({ ...current, deliveryMode: event.target.value as "manual_review" | "alerts_only" }))}
              className={`${fieldClasses} w-full`}
            >
              <option value="alerts_only">Signal Alerts only</option>
              <option value="manual_review">Manual review</option>
            </select>
          </label>
          <label className="space-y-2 md:col-span-4">
            <span className="text-sm font-medium text-[color:var(--label)]">Notes</span>
            <textarea
              value={draft.notes ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              className={`${fieldClasses} min-h-[6rem] w-full`}
              placeholder="Plain-text context for students. No promises, no hype."
            />
          </label>
        </div>
        {missingLevels ? (
          <p className="mt-4 text-sm leading-6 text-[color:var(--amber)]">
            Entry, take profit, and stop loss are required before a signal draft can be saved.
          </p>
        ) : null}
        {levelError ? (
          <p className="mt-4 rounded-[16px] border border-[color:color-mix(in_srgb,var(--red)_32%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
            {levelError}
          </p>
        ) : null}
        {marketPairError ? (
          <p className="mt-4 rounded-[16px] border border-[color:color-mix(in_srgb,var(--red)_32%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--red)]">
            {marketPairError}
          </p>
        ) : null}

        <div className="mt-4 space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_42%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Publish review</p>
              <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                Review the market, levels, and student readiness before publishing.
              </p>
            </div>
            <Badge tone={draft.market === "crypto" ? "amber" : "neutral"}>
              {expectedRoutingMode}
            </Badge>
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Market</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{draft.market}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Pair</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{draft.pair || "Not set"}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Direction</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{draft.direction}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Levels</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">
                {draft.entry || "-"} / {draft.takeProfit || "-"} / {draft.stopLoss || "-"}
              </p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Delivery</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{draft.deliveryMode.replace(/_/g, " ")}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Ready students</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">
                {draft.market === "crypto" ? estimatedEligibleCount : 0}
              </p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Auto copy</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{fullAutoCount}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Needs confirm</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{confirmationCount}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Alerts only</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{alertsOnlyCount}</p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--line)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Blocked</p>
              <p className="mt-1 break-safe text-sm font-semibold text-[color:var(--label)]">{blockedPreferenceCount}</p>
            </div>
          </div>
          {draft.market === "crypto" && estimatedEligibleCount === 0 ? (
            <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
              No ready crypto students are present in the current view. Common blockers include
              missing payment, paused consent, missing setup, alerts-only mode, or unsupported symbols.
            </p>
          ) : null}
          {draft.market === "forex" ? (
            <p className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
              Forex signals stay controlled by each student&apos;s paid setup, consent, risk limits, and workspace controls.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => submit(false)} variant="secondary" disabled={saving}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <Button onClick={() => submit(true)} variant="primary" disabled={saving || Boolean(levelError || marketPairError)}>
            {saving ? "Publishing..." : "Mark published"}
          </Button>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[color:var(--line)] p-6">
          <p className="text-sm font-semibold text-[color:var(--label)]">No signals yet</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Draft a signal when ready. Published signals remain controlled by student setup and workspace safety checks.
          </p>
        </div>
      ) : (
        <div className="bounded-list-4 space-y-3">
          {signals.map((signal) => (
            <div
              key={signal.signalId}
              className="rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[color:var(--label)]">{signal.pair}</p>
                    <Badge tone={signal.direction === "buy" ? "green" : "red"}>{signal.direction}</Badge>
                    <Badge tone={signalTone(signal.status)}>{signal.status}</Badge>
                  </div>
                  <p className="mt-2 break-words text-xs text-[color:var(--label3)]">
                    {signal.market} - {signal.deliveryMode.replace(/_/g, " ")} - updated {formatDate(signal.updatedAt)}
                  </p>
                </div>
                <Badge tone={signal.riskLabel === "high" ? "amber" : "neutral"}>
                  {signal.riskLabel} risk
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Entry
                  </p>
                  <p className="tabular-nums mt-1 text-sm font-semibold text-[color:var(--label)]">{signal.entry}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Take profit
                  </p>
                  <p className="tabular-nums mt-1 text-sm font-semibold text-[color:var(--green)]">{signal.takeProfit}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Stop loss
                  </p>
                  <p className="tabular-nums mt-1 text-sm font-semibold text-[color:var(--red)]">{signal.stopLoss}</p>
                </div>
              </div>
              {signal.notes ? (
                <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-6 text-[color:var(--label2)]">{signal.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
