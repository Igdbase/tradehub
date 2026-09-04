import type { AdminAuditEvent, AdminSourceMeta } from "@/types/admin-api";
import type {
  IsoDateString,
  PaymentRailStatus,
  Workspace,
  WorkspaceTier
} from "@/types/workspace";
import type { WorkspaceApplication } from "@/types/admin";

export type WorkspaceOnboardingStepKey =
  | "branding"
  | "code_of_conduct"
  | "telegram_bot"
  | "pricing"
  | "paystack"
  | "solana_wallet"
  | "first_course"
  | "review";

export type WorkspaceOnboardingStepStatus =
  | "upcoming"
  | "current"
  | "complete"
  | "optional"
  | "blocked";

export type OnboardingProgressDocument = {
  workspaceId: string;
  applicationId?: string;
  currentStep: WorkspaceOnboardingStepKey;
  completedSteps: WorkspaceOnboardingStepKey[];
  stepStatus: Record<WorkspaceOnboardingStepKey, WorkspaceOnboardingStepStatus>;
  updatedAt: IsoDateString;
  reviewSubmittedAt?: IsoDateString;
};

export type WorkspaceCourseDraftSection = {
  id: string;
  title: string;
  order: number;
};

export type WorkspaceCourseDraft = {
  courseId: string;
  title: string;
  description: string;
  accessTier: "all" | string;
  published: false;
  sections: WorkspaceCourseDraftSection[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type WorkspaceOnboardingLoadResponse = AdminSourceMeta & {
  ok: true;
  workspacePrepared: boolean;
  message: string;
  workspace: Workspace | null;
  progress: OnboardingProgressDocument | null;
  courseDraft: WorkspaceCourseDraft | null;
};

export type WorkspaceOnboardingSaveResponse = AdminSourceMeta & {
  ok: true;
  workspacePrepared: true;
  workspace: Workspace;
  progress: OnboardingProgressDocument;
  auditEvent?: AdminAuditEvent;
};

export type WorkspaceCourseDraftResponse = AdminSourceMeta & {
  ok: true;
  workspacePrepared: true;
  courseDraft: WorkspaceCourseDraft;
  progress: OnboardingProgressDocument;
  auditEvent?: AdminAuditEvent;
};

export type BrandingStepPayload = {
  name: string;
  handle: string;
  ownerDisplayName: string;
  summary: string;
  marketFocus: Workspace["marketFocus"];
  logoMark: string;
  heroLabel: string;
  accentColor: string;
};

export type CodeOfConductStepPayload = {
  accepted: boolean;
};

export type TelegramStepPayload = {
  telegramBotHandle: string;
};

export type PricingStepPayload = {
  singleTier: boolean;
  tiers: WorkspaceTier[];
  freeTrialDays: Workspace["settings"]["freeTrialDays"];
  noCardRequired: boolean;
  refundPolicy: string;
};

export type PaystackStepPayload = {
  paystackSetupStatus: PaymentRailStatus;
  paystackSubaccountCode?: string;
  paystackSplitCode?: string;
  settlementNote: string;
};

export type SolanaWalletStepPayload = {
  solanaPayInterest: boolean;
  solanaPayoutWallet?: string;
  solanaPartnerPlacementEnabled: boolean;
};

export type ReviewStepPayload = {
  readyForOwnerReview: boolean;
};

export type FirstCourseDraftPayload = {
  title: string;
  description: string;
  accessTier: "all" | string;
  sections: string[];
};

export type AdminWorkspaceCreatePayload = {
  applicationId: string;
  workspaceId: string;
  handle: string;
  ownerEmail: string;
  ownerDisplayName: string;
};

export type AdminWorkspaceCreateResponse = AdminSourceMeta & {
  ok: true;
  workspace: Workspace;
  progress: OnboardingProgressDocument;
  application: WorkspaceApplication;
  auditEvent?: AdminAuditEvent;
};

export type AdminWorkspacePatchPayload = Partial<{
  name: string;
  handle: string;
  ownerEmail: string;
  ownerDisplayName: string;
  vettingStatus: Workspace["vettingStatus"];
}>;

export type AdminWorkspacePatchResponse = AdminSourceMeta & {
  ok: true;
  workspace: Workspace;
  auditEvent?: AdminAuditEvent;
};
