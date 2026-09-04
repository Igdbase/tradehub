import { createHash } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "trade-hub-4d8df";
const FIXED_NOW = "2026-08-24T12:00:00.000Z";
const DEFAULT_PASSWORD = "TradeHubDemo!123";

const DEMO_CRYPTO_SPOT_ASSETS = [
  ["BTCUSDT", "Bitcoin / Tether"], ["ETHUSDT", "Ethereum / Tether"], ["BNBUSDT", "BNB / Tether"],
  ["SOLUSDT", "Solana / Tether"], ["XRPUSDT", "XRP / Tether"], ["ADAUSDT", "Cardano / Tether"],
  ["DOGEUSDT", "Dogecoin / Tether"], ["TRXUSDT", "TRON / Tether"], ["AVAXUSDT", "Avalanche / Tether"],
  ["LINKUSDT", "Chainlink / Tether"], ["DOTUSDT", "Polkadot / Tether"], ["LTCUSDT", "Litecoin / Tether"],
  ["BCHUSDT", "Bitcoin Cash / Tether"], ["NEARUSDT", "NEAR Protocol / Tether"], ["UNIUSDT", "Uniswap / Tether"],
  ["AAVEUSDT", "Aave / Tether"], ["ATOMUSDT", "Cosmos / Tether"], ["ETCUSDT", "Ethereum Classic / Tether"],
  ["FILUSDT", "Filecoin / Tether"], ["ICPUSDT", "Internet Computer / Tether"], ["APTUSDT", "Aptos / Tether"],
  ["ARBUSDT", "Arbitrum / Tether"], ["OPUSDT", "Optimism / Tether"], ["SUIUSDT", "Sui / Tether"],
  ["INJUSDT", "Injective / Tether"], ["ALGOUSDT", "Algorand / Tether"], ["VETUSDT", "VeChain / Tether"],
  ["XLMUSDT", "Stellar / Tether"], ["HBARUSDT", "Hedera / Tether"], ["TONUSDT", "Toncoin / Tether"],
  ["POLUSDT", "Polygon Ecosystem Token / Tether"], ["RUNEUSDT", "THORChain / Tether"],
  ["FETUSDT", "Artificial Superintelligence Alliance / Tether"], ["RENDERUSDT", "Render / Tether"],
  ["STXUSDT", "Stacks / Tether"], ["IMXUSDT", "Immutable / Tether"], ["LDOUSDT", "Lido DAO / Tether"],
  ["GRTUSDT", "The Graph / Tether"], ["THETAUSDT", "Theta Network / Tether"], ["ARUSDT", "Arweave / Tether"],
  ["SANDUSDT", "The Sandbox / Tether"], ["MANAUSDT", "Decentraland / Tether"],
  ["AXSUSDT", "Axie Infinity / Tether"], ["CHZUSDT", "Chiliz / Tether"], ["KAVAUSDT", "Kava / Tether"],
  ["ZECUSDT", "Zcash / Tether"], ["IOTAUSDT", "IOTA / Tether"], ["FLOWUSDT", "Flow / Tether"],
  ["EGLDUSDT", "MultiversX / Tether"], ["QNTUSDT", "Quant / Tether"]
];

const ids = {
  adminId: "super_admin_demo_tradehub",
  workspaces: {
    launch: "ws_demo_launch",
    pro: "ws_demo_pro",
    enterprise: "ws_demo_enterprise"
  },
  influencers: {
    launch: "influencer_demo_launch",
    pro: "influencer_demo_pro",
    enterprise: "influencer_demo_enterprise"
  },
  students: {
    active: "student_demo_active",
    pending: "student_demo_pending_onboarding",
    paymentIssue: "student_demo_payment_access_issue"
  },
  courseId: "course_demo_foundations",
  playbookId: "playbook_demo_breakout",
  practiceSessionId: "practice_demo_closed_session",
  klineChartSpikeSessionId: "practice_demo_klinechart_spike",
  practiceOrderId: "practice_order_demo_closed_win",
  assignmentId: "assignment_demo_btc_replay",
  cohortId: "cohort_demo_core_students",
  feedbackId: "feedback_demo_assignment_review",
  notificationStateId: "current",
  manualTrades: {
    win: "manual_aaaaaaaaaaaaaaaaaaaaaaaa",
    loss: "manual_bbbbbbbbbbbbbbbbbbbbbbbb",
    open: "manual_cccccccccccccccccccccccc"
  },
  connectedLedger: {
    paper: "journal_demo_crypto_paper_excluded",
    testnet: "journal_demo_crypto_testnet_excluded",
    demo: "journal_demo_forex_demo_excluded",
    unconfirmed: "journal_demo_production_unconfirmed_excluded"
  },
  integrationRequestId: "enterprise_request_demo_crm_sync"
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function configureEmulatorSafety() {
  if (process.env.TRADEHUB_ALLOW_LIVE_DEMO_SEED === "true") {
    fail("Demo seed refuses live Firebase writes. Use the local Firebase emulators.");
  }

  process.env.GCLOUD_PROJECT ||= PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: PROJECT_ID });
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
}

function isoMinutes(offset) {
  return new Date(Date.parse(FIXED_NOW) + offset * 60_000).toISOString();
}

function maskedRef(prefix, value) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 10)}`;
}

function practiceHistoricalCacheId({
  provider,
  assetClass,
  symbol,
  providerSymbol,
  timeframeMinutes,
  rangeStart,
  rangeEnd
}) {
  const raw = [provider, assetClass, symbol, providerSymbol, String(timeframeMinutes), rangeStart, rangeEnd].join(":");
  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 20);

  return `${provider}_${assetClass}_${symbol}_${timeframeMinutes}_${digest}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    );
  }

  return value;
}

function workspaceDoc({ workspaceId, ownerId, tier, name, handle, activeCount }) {
  const seatCap = tier === "launch" ? 50 : tier === "pro" ? 500 : null;

  return {
    workspaceId,
    handle,
    name,
    ownerId,
    ownerEmail: `${ownerId}@example.test`,
    ownerDisplayName: `${name} Owner`,
    summary: `Demo ${name} workspace with package-safe local data.`,
    marketFocus: "both",
    branding: {
      logoMark: tier === "enterprise" ? "ENT" : tier.toUpperCase().slice(0, 3),
      logoUrl: "https://assets.example.test/tradehub-demo-logo.png",
      primaryColor: "locked_tradehub_surface",
      accentColor: "accent",
      heroLabel: `${name} Demo Workspace`,
      brandingMode: tier === "launch" ? "tradehub_branded" : tier === "pro" ? "co_branded" : "white_label_ready",
      displayName: name,
      studentFacingBrandVisibilityStatus:
        tier === "launch" ? "tradehub_visible" : tier === "pro" ? "co_brand_visible" : "custom_review",
      customDomainStatus: tier === "enterprise" ? "requested" : "not_configured",
      requestedDomainHostname: tier === "enterprise" ? "academy.example.test" : undefined,
      dnsChecklistStatus: tier === "enterprise" ? "pending" : "not_started",
      adminReviewNote: "Demo metadata only. No upload, DNS, SSL, hosting, or provider automation.",
      adminStatusReason: "stage28a_demo_seed",
      updatedAt: FIXED_NOW
    },
    tiers: [
      {
        tierId: "demo_core",
        name: "Demo Core Access",
        description: "Courses, practice, journal, assignments, and safe support visibility.",
        priceNgn: 0,
        billingPeriod: "monthly",
        features: ["course", "signalAlerts", "journal", "calculators"],
        featured: true
      }
    ],
    settings: {
      singleTier: true,
      freeTrialDays: 0,
      noCardRequired: true,
      refundPolicy: "Demo seed only. No payment collection is performed."
    },
    rails: [
      {
        rail: "paystack",
        status: tier === "launch" ? "pending_verification" : "enabled",
        label: "Demo Paystack visibility",
        settlementNote: "Demo metadata only; no payment provider call is made."
      },
      {
        rail: "solana",
        status: "disabled",
        label: "Solana disabled in demo",
        settlementNote: "No wallet transfer automation is seeded."
      }
    ],
    vettingStatus: "approved",
    solanaPayEnabled: false,
    solanaPartnerPlacementEnabled: false,
    platformSplitPercent: 10,
    packageLicense: {
      packageTier: tier,
      studentSeatCap: seatCap,
      licenseStatus: tier === "enterprise" ? "custom_review" : "active",
      supportWindowState: tier === "enterprise" ? "custom" : tier === "pro" ? "priority" : "standard",
      maintenanceState: tier === "launch" ? "current" : tier === "pro" ? "due_soon" : "custom_review",
      licenseStartDate: isoMinutes(-60 * 24 * 60),
      licenseTermType: tier === "enterprise" ? "custom" : "lifetime",
      includedSupportWindowStart: isoMinutes(-60 * 24 * 60),
      includedSupportWindowEnd: isoMinutes(60 * 24 * 300),
      maintenanceRenewalStatus: tier === "launch" ? "active" : tier === "pro" ? "due_soon" : "custom_review",
      maintenanceRenewalDueDate: isoMinutes(60 * 24 * 45),
      supportStatus: tier === "enterprise" ? "custom_review" : tier === "pro" ? "maintenance_due" : "included",
      adminStatusReason: "stage28a_demo_package_metadata",
      adminNoteSummary: "Demo package metadata only. No licence payment, invoice, or settlement automation.",
      lastReviewedAt: FIXED_NOW,
      updatedAt: FIXED_NOW
    },
    enterpriseDeployment: tier === "enterprise"
      ? {
          deploymentMode: "custom_contract",
          deploymentStatus: "scoping",
          slaStatus: "enterprise_sla_ready",
          backupRestoreStatus: "documented",
          dataResidencyStatus: "custom_review",
          adminReviewNote: "Demo Enterprise readiness metadata only. No infrastructure provisioning.",
          adminStatusReason: "stage28a_enterprise_demo",
          updatedAt: FIXED_NOW
        }
      : {
          deploymentMode: "shared_tradehub_cloud",
          deploymentStatus: "not_configured",
          slaStatus: "standard_support",
          backupRestoreStatus: "standard_platform",
          dataResidencyStatus: "not_requested",
          adminReviewNote: "Standard package uses shared TradeHub cloud in demo.",
          updatedAt: FIXED_NOW
        },
    codeOfConductAcceptedAt: isoMinutes(-60 * 24 * 55),
    riskDisclosureVersion: "demo-pack-v1",
    activeStudentCount: activeCount,
    createdAt: isoMinutes(-60 * 24 * 60),
    updatedAt: FIXED_NOW,
    activatedAt: isoMinutes(-60 * 24 * 55)
  };
}

function studentDoc({ workspaceId, studentId, status, displayName, subscriptionStatus }) {
  const demoEmails = {
    [ids.students.active]: "demo.student.active@example.test",
    [ids.students.pending]: "demo.student.pending@example.test",
    [ids.students.paymentIssue]: "demo.student.payment@example.test"
  };

  return {
    workspaceId,
    studentId,
    displayName,
    email: demoEmails[studentId] ?? "demo.student@example.test",
    tierId: "demo_core",
    tierLabel: "Demo Core Access",
    status,
    operationalStatus:
      status === "active"
        ? "active"
        : status === "pending_onboarding"
          ? "pending_onboarding"
          : "payment_access_issue",
    subscriptionStatus,
    paymentRail: "paystack",
    accountMode: "signal_alerts",
    autoCopyEligible: false,
    courseCompletionPercent: status === "active" ? 66 : 0,
    supportFollowUpNeeded: status !== "active",
    supportNoteSummary: status === "active"
      ? "Demo active student. No private notes are exposed to workspace users."
      : "Demo support follow-up summary only. No journal/trade/private data.",
    billingIssueStatus: status === "payment_access_issue" ? "verification_pending" : "access_active",
    joinedAt: isoMinutes(-60 * 24 * 30),
    lastSeenAt: isoMinutes(status === "active" ? -20 : -60 * 24 * 3),
    createdAt: isoMinutes(-60 * 24 * 30),
    updatedAt: FIXED_NOW
  };
}

function courseDoc(workspaceId) {
  return {
    courseId: ids.courseId,
    workspaceId,
    title: "Demo Trading Foundations",
    description: "A short demo course for browsing, lesson checks, resources, and proof flow.",
    thumbnailVideoId: "dQw4w9WgXcQ",
    accessTier: "all",
    published: true,
    status: "published",
    sections: [
      {
        sectionId: "section_demo_foundations",
        title: "Foundations",
        order: 1,
        lessons: [
          {
            lessonId: "lesson_demo_risk",
            title: "Risk Before Entry",
            notes: "Define invalidation, position size, and review plan before entering a trade.",
            order: 1,
            requiresPrevious: false,
            attachments: [
              {
                label: "Risk checklist",
                url: "https://example.test/tradehub-demo-risk-checklist",
                type: "lesson_resource",
                description: "Demo lesson reference for risk planning.",
                hostname: "example.test"
              }
            ],
            quiz: {
              required: true,
              passThresholdPercent: 80,
              questions: [
                {
                  type: "multiple_choice",
                  question: "What should be defined before entry?",
                  options: ["Risk and invalidation", "Broker password", "Webhook secret"],
                  correctIndex: 0
                }
              ]
            },
            requiresQuizPass: true,
            durationLabel: "8 min"
          },
          {
            lessonId: "lesson_demo_review",
            title: "Review The Trade",
            notes: "Record outcome, tags, emotions, and one lesson learned after the trade.",
            order: 2,
            requiresPrevious: true,
            attachments: [],
            requiresQuizPass: false,
            durationLabel: "6 min"
          }
        ]
      }
    ],
    createdAt: isoMinutes(-60 * 24 * 40),
    updatedAt: FIXED_NOW,
    publishedAt: isoMinutes(-60 * 24 * 35)
  };
}

function playbookDoc(workspaceId, studentId) {
  return {
    playbookId: ids.playbookId,
    workspaceId,
    studentId,
    name: "Demo Breakout Strategy",
    market: "crypto",
    strategyType: "breakout",
    setupRules: "Trade only after a clean range break and retest.",
    entryChecklist: ["Range marked", "Risk defined", "No revenge trade"],
    invalidationRules: "Close if price returns below the breakout range.",
    riskNotes: "Demo risk notes only. Practice remains simulated.",
    status: "active",
    description: "Demo Strategy for practice and journal review.",
    createdAt: isoMinutes(-60 * 24 * 10),
    updatedAt: FIXED_NOW
  };
}

function demoBtcPracticeInstrument() {
  return {
    canonicalSymbol: "BTCUSDT",
    assetClass: "crypto",
    displayName: "Bitcoin / Tether",
    category: "crypto_spot",
    pricePrecision: 2,
    quantityPrecision: 5,
    quantityStep: 0.00001,
    quantityLabel: "Qty",
    tickSize: 0.01,
    pipSize: 0.01,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: 0.00001,
    maxSimulatedSize: 1_000_000,
    minSimulatedNotional: 5,
    maxSimulatedNotional: 10_000_000,
    safeMessage: "Available for simulated practice. Values are practice estimates and may differ from an exchange."
  };
}

function demoCryptoSpotCatalogueDoc() {
  const instruments = DEMO_CRYPTO_SPOT_ASSETS.map(([symbol, displayName]) => {
    const isLink = symbol === "LINKUSDT";
    const isLargeCap = ["BTCUSDT", "ETHUSDT", "BNBUSDT"].includes(symbol);
    const pricePrecision = isLink ? 3 : isLargeCap ? 2 : 4;
    const quantityPrecision = isLink ? 2 : isLargeCap ? 5 : 2;
    const tickSize = 10 ** -pricePrecision;
    const minSimulatedSize = 10 ** -quantityPrecision;

    return {
      symbol,
      displayName,
      assetClass: "crypto",
      category: "crypto",
      available: true,
      safeMessage: "Available for simulated practice. Values are practice estimates and may differ from an exchange.",
      instrument: {
        canonicalSymbol: symbol,
        assetClass: "crypto",
        displayName,
        category: "crypto_spot",
        pricePrecision,
        quantityPrecision,
        quantityStep: minSimulatedSize,
        quantityLabel: "Qty",
        tickSize,
        pipSize: tickSize,
        pipLabel: "tick",
        contractMultiplier: 1,
        minSimulatedSize,
        maxSimulatedSize: 1_000_000,
        minSimulatedNotional: 5,
        maxSimulatedNotional: 10_000_000,
        safeMessage: "Available for simulated practice. Values are practice estimates and may differ from an exchange."
      }
    };
  });

  return {
    cacheVersion: 1,
    instruments,
    verifiedAt: FIXED_NOW,
    expiresAt: "2099-01-01T00:00:00.000Z",
    demoSeed: true
  };
}

function practiceHistoricalCacheDoc({
  symbol = "BTCUSDT",
  basePrice = 60000,
  tickSize = 0.01,
  provider = "binance",
  assetClass = "crypto",
  providerSymbol = symbol,
  candleCount = 24,
  rangeStart = "2026-07-01T00:00:00.000Z"
} = {}) {
  const timeframeMinutes = 60;
  const startMs = Date.parse(rangeStart);
  const boundedCandleCount = Math.min(96, Math.max(24, Math.floor(candleCount)));
  const rangeEnd = new Date(startMs + boundedCandleCount * timeframeMinutes * 60_000).toISOString();
  const tickPrecision = Math.min(8, Math.max(0, String(tickSize).split(".")[1]?.length ?? 0));
  const quantizePrice = (value) => Number((Math.round(value / tickSize) * tickSize).toFixed(tickPrecision));
  const candles = Array.from({ length: boundedCandleCount }, (_, index) => {
    const openTimeMs = startMs + index * timeframeMinutes * 60_000;
    const movement = Math.max(tickSize, basePrice * 0.0005);
    const open = quantizePrice(basePrice + index * movement);
    const close = quantizePrice(open + (index % 3 === 0 ? movement * 1.6 : -movement * 0.6));
    const high = quantizePrice(Math.max(open, close) + movement * 1.2);
    const low = quantizePrice(Math.min(open, close) - movement);

    return {
      openTime: new Date(openTimeMs).toISOString(),
      closeTime: new Date(openTimeMs + timeframeMinutes * 60_000 - 1).toISOString(),
      open,
      high: Math.max(open, close, high),
      low: Math.min(open, close, low),
      close,
      volume: 100 + index,
      provider,
      assetClass,
      symbol,
      providerSymbol,
      timeframeMinutes
    };
  });
  const cacheId = practiceHistoricalCacheId({
    provider,
    assetClass,
    symbol,
    providerSymbol,
    timeframeMinutes,
    rangeStart,
    rangeEnd
  });

  return {
    cacheId,
    provider,
    assetClass,
    symbol,
    providerSymbol,
    timeframeMinutes,
    rangeStart,
    rangeEnd,
    candles,
    fetchedAt: FIXED_NOW,
    expiresAt: "2099-01-01T00:00:00.000Z",
    cacheVersion: 1
  };
}

function klineChartSpikeSessionDoc(workspaceId, studentId) {
  const session = {
    ...practiceSessionDoc(workspaceId, studentId),
    sessionId: ids.klineChartSpikeSessionId,
    sessionName: "Internal KLineChart Feasibility Spike",
    status: "active",
    currentCandleIndex: 23,
    dateStart: "2026-07-05T00:00:00.000Z",
    dateEnd: "2026-07-08T00:00:00.000Z",
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW
  };

  delete session.assignmentId;
  delete session.reflection;
  delete session.completedAt;

  return session;
}

function practiceSessionDoc(workspaceId, studentId) {
  return {
    sessionId: ids.practiceSessionId,
    workspaceId,
    studentId,
    sessionName: "BTCUSDT Demo Replay",
    assetClass: "crypto",
    platformSource: "binance",
    symbol: "BTCUSDT",
    instrument: demoBtcPracticeInstrument(),
    timeframeMinutes: 60,
    dateStart: "2026-07-01T00:00:00.000Z",
    dateEnd: "2026-07-03T00:00:00.000Z",
    startingBalance: 100000,
    riskPct: 1,
    feeBps: 4,
    spreadBps: 2,
    slippageBps: 2,
    playbookId: ids.playbookId,
    assignmentId: ids.assignmentId,
    assignmentAttemptNumber: 1,
    status: "completed",
    currentCandleIndex: 30,
    reflection: {
      rating: 4,
      summary: "Demo reflection: followed the plan and reviewed the exit.",
      mainLesson: "Wait for confirmation before adding size.",
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW
    },
    challenge: {
      enabled: true,
      challengeName: "Demo 10 Percent Challenge",
      startingBalance: 100000,
      profitTargetPercent: 10,
      maxDailyLossPercent: 5,
      maxTotalDrawdownPercent: 10,
      maxOpenSimulatedTrades: 3,
      maxTradesPerSession: 20,
      notes: "Demo challenge metadata."
    },
    challengeResult: {
      enabled: true,
      status: "active",
      challengeName: "Demo 10 Percent Challenge",
      startingBalance: 100000,
      currentEquity: 101500,
      netPnl: 1500,
      profitTargetAmount: 10000,
      profitTargetProgress: 15,
      maxDailyLossAmount: 5000,
      dailyLossUsage: 0,
      maxTotalDrawdownAmount: 10000,
      drawdownUsage: 0,
      openTrades: 0,
      maxOpenSimulatedTrades: 3,
      tradesUsed: 1,
      maxTradesPerSession: 20,
      tradesToday: 1,
      tradingDays: 1,
      breachCodes: [],
      breachMessages: [],
      safeMessage: "Demo challenge uses simulated practice orders only.",
      evaluatedAt: FIXED_NOW
    },
    createdAt: isoMinutes(-60 * 24 * 4),
    updatedAt: FIXED_NOW,
    completedAt: isoMinutes(-60 * 24)
  };
}

function practiceOrderDoc(workspaceId, studentId) {
  return {
    orderId: ids.practiceOrderId,
    sessionId: ids.practiceSessionId,
    workspaceId,
    studentId,
    playbookId: ids.playbookId,
    symbol: "BTCUSDT",
    assetClass: "crypto",
    instrument: demoBtcPracticeInstrument(),
    direction: "buy",
    orderType: "market",
    status: "closed",
    requestedPrice: 60000,
    filledPrice: 60000,
    entryPrice: 60000,
    exitPrice: 61500,
    quantity: 1,
    size: 1,
    initialSize: 1,
    remainingSize: 0,
    closedSize: 1,
    stopLoss: 59000,
    takeProfit: 61500,
    notional: 60000,
    pnl: 1500,
    realizedPnl: 1500,
    rMultiple: 1.5,
    fees: 24,
    openCandleIndex: 12,
    closeCandleIndex: 24,
    openedAt: isoMinutes(-60 * 24 * 2),
    closedAt: isoMinutes(-60 * 24),
    checklistNotes: "Demo closed simulated trade. No live order was placed.",
    terminalNote: "Practice-only demo order.",
    createdAt: isoMinutes(-60 * 24 * 2),
    updatedAt: FIXED_NOW
  };
}

function manualTradeDoc(workspaceId, studentId, tradeId, overrides) {
  return {
    tradeId,
    workspaceId,
    studentId,
    market: "crypto",
    symbol: "BTCUSDT",
    side: "buy_long",
    status: "closed",
    entryPrice: 60000,
    exitPrice: 61500,
    quantity: 0.1,
    stopLoss: 59000,
    takeProfit: 61500,
    fees: 2,
    openedAt: isoMinutes(-60 * 24 * 6),
    closedAt: isoMinutes(-60 * 24 * 5),
    strategyName: "Demo Breakout",
    tags: ["demo", "breakout"],
    emotion: "patient",
    mistakeCategory: "",
    setupQuality: "a",
    notes: "Private demo manual trade note. Student-owned only.",
    lessonLearned: "Let winners reach planned target.",
    grossPnl: 150,
    netPnl: 148,
    riskAmount: 100,
    rMultiple: 1.48,
    outcome: "win",
    createdAt: isoMinutes(-60 * 24 * 6),
    updatedAt: FIXED_NOW,
    ...overrides
  };
}

function assignmentDoc(workspaceId) {
  return {
    assignmentId: ids.assignmentId,
    workspaceId,
    title: "Demo BTCUSDT Replay Drill",
    description: "Complete one simulated BTCUSDT replay and submit a short reflection.",
    assetClass: "crypto",
    symbol: "BTCUSDT",
    timeframeMinutes: 60,
    dateStart: "2026-07-01T00:00:00.000Z",
    dateEnd: "2026-07-03T00:00:00.000Z",
    randomStartEnabled: false,
    startingBalance: 100000,
    riskPct: 1,
    suggestedPlaybook: {
      name: "Demo Breakout Strategy",
      strategyType: "breakout",
      setupRules: "Wait for range break and retest.",
      entryChecklist: ["Range", "Risk", "Review"],
      invalidationRules: "Breakout failed.",
      riskNotes: "Practice-only drill."
    },
    availabilityStartDate: isoMinutes(-60 * 24 * 10),
    dueDate: isoMinutes(60 * 24 * 7),
    closeDate: isoMinutes(60 * 24 * 30),
    targetCohortIds: [ids.cohortId],
    status: "active",
    createdAt: isoMinutes(-60 * 24 * 10),
    updatedAt: FIXED_NOW
  };
}

async function upsertUser(auth, user) {
  try {
    await auth.updateUser(user.uid, {
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      emailVerified: true,
      disabled: false
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && error.code === "auth/user-not-found") {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
        disabled: false
      });
    } else {
      throw error;
    }
  }

  await auth.setCustomUserClaims(user.uid, user.claims);
}

function batchSet(batch, db, docPath, data) {
  batch.set(db.doc(docPath), stripUndefined(data), { merge: true });
}

configureEmulatorSafety();

const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);
const batch = db.batch();

const users = [
  {
    uid: ids.adminId,
    email: "demo.superadmin@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Demo Super Admin",
    claims: { role: "super_admin" }
  },
  {
    uid: ids.influencers.launch,
    email: "demo.launch.influencer@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Launch Demo Influencer",
    claims: { role: "influencer", workspaceId: ids.workspaces.launch }
  },
  {
    uid: ids.influencers.pro,
    email: "demo.pro.influencer@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Pro Demo Influencer",
    claims: { role: "influencer", workspaceId: ids.workspaces.pro }
  },
  {
    uid: ids.influencers.enterprise,
    email: "demo.enterprise.influencer@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Enterprise Demo Influencer",
    claims: { role: "influencer", workspaceId: ids.workspaces.enterprise }
  },
  {
    uid: ids.students.active,
    email: "demo.student.active@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Demo Active Student",
    claims: { role: "student", workspaceId: ids.workspaces.pro, studentId: ids.students.active, tierId: "demo_core" }
  },
  {
    uid: ids.students.pending,
    email: "demo.student.pending@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Demo Pending Student",
    claims: { role: "student", workspaceId: ids.workspaces.launch, studentId: ids.students.pending, tierId: "demo_core" }
  },
  {
    uid: ids.students.paymentIssue,
    email: "demo.student.payment@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Demo Payment Issue Student",
    claims: { role: "student", workspaceId: ids.workspaces.pro, studentId: ids.students.paymentIssue, tierId: "demo_core" }
  }
];

for (const user of users) {
  await upsertUser(auth, user);
}

const workspaceInputs = [
  {
    workspaceId: ids.workspaces.launch,
    ownerId: ids.influencers.launch,
    tier: "launch",
    name: "Launch Demo Academy",
    handle: "demo-launch",
    activeCount: 1
  },
  {
    workspaceId: ids.workspaces.pro,
    ownerId: ids.influencers.pro,
    tier: "pro",
    name: "Pro Demo Academy",
    handle: "demo-pro",
    activeCount: 2
  },
  {
    workspaceId: ids.workspaces.enterprise,
    ownerId: ids.influencers.enterprise,
    tier: "enterprise",
    name: "Enterprise Demo Academy",
    handle: "demo-enterprise",
    activeCount: 0
  }
];

for (const workspace of workspaceInputs) {
  batchSet(batch, db, `workspaces/${workspace.workspaceId}`, workspaceDoc(workspace));
  batchSet(batch, db, `workspaces/${workspace.workspaceId}/dashboard/current`, {
    workspaceId: workspace.workspaceId,
    ownerApprovalStatus: "approved",
    activeStudentCount: workspace.activeCount,
    trialingStudentCount: workspace.tier === "launch" ? 1 : 0,
    pastDueStudentCount: workspace.tier === "pro" ? 1 : 0,
    monthlyGrossRevenueNgn: 0,
    monthlyInfluencerRevenueNgn: 0,
    monthlyPlatformRevenueNgn: 0,
    healthStatus: "demo_ready",
    updatedAt: FIXED_NOW
  });
}

const students = [
  {
    workspaceId: ids.workspaces.pro,
    studentId: ids.students.active,
    status: "active",
    displayName: "Demo Active Student",
    subscriptionStatus: "active"
  },
  {
    workspaceId: ids.workspaces.launch,
    studentId: ids.students.pending,
    status: "pending_onboarding",
    displayName: "Demo Pending Student",
    subscriptionStatus: "payment_pending"
  },
  {
    workspaceId: ids.workspaces.pro,
    studentId: ids.students.paymentIssue,
    status: "payment_access_issue",
    displayName: "Demo Payment Support Student",
    subscriptionStatus: "past_due"
  }
];

for (const student of students) {
  batchSet(batch, db, `workspaces/${student.workspaceId}/students/${student.studentId}`, studentDoc(student));
  batchSet(batch, db, `workspaces/${student.workspaceId}/students/${student.studentId}/subscriptions/current`, {
    subscriptionId: "current",
    workspaceId: student.workspaceId,
    studentId: student.studentId,
    status: student.subscriptionStatus,
    rail: "paystack",
    tierId: "demo_core",
    tierLabel: "Demo Core Access",
    amountNgn: 0,
    currency: "NGN",
    supportSafeRef: maskedRef("subscription", `${student.workspaceId}:${student.studentId}`),
    updatedAt: FIXED_NOW
  });
}

const proWorkspaceId = ids.workspaces.pro;
const activeStudentId = ids.students.active;
const maskedStudentId = maskedRef("student", `${proWorkspaceId}:${activeStudentId}`);
const maskedSessionRef = maskedRef("session", `${proWorkspaceId}:${activeStudentId}:${ids.practiceSessionId}`);

batchSet(batch, db, "platform_practice_crypto_catalogue/current", demoCryptoSpotCatalogueDoc());

batchSet(batch, db, `workspaces/${proWorkspaceId}/courses/${ids.courseId}`, courseDoc(proWorkspaceId));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/course_progress/${ids.courseId}`, {
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  courseId: ids.courseId,
  completedLessonCount: 1,
  lessonCount: 2,
  overallPercent: 50,
  lastLessonId: "lesson_demo_review",
  updatedAt: FIXED_NOW
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/lesson_progress/lesson_demo_risk`, {
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  courseId: ids.courseId,
  lessonId: "lesson_demo_risk",
  watchedPercent: 100,
  completed: true,
  quizScore: 100,
  quizPassed: true,
  startedAt: isoMinutes(-60 * 24 * 2),
  completedAt: isoMinutes(-60 * 24),
  lastWatched: FIXED_NOW
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/course_lesson_bookmarks/bookmark_demo_risk`, {
  bookmarkId: "bookmark_demo_risk",
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  courseId: ids.courseId,
  lessonId: "lesson_demo_risk",
  label: "Review risk checklist",
  positionLabel: "00:04",
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW
});

batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/playbooks/${ids.playbookId}`, playbookDoc(proWorkspaceId, activeStudentId));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_sessions/${ids.practiceSessionId}`, practiceSessionDoc(proWorkspaceId, activeStudentId));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_sessions/${ids.klineChartSpikeSessionId}`, klineChartSpikeSessionDoc(proWorkspaceId, activeStudentId));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_orders/${ids.practiceOrderId}`, practiceOrderDoc(proWorkspaceId, activeStudentId));
const practiceCache = practiceHistoricalCacheDoc();
batchSet(batch, db, `workspaces/${proWorkspaceId}/historical_candle_cache/${practiceCache.cacheId}`, practiceCache);
const klineChartSpikeCache = practiceHistoricalCacheDoc({
  candleCount: 72,
  rangeStart: "2026-07-05T00:00:00.000Z"
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/historical_candle_cache/${klineChartSpikeCache.cacheId}`, klineChartSpikeCache);
const linkPracticeCache = practiceHistoricalCacheDoc({ symbol: "LINKUSDT", basePrice: 24, tickSize: 0.001 });
batchSet(batch, db, `workspaces/${proWorkspaceId}/historical_candle_cache/${linkPracticeCache.cacheId}`, linkPracticeCache);
const ethPracticeCache = practiceHistoricalCacheDoc({ symbol: "ETHUSDT", basePrice: 4680, tickSize: 0.01 });
batchSet(batch, db, `workspaces/${proWorkspaceId}/historical_candle_cache/${ethPracticeCache.cacheId}`, ethPracticeCache);
const eurGbpPracticeCache = practiceHistoricalCacheDoc({
  symbol: "EURGBP",
  basePrice: 0.855,
  tickSize: 0.00001,
  provider: "metaapi_mt5",
  assetClass: "forex_cfd"
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/historical_candle_cache/${eurGbpPracticeCache.cacheId}`, eurGbpPracticeCache);
const usOilPracticeCache = practiceHistoricalCacheDoc({
  symbol: "USOIL",
  basePrice: 80,
  tickSize: 0.001,
  provider: "metaapi_mt5",
  assetClass: "forex_cfd"
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/historical_candle_cache/${usOilPracticeCache.cacheId}`, usOilPracticeCache);
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_annotations/annotation_demo_lesson`, {
  annotationId: "annotation_demo_lesson",
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  sessionId: ids.practiceSessionId,
  kind: "text_note",
  candleIndex: 18,
  price: 61000,
  label: "Demo main lesson",
  text: "Wait for candle close before entry.",
  colorToken: "accent",
  mainLesson: true,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_bookmarks/bookmark_demo_breakout`, {
  bookmarkId: "bookmark_demo_breakout",
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  sessionId: ids.practiceSessionId,
  candleIndex: 16,
  label: "Breakout candle",
  price: 60800,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW
});

batchSet(batch, db, `workspaces/${proWorkspaceId}/practice_cohorts/${ids.cohortId}`, {
  cohortId: ids.cohortId,
  workspaceId: proWorkspaceId,
  name: "Demo Core Students",
  description: "Demo cohort with safe student refs only.",
  status: "active",
  studentRefs: [maskedStudentId],
  safeMessage: "Cohort stores safe demo refs only.",
  createdAt: isoMinutes(-60 * 24 * 12),
  updatedAt: FIXED_NOW
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/practice_assignments/${ids.assignmentId}`, assignmentDoc(proWorkspaceId));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_instructor_feedback/${ids.feedbackId}`, {
  feedbackId: ids.feedbackId,
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  assignmentId: ids.assignmentId,
  sessionId: ids.practiceSessionId,
  feedbackTargetRef: maskedRef("feedback_target", `${ids.assignmentId}:${ids.practiceSessionId}`),
  maskedStudentId,
  maskedSessionRef,
  reviewerId: ids.influencers.pro,
  reviewerDisplayLabel: "Demo Instructor",
  status: "reviewed",
  publicationStatus: "published",
  rubric: {
    setupQuality: 4,
    riskManagement: 4,
    executionDiscipline: 3,
    reviewQuality: 4,
    overallScore: 4
  },
  feedbackNote: "Good risk definition. Keep notes shorter and more specific.",
  recommendedNextDrill: "Repeat the breakout drill with stricter confirmation.",
  reviewedAt: FIXED_NOW,
  publishedAt: FIXED_NOW,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  safeMessage: "Published demo feedback is assignment-scoped and support-safe."
});
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/practice_notification_state/${ids.notificationStateId}`, {
  workspaceId: proWorkspaceId,
  studentId: activeStudentId,
  dismissedNotificationIds: [],
  readNotificationIds: ["notification_demo_assignment_available"],
  updatedAt: FIXED_NOW
});

batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/manual_journal_trades/${ids.manualTrades.win}`, manualTradeDoc(proWorkspaceId, activeStudentId, ids.manualTrades.win, {}));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/manual_journal_trades/${ids.manualTrades.loss}`, manualTradeDoc(proWorkspaceId, activeStudentId, ids.manualTrades.loss, {
  symbol: "ETHUSDT",
  side: "sell_short",
  entryPrice: 3100,
  exitPrice: 3180,
  quantity: 1,
  stopLoss: 3160,
  takeProfit: 2950,
  fees: 3,
  grossPnl: -80,
  netPnl: -83,
  riskAmount: 60,
  rMultiple: -1.3833,
  outcome: "loss",
  emotion: "impatient",
  mistakeCategory: "entered_early",
  setupQuality: "c",
  notes: "Private demo loss note. Student-owned only.",
  lessonLearned: "Do not enter before the level confirms."
}));
batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/manual_journal_trades/${ids.manualTrades.open}`, manualTradeDoc(proWorkspaceId, activeStudentId, ids.manualTrades.open, {
  market: "forex",
  symbol: "EURUSD",
  status: "open",
  entryPrice: 1.085,
  exitPrice: undefined,
  quantity: 10000,
  stopLoss: 1.08,
  takeProfit: 1.095,
  fees: 0,
  grossPnl: undefined,
  netPnl: undefined,
  riskAmount: 50,
  rMultiple: undefined,
  outcome: "open",
  tags: ["demo", "forex"],
  notes: "Open demo trade with no exit yet.",
  lessonLearned: ""
}));

for (const [ledgerEntryId, record] of [
  [ids.connectedLedger.paper, { source: "crypto_autocopy", assetClass: "crypto", executionMode: "paper", environment: "paper", status: "filled", symbol: "BTCUSDT", side: "buy", providerConfirmed: false }],
  [ids.connectedLedger.testnet, { source: "crypto_autocopy", assetClass: "crypto", executionMode: "testnet", environment: "testnet", status: "filled", symbol: "ETHUSDT", side: "sell", providerConfirmed: true }],
  [ids.connectedLedger.demo, { source: "forex_autocopy", assetClass: "forex", executionMode: "demo", environment: "demo", status: "filled", symbol: "EURUSD", side: "buy", providerConfirmed: true }],
  [ids.connectedLedger.unconfirmed, { source: "crypto_autocopy", assetClass: "crypto", executionMode: "production_gated", environment: "production", status: "filled", symbol: "SOLUSDT", side: "buy", providerConfirmed: false }]
]) {
  batchSet(batch, db, `workspaces/${proWorkspaceId}/students/${activeStudentId}/account_linked_trade_ledger/${ledgerEntryId}`, {
    ledgerEntryId,
    workspaceId: proWorkspaceId,
    studentId: activeStudentId,
    sourceRecordId: `internal_${ledgerEntryId}`,
    visibility: "private",
    safeBrokerOrExchangeLabel: "Demo exclusion fixture",
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...record
  });
}

batchSet(batch, db, `workspaces/${ids.workspaces.enterprise}/enterprise_integration_requests/${ids.integrationRequestId}`, {
  requestId: ids.integrationRequestId,
  workspaceId: ids.workspaces.enterprise,
  category: "crm",
  status: "triage",
  priority: "high",
  title: "Demo CRM student status sync",
  description: "Demo Enterprise request metadata only. No adapter or credential collection.",
  requestedProviderLabel: "Demo CRM",
  requestedProviderHostname: "crm.example.test",
  dataSensitivityFlags: ["student_profile", "billing_status"],
  securityReviewRequired: true,
  legalSlaDependency: true,
  estimatedComplexity: "custom",
  workspaceVisibleNote: "Demo request is under review.",
  adminNoteSummary: "No provider call, webhook secret, API key, private URL, or adapter is stored.",
  requestedByRef: maskedRef("workspace_owner", ids.influencers.enterprise),
  createdAt: isoMinutes(-60 * 24 * 3),
  updatedAt: FIXED_NOW
});

batchSet(batch, db, "platform_demo_seed/status", {
  seedId: "stage28a_demo_seed",
  deterministic: true,
  seededWorkspaceIds: Object.values(ids.workspaces),
  seededStudentIds: Object.values(ids.students),
  seededAt: FIXED_NOW,
  safeMessage: "Demo seed contains safe metadata only. No credentials, provider payloads, public prices, or live execution state. Trade Copier remains a separate optional add-on."
});

await batch.commit();

console.log("Stage 28A demo data seeded into local Firebase emulators.");
console.log(`Project: ${PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
console.log(`Auth emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
console.log(`Password for all demo users: ${DEFAULT_PASSWORD}`);
console.log("Demo users:");
for (const user of users) {
  console.log(`  ${user.email} -> ${JSON.stringify(user.claims)}`);
}
