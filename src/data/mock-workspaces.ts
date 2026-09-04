import type { Workspace } from "@/types/tradehub";

export const mockWorkspaces: Workspace[] = [
  {
    workspaceId: "ws_apexfx",
    handle: "apexfx",
    name: "Apex FX",
    ownerId: "infl_apex_001",
    ownerDisplayName: "Maya Adeyemi",
    summary:
      "Forex education, signal delivery, and prop-firm-safe student routing built around London and New York session structure.",
    marketFocus: "forex",
    branding: {
      logoMark: "AF",
      logoUrl: "/branding/apexfx-mark.svg",
      primaryColor: "#0a0a0a",
      accentColor: "#d9c28c",
      heroLabel: "Session precision",
      telegramBotHandle: "@ApexFXBot"
    },
    tiers: [
      {
        tierId: "tier_apex_starter",
        name: "Starter",
        description: "Course access for foundations and recap lessons.",
        priceNgn: 5000,
        billingPeriod: "monthly",
        features: ["course", "calculators"]
      },
      {
        tierId: "tier_apex_pro",
        name: "Pro",
        description: "Courses, journal review, and prop-firm-safe signal alerts.",
        priceNgn: 15000,
        billingPeriod: "monthly",
        features: ["course", "signalAlerts", "journal", "tagging", "calculators"]
      },
      {
        tierId: "tier_apex_elite",
        name: "Elite",
        description: "Full signal layer with personal-account Auto-Copy eligibility.",
        priceNgn: 30000,
        billingPeriod: "monthly",
        features: [
          "course",
          "signalAlerts",
          "autoCopy",
          "journal",
          "tagging",
          "calculators",
          "aiInsights"
        ],
        featured: true
      }
    ],
    settings: {
      singleTier: false,
      freeTrialDays: 7,
      noCardRequired: true,
      refundPolicy: "Refunds within 72 hours before the first live session; signal-only weeks are non-refundable."
    },
    rails: [
      {
        rail: "paystack",
        status: "enabled",
        label: "Paystack local checkout",
        settlementNote: "Default rail for Nigerian cards, transfers, and local settlement."
      },
      {
        rail: "solana",
        status: "enabled",
        label: "Solana Pay / USDC",
        settlementNote: "Optional partner rail with short-lived USDC quotes."
      }
    ],
    vettingStatus: "approved",
    paystackSubaccountCode: "ACCT_FAKE_APEXFX_001",
    paystackSplitCode: "SPLIT_FAKE_APEXFX_001",
    solanaPayEnabled: true,
    solanaPayoutWallet: "FAKE_USDC_WALLET_APEXFX_001",
    solanaPartnerPlacementEnabled: true,
    platformSplitPercent: 10,
    codeOfConductAcceptedAt: "2026-06-14T10:00:00.000Z",
    riskDisclosureVersion: "v2.5",
    createdAt: "2026-06-08T09:00:00.000Z",
    activatedAt: "2026-06-20T13:30:00.000Z"
  },
  {
    workspaceId: "ws_northstar",
    handle: "northstarcrypto",
    name: "Northstar Crypto",
    ownerId: "infl_north_001",
    ownerDisplayName: "Tomiwa Balogun",
    summary:
      "Crypto-first workspace focused on structure, risk, and disciplined execution for students who split time across spot and derivatives.",
    marketFocus: "crypto",
    branding: {
      logoMark: "NS",
      logoUrl: "/branding/northstar-mark.svg",
      primaryColor: "#111318",
      accentColor: "#d9c28c",
      heroLabel: "Calm execution"
    },
    tiers: [
      {
        tierId: "tier_north_starter",
        name: "Starter",
        description: "Beginner crypto course path and calculators.",
        priceNgn: 8000,
        billingPeriod: "monthly",
        features: ["course", "calculators"]
      },
      {
        tierId: "tier_north_pro",
        name: "Pro",
        description: "Course access plus journal and signal alerts.",
        priceNgn: 20000,
        billingPeriod: "monthly",
        features: ["course", "signalAlerts", "journal", "tagging", "calculators"]
      },
      {
        tierId: "tier_north_elite",
        name: "Elite",
        description: "Premium crypto room with Auto-Copy for personal exchange accounts.",
        priceNgn: 35000,
        billingPeriod: "monthly",
        features: [
          "course",
          "signalAlerts",
          "autoCopy",
          "journal",
          "tagging",
          "calculators",
          "aiInsights"
        ]
      }
    ],
    settings: {
      singleTier: false,
      freeTrialDays: 3,
      noCardRequired: false,
      refundPolicy: "Refunds reviewed case by case within 24 hours of the first payment."
    },
    rails: [
      {
        rail: "paystack",
        status: "enabled",
        label: "Paystack local checkout",
        settlementNote: "Main subscription rail while crypto checkout remains optional."
      },
      {
        rail: "solana",
        status: "pending_verification",
        label: "Solana wallet verification",
        settlementNote: "Wallet collected but not enabled until settlement review is complete."
      }
    ],
    vettingStatus: "approved",
    paystackSubaccountCode: "ACCT_FAKE_NORTHSTAR_001",
    paystackSplitCode: "SPLIT_FAKE_NORTHSTAR_001",
    solanaPayEnabled: false,
    solanaPayoutWallet: "FAKE_USDC_WALLET_NORTHSTAR_001",
    solanaPartnerPlacementEnabled: false,
    platformSplitPercent: 12,
    codeOfConductAcceptedAt: "2026-06-26T16:00:00.000Z",
    riskDisclosureVersion: "v2.5",
    createdAt: "2026-06-19T11:00:00.000Z",
    activatedAt: "2026-07-01T09:20:00.000Z"
  },
  {
    workspaceId: "ws_pipharvest",
    handle: "pipharvest",
    name: "PipHarvest",
    ownerId: "infl_pip_001",
    ownerDisplayName: "Halima Sani",
    summary:
      "Structured forex coaching for working professionals who want simple session plans, replay drills, and journal accountability.",
    marketFocus: "forex",
    branding: {
      logoMark: "PH",
      logoUrl: "/branding/pipharvest-mark.svg",
      primaryColor: "#121212",
      accentColor: "#d9c28c",
      heroLabel: "Consistency over noise"
    },
    tiers: [
      {
        tierId: "tier_pip_starter",
        name: "Starter",
        description: "Entry path for replay drills and lesson recaps.",
        priceNgn: 6000,
        billingPeriod: "monthly",
        features: ["course", "calculators"]
      },
      {
        tierId: "tier_pip_pro",
        name: "Pro",
        description: "Journal-led mentorship with structured signal alerts.",
        priceNgn: 18000,
        billingPeriod: "monthly",
        features: ["course", "signalAlerts", "journal", "tagging", "calculators"]
      },
      {
        tierId: "tier_pip_elite",
        name: "Elite",
        description: "Premium mentoring, personal-account Auto-Copy, and review loops.",
        priceNgn: 32000,
        billingPeriod: "monthly",
        features: [
          "course",
          "signalAlerts",
          "autoCopy",
          "journal",
          "tagging",
          "calculators"
        ]
      }
    ],
    settings: {
      singleTier: false,
      freeTrialDays: 14,
      noCardRequired: true,
      refundPolicy: "Students may cancel before the first weekly live review for a full refund."
    },
    rails: [
      {
        rail: "paystack",
        status: "enabled",
        label: "Paystack local checkout",
        settlementNote: "Default rail with standard split settlement."
      },
      {
        rail: "solana",
        status: "disabled",
        label: "Solana not enabled",
        settlementNote: "No crypto checkout until the workspace requests and verifies a payout wallet."
      }
    ],
    vettingStatus: "approved",
    paystackSubaccountCode: "ACCT_FAKE_PIPHARVEST_001",
    paystackSplitCode: "SPLIT_FAKE_PIPHARVEST_001",
    solanaPayEnabled: false,
    solanaPartnerPlacementEnabled: false,
    platformSplitPercent: 10,
    codeOfConductAcceptedAt: "2026-05-30T12:15:00.000Z",
    riskDisclosureVersion: "v2.5",
    createdAt: "2026-05-24T08:45:00.000Z",
    activatedAt: "2026-06-04T14:00:00.000Z"
  }
];

export const defaultWorkspaceHandle = "apexfx";
