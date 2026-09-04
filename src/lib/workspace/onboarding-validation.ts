import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  AdminWorkspaceCreatePayload,
  AdminWorkspacePatchPayload,
  BrandingStepPayload,
  CodeOfConductStepPayload,
  FirstCourseDraftPayload,
  PaystackStepPayload,
  PricingStepPayload,
  ReviewStepPayload,
  SolanaWalletStepPayload,
  TelegramStepPayload,
  WorkspaceOnboardingStepKey
} from "@/types/onboarding";
import type {
  PaymentRailStatus,
  Workspace,
  WorkspaceFeatureKey,
  WorkspaceTier
} from "@/types/workspace";

export const workspaceOnboardingSteps: WorkspaceOnboardingStepKey[] = [
  "branding",
  "code_of_conduct",
  "telegram_bot",
  "pricing",
  "paystack",
  "solana_wallet",
  "first_course",
  "review"
];

export const requiredWorkspaceOnboardingSteps: WorkspaceOnboardingStepKey[] = [
  "branding",
  "code_of_conduct",
  "pricing",
  "paystack",
  "first_course"
];

export const optionalWorkspaceOnboardingSteps: WorkspaceOnboardingStepKey[] = [
  "telegram_bot",
  "solana_wallet"
];

export const approvedAccentColors = [
  "accent",
  "green",
  "amber",
  "neutral",
  "#d9c28c",
  "#93722f",
  "#30d158",
  "#ff9f0a"
] as const;

const markets: Workspace["marketFocus"][] = ["forex", "crypto", "both"];
const freeTrials: Workspace["settings"]["freeTrialDays"][] = [0, 3, 7, 14];
const billingPeriods: WorkspaceTier["billingPeriod"][] = ["monthly", "annual"];
const featureKeys: WorkspaceFeatureKey[] = [
  "course",
  "signalAlerts",
  "autoCopy",
  "journal",
  "tagging",
  "calculators",
  "aiInsights"
];
const railStatuses: PaymentRailStatus[] = [
  "enabled",
  "disabled",
  "pending_verification",
  "partner_only"
];
const vettingStatuses: Workspace["vettingStatus"][] = [
  "pending",
  "approved",
  "rejected",
  "suspended"
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

function sanitizeText(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function isOneOf<T extends string | number>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function toPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toSafeSlug(value: unknown) {
  return sanitizeString(value, 42).toLowerCase();
}

function pushField(fields: Record<string, string>, key: string, message: string) {
  if (!fields[key]) {
    fields[key] = message;
  }
}

function throwFields(fields: Record<string, string>, message = "Fix the highlighted onboarding fields.") {
  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", message, fields);
  }
}

export function normalizeWorkspaceId(value: unknown) {
  return sanitizeString(value, 80);
}

export function validateWorkspaceId(value: unknown, fields: Record<string, string>, key = "workspaceId") {
  const workspaceId = normalizeWorkspaceId(value);

  if (!workspaceId) {
    pushField(fields, key, "Enter a workspace ID.");
  } else if (!/^ws_[a-z0-9_]{2,60}$/.test(workspaceId)) {
    pushField(fields, key, "Workspace IDs should look like ws_apexfx.");
  }

  return workspaceId;
}

export function validateWorkspaceHandle(value: unknown, fields: Record<string, string>, key = "handle") {
  const handle = toSafeSlug(value);

  if (!handle) {
    pushField(fields, key, "Enter a workspace handle.");
  } else if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(handle)) {
    pushField(fields, key, "Use lowercase letters, numbers, and hyphens only.");
  }

  return handle;
}

function validateEmail(value: unknown, fields: Record<string, string>) {
  const email = sanitizeString(value, 160).toLowerCase();

  if (!email) {
    pushField(fields, "ownerEmail", "Enter the influencer email.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    pushField(fields, "ownerEmail", "Enter a valid influencer email.");
  }

  return email;
}

export function validateKnownOnboardingStep(value: unknown): WorkspaceOnboardingStepKey {
  if (isOneOf(value, workspaceOnboardingSteps)) {
    return value;
  }

  throw new AdminApiError(400, "invalid_step", "Choose a valid onboarding step.");
}

export function validateBrandingStepPayload(payload: unknown): BrandingStepPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send branding setup details.");
  }

  const fields: Record<string, string> = {};
  const name = sanitizeString(payload.name, 80);
  const handle = validateWorkspaceHandle(payload.handle, fields);
  const ownerDisplayName = sanitizeString(payload.ownerDisplayName, 80);
  const summary = sanitizeText(payload.summary, 360);
  const marketFocus = isOneOf(payload.marketFocus, markets) ? payload.marketFocus : undefined;
  const logoMark = sanitizeString(payload.logoMark, 5).toUpperCase();
  const heroLabel = sanitizeString(payload.heroLabel, 70);
  const accentColor = sanitizeString(payload.accentColor, 24);

  if (!name) {
    pushField(fields, "name", "Enter the workspace name.");
  }

  if (!ownerDisplayName) {
    pushField(fields, "ownerDisplayName", "Enter the public educator name.");
  }

  if (!summary || summary.length < 24) {
    pushField(fields, "summary", "Add a short but useful workspace summary.");
  }

  if (!marketFocus) {
    pushField(fields, "marketFocus", "Choose a market focus.");
  }

  if (!logoMark || !/^[A-Z0-9]{1,5}$/.test(logoMark)) {
    pushField(fields, "logoMark", "Use 1 to 5 initials or numbers.");
  }

  if (!heroLabel) {
    pushField(fields, "heroLabel", "Add a short hero label.");
  }

  if (!isOneOf(accentColor, approvedAccentColors)) {
    pushField(fields, "accentColor", "Choose one of the approved TradeHub accents.");
  }

  throwFields(fields);

  return {
    name,
    handle,
    ownerDisplayName,
    summary,
    marketFocus: marketFocus ?? "forex",
    logoMark,
    heroLabel,
    accentColor
  };
}

export function validateCodeOfConductPayload(payload: unknown): CodeOfConductStepPayload {
  if (!isRecord(payload) || payload.accepted !== true) {
    throw new AdminApiError(400, "validation_error", "Accept the Code of Conduct before continuing.", {
      accepted: "Read and accept the Code of Conduct."
    });
  }

  return { accepted: true };
}

export function validateTelegramStepPayload(payload: unknown): TelegramStepPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send Telegram setup details.");
  }

  const fields: Record<string, string> = {};
  const telegramBotHandle = sanitizeString(payload.telegramBotHandle, 40);
  const normalized = telegramBotHandle.startsWith("@")
    ? telegramBotHandle
    : telegramBotHandle
      ? `@${telegramBotHandle}`
      : "";

  if (!normalized) {
    pushField(fields, "telegramBotHandle", "Enter the public bot handle only.");
  } else if (!/^@[A-Za-z0-9_]{4,32}[Bb][Oo][Tt]$/.test(normalized)) {
    pushField(fields, "telegramBotHandle", "Telegram bot usernames should end with bot.");
  }

  if (normalized.includes(":") || normalized.length > 40) {
    pushField(fields, "telegramBotHandle", "Do not paste Telegram credentials here.");
  }

  throwFields(fields);

  return { telegramBotHandle: normalized };
}

function normalizeTierId(name: string, index: number) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

  return `tier_${slug || `plan_${index + 1}`}`;
}

function validateTier(value: unknown, index: number, fields: Record<string, string>): WorkspaceTier | null {
  if (!isRecord(value)) {
    pushField(fields, `tiers.${index}`, "Each tier needs a valid setup.");
    return null;
  }

  const name = sanitizeString(value.name, 70);
  const description = sanitizeText(value.description, 180);
  const priceNgn = toPositiveInteger(value.priceNgn);
  const billingPeriod = isOneOf(value.billingPeriod, billingPeriods) ? value.billingPeriod : undefined;
  const features = Array.isArray(value.features)
    ? value.features.filter((feature): feature is WorkspaceFeatureKey => isOneOf(feature, featureKeys))
    : [];
  const tierId =
    sanitizeString(value.tierId, 70) && /^tier_[a-z0-9_]+$/.test(sanitizeString(value.tierId, 70))
      ? sanitizeString(value.tierId, 70)
      : normalizeTierId(name, index);

  if (!name) {
    pushField(fields, `tiers.${index}.name`, "Enter a tier name.");
  }

  if (!description) {
    pushField(fields, `tiers.${index}.description`, "Enter a short tier description.");
  }

  if (!priceNgn) {
    pushField(fields, `tiers.${index}.priceNgn`, "Use a positive whole-number NGN price.");
  }

  if (!billingPeriod) {
    pushField(fields, `tiers.${index}.billingPeriod`, "Choose monthly or annual billing.");
  }

  if (features.length === 0) {
    pushField(fields, `tiers.${index}.features`, "Choose at least one feature.");
  }

  return {
    tierId,
    name,
    description,
    priceNgn: priceNgn ?? 1,
    billingPeriod: billingPeriod ?? "monthly",
    features,
    featured: value.featured === true
  };
}

export function validatePricingStepPayload(payload: unknown): PricingStepPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send pricing setup details.");
  }

  const fields: Record<string, string> = {};
  const singleTier = payload.singleTier === true;
  const tiersInput = Array.isArray(payload.tiers) ? payload.tiers.slice(0, 3) : [];
  const tiers = tiersInput
    .map((tier, index) => validateTier(tier, index, fields))
    .filter((tier): tier is WorkspaceTier => Boolean(tier));
  const freeTrialDays = isOneOf(payload.freeTrialDays, freeTrials) ? payload.freeTrialDays : undefined;
  const refundPolicy = sanitizeText(payload.refundPolicy, 360);

  if (tiers.length < 1) {
    pushField(fields, "tiers", "Add at least one pricing tier.");
  }

  if (Array.isArray(payload.tiers) && payload.tiers.length > 3) {
    pushField(fields, "tiers", "Use no more than three tiers in this setup.");
  }

  if (singleTier && tiers.length !== 1) {
    pushField(fields, "singleTier", "Single-tier workspaces should have exactly one tier.");
  }

  if (freeTrialDays === undefined) {
    pushField(fields, "freeTrialDays", "Choose a valid trial length.");
  }

  if (!refundPolicy || refundPolicy.length < 16) {
    pushField(fields, "refundPolicy", "Add a clear refund policy note.");
  }

  throwFields(fields);

  return {
    singleTier,
    tiers,
    freeTrialDays: freeTrialDays ?? 0,
    noCardRequired: payload.noCardRequired === true,
    refundPolicy
  };
}

function validatePaystackCode(value: unknown, key: string, fields: Record<string, string>) {
  const code = sanitizeString(value, 90).toUpperCase();

  if (!code) {
    return undefined;
  }

  if (!/^[A-Z0-9_ -]{4,90}$/.test(code)) {
    pushField(fields, key, "Use the safe code returned by Paystack, not account details.");
  }

  return code;
}

export function validatePaystackStepPayload(payload: unknown): PaystackStepPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send Paystack readiness details.");
  }

  const fields: Record<string, string> = {};
  const paystackSetupStatus = isOneOf(payload.paystackSetupStatus, railStatuses)
    ? payload.paystackSetupStatus
    : undefined;
  const paystackSubaccountCode = validatePaystackCode(payload.paystackSubaccountCode, "paystackSubaccountCode", fields);
  const paystackSplitCode = validatePaystackCode(payload.paystackSplitCode, "paystackSplitCode", fields);
  const settlementNote = sanitizeText(payload.settlementNote, 280);

  if (!paystackSetupStatus || paystackSetupStatus === "partner_only") {
    pushField(fields, "paystackSetupStatus", "Choose enabled, disabled, or pending verification.");
  }

  if (!settlementNote || settlementNote.length < 12) {
    pushField(fields, "settlementNote", "Add an owner-readable settlement readiness note.");
  }

  throwFields(fields);

  return {
    paystackSetupStatus: paystackSetupStatus ?? "pending_verification",
    paystackSubaccountCode,
    paystackSplitCode,
    settlementNote
  };
}

function containsSecretLikeWalletMaterial(value: string) {
  const lowered = value.toLowerCase();
  return (
    lowered.includes("mnemonic") ||
    lowered.includes("recovery words") ||
    lowered.includes("secret") ||
    lowered.includes("-----begin") ||
    lowered.includes("[") ||
    lowered.includes("{")
  );
}

function validateSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function validateSolanaWalletStepPayload(payload: unknown): SolanaWalletStepPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send Solana readiness details.");
  }

  const fields: Record<string, string> = {};
  const solanaPayInterest = payload.solanaPayInterest === true;
  const solanaPayoutWallet = sanitizeString(payload.solanaPayoutWallet, 96);

  if (solanaPayoutWallet) {
    if (containsSecretLikeWalletMaterial(solanaPayoutWallet) || !validateSolanaAddress(solanaPayoutWallet)) {
      pushField(fields, "solanaPayoutWallet", "Enter only a plausible public Solana wallet address.");
    }
  }

  if (solanaPayInterest && !solanaPayoutWallet) {
    pushField(fields, "solanaPayoutWallet", "Add the public payout wallet or turn off Solana interest.");
  }

  throwFields(fields);

  return {
    solanaPayInterest,
    solanaPayoutWallet: solanaPayoutWallet || undefined,
    solanaPartnerPlacementEnabled: payload.solanaPartnerPlacementEnabled === true
  };
}

export function validateReviewStepPayload(
  payload: unknown,
  completedSteps: WorkspaceOnboardingStepKey[]
): ReviewStepPayload {
  if (!isRecord(payload) || payload.readyForOwnerReview !== true) {
    throw new AdminApiError(400, "validation_error", "Confirm readiness before requesting owner review.", {
      readyForOwnerReview: "Confirm this workspace is ready for owner review."
    });
  }

  const missing = requiredWorkspaceOnboardingSteps.filter((step) => !completedSteps.includes(step));

  if (missing.length > 0) {
    throw new AdminApiError(400, "onboarding_incomplete", "Complete the required steps before owner review.", {
      review: `Missing: ${missing.join(", ")}`
    });
  }

  return { readyForOwnerReview: true };
}

function containsCourseMediaUrl(value: string) {
  const lowered = value.toLowerCase();
  return lowered.includes("http://") || lowered.includes("https://") || lowered.includes("youtube.com") || lowered.includes("youtu.be");
}

export function validateFirstCourseDraftPayload(payload: unknown): FirstCourseDraftPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send the first course draft details.");
  }

  const fields: Record<string, string> = {};
  const title = sanitizeString(payload.title, 90);
  const description = sanitizeText(payload.description, 360);
  const accessTier = sanitizeString(payload.accessTier, 80) || "all";
  const sections = Array.isArray(payload.sections)
    ? payload.sections.map((section) => sanitizeString(section, 90)).filter(Boolean).slice(0, 5)
    : [];

  if (!title) {
    pushField(fields, "title", "Enter a course title.");
  }

  if (!description || description.length < 20) {
    pushField(fields, "description", "Add a short course description.");
  }

  if (sections.length < 2 || sections.length > 5) {
    pushField(fields, "sections", "Add 2 to 5 section titles.");
  }

  if ([title, description, accessTier, ...sections].some(containsCourseMediaUrl)) {
    pushField(fields, "sections", "Do not add raw lesson URLs in this stage.");
  }

  throwFields(fields);

  return {
    title,
    description,
    accessTier,
    sections
  };
}

export function validateAdminWorkspaceCreatePayload(payload: unknown): AdminWorkspaceCreatePayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send workspace shell details.");
  }

  const fields: Record<string, string> = {};
  const applicationId = sanitizeString(payload.applicationId, 90);
  const workspaceId = validateWorkspaceId(payload.workspaceId, fields);
  const handle = validateWorkspaceHandle(payload.handle, fields);
  const ownerEmail = validateEmail(payload.ownerEmail, fields);
  const ownerDisplayName = sanitizeString(payload.ownerDisplayName, 80);

  if (!applicationId) {
    pushField(fields, "applicationId", "Choose an application.");
  }

  if (!ownerDisplayName) {
    pushField(fields, "ownerDisplayName", "Enter the influencer display name.");
  }

  throwFields(fields, "Fix the highlighted workspace shell fields.");

  return {
    applicationId,
    workspaceId,
    handle,
    ownerEmail,
    ownerDisplayName
  };
}

export function validateAdminWorkspacePatchPayload(payload: unknown): AdminWorkspacePatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send workspace fields to update.");
  }

  const fields: Record<string, string> = {};
  const patch: AdminWorkspacePatchPayload = {};

  if ("name" in payload) {
    patch.name = sanitizeString(payload.name, 80);
    if (!patch.name) {
      pushField(fields, "name", "Enter the workspace name.");
    }
  }

  if ("handle" in payload) {
    patch.handle = validateWorkspaceHandle(payload.handle, fields);
  }

  if ("ownerEmail" in payload) {
    patch.ownerEmail = validateEmail(payload.ownerEmail, fields);
  }

  if ("ownerDisplayName" in payload) {
    patch.ownerDisplayName = sanitizeString(payload.ownerDisplayName, 80);
    if (!patch.ownerDisplayName) {
      pushField(fields, "ownerDisplayName", "Enter the owner display name.");
    }
  }

  if ("vettingStatus" in payload) {
    if (isOneOf(payload.vettingStatus, vettingStatuses)) {
      patch.vettingStatus = payload.vettingStatus;
    } else {
      pushField(fields, "vettingStatus", "Choose a valid workspace status.");
    }
  }

  throwFields(fields, "Fix the highlighted workspace fields.");

  return patch;
}
