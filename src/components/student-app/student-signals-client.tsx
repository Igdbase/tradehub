"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import {
  formatDateTime,
  formatSignalMode,
  formatStatusLabel
} from "@/components/student-app/student-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type { StudentSignalCard, StudentSignalsResponse } from "@/types/student-app";

function SignalCard({ signal, mode }: { signal: StudentSignalCard; mode: StudentSignalsResponse["mode"] }) {
  const directionTone = signal.direction === "sell" ? "red" : "green";

  return (
    <GlassCard className="signal-ticket-new space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
              {signal.pair}
            </p>
            <Badge tone={directionTone}>{signal.direction}</Badge>
          </div>
          <p className="mt-2 text-sm text-[color:var(--label2)]">
            {signal.market} signal, {formatDateTime(signal.publishedAt ?? signal.updatedAt)}
          </p>
        </div>
        <Badge tone={mode === "auto_copy" ? "green" : "amber"}>{formatSignalMode(mode)}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip label="Entry" value={signal.entry || "Set"} />
        <StatChip label="Stop loss" value={signal.stopLoss || "Set"} tone="red" />
        <StatChip label="Take profit" value={signal.takeProfit || "Set"} tone="green" />
        <StatChip label="Risk" value={formatStatusLabel(signal.riskLabel)} tone="amber" />
      </div>
      <p className="text-sm leading-6 text-[color:var(--label2)]">
        {signal.notes ?? "Signal notes are text-only. TradeHub does not execute this trade in Stage 10."}
      </p>
    </GlassCard>
  );
}

function StudentSignalsBody() {
  const [response, setResponse] = useState<StudentSignalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSignals = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentSignalsResponse>("/api/student/signals?limit=25");
      setResponse(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load student signals.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  return (
    <StudentShell
      active="signals"
      eyebrow="Signal feed"
      title="Workspace signals"
      subtitle="Published workspace signals scoped to your student account. This is signal visibility only, not trade execution."
      action={
        <Badge
          tone={
            response?.student.signalAccessState === "allowed"
              ? response.mode === "auto_copy"
                ? "green"
                : "amber"
              : "amber"
          }
        >
          {response
            ? response.student.signalAccessState === "allowed"
              ? formatSignalMode(response.mode)
              : "Locked"
            : "Checking mode"}
        </Badge>
      }
      side={
        <>
          <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Safety posture</p>
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              Prop-firm or funded-account students stay in Signal Alerts mode. Personal-account
              Auto-Copy remains eligibility-only until execution plumbing is deliberately added.
            </p>
          </GlassCard>
          {response?.warnings.length ? (
            <GlassCard className="space-y-2 border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amber)]">
                Source notice
              </p>
              {response.warnings.map((warning) => (
                <p key={warning} className="text-sm leading-6 text-[color:var(--label2)]">
                  {warning}
                </p>
              ))}
            </GlassCard>
          ) : null}
        </>
      }
    >
      {errorMessage ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          <Button onClick={loadSignals} variant="secondary">
            Retry
          </Button>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading published signals...</p>
        </GlassCard>
      ) : response && response.student.signalAccessState !== "allowed" ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
          <p className="eyebrow !text-[color:var(--amber)]">Signals locked</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            {response.student.signalAccessReason}
          </p>
          <Button href="/app/billing" variant="secondary">
            Review access
          </Button>
        </GlassCard>
      ) : response && response.signals.length > 0 ? (
        <div className="grid gap-4">
          {response.signals.map((signal) => (
            <SignalCard key={signal.signalId} signal={signal} mode={response.mode} />
          ))}
        </div>
      ) : (
        <GlassCard className="space-y-4">
          <p className="eyebrow !text-[color:var(--amber)]">No published signals yet</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            {response?.mode === "signal_alerts_only"
              ? "Your account is in Signal Alerts posture, but your educator has not published any alerts yet."
              : "Your educator has not published workspace signals yet. When they do, they will appear here with entry, stop loss, take profit, and risk labels."}
          </p>
        </GlassCard>
      )}
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
