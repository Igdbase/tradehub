import type {
  AdminApplicationFilters,
  AdminApplicationPatch
} from "@/types/admin-api";
import type {
  ApplicationSource,
  ApplicationStatus,
  PrimaryPlatform,
  ProductOffering,
  SetupFeeStatus,
  VettingOutcome,
  WorkspaceApplication
} from "@/types/tradehub";
import { AdminApiError } from "@/lib/firebase/admin-errors";

const applicationStatuses: ApplicationStatus[] = [
  "new",
  "vetting",
  "approved",
  "rejected",
  "workspace_created",
  "activated"
];
const applicationSources: ApplicationSource[] = ["landing_page", "referral", "manual"];
const primaryPlatforms: PrimaryPlatform[] = [
  "telegram",
  "whatsapp",
  "instagram",
  "x",
  "youtube",
  "discord",
  "website",
  "other"
];
const markets: WorkspaceApplication["market"][] = ["forex", "crypto", "both"];
const studentAccountMixes: WorkspaceApplication["studentAccountMix"][] = [
  "personal",
  "prop_firm",
  "both",
  "unknown"
];
const productOfferings: ProductOffering[] = ["courses", "signals", "mentorship", "community"];
const vettingOutcomes: VettingOutcome[] = ["pending", "approved", "watchlist", "rejected"];
const setupFeeStatuses: SetupFeeStatus[] = ["not_required", "pending", "paid", "waived"];
const workspaceCreationStatuses: WorkspaceApplication["workspaceCreationStatus"][] = [
  "not_started",
  "queued",
  "created"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeString(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeLongText(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toNonNegativeInteger(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function isIsoDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function normalizeLimit(value: string | null, defaultLimit = 25) {
  const parsed = Number(value ?? "");

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(parsed, 50);
}

export function parseApplicationFilters(searchParams: URLSearchParams): AdminApplicationFilters {
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const market = searchParams.get("market");
  const solana = searchParams.get("solana");

  return {
    status: status === "all" || !status ? "all" : isOneOf(status, applicationStatuses) ? status : "all",
    q: sanitizeString(searchParams.get("q"), 120),
    source: source === "all" || !source ? "all" : isOneOf(source, applicationSources) ? source : "all",
    market: market === "all" || !market ? "all" : isOneOf(market, markets) ? market : "all",
    solana: solana === "interested" || solana === "not_interested" ? solana : "all",
    limit: normalizeLimit(searchParams.get("limit")),
    cursor: sanitizeString(searchParams.get("cursor"), 80) || undefined
  };
}

export function validatePublicApplicationPayload(payload: unknown) {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid application payload.");
  }

  const fields: Record<string, string> = {};
  const name = sanitizeString(payload.fullName, 120);
  const email = sanitizeString(payload.email, 160).toLowerCase();
  const handleOrChannel = sanitizeString(payload.handle, 120);
  const audienceSize = toNonNegativeInteger(payload.audienceSize);
  const currentCustomerCount = toNonNegativeInteger(payload.currentCustomerCount);
  const monetizationMethod = sanitizeString(payload.monetizationMethod, 180);
  const notes = sanitizeLongText(payload.notes, 1200);
  const noResultsPromiseAccepted = payload.noResultsPromiseAccepted === true;
  const solanaPayInterest = payload.solanaPayInterest === true;
  const honeypot = sanitizeString(payload.companyWebsite, 200);
  const primaryPlatform = isOneOf(payload.primaryPlatform, primaryPlatforms)
    ? payload.primaryPlatform
    : undefined;
  const market = isOneOf(payload.market, markets) ? payload.market : undefined;
  const studentAccountMix = isOneOf(payload.studentAccountMix, studentAccountMixes)
    ? payload.studentAccountMix
    : undefined;

  if (honeypot) {
    throw new AdminApiError(400, "application_rejected", "This application could not be accepted.");
  }

  if (!name) {
    fields.fullName = "Enter your full name.";
  }

  if (!email) {
    fields.email = "Enter your email address.";
  } else if (!isEmail(email)) {
    fields.email = "Enter a valid email address.";
  }

  if (!primaryPlatform) {
    fields.primaryPlatform = "Choose a primary platform.";
  }

  if (!handleOrChannel) {
    fields.handle = "Enter your handle or channel.";
  }

  if (audienceSize === undefined || audienceSize < 1) {
    fields.audienceSize = "Enter a realistic audience size.";
  }

  if (!market) {
    fields.market = "Select a market.";
  }

  if (!studentAccountMix) {
    fields.studentAccountMix = "Select how your students mostly trade.";
  }

  if (!monetizationMethod) {
    fields.monetizationMethod = "Select your current monetization method.";
  }

  const safeOfferings = Array.isArray(payload.productOfferings)
    ? payload.productOfferings.filter((entry): entry is ProductOffering =>
        isOneOf(entry, productOfferings)
      )
    : [];

  if (safeOfferings.length === 0) {
    fields.productOfferings = "Choose at least one offer.";
  }

  if (payload.currentCustomerCount !== "" && payload.currentCustomerCount !== undefined && currentCustomerCount === undefined) {
    fields.currentCustomerCount = "Use a whole number.";
  }

  if (!notes || notes.length < 24) {
    fields.notes = "Add a little more detail about the audience and launch plan.";
  }

  if (!noResultsPromiseAccepted) {
    fields.noResultsPromiseAccepted = "Confirm that TradeHub does not promise trading results.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", "Fix the highlighted application fields.", fields);
  }

  const now = new Date().toISOString();
  const applicationId = `app_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;

  return {
    applicationId,
    name,
    email,
    primaryPlatform,
    handleOrChannel,
    audienceSize: audienceSize ?? 0,
    market: market ?? "forex",
    studentAccountMix: studentAccountMix ?? "unknown",
    monetizationMethod,
    productOfferings: safeOfferings,
    currentCustomerCount,
    solanaPayInterest,
    noResultsPromiseAccepted,
    notes,
    status: "new",
    vettingOutcome: "pending",
    vettingNotes: "",
    setupFeeStatus: "not_required",
    source: "landing_page",
    workspaceCreationStatus: "not_started",
    createdAt: now,
    updatedAt: now
  } satisfies WorkspaceApplication;
}

export function validateApplicationPatchPayload(
  payload: unknown,
  current: WorkspaceApplication
): AdminApplicationPatch {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid application update payload.");
  }

  const next: AdminApplicationPatch = {};
  const fields: Record<string, string> = {};

  if ("status" in payload) {
    if (isOneOf(payload.status, applicationStatuses)) {
      next.status = payload.status;
    } else {
      fields.status = "Choose a valid application status.";
    }
  }

  if ("vettingOutcome" in payload) {
    if (isOneOf(payload.vettingOutcome, vettingOutcomes)) {
      next.vettingOutcome = payload.vettingOutcome;
    } else {
      fields.vettingOutcome = "Choose a valid vetting outcome.";
    }
  }

  if ("vettingNotes" in payload) {
    next.vettingNotes = sanitizeLongText(payload.vettingNotes, 1600);
  }

  if ("setupFeeStatus" in payload) {
    if (isOneOf(payload.setupFeeStatus, setupFeeStatuses)) {
      next.setupFeeStatus = payload.setupFeeStatus;
    } else {
      fields.setupFeeStatus = "Choose a valid setup fee status.";
    }
  }

  if ("workspaceCreationStatus" in payload) {
    if (isOneOf(payload.workspaceCreationStatus, workspaceCreationStatuses)) {
      next.workspaceCreationStatus = payload.workspaceCreationStatus;
    } else {
      fields.workspaceCreationStatus = "Choose a valid workspace creation status.";
    }
  }

  if ("workspaceId" in payload) {
    const workspaceId = sanitizeString(payload.workspaceId, 80);
    if (workspaceId && !/^ws_[a-z0-9_]+$/.test(workspaceId)) {
      fields.workspaceId = "Workspace IDs should look like ws_workspace_name.";
    } else {
      next.workspaceId = workspaceId || undefined;
    }
  }

  if ("firstPayingStudentAt" in payload) {
    const firstPayingStudentAt = sanitizeString(payload.firstPayingStudentAt, 40);

    if (firstPayingStudentAt && !isIsoDate(firstPayingStudentAt)) {
      fields.firstPayingStudentAt = "Use an ISO timestamp for first paying student.";
    } else {
      next.firstPayingStudentAt = firstPayingStudentAt || undefined;
    }
  }

  const merged = {
    ...current,
    ...next
  };

  if (merged.status === "rejected" && merged.vettingOutcome !== "rejected") {
    fields.status = "Rejected applications must use the rejected vetting outcome.";
  }

  if (merged.status === "activated" && merged.workspaceCreationStatus !== "created") {
    fields.status = "Activated applications need a created workspace first.";
  }

  if (merged.workspaceCreationStatus === "created" && !merged.workspaceId) {
    fields.workspaceId = "Add a workspace ID before marking the workspace as created.";
  }

  if (merged.status === "workspace_created" && merged.workspaceCreationStatus !== "created") {
    fields.workspaceCreationStatus = "Workspace-created status requires workspace creation to be marked created.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", "Fix the highlighted admin update fields.", fields);
  }

  return next;
}
