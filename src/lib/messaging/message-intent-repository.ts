import "server-only";

import crypto from "node:crypto";
import { FieldValue, type DocumentData, type DocumentReference, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  MESSAGING_CHANNELS,
  MESSAGING_INTENT_PURPOSES,
  getMessagingProviderReadiness,
  isMessagingChannelEnabled
} from "@/lib/messaging/messaging-provider-contract";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type { StudentPracticeNotificationSummary } from "@/types/practice";
import type {
  AdminMessagingOverviewResponse,
  MessageIntentRecord,
  MessageIntentSeedInput,
  MessagingDeliveryAttemptRecord,
  MessagingChannel,
  MessagingContactReadinessStatus,
  MessagingIntentPurpose,
  MessagingIntentSourceType,
  MessagingIntentStatus,
  MessagingPreferencePurpose,
  MessagingPreferenceSummaryRecord,
  MessagingSuppressionRecord,
  MessagingSuppressionStatus,
  StudentMessagingPreferences,
  StudentMessagingPreferencesResponse
} from "@/types/messaging";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";

const MESSAGE_INTENT_COLLECTION_ID = "message_intents";
const MESSAGE_DELIVERY_ATTEMPT_COLLECTION_ID = "messaging_delivery_attempts";
const MESSAGING_PREFERENCE_COLLECTION_ID = "messaging_preferences";
const MESSAGING_PREFERENCE_SUMMARY_COLLECTION_ID = "messaging_preference_summaries";
const MESSAGING_SUPPRESSION_COLLECTION_ID = "messaging_suppressions";
const MESSAGE_INTENT_OVERVIEW_LIMIT = 25;
const MESSAGE_WORKER_BATCH_LIMIT = 10;
const SAFE_REASON_MAX_LENGTH = 180;
const PREFERENCE_DOCUMENT_ID = "current";
const DEFAULT_CONTACT_READINESS: Record<MessagingChannel, MessagingContactReadinessStatus> = {
  email: "contact_unavailable",
  whatsapp: "contact_unavailable",
  sms: "contact_unavailable"
};
const DEFAULT_MESSAGING_PREFERENCES: StudentMessagingPreferences = {
  channels: {
    email: false,
    whatsapp: false,
    sms: false
  },
  purposes: {
    practice_assignment: false,
    course: false,
    billing_access: false,
    feedback_resubmission: false
  },
  updatedAt: null
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asProvider(value: unknown) {
  const provider = asString(value);

  if (
    provider === "disabled" ||
    provider === "contract_only" ||
    provider === "resend" ||
    provider === "twilio" ||
    provider === "whatsapp_cloud"
  ) {
    return provider;
  }

  return "disabled";
}

function asContactReadiness(value: unknown): MessagingContactReadinessStatus {
  const status = asString(value);

  if (status === "contact_unavailable" || status === "contact_unverified" || status === "ready") {
    return status;
  }

  return "contact_unavailable";
}

function asSuppressionStatus(value: unknown): MessagingSuppressionStatus {
  return asString(value) === "cleared" ? "cleared" : "active";
}

function safeDate(value: unknown) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  return new Date(0).toISOString();
}

function sanitizeText(value: string, maxLength = SAFE_REASON_MAX_LENGTH) {
  return value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};

    Object.entries(value).forEach(([key, entry]) => {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    });

    return cleaned as T;
  }

  return value;
}

function preferencePurposeForIntentPurpose(purpose: MessagingIntentPurpose): MessagingPreferencePurpose {
  if (purpose === "course_reminder") {
    return "course";
  }

  if (purpose === "billing_access_issue_reminder") {
    return "billing_access";
  }

  if (purpose === "feedback_published" || purpose === "resubmission_due") {
    return "feedback_resubmission";
  }

  return "practice_assignment";
}

function normalizeMessagingPreferences(data?: DocumentData | null): StudentMessagingPreferences {
  const channels = data && typeof data.channels === "object" && data.channels !== null
    ? data.channels as Record<string, unknown>
    : {};
  const purposes = data && typeof data.purposes === "object" && data.purposes !== null
    ? data.purposes as Record<string, unknown>
    : {};

  return {
    channels: {
      email: asBoolean(channels.email, DEFAULT_MESSAGING_PREFERENCES.channels.email),
      whatsapp: asBoolean(channels.whatsapp, DEFAULT_MESSAGING_PREFERENCES.channels.whatsapp),
      sms: asBoolean(channels.sms, DEFAULT_MESSAGING_PREFERENCES.channels.sms)
    },
    purposes: {
      practice_assignment: asBoolean(
        purposes.practice_assignment,
        DEFAULT_MESSAGING_PREFERENCES.purposes.practice_assignment
      ),
      course: asBoolean(purposes.course, DEFAULT_MESSAGING_PREFERENCES.purposes.course),
      billing_access: asBoolean(
        purposes.billing_access,
        DEFAULT_MESSAGING_PREFERENCES.purposes.billing_access
      ),
      feedback_resubmission: asBoolean(
        purposes.feedback_resubmission,
        DEFAULT_MESSAGING_PREFERENCES.purposes.feedback_resubmission
      )
    },
    updatedAt: data ? safeDate(data.updatedAt) : null
  };
}

function preferenceSummaryFromData(snapshotId: string, data: DocumentData): MessagingPreferenceSummaryRecord {
  const preferences = normalizeMessagingPreferences(data);
  const contactReadiness =
    data.contactReadiness && typeof data.contactReadiness === "object"
      ? data.contactReadiness as Record<string, unknown>
      : {};

  return {
    preferenceSummaryId: snapshotId,
    workspaceId: asString(data.workspaceId),
    maskedStudentRef: asString(data.maskedStudentRef),
    channels: preferences.channels,
    purposes: preferences.purposes,
    contactReadiness: {
      email: asContactReadiness(contactReadiness.email),
      whatsapp: asContactReadiness(contactReadiness.whatsapp),
      sms: asContactReadiness(contactReadiness.sms)
    },
    updatedAt: safeDate(data.updatedAt)
  };
}

export function createMessagingSafeRef(value: string, prefix: string) {
  const digest = crypto.createHash("sha256").update(value.trim()).digest("hex").slice(0, 12);

  return `${prefix}_${digest}`;
}

function assertSupportedChannel(channel: MessagingChannel) {
  if (!MESSAGING_CHANNELS.includes(channel)) {
    throw new AdminApiError(400, "unsupported_messaging_channel", "That messaging channel is not supported.");
  }
}

function assertSupportedPurpose(purpose: MessagingIntentPurpose) {
  if (!MESSAGING_INTENT_PURPOSES.includes(purpose)) {
    throw new AdminApiError(400, "unsupported_messaging_purpose", "That messaging purpose is not supported.");
  }
}

function intentStatusForChannel(channel: MessagingChannel): MessagingIntentStatus {
  const readiness = getMessagingProviderReadiness();

  if (!readiness.enabled || readiness.provider === "disabled" || !isMessagingChannelEnabled(channel)) {
    return "blocked";
  }

  return "dry_run_recorded";
}

function providerSafeReasonForChannel(channel: MessagingChannel) {
  const readiness = getMessagingProviderReadiness();

  if (!readiness.enabled || readiness.provider === "disabled" || !isMessagingChannelEnabled(channel)) {
    return "provider_disabled";
  }

  if (readiness.dryRun) {
    return "dry_run_only";
  }

  return readiness.failClosedReason || "provider_disabled";
}

function buildPreferenceResponse(
  preferences: StudentMessagingPreferences
): StudentMessagingPreferencesResponse {
  return {
    preferences,
    contactReadiness: DEFAULT_CONTACT_READINESS,
    safeMessage:
      "External email, WhatsApp, and SMS reminders are not enabled yet. Stage 23C stores consent preferences for future dry-run eligibility only.",
    warnings: [
      "TradeHub does not send external messages in this stage.",
      "No phone numbers, email addresses, message bodies, provider payloads, tokens, or vault refs are returned here."
    ]
  };
}

function mapSuppression(snapshot: QueryDocumentSnapshot<DocumentData>): MessagingSuppressionRecord {
  const data = snapshot.data();
  const channel = asString(data.channel) as MessagingChannel;

  return {
    suppressionId: snapshot.id,
    workspaceId: asString(data.workspaceId) || undefined,
    maskedStudentRef: asString(data.maskedStudentRef),
    channel: MESSAGING_CHANNELS.includes(channel) ? channel : undefined,
    status: asSuppressionStatus(data.status),
    safeReason: sanitizeText(asString(data.safeReason)),
    createdAt: safeDate(data.createdAt),
    updatedAt: safeDate(data.updatedAt)
  };
}

async function getPreferenceSummaryForMaskedStudent(input: {
  workspaceId: string;
  maskedStudentRef: string;
}): Promise<MessagingPreferenceSummaryRecord> {
  const { db } = getFirebaseAdminClients();
  const summarySnapshot = await db
    .doc(`workspaces/${input.workspaceId}/${MESSAGING_PREFERENCE_SUMMARY_COLLECTION_ID}/${input.maskedStudentRef}`)
    .get();

  if (summarySnapshot.exists) {
    return preferenceSummaryFromData(summarySnapshot.id, summarySnapshot.data() ?? {});
  }

  return {
    preferenceSummaryId: input.maskedStudentRef,
    workspaceId: input.workspaceId,
    maskedStudentRef: input.maskedStudentRef,
    channels: DEFAULT_MESSAGING_PREFERENCES.channels,
    purposes: DEFAULT_MESSAGING_PREFERENCES.purposes,
    contactReadiness: DEFAULT_CONTACT_READINESS,
    updatedAt: new Date(0).toISOString()
  };
}

async function listActiveSuppressionsForMaskedStudent(input: {
  workspaceId: string;
  maskedStudentRef: string;
  channel: MessagingChannel;
}) {
  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, globalSnapshot] = await Promise.all([
    db
      .collection(`workspaces/${input.workspaceId}/${MESSAGING_SUPPRESSION_COLLECTION_ID}`)
      .where("maskedStudentRef", "==", input.maskedStudentRef)
      .limit(20)
      .get(),
    db
      .collection(MESSAGING_SUPPRESSION_COLLECTION_ID)
      .where("maskedStudentRef", "==", input.maskedStudentRef)
      .limit(20)
      .get()
  ]);

  return [...workspaceSnapshot.docs, ...globalSnapshot.docs]
    .map(mapSuppression)
    .filter((suppression) => (
      suppression.status === "active" &&
      (!suppression.channel || suppression.channel === input.channel)
    ));
}

export async function evaluateMessagingIntentSafety(input: {
  workspaceId: string;
  maskedStudentRef: string;
  channel: MessagingChannel;
  purpose: MessagingIntentPurpose;
}) {
  const providerStatus = intentStatusForChannel(input.channel);
  const providerSafeReason = providerSafeReasonForChannel(input.channel);
  const preferencePurpose = preferencePurposeForIntentPurpose(input.purpose);
  const [summary, suppressions] = await Promise.all([
    getPreferenceSummaryForMaskedStudent({
      workspaceId: input.workspaceId,
      maskedStudentRef: input.maskedStudentRef
    }),
    listActiveSuppressionsForMaskedStudent({
      workspaceId: input.workspaceId,
      maskedStudentRef: input.maskedStudentRef,
      channel: input.channel
    })
  ]);
  const channelPreferenceEnabled = Boolean(summary.channels[input.channel]);
  const purposePreferenceEnabled = Boolean(summary.purposes[preferencePurpose]);
  const recipientSuppressed = suppressions.length > 0;
  const contactStatus = summary.contactReadiness[input.channel] ?? "contact_unavailable";
  let safeReason = "eligible_for_dry_run";
  let status: MessagingIntentStatus = providerStatus;

  if (providerStatus === "blocked") {
    safeReason = providerSafeReason;
  } else if (!channelPreferenceEnabled) {
    status = "blocked";
    safeReason = "student_channel_opted_out";
  } else if (!purposePreferenceEnabled) {
    status = "blocked";
    safeReason = "student_purpose_opted_out";
  } else if (recipientSuppressed) {
    status = "blocked";
    safeReason = "recipient_suppressed";
  } else if (contactStatus === "contact_unavailable") {
    status = "blocked";
    safeReason = "contact_unavailable";
  } else if (contactStatus === "contact_unverified") {
    status = "blocked";
    safeReason = "contact_unverified";
  } else if (providerSafeReason === "dry_run_only") {
    safeReason = "dry_run_only";
  }

  return {
    status,
    safeReason,
    channelPreferenceEnabled,
    purposePreferenceEnabled,
    recipientSuppressed,
    contactStatus
  };
}

function purposeForPracticeNotification(
  kind: StudentPracticeNotificationSummary["kind"]
): MessagingIntentPurpose {
  if (kind === "feedback_published") {
    return "feedback_published";
  }

  if (kind === "resubmission_requested" || kind === "resubmission_due_soon" || kind === "resubmission_overdue") {
    return "resubmission_due";
  }

  return "assignment_reminder";
}

function mapMessageIntent(snapshot: QueryDocumentSnapshot<DocumentData>): MessageIntentRecord {
  const data = snapshot.data();
  const channel = asString(data.channel) as MessagingChannel;
  const purpose = asString(data.purpose) as MessagingIntentPurpose;
  const status = asString(data.status) as MessagingIntentStatus;
  const sourceType = asString(data.sourceType) as MessagingIntentSourceType;

  return {
    messageIntentId: snapshot.id,
    workspaceId: asString(data.workspaceId),
    maskedStudentRef: asString(data.maskedStudentRef),
    channel: MESSAGING_CHANNELS.includes(channel) ? channel : "email",
    purpose: MESSAGING_INTENT_PURPOSES.includes(purpose) ? purpose : "assignment_reminder",
    status: ["blocked", "dry_run_recorded", "dry_run_processed", "queued", "cancelled", "failed", "sent_placeholder"].includes(status)
      ? status
      : "blocked",
    dryRun: asBoolean(data.dryRun, true),
    safeReason: sanitizeText(asString(data.safeReason)),
    channelPreferenceEnabled: typeof data.channelPreferenceEnabled === "boolean" ? data.channelPreferenceEnabled : undefined,
    purposePreferenceEnabled: typeof data.purposePreferenceEnabled === "boolean" ? data.purposePreferenceEnabled : undefined,
    recipientSuppressed: typeof data.recipientSuppressed === "boolean" ? data.recipientSuppressed : undefined,
    contactStatus: asContactReadiness(data.contactStatus),
    sourceType: sourceType || undefined,
    sourceSafeRef: asString(data.sourceSafeRef) || undefined,
    createdAt: safeDate(data.createdAt),
    updatedAt: safeDate(data.updatedAt)
  };
}

function mapDeliveryAttempt(snapshot: QueryDocumentSnapshot<DocumentData>): MessagingDeliveryAttemptRecord {
  const data = snapshot.data();
  const channel = asString(data.channel) as MessagingChannel;
  const purpose = asString(data.purpose) as MessagingIntentPurpose;
  const status = asString(data.status) as MessagingIntentStatus;
  const sourceType = asString(data.sourceType) as MessagingIntentSourceType;

  return {
    deliveryAttemptId: snapshot.id,
    maskedWorkspaceRef: asString(data.maskedWorkspaceRef),
    maskedStudentRef: asString(data.maskedStudentRef),
    messageIntentRef: asString(data.messageIntentRef),
    channel: MESSAGING_CHANNELS.includes(channel) ? channel : "email",
    provider: asProvider(data.provider),
    purpose: MESSAGING_INTENT_PURPOSES.includes(purpose) ? purpose : "assignment_reminder",
    status: ["blocked", "dry_run_recorded", "dry_run_processed", "queued", "cancelled", "failed", "sent_placeholder"].includes(status)
      ? status
      : "blocked",
    dryRun: asBoolean(data.dryRun, true),
    safeReason: sanitizeText(asString(data.safeReason)),
    sourceType: sourceType || undefined,
    sourceSafeRef: asString(data.sourceSafeRef) || undefined,
    createdAt: safeDate(data.createdAt),
    updatedAt: safeDate(data.updatedAt)
  };
}

export async function createDryRunMessageIntentFromReminderState(input: MessageIntentSeedInput) {
  assertSupportedChannel(input.channel);
  assertSupportedPurpose(input.purpose);

  const workspaceId = sanitizeText(input.workspaceId, 96);
  const studentId = sanitizeText(input.studentId, 96);
  const safeReason = sanitizeText(input.safeReason);

  if (!workspaceId || !studentId || !safeReason) {
    throw new AdminApiError(400, "invalid_messaging_intent", "Message intent metadata is incomplete.");
  }

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const maskedStudentRef = createMessagingSafeRef(studentId, "student");
  // Stage 23A used the simple reason expression `status === "blocked" ? readiness.failClosedReason : safeReason`;
  // Stage 23C keeps the same no-send boundary and replaces it with consent/suppression/contact safety.
  const safety = await evaluateMessagingIntentSafety({
    workspaceId,
    maskedStudentRef,
    channel: input.channel,
    purpose: input.purpose
  });
  const intentRef = db.collection(`workspaces/${workspaceId}/${MESSAGE_INTENT_COLLECTION_ID}`).doc();
  const intent: MessageIntentRecord = stripUndefined({
    messageIntentId: intentRef.id,
    workspaceId,
    maskedStudentRef,
    channel: input.channel,
    purpose: input.purpose,
    status: safety.status,
    dryRun: true,
    safeReason: safety.status === "blocked" ? safety.safeReason : safeReason,
    channelPreferenceEnabled: safety.channelPreferenceEnabled,
    purposePreferenceEnabled: safety.purposePreferenceEnabled,
    recipientSuppressed: safety.recipientSuppressed,
    contactStatus: safety.contactStatus,
    sourceType: input.sourceType,
    sourceSafeRef: input.sourceRef ? createMessagingSafeRef(input.sourceRef, "source") : undefined,
    createdAt: now,
    updatedAt: now
  });

  await intentRef.set({
    ...intent,
    serverCreatedAt: FieldValue.serverTimestamp(),
    serverUpdatedAt: FieldValue.serverTimestamp()
  });

  return intent;
}

export async function createDryRunMessageIntentFromPracticeNotification(input: {
  workspaceId: string;
  studentId: string;
  channel: MessagingChannel;
  notification: StudentPracticeNotificationSummary;
}) {
  return createDryRunMessageIntentFromReminderState({
    workspaceId: input.workspaceId,
    studentId: input.studentId,
    channel: input.channel,
    purpose: purposeForPracticeNotification(input.notification.kind),
    safeReason: `${input.notification.kind} for ${input.notification.assignmentTitle}`,
    sourceType: "practice_notification",
    sourceRef: input.notification.notificationId
  });
}

export async function getStudentMessagingPreferences(
  actor: VerifiedStudent
): Promise<StudentMessagingPreferencesResponse> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(
      `workspaces/${actor.workspaceId}/students/${actor.studentId}/${MESSAGING_PREFERENCE_COLLECTION_ID}/${PREFERENCE_DOCUMENT_ID}`
    )
    .get();

  return buildPreferenceResponse(normalizeMessagingPreferences(snapshot.data() ?? null));
}

function applyBooleanPatch(
  current: Record<string, boolean>,
  patch: unknown,
  allowedKeys: string[]
) {
  const next = { ...current };
  const record = patch && typeof patch === "object" ? patch as Record<string, unknown> : {};

  allowedKeys.forEach((key) => {
    if (typeof record[key] === "boolean") {
      next[key] = record[key];
    }
  });

  return next;
}

export async function updateStudentMessagingPreferences(
  actor: VerifiedStudent,
  payload: unknown
): Promise<StudentMessagingPreferencesResponse> {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const current = (await getStudentMessagingPreferences(actor)).preferences;
  const now = new Date().toISOString();
  const preferences: StudentMessagingPreferences = {
    channels: applyBooleanPatch(current.channels, record.channels, MESSAGING_CHANNELS) as Record<MessagingChannel, boolean>,
    purposes: applyBooleanPatch(
      current.purposes,
      record.purposes,
      ["practice_assignment", "course", "billing_access", "feedback_resubmission"]
    ) as Record<MessagingPreferencePurpose, boolean>,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();
  const maskedStudentRef = createMessagingSafeRef(actor.studentId, "student");
  const preferenceRef = db.doc(
    `workspaces/${actor.workspaceId}/students/${actor.studentId}/${MESSAGING_PREFERENCE_COLLECTION_ID}/${PREFERENCE_DOCUMENT_ID}`
  );
  const summaryRef = db.doc(
    `workspaces/${actor.workspaceId}/${MESSAGING_PREFERENCE_SUMMARY_COLLECTION_ID}/${maskedStudentRef}`
  );
  const safePayload = {
    workspaceId: actor.workspaceId,
    maskedStudentRef,
    channels: preferences.channels,
    purposes: preferences.purposes,
    contactReadiness: DEFAULT_CONTACT_READINESS,
    updatedAt: now,
    serverUpdatedAt: FieldValue.serverTimestamp()
  };

  await Promise.all([
    preferenceRef.set(
      {
        ...safePayload,
        studentOwned: true,
        serverCreatedOrUpdatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    ),
    summaryRef.set(
      {
        ...safePayload,
        serverCreatedOrUpdatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    )
  ]);

  return buildPreferenceResponse(preferences);
}

export function isMessageIntentWorkerEligible(intent: MessageIntentRecord) {
  return intent.status === "dry_run_recorded" || intent.status === "queued";
}

export async function listMessageIntentsForDryRunWorker(limit = MESSAGE_WORKER_BATCH_LIMIT) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collectionGroup(MESSAGE_INTENT_COLLECTION_ID)
    .orderBy("createdAt", "desc")
    .limit(Math.max(limit * 3, limit))
    .get();

  return snapshot.docs
    .map((doc) => ({
      ref: doc.ref,
      intent: mapMessageIntent(doc)
    }))
    .filter(({ intent }) => isMessageIntentWorkerEligible(intent))
    .slice(0, limit);
}

export async function createMessagingDeliveryAttempt(input: {
  intent: MessageIntentRecord;
  provider: MessagingDeliveryAttemptRecord["provider"];
  status: MessagingIntentStatus;
  dryRun: boolean;
  safeReason: string;
}) {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const attemptRef = db
    .collection(`workspaces/${input.intent.workspaceId}/${MESSAGE_DELIVERY_ATTEMPT_COLLECTION_ID}`)
    .doc();
  const attempt: MessagingDeliveryAttemptRecord = stripUndefined({
    deliveryAttemptId: attemptRef.id,
    maskedWorkspaceRef: createMessagingSafeRef(input.intent.workspaceId, "ws"),
    maskedStudentRef: input.intent.maskedStudentRef,
    messageIntentRef: createMessagingSafeRef(input.intent.messageIntentId, "msg"),
    channel: input.intent.channel,
    provider: input.provider,
    purpose: input.intent.purpose,
    status: input.status,
    dryRun: input.dryRun,
    safeReason: sanitizeText(input.safeReason),
    sourceType: input.intent.sourceType,
    sourceSafeRef: input.intent.sourceSafeRef,
    createdAt: now,
    updatedAt: now
  });

  await attemptRef.set({
    ...attempt,
    serverCreatedAt: FieldValue.serverTimestamp(),
    serverUpdatedAt: FieldValue.serverTimestamp()
  });

  return attempt;
}

export async function updateMessageIntentAfterDeliveryAttempt(input: {
  intentRef: DocumentReference<DocumentData>;
  status: MessagingIntentStatus;
  safeReason: string;
}) {
  await input.intentRef.set(
    stripUndefined({
      status: input.status,
      safeReason: sanitizeText(input.safeReason),
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp()
    }),
    { merge: true }
  );
}

export async function getAdminMessagingOverview(
  actor: VerifiedSuperAdmin
): Promise<AdminMessagingOverviewResponse> {
  void actor;

  const readiness = getMessagingProviderReadiness();
  const warnings = [
    "Stage 23C does not send external email, WhatsApp, or SMS.",
    "Message intents store masked refs, preference status, contact readiness status, and safe reasons only. Message bodies and contact details stay out of browser responses."
  ];

  let latestIntents: MessageIntentRecord[] = [];
  let latestDeliveryAttempts: MessagingDeliveryAttemptRecord[] = [];
  let latestSuppressions: MessagingSuppressionRecord[] = [];
  let preferenceSummaries: MessagingPreferenceSummaryRecord[] = [];

  try {
    const { db } = getFirebaseAdminClients();
    const [intentSnapshot, attemptSnapshot, suppressionSnapshot, preferenceSummarySnapshot] = await Promise.all([
      db
      .collectionGroup(MESSAGE_INTENT_COLLECTION_ID)
      .orderBy("createdAt", "desc")
      .limit(MESSAGE_INTENT_OVERVIEW_LIMIT)
      .get(),
      db
        .collectionGroup(MESSAGE_DELIVERY_ATTEMPT_COLLECTION_ID)
        .orderBy("createdAt", "desc")
        .limit(MESSAGE_INTENT_OVERVIEW_LIMIT)
        .get(),
      db
        .collectionGroup(MESSAGING_SUPPRESSION_COLLECTION_ID)
        .orderBy("createdAt", "desc")
        .limit(MESSAGE_INTENT_OVERVIEW_LIMIT)
        .get(),
      db
        .collectionGroup(MESSAGING_PREFERENCE_SUMMARY_COLLECTION_ID)
        .orderBy("updatedAt", "desc")
        .limit(MESSAGE_INTENT_OVERVIEW_LIMIT)
        .get()
    ]);

    latestIntents = intentSnapshot.docs.map(mapMessageIntent);
    latestDeliveryAttempts = attemptSnapshot.docs.map(mapDeliveryAttempt);
    latestSuppressions = suppressionSnapshot.docs.map(mapSuppression);
    preferenceSummaries = preferenceSummarySnapshot.docs.map((doc) => preferenceSummaryFromData(doc.id, doc.data()));
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? "Messaging intent preview is unavailable; no external sends were attempted."
        : "Messaging intent preview is unavailable."
    );
  }

  return {
    readiness,
    summary: {
      totalIntentCount: latestIntents.length,
      pendingIntentCount: latestIntents.filter((intent) => isMessageIntentWorkerEligible(intent)).length,
      blockedIntentCount: latestIntents.filter((intent) => intent.status === "blocked").length,
      dryRunIntentCount: latestIntents.filter((intent) => intent.status === "dry_run_recorded").length,
      dryRunProcessedIntentCount: latestIntents.filter((intent) => intent.status === "dry_run_processed").length,
      failedIntentCount: latestIntents.filter((intent) => intent.status === "failed").length,
      sentPlaceholderIntentCount: latestIntents.filter((intent) => intent.status === "sent_placeholder").length,
      emailIntentCount: latestIntents.filter((intent) => intent.channel === "email").length,
      whatsappIntentCount: latestIntents.filter((intent) => intent.channel === "whatsapp").length,
      smsIntentCount: latestIntents.filter((intent) => intent.channel === "sms").length,
      latestDeliveryAttemptCount: latestDeliveryAttempts.length,
      dryRunProcessedAttemptCount: latestDeliveryAttempts.filter((attempt) => attempt.status === "dry_run_processed").length,
      failedDeliveryAttemptCount: latestDeliveryAttempts.filter((attempt) => attempt.status === "failed").length,
      sentPlaceholderAttemptCount: latestDeliveryAttempts.filter((attempt) => attempt.status === "sent_placeholder").length,
      sampledIntentCount: latestIntents.length,
      preferenceSummaryCount: preferenceSummaries.length,
      suppressedRecipientCount: latestSuppressions.filter((suppression) => suppression.status === "active").length,
      contactUnavailableCount: preferenceSummaries.filter((summary) => (
        summary.contactReadiness.email !== "ready" ||
        summary.contactReadiness.whatsapp !== "ready" ||
        summary.contactReadiness.sms !== "ready"
      )).length
    },
    latestIntents,
    latestDeliveryAttempts,
    latestSuppressions,
    warnings
  };
}
