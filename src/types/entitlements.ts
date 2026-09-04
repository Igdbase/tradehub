import type { BillingSubscriptionStatus } from "@/types/payments";
import type { Workspace, WorkspaceFeatureKey, WorkspaceTier } from "@/types/workspace";

export type StudentSubscriptionAccessStatus =
  | BillingSubscriptionStatus
  | "trial"
  | "paused"
  | "unknown";

export type WorkspacePricingMode = "single_tier" | "multi_tier";

export type FeatureEntitlementAccess =
  | "allowed"
  | "locked_by_tier"
  | "locked_by_subscription"
  | "alerts_only"
  | "feature_not_enabled";

export type StudentRiskPosture = "personal_account" | "funded_account" | "unknown";

export interface FeatureEntitlement {
  feature: WorkspaceFeatureKey;
  access: FeatureEntitlementAccess;
  included: boolean;
  reason: string;
}

export type StudentFeatureEntitlements = Record<WorkspaceFeatureKey, FeatureEntitlement>;

export interface StudentEntitlementSummary {
  pricingMode: WorkspacePricingMode;
  tierId: string;
  tierLabel: string;
  tier: WorkspaceTier | null;
  subscriptionStatus: StudentSubscriptionAccessStatus;
  subscriptionActive: boolean;
  riskPosture: StudentRiskPosture;
  features: StudentFeatureEntitlements;
}

export interface StudentEntitlementWorkspaceContext {
  workspace: Workspace;
  tierId: string;
  tierLabel: string;
  tier: WorkspaceTier | null;
}
