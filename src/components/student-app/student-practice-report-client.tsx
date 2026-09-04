"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  formatPracticeQuantity
} from "@/lib/practice/practice-instrument-specs";
import type {
  PracticeAnnotationSummary,
  PracticeOrderSummary,
  PracticeSessionReportResponse
} from "@/types/practice";

type StudentPracticeReportClientProps = {
  sessionId: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-NG");
}

function formatPercent(value: number | undefined) {
  return `${(((typeof value === "number" && Number.isFinite(value) ? value : 0) * 100)).toFixed(0)}%`;
}

function ReportSection({
  title,
  eyebrow,
  children,
  action
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="practice-report-section rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold text-[color:var(--label)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SafeEmpty({ children }: { children: ReactNode }) {
  return <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">{children}</p>;
}

function OrderRow({ order }: { order: PracticeOrderSummary }) {
  const instrument = order.instrument;
  const entryPrice = order.filledPrice ?? order.requestedPrice;

  return (
    <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-sm md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[color:var(--label)]">
          {order.direction.toUpperCase()} {order.orderType} · {order.playbookName ?? "No strategy"} · {order.closeReason ?? order.status}
        </p>
        <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
          Entry {formatPracticePrice(entryPrice, instrument)} · SL {order.stopLoss === undefined ? "-" : formatPracticePrice(order.stopLoss, instrument)} · TP {order.takeProfit === undefined ? "-" : formatPracticePrice(order.takeProfit, instrument)} · Size {order.size === undefined ? "-" : `${formatPracticeQuantity(order.size, instrument)} ${instrument?.quantityLabel ?? "Qty"}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Badge tone={(order.pnl ?? 0) >= 0 ? "green" : "red"}>{order.pnl === undefined ? "No P&L" : formatPracticeMoney(order.pnl)}</Badge>
        <Badge tone="accent">{order.rMultiple === undefined ? "R -" : `${order.rMultiple.toFixed(2)}R`}</Badge>
      </div>
    </div>
  );
}

function AnnotationList({
  annotations,
  empty
}: {
  annotations: PracticeAnnotationSummary[];
  empty: string;
}) {
  if (!annotations.length) {
    return <SafeEmpty>{empty}</SafeEmpty>;
  }

  return (
    <div className="grid gap-2">
      {annotations.slice(0, 12).map((annotation) => (
        <div key={annotation.annotationId} className="rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-[color:var(--label)]">
              {annotation.label ?? annotation.kind.replace(/_/g, " ")}
            </p>
            {annotation.isMainLesson ? <Badge tone="green">Main lesson</Badge> : null}
            {annotation.eventId ? <Badge tone="accent">Event-linked</Badge> : null}
          </div>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
            {annotation.text}
          </p>
          <p className="mt-1 text-xs text-[color:var(--label3)]">
            {annotation.candleIndex === undefined ? "Session note" : `Candle ${annotation.candleIndex}`} · {annotation.priceLevel === undefined ? "No price" : annotation.priceLevel}
          </p>
        </div>
      ))}
    </div>
  );
}

function StudentPracticeReportBody({ sessionId }: StudentPracticeReportClientProps) {
  const [report, setReport] = useState<PracticeSessionReportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setReport(await requestCourseHubApi<PracticeSessionReportResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/report`
      ));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load that practice report.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const session = report?.session;
  const performance = report?.performance;

  return (
    <StudentShell
      active="practice"
      eyebrow="Practice report"
      title={session ? `${session.sessionName ? `${session.sessionName} · ` : ""}${session.symbol}` : "Session report"}
      subtitle="A browser-printable practice review built from student-owned simulated data only. Use the browser print dialog to save a PDF; TradeHub does not generate or store report files."
      action={
        <div className="practice-report-no-print flex flex-wrap gap-2">
          <Button href="/app/practice" variant="ghost">Back to practice</Button>
          <Button href={`/app/practice/${encodeURIComponent(sessionId)}/terminal`} variant="secondary">Back to terminal</Button>
          <Button type="button" onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      }
    >
      <style jsx global>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          body {
            background: #ffffff !important;
            color: #111111 !important;
          }

          header,
          nav,
          footer,
          .practice-report-no-print {
            display: none !important;
          }

          .practice-report-shell {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .practice-report-section {
            break-inside: avoid;
            page-break-inside: avoid;
            background: #ffffff !important;
            border-color: #d4d4d4 !important;
            box-shadow: none !important;
          }

          .practice-report-page {
            gap: 12px !important;
          }
        }
      `}</style>

      {errorMessage ? (
        <GlassCard className="practice-report-no-print border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="break-safe text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading practice report...</p>
        </GlassCard>
      ) : null}

      {report && session && performance ? (
        <div className="practice-report-shell practice-report-page grid gap-4">
          <GlassCard className="practice-report-section space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">TradeHub practice report</p>
                <h1 className="mt-1 break-safe text-2xl font-semibold text-[color:var(--label)]">
                  {session.sessionName ?? `${session.symbol} practice session`}
                </h1>
                <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  {session.symbol} · {session.assetClass} · {session.timeframeMinutes}m · {formatDate(session.dateStart)} to {formatDate(session.dateEnd)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={session.status === "completed" ? "green" : session.status === "active" ? "amber" : "neutral"}>{session.status}</Badge>
                <Badge tone="accent">Practice only</Badge>
              </div>
            </div>
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              {report.safeMessage} Generated {formatDate(report.generatedAt)}.
            </p>
          </GlassCard>

          <ReportSection title="Session Summary" eyebrow="Core">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip label="Start" value={formatPracticeMoney(performance.startingBalance)} />
              <StatChip label="Equity" value={formatPracticeMoney(performance.endingBalance)} />
              <StatChip label="Realized" value={formatPracticeMoney(performance.netPnl)} tone={performance.netPnl >= 0 ? "green" : "red"} />
              <StatChip label="Win" value={formatPercent(performance.winRate)} />
              <StatChip label="Avg R" value={performance.averageR.toFixed(2)} />
              <StatChip label="Max DD" value={formatPracticeMoney(performance.maxDrawdown)} tone="red" />
              <StatChip label="PF" value={performance.profitFactor.toFixed(2)} />
              <StatChip label="Trades" value={`${performance.closedTrades} closed / ${performance.openTrades} open`} />
            </div>
          </ReportSection>

          <ReportSection title="Practice Challenge" eyebrow="Simulated rules">
            {report.challengeStatus ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatChip label="Status" value={report.challengeStatus.status} tone={report.challengeStatus.status === "passed" ? "green" : report.challengeStatus.status === "failed" ? "red" : "amber"} />
                <StatChip label="Target" value={formatPracticeMoney(report.challengeStatus.profitTargetAmount)} />
                <StatChip label="Progress" value={`${report.challengeStatus.profitTargetProgress.toFixed(0)}%`} />
                <StatChip label="Breaches" value={String(report.challengeStatus.breachCodes.length)} tone={report.challengeStatus.breachCodes.length ? "red" : "green"} />
              </div>
            ) : (
                <SafeEmpty>No simulated practice challenge was enabled for this session. Challenge results appear here only for practice sessions that started with challenge rules.</SafeEmpty>
            )}
          </ReportSection>

          <ReportSection title="Strategy Summary" eyebrow="Strategy">
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-sm font-semibold text-[color:var(--label)]">{report.playbook?.name ?? "No linked strategy"}</p>
                <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  {report.playbook ? `${report.playbook.strategyType} · ${report.playbook.market}` : "Orders can still retain their Strategy selection when the session has no linked Strategy."}
                </p>
              </div>
              {report.playbookPerformance.length ? (
                <div className="grid gap-2">
                  {report.playbookPerformance.slice(0, 6).map((playbook) => (
                    <div key={playbook.playbookId} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs sm:grid-cols-[1fr_auto] sm:items-center">
                      <span className="truncate font-semibold text-[color:var(--label)]">{playbook.playbookName}</span>
                      <span className="text-[color:var(--label2)]">
                        {playbook.trades} trades · {formatPracticeMoney(playbook.netPnl)} · {formatPercent(playbook.winRate)} win · {playbook.averageR.toFixed(2)}R
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <SafeEmpty>No Strategy activity yet. Closed simulated orders linked to a Strategy will appear here.</SafeEmpty>
              )}
            </div>
          </ReportSection>

          <ReportSection title="Closed Simulated Orders" eyebrow="Trade review">
            {report.closedOrders.length ? (
              <div className="grid gap-2">
                {report.closedOrders.slice(0, 24).map((order) => <OrderRow key={order.orderId} order={order} />)}
              </div>
            ) : (
              <SafeEmpty>No closed simulated trades yet. No closed trades yet. Active sessions can still print their setup, assumptions, notes, and reflection.</SafeEmpty>
            )}
          </ReportSection>

          <ReportSection title="Best And Worst Trade" eyebrow="Highlights">
            {report.bestTrade || report.worstTrade ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {report.bestTrade ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-[color:var(--label3)]">Best</p>
                    <OrderRow order={report.bestTrade} />
                  </div>
                ) : null}
                {report.worstTrade ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-[color:var(--label3)]">Worst</p>
                    <OrderRow order={report.worstTrade} />
                  </div>
                ) : null}
              </div>
            ) : (
              <SafeEmpty>Best and worst trade will appear after at least one simulated order closes.</SafeEmpty>
            )}
          </ReportSection>

          <ReportSection title="Annotations, Drawings, And Events" eyebrow="Review notes">
            <div className="grid gap-4 xl:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-semibold text-[color:var(--label)]">Annotations</p>
                <AnnotationList annotations={report.annotations} empty="No text annotations yet. Add review notes in replay or terminal." />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[color:var(--label)]">Drawings</p>
                <AnnotationList annotations={report.drawings} empty="No drawing notes yet. Drawings are text-only practice markers." />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[color:var(--label)]">Event-linked notes</p>
                <AnnotationList annotations={report.eventLinkedNotes} empty="No event-linked notes yet. Visible static events can be linked from terminal notes." />
              </div>
            </div>
          </ReportSection>

          <ReportSection title="Reflection And Main Lesson" eyebrow="Completed review">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-sm font-semibold text-[color:var(--label)]">Main lesson</p>
                <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  {report.mainLesson?.text ?? "No main lesson has been marked yet. Mark one annotation or drawing as the main lesson during review."}
                </p>
              </div>
              <div className="rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-sm font-semibold text-[color:var(--label)]">Reflection</p>
                {report.reflection ? (
                  <div className="mt-2 grid gap-2 text-sm leading-6 text-[color:var(--label2)]">
                    <p><span className="font-semibold text-[color:var(--label)]">Went well:</span> {report.reflection.whatWentWell ?? "-"}</p>
                    <p><span className="font-semibold text-[color:var(--label)]">Went wrong:</span> {report.reflection.whatWentWrong ?? "-"}</p>
                    <p><span className="font-semibold text-[color:var(--label)]">Improve:</span> {report.reflection.improveNextTime ?? "-"}</p>
                    <p><span className="font-semibold text-[color:var(--label)]">Confidence:</span> {report.reflection.confidenceScore ?? "-"} / 5</p>
                  </div>
                ) : (
                  <SafeEmpty>No completed-session reflection has been saved yet. No reflection has been saved yet. Finish the session, then add what went well, what went wrong, and what to improve next time.</SafeEmpty>
                )}
              </div>
            </div>
          </ReportSection>

          <ReportSection title="Instructor Feedback" eyebrow="Assignment rubric">
            {report.instructorFeedback ? (
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatChip label="Overall" value={`${report.instructorFeedback.rubric.overallScore}/5`} tone="accent" />
                  <StatChip label="Setup" value={`${report.instructorFeedback.rubric.setupQuality}/5`} />
                  <StatChip label="Risk" value={`${report.instructorFeedback.rubric.riskManagement}/5`} />
                  <StatChip label="Discipline" value={`${report.instructorFeedback.rubric.executionDiscipline}/5`} />
                  <StatChip label="Review" value={`${report.instructorFeedback.rubric.reviewQuality}/5`} />
                  <StatChip label="Status" value={report.instructorFeedback.status.replace(/_/g, " ")} tone={report.instructorFeedback.status === "reviewed" ? "green" : "amber"} />
                </div>
                <div className="rounded-[8px] border border-[color:var(--line)] p-3">
                  <p className="text-sm font-semibold text-[color:var(--label)]">
                    {report.instructorFeedback.reviewerDisplayLabel}
                  </p>
                  <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                    {report.instructorFeedback.feedbackNote || "No written instructor note was added."}
                  </p>
                  {report.instructorFeedback.recommendedNextDrill ? (
                    <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
                      Recommended next drill: {report.instructorFeedback.recommendedNextDrill}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <SafeEmpty>No instructor feedback has been submitted yet. Published feedback appears here only for reviewed workspace assignments.</SafeEmpty>
            )}
          </ReportSection>

          <ReportSection title="Practice Assumptions" eyebrow="Simulation">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatChip label="Fees" value={`${report.assumptions.feeBps} bps`} />
              <StatChip label="Spread" value={`${report.assumptions.spreadBps} bps`} />
              <StatChip label="Slippage" value={`${report.assumptions.slippageBps} bps`} />
            </div>
            <p className="mt-3 break-safe text-sm leading-6 text-[color:var(--label2)]">
              {report.assumptions.safeMessage} Instrument specs and simulated costs are practice estimates and may differ by broker or venue.
            </p>
          </ReportSection>
        </div>
      ) : null}
    </StudentShell>
  );
}

export function StudentPracticeReportClient(props: StudentPracticeReportClientProps) {
  return (
    <RoleGate allowedRole="student" nextPath={`/app/practice/${props.sessionId}/report`}>
      <StudentPracticeReportBody {...props} />
    </RoleGate>
  );
}
