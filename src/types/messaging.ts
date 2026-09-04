import type { IsoDateString } from "@/types/workspace";

export type MessagingChannel = "email" | "whatsapp" | "sms";

export type MessagingProviderId = "disabled" | "contract_only" | "resend" | "twilio" | "whatsapp_cloud";

export type MessagingIntentPurpose =
  | "assignment_reminder"
  | "feedback_published"
  | "resubmission_due"
  | "course_reminder"
  | "billing_access_issue_reminder";

export type MessagingIntentStatus =
  | "blocked"
  | "dry_run_recorded"
  | "dry_run_processed"
  | "queued"
  | "cancelled"
  | "failed"
  | "sent_placeholder";

export type MessagingPreferencePurpose =
  | "practice_assignment"
  | "course"
  | "billing_access"
  | "feedback_resubmission";

export type MessagingContactReadinessStatus =
  | "contact_unavailable"
  | "contact_unverified"
  | "ready";

export type MessagingSuppressionStatus = "active" | "cleared";

export type MessagingSafetyBlockReason =
  | "student_channel_opted_out"
  | "student_purpose_opted_out"
  | "recipient_suppressed"
  | "contact_unavailable"
  | "contact_unverified"
  | "provider_disabled"
  | "dry_run_only";

export type MessagingIntentSourceType =
  | "practice_notification"
  | "course_progress"
  | "billing_ops"
  | "crm_support"
  | "manual_admin_seed";

export interface MessagingChannelReadiness {
  channel: MessagingChannel;
  enabled: boolean;
  statusLabel: string;
}

export interface MessagingProviderReadiness {
  enabled: boolean;
  dryRun: boolean;
  provider: MessagingProviderId;
  providerLabel: string;
  vaultReady: boolean;
  externalSendAvailable: boolean;
  failClosedReason: string;
  safeMessage: string;
  channels: MessagingChannelReadiness[];
}

export interface MessageIntentRecord {
  messageIntentId: string;
  workspaceId: string;
  maskedStudentRef: string;
  channel: MessagingChannel;
  purpose: MessagingIntentPurpose;
  status: MessagingIntentStatus;
  dryRun: boolean;
  safeReason: string;
  channelPreferenceEnabled?: boolean;
  purposePreferenceEnabled?: boolean;
  recipientSuppressed?: boolean;
  contactStatus?: MessagingContactReadinessStatus;
  sourceType?: MessagingIntentSourceType;
  sourceSafeRef?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface MessagingDeliveryAttemptRecord {
  deliveryAttemptId: string;
  maskedWorkspaceRef: string;
  maskedStudentRef: string;
  messageIntentRef: string;
  channel: MessagingChannel;
  provider: MessagingProviderId;
  purpose: MessagingIntentPurpose;
  status: MessagingIntentStatus;
  dryRun: boolean;
  safeReason: string;
  sourceType?: MessagingIntentSourceType;
  sourceSafeRef?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface MessagingDeliveryWorkerRunResponse {
  ok: true;
  dryRun: boolean;
  provider: MessagingProviderId;
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  attempts: MessagingDeliveryAttemptRecord[];
  safeMessage: string;
  warnings: string[];
}

export interface MessageIntentSeedInput {
  workspaceId: string;
  studentId: string;
  channel: MessagingChannel;
  purpose: MessagingIntentPurpose;
  safeReason: string;
  sourceType?: MessagingIntentSourceType;
  sourceRef?: string;
}

export interface StudentMessagingPreferences {
  channels: Record<MessagingChannel, boolean>;
  purposes: Record<MessagingPreferencePurpose, boolean>;
  updatedAt: IsoDateString | null;
}

export interface MessagingPreferenceSummaryRecord {
  preferenceSummaryId: string;
  workspaceId: string;
  maskedStudentRef: string;
  channels: Record<MessagingChannel, boolean>;
  purposes: Record<MessagingPreferencePurpose, boolean>;
  contactReadiness: Record<MessagingChannel, MessagingContactReadinessStatus>;
  updatedAt: IsoDateString;
}

export interface StudentMessagingPreferencesResponse {
  preferences: StudentMessagingPreferences;
  contactReadiness: Record<MessagingChannel, MessagingContactReadinessStatus>;
  safeMessage: string;
  warnings: string[];
}

export interface MessagingSuppressionRecord {
  suppressionId: string;
  workspaceId?: string;
  maskedStudentRef: string;
  channel?: MessagingChannel;
  status: MessagingSuppressionStatus;
  safeReason: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface AdminMessagingOverviewResponse {
  readiness: MessagingProviderReadiness;
  summary: {
    totalIntentCount: number;
    pendingIntentCount: number;
    blockedIntentCount: number;
    dryRunIntentCount: number;
    dryRunProcessedIntentCount: number;
    failedIntentCount: number;
    sentPlaceholderIntentCount: number;
    emailIntentCount: number;
    whatsappIntentCount: number;
    smsIntentCount: number;
    latestDeliveryAttemptCount: number;
    dryRunProcessedAttemptCount: number;
    failedDeliveryAttemptCount: number;
    sentPlaceholderAttemptCount: number;
    sampledIntentCount: number;
    preferenceSummaryCount: number;
    suppressedRecipientCount: number;
    contactUnavailableCount: number;
  };
  latestIntents: MessageIntentRecord[];
  latestDeliveryAttempts: MessagingDeliveryAttemptRecord[];
  latestSuppressions: MessagingSuppressionRecord[];
  warnings: string[];
}
