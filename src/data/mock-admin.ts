import type {
  AuditEventSummary,
  Dispute,
  InfluencerProfile,
  MonthlyRevenuePoint,
  RiskFlag,
  SuperAdminProfile,
  WorkspaceRevenueSnapshot
} from "@/types/tradehub";

export const mockSuperAdminProfile: SuperAdminProfile = {
  userId: "admin_001",
  role: "super_admin",
  displayName: "Idris Suleiman",
  email: "admin@tradehub.demo"
};

export const mockInfluencerProfiles: InfluencerProfile[] = [
  {
    userId: "infl_apex_001",
    role: "influencer",
    workspaceId: "ws_apexfx",
    displayName: "Maya Adeyemi",
    email: "maya@apexfx.demo",
    handleOrChannel: "@apexfx",
    audienceSize: 18400,
    market: "forex",
    monetizationMethod: "Telegram community and private Zoom breakdowns"
  },
  {
    userId: "infl_north_001",
    role: "influencer",
    workspaceId: "ws_northstar",
    displayName: "Tomiwa Balogun",
    email: "tomiwa@northstar.demo",
    handleOrChannel: "@northstarcrypto",
    audienceSize: 9100,
    market: "crypto",
    monetizationMethod: "Private Discord and spot/futures swing callouts"
  },
  {
    userId: "infl_pip_001",
    role: "influencer",
    workspaceId: "ws_pipharvest",
    displayName: "Halima Sani",
    email: "halima@pipharvest.demo",
    handleOrChannel: "@pipharvest",
    audienceSize: 7300,
    market: "forex",
    monetizationMethod: "Replay room and structured mentorship"
  }
];

export const mockDisputes: Dispute[] = [
  {
    disputeId: "disp_apex_001",
    workspaceId: "ws_apexfx",
    raisedBy: "st_tunde_apex",
    type: "chargeback",
    relatedId: "pay_apex_tunde_004",
    status: "open",
    createdAt: "2026-07-04T09:00:00.000Z"
  },
  {
    disputeId: "disp_apex_002",
    workspaceId: "ws_apexfx",
    raisedBy: "st_kunle_apex",
    type: "transaction",
    relatedId: "pay_apex_kunle_003",
    status: "escalated",
    createdAt: "2026-07-02T11:10:00.000Z"
  },
  {
    disputeId: "disp_pip_003",
    workspaceId: "ws_pipharvest",
    raisedBy: "system",
    type: "conduct",
    relatedId: "signal-review-24",
    status: "resolved",
    resolution: "Updated student-facing disclaimer and reviewed the signal wording with the owner.",
    createdAt: "2026-06-28T10:30:00.000Z",
    resolvedAt: "2026-06-29T15:00:00.000Z"
  }
];

export const mockRiskFlags: RiskFlag[] = [
  {
    flagId: "risk_apex_chargeback",
    workspaceId: "ws_apexfx",
    title: "Chargeback anomaly",
    severity: "medium",
    detail: "Apex FX crossed the weekly chargeback watch threshold after two failed renewals and one dispute.",
    createdAt: "2026-07-04T09:20:00.000Z"
  },
  {
    flagId: "risk_north_wallet",
    workspaceId: "ws_northstar",
    title: "Pending Solana payout verification",
    severity: "low",
    detail: "Crypto checkout should remain disabled until the influencer wallet passes final verification.",
    createdAt: "2026-07-03T12:40:00.000Z"
  },
  {
    flagId: "risk_pip_inactive",
    workspaceId: "ws_pipharvest",
    title: "Inactive student cohort",
    severity: "low",
    detail: "Three students have been inactive for more than seven days and may need a retention nudge.",
    createdAt: "2026-07-05T08:10:00.000Z"
  }
];

export const mockAuditEvents: AuditEventSummary[] = [
  {
    eventId: "audit_001",
    actor: "admin_001",
    action: "workspace.review",
    target: "ws_northstar",
    timestamp: "2026-07-05T09:00:00.000Z"
  },
  {
    eventId: "audit_002",
    actor: "admin_001",
    action: "dispute.escalate",
    target: "disp_apex_002",
    timestamp: "2026-07-02T11:25:00.000Z"
  },
  {
    eventId: "audit_003",
    actor: "admin_001",
    action: "application.approve",
    target: "app_nairatape",
    timestamp: "2026-07-04T09:45:00.000Z"
  },
  {
    eventId: "audit_004",
    actor: "admin_001",
    action: "risk.flag.create",
    target: "risk_apex_chargeback",
    timestamp: "2026-07-04T09:20:00.000Z"
  }
];

export const mockMonthlyRevenue: MonthlyRevenuePoint[] = [
  { month: "Apr", grossNgn: 620000, platformNgn: 69000 },
  { month: "May", grossNgn: 940000, platformNgn: 103000 },
  { month: "Jun", grossNgn: 1380000, platformNgn: 151000 },
  { month: "Jul", grossNgn: 1780000, platformNgn: 194000 }
];

export const mockWorkspaceRevenueSnapshots: WorkspaceRevenueSnapshot[] = [
  {
    workspaceId: "ws_apexfx",
    grossNgn: 960000,
    activeStudents: 4,
    chargebackRatePercent: 3.2
  },
  {
    workspaceId: "ws_northstar",
    grossNgn: 470000,
    activeStudents: 2,
    chargebackRatePercent: 0.8
  },
  {
    workspaceId: "ws_pipharvest",
    grossNgn: 350000,
    activeStudents: 2,
    chargebackRatePercent: 1.1
  }
];
