import type { AdminSourceMeta } from "@/types/admin-api";
import type { StudentAccountLinkedPerformancePreview } from "@/types/crypto-execution";
import type { StudentCourseListItem } from "@/types/course-hub";
import type {
  FeatureEntitlementAccess,
  StudentEntitlementSummary,
  StudentRiskPosture,
  StudentSubscriptionAccessStatus
} from "@/types/entitlements";
import type { IsoDateString, Workspace } from "@/types/workspace";
import type {
  WorkspaceSignalDirection,
  WorkspaceSignalMarket,
  WorkspaceSignalRiskLabel,
  WorkspaceSignalStatus
} from "@/types/workspace-dashboard";

export type StudentAppSubscriptionStatus = StudentSubscriptionAccessStatus;
export type StudentCopierMode = "auto_copy" | "signal_alerts_only";
export type StudentCopierStatus = "active" | "paused" | "not_connected" | "not_eligible";

export type StudentAppProfile = {
  studentId: string;
  workspaceId: string;
  displayName: string;
  email?: string;
  tierId: string;
  tierLabel: string;
  subscriptionStatus: StudentAppSubscriptionStatus;
  joinedAt?: IsoDateString;
  lastSeenAt?: IsoDateString;
  courseProgressPercent: number;
  riskPosture: StudentRiskPosture;
  entitlements: StudentEntitlementSummary;
  courseAccessState: FeatureEntitlementAccess;
  courseAccessReason: string;
  signalAccess: boolean;
  signalAccessState: FeatureEntitlementAccess;
  signalAccessReason: string;
  autoCopyEligible: boolean;
  autoCopyAccessState: FeatureEntitlementAccess;
  autoCopyAccessReason: string;
  accountMode: StudentCopierMode;
  copierStatus: StudentCopierStatus;
  journalPrivate: boolean;
  journalAccessState: FeatureEntitlementAccess;
  journalAccessReason: string;
  paymentRail: "paystack" | "solana" | "manual" | "unknown";
};

export type StudentJournalSummary = {
  workspaceId: string;
  studentId: string;
  totalTrades30d: number;
  winRate30d: number;
  averageRiskReward30d: number;
  pnl30dNgn: number;
  bestPair?: string;
  mostActivePair?: string;
  privacyState: "private" | "workspace_visible";
  summaryState: "live" | "zero_safe";
  updatedAt: IsoDateString;
};

export type StudentAppSummary = {
  workspaceId: string;
  studentId: string;
  tierId: string;
  tierLabel: string;
  courseProgressPercent: number;
  completedCourseCount: number;
  liveSignalsCount: number;
  latestSignalAt?: IsoDateString;
  journalPnl30dNgn: number;
  journalWinRate30d: number;
  copierMode: StudentCopierMode;
  copierStatus: StudentCopierStatus;
  updatedAt: IsoDateString;
};

export type StudentSignalCard = {
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
  deliveryMode: "manual_review" | "alerts_only";
  publishedAt?: IsoDateString;
  updatedAt: IsoDateString;
};

export type StudentAppOverviewResponse = AdminSourceMeta & {
  ok: true;
  workspace: Workspace;
  student: StudentAppProfile;
  summary: StudentAppSummary;
  courses: StudentCourseListItem[];
  latestSignal: StudentSignalCard | null;
  journal: StudentJournalSummary;
};

export type StudentSignalsResponse = AdminSourceMeta & {
  ok: true;
  student: Pick<
    StudentAppProfile,
    | "studentId"
    | "tierId"
    | "tierLabel"
    | "riskPosture"
    | "signalAccessState"
    | "signalAccessReason"
    | "autoCopyAccessState"
    | "autoCopyAccessReason"
    | "signalAccess"
    | "autoCopyEligible"
    | "accountMode"
  >;
  signals: StudentSignalCard[];
  mode: StudentCopierMode;
  autoCopyEligible: boolean;
  pageInfo: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
    totalLoaded: number;
  };
};

export type StudentCopierResponse = AdminSourceMeta & {
  ok: true;
  workspace: Pick<Workspace, "workspaceId" | "name" | "handle">;
  student: StudentAppProfile;
  mode: StudentCopierMode;
  status: StudentCopierStatus;
  safetyNotes: string[];
};

export type StudentJournalSummaryResponse = AdminSourceMeta & {
  ok: true;
  student: Pick<
    StudentAppProfile,
    | "studentId"
    | "displayName"
    | "journalPrivate"
    | "journalAccessState"
    | "journalAccessReason"
    | "tierLabel"
  >;
  journal: StudentJournalSummary;
  accountLinkedPerformance: StudentAccountLinkedPerformancePreview;
};
