import "server-only";

import type {
  BroadLiveAutoCopyLaunchGateState,
  BroadLiveAutoCopyCohortGatePreview,
  BroadLiveAutoCopyCohortStatus,
  BroadLiveAutoCopyIncidentPostureStatus,
  BroadLiveAutoCopyIncidentReadiness,
  BroadLiveAutoCopyIncidentStreamSummary,
  BroadLiveAutoCopyReadinessCheck,
  BroadLiveAutoCopyReadinessCheckStatus,
  BroadLiveAutoCopyReadinessMarket,
  BroadLiveAutoCopyReadinessOverview,
  BroadLiveAutoCopyReadinessScope,
  BroadLiveAutoCopyRunbookSection,
  CrossAssetAutoCopyPreferencesRecord,
  CryptoExecutionReadiness,
  ForexLiveCanaryExecutionPreview,
  LiveProductionConsentRecord,
  LiveProductionExecutionPreview,
  PlatformExecutionControlRecord,
  StudentBroadLiveAutoCopyStatus,
  WorkspaceExecutionControlRecord
} from "@/types/crypto-execution";

type BroadLiveEnv = {
  broadLiveEnabled: boolean;
  broadOrderCallsEnabled: boolean;
  broadDryRun: boolean;
  cohortEnabled: boolean;
  cohortApprovalsEnabled: boolean;
  cohortOrderCallsEnabled: boolean;
  cohortDryRun: boolean;
};

const INCIDENT_NOTE_MAX_LENGTH = 500;

function readBooleanEnv(name: string, defaultValue: boolean) {
  const value = process.env[name];

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return defaultValue;
}

function getBroadLiveAutoCopyEnv(): BroadLiveEnv {
  return {
    broadLiveEnabled: readBooleanEnv("BROAD_LIVE_AUTOCOPY_ENABLED", false),
    broadOrderCallsEnabled: readBooleanEnv("BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED", false),
    broadDryRun: readBooleanEnv("BROAD_LIVE_AUTOCOPY_DRY_RUN", true),
    cohortEnabled: readBooleanEnv("BROAD_LIVE_AUTOCOPY_COHORT_ENABLED", false),
    cohortApprovalsEnabled: readBooleanEnv("BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED", false),
    cohortOrderCallsEnabled: readBooleanEnv("BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED", false),
    cohortDryRun: readBooleanEnv("BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN", true)
  };
}

function stateLabel(state: BroadLiveAutoCopyLaunchGateState) {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "dry_run_only":
      return "Dry-run only";
    case "canary_only":
      return "Canary only";
    case "cohort_ready":
      return "Cohort ready";
    case "broad_live_ready":
      return "Broad live ready";
    case "broad_live_blocked":
    default:
      return "Broad live blocked";
  }
}

function cohortStatusLabel(status: BroadLiveAutoCopyCohortStatus) {
  switch (status) {
    case "blocked":
      return "Blocked";
    case "dry_run_only":
      return "Dry-run only";
    case "canary_required":
      return "Canary required";
    case "eligible_for_review":
      return "Eligible for review";
    case "approved_for_cohort":
      return "Approved for cohort";
    case "cohort_paused":
      return "Cohort paused";
    case "cohort_removed":
      return "Cohort removed";
    case "not_configured":
    default:
      return "Not configured";
  }
}

function incidentStatusLabel(status: BroadLiveAutoCopyIncidentPostureStatus) {
  switch (status) {
    case "blocked":
      return "Blocked";
    case "needs_review":
      return "Needs review";
    case "watch":
      return "Watch";
    case "ready":
    default:
      return "Ready";
  }
}

function check({
  key,
  label,
  status,
  market,
  scope,
  safeMessage
}: {
  key: string;
  label: string;
  status: BroadLiveAutoCopyReadinessCheckStatus;
  market: BroadLiveAutoCopyReadinessMarket;
  scope: BroadLiveAutoCopyReadinessScope;
  safeMessage: string;
}): BroadLiveAutoCopyReadinessCheck {
  return { key, label, status, market, scope, safeMessage };
}

function boolCheck({
  key,
  label,
  ready,
  market,
  scope,
  readyMessage,
  blockedMessage,
  warningWhenBlocked = false
}: {
  key: string;
  label: string;
  ready: boolean;
  market: BroadLiveAutoCopyReadinessMarket;
  scope: BroadLiveAutoCopyReadinessScope;
  readyMessage: string;
  blockedMessage: string;
  warningWhenBlocked?: boolean;
}) {
  return check({
    key,
    label,
    status: ready ? "ready" : warningWhenBlocked ? "warning" : "blocked",
    market,
    scope,
    safeMessage: ready ? readyMessage : blockedMessage
  });
}

function deriveCryptoState({
  env,
  liveProduction,
  platformControl,
  workspaceControl
}: {
  env: BroadLiveEnv;
  liveProduction?: LiveProductionExecutionPreview;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
}): BroadLiveAutoCopyLaunchGateState {
  if (platformControl?.killSwitchEnabled || workspaceControl?.killSwitchEnabled) {
    return "blocked";
  }

  if (!env.broadLiveEnabled) {
    if (liveProduction?.env.productionCanaryEnabled) {
      return "canary_only";
    }

    if (env.cohortEnabled) {
      return "cohort_ready";
    }

    return "broad_live_blocked";
  }

  if (env.broadDryRun || !env.broadOrderCallsEnabled || liveProduction?.env.productionDryRun) {
    return "dry_run_only";
  }

  if (!liveProduction?.env.productionOrdersEnabled || !liveProduction.env.productionVaultReady || !liveProduction.preflightReady) {
    return "blocked";
  }

  return "broad_live_ready";
}

function deriveForexState({
  env,
  forexLiveCanary,
  platformControl,
  workspaceControl
}: {
  env: BroadLiveEnv;
  forexLiveCanary?: ForexLiveCanaryExecutionPreview;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
}): BroadLiveAutoCopyLaunchGateState {
  if (platformControl?.killSwitchEnabled || workspaceControl?.killSwitchEnabled) {
    return "blocked";
  }

  if (!env.broadLiveEnabled) {
    if (forexLiveCanary?.env.liveCanaryEnabled) {
      return "canary_only";
    }

    if (env.cohortEnabled) {
      return "cohort_ready";
    }

    return "broad_live_blocked";
  }

  if (env.broadDryRun || !env.broadOrderCallsEnabled || forexLiveCanary?.env.liveDryRun) {
    return "dry_run_only";
  }

  if (!forexLiveCanary?.env.liveCanaryEnabled || !forexLiveCanary.env.liveOrderCallsEnabled) {
    return "blocked";
  }

  return "broad_live_ready";
}

function combineState(
  cryptoState: BroadLiveAutoCopyLaunchGateState,
  forexState: BroadLiveAutoCopyLaunchGateState,
  env: BroadLiveEnv
): BroadLiveAutoCopyLaunchGateState {
  if (cryptoState === "blocked" || forexState === "blocked") {
    return "blocked";
  }

  if (cryptoState === "broad_live_ready" && forexState === "broad_live_ready" && env.broadLiveEnabled) {
    return "broad_live_ready";
  }

  if (cryptoState === "dry_run_only" || forexState === "dry_run_only") {
    return "dry_run_only";
  }

  if (cryptoState === "canary_only" || forexState === "canary_only") {
    return "canary_only";
  }

  if (cryptoState === "cohort_ready" || forexState === "cohort_ready") {
    return "cohort_ready";
  }

  return "broad_live_blocked";
}

function buildRunbooks(): BroadLiveAutoCopyRunbookSection[] {
  return [
    {
      title: "Before enabling live cohort",
      items: [
        "Confirm paid AutoCopy access, student consent, personal-account posture, allowlists, caps, and pause controls for a bounded cohort.",
        "Confirm crypto Production Beta and Forex canary remain separated, with dry-run proving the exact candidate set before any live call.",
        "Confirm vault readiness and reconciliation dashboards are green without exposing credentials or provider payloads."
      ]
    },
    {
      title: "Before broad rollout",
      items: [
        "Review kill switches at env, platform, workspace, and student levels.",
        "Verify reconciliation, support queue, billing mismatch review, and incident response owners are staffed.",
        "Keep external signal previews read-only until a separate executable-signal approval stage exists."
      ]
    },
    {
      title: "Emergency disable",
      items: [
        "Turn off broad live env/order gates first, then platform kill switch, then affected workspace/student controls.",
        "Pause pending workers and verify no new intents can advance beyond dry-run/canary gates.",
        "Record support-safe incident notes without storing raw provider payloads or secrets."
      ]
    },
    {
      title: "Reconciliation review",
      items: [
        "Compare bounded intent, attempt, and reconciliation summaries before widening access.",
        "Investigate rejected, stale, duplicate, or mismatched attempts before any rollout step.",
        "Use masked provider refs only in browser-visible support notes."
      ]
    },
    {
      title: "Rollback",
      items: [
        "Return all broad live env gates to disabled/dry-run defaults.",
        "Restore workspace sandbox-only posture where needed and clear only after support review.",
        "Keep student consent records intact, but do not route new live orders until readiness is re-approved."
      ]
    }
  ];
}

function combineIncidentStatus(
  streams: BroadLiveAutoCopyIncidentStreamSummary[],
  platformKillSwitch?: boolean,
  workspaceKillSwitch?: boolean
): BroadLiveAutoCopyIncidentPostureStatus {
  if (platformKillSwitch || workspaceKillSwitch) {
    return "blocked";
  }

  if (streams.some((stream) => stream.status === "needs_review" || stream.status === "blocked")) {
    return "needs_review";
  }

  if (streams.some((stream) => stream.status === "watch")) {
    return "watch";
  }

  return "ready";
}

function streamStatus({
  staleAttemptCount,
  requiresReviewCount,
  blockedCount,
  missingPosture = false
}: {
  staleAttemptCount: number;
  requiresReviewCount: number;
  blockedCount: number;
  missingPosture?: boolean;
}): BroadLiveAutoCopyIncidentPostureStatus {
  if (requiresReviewCount > 0 || blockedCount > 0) {
    return "needs_review";
  }

  if (staleAttemptCount > 0 || missingPosture) {
    return "watch";
  }

  return "ready";
}

function latestIsoFrom(values: Array<string | undefined>) {
  const valid = values
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter((value) => Number.isFinite(value));

  if (valid.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...valid)).toISOString();
}

function buildIncidentReadiness({
  scope,
  env,
  liveProduction,
  forexLiveCanary,
  cohortGate,
  platformControl,
  workspaceControl
}: {
  scope: BroadLiveAutoCopyReadinessScope;
  env: BroadLiveEnv;
  liveProduction?: LiveProductionExecutionPreview;
  forexLiveCanary?: ForexLiveCanaryExecutionPreview;
  cohortGate?: BroadLiveAutoCopyCohortGatePreview;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
}): BroadLiveAutoCopyIncidentReadiness {
  const cryptoStaleAttemptCount = liveProduction?.orderAttempts.filter((attempt) =>
    attempt.status === "submitted_live" ||
    attempt.status === "submitting_live" ||
    attempt.status === "cancel_requested" ||
    attempt.status === "reconcile_required"
  ).length ?? 0;
  const cryptoRequiresReviewCount =
    (liveProduction?.reconciliations.filter((record) => record.status === "requires_review" || record.status === "failed").length ?? 0) +
    (liveProduction?.orderAttempts.filter((attempt) => attempt.status === "reconcile_required").length ?? 0);
  const cryptoBlockedCount =
    (liveProduction?.intents.filter((intent) => intent.status === "blocked_live" || intent.status === "rejected_live" || intent.status === "failed_live").length ?? 0) +
    (liveProduction?.orderAttempts.filter((attempt) => attempt.status === "failed_live" || attempt.status === "rejected_live").length ?? 0);
  const cryptoProduction: BroadLiveAutoCopyIncidentStreamSummary = {
    label: "Crypto production/canary",
    status: streamStatus({
      staleAttemptCount: cryptoStaleAttemptCount,
      requiresReviewCount: cryptoRequiresReviewCount,
      blockedCount: cryptoBlockedCount,
      missingPosture: !liveProduction
    }),
    staleAttemptCount: cryptoStaleAttemptCount,
    requiresReviewCount: cryptoRequiresReviewCount,
    blockedCount: cryptoBlockedCount,
    latestSafeMessage:
      liveProduction?.reconciliations[0]?.safeMessage ||
      liveProduction?.auditEvents[0]?.safeMessage ||
      "No support-safe crypto production incident message is visible in the bounded preview.",
    updatedAt: latestIsoFrom([
      ...(liveProduction?.orderAttempts.map((attempt) => attempt.updatedAt) ?? []),
      ...(liveProduction?.reconciliations.map((record) => record.updatedAt) ?? []),
      ...(liveProduction?.auditEvents.map((event) => event.createdAt) ?? [])
    ])
  };

  const cohortBlockedAuditCount = liveProduction?.auditEvents.filter((event) =>
    event.action === "live_production.cohort.blocked" ||
    event.action === "live_production.cohort.skipped" ||
    event.action === "live_production.cohort.failed"
  ).length ?? 0;
  const cohortDryRunAuditCount = liveProduction?.auditEvents.filter((event) => event.action === "live_production.cohort.dry_run").length ?? 0;
  const cryptoCohortDryRun: BroadLiveAutoCopyIncidentStreamSummary = {
    label: "Crypto cohort dry-run",
    status: streamStatus({
      staleAttemptCount: 0,
      requiresReviewCount: cohortBlockedAuditCount,
      blockedCount: cohortGate?.blockedCandidateCount ?? 0,
      missingPosture: !cohortGate
    }),
    staleAttemptCount: 0,
    requiresReviewCount: cohortBlockedAuditCount,
    blockedCount: cohortGate?.blockedCandidateCount ?? 0,
    latestSafeMessage:
      liveProduction?.auditEvents.find((event) => event.action.startsWith("live_production.cohort."))?.safeMessage ||
      "No crypto cohort dry-run audit event is visible in the bounded preview.",
    updatedAt: latestIsoFrom(liveProduction?.auditEvents
      .filter((event) => event.action.startsWith("live_production.cohort."))
      .map((event) => event.createdAt) ?? [])
  };

  const forexStaleAttemptCount = forexLiveCanary?.attempts.filter((attempt) =>
    attempt.status === "submitted_live_forex_canary" ||
    attempt.status === "partially_filled_live_forex_canary"
  ).length ?? 0;
  const forexRequiresReviewCount =
    (forexLiveCanary?.attempts.filter((attempt) => attempt.status === "failed_live_forex_canary").length ?? 0) +
    (forexLiveCanary?.gateDecisions.filter((decision) => decision.status === "requires_review").length ?? 0);
  const forexBlockedCount =
    (forexLiveCanary?.routing.blockedCount ?? 0) +
    (forexLiveCanary?.gateDecisions.filter((decision) => decision.status === "blocked").length ?? 0) +
    (forexLiveCanary?.attempts.filter((attempt) => attempt.status === "failed_live_forex_canary" || attempt.status === "skipped_live_forex_canary").length ?? 0);
  const forexLiveCanarySummary: BroadLiveAutoCopyIncidentStreamSummary = {
    label: "Forex live canary",
    status: streamStatus({
      staleAttemptCount: forexStaleAttemptCount,
      requiresReviewCount: forexRequiresReviewCount,
      blockedCount: forexBlockedCount,
      missingPosture: !forexLiveCanary
    }),
    staleAttemptCount: forexStaleAttemptCount,
    requiresReviewCount: forexRequiresReviewCount,
    blockedCount: forexBlockedCount,
    latestSafeMessage:
      forexLiveCanary?.attempts[0]?.sanitizedFailureReason ||
      forexLiveCanary?.gateDecisions[0]?.blockedReason ||
      forexLiveCanary?.auditEvents[0]?.safeMessage ||
      "No support-safe Forex live canary incident message is visible in the bounded preview.",
    updatedAt: latestIsoFrom([
      ...(forexLiveCanary?.attempts.map((attempt) => attempt.updatedAt) ?? []),
      ...(forexLiveCanary?.gateDecisions.map((decision) => decision.decidedAt) ?? []),
      ...(forexLiveCanary?.auditEvents.map((event) => event.createdAt) ?? [])
    ])
  };

  const streams = [cryptoProduction, cryptoCohortDryRun, forexLiveCanarySummary];
  const status = combineIncidentStatus(streams, platformControl?.killSwitchEnabled, workspaceControl?.killSwitchEnabled);
  const platformKillSwitch = platformControl ? (platformControl.killSwitchEnabled ? "active" : "inactive") : "unknown";
  const workspaceKillSwitch = workspaceControl ? (workspaceControl.killSwitchEnabled ? "active" : "inactive") : "unknown";
  const warningCount = streams.filter((stream) => stream.status !== "ready").length;

  return {
    status,
    statusLabel: incidentStatusLabel(status),
    cryptoProduction,
    cryptoCohortDryRun,
    forexLiveCanary: forexLiveCanarySummary,
    killSwitchStatus: {
      platform: platformKillSwitch,
      workspace: workspaceKillSwitch
    },
    dryRunOrderCallPosture: {
      cryptoProduction: liveProduction?.env.productionOrdersEnabled
        ? liveProduction.env.productionDryRun ? "dry_run" : "order_calls_possible"
        : "disabled",
      cryptoCohort: env.cohortOrderCallsEnabled
        ? env.cohortDryRun ? "dry_run" : "order_calls_possible"
        : "disabled",
      forexLiveCanary: forexLiveCanary?.env.liveOrderCallsEnabled
        ? forexLiveCanary.env.liveDryRun ? "dry_run" : "order_calls_possible"
        : "disabled"
    },
    rollbackChecklist: [
      "Set broad and cohort order-call env gates to disabled, then restore dry-run defaults.",
      "Use platform kill switch first, then affected workspace and student pauses.",
      "Run production/canary reconciliation before clearing any support review state.",
      "Record only bounded support notes with masked refs and no provider payloads."
    ],
    incidentChecklist: [
      "Confirm whether stale or review-needed attempts exist in the bounded preview.",
      "Check crypto production canary, crypto cohort dry-run, and Forex live canary streams separately.",
      "Keep external signal previews non-executable during incident review.",
      "Do not clear kill switches until reconciliation and support notes are reviewed."
    ],
    auditSummary: [
      {
        label: "Cohort dry-run audits",
        count: cohortDryRunAuditCount,
        safeMessage: "Dry-run cohort evaluations are support-safe audit events and do not call exchange endpoints."
      },
      {
        label: "Blocked/skipped cohort audits",
        count: cohortBlockedAuditCount,
        safeMessage: "Blocked or skipped cohort candidates require operator review before any future rollout step."
      },
      {
        label: "Production reconciliation records",
        count: liveProduction?.reconciliations.length ?? 0,
        safeMessage: "Production reconciliation preview is bounded and excludes raw provider payloads."
      },
      {
        label: "Forex canary blocked checks",
        count: forexBlockedCount,
        safeMessage: "Forex canary blocks stay separate from crypto cohort rollout and broad live execution."
      }
    ],
    supportNotePolicy: {
      maxLength: INCIDENT_NOTE_MAX_LENGTH,
      visibility: "super_admin_only",
      allowedActions: ["mark_support_review_needed", "record_incident_note", "record_rollback_note"],
      safeMessage: "Future support notes must be bounded, sanitized, Super Admin-only, and must not include credentials, raw provider payloads, raw student IDs, or full order refs."
    },
    warnings: [
      warningCount > 0
        ? `${warningCount} live AutoCopy support stream${warningCount === 1 ? "" : "s"} need operator attention before any wider rollout.`
        : "No bounded support stream currently requires incident attention.",
      scope === "platform"
        ? "Load a workspace for workspace-specific live incident posture; platform view stays aggregate-safe."
        : "Workspace incident posture is support-safe and excludes credentials, raw provider payloads, and raw student IDs.",
      "Stage 25D adds incident/reconciliation hardening only; it does not execute orders or enable broad live AutoCopy."
    ],
    updatedAt: new Date().toISOString()
  };
}

function deriveCohortStatus({
  env,
  cryptoState,
  forexState,
  liveProduction,
  platformControl,
  workspaceControl,
  eligibleCandidateCount,
  recentFailureCount
}: {
  env: BroadLiveEnv;
  cryptoState: BroadLiveAutoCopyLaunchGateState;
  forexState: BroadLiveAutoCopyLaunchGateState;
  liveProduction?: LiveProductionExecutionPreview;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
  eligibleCandidateCount: number;
  recentFailureCount?: number;
}): BroadLiveAutoCopyCohortStatus {
  if (platformControl?.killSwitchEnabled || workspaceControl?.killSwitchEnabled) {
    return "blocked";
  }

  if (!env.cohortApprovalsEnabled) {
    return "not_configured";
  }

  if (recentFailureCount && recentFailureCount > 0) {
    return "blocked";
  }

  if (!liveProduction?.env.productionVaultReady || !liveProduction.preflightReady) {
    return "canary_required";
  }

  if (cryptoState !== "canary_only" && cryptoState !== "cohort_ready" && cryptoState !== "broad_live_ready") {
    return "canary_required";
  }

  if (forexState !== "canary_only" && forexState !== "cohort_ready" && forexState !== "broad_live_ready" && forexState !== "broad_live_blocked") {
    return "canary_required";
  }

  if (eligibleCandidateCount <= 0) {
    return "blocked";
  }

  if (env.cohortDryRun || !env.cohortOrderCallsEnabled) {
    return "dry_run_only";
  }

  if (env.cohortEnabled && env.cohortApprovalsEnabled && env.cohortOrderCallsEnabled && !env.cohortDryRun) {
    return "approved_for_cohort";
  }

  return "eligible_for_review";
}

function buildCohortGatePreview({
  scope,
  workspaceId,
  env,
  cryptoState,
  forexState,
  liveProduction,
  platformControl,
  workspaceControl,
  readinessCounts,
  sampledStudentCount,
  recentFailureCount
}: {
  scope: BroadLiveAutoCopyReadinessScope;
  workspaceId?: string;
  env: BroadLiveEnv;
  cryptoState: BroadLiveAutoCopyLaunchGateState;
  forexState: BroadLiveAutoCopyLaunchGateState;
  liveProduction?: LiveProductionExecutionPreview;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
  readinessCounts?: Partial<Record<string, number>>;
  sampledStudentCount?: number;
  recentFailureCount?: number;
}): BroadLiveAutoCopyCohortGatePreview {
  const candidateLimit = 50;
  const eligibleCandidateCount = Math.max(0, readinessCounts?.live_ready ?? 0);
  const sampledCount = Math.max(0, sampledStudentCount ?? 0);
  const blockedCandidateCount = Math.max(0, sampledCount - eligibleCandidateCount);
  const status = deriveCohortStatus({
    env,
    cryptoState,
    forexState,
    liveProduction,
    platformControl,
    workspaceControl,
    eligibleCandidateCount,
    recentFailureCount
  });
  const updatedAt = new Date().toISOString();
  const checks: BroadLiveAutoCopyReadinessCheck[] = [
    boolCheck({
      key: "cohort_approvals_env",
      label: "Cohort approvals",
      ready: env.cohortApprovalsEnabled,
      market: "platform",
      scope,
      readyMessage: "Cohort approval review env is enabled.",
      blockedMessage: "Cohort approval review env is disabled by default; no cohort can be approved.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "cohort_order_calls_env",
      label: "Cohort order calls",
      ready: env.cohortOrderCallsEnabled,
      market: "platform",
      scope,
      readyMessage: "Cohort order-call env is enabled for review.",
      blockedMessage: "Cohort order-call env is disabled; cohort approval cannot place orders.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "cohort_dry_run_env",
      label: "Cohort dry-run",
      ready: !env.cohortDryRun,
      market: "platform",
      scope,
      readyMessage: "Cohort dry-run env is off for a reviewed cohort state.",
      blockedMessage: "Cohort dry-run remains on; cohort review is fail-closed.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "cohort_platform_kill_switch",
      label: "Platform kill switch",
      ready: !platformControl?.killSwitchEnabled,
      market: "platform",
      scope,
      readyMessage: "Platform kill switch is off for cohort review.",
      blockedMessage: "Platform kill switch blocks live cohort consideration."
    }),
    boolCheck({
      key: "cohort_workspace_kill_switch",
      label: "Workspace kill switch",
      ready: !workspaceControl?.killSwitchEnabled,
      market: "workspace",
      scope,
      readyMessage: "Workspace kill switch is off for cohort review.",
      blockedMessage: "Workspace kill switch blocks live cohort consideration.",
      warningWhenBlocked: scope === "platform" && !workspaceControl
    }),
    check({
      key: "cohort_vault_readiness",
      label: "Credential vault",
      status: liveProduction?.env.productionVaultReady ? "ready" : "blocked",
      market: "crypto",
      scope,
      safeMessage: liveProduction?.env.productionVaultReady
        ? "Production credential vault readiness is present for cohort review."
        : "Production credential vault readiness is missing; cohort approval remains blocked."
    }),
    check({
      key: "cohort_preflight_readiness",
      label: "Production preflight",
      status: liveProduction?.preflightReady ? "ready" : "blocked",
      market: "crypto",
      scope,
      safeMessage: liveProduction?.preflightReady
        ? "Production preflight summary is ready for bounded cohort review."
        : "Production preflight checks are not ready; cohort approval remains blocked."
    }),
    check({
      key: "cohort_crypto_canary_required",
      label: "Crypto canary",
      status: cryptoState === "canary_only" || cryptoState === "cohort_ready" || cryptoState === "broad_live_ready" ? "ready" : "blocked",
      market: "crypto",
      scope,
      safeMessage:
        cryptoState === "canary_only" || cryptoState === "cohort_ready" || cryptoState === "broad_live_ready"
          ? "Crypto canary/readiness posture exists before cohort consideration."
          : "Crypto canary/readiness posture must be proven before cohort consideration."
    }),
    check({
      key: "cohort_eligible_sample",
      label: "Eligible sample",
      status: eligibleCandidateCount > 0 ? "warning" : "blocked",
      market: "student",
      scope,
      safeMessage:
        eligibleCandidateCount > 0
          ? `${eligibleCandidateCount} bounded sampled students appear eligible for review; approval still cannot route broad live orders.`
          : "No bounded sampled student is eligible for live cohort review."
    }),
    check({
      key: "cohort_reconciliation_clear",
      label: "Reconciliation",
      status: recentFailureCount && recentFailureCount > 0 ? "blocked" : "ready",
      market: "platform",
      scope,
      safeMessage:
        recentFailureCount && recentFailureCount > 0
          ? "Recent safe failure/block records must be reviewed before cohort approval."
          : "No recent safe failure count is blocking cohort review."
    }),
    check({
      key: "cohort_no_external_preview_execution",
      label: "External previews",
      status: "ready",
      market: "platform",
      scope,
      safeMessage: "External signal preview records remain non-executable and cannot seed cohort AutoCopy routing."
    })
  ];

  return {
    status,
    statusLabel: cohortStatusLabel(status),
    approvalsEnabled: env.cohortApprovalsEnabled,
    orderCallsEnabled: env.cohortOrderCallsEnabled,
    dryRun: env.cohortDryRun,
    candidateLimit,
    eligibleCandidateCount,
    blockedCandidateCount,
    approvedCandidateCount: status === "approved_for_cohort" ? eligibleCandidateCount : 0,
    bounded: sampledCount >= candidateLimit,
    checks,
    auditEvents: [],
    warnings: [
      "Stage 25B cohort approval is a review gate only and does not place live orders by itself.",
      workspaceId
        ? "Selected workspace cohort visibility is support-safe and excludes raw student IDs, credentials, and provider data."
        : "Select a workspace to review bounded cohort candidates without scanning all workspaces.",
      "Cohort order-call env defaults remain disabled and dry-run."
    ],
    updatedAt
  };
}

export function buildBroadLiveAutoCopyReadinessOverview({
  scope,
  workspaceId,
  platformControl,
  workspaceControl,
  liveProduction,
  forexLiveCanary,
  readinessCounts,
  sampledStudentCount,
  recentFailureCount
}: {
  scope: BroadLiveAutoCopyReadinessScope;
  workspaceId?: string;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
  liveProduction?: LiveProductionExecutionPreview;
  forexLiveCanary?: ForexLiveCanaryExecutionPreview;
  readinessCounts?: Partial<Record<string, number>>;
  sampledStudentCount?: number;
  recentFailureCount?: number;
}): BroadLiveAutoCopyReadinessOverview {
  const env = getBroadLiveAutoCopyEnv();
  const cryptoState = deriveCryptoState({ env, liveProduction, platformControl, workspaceControl });
  const forexState = deriveForexState({ env, forexLiveCanary, platformControl, workspaceControl });
  const state = combineState(cryptoState, forexState, env);
  const updatedAt = new Date().toISOString();
  const cohortGate = buildCohortGatePreview({
    scope,
    workspaceId,
    env,
    cryptoState,
    forexState,
    liveProduction,
    platformControl,
    workspaceControl,
    readinessCounts,
    sampledStudentCount,
    recentFailureCount
  });
  const incidentReadiness = buildIncidentReadiness({
    scope,
    env,
    liveProduction,
    forexLiveCanary,
    cohortGate,
    platformControl,
    workspaceControl
  });
  const checks: BroadLiveAutoCopyReadinessCheck[] = [
    boolCheck({
      key: "broad_live_env_disabled_default",
      label: "Broad live env",
      ready: env.broadLiveEnabled,
      market: "platform",
      scope,
      readyMessage: "Broad live AutoCopy env is explicitly enabled for readiness review.",
      blockedMessage: "Broad live AutoCopy env is disabled by default; broad live rollout cannot start.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "broad_live_order_calls_disabled_default",
      label: "Broad order calls",
      ready: env.broadOrderCallsEnabled,
      market: "platform",
      scope,
      readyMessage: "Broad live order-call env is explicitly enabled.",
      blockedMessage: "Broad live order-call env is disabled; no broad live orders can be sent.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "broad_live_dry_run_default",
      label: "Broad dry-run",
      ready: !env.broadDryRun,
      market: "platform",
      scope,
      readyMessage: "Broad dry-run env is off for a reviewed rollout state.",
      blockedMessage: "Broad dry-run remains on by default; readiness is audit-only.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "platform_kill_switch",
      label: "Platform kill switch",
      ready: !platformControl?.killSwitchEnabled,
      market: "platform",
      scope,
      readyMessage: "Platform execution kill switch is not active.",
      blockedMessage: "Platform execution kill switch is active; live rollout is blocked."
    }),
    boolCheck({
      key: "workspace_kill_switch",
      label: "Workspace kill switch",
      ready: !workspaceControl?.killSwitchEnabled,
      market: "workspace",
      scope,
      readyMessage: "Workspace execution kill switch is not active.",
      blockedMessage: "Workspace execution kill switch is active or unavailable; live rollout is blocked.",
      warningWhenBlocked: scope === "platform" && !workspaceControl
    }),
    boolCheck({
      key: "crypto_production_beta_gates",
      label: "Crypto production beta",
      ready: Boolean(
        liveProduction?.env.productionBetaEnabled &&
        liveProduction.env.productionOrdersEnabled &&
        liveProduction.env.productionVaultReady &&
        !liveProduction.env.productionDryRun &&
        liveProduction.preflightReady
      ),
      market: "crypto",
      scope,
      readyMessage: "Crypto Production Beta preview reports all production preflight gates ready.",
      blockedMessage: "Crypto Production Beta is not broad-live ready; canary/dry-run controls remain separate.",
      warningWhenBlocked: true
    }),
    boolCheck({
      key: "forex_live_canary_separation",
      label: "Forex live canary",
      ready: Boolean(
        forexLiveCanary?.env.liveCanaryEnabled &&
        forexLiveCanary.env.liveOrderCallsEnabled &&
        !forexLiveCanary.env.liveDryRun
      ),
      market: "forex",
      scope,
      readyMessage: "Tiny live Forex canary env gates are ready for the separately approved canary path.",
      blockedMessage: "Forex live remains canary-gated or dry-run; broad Forex live rollout is blocked.",
      warningWhenBlocked: true
    }),
    check({
      key: "student_consent_access_sample",
      label: "Student consent/access",
      status: (readinessCounts?.live_ready ?? 0) > 0 ? "warning" : "blocked",
      market: "student",
      scope,
      safeMessage:
        (readinessCounts?.live_ready ?? 0) > 0
          ? `${readinessCounts?.live_ready ?? 0} sampled students have live-ready posture; broad rollout still requires explicit launch approval.`
          : "No sampled students are counted as live-ready for broad rollout; keep routing blocked."
    }),
    check({
      key: "bounded_sampling",
      label: "Bounded sample",
      status: sampledStudentCount && sampledStudentCount > 0 ? "ready" : "unknown",
      market: "workspace",
      scope,
      safeMessage:
        sampledStudentCount && sampledStudentCount > 0
          ? `${sampledStudentCount} students were included in the bounded readiness sample.`
          : "Select a workspace to load a bounded student readiness sample."
    }),
    check({
      key: "reconciliation_incident_readiness",
      label: "Reconciliation",
      status: recentFailureCount && recentFailureCount > 0 ? "warning" : "ready",
      market: "platform",
      scope,
      safeMessage:
        recentFailureCount && recentFailureCount > 0
          ? `${recentFailureCount} recent safe failure/block records should be reviewed before widening live access.`
          : "No recent safe failure count is blocking this readiness preview."
    }),
    check({
      key: "external_signal_preview_not_executable",
      label: "External signals",
      status: "ready",
      market: "platform",
      scope,
      safeMessage: "External signal ingestion remains preview-only and is not connected to AutoCopy execution."
    })
  ];

  return {
    state,
    stateLabel: stateLabel(state),
    scope,
    workspaceId,
    broadLiveEnabled: env.broadLiveEnabled && env.broadOrderCallsEnabled && !env.broadDryRun,
    cryptoState,
    forexState,
    cohortGate,
    incidentReadiness,
    checks,
    runbooks: buildRunbooks(),
    warnings: [
      "Stage 25A is an audit and launch-gate preview only; it does not enable broad live order execution.",
      "Broad live env defaults remain disabled and dry-run until a separate reviewed rollout stage changes them.",
      "External signal preview candidates are read-only and cannot execute through AutoCopy."
    ],
    updatedAt
  };
}

export function buildStudentBroadLiveAutoCopyStatus({
  readiness,
  autoCopyPreferences,
  liveProductionConsent,
  liveProduction,
  forexLiveCanary,
  platformControl,
  workspaceControl
}: {
  readiness: CryptoExecutionReadiness;
  autoCopyPreferences: {
    crypto: CrossAssetAutoCopyPreferencesRecord;
    forex: CrossAssetAutoCopyPreferencesRecord;
  };
  liveProductionConsent?: LiveProductionConsentRecord;
  liveProduction?: LiveProductionExecutionPreview;
  forexLiveCanary?: ForexLiveCanaryExecutionPreview;
  platformControl?: PlatformExecutionControlRecord;
  workspaceControl?: WorkspaceExecutionControlRecord;
}): StudentBroadLiveAutoCopyStatus {
  const env = getBroadLiveAutoCopyEnv();
  const cryptoState = deriveCryptoState({ env, liveProduction, platformControl, workspaceControl });
  const forexState = deriveForexState({ env, forexLiveCanary, platformControl, workspaceControl });
  const state = combineState(cryptoState, forexState, env);
  const cohortStatus = deriveCohortStatus({
    env,
    cryptoState,
    forexState,
    liveProduction,
    platformControl,
    workspaceControl,
    eligibleCandidateCount: readiness.state === "live_ready" ? 1 : 0,
    recentFailureCount: 0
  });
  const scope: BroadLiveAutoCopyReadinessScope = "student";
  const consentAccepted = liveProductionConsent?.status === "accepted";
  const cryptoPrefsReady =
    autoCopyPreferences.crypto.consentStatus === "accepted" &&
    !autoCopyPreferences.crypto.studentPaused &&
    !autoCopyPreferences.crypto.killSwitchEnabled;
  const forexPrefsReady =
    autoCopyPreferences.forex.consentStatus === "accepted" &&
    !autoCopyPreferences.forex.studentPaused &&
    !autoCopyPreferences.forex.killSwitchEnabled;
  const visibleChecks: BroadLiveAutoCopyReadinessCheck[] = [
    check({
      key: "student_autocopy_access",
      label: "AutoCopy access",
      status: readiness.state === "blocked_by_entitlement" || readiness.state === "needs_crypto_autocopy_payment" ? "blocked" : "ready",
      market: "student",
      scope,
      safeMessage:
        readiness.state === "blocked_by_entitlement" || readiness.state === "needs_crypto_autocopy_payment"
          ? "AutoCopy access is not active for broad live readiness."
          : "Your AutoCopy access posture is visible to TradeHub readiness checks."
    }),
    check({
      key: "student_production_consent",
      label: "Production consent",
      status: consentAccepted ? "ready" : "blocked",
      market: "student",
      scope,
      safeMessage: consentAccepted
        ? "Production Beta consent is accepted; launch gates still control all live routing."
        : "Production Beta consent is not accepted or is paused/revoked."
    }),
    check({
      key: "student_preferences",
      label: "Student controls",
      status: cryptoPrefsReady || forexPrefsReady ? "warning" : "blocked",
      market: "student",
      scope,
      safeMessage:
        cryptoPrefsReady || forexPrefsReady
          ? "At least one AutoCopy preference set is consented and not paused; broad live remains gated."
          : "AutoCopy preferences are missing, paused, or kill-switched."
    }),
    check({
      key: "student_broad_live_default",
      label: "Broad live",
      status: env.broadLiveEnabled && env.broadOrderCallsEnabled && !env.broadDryRun ? "warning" : "blocked",
      market: "platform",
      scope,
      safeMessage:
        env.broadLiveEnabled && env.broadOrderCallsEnabled && !env.broadDryRun
          ? "Broad live gates are under review; TradeHub still requires all server controls before routing."
          : "Broad live AutoCopy is disabled by default. No broad live order is enabled from this page."
    }),
    check({
      key: "student_cohort_controlled_rollout",
      label: "Cohort rollout",
      status: cohortStatus === "approved_for_cohort" ? "warning" : "blocked",
      market: "student",
      scope,
      safeMessage:
        cohortStatus === "approved_for_cohort"
          ? "A controlled cohort review gate is present, but TradeHub still requires every server gate before routing."
          : "Live AutoCopy cohort rollout is not broadly enabled for students."
    })
  ];

  return {
    state,
    stateLabel: stateLabel(state),
    cryptoState,
    forexState,
    cohortStatus,
    cohortStatusLabel: cohortStatusLabel(cohortStatus),
    safeMessage:
      state === "broad_live_ready"
        ? "Broad live readiness is under controlled review. TradeHub still requires server-side gates before any order."
        : "Broad live AutoCopy is not enabled. Paper, demo, testnet, and canary paths stay separated.",
    visibleChecks,
    updatedAt: new Date().toISOString()
  };
}
