import type {
  OnboardingProgress,
  OnboardingStep,
  WorkspaceApplication
} from "@/types/tradehub";

export const mockOnboardingSteps: OnboardingStep[] = [
  {
    key: "vetting",
    title: "Vetting",
    detail: "Identity, audience quality, and account-type mix reviewed by the platform team.",
    required: true
  },
  {
    key: "branding",
    title: "Branding",
    detail: "Workspace name, logo, and locked accent direction.",
    required: true
  },
  {
    key: "code_of_conduct",
    title: "Code of Conduct",
    detail: "Influencer acceptance is logged before students can be invited.",
    required: true
  },
  {
    key: "telegram_bot",
    title: "Telegram Bot",
    detail: "Dedicated bot connection for signal capture and isolation.",
    required: true
  },
  {
    key: "pricing",
    title: "Pricing",
    detail: "Tier setup, refund policy, and checkout messaging.",
    required: true
  },
  {
    key: "paystack",
    title: "Paystack",
    detail: "Subaccount, split code, and settlement readiness.",
    required: true
  },
  {
    key: "solana_wallet",
    title: "Solana Wallet",
    detail: "Optional USDC payout wallet verification for crypto checkout.",
    required: false
  },
  {
    key: "first_course",
    title: "First Course",
    detail: "Initial course shell and lesson path published.",
    required: true
  },
  {
    key: "first_paying_student",
    title: "First Paying Student",
    detail: "Activation milestone showing the workspace has moved into live revenue.",
    required: true
  }
];

export const mockWorkspaceApplications: WorkspaceApplication[] = [
  {
    applicationId: "app_apexfx",
    name: "Maya Adeyemi",
    email: "maya@apexfx.demo",
    primaryPlatform: "telegram",
    handleOrChannel: "@apexfx",
    audienceSize: 18400,
    market: "forex",
    studentAccountMix: "both",
    monetizationMethod: "Telegram community and private Zoom breakdowns",
    productOfferings: ["signals", "mentorship", "community"],
    currentCustomerCount: 184,
    solanaPayInterest: false,
    noResultsPromiseAccepted: true,
    notes: "Needs a cleaner subscription flow and a better path for funded-account students.",
    status: "activated",
    vettingOutcome: "approved",
    vettingNotes: "Strong retention history, clear prop-firm safeguards, audience already paying.",
    setupFeeStatus: "paid",
    workspaceId: "ws_apexfx",
    source: "landing_page",
    workspaceCreationStatus: "created",
    createdAt: "2026-06-02T10:00:00.000Z",
    updatedAt: "2026-06-20T13:30:00.000Z",
    firstPayingStudentAt: "2026-06-20T13:30:00.000Z"
  },
  {
    applicationId: "app_northstar",
    name: "Tomiwa Balogun",
    email: "tomiwa@northstar.demo",
    primaryPlatform: "discord",
    handleOrChannel: "@northstarcrypto",
    audienceSize: 9100,
    market: "crypto",
    studentAccountMix: "personal",
    monetizationMethod: "Private Discord and spot/futures swing callouts",
    productOfferings: ["signals", "community"],
    currentCustomerCount: 92,
    solanaPayInterest: true,
    noResultsPromiseAccepted: true,
    notes: "Interested in optional Solana checkout for global students.",
    status: "workspace_created",
    vettingOutcome: "approved",
    vettingNotes: "Good fit, but payout wallet verification still pending before Solana activation.",
    setupFeeStatus: "waived",
    workspaceId: "ws_northstar",
    source: "referral",
    workspaceCreationStatus: "created",
    createdAt: "2026-06-18T09:10:00.000Z",
    updatedAt: "2026-07-01T09:20:00.000Z"
  },
  {
    applicationId: "app_castlecharts",
    name: "Chioma Nnaji",
    email: "chioma@castlecharts.demo",
    primaryPlatform: "telegram",
    handleOrChannel: "@castlecharts",
    audienceSize: 6200,
    market: "both",
    studentAccountMix: "both",
    monetizationMethod: "Paid Telegram channel and one-off PDF packs",
    productOfferings: ["signals", "courses"],
    currentCustomerCount: 58,
    solanaPayInterest: false,
    noResultsPromiseAccepted: true,
    notes: "Needs help moving from one-off payments to recurring tiers.",
    status: "vetting",
    vettingOutcome: "pending",
    vettingNotes: "Awaiting proof of settlement history and sample course outline.",
    setupFeeStatus: "pending",
    source: "landing_page",
    workspaceCreationStatus: "not_started",
    createdAt: "2026-07-03T08:00:00.000Z",
    updatedAt: "2026-07-05T11:15:00.000Z"
  },
  {
    applicationId: "app_pipsultan",
    name: "Yemi Ojo",
    email: "yemi@pipsultan.demo",
    primaryPlatform: "whatsapp",
    handleOrChannel: "@pipsultan",
    audienceSize: 2800,
    market: "forex",
    studentAccountMix: "prop_firm",
    monetizationMethod: "Daily breakdowns sold through broadcast lists",
    productOfferings: ["signals", "mentorship"],
    currentCustomerCount: 31,
    solanaPayInterest: false,
    noResultsPromiseAccepted: true,
    notes: "Mostly prop-firm students, so Signal Alerts fit should be highlighted early.",
    status: "new",
    vettingOutcome: "pending",
    vettingNotes: "Fresh intake waiting for first review call.",
    setupFeeStatus: "not_required",
    source: "landing_page",
    workspaceCreationStatus: "not_started",
    createdAt: "2026-07-05T16:40:00.000Z",
    updatedAt: "2026-07-05T16:40:00.000Z"
  },
  {
    applicationId: "app_deltaflows",
    name: "Samuel Ibekwe",
    email: "samuel@deltaflows.demo",
    primaryPlatform: "whatsapp",
    handleOrChannel: "@deltaflows",
    audienceSize: 1100,
    market: "crypto",
    studentAccountMix: "unknown",
    monetizationMethod: "Signals-only WhatsApp groups",
    productOfferings: ["signals", "community"],
    currentCustomerCount: 18,
    solanaPayInterest: true,
    noResultsPromiseAccepted: true,
    notes: "Audience is real, but no proof of structured education or payout history.",
    status: "rejected",
    vettingOutcome: "rejected",
    vettingNotes: "Rejected until compliance and refund handling are clearer.",
    setupFeeStatus: "not_required",
    source: "manual",
    workspaceCreationStatus: "not_started",
    createdAt: "2026-06-28T12:30:00.000Z",
    updatedAt: "2026-07-02T10:20:00.000Z"
  },
  {
    applicationId: "app_nairatape",
    name: "Ruth Adebisi",
    email: "ruth@nairatape.demo",
    primaryPlatform: "youtube",
    handleOrChannel: "@nairatape",
    audienceSize: 4700,
    market: "forex",
    studentAccountMix: "personal",
    monetizationMethod: "Paid replay room with monthly tuition",
    productOfferings: ["courses", "mentorship", "community"],
    currentCustomerCount: 44,
    solanaPayInterest: false,
    noResultsPromiseAccepted: true,
    notes: "Wants journal analytics and structured course progression.",
    status: "approved",
    vettingOutcome: "approved",
    vettingNotes: "Approved; waiting on setup-fee confirmation before workspace creation.",
    setupFeeStatus: "pending",
    source: "landing_page",
    workspaceCreationStatus: "queued",
    createdAt: "2026-07-01T14:00:00.000Z",
    updatedAt: "2026-07-04T09:45:00.000Z"
  },
  {
    applicationId: "app_propedge",
    name: "Ibrahim Lawal",
    email: "ibrahim@propedge.demo",
    primaryPlatform: "telegram",
    handleOrChannel: "@propedge",
    audienceSize: 7600,
    market: "forex",
    studentAccountMix: "prop_firm",
    monetizationMethod: "Challenge coaching and paid study cohort",
    productOfferings: ["mentorship", "community", "signals"],
    currentCustomerCount: 67,
    solanaPayInterest: false,
    noResultsPromiseAccepted: true,
    notes: "Good market fit, but needs stronger risk disclosure wording before launch.",
    status: "vetting",
    vettingOutcome: "watchlist",
    vettingNotes: "Continue review after updated challenge-risk copy and student disclaimers.",
    setupFeeStatus: "waived",
    source: "referral",
    workspaceCreationStatus: "not_started",
    createdAt: "2026-06-30T10:05:00.000Z",
    updatedAt: "2026-07-05T08:55:00.000Z"
  }
];

export const mockApplications = mockWorkspaceApplications;

export const mockOnboardingProgress: OnboardingProgress[] = [
  {
    workspaceId: "ws_apexfx",
    applicationId: "app_apexfx",
    steps: [
      {
        key: "vetting",
        title: "Vetting",
        detail: "Track record verified and audience quality confirmed.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-08T09:00:00.000Z"
      },
      {
        key: "branding",
        title: "Branding",
        detail: "Logo, workspace name, and accent system locked.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-12T10:10:00.000Z"
      },
      {
        key: "code_of_conduct",
        title: "Code of Conduct",
        detail: "Acceptance logged with versioned disclosure state.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-14T10:00:00.000Z"
      },
      {
        key: "telegram_bot",
        title: "Telegram Bot",
        detail: "@ApexFXBot is connected and isolated to the workspace.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-15T15:40:00.000Z"
      },
      {
        key: "pricing",
        title: "Pricing",
        detail: "Starter, Pro, and Elite tiers configured with refunds and trial policy.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-16T12:20:00.000Z"
      },
      {
        key: "paystack",
        title: "Paystack",
        detail: "Split code is live and checkout copy is approved.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-18T11:25:00.000Z"
      },
      {
        key: "solana_wallet",
        title: "Solana Wallet",
        detail: "Optional USDC wallet verified for crypto-friendly students.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-19T10:15:00.000Z"
      },
      {
        key: "first_course",
        title: "First Course",
        detail: "Starter Blueprint is published with tracked lesson progress.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-19T18:00:00.000Z"
      },
      {
        key: "first_paying_student",
        title: "First Paying Student",
        detail: "Activation milestone recorded once the first verified payment landed.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-20T13:30:00.000Z"
      }
    ]
  },
  {
    workspaceId: "ws_northstar",
    applicationId: "app_northstar",
    steps: [
      {
        key: "vetting",
        title: "Vetting",
        detail: "Crypto risk and audience quality checks are complete.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-20T09:40:00.000Z"
      },
      {
        key: "branding",
        title: "Branding",
        detail: "Workspace identity is locked and the first checkout copy is approved.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-24T13:00:00.000Z"
      },
      {
        key: "code_of_conduct",
        title: "Code of Conduct",
        detail: "Agreement accepted before any student invitations were sent.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-26T16:00:00.000Z"
      },
      {
        key: "telegram_bot",
        title: "Telegram Bot",
        detail: "In-app signals are ready while the bot connection stays optional for launch week.",
        status: "current",
        progressPercent: 72
      },
      {
        key: "pricing",
        title: "Pricing",
        detail: "Three tiers exist, but Elite crypto copy still needs a final review pass.",
        status: "current",
        progressPercent: 84
      },
      {
        key: "paystack",
        title: "Paystack",
        detail: "Subaccount is ready and settlement review is complete.",
        status: "complete",
        progressPercent: 100,
        completedAt: "2026-06-29T14:30:00.000Z"
      },
      {
        key: "solana_wallet",
        title: "Solana Wallet",
        detail: "Wallet collected, but verification and final compliance copy are still pending.",
        status: "current",
        progressPercent: 58
      },
      {
        key: "first_course",
        title: "First Course",
        detail: "Crypto Risk Engine draft exists but has not been published.",
        status: "upcoming",
        progressPercent: 36
      },
      {
        key: "first_paying_student",
        title: "First Paying Student",
        detail: "No paying student yet because the workspace is still pre-activation.",
        status: "upcoming",
        progressPercent: 0
      }
    ]
  }
];
