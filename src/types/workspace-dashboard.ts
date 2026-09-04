import type { AdminAuditEvent, AdminSourceMeta } from "@/types/admin-api";
import type {
  CryptoSignalRoutingSummary,
  ForexPaperRoutingSummary,
  ForexDemoRoutingSummary,
  ForexLiveCanaryRoutingSummary,
  LiveProductionRoutingSummary,
  LiveSandboxRoutingSummary
} from "@/types/crypto-execution";
import type {
  FeatureEntitlementAccess,
  StudentRiskPosture
} from "@/types/entitlements";
import type { IsoDateString, PaymentRail, Workspace } from "@/types/workspace";
import type { OnboardingProgressDocument } from "@/types/onboarding";
import type { CourseResourceSummary, WorkspaceCourseCompletionSummary } from "@/types/course-hub";
import type {
  WorkspaceBrandingReadiness,
  WorkspaceEnterpriseDeploymentReadiness,
  WorkspacePackageStatus
} from "@/types/workspace-package";

export type WorkspaceOwnerApprovalStatus =
  | "pending_review"
  | "approved"
  | "changes_requested";

export type WorkspaceDashboardSummary = {
  workspaceId: string;
  activeStudentsCount: number;
  trialStudentsCount: number;
  pastDueStudentsCount: number;
  monthlyRevenueNgn: number;
  lifetimeRevenueNgn: number;
  paystackVolumeNgn: number;
  solanaVolumeUsd: number;
  pendingSignalsCount: number;
  publishedSignalsCount: number;
  lastSignalAt?: IsoDateString;
  courseCount: number;
  publishedCourseCount: number;
  draftCourseCount: number;
  averageCourseCompletionPercent: number;
  onboardingReviewSubmittedAt?: IsoDateString;
  ownerApprovalStatus: WorkspaceOwnerApprovalStatus;
  packageStatus: WorkspacePackageStatus;
  brandingReadiness: WorkspaceBrandingReadiness;
  enterpriseReadiness: WorkspaceEnterpriseDeploymentReadiness;
  updatedAt: IsoDateString;
};

export type WorkspaceStudentStatus =
  | "trial"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled";

export type WorkspaceStudentLifecycleStatus =
  | "active"
  | "pending_onboarding"
  | "payment_access_issue"
  | "paused"
  | "inactive"
  | "needs_support";

export type WorkspaceStudentSupportAction =
  | "mark_support_follow_up"
  | "clear_support_follow_up"
  | "save_support_note"
  | "update_operational_status";

export type WorkspaceStudentSupportPatchPayload = {
  action: WorkspaceStudentSupportAction;
  lifecycleStatus?: WorkspaceStudentLifecycleStatus;
  supportNoteSummary?: string;
};

export type WorkspaceStudentBillingOpsStatus =
  | "unpaid_pending_payment"
  | "active_subscription"
  | "expired_cancelled_subscription"
  | "verification_pending"
  | "payment_mismatch_needs_admin_review"
  | "payment_issue_resolved";

export type WorkspaceStudentRecord = {
  studentId: string;
  practiceStudentRef: string;
  workspaceId: string;
  displayName: string;
  email?: string;
  tierId: string;
  tierLabel: string;
  status: WorkspaceStudentStatus;
  paymentRail: PaymentRail | "manual" | "unknown";
  billingOpsStatus: WorkspaceStudentBillingOpsStatus;
  billingOpsLabel: string;
  billingOpsDetail: string;
  billingAdminReviewPending: boolean;
  lifecycleStatus: WorkspaceStudentLifecycleStatus;
  supportFollowUpNeeded: boolean;
  supportNoteSummary?: string;
  supportUpdatedAt?: IsoDateString;
  supportUpdatedByRef?: string;
  joinedAt: IsoDateString;
  lastSeenAt?: IsoDateString;
  courseCompletionPercent: number;
  courseAccessState: FeatureEntitlementAccess;
  courseAccessReason: string;
  signalAccess: boolean;
  signalAccessState: FeatureEntitlementAccess;
  signalAccessReason: string;
  autoCopyEligible: boolean;
  autoCopyAccessState: FeatureEntitlementAccess;
  autoCopyAccessReason: string;
  journalAccessState: FeatureEntitlementAccess;
  journalAccessReason: string;
  riskPosture: StudentRiskPosture;
};

export type WorkspaceCourseListItem = {
  courseId: string;
  workspaceId: string;
  title: string;
  description: string;
  accessTier: "all" | string;
  published: boolean;
  sectionCount: number;
  lessonCount?: number;
  completionSummary?: WorkspaceCourseCompletionSummary;
  resourceSummary: CourseResourceSummary;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type WorkspaceSignalStatus = "draft" | "published" | "cancelled";
export type WorkspaceSignalMarket = "forex" | "crypto";
export type WorkspaceSignalDirection = "buy" | "sell";
export type WorkspaceSignalRiskLabel = "low" | "medium" | "high";
export type WorkspaceSignalDeliveryMode = "manual_review" | "alerts_only";

export type WorkspaceSignalRecord = {
  signalId: string;
  workspaceId: string;
  status: WorkspaceSignalStatus;
  market: WorkspaceSignalMarket;
  pair: string;
  direction: WorkspaceSignalDirection;
  entry: string;
  takeProfit: string;
  stopLoss: string;
  riskLabel: WorkspaceSignalRiskLabel;
  notes?: string;
  deliveryMode: WorkspaceSignalDeliveryMode;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  publishedAt?: IsoDateString;
};

export type WorkspaceListPageInfo = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  totalLoaded: number;
};

export type WorkspaceDashboardResponse = AdminSourceMeta & {
  ok: true;
  workspacePrepared: boolean;
  workspace: Workspace | null;
  onboarding: OnboardingProgressDocument | null;
  summary: WorkspaceDashboardSummary;
};

export type WorkspaceStudentsResponse = AdminSourceMeta & {
  ok: true;
  students: WorkspaceStudentRecord[];
  pageInfo: WorkspaceListPageInfo;
};

export type WorkspaceStudentSupportMutationResponse = AdminSourceMeta & {
  ok: true;
  student: WorkspaceStudentRecord;
  auditEvent?: AdminAuditEvent;
};

export type WorkspaceCoursesResponse = AdminSourceMeta & {
  ok: true;
  courses: WorkspaceCourseListItem[];
  pageInfo: WorkspaceListPageInfo;
};

export type WorkspaceSignalsResponse = AdminSourceMeta & {
  ok: true;
  signals: WorkspaceSignalRecord[];
  pageInfo: WorkspaceListPageInfo;
};

export type WorkspaceSignalDraftPayload = {
  market: WorkspaceSignalMarket;
  pair: string;
  direction: WorkspaceSignalDirection;
  entry: string;
  takeProfit: string;
  stopLoss: string;
  riskLabel: WorkspaceSignalRiskLabel;
  notes?: string;
  deliveryMode: WorkspaceSignalDeliveryMode;
  publish?: boolean;
};

export type WorkspaceSignalPatchPayload = Partial<WorkspaceSignalDraftPayload> & {
  action: "save_draft" | "publish" | "cancel";
};

export type WorkspaceSignalMutationResponse = AdminSourceMeta & {
  ok: true;
  signal: WorkspaceSignalRecord;
  auditEvent?: AdminAuditEvent;
  cryptoRoutingSummary?: CryptoSignalRoutingSummary;
  forexPaperRoutingSummary?: ForexPaperRoutingSummary;
  forexDemoRoutingSummary?: ForexDemoRoutingSummary;
  forexLiveCanaryRoutingSummary?: ForexLiveCanaryRoutingSummary;
  liveSandboxRoutingSummary?: LiveSandboxRoutingSummary;
  liveProductionRoutingSummary?: LiveProductionRoutingSummary;
};
