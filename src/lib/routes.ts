import type {
  DetailItem,
  NavItem,
  PolicySection,
  RoadmapItem,
  SurfaceCardItem
} from "@/types/tradehub";

export const primaryNav: NavItem[] = [
  {
    label: "Landing",
    href: "/",
    description: "Public marketing, application, and policy routes for TradeHub.",
    surface: "public"
  },
  {
    label: "Design System",
    href: "/design-system",
    description: "Locked dark/light tokens and shared product primitives.",
    surface: "public"
  },
  {
    label: "Admin",
    href: "/admin",
    description: "Platform-owner review for onboarding, billing operations, risk, and audit history.",
    surface: "super-admin"
  },
  {
    label: "Workspace",
    href: "/workspace",
    description: "Influencer workspace for onboarding, pricing, students, courses, and signals.",
    surface: "influencer"
  },
  {
    label: "Student App",
    href: "/app",
    description: "Mobile-first student experience for courses, signals, billing, and journal summaries.",
    surface: "student"
  }
];

export const footerNav: NavItem[] = [
  {
    label: "Terms",
    href: "/terms",
    description: "Subscriptions, workspace access, suspensions, and acceptable use.",
    surface: "public"
  },
  {
    label: "Privacy",
    href: "/privacy",
    description: "Identity, workspace membership, payments, and journal privacy posture.",
    surface: "public"
  },
  {
    label: "Risk",
    href: "/risk-disclosure",
    description: "Trading education, signals, funded-account caution, and non-guaranteed outcomes.",
    surface: "public"
  },
  {
    label: "Data Use",
    href: "/data-use",
    description: "Onboarding review, billing support, trust and safety, and summary visibility.",
    surface: "public"
  }
];

export const surfaceCards: SurfaceCardItem[] = [
  {
    label: "Public Surface",
    title: "Marketing, application, and policy routes",
    href: "/",
    description:
      "The public TradeHub surface explains the product clearly, invites vetted educators to apply, and keeps the policy footprint production-shaped from day one.",
    prompt: "Operator review, workspace application intake, and legal visibility are live.",
    surface: "public"
  },
  {
    label: "Super Admin",
    title: "Platform-owner control room",
    href: "/admin",
    description:
      "Workspace onboarding, payment operations, audit history, trust and safety, and settlement visibility stay in the operator surface only.",
    prompt: "Protected API routes keep admin reads and writes server-side.",
    surface: "super-admin"
  },
  {
    label: "Influencer Workspace",
    title: "Branded workspace management",
    href: "/workspace",
    description:
      "Educators manage onboarding, pricing, courses, signals, and student visibility through a separate workspace shell without seeing platform-owner controls.",
    prompt: "Paystack remains default, Solana stays optional and review-gated.",
    surface: "influencer"
  },
  {
    label: "Student App",
    title: "Mobile-first learning and billing shell",
    href: "/app",
    description:
      "Students get scoped access to courses, signals, billing, and privacy-aware journal summaries without leaking operator or educator internals.",
    prompt: "Summary docs keep the student experience quota-safe and honest.",
    surface: "student"
  }
];

export const foundationChecklist: DetailItem[] = [
  {
    title: "Multi-tenant shape",
    body: "Route groups keep public, owner, influencer, and student surfaces distinct so access and copy stay scoped from the foundation onward."
  },
  {
    title: "Summary-first reads",
    body: "Student home, journal, and operator dashboards favor summary documents and bounded feeds instead of broad collection scans."
  },
  {
    title: "Locked theme tokens",
    body: "Dark and light tokens stay aligned with the approved TradeHub visual language instead of drifting into template styling."
  },
  {
    title: "Server-only secret boundaries",
    body: "Firebase Admin, Paystack secret values, Solana config, and other sensitive settings stay server-side."
  },
  {
    title: "Workspace-claim routing",
    body: "Role and workspace claims still decide protected surface access rather than browser-only flags or query shortcuts."
  }
];

export const securityGuardrails: DetailItem[] = [
  {
    title: "No client-side secrets",
    body: "Firebase admin credentials, Paystack secrets, Solana configuration, and payout controls are not exposed in browser code."
  },
  {
    title: "No fake admin shortcuts",
    body: "Protected flows still require verified ID tokens and scoped server-side checks rather than localStorage role toggles."
  },
  {
    title: "CSV-safe export posture",
    body: "Spreadsheet exports now sanitize risky leading characters so operators do not introduce formula-injection issues when reviewing data."
  },
  {
    title: "Policy and product truth stay aligned",
    body: "Terms, privacy, risk, and data-use copy now match the real MVP instead of placeholder stage wording."
  }
];

export const stageRoadmap: RoadmapItem[] = [
  {
    label: "Foundation",
    prompt: "Stages 01 to 04",
    detail: "Scaffold, visual system, typed domain models, and the public application flow established the product base."
  },
  {
    label: "Protected product",
    prompt: "Stages 05 to 10",
    detail: "Firebase-authenticated admin, influencer, and student surfaces now run through scoped API routes and reusable workspace flows."
  },
  {
    label: "Billing rails",
    prompt: "Stages 11 to 13",
    detail: "Paystack-first subscriptions, optional Solana Pay / USDC checkout, and admin settlement operations now exist as live foundations."
  },
  {
    label: "Launch hardening",
    prompt: "Stage 14",
    detail: "Journal privacy, trust/safety clarity, policy copy, responsive cleanup, export safety, and security defaults complete the MVP pass."
  }
];

export const policySections: Record<string, PolicySection[]> = {
  terms: [
    {
      title: "Workspace access and operator review",
      body: "TradeHub is provided as a white-label workspace platform for vetted trading educators and their students. Workspace creation, activation, and ongoing access can require operator review before student access is granted or expanded."
    },
    {
      title: "Subscriptions, renewals, and billing rails",
      body: "Student access is tied to the active subscription or access state attached to the verified student account. Paystack is the default billing rail. Optional Solana / USDC checkout can be enabled only for approved workspaces and does not change the platform's right to verify payment server-side before granting access."
    },
    {
      title: "Courses, signals, and journal content",
      body: "TradeHub hosts educator-controlled courses, signals, community access, and privacy-aware journal summaries. Access to content may vary by tier, workspace policy, and student account mode. Signal Alerts and Auto-Copy are not treated as the same posture across every student account."
    },
    {
      title: "Acceptable use and account sharing",
      body: "Users must not share paid access, misuse invite routes, attempt to bypass access controls, upload harmful content, or interfere with payment verification, trust and safety review, or workspace integrity. TradeHub may suspend or limit access when misuse, fraud, or safety issues are suspected."
    },
    {
      title: "Suspensions, disputes, and refunds",
      body: "TradeHub and the workspace operator may pause or restrict access while payment issues, disputes, safety flags, or policy breaches are reviewed. Refund posture and make-good decisions may depend on the workspace offer, payment status, and the specific issue under review; access is not guaranteed during an open dispute."
    }
  ],
  privacy: [
    {
      title: "Identity and account records",
      body: "TradeHub stores account identity, sign-in details, role claims, workspace membership, and access state needed to deliver the product securely. This includes student, influencer, and operator account records tied to verified authentication flows."
    },
    {
      title: "Workspace membership and operator visibility",
      body: "Workspace operators can see the information needed to review onboarding, manage tiers, understand subscription state, and support enrolled students. This does not mean every private student record becomes visible to the workspace by default."
    },
    {
      title: "Payments and billing support",
      body: "Payment records, subscription state, plan codes, webhook receipts, settlement references, and payment-support notes may be processed so TradeHub can verify checkout, manage access, reconcile ambiguous payments, and support dispute handling. Card details and private wallet keys are not stored inside the TradeHub product surface."
    },
    {
      title: "Journal privacy posture",
      body: "Student journal data is private-first. Where workspace-visible summaries are enabled, the workspace receives only the bounded summary document prepared for that purpose. Trade-by-trade notes, raw hidden entries, and private reflections are not implied to be visible just because a student uses the journal route."
    },
    {
      title: "Retention, vendors, and security",
      body: "TradeHub uses infrastructure and payment vendors to operate the product, and retains operational records for access control, billing, audit history, support, and safety review. Data handling is shaped around scoped API routes, locked Firestore client rules, bounded dashboard queries, and server-side verification of sensitive actions."
    }
  ],
  risk: [
    {
      title: "Education and signals are not guaranteed returns",
      body: "Courses, educator guidance, signals, journal insights, and retention analytics do not guarantee profit, preservation of capital, or a positive trading outcome. Students remain responsible for their own decisions and account behavior."
    },
    {
      title: "Alerts, auto-copy, and execution posture",
      body: "TradeHub supports different execution postures for different account types. A workspace may offer Signal Alerts only, or Auto-Copy only for eligible personal accounts. A student seeing a signal inside the product should not assume automatic execution is available or appropriate for every account."
    },
    {
      title: "Funded and prop-firm account caution",
      body: "Funded-account and prop-firm workflows carry stricter operational risk. Students using those accounts should expect more conservative routing, more manual review, and fewer assumptions about automatic execution or account-level compatibility."
    },
    {
      title: "Payment-rail and crypto risk",
      body: "Paystack remains the default local checkout rail. Optional Solana / USDC checkout introduces network, quoting, wallet, confirmation, and settlement considerations that are different from local fiat card or bank flows. A crypto-enabled workspace does not make blockchain payments risk-free."
    }
  ],
  dataUse: [
    {
      title: "Onboarding and vetting use",
      body: "TradeHub uses application, audience, market, and workspace setup data to vet educators, prepare workspaces, and determine whether billing rails or execution modes are appropriate for launch."
    },
    {
      title: "Operational and billing use",
      body: "Student and workspace data support subscriptions, payment verification, settlement tracking, plan readiness, support workflows, and access changes when billing status changes."
    },
    {
      title: "Trust, safety, and dispute handling",
      body: "Operators may review relevant account, payment, settlement, workspace, and support data when handling fraud checks, disputed charges, suspicious activity, or platform-policy concerns. These review flows are bounded and auditable."
    },
    {
      title: "Learning summaries and journal visibility",
      body: "TradeHub uses course progress, subscription status, and journal summary documents to keep student and workspace surfaces responsive without broad scans. Summary visibility does not imply exposure of private student journal internals or hidden notes."
    },
    {
      title: "Optional and deferred data",
      body: "Some data remains optional, deferred, or operator-reviewed in the MVP. Examples include optional Solana workspace readiness, manual settlement notes, and future exports or deeper analytics that are not opened to every role by default."
    }
  ]
};
