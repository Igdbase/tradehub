import type { IsoDateString } from "@/types/workspace";

export type ApplicationStatus =
  | "new"
  | "vetting"
  | "approved"
  | "rejected"
  | "workspace_created"
  | "activated";

export type SetupFeeStatus = "not_required" | "pending" | "paid" | "waived";

export type VettingOutcome = "pending" | "approved" | "watchlist" | "rejected";

export type ApplicationSource = "landing_page" | "referral" | "manual";

export type ProductOffering = "courses" | "signals" | "mentorship" | "community";

export type PrimaryPlatform =
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "x"
  | "youtube"
  | "discord"
  | "website"
  | "other";

export type OnboardingStepKey =
  | "vetting"
  | "branding"
  | "code_of_conduct"
  | "telegram_bot"
  | "pricing"
  | "paystack"
  | "solana_wallet"
  | "first_course"
  | "first_paying_student";

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  detail: string;
  required: boolean;
}

export interface OnboardingStepProgress {
  key: OnboardingStepKey;
  title: string;
  detail: string;
  status: "complete" | "current" | "upcoming" | "optional";
  progressPercent: number;
  completedAt?: IsoDateString;
}

export interface OnboardingProgress {
  workspaceId: string;
  applicationId: string;
  steps: OnboardingStepProgress[];
}

export interface WorkspaceApplication {
  applicationId: string;
  name: string;
  email: string;
  primaryPlatform?: PrimaryPlatform;
  handleOrChannel: string;
  audienceSize: number;
  market: "forex" | "crypto" | "both";
  studentAccountMix: "personal" | "prop_firm" | "both" | "unknown";
  monetizationMethod: string;
  productOfferings?: ProductOffering[];
  currentCustomerCount?: number;
  solanaPayInterest?: boolean;
  noResultsPromiseAccepted?: boolean;
  notes: string;
  status: ApplicationStatus;
  vettingOutcome: VettingOutcome;
  vettingNotes: string;
  setupFeeStatus: SetupFeeStatus;
  workspaceId?: string;
  source: ApplicationSource;
  workspaceCreationStatus: "not_started" | "queued" | "created";
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  firstPayingStudentAt?: IsoDateString;
}

export type DisputeType = "transaction" | "conduct" | "chargeback";

export type DisputeStatus = "open" | "escalated" | "resolved";

export interface Dispute {
  disputeId: string;
  workspaceId: string;
  raisedBy: string;
  type: DisputeType;
  relatedId: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: IsoDateString;
  resolvedAt?: IsoDateString;
}

export interface RiskFlag {
  flagId: string;
  workspaceId: string;
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
  createdAt: IsoDateString;
}

export interface AuditEventSummary {
  eventId: string;
  actor: string;
  action: string;
  target: string;
  timestamp: IsoDateString;
}

export interface SuperAdminMetrics {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalStudents: number;
  activeSubscribers: number;
  monthlyRevenueNgn: number;
  monthlyPlatformRevenueNgn: number;
  openApplications: number;
  openDisputes: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  grossNgn: number;
  platformNgn: number;
}

export interface WorkspaceRevenueSnapshot {
  workspaceId: string;
  grossNgn: number;
  activeStudents: number;
  chargebackRatePercent: number;
}
