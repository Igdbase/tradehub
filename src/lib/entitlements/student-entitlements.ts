import type {
  FeatureEntitlement,
  FeatureEntitlementAccess,
  StudentEntitlementSummary,
  StudentRiskPosture,
  StudentSubscriptionAccessStatus,
  WorkspacePricingMode
} from "@/types/entitlements";
import type { StudentSubscription } from "@/types/payments";
import type { Workspace, WorkspaceFeatureKey } from "@/types/workspace";

const ENTITLEMENT_FEATURE_KEYS: WorkspaceFeatureKey[] = [
  "course",
  "signalAlerts",
  "autoCopy",
  "journal",
  "tagging",
  "calculators",
  "aiInsights"
];

const FEATURE_LABELS: Record<WorkspaceFeatureKey, string> = {
  course: "Course Hub",
  signalAlerts: "Signal Alerts",
  autoCopy: "Auto-Copy",
  journal: "Journal",
  tagging: "Trade tagging",
  calculators: "Calculators",
  aiInsights: "AI insights"
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<StudentSubscriptionAccessStatus>([
  "active",
  "trial",
  "non_renewing"
]);

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizePricingMode(workspace: Workspace): WorkspacePricingMode {
  return workspace.settings.singleTier || workspace.tiers.length <= 1
    ? "single_tier"
    : "multi_tier";
}

function normalizeFeatureSet(features: WorkspaceFeatureKey[]) {
  const set = new Set<WorkspaceFeatureKey>(features);

  // Auto-Copy without Signal Alerts would create an impossible packaging shape.
  if (set.has("autoCopy")) {
    set.add("signalAlerts");
  }

  return set;
}

function unionWorkspaceFeatures(workspace: Workspace) {
  const set = new Set<WorkspaceFeatureKey>();

  workspace.tiers.forEach((tier) => {
    normalizeFeatureSet(tier.features).forEach((feature) => set.add(feature));
  });

  return set;
}

function normalizeSubscriptionStatus(value: string): StudentSubscriptionAccessStatus {
  switch (value) {
    case "trialing":
      return "trial";
    case "active":
    case "inactive":
    case "past_due":
    case "non_renewing":
    case "cancelled":
    case "expired":
    case "trial":
    case "paused":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function resolveRawSubscriptionStatus(
  studentRecord: Record<string, unknown>,
  subscription: StudentSubscription | null
) {
  return normalizeSubscriptionStatus(
    asString(
      subscription?.status,
      asString(studentRecord.subscriptionStatus, asString(studentRecord.status, "unknown"))
    )
  );
}

function resolveStudentRiskPosture(studentRecord: Record<string, unknown>): StudentRiskPosture {
  const brokerLink = asRecord(studentRecord.brokerLink);
  const brokerType = asString(brokerLink.type);
  const accountMode = asString(studentRecord.accountMode, asString(studentRecord.executionMode));
  const accountMix = asString(studentRecord.studentAccountMix);

  if (brokerType === "prop_firm" || accountMix === "prop_firm") {
    return "funded_account";
  }

  if (brokerType === "forex_personal" || brokerType === "crypto") {
    return "personal_account";
  }

  if (accountMode === "auto_copy" || asBoolean(studentRecord.autoCopyEligible)) {
    return "personal_account";
  }

  if (accountMode === "signal_alerts" || accountMode === "signal_alerts_only") {
    return "funded_account";
  }

  return "unknown";
}

function resolveTierContext({
  workspace,
  studentRecord,
  subscription,
  claimedTierId
}: {
  workspace: Workspace;
  studentRecord: Record<string, unknown>;
  subscription: StudentSubscription | null;
  claimedTierId?: string | null;
}) {
  const requestedTierId = asString(
    subscription?.tierId,
    asString(
      studentRecord.tierId,
      asString(studentRecord.subscriptionTierId, asString(claimedTierId, workspace.tiers[0]?.tierId ?? "all"))
    )
  );
  const requestedTierLabel = asString(
    subscription?.tierLabel,
    asString(studentRecord.tierLabel, asString(studentRecord.subscriptionTierName))
  );
  const exactTier = workspace.tiers.find((tier) => tier.tierId === requestedTierId) ?? null;

  if (exactTier) {
    return {
      tierId: exactTier.tierId,
      tierLabel: requestedTierLabel || exactTier.name,
      tier: exactTier,
      tierFeatures: normalizeFeatureSet(exactTier.features)
    };
  }

  if (requestedTierId === "all") {
    return {
      tierId: "all",
      tierLabel: requestedTierLabel || "All tiers",
      tier: null,
      tierFeatures: unionWorkspaceFeatures(workspace)
    };
  }

  if (workspace.tiers.length === 1) {
    const tier = workspace.tiers[0];
    return {
      tierId: tier.tierId,
      tierLabel: requestedTierLabel || tier.name,
      tier,
      tierFeatures: normalizeFeatureSet(tier.features)
    };
  }

  return {
    tierId: requestedTierId || "unknown",
    tierLabel: requestedTierLabel || requestedTierId || "Unknown tier",
    tier: null,
    tierFeatures: new Set<WorkspaceFeatureKey>()
  };
}

function buildReason(
  feature: WorkspaceFeatureKey,
  access: FeatureEntitlementAccess,
  context: {
    subscriptionStatus: StudentSubscriptionAccessStatus;
  }
) {
  const label = FEATURE_LABELS[feature];

  switch (access) {
    case "allowed":
      return `${label} is included in this student's current access.`;
    case "locked_by_tier":
      return `${label} is not included in this student's current tier.`;
    case "locked_by_subscription":
      return context.subscriptionStatus === "past_due"
        ? `${label} is locked until the subscription is brought back into good standing.`
        : `${label} is locked because this student's subscription is not active for access.`;
    case "alerts_only":
      return "This account stays on Signal Alerts only because funded-account students are not routed into automatic execution.";
    case "feature_not_enabled":
      return `${label} is not enabled in this workspace's current tier packaging.`;
    default:
      return `${label} is unavailable.`;
  }
}

export function isActiveStudentSubscriptionStatus(status: StudentSubscriptionAccessStatus) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

export function resolveStudentEntitlements({
  workspace,
  studentRecord,
  subscription,
  claimedTierId
}: {
  workspace: Workspace;
  studentRecord: Record<string, unknown>;
  subscription: StudentSubscription | null;
  claimedTierId?: string | null;
}): StudentEntitlementSummary {
  const subscriptionStatus = resolveRawSubscriptionStatus(studentRecord, subscription);
  const subscriptionActive = isActiveStudentSubscriptionStatus(subscriptionStatus);
  const riskPosture = resolveStudentRiskPosture(studentRecord);
  const tierContext = resolveTierContext({
    workspace,
    studentRecord,
    subscription,
    claimedTierId
  });
  const workspaceFeatures = unionWorkspaceFeatures(workspace);

  const features = ENTITLEMENT_FEATURE_KEYS.reduce<Record<WorkspaceFeatureKey, FeatureEntitlement>>(
    (accumulator, feature) => {
      const workspaceOffersFeature = workspaceFeatures.has(feature);
      const tierIncludesFeature = tierContext.tierFeatures.has(feature);
      let access: FeatureEntitlementAccess;

      if (!workspaceOffersFeature) {
        access = "feature_not_enabled";
      } else if (!subscriptionActive) {
        access = "locked_by_subscription";
      } else if (!tierIncludesFeature) {
        access = "locked_by_tier";
      } else if (feature === "autoCopy" && riskPosture === "funded_account") {
        access = "alerts_only";
      } else {
        access = "allowed";
      }

      accumulator[feature] = {
        feature,
        access,
        included: access === "allowed" || access === "alerts_only",
        reason: buildReason(feature, access, { subscriptionStatus })
      };

      return accumulator;
    },
    {} as Record<WorkspaceFeatureKey, FeatureEntitlement>
  );

  return {
    pricingMode: normalizePricingMode(workspace),
    tierId: tierContext.tierId,
    tierLabel: tierContext.tierLabel,
    tier: tierContext.tier,
    subscriptionStatus,
    subscriptionActive,
    riskPosture,
    features
  };
}

export function getFeatureEntitlement(
  entitlements: StudentEntitlementSummary,
  feature: WorkspaceFeatureKey
) {
  return entitlements.features[feature];
}

export function getStudentCopierMode(entitlements: StudentEntitlementSummary) {
  return entitlements.features.autoCopy.access === "allowed"
    ? "auto_copy"
    : "signal_alerts_only";
}

export function isStudentFeatureAccessible(
  entitlements: StudentEntitlementSummary,
  feature: WorkspaceFeatureKey
) {
  return entitlements.features[feature].access === "allowed";
}

export { ENTITLEMENT_FEATURE_KEYS, FEATURE_LABELS };
