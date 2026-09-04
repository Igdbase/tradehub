import "server-only";

import { assertExternalMessagingSendUnavailable } from "@/lib/messaging/messaging-provider-contract";
import type {
  MessagingChannel,
  MessagingIntentPurpose,
  MessagingIntentStatus,
  MessagingProviderId
} from "@/types/messaging";

export interface MessagingProviderDryRunInput {
  channel: MessagingChannel;
  provider: MessagingProviderId;
  purpose: MessagingIntentPurpose;
  dryRun: boolean;
  safeReason: string;
}

export interface MessagingProviderDryRunResult {
  ok: boolean;
  status: MessagingIntentStatus;
  provider: MessagingProviderId;
  safeReason: string;
}

function dryRunResult(input: MessagingProviderDryRunInput): MessagingProviderDryRunResult {
  if (!input.dryRun) {
    return {
      ok: false,
      status: "failed",
      provider: input.provider,
      safeReason: "external_messaging_send_unavailable_stage23b"
    };
  }

  return {
    ok: true,
    status: "dry_run_processed",
    provider: input.provider,
    safeReason: `dry_run_${input.channel}_placeholder_processed`
  };
}

export async function deliverEmailPlaceholder(input: MessagingProviderDryRunInput) {
  return dryRunResult({ ...input, channel: "email" });
}

export async function deliverWhatsAppPlaceholder(input: MessagingProviderDryRunInput) {
  return dryRunResult({ ...input, channel: "whatsapp" });
}

export async function deliverSmsPlaceholder(input: MessagingProviderDryRunInput) {
  return dryRunResult({ ...input, channel: "sms" });
}

export async function deliverMessageWithPlaceholderAdapter(input: MessagingProviderDryRunInput) {
  if (!input.dryRun) {
    assertExternalMessagingSendUnavailable();
  }

  if (input.channel === "email") {
    return deliverEmailPlaceholder(input);
  }

  if (input.channel === "whatsapp") {
    return deliverWhatsAppPlaceholder(input);
  }

  return deliverSmsPlaceholder(input);
}
