"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  AdminMessagingOverviewResponse,
  MessagingDeliveryWorkerRunResponse,
  MessagingIntentPurpose
} from "@/types/messaging";

function purposeLabel(purpose: MessagingIntentPurpose) {
  return purpose.replace(/_/g, " ");
}

export function MessagingReadinessPanel({
  overview,
  errorMessage,
  workerResult,
  runningWorker,
  onRunWorker
}: {
  overview: AdminMessagingOverviewResponse | null;
  errorMessage?: string | null;
  workerResult?: MessagingDeliveryWorkerRunResponse | null;
  runningWorker?: boolean;
  onRunWorker?: () => void;
}) {
  const readiness = overview?.readiness;
  const badgeTone = readiness?.externalSendAvailable ? "green" : "amber";

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">
            Stage 23C messaging readiness / Stage 23B messaging readiness
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            External reminders contract
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Super Admin-only preview for future email, WhatsApp, and SMS reminders. Stage 23B messaging
            readiness established dry-run delivery attempts against placeholder adapters only. Stage 23C
            keeps delivery dry-run only while enforcing student preferences, suppression safety, and contact
            readiness fail-closed checks; it does not expose contact details, message bodies, provider payloads,
            tokens, vault refs, payment refs, private notes, hidden candles, or AutoCopy internals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={badgeTone}>{readiness?.externalSendAvailable ? "Send-ready" : "Send disabled"}</Badge>
          <Button
            onClick={onRunWorker}
            variant="secondary"
            size="sm"
            disabled={!overview || runningWorker}
          >
            {runningWorker ? "Running..." : "Run dry-run worker"}
          </Button>
        </div>
      </div>

      {overview && readiness ? (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            <StatChip label="Provider" value={readiness.providerLabel} detail={readiness.failClosedReason} />
            <StatChip label="Dry-run" value={readiness.dryRun ? "On" : "Off"} tone={readiness.dryRun ? "amber" : "green"} />
            <StatChip label="Vault" value={readiness.vaultReady ? "Ready" : "Blocked"} tone={readiness.vaultReady ? "green" : "amber"} />
            <StatChip label="Blocked" value={String(overview.summary.blockedIntentCount)} tone={overview.summary.blockedIntentCount > 0 ? "amber" : "green"} />
            <StatChip label="Dry-run intents" value={String(overview.summary.dryRunIntentCount)} tone="accent" />
            <StatChip label="Processed" value={String(overview.summary.dryRunProcessedIntentCount)} tone="green" />
            <StatChip label="Attempts" value={String(overview.summary.latestDeliveryAttemptCount)} tone="accent" />
            <StatChip label="Preference summaries" value={String(overview.summary.preferenceSummaryCount)} tone="accent" />
            <StatChip label="Suppressions" value={String(overview.summary.suppressedRecipientCount)} tone={overview.summary.suppressedRecipientCount > 0 ? "amber" : "green"} />
            <StatChip label="No contact route" value={String(overview.summary.contactUnavailableCount)} tone="amber" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {readiness.channels.map((channel) => (
              <div key={channel.channel} className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-4">
                <p className="eyebrow !text-[color:var(--label3)]">{channel.channel}</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">
                  {channel.statusLabel}
                </p>
              </div>
            ))}
          </div>

          {overview.latestIntents.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Latest safe intents</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {overview.latestIntents.slice(0, 6).map((intent) => (
                  <div
                    key={intent.messageIntentId}
                    className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                          {purposeLabel(intent.purpose)}
                        </p>
                        <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                          {intent.maskedStudentRef} / {intent.channel}
                        </p>
                      </div>
                      <Badge tone={intent.status === "blocked" ? "amber" : "green"}>{intent.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                      {intent.safeReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[18px] border border-dashed border-[color:var(--glass-border)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              No dry-run message intents exist yet. Future assignment, feedback, course, and billing
              reminders will enter this support-safe lane before any provider adapter is enabled.
            </p>
          )}

          {overview.latestDeliveryAttempts.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Latest safe delivery attempts</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {overview.latestDeliveryAttempts.slice(0, 6).map((attempt) => (
                  <div
                    key={attempt.deliveryAttemptId}
                    className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                          {purposeLabel(attempt.purpose)}
                        </p>
                        <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                          {attempt.maskedStudentRef} / {attempt.channel} / {attempt.provider}
                        </p>
                      </div>
                      <Badge tone={attempt.status === "failed" || attempt.status === "blocked" ? "amber" : "green"}>
                        {attempt.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                      {attempt.safeReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[18px] border border-dashed border-[color:var(--glass-border)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              No delivery attempts exist yet. Stage 23C worker attempts are dry-run placeholders only.
            </p>
          )}

          {overview.latestSuppressions.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--label)]">Latest safe suppressions</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {overview.latestSuppressions.slice(0, 4).map((suppression) => (
                  <div
                    key={suppression.suppressionId}
                    className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                          {suppression.maskedStudentRef}
                        </p>
                        <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                          {suppression.channel ?? "all channels"}
                        </p>
                      </div>
                      <Badge tone={suppression.status === "active" ? "amber" : "green"}>
                        {suppression.status}
                      </Badge>
                    </div>
                    <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                      {suppression.safeReason || "Suppression reason is support-safe only."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[18px] border border-dashed border-[color:var(--glass-border)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              No active suppression records are visible in this bounded preview. Suppressions use masked
              student refs only.
            </p>
          )}

          {workerResult ? (
            <p className="break-safe rounded-[18px] border border-[color:color-mix(in_srgb,var(--green)_24%,transparent)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              {workerResult.safeMessage} Processed {workerResult.processedCount}, skipped {workerResult.skippedCount}, failed {workerResult.failedCount}.
            </p>
          ) : null}

          {overview.warnings.map((warning) => (
            <p key={warning} className="break-safe rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              {warning}
            </p>
          ))}
        </>
      ) : (
        <p className="break-safe rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-4 text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "Messaging readiness is loading. External sending remains disabled."}
        </p>
      )}
    </GlassCard>
  );
}
