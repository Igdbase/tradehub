import { mockWorkspaces } from "@/data/mock-workspaces";
import type { PaymentIntent, SubscriptionPlan } from "@/types/tradehub";

export const mockSubscriptionPlans: SubscriptionPlan[] = mockWorkspaces.flatMap((workspace) =>
  workspace.tiers.map((tier) => ({
    planId: `plan_${workspace.handle}_${tier.name.toLowerCase()}`,
    workspaceId: workspace.workspaceId,
    tierId: tier.tierId,
    label: `${workspace.name} ${tier.name}`,
    priceNgn: tier.priceNgn,
    billingPeriod: tier.billingPeriod,
    rails: workspace.rails
      .filter((rail) => rail.status === "enabled")
      .map((rail) => rail.rail)
  }))
);

export const mockPaymentIntents: PaymentIntent[] = [
  {
    paymentIntentId: "pay_apex_ada_001",
    rail: "paystack",
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    tierId: "tier_apex_elite",
    status: "verified",
    amountNgn: 30000,
    split: {
      platformPercent: 10,
      influencerPercent: 90,
      platformAmountNgn: 3000,
      influencerAmountNgn: 27000
    },
    paystackReference: "PSK_FAKE_APEX_ADA_001",
    paystackCustomerCode: "CUS_FAKE_ADA_APEX",
    paystackSplitCode: "SPLIT_FAKE_APEXFX_001",
    createdAt: "2026-06-21T09:00:00.000Z",
    expiresAt: "2026-06-21T09:20:00.000Z",
    verifiedAt: "2026-06-21T09:04:00.000Z"
  },
  {
    paymentIntentId: "pay_apex_ifeoma_002",
    rail: "paystack",
    workspaceId: "ws_apexfx",
    studentId: "st_ifeoma_apex",
    tierId: "tier_apex_pro",
    status: "verified",
    amountNgn: 15000,
    split: {
      platformPercent: 10,
      influencerPercent: 90,
      platformAmountNgn: 1500,
      influencerAmountNgn: 13500
    },
    paystackReference: "PSK_FAKE_APEX_IFEOMA_002",
    paystackCustomerCode: "CUS_FAKE_IFEOMA_APEX",
    paystackSplitCode: "SPLIT_FAKE_APEXFX_001",
    createdAt: "2026-06-19T17:05:00.000Z",
    expiresAt: "2026-06-19T17:25:00.000Z",
    verifiedAt: "2026-06-19T17:08:00.000Z"
  },
  {
    paymentIntentId: "pay_apex_kunle_003",
    rail: "solana",
    workspaceId: "ws_apexfx",
    studentId: "st_kunle_apex",
    tierId: "tier_apex_pro",
    status: "verified",
    amountNgn: 15000,
    amountUsdc: 10.12,
    fxRateSnapshot: 1482,
    reference: "SOL_REF_APEX_KUNLE_003",
    solanaPayUrl: "solana:FAKE_USDC_WALLET_PLATFORM_001?amount=10.12&spl-token=FAKE_USDC_MINT&reference=SOL_REF_APEX_KUNLE_003",
    verifiedSignature: "SOL_SIG_FAKE_APEX_KUNLE_003",
    influencerWallet: "FAKE_USDC_WALLET_APEXFX_001",
    platformWallet: "FAKE_USDC_WALLET_PLATFORM_001",
    split: {
      platformPercent: 10,
      influencerPercent: 90,
      platformAmountUsdc: 1.01,
      influencerAmountUsdc: 9.11
    },
    createdAt: "2026-07-01T07:00:00.000Z",
    expiresAt: "2026-07-01T07:10:00.000Z",
    quoteExpiresAt: "2026-07-01T07:10:00.000Z",
    solanaNetwork: "devnet",
    usdcMint: "FAKE_USDC_MINT",
    verifiedAt: "2026-07-01T07:04:00.000Z"
  },
  {
    paymentIntentId: "pay_apex_tunde_004",
    rail: "paystack",
    workspaceId: "ws_apexfx",
    studentId: "st_tunde_apex",
    tierId: "tier_apex_elite",
    status: "failed",
    amountNgn: 30000,
    split: {
      platformPercent: 10,
      influencerPercent: 90,
      platformAmountNgn: 3000,
      influencerAmountNgn: 27000
    },
    paystackReference: "PSK_FAKE_APEX_TUNDE_004",
    paystackCustomerCode: "CUS_FAKE_TUNDE_APEX",
    paystackSplitCode: "SPLIT_FAKE_APEXFX_001",
    createdAt: "2026-07-04T08:00:00.000Z",
    expiresAt: "2026-07-04T08:20:00.000Z"
  },
  {
    paymentIntentId: "pay_north_nora_005",
    rail: "paystack",
    workspaceId: "ws_northstar",
    studentId: "st_nora_north",
    tierId: "tier_north_elite",
    status: "pending",
    amountNgn: 35000,
    split: {
      platformPercent: 12,
      influencerPercent: 88,
      platformAmountNgn: 4200,
      influencerAmountNgn: 30800
    },
    paystackReference: "PSK_FAKE_NORTH_NORA_005",
    paystackCustomerCode: "CUS_FAKE_NORA_NORTH",
    paystackSplitCode: "SPLIT_FAKE_NORTHSTAR_001",
    createdAt: "2026-07-02T10:30:00.000Z",
    expiresAt: "2026-07-02T10:50:00.000Z"
  },
  {
    paymentIntentId: "pay_north_dayo_006",
    rail: "solana",
    workspaceId: "ws_northstar",
    studentId: "st_dayo_north",
    tierId: "tier_north_starter",
    status: "expired",
    amountNgn: 8000,
    amountUsdc: 5.35,
    fxRateSnapshot: 1495,
    reference: "SOL_REF_NORTH_DAYO_006",
    solanaPayUrl: "solana:FAKE_USDC_WALLET_PLATFORM_001?amount=5.35&spl-token=FAKE_USDC_MINT&reference=SOL_REF_NORTH_DAYO_006",
    influencerWallet: "FAKE_USDC_WALLET_NORTHSTAR_001",
    platformWallet: "FAKE_USDC_WALLET_PLATFORM_001",
    split: {
      platformPercent: 12,
      influencerPercent: 88,
      platformAmountUsdc: 0.64,
      influencerAmountUsdc: 4.71
    },
    createdAt: "2026-07-03T12:25:00.000Z",
    expiresAt: "2026-07-03T12:35:00.000Z",
    quoteExpiresAt: "2026-07-03T12:35:00.000Z",
    solanaNetwork: "devnet",
    usdcMint: "FAKE_USDC_MINT"
  },
  {
    paymentIntentId: "pay_pip_lara_007",
    rail: "paystack",
    workspaceId: "ws_pipharvest",
    studentId: "st_lara_pip",
    tierId: "tier_pip_pro",
    status: "verified",
    amountNgn: 18000,
    split: {
      platformPercent: 10,
      influencerPercent: 90,
      platformAmountNgn: 1800,
      influencerAmountNgn: 16200
    },
    paystackReference: "PSK_FAKE_PIP_LARA_007",
    paystackCustomerCode: "CUS_FAKE_LARA_PIP",
    paystackSplitCode: "SPLIT_FAKE_PIPHARVEST_001",
    createdAt: "2026-06-14T07:20:00.000Z",
    expiresAt: "2026-06-14T07:40:00.000Z",
    verifiedAt: "2026-06-14T07:23:00.000Z"
  }
];
