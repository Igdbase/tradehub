import "server-only";

import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import {
  getMessagingProviderReadiness,
  isMessagingChannelEnabled
} from "@/lib/messaging/messaging-provider-contract";
import { deliverMessageWithPlaceholderAdapter } from "@/lib/messaging/messaging-provider-adapters";
import {
  createMessagingDeliveryAttempt,
  evaluateMessagingIntentSafety,
  listMessageIntentsForDryRunWorker,
  updateMessageIntentAfterDeliveryAttempt
} from "@/lib/messaging/message-intent-repository";
import type {
  MessagingDeliveryAttemptRecord,
  MessagingDeliveryWorkerRunResponse,
  MessagingIntentStatus
} from "@/types/messaging";

const MESSAGE_WORKER_MAX_INTENTS_PER_RUN = 10;

function safeLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MESSAGE_WORKER_MAX_INTENTS_PER_RUN;
  }

  return Math.max(1, Math.min(MESSAGE_WORKER_MAX_INTENTS_PER_RUN, Math.floor(value)));
}

export async function runMessagingDryRunDeliveryWorker(
  actor: VerifiedSuperAdmin,
  payload?: unknown
): Promise<MessagingDeliveryWorkerRunResponse> {
  void actor;

  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const limit = safeLimit(record.limit);
  const readiness = getMessagingProviderReadiness();
  const warnings = [
    "Stage 23C worker is dry-run only and never calls email, SMS, or WhatsApp providers."
  ];
  const attempts: MessagingDeliveryAttemptRecord[] = [];

  if (!readiness.enabled || readiness.provider === "disabled") {
    return {
      ok: true,
      dryRun: readiness.dryRun,
      provider: readiness.provider,
      processedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      attempts,
      safeMessage: `Messaging worker skipped because ${readiness.failClosedReason}.`,
      warnings
    };
  }

  if (!readiness.dryRun) {
    throw new AdminApiError(
      409,
      "messaging_worker_real_send_blocked",
      "Stage 23C can only run when MESSAGING_DRY_RUN=true."
    );
  }

  const candidates = await listMessageIntentsForDryRunWorker(limit);
  let skippedCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    const safety = await evaluateMessagingIntentSafety({
      workspaceId: candidate.intent.workspaceId,
      maskedStudentRef: candidate.intent.maskedStudentRef,
      channel: candidate.intent.channel,
      purpose: candidate.intent.purpose
    });

    const channelDisabledReason = "channel_disabled";

    if (!isMessagingChannelEnabled(candidate.intent.channel) || safety.status === "blocked") {
      const blockedReason = safety.status === "blocked" ? safety.safeReason : channelDisabledReason;
      skippedCount += 1;
      const attempt = await createMessagingDeliveryAttempt({
        intent: candidate.intent,
        provider: readiness.provider,
        status: "blocked",
        dryRun: true,
        safeReason: blockedReason
      });
      attempts.push(attempt);
      await updateMessageIntentAfterDeliveryAttempt({
        intentRef: candidate.ref,
        status: "blocked",
        safeReason: blockedReason
      });
      continue;
    }

    try {
      const result = await deliverMessageWithPlaceholderAdapter({
        channel: candidate.intent.channel,
        provider: readiness.provider,
        purpose: candidate.intent.purpose,
        dryRun: readiness.dryRun,
        safeReason: candidate.intent.safeReason
      });
      const status: MessagingIntentStatus = result.ok ? "dry_run_processed" : result.status;
      const attempt = await createMessagingDeliveryAttempt({
        intent: candidate.intent,
        provider: readiness.provider,
        status,
        dryRun: true,
        safeReason: result.safeReason
      });

      attempts.push(attempt);
      await updateMessageIntentAfterDeliveryAttempt({
        intentRef: candidate.ref,
        status,
        safeReason: result.safeReason
      });

      if (!result.ok) {
        failedCount += 1;
      }
    } catch {
      failedCount += 1;
      const attempt = await createMessagingDeliveryAttempt({
        intent: candidate.intent,
        provider: readiness.provider,
        status: "failed",
        dryRun: true,
        safeReason: "messaging_placeholder_failed_closed"
      });
      attempts.push(attempt);
      await updateMessageIntentAfterDeliveryAttempt({
        intentRef: candidate.ref,
        status: "failed",
        safeReason: "messaging_placeholder_failed_closed"
      });
    }
  }

  return {
    ok: true,
    dryRun: readiness.dryRun,
    provider: readiness.provider,
    processedCount: attempts.filter((attempt) => attempt.status === "dry_run_processed").length,
    skippedCount,
    failedCount,
    attempts,
    safeMessage:
      candidates.length > 0
        ? "Messaging dry-run worker processed safe placeholder attempts only."
        : "No pending dry-run eligible message intents were found.",
    warnings
  };
}
