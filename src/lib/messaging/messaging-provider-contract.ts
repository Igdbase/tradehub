import "server-only";

import type {
  MessagingChannel,
  MessagingIntentPurpose,
  MessagingProviderId,
  MessagingProviderReadiness
} from "@/types/messaging";

export const MESSAGING_CHANNELS: MessagingChannel[] = ["email", "whatsapp", "sms"];

export const MESSAGING_INTENT_PURPOSES: MessagingIntentPurpose[] = [
  "assignment_reminder",
  "feedback_published",
  "resubmission_due",
  "course_reminder",
  "billing_access_issue_reminder"
];

const PROVIDER_LABELS: Record<MessagingProviderId, string> = {
  disabled: "Disabled",
  contract_only: "Contract only",
  resend: "Resend email",
  twilio: "Twilio messaging",
  whatsapp_cloud: "WhatsApp Cloud"
};

function readBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();

  if (!raw) {
    return fallback;
  }

  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function readProviderEnv(): MessagingProviderId {
  const raw = process.env.MESSAGING_PROVIDER?.trim().toLowerCase();

  if (
    raw === "contract_only" ||
    raw === "resend" ||
    raw === "twilio" ||
    raw === "whatsapp_cloud"
  ) {
    return raw;
  }

  return "disabled";
}

function firstFailClosedReason({
  enabled,
  dryRun,
  provider,
  vaultReady,
  vaultConfigured,
  anyChannelEnabled
}: {
  enabled: boolean;
  dryRun: boolean;
  provider: MessagingProviderId;
  vaultReady: boolean;
  vaultConfigured: boolean;
  anyChannelEnabled: boolean;
}) {
  if (!enabled) {
    return "messaging_disabled";
  }

  if (provider === "disabled") {
    return "provider_disabled";
  }

  if (dryRun) {
    return "dry_run_only";
  }

  if (!vaultReady && !vaultConfigured) {
    return "vault_config_missing";
  }

  if (!vaultReady) {
    return "vault_not_ready";
  }

  if (!anyChannelEnabled) {
    return "channels_disabled";
  }

  return "stage23b_send_unavailable";
}

export function getMessagingProviderReadiness(): MessagingProviderReadiness {
  const enabled = readBooleanEnv("MESSAGING_ENABLED", false);
  const dryRun = readBooleanEnv("MESSAGING_DRY_RUN", true);
  const provider = readProviderEnv();
  const vaultFlagReady = readBooleanEnv("MESSAGING_VAULT_READY", false);
  const vaultConfigured = Boolean(
    process.env.MESSAGING_SECRET_MANAGER_PROJECT_ID?.trim() &&
      process.env.MESSAGING_SECRET_NAME?.trim()
  );
  const vaultReady = vaultFlagReady && vaultConfigured;
  const channels = [
    {
      channel: "email" as const,
      enabled: readBooleanEnv("MESSAGING_EMAIL_ENABLED", false),
      statusLabel: readBooleanEnv("MESSAGING_EMAIL_ENABLED", false) ? "enabled" : "disabled"
    },
    {
      channel: "whatsapp" as const,
      enabled: readBooleanEnv("MESSAGING_WHATSAPP_ENABLED", false),
      statusLabel: readBooleanEnv("MESSAGING_WHATSAPP_ENABLED", false) ? "enabled" : "disabled"
    },
    {
      channel: "sms" as const,
      enabled: readBooleanEnv("MESSAGING_SMS_ENABLED", false),
      statusLabel: readBooleanEnv("MESSAGING_SMS_ENABLED", false) ? "enabled" : "disabled"
    }
  ];
  const failClosedReason = firstFailClosedReason({
    enabled,
    dryRun,
    provider,
    vaultReady,
    vaultConfigured,
    anyChannelEnabled: channels.some((channel) => channel.enabled)
  });

  return {
    enabled,
    dryRun,
    provider,
    providerLabel: PROVIDER_LABELS[provider],
    vaultReady,
    externalSendAvailable: false,
    failClosedReason,
    safeMessage:
      "Stage 23B supports server-only dry-run delivery attempts. External email, WhatsApp, and SMS sends remain disabled. Stage 23C adds consent-aware preference and suppression safety gates.",
    channels
  };
}

export function isMessagingChannelEnabled(channel: MessagingChannel) {
  return getMessagingProviderReadiness().channels.some((entry) => entry.channel === channel && entry.enabled);
}

export function assertExternalMessagingSendUnavailable(): never {
  throw new Error("external_messaging_send_unavailable_stage23b");
}
