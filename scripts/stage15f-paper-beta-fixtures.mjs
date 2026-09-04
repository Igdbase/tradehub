export const STAGE15F_PROJECT_ID = "trade-hub-4d8df";
export const STAGE15F_FIXED_NOW = "2026-07-15T12:00:00.000Z";

export const ids = {
  workspaceId: "ws_stage15f_paper_beta",
  influencerId: "influencer_stage15f",
  students: {
    paystackActive: "student_stage15f_paystack_active",
    binanceSandbox: "student_stage15f_binance_sandbox",
    bybitSandbox: "student_stage15f_bybit_sandbox",
    sandboxPreferred: "student_stage15f_sandbox_preferred",
    fundedBlocked: "student_stage15f_funded_blocked",
    paused: "student_stage15f_paused",
    unconnected: "student_stage15f_unconnected"
  },
  signals: {
    buyValid: "signal_stage15f_crypto_buy_valid",
    sellValid: "signal_stage15f_crypto_sell_valid",
    invalidBuyLevels: "signal_stage15f_crypto_buy_invalid_levels",
    workspaceKillSwitch: "signal_stage15f_workspace_kill_switch",
    platformKillSwitch: "signal_stage15f_platform_kill_switch"
  },
  connections: {
    binanceSandbox: "conn_stage15f_binance_sandbox",
    bybitSandbox: "conn_stage15f_bybit_sandbox",
    preferredSandbox: "conn_stage15f_preferred_sandbox",
    preferredProduction: "conn_stage15f_preferred_production",
    pausedBinance: "conn_stage15f_paused_binance"
  },
  intents: {
    binanceBuy: "intent_stage15f_binance_buy",
    bybitSell: "intent_stage15f_bybit_sell",
    sandboxPreferredBuy: "intent_stage15f_sandbox_preferred_buy",
    workerCandidate: "intent_stage15f_worker_candidate",
    completedPreview: "intent_stage15f_completed_preview",
    nonPaperReady: "intent_stage15f_non_paper_ready"
  }
};

export function isoMinutes(offset) {
  return new Date(Date.parse(STAGE15F_FIXED_NOW) + offset * 60_000).toISOString();
}

export function workspaceDoc() {
  return {
    workspaceId: ids.workspaceId,
    handle: "stage15f-paper-beta",
    name: "Crypto Auto-Copy Beta",
    ownerId: ids.influencerId,
    ownerEmail: "stage15f.influencer@example.test",
    ownerDisplayName: "Crypto Auto-Copy Influencer",
    summary: "Deterministic crypto Auto-Copy workspace for local QA.",
    marketFocus: "crypto",
    branding: {
      logoMark: "15F",
      primaryColor: "locked_tradehub_surface",
      accentColor: "accent",
      heroLabel: "Crypto Auto-Copy"
    },
    tiers: [
      {
        tierId: "starter_alerts",
        name: "Starter Alerts",
        description: "Courses, journal, and Signal Alerts only.",
        priceNgn: 15000,
        billingPeriod: "monthly",
        features: ["course", "signalAlerts", "journal", "calculators"],
        featured: false,
        paystackPlanCode: "PLN_stage15f_alerts"
      },
      {
        tierId: "pro_auto_copy",
        name: "Pro Auto-Copy",
        description: "Paper beta Auto-Copy entitlement for personal crypto exchange accounts.",
        priceNgn: 45000,
        billingPeriod: "monthly",
        features: ["course", "signalAlerts", "autoCopy", "journal", "calculators"],
        featured: true,
        paystackPlanCode: "PLN_stage15f_auto_copy"
      }
    ],
    settings: {
      singleTier: false,
      freeTrialDays: 0,
      noCardRequired: false,
      refundPolicy: "Local QA policy."
    },
    rails: [
      {
        rail: "paystack",
        status: "enabled",
        label: "Paystack local checkout",
        settlementNote: "Default Paystack rail."
      },
      {
        rail: "solana",
        status: "disabled",
        label: "Optional Solana Pay / USDC",
        settlementNote: "Solana remains separate from exchange trading."
      }
    ],
    vettingStatus: "approved",
    paystackSubaccountCode: "ACCT_stage15f_fixture",
    paystackSplitCode: "SPL_stage15f_fixture",
    solanaPayEnabled: false,
    solanaPartnerPlacementEnabled: false,
    platformSplitPercent: 10,
    codeOfConductAcceptedAt: isoMinutes(-500),
    riskDisclosureVersion: "stage15f-paper-beta-v1",
    createdAt: isoMinutes(-600),
    updatedAt: STAGE15F_FIXED_NOW,
    activatedAt: isoMinutes(-550)
  };
}

export function studentDoc(studentId, overrides = {}) {
  const base = {
    studentId,
    workspaceId: ids.workspaceId,
    displayName: studentId.replace(/^student_stage15f_/, "").replace(/_/g, " "),
    email: `${studentId}@example.test`,
    tierId: "pro_auto_copy",
    tierLabel: "Pro Auto-Copy",
    subscriptionStatus: "active",
    status: "active",
    paymentRail: "paystack",
    accountMode: "auto_copy",
    brokerLink: {
      type: "crypto",
      exchange: "binance",
      status: "linked"
    },
    autoCopyEligible: true,
    joinedAt: isoMinutes(-450),
    lastSeenAt: isoMinutes(-20),
    courseCompletionPercent: 42,
    riskDisclosureAcceptedAt: isoMinutes(-300),
    createdAt: isoMinutes(-450),
    updatedAt: STAGE15F_FIXED_NOW
  };

  return {
    ...base,
    ...overrides
  };
}

export function subscriptionDoc(studentId, overrides = {}) {
  return {
    subscriptionId: "current",
    workspaceId: ids.workspaceId,
    studentId,
    status: "active",
    rail: "paystack",
    tierId: "pro_auto_copy",
    tierLabel: "Pro Auto-Copy",
    amountNgn: 45000,
    currency: "NGN",
    currentPeriodStart: isoMinutes(-400),
    currentPeriodEnd: isoMinutes(60 * 24 * 30),
    updatedAt: STAGE15F_FIXED_NOW,
    ...overrides
  };
}

export function preferencesDoc(studentId, overrides = {}) {
  return {
    workspaceId: ids.workspaceId,
    studentId,
    optInState: "opted_in_paper",
    paperTradingOnly: true,
    studentPaused: false,
    maxRiskPercentPerTrade: 1,
    maxDailyLossPercent: 3,
    maxOpenTrades: 3,
    allowedSymbols: [],
    riskDisclosureAcceptedAt: isoMinutes(-300),
    updatedAt: STAGE15F_FIXED_NOW,
    updatedBy: "stage15f-seed",
    ...overrides
  };
}

export function connectionDoc({
  connectionId,
  studentId,
  exchange,
  environment,
  keyFingerprint,
  updatedAt = STAGE15F_FIXED_NOW
}) {
  return {
    connectionId,
    workspaceId: ids.workspaceId,
    studentId,
    exchange,
    environment,
    market: "crypto",
    accountKind: "personal_exchange",
    status: "verified",
    connectionLabel: `${exchange === "binance" ? "Binance" : "Bybit"} ${environment === "sandbox" ? "sandbox/testnet" : "production"} connection`,
    credentialStorageState: "metadata_only",
    permissionVerification: "passed",
    withdrawalPermission: "confirmed_disabled",
    keyFingerprint,
    lastVerifiedAt: isoMinutes(-15),
    lastHealthCheckAt: isoMinutes(-10),
    supportSafeMessage: "Connection metadata only; no API secrets are shown.",
    createdAt: isoMinutes(-320),
    updatedAt
  };
}

export function signalDoc(signalId, overrides = {}) {
  return {
    signalId,
    workspaceId: ids.workspaceId,
    market: "crypto",
    pair: "BTCUSDT",
    direction: "buy",
    entry: "100",
    takeProfit: "110",
    stopLoss: "95",
    riskLabel: "medium",
    deliveryMode: "alerts_only",
    status: "published",
    notes: "Crypto Auto-Copy paper signal.",
    createdAt: isoMinutes(-90),
    updatedAt: isoMinutes(-80),
    publishedAt: isoMinutes(-80),
    ...overrides
  };
}

export function riskDecisionDoc({
  decisionId,
  intentId,
  signalId,
  studentId,
  connectionId = "none",
  status,
  blockedReason,
  failedCheckKey
}) {
  return {
    decisionId,
    workspaceId: ids.workspaceId,
    intentId,
    signalId,
    studentId,
    connectionId,
    status,
    checks: [
      {
        key: failedCheckKey ?? "entitlement_auto_copy",
        status: status === "allowed" ? "allowed" : "blocked",
        message: blockedReason ?? "Paper Auto-Copy check."
      }
    ],
    ...(blockedReason ? { blockedReason } : {}),
    decidedAt: isoMinutes(-70),
    decidedBy: "stage15f-qa-risk-engine"
  };
}

export function intentDoc({
  intentId,
  signalId,
  studentId,
  connectionId,
  exchange,
  symbol,
  side,
  riskDecisionId,
  status = "ready_for_paper",
  paperTradingOnly = true,
  updatedAt = isoMinutes(-60)
}) {
  return {
    intentId,
    workspaceId: ids.workspaceId,
    signalId,
    studentId,
    connectionId,
    exchange,
    market: "crypto",
    symbol,
    side,
    orderType: "limit",
    status,
    idempotencyKey: `stage15f:${intentId}`,
    sourceSignalVersion: updatedAt,
    riskDecisionId,
    paperTradingOnly,
    entitlementSnapshot: {
      tierId: "pro_auto_copy",
      tierLabel: "Pro Auto-Copy",
      subscriptionStatus: "active",
      riskPosture: "personal_account",
      autoCopyAccess: "allowed"
    },
    createdAt: isoMinutes(-65),
    updatedAt,
    expiresAt: isoMinutes(60 * 24 * 7)
  };
}

export function orderAttemptDoc({
  orderAttemptId,
  intentId,
  signalId,
  studentId,
  connectionId,
  exchange,
  symbol,
  side,
  status = "filled",
  updatedAt = isoMinutes(-45)
}) {
  return {
    orderAttemptId,
    workspaceId: ids.workspaceId,
    intentId,
    signalId,
    studentId,
    connectionId,
    exchange,
    executionMode: "paper",
    symbol,
    side,
    orderType: "limit",
    status,
    idempotencyKey: `stage15f:${intentId}:attempt:1`,
    attemptNumber: 1,
    requestedPrice: "100",
    requestedAt: isoMinutes(-46),
    acknowledgedAt: updatedAt,
    completedAt: updatedAt,
    updatedAt
  };
}

export function auditEventDoc(eventId, overrides = {}) {
  return {
    eventId,
    action: "routing.completed",
    actorType: "system",
    actorId: "stage15f-seed",
    workspaceId: ids.workspaceId,
    targetType: "signal",
    targetId: ids.signals.buyValid,
    safeMessage: "Paper Auto-Copy audit event.",
    severity: "info",
    createdAt: STAGE15F_FIXED_NOW,
    ...overrides
  };
}
