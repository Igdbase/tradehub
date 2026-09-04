import type {
  ApplicationSource,
  ApplicationStatus,
  SetupFeeStatus,
  VettingOutcome,
  WorkspaceApplication
} from "@/types/tradehub";

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  new: "New",
  vetting: "Vetting",
  approved: "Approved",
  rejected: "Rejected",
  workspace_created: "Workspace Created",
  activated: "Activated"
};

export const applicationStatusOrder: ApplicationStatus[] = [
  "new",
  "vetting",
  "approved",
  "rejected",
  "workspace_created",
  "activated"
];

export const applicationSourceLabels: Record<ApplicationSource, string> = {
  landing_page: "Landing page",
  referral: "Referral",
  manual: "Manual"
};

export const vettingOutcomeLabels: Record<VettingOutcome, string> = {
  pending: "Pending",
  approved: "Approved",
  watchlist: "Watchlist",
  rejected: "Rejected"
};

export const setupFeeStatusLabels: Record<SetupFeeStatus, string> = {
  not_required: "Not required",
  pending: "Pending",
  paid: "Paid",
  waived: "Waived"
};

export const workspaceCreationLabels: Record<WorkspaceApplication["workspaceCreationStatus"], string> = {
  not_started: "Not started",
  queued: "Queued",
  created: "Created"
};

export function getStatusTone(status: ApplicationStatus) {
  if (status === "activated" || status === "workspace_created" || status === "approved") {
    return "green" as const;
  }

  if (status === "vetting") {
    return "amber" as const;
  }

  if (status === "rejected") {
    return "red" as const;
  }

  return "accent" as const;
}

export function getWorkspaceIdSuggestion(application: WorkspaceApplication) {
  const seed = application.handleOrChannel || application.name;
  const slug = seed
    .toLowerCase()
    .replace(/@/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

  return `ws_${slug || "workspace"}`;
}

export function getWorkspaceHandleSuggestion(application: WorkspaceApplication) {
  const seed = application.handleOrChannel || application.name;
  const slug = seed
    .toLowerCase()
    .replace(/@/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 38);

  return slug || "workspace";
}
