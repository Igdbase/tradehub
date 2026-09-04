import type {
  PrimaryPlatform,
  ProductOffering,
  WorkspaceApplication
} from "@/types/tradehub";

export type LandingApplicationValues = {
  fullName: string;
  email: string;
  primaryPlatform: PrimaryPlatform | "";
  handle: string;
  audienceSize: string;
  market: WorkspaceApplication["market"] | "";
  studentAccountMix: WorkspaceApplication["studentAccountMix"] | "";
  monetizationMethod: string;
  productOfferings: ProductOffering[];
  currentCustomerCount: string;
  solanaPayInterest: boolean;
  notes: string;
  noResultsPromiseAccepted: boolean;
  companyWebsite: string;
};

export type LandingApplicationErrors = Partial<Record<keyof LandingApplicationValues, string>>;

type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export const initialLandingApplicationValues: LandingApplicationValues = {
  fullName: "",
  email: "",
  primaryPlatform: "",
  handle: "",
  audienceSize: "",
  market: "",
  studentAccountMix: "",
  monetizationMethod: "",
  productOfferings: [],
  currentCustomerCount: "",
  solanaPayInterest: false,
  notes: "",
  noResultsPromiseAccepted: false,
  companyWebsite: ""
};

export const primaryPlatformOptions: SelectOption<PrimaryPlatform>[] = [
  {
    value: "telegram",
    label: "Telegram",
    description: "Signal channels and communities"
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Broadcast lists or private groups"
  },
  {
    value: "instagram",
    label: "Instagram",
    description: "DM-led mentorship and reels audience"
  },
  {
    value: "x",
    label: "X / Twitter",
    description: "Threads, live market commentary, and DMs"
  },
  {
    value: "youtube",
    label: "YouTube",
    description: "Video-first course and commentary funnel"
  },
  {
    value: "discord",
    label: "Discord",
    description: "Community and signal room structure"
  },
  {
    value: "website",
    label: "Website",
    description: "Standalone landing page or checkout today"
  },
  {
    value: "other",
    label: "Other",
    description: "Another primary acquisition channel"
  }
];

export const marketOptions: SelectOption<WorkspaceApplication["market"]>[] = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "both", label: "Forex + Crypto" }
];

export const studentAccountMixOptions: SelectOption<WorkspaceApplication["studentAccountMix"]>[] = [
  {
    value: "personal",
    label: "Mostly personal accounts"
  },
  {
    value: "prop_firm",
    label: "Mostly prop-firm / funded accounts"
  },
  {
    value: "both",
    label: "Mixed"
  },
  {
    value: "unknown",
    label: "Not sure yet"
  }
];

export const monetizationOptions = [
  "Telegram or WhatsApp membership",
  "One-off courses or PDF packs",
  "Signals and private breakdowns",
  "Mentorship or coaching cohort",
  "Paid community with live rooms",
  "Mixed offers today"
] as const;

export const productOfferingOptions: SelectOption<ProductOffering>[] = [
  { value: "courses", label: "Courses" },
  { value: "signals", label: "Signals" },
  { value: "mentorship", label: "Mentorship" },
  { value: "community", label: "Community" }
];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toPositiveInteger(value: string) {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return undefined;
  }

  return parsed;
}

function getSelectLabel<T extends string>(value: T | "" | undefined, options: ReadonlyArray<SelectOption<T>>) {
  if (!value) {
    return undefined;
  }

  return options.find((option) => option.value === value)?.label;
}

export function getPrimaryPlatformLabel(value?: PrimaryPlatform | "") {
  return getSelectLabel(value, primaryPlatformOptions) ?? "Not shared";
}

export function getMarketLabel(value?: WorkspaceApplication["market"] | "") {
  return getSelectLabel(value, marketOptions) ?? "Not shared";
}

export function getStudentAccountMixLabel(value?: WorkspaceApplication["studentAccountMix"] | "") {
  return getSelectLabel(value, studentAccountMixOptions) ?? "Not shared";
}

export function getProductOfferingLabels(values: ProductOffering[]) {
  return values.map((value) => productOfferingOptions.find((option) => option.value === value)?.label ?? value);
}

export function validateLandingApplication(values: LandingApplicationValues): LandingApplicationErrors {
  const errors: LandingApplicationErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const handle = values.handle.trim();
  const audienceSize = toPositiveInteger(values.audienceSize);
  const currentCustomerCount =
    values.currentCustomerCount.trim() === "" ? 0 : toPositiveInteger(values.currentCustomerCount);
  const notes = values.notes.trim();

  if (!fullName) {
    errors.fullName = "Enter your full name.";
  }

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!isEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.primaryPlatform) {
    errors.primaryPlatform = "Choose the platform where your audience knows you best.";
  }

  if (!handle) {
    errors.handle = "Enter your primary handle or channel name.";
  }

  if (audienceSize === undefined || audienceSize < 1) {
    errors.audienceSize = "Enter a realistic audience size.";
  }

  if (!values.market) {
    errors.market = "Select the market you trade.";
  }

  if (!values.studentAccountMix) {
    errors.studentAccountMix = "Tell us how your students mostly trade.";
  }

  if (!values.monetizationMethod.trim()) {
    errors.monetizationMethod = "Select how you monetize today.";
  }

  if (values.productOfferings.length === 0) {
    errors.productOfferings = "Choose at least one offer you want to launch.";
  }

  if (values.currentCustomerCount.trim() !== "" && currentCustomerCount === undefined) {
    errors.currentCustomerCount = "Use a whole number for your current student or customer count.";
  }

  if (!notes) {
    errors.notes = "Add a short note about your audience and what you want to launch.";
  } else if (notes.length < 24) {
    errors.notes = "Give us a little more detail so the review feels real.";
  }

  if (!values.noResultsPromiseAccepted) {
    errors.noResultsPromiseAccepted = "You must confirm that TradeHub does not promise trading results.";
  }

  return errors;
}

function buildApplicationId(seed: string) {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);

  return `app_stage04_${slug || "workspace"}_${Date.now().toString(36).slice(-6)}`;
}

export function buildLandingApplication(values: LandingApplicationValues): WorkspaceApplication {
  const now = new Date().toISOString();
  const audienceSize = Number(values.audienceSize);
  const currentCustomerCount =
    values.currentCustomerCount.trim() === "" ? undefined : Number(values.currentCustomerCount);

  return {
    applicationId: buildApplicationId(values.handle || values.fullName),
    name: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    primaryPlatform: values.primaryPlatform || undefined,
    handleOrChannel: values.handle.trim(),
    audienceSize,
    market: values.market as WorkspaceApplication["market"],
    studentAccountMix: values.studentAccountMix as WorkspaceApplication["studentAccountMix"],
    monetizationMethod: values.monetizationMethod.trim(),
    productOfferings: values.productOfferings,
    currentCustomerCount,
    solanaPayInterest: values.solanaPayInterest,
    noResultsPromiseAccepted: values.noResultsPromiseAccepted,
    notes: values.notes.trim(),
    status: "new",
    vettingOutcome: "pending",
    vettingNotes: "Frontend-only Stage 04 landing application handoff. Awaiting real backend persistence.",
    setupFeeStatus: "pending",
    source: "landing_page",
    workspaceCreationStatus: "not_started",
    createdAt: now,
    updatedAt: now
  };
}
