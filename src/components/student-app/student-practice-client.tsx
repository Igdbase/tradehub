"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import {
  Archive,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  FileDown,
  FileText,
  FolderClock,
  MoreHorizontal,
  Play,
  RotateCcw,
  Search,
  Settings,
  Shuffle,
  Target,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import {
  formatPracticeMoney,
  formatPracticePrice,
  formatPracticeQuantity,
  getPracticeInstrumentSpec
} from "@/lib/practice/practice-instrument-specs";
import type {
  PracticeAssetCatalogueCategory,
  PracticeAssetCatalogueItem,
  PracticeAssetClass,
  PracticeAssignmentSummary,
  PracticeExportDataset,
  PracticeExportResponse,
  PracticePlaybookImportResponse,
  PracticePlaybookSummary,
  StudentPracticeNotificationMutationResponse,
  StudentPracticeNotificationSummary,
  StudentPracticeNotificationsResponse,
  StudentPracticeAssignmentStartResponse,
  StudentPracticeAssignmentsResponse,
  PracticeSessionStatus,
  PracticeSessionSummary,
  PracticeSessionDeleteResponse,
  PracticeSessionMutationResponse,
  StudentPracticeAnalyticsResponse,
  StudentPracticeOverviewResponse
} from "@/types/practice";

type PlaybookForm = {
  name: string;
  description: string;
  market: PracticeAssetClass;
  strategyType: string;
  setupRules: string;
  entryChecklist: string;
  invalidationRules: string;
  riskNotes: string;
  status: "active" | "archived";
};

type SessionForm = {
  sessionName: string;
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: string;
  dateStart: string;
  dateEnd: string;
  startingBalance: string;
  riskPct: string;
  playbookId: string;
  randomStartEnabled: boolean;
  challengeEnabled: boolean;
  challengeName: string;
  challengeStartingBalance: string;
  challengeProfitTargetPercent: string;
  challengeMaxDailyLossPercent: string;
  challengeMaxTotalDrawdownPercent: string;
  challengeMaxOpenTrades: string;
  challengeMaxTradesPerSession: string;
  challengeMaxTradesPerDay: string;
  challengeMinimumTradingDays: string;
  challengeNotes: string;
  openTerminalAfterCreate: boolean;
};

type SessionStatusFilter = "all" | "active" | "completed" | "abandoned" | "archived";
type SessionSortKey = "recent" | "created" | "symbol" | "performance" | "status";
type PracticeHubView = "hub" | "create" | "sessions" | "assigned" | "strategies" | "analytics" | "transfer";
type PracticeAssetCategoryFilter = "all" | PracticeAssetCatalogueCategory;

const inputClass =
  "focus-ring min-h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-4 py-3 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

const today = new Date();
const dayMs = 1000 * 60 * 60 * 24;
const defaultEnd = today.toISOString().slice(0, 10);
const defaultStart = new Date(today.getTime() - dayMs * 7).toISOString().slice(0, 10);

const emptyPlaybookForm: PlaybookForm = {
  name: "",
  description: "",
  market: "crypto",
  strategyType: "",
  setupRules: "",
  entryChecklist: "",
  invalidationRules: "",
  riskNotes: "",
  status: "active"
};

const defaultSessionForm: SessionForm = {
  sessionName: "",
  assetClass: "crypto",
  symbol: "BTCUSDT",
  timeframeMinutes: "60",
  dateStart: defaultStart,
  dateEnd: defaultEnd,
  startingBalance: "1000",
  riskPct: "1",
  playbookId: "",
  randomStartEnabled: false,
  challengeEnabled: false,
  challengeName: "Practice challenge",
  challengeStartingBalance: "1000",
  challengeProfitTargetPercent: "10",
  challengeMaxDailyLossPercent: "5",
  challengeMaxTotalDrawdownPercent: "10",
  challengeMaxOpenTrades: "3",
  challengeMaxTradesPerSession: "20",
  challengeMaxTradesPerDay: "",
  challengeMinimumTradingDays: "",
  challengeNotes: "",
  openTerminalAfterCreate: true
};

const practiceExportOptions: Array<{ label: string; dataset: PracticeExportDataset }> = [
  { label: "Sessions CSV", dataset: "sessions" },
  { label: "Orders CSV", dataset: "orders" },
  { label: "Closed trades CSV", dataset: "closed_trades" },
  { label: "Strategies CSV", dataset: "playbooks" },
  { label: "Annotations CSV", dataset: "annotations" },
  { label: "Reflections CSV", dataset: "reflections" },
  { label: "Safe JSON backup", dataset: "backup_json" }
];

const practiceLaunchSteps = [
  "Create or start a practice session",
  "Choose a Strategy if useful",
  "Open terminal",
  "Reveal candles",
  "Place a simulated order",
  "Finish session",
  "Review report/journal"
];

const practiceTimeframeOptions = [
  { value: "15", label: "15 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "1440", label: "1 day" }
] as const;

const practiceAssetCategoryOptions: Array<{ value: PracticeAssetCategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "metals", label: "Metals" },
  { value: "indices", label: "Indices" },
  { value: "energies", label: "Energies" }
];

function validateQuickSession(input: {
  form: SessionForm;
  asset?: PracticeAssetCatalogueItem;
  maxCandles: number;
  maxRangeDays: number;
  supportedTimeframes: number[];
}) {
  const name = input.form.sessionName.trim();
  const balance = Number(input.form.startingBalance);
  const timeframe = Number(input.form.timeframeMinutes);
  const startMs = Date.parse(`${input.form.dateStart}T00:00:00.000Z`);
  const endMs = Date.parse(`${input.form.dateEnd}T00:00:00.000Z`);
  const todayMs = Date.parse(`${defaultEnd}T00:00:00.000Z`);

  if (name.length < 2) {
    return "Add a session name with at least 2 characters.";
  }

  if (!Number.isFinite(balance) || balance < 1 || balance > 1_000_000) {
    return "Starting balance must be between 1 and 1,000,000.";
  }

  if (!input.asset) {
    return "Choose an asset from the verified catalogue.";
  }

  if (!input.asset.available) {
    return input.asset.safeMessage;
  }

  if (!input.supportedTimeframes.includes(timeframe)) {
    return "Choose 15 minutes, 1 hour, 4 hours, or 1 day.";
  }

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return "End date must be after the initial date.";
  }

  if (endMs > todayMs) {
    return "End date cannot be in the future.";
  }

  const rangeMs = endMs - startMs;

  if (rangeMs > input.maxRangeDays * 24 * 60 * 60 * 1000) {
    return `Choose a range of ${input.maxRangeDays} days or less.`;
  }

  const candleCount = Math.ceil(rangeMs / (timeframe * 60 * 1000));

  if (!input.form.randomStartEnabled && candleCount > input.maxCandles) {
    return "Shorten the date range or choose a higher timeframe.";
  }

  return null;
}

function FieldLabel({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
      {label}
      {children}
    </label>
  );
}

function playbookToForm(playbook: PracticePlaybookSummary): PlaybookForm {
  return {
    name: playbook.name,
    description: playbook.description ?? "",
    market: playbook.market,
    strategyType: playbook.strategyType,
    setupRules: playbook.setupRules,
    entryChecklist: playbook.entryChecklist.join("\n"),
    invalidationRules: playbook.invalidationRules,
    riskNotes: playbook.riskNotes,
    status: playbook.status
  };
}

function statusBadgeTone(status: PracticeSessionStatus) {
  if (status === "completed") {
    return "green";
  }

  if (status === "active") {
    return "amber";
  }

  if (status === "archived" || status === "abandoned") {
    return "neutral";
  }

  return "accent";
}

function estimatedSessionCandleCount(session: PracticeSessionSummary) {
  const startMs = Date.parse(session.dateStart);
  const endMs = Date.parse(session.dateEnd);
  const timeframeMs = session.timeframeMinutes * 60 * 1000;

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || timeframeMs <= 0 || endMs <= startMs) {
    return 0;
  }

  return Math.max(1, Math.floor((endMs - startMs) / timeframeMs));
}

function formatPercentRatio(value: number | undefined) {
  return `${(((typeof value === "number" && Number.isFinite(value) ? value : 0) * 100)).toFixed(0)}%`;
}

function sessionSearchText(input: {
  session: PracticeSessionSummary;
  playbookName: string;
  status: string;
}) {
  return [
    input.session.sessionName,
    input.session.symbol,
    input.session.assetClass,
    `${input.session.timeframeMinutes}m`,
    input.playbookName,
    input.status,
    input.session.challenge?.challengeName
  ].filter(Boolean).join(" ").toLowerCase();
}

function notificationTone(notification: StudentPracticeNotificationSummary) {
  if (notification.urgency === "high") {
    return "red" as const;
  }

  if (notification.urgency === "medium") {
    return "amber" as const;
  }

  return "accent" as const;
}

function StudentPracticeBody() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<PracticeHubView>("hub");
  const [overview, setOverview] = useState<StudentPracticeOverviewResponse | null>(null);
  const [analytics, setAnalytics] = useState<StudentPracticeAnalyticsResponse | null>(null);
  const [assignments, setAssignments] = useState<PracticeAssignmentSummary[]>([]);
  const [assignmentStates, setAssignmentStates] = useState<StudentPracticeAssignmentsResponse["states"]>({});
  const [practiceNotifications, setPracticeNotifications] = useState<StudentPracticeNotificationSummary[]>([]);
  const [practiceNotificationUnreadCount, setPracticeNotificationUnreadCount] = useState(0);
  const [playbookForm, setPlaybookForm] = useState<PlaybookForm>(emptyPlaybookForm);
  const [editingPlaybooks, setEditingPlaybooks] = useState<Record<string, PlaybookForm>>({});
  const [sessionForm, setSessionForm] = useState<SessionForm>(defaultSessionForm);
  const [playbookFilter, setPlaybookFilter] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<SessionStatusFilter>("all");
  const [sessionAssetFilter, setSessionAssetFilter] = useState<"all" | PracticeAssetClass>("all");
  const [sessionSymbolFilter, setSessionSymbolFilter] = useState("all");
  const [sessionTimeframeFilter, setSessionTimeframeFilter] = useState("all");
  const [sessionChallengeFilter, setSessionChallengeFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [sessionRandomFilter, setSessionRandomFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [sessionSort, setSessionSort] = useState<SessionSortKey>("recent");
  const [visibleSessionCount, setVisibleSessionCount] = useState(12);
  const [compareLeftSessionId, setCompareLeftSessionId] = useState("");
  const [compareRightSessionId, setCompareRightSessionId] = useState("");
  const [playbookImportCsv, setPlaybookImportCsv] = useState("");
  const [playbookImportFilename, setPlaybookImportFilename] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<PracticeAssetCategoryFilter>("all");
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  const [assetPickerOpensUpward, setAssetPickerOpensUpward] = useState(false);
  const [quickSessionError, setQuickSessionError] = useState<string | null>(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsSessionId, setSettingsSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const practiceStartButtonRef = useRef<HTMLButtonElement>(null);
  const quickSessionDialogRef = useRef<HTMLDivElement>(null);
  const quickSessionNameRef = useRef<HTMLInputElement>(null);
  const assetPickerRef = useRef<HTMLDivElement>(null);
  const assetComboboxRef = useRef<HTMLInputElement>(null);
  const sessionSubmissionLockRef = useRef(false);

  const loadPractice = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [payload, analyticsPayload] = await Promise.all([
        requestCourseHubApi<StudentPracticeOverviewResponse>("/api/student/practice/playbooks"),
        requestCourseHubApi<StudentPracticeAnalyticsResponse>("/api/student/practice/analytics")
      ]);
      const [assignmentsPayload, notificationsPayload] = await Promise.all([
        requestCourseHubApi<StudentPracticeAssignmentsResponse>("/api/student/practice/assignments"),
        requestCourseHubApi<StudentPracticeNotificationsResponse>("/api/student/practice/notifications")
      ]);
      setOverview(payload);
      setAnalytics(analyticsPayload);
      setAssignments(assignmentsPayload.assignments);
      setAssignmentStates(assignmentsPayload.states);
      setPracticeNotifications(notificationsPayload.notifications);
      setPracticeNotificationUnreadCount(notificationsPayload.unreadCount);
      setEditingPlaybooks((current) => {
        const next = { ...current };

        for (const playbook of payload.playbooks) {
          next[playbook.playbookId] = next[playbook.playbookId] ?? playbookToForm(playbook);
        }

        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load practice data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPractice();
  }, [loadPractice]);

  useEffect(() => {
    if (!settingsSessionId && !deleteSessionId && activeView !== "create") {
      return;
    }

    function closeOverlay(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (activeView === "create" && isAssetPickerOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsAssetPickerOpen(false);
        setAssetSearch("");
        window.requestAnimationFrame(() => assetComboboxRef.current?.focus());
        return;
      }

      if (deleteSessionId) {
        setDeleteSessionId(null);
        setDeleteConfirmationName("");
        return;
      }

      if (settingsSessionId) {
        setSettingsSessionId(null);
        return;
      }

      if (!isSaving) {
        setActiveView("hub");
        setQuickSessionError(null);
        window.requestAnimationFrame(() => practiceStartButtonRef.current?.focus());
      }
    }

    window.addEventListener("keydown", closeOverlay);
    return () => window.removeEventListener("keydown", closeOverlay);
  }, [activeView, deleteSessionId, isAssetPickerOpen, isSaving, settingsSessionId]);

  useEffect(() => {
    if (!isAssetPickerOpen) {
      return;
    }

    function updateAssetPickerDirection() {
      const field = assetPickerRef.current?.getBoundingClientRect();

      if (!field) {
        return;
      }

      const availableBelow = window.innerHeight - field.bottom;
      const availableAbove = field.top;
      setAssetPickerOpensUpward(availableBelow < 360 && availableAbove > availableBelow);
    }

    function closeAssetPickerOnOutsidePointer(event: PointerEvent) {
      if (assetPickerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsAssetPickerOpen(false);
      setAssetSearch("");
    }

    updateAssetPickerDirection();
    document.addEventListener("pointerdown", closeAssetPickerOnOutsidePointer, true);
    document.addEventListener("scroll", updateAssetPickerDirection, true);
    window.addEventListener("resize", updateAssetPickerDirection);

    return () => {
      document.removeEventListener("pointerdown", closeAssetPickerOnOutsidePointer, true);
      document.removeEventListener("scroll", updateAssetPickerDirection, true);
      window.removeEventListener("resize", updateAssetPickerDirection);
    };
  }, [isAssetPickerOpen]);

  useEffect(() => {
    if (activeView !== "create") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => quickSessionNameRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeView]);

  useEffect(() => {
    setVisibleSessionCount(12);
  }, [
    playbookFilter,
    sessionAssetFilter,
    sessionChallengeFilter,
    sessionRandomFilter,
    sessionSearch,
    sessionSort,
    sessionStatusFilter,
    sessionSymbolFilter,
    sessionTimeframeFilter
  ]);

  useEffect(() => {
    const summaries = analytics?.sessionSummaries ?? [];

    if (!compareLeftSessionId && summaries[0]) {
      setCompareLeftSessionId(summaries[0].sessionId);
    }

    if (!compareRightSessionId && summaries[1]) {
      setCompareRightSessionId(summaries[1].sessionId);
    }
  }, [analytics?.sessionSummaries, compareLeftSessionId, compareRightSessionId]);

  async function createPlaybook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi("/api/student/practice/playbooks", {
        method: "POST",
        body: JSON.stringify(playbookForm)
      });
      setPlaybookForm(emptyPlaybookForm);
      setMessage("Practice Strategy created.");
      await loadPractice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not create that Strategy.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePlaybook(playbookId: string) {
    const form = editingPlaybooks[playbookId];

    if (!form) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi("/api/student/practice/playbooks", {
        method: "PATCH",
        body: JSON.stringify({ playbookId, ...form })
      });
      setMessage("Practice Strategy updated.");
      await loadPractice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that Strategy.");
    } finally {
      setIsSaving(false);
    }
  }

  async function exportPracticeData(dataset: PracticeExportDataset) {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeExportResponse>("/api/student/practice/export", {
        method: "POST",
        body: JSON.stringify({ dataset })
      });
      const fileBody = response.format === "json"
        ? JSON.stringify(response.backup ?? {}, null, 2)
        : response.csv ?? "";
      const blob = new Blob([fileBody], { type: response.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`Exported ${response.rowCount} safe practice row${response.rowCount === 1 ? "" : "s"} to ${response.filename}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not export that practice data.");
    } finally {
      setIsSaving(false);
    }
  }

  async function readPlaybookImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPlaybookImportFilename(file.name);
    setPlaybookImportCsv(await file.text());
  }

  async function importPlaybooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticePlaybookImportResponse>("/api/student/practice/import/playbooks", {
        method: "POST",
        body: JSON.stringify({ csv: playbookImportCsv })
      });

      setPlaybookImportCsv("");
      setPlaybookImportFilename("");
      setMessage(`Imported ${response.importedCount} Strateg${response.importedCount === 1 ? "y" : "ies"}.${response.errors.length ? ` ${response.errors.join(" ")}` : ""}`);
      await loadPractice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not import those Strategies.");
    } finally {
      setIsSaving(false);
    }
  }

  function closeQuickSession() {
    if (isSaving) {
      return;
    }

    setActiveView("hub");
    setIsAssetPickerOpen(false);
    setAssetSearch("");
    setQuickSessionError(null);
    window.requestAnimationFrame(() => practiceStartButtonRef.current?.focus());
  }

  function setQuickRange(days: number) {
    const endMs = Date.parse(`${sessionForm.dateEnd || defaultEnd}T00:00:00.000Z`);

    if (!Number.isFinite(endMs)) {
      setQuickSessionError("Choose an end date before using a quick range.");
      return;
    }

    setSessionForm((current) => ({
      ...current,
      dateStart: new Date(endMs - days * dayMs).toISOString().slice(0, 10),
      randomStartEnabled: false
    }));
    setQuickSessionError(null);
  }

  function randomizeQuickStart() {
    const todayMs = Date.parse(`${defaultEnd}T00:00:00.000Z`);
    const currentStartMs = Date.parse(`${sessionForm.dateStart}T00:00:00.000Z`);
    const currentEndMs = Date.parse(`${sessionForm.dateEnd}T00:00:00.000Z`);
    const timeframeMinutes = Number(sessionForm.timeframeMinutes) || 60;
    const maxRangeDays = overview?.limits.maxRangeDays ?? 366;
    const maxCandles = Math.min(240, overview?.limits.maxCandlesPerRequest ?? 500);
    const maxWindowDays = Math.max(1, Math.floor(Math.min(maxRangeDays, maxCandles * timeframeMinutes / (24 * 60))));
    const currentRangeDays = Number.isFinite(currentStartMs) && Number.isFinite(currentEndMs) && currentEndMs > currentStartMs
      ? Math.max(1, Math.ceil((currentEndMs - currentStartMs) / dayMs))
      : 7;
    const windowDays = Math.min(currentRangeDays, maxWindowDays);
    const lookbackDays = Math.max(365, windowDays + 1);
    const availableOffsets = Math.max(1, lookbackDays - windowDays);
    let offsetDays = Math.floor(Math.random() * (availableOffsets + 1));
    let randomStartMs = todayMs - lookbackDays * dayMs + offsetDays * dayMs;

    if (new Date(randomStartMs).toISOString().slice(0, 10) === sessionForm.dateStart) {
      offsetDays = (offsetDays + 1) % (availableOffsets + 1);
      randomStartMs = todayMs - lookbackDays * dayMs + offsetDays * dayMs;
    }

    setSessionForm((current) => ({
      ...current,
      dateStart: new Date(randomStartMs).toISOString().slice(0, 10),
      dateEnd: new Date(randomStartMs + windowDays * dayMs).toISOString().slice(0, 10),
      randomStartEnabled: true
    }));
    setQuickSessionError(null);
  }

  function trapQuickSessionFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !quickSessionDialogRef.current) {
      return;
    }

    const focusable = [...quickSessionDialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sessionSubmissionLockRef.current) {
      return;
    }

    const asset = overview?.limits.assetCatalogue?.find((item) =>
      item.assetClass === sessionForm.assetClass && item.symbol === sessionForm.symbol
    );
    const validationMessage = validateQuickSession({
      form: sessionForm,
      asset,
      maxCandles: overview?.limits.maxCandlesPerRequest ?? 500,
      maxRangeDays: overview?.limits.maxRangeDays ?? 45,
      supportedTimeframes: overview?.limits.supportedTimeframes ?? [15, 60, 240, 1440]
    });

    if (validationMessage) {
      setQuickSessionError(validationMessage);
      return;
    }

    sessionSubmissionLockRef.current = true;
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);
    setQuickSessionError(null);

    try {
      const response = await requestCourseHubApi<PracticeSessionMutationResponse>("/api/student/practice/sessions", {
        method: "POST",
        body: JSON.stringify({
          ...sessionForm,
          timeframeMinutes: Number(sessionForm.timeframeMinutes),
          startingBalance: Number(sessionForm.startingBalance),
          riskPct: Number(sessionForm.riskPct),
          randomStartEnabled: sessionForm.randomStartEnabled,
          challenge: sessionForm.challengeEnabled ? {
            enabled: true,
            challengeName: sessionForm.challengeName,
            startingBalance: Number(sessionForm.challengeStartingBalance || sessionForm.startingBalance),
            profitTargetPercent: Number(sessionForm.challengeProfitTargetPercent),
            maxDailyLossPercent: Number(sessionForm.challengeMaxDailyLossPercent),
            maxTotalDrawdownPercent: Number(sessionForm.challengeMaxTotalDrawdownPercent),
            maxOpenSimulatedTrades: Number(sessionForm.challengeMaxOpenTrades),
            maxTradesPerSession: Number(sessionForm.challengeMaxTradesPerSession),
            maxTradesPerDay: sessionForm.challengeMaxTradesPerDay ? Number(sessionForm.challengeMaxTradesPerDay) : undefined,
            minimumTradingDays: sessionForm.challengeMinimumTradingDays ? Number(sessionForm.challengeMinimumTradingDays) : undefined,
            notes: sessionForm.challengeNotes
          } : undefined,
          dateStart: `${sessionForm.dateStart}T00:00:00.000Z`,
          dateEnd: `${sessionForm.dateEnd}T00:00:00.000Z`
        })
      });
      setMessage("Practice session draft created.");

      if (sessionForm.openTerminalAfterCreate) {
        router.push(`/app/practice/${encodeURIComponent(response.session.sessionId)}/terminal`);
        return;
      }

      await loadPractice();
      setHighlightedSessionId(response.session.sessionId);
      setActiveView("sessions");
    } catch (error) {
      setQuickSessionError(error instanceof Error ? error.message : "TradeHub could not create that practice session.");
    } finally {
      sessionSubmissionLockRef.current = false;
      setIsSaving(false);
    }
  }

  async function startAssignment(assignmentId: string) {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentPracticeAssignmentStartResponse>(
        `/api/student/practice/assignments/${encodeURIComponent(assignmentId)}/start`,
        { method: "POST" }
      );

      setMessage(`Started assignment: ${response.assignment.title}.`);
      router.push(`/app/practice/${encodeURIComponent(response.session.sessionId)}/terminal`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not start that practice assignment.");
    } finally {
      setIsSaving(false);
    }
  }

  async function startResubmission(feedbackTargetRef: string) {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentPracticeAssignmentStartResponse>(
        "/api/student/practice/assignments/resubmissions/start",
        {
          method: "POST",
          body: JSON.stringify({ feedbackTargetRef })
        }
      );

      setMessage(`Started resubmission: ${response.assignment.title}.`);
      router.push(`/app/practice/${encodeURIComponent(response.session.sessionId)}/terminal`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not start that resubmission.");
    } finally {
      setIsSaving(false);
    }
  }

  async function mutatePracticeNotification(action: "dismiss" | "read" | "dismiss_all" | "read_all", notificationId?: string) {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentPracticeNotificationMutationResponse>(
        "/api/student/practice/notifications",
        {
          method: "PATCH",
          body: JSON.stringify({ action, notificationId })
        }
      );

      setPracticeNotifications(response.notifications);
      setPracticeNotificationUnreadCount(response.unreadCount);
      setMessage(action.includes("dismiss") ? "Practice alert dismissed." : "Practice alert marked read.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that practice alert.");
    } finally {
      setIsSaving(false);
    }
  }

  async function mutatePracticeSession(action: "archive" | "restore" | "duplicate", sessionId: string) {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeSessionMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/${action}`,
        { method: "POST" }
      );

      setMessage(
        action === "duplicate"
          ? `Duplicated setup into ${response.session.sessionName ?? response.session.symbol}.`
          : action === "archive"
            ? "Practice session archived."
            : "Practice session restored."
      );
      await loadPractice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `TradeHub could not ${action} that practice session.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePracticeSession() {
    const session = overview?.sessions.find((entry) => entry.sessionId === deleteSessionId);

    if (!session) {
      setErrorMessage("That practice session is no longer available.");
      return;
    }

    setIsDeleting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeSessionDeleteResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(session.sessionId)}`,
        {
          method: "DELETE",
          body: JSON.stringify({ confirmationName: deleteConfirmationName })
        }
      );

      setDeleteSessionId(null);
      setSettingsSessionId(null);
      setDeleteConfirmationName("");
      setMessage(response.safeMessage || "Practice session permanently deleted.");
      await loadPractice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not delete that practice session.");
    } finally {
      setIsDeleting(false);
    }
  }

  function openArchivedSessions() {
    setSessionStatusFilter("archived");
    setActiveView("sessions");
  }

  const activePlaybooks = overview?.playbooks.filter((playbook) => playbook.status === "active") ?? [];
  const playbookNameById = useMemo(() => new Map((overview?.playbooks ?? []).map((playbook) => [playbook.playbookId, playbook.name])), [overview?.playbooks]);
  const sessionSymbols = useMemo(() => [...new Set((overview?.sessions ?? []).map((session) => session.symbol))].sort(), [overview?.sessions]);
  const sessionTimeframes = useMemo(() => [...new Set((overview?.sessions ?? []).map((session) => String(session.timeframeMinutes)))].sort((left, right) => Number(left) - Number(right)), [overview?.sessions]);
  const filteredSessions = useMemo(() => {
    const search = sessionSearch.trim().toLowerCase();

    return (overview?.sessions ?? [])
      .filter((session) => {
        const playbookName = session.playbookId ? playbookNameById.get(session.playbookId) ?? "" : "No strategy";
        const matchesSearch = !search || sessionSearchText({
          session,
          playbookName,
          status: session.status
        }).includes(search);
        const matchesStatus = sessionStatusFilter === "all"
          ? session.status !== "archived"
          : session.status === sessionStatusFilter;
        const matchesAsset = sessionAssetFilter === "all" || session.assetClass === sessionAssetFilter;
        const matchesSymbol = sessionSymbolFilter === "all" || session.symbol === sessionSymbolFilter;
        const matchesTimeframe = sessionTimeframeFilter === "all" || String(session.timeframeMinutes) === sessionTimeframeFilter;
        const matchesPlaybook = !playbookFilter || session.playbookId === playbookFilter;
        const matchesChallenge = sessionChallengeFilter === "all" ||
          (sessionChallengeFilter === "enabled" ? session.challenge?.enabled === true : session.challenge?.enabled !== true);
        const matchesRandom = sessionRandomFilter === "all" ||
          (sessionRandomFilter === "enabled" ? session.randomStartEnabled === true : session.randomStartEnabled !== true);

        return matchesSearch && matchesStatus && matchesAsset && matchesSymbol && matchesTimeframe && matchesPlaybook && matchesChallenge && matchesRandom;
      })
      .sort((left, right) => {
        if (sessionSort === "created") {
          return right.createdAt.localeCompare(left.createdAt);
        }

        if (sessionSort === "symbol") {
          return `${left.symbol}_${left.timeframeMinutes}`.localeCompare(`${right.symbol}_${right.timeframeMinutes}`);
        }

        if (sessionSort === "performance") {
          const leftPnl = overview?.sessionPerformance[left.sessionId]?.netPnl ?? 0;
          const rightPnl = overview?.sessionPerformance[right.sessionId]?.netPnl ?? 0;

          return rightPnl - leftPnl;
        }

        if (sessionSort === "status") {
          return left.status.localeCompare(right.status) || right.updatedAt.localeCompare(left.updatedAt);
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [
    overview?.sessionPerformance,
    overview?.sessions,
    playbookFilter,
    playbookNameById,
    sessionAssetFilter,
    sessionChallengeFilter,
    sessionRandomFilter,
    sessionSearch,
    sessionSort,
    sessionStatusFilter,
    sessionSymbolFilter,
    sessionTimeframeFilter
  ]);
  const visibleSessions = filteredSessions.slice(0, visibleSessionCount);
  const filteredOrders = overview?.orders.filter((order) => !playbookFilter || order.playbookId === playbookFilter) ?? [];
  const assetCatalogue = overview?.limits.assetCatalogue ?? [];
  const availableAssetCountByCategory = Object.fromEntries(
    practiceAssetCategoryOptions.map((category) => [
      category.value,
      assetCatalogue.filter((asset) => asset.available && (category.value === "all" || asset.category === category.value)).length
    ])
  ) as Record<PracticeAssetCategoryFilter, number>;
  const selectedAsset = assetCatalogue.find((asset) =>
    asset.assetClass === sessionForm.assetClass && asset.symbol === sessionForm.symbol
  );
  const quickSessionStrategies = activePlaybooks.filter((strategy) =>
    !strategy.market || strategy.market === sessionForm.assetClass
  );
  const visibleAssets = assetCatalogue.filter((asset) => {
    const search = assetSearch.trim().toLowerCase();
    const matchesCategory = assetCategoryFilter === "all" || asset.category === assetCategoryFilter;
    const matchesSearch = !search || `${asset.symbol} ${asset.displayName}`.toLowerCase().includes(search);

    return matchesCategory && matchesSearch;
  });
  const boundedActiveAssetIndex = Math.min(activeAssetIndex, Math.max(visibleAssets.length - 1, 0));
  const activeAsset = visibleAssets[boundedActiveAssetIndex];

  function firstAvailableAssetIndex(assets: PracticeAssetCatalogueItem[]) {
    const index = assets.findIndex((asset) => asset.available);
    return index >= 0 ? index : 0;
  }

  function openAssetPicker() {
    setAssetSearch("");
    setIsAssetPickerOpen(true);
    const selectedIndex = visibleAssets.findIndex((asset) =>
      asset.assetClass === sessionForm.assetClass && asset.symbol === sessionForm.symbol
    );
    setActiveAssetIndex(selectedIndex >= 0 ? selectedIndex : firstAvailableAssetIndex(visibleAssets));
    window.requestAnimationFrame(() => assetComboboxRef.current?.focus());
  }

  function closeAssetPicker({ restoreFocus = false } = {}) {
    setIsAssetPickerOpen(false);
    setAssetSearch("");

    if (restoreFocus) {
      window.requestAnimationFrame(() => assetComboboxRef.current?.focus());
    }
  }

  function selectQuickSessionAsset(asset: PracticeAssetCatalogueItem) {
    if (!asset.available) {
      return;
    }

    setQuickSessionError(null);
    setSessionForm((current) => ({
      ...current,
      assetClass: asset.assetClass,
      symbol: asset.symbol,
      playbookId: activePlaybooks.some((strategy) =>
        strategy.playbookId === current.playbookId &&
        (!strategy.market || strategy.market === asset.assetClass)
      ) ? current.playbookId : ""
    }));
    closeAssetPicker();
  }

  function moveActiveAsset(direction: 1 | -1) {
    if (!visibleAssets.length) {
      return;
    }

    let nextIndex = boundedActiveAssetIndex;

    for (let checked = 0; checked < visibleAssets.length; checked += 1) {
      nextIndex = (nextIndex + direction + visibleAssets.length) % visibleAssets.length;

      if (visibleAssets[nextIndex]?.available) {
        setActiveAssetIndex(nextIndex);
        document.getElementById(`practice-asset-option-${visibleAssets[nextIndex].symbol}`)?.scrollIntoView({ block: "nearest" });
        return;
      }
    }
  }

  function handleAssetComboboxKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!isAssetPickerOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openAssetPicker();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeAssetPicker({ restoreFocus: true });
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveAsset(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeAsset?.available) {
        selectQuickSessionAsset(activeAsset);
      }
    }
  }
  const quickSessionValidation = validateQuickSession({
    form: sessionForm,
    asset: selectedAsset,
    maxCandles: overview?.limits.maxCandlesPerRequest ?? 500,
    maxRangeDays: overview?.limits.maxRangeDays ?? 45,
    supportedTimeframes: overview?.limits.supportedTimeframes ?? [15, 60, 240, 1440]
  });
  const comparisonSessions = analytics?.sessionSummaries ?? [];
  const compareLeft = comparisonSessions.find((session) => session.sessionId === compareLeftSessionId);
  const compareRight = comparisonSessions.find((session) => session.sessionId === compareRightSessionId);
  const settingsSession = overview?.sessions.find((session) => session.sessionId === settingsSessionId);
  const deleteSession = overview?.sessions.find((session) => session.sessionId === deleteSessionId);
  const deleteSessionName = deleteSession?.sessionName ?? deleteSession?.symbol ?? "";
  const viewTitle = activeView === "hub"
    ? "Practice"
    : activeView === "create"
      ? "Backtesting Session"
      : activeView === "sessions"
        ? "Sessions"
        : activeView === "assigned"
          ? "Assigned practice"
          : activeView === "strategies"
            ? "Strategies"
            : activeView === "analytics"
              ? "Analytics"
              : "Import and export";

  return (
    <StudentShell
      active="practice"
      eyebrow="Practice"
      title={viewTitle}
      subtitle={activeView === "hub"
        ? "Start a backtesting session or return to a previous one. All orders in Practice are simulated."
        : activeView === "sessions"
          ? "Search, review, duplicate, archive, or safely remove your previous sessions."
          : activeView === "create"
            ? "Set up a simulated session with the existing Practice options."
            : "Practice tools are grouped here so the main Practice screen stays focused."}
      action={activeView === "hub" ? (
        <Badge tone="green">Simulated practice</Badge>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setActiveView("hub")}>
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Practice home
        </Button>
      )}
    >
      {errorMessage ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="break-safe text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
        </GlassCard>
      ) : null}

      {message ? (
        <GlassCard>
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">{message}</p>
        </GlassCard>
      ) : null}

      {activeView === "hub" ? (
        <div className="space-y-4" data-testid="practice-hub">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              ref={practiceStartButtonRef}
              type="button"
              className="focus-ring group grid min-h-[9rem] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-4 rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] p-5 text-left transition hover:border-[color:var(--accent)] hover:bg-[color:color-mix(in_srgb,var(--glass-hi)_66%,transparent)]"
              onClick={() => {
                setQuickSessionError(null);
                setActiveView("create");
              }}
              data-testid="practice-start-session"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[color:var(--accent-bg)] text-[color:var(--accent)]">
                <Play aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-[color:var(--label)]">Backtesting Session</span>
                <span className="mt-1 block text-sm text-[color:var(--label2)]">Start a new session</span>
              </span>
              <ChevronLeft aria-hidden="true" className="h-5 w-5 rotate-180 text-[color:var(--label3)] transition group-hover:text-[color:var(--accent)]" />
            </button>

            <button
              type="button"
              className="focus-ring group grid min-h-[9rem] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-4 rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] p-5 text-left transition hover:border-[color:var(--accent)] hover:bg-[color:color-mix(in_srgb,var(--glass-hi)_66%,transparent)]"
              onClick={() => setActiveView("sessions")}
              data-testid="practice-open-sessions"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[color:var(--accent-bg)] text-[color:var(--accent)]">
                <FolderClock aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-[color:var(--label)]">Sessions</span>
                <span className="mt-1 block text-sm text-[color:var(--label2)]">View and manage previous sessions</span>
              </span>
              <ChevronLeft aria-hidden="true" className="h-5 w-5 rotate-180 text-[color:var(--label3)] transition group-hover:text-[color:var(--accent)]" />
            </button>
          </div>

          <details className="group rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_54%,transparent)]" data-testid="practice-more-menu">
            <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[color:var(--label2)] marker:content-none">
              <span className="inline-flex items-center gap-2">
                <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                More practice tools
              </span>
              <span className="text-xs text-[color:var(--label3)]">Assignments, strategies, analytics, files</span>
            </summary>
            <div className="grid gap-2 border-t border-[color:var(--line)] p-3 sm:grid-cols-2 lg:grid-cols-5">
              <Button type="button" variant="ghost" onClick={() => setActiveView("assigned")}>
                <UsersRound aria-hidden="true" className="h-4 w-4" /> Assigned practice
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveView("strategies")}>
                <Target aria-hidden="true" className="h-4 w-4" /> Strategies
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveView("analytics")}>
                <BarChart3 aria-hidden="true" className="h-4 w-4" /> Analytics
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveView("transfer")}>
                <FileDown aria-hidden="true" className="h-4 w-4" /> Import/export
              </Button>
              <Button type="button" variant="ghost" onClick={openArchivedSessions}>
                <Archive aria-hidden="true" className="h-4 w-4" /> Archived sessions
              </Button>
            </div>
          </details>
        </div>
      ) : null}

      {activeView === "assigned" ? <><GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Recommended practice flow</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Start here if this is your first replay. Each step stays simulated and private to your student account unless a workspace assignment shows aggregate progress.
            </p>
          </div>
          <Badge tone="accent">Practice only</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {practiceLaunchSteps.map((step, index) => (
            <div key={step} className="grid min-h-[5.25rem] gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2">
              <span className="text-xs font-semibold uppercase text-[color:var(--label3)]">Step {index + 1}</span>
              <span className="break-safe text-sm font-semibold leading-5 text-[color:var(--label)]">{step}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Practice Notifications</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Task alerts show available assignments, due soon work, overdue-open drills, closed assignments, published feedback, and resubmission requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={practiceNotificationUnreadCount ? "amber" : "green"}>{practiceNotificationUnreadCount} unread</Badge>
            {practiceNotifications.length ? (
              <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={() => mutatePracticeNotification("read_all")}>
                Mark all read
              </Button>
            ) : null}
          </div>
        </div>
        {practiceNotifications.length ? (
          <div className="grid gap-2">
            {practiceNotifications.map((notification) => {
              const state = assignmentStates[notification.assignmentId];

              return (
                <div key={notification.notificationId} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--label)]">{notification.title}</p>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">{notification.body}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={notificationTone(notification)}>{notification.kind.replace(/_/g, " ")}</Badge>
                      {!notification.read ? <Badge tone="amber">Unread</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notification.action === "start_assignment" ? (
                      <Button type="button" size="sm" disabled={isSaving || !state} onClick={() => startAssignment(notification.assignmentId)}>
                        Start assignment
                      </Button>
                    ) : notification.action === "continue_session" && state?.activeSessionId ? (
                      <Button href={`/app/practice/${encodeURIComponent(state.activeSessionId)}/terminal`} size="sm">
                        Continue session
                      </Button>
                    ) : notification.action === "view_feedback" && state?.completedSessionId ? (
                      <Button href={`/app/practice/${encodeURIComponent(state.completedSessionId)}/report`} size="sm">
                        View feedback
                      </Button>
                    ) : notification.action === "start_resubmission" && state?.feedback ? (
                      <Button type="button" size="sm" disabled={isSaving} onClick={() => startResubmission(state.feedback?.feedbackTargetRef ?? "")}>
                        Start resubmission
                      </Button>
                    ) : null}
                    {!notification.read ? (
                      <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={() => mutatePracticeNotification("read", notification.notificationId)}>
                        Mark read
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => mutatePracticeNotification("dismiss", notification.notificationId)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
            No practice alerts right now. When an assignment becomes available, is due soon, becomes overdue but still open, closes, receives published feedback, or needs resubmission, the alert appears here.
          </p>
        )}
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Practice Task Inbox</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Workspace drills can be available, due soon, overdue but still open, closed, completed, feedback published, or resubmission requested. Starting one creates your private simulated practice session. Educators see aggregate progress only.
            </p>
          </div>
          <Badge tone={assignments.length ? "green" : "amber"}>{assignments.length ? `${assignments.length} active` : "No active drills"}</Badge>
        </div>
        {assignments.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment) => {
              const state = assignmentStates[assignment.assignmentId];
              const stateTone = state?.status === "feedback_available" || state?.status === "completed"
                ? "green"
                : state?.status === "resubmission_requested"
                  ? "red"
                  : state?.status === "in_progress" || state?.status === "overdue"
                    ? "amber"
                    : state?.status === "closed" || state?.status === "not_available"
                      ? "neutral"
                    : "accent";

              return (
                <div key={assignment.assignmentId} className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--label)]">{assignment.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--label2)]">
                        {assignment.symbol} · {assignment.assetClass} · {assignment.timeframeMinutes}m
                        {state?.availabilityStartDate ? ` · Opens ${new Date(state.availabilityStartDate).toLocaleDateString("en-NG")}` : ""}
                        {assignment.dueDate ? ` · Due ${new Date(assignment.dueDate).toLocaleDateString("en-NG")}` : ""}
                        {state?.closeDate ? ` · Closes ${new Date(state.closeDate).toLocaleDateString("en-NG")}` : ""}
                      </p>
                    </div>
                    <Badge tone={stateTone}>{state?.status.replace(/_/g, " ") ?? "not started"}</Badge>
                  </div>
                  <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                    {assignment.description || "Start the drill when you are ready."}
                  </p>
                  {assignment.suggestedPlaybook ? (
                    <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                      Suggested Strategy: {assignment.suggestedPlaybook.name}
                      {assignment.suggestedPlaybook.setupRules ? ` · ${assignment.suggestedPlaybook.setupRules}` : ""}
                    </p>
                  ) : null}
                  {state?.feedback ? (
                    <div className="rounded-[8px] border border-[color:var(--line)] px-3 py-2">
                      <p className="text-xs font-semibold text-[color:var(--label)]">
                        Feedback · overall {state.feedback.rubric.overallScore}/5
                      </p>
                      <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                        {state.feedback.feedbackNote || "No written instructor note was added."}
                      </p>
                    </div>
                  ) : null}
                  {state?.resubmissionRequest ? (
                    <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      Resubmission requested: {state.resubmissionRequest.reason}
                    </p>
                  ) : null}
                  {state?.status === "due_soon" ? (
                    <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      This drill is due soon and remains open for starting.
                    </p>
                  ) : null}
                  {state?.status === "overdue" ? (
                    <p className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      This drill is overdue but still open until the close date.
                    </p>
                  ) : null}
                  {state?.status === "not_available" ? (
                    <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      This drill is scheduled but not available yet.
                    </p>
                  ) : null}
                  {state?.status === "closed" ? (
                    <p className="break-safe rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      This drill is closed for new starts. Existing completed reviews remain available.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {state?.status === "in_progress" && state.activeSessionId ? (
                      <Button href={`/app/practice/${encodeURIComponent(state.activeSessionId)}/terminal`}>
                        Continue session
                      </Button>
                    ) : state?.status === "resubmission_requested" && state.feedback ? (
                      <Button type="button" disabled={isSaving} onClick={() => startResubmission(state.feedback?.feedbackTargetRef ?? "")}>
                        Start resubmission
                      </Button>
                    ) : state?.status === "completed" || state?.status === "feedback_available" || state?.status === "not_available" || state?.status === "closed" ? null : (
                      <Button type="button" disabled={isSaving} onClick={() => startAssignment(assignment.assignmentId)}>
                        Start assignment
                      </Button>
                    )}
                    {state?.completedSessionId ? (
                      <Button href={`/app/practice/${encodeURIComponent(state.completedSessionId)}/report`} variant="secondary">
                        View feedback
                      </Button>
                    ) : null}
                    {assignment.randomStartEnabled ? <Badge tone="amber">Random start</Badge> : null}
                    {assignment.challenge?.enabled ? <Badge tone="green">Challenge</Badge> : null}
                    {state?.latestAttemptNumber ? <Badge tone="neutral">Attempt {state.latestAttemptNumber}</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              No assignments yet. You can still create your own private practice session and follow the same Strategy-to-report flow.
            </p>
          </div>
        )}
      </GlassCard></> : null}

      {activeView === "assigned" ? <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Instructor feedback</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Feedback appears after your workspace reviews a completed assignment session. It contains rubric scores and bounded notes only.
            </p>
          </div>
          <Badge tone={overview?.instructorFeedback.length ? "green" : "amber"}>
            {overview?.instructorFeedback.length ? `${overview.instructorFeedback.length} received` : "No feedback yet"}
          </Badge>
        </div>
        {overview?.instructorFeedback.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.instructorFeedback.slice(0, 4).map((feedback) => (
              <div key={feedback.feedbackId} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[color:var(--label)]">
                    {feedback.reviewerDisplayLabel}
                  </p>
                  <Badge tone={feedback.status === "reviewed" ? "green" : "amber"}>{feedback.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <StatChip label="Overall" value={`${feedback.rubric.overallScore}/5`} tone="accent" />
                  <StatChip label="Risk" value={`${feedback.rubric.riskManagement}/5`} />
                  <StatChip label="Review" value={`${feedback.rubric.reviewQuality}/5`} />
                </div>
                <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                  {feedback.feedbackNote || "No written note was added."}
                </p>
                {feedback.recommendedNextDrill ? (
                  <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                    Next drill: {feedback.recommendedNextDrill}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            No instructor feedback has been submitted yet. Feedback appears only after an educator reviews a completed assignment session and publishes a bounded rubric note.
          </p>
        )}
      </GlassCard> : null}

      {activeView === "transfer" ? <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Export practice data</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Download your practice sessions, simulated orders, Strategies, annotations, or reflections. Future candles and private connection details are never included.
              </p>
            </div>
            <Badge tone="green">Safe CSV</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {practiceExportOptions.map((option) => (
              <Button
                key={option.dataset}
                type="button"
                size="sm"
                variant={option.dataset === "backup_json" ? "secondary" : "primary"}
                disabled={isSaving || isLoading}
                onClick={() => exportPracticeData(option.dataset)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
            No imported/exported data yet? Create or import a Strategy first, then export safe CSVs as your practice history grows. The optional JSON backup contains only your safe practice records.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <form className="space-y-4" onSubmit={importPlaybooks}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--label)]">Import Strategies</p>
                <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  Import Strategy CSV only. TradeHub creates new Strategies for your account and never imports orders.
                </p>
              </div>
              <Badge tone="accent">Strategies only</Badge>
            </div>
            <FieldLabel label="CSV file">
              <input
                className={inputClass}
                type="file"
                accept=".csv,text/csv"
                disabled={isSaving}
                onChange={readPlaybookImportFile}
              />
            </FieldLabel>
            {playbookImportFilename ? (
              <p className="truncate text-xs leading-5 text-[color:var(--label2)]">
                Selected: {playbookImportFilename}
              </p>
            ) : null}
            <FieldLabel label="CSV text">
              <textarea
                className={inputClass}
                rows={5}
                value={playbookImportCsv}
                disabled={isSaving}
                onChange={(event) => setPlaybookImportCsv(event.target.value)}
                placeholder="name,market,strategyType,setupRules,entryChecklist,invalidationRules,riskNotes,description"
              />
            </FieldLabel>
            <Button type="submit" variant="primary" disabled={isSaving || !playbookImportCsv.trim()}>
              Import Strategies
            </Button>
          </form>
        </GlassCard>
      </div> : null}

      <div className="grid gap-4">
        {activeView === "strategies" ? <GlassCard>
          <form className="space-y-5" onSubmit={createPlaybook}>
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Strategies</p>
              <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                Save reusable setup rules, an entry checklist, invalidation rules, and risk notes. A Strategy is optional when creating a session.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Name">
                <input
                  className={inputClass}
                  value={playbookForm.name}
                  onChange={(event) => setPlaybookForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="London breakout"
                />
              </FieldLabel>
              <FieldLabel label="Market">
                <select
                  className={inputClass}
                  value={playbookForm.market}
                  onChange={(event) => setPlaybookForm((current) => ({ ...current, market: event.target.value as PracticeAssetClass }))}
                >
                  <option value="crypto">Crypto</option>
                  <option value="forex_cfd">Forex-CFD</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Strategy type">
                <input
                  className={inputClass}
                  value={playbookForm.strategyType}
                  onChange={(event) => setPlaybookForm((current) => ({ ...current, strategyType: event.target.value }))}
                  placeholder="Breakout, trend pullback"
                />
              </FieldLabel>
              <FieldLabel label="Status">
                <select
                  className={inputClass}
                  value={playbookForm.status}
                  disabled
                  onChange={(event) => setPlaybookForm((current) => ({ ...current, status: event.target.value as PlaybookForm["status"] }))}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </FieldLabel>
            </div>
            <FieldLabel label="Setup rules">
              <textarea
                className={inputClass}
                value={playbookForm.setupRules}
                onChange={(event) => setPlaybookForm((current) => ({ ...current, setupRules: event.target.value }))}
                rows={3}
              />
            </FieldLabel>
            <FieldLabel label="Entry checklist">
              <textarea
                className={inputClass}
                value={playbookForm.entryChecklist}
                onChange={(event) => setPlaybookForm((current) => ({ ...current, entryChecklist: event.target.value }))}
                rows={3}
                placeholder="One item per line"
              />
            </FieldLabel>
            <FieldLabel label="Invalidation rules">
              <textarea
                className={inputClass}
                value={playbookForm.invalidationRules}
                onChange={(event) => setPlaybookForm((current) => ({ ...current, invalidationRules: event.target.value }))}
                rows={3}
              />
            </FieldLabel>
            <FieldLabel label="Risk notes">
              <textarea
                className={inputClass}
                value={playbookForm.riskNotes}
                onChange={(event) => setPlaybookForm((current) => ({ ...current, riskNotes: event.target.value }))}
                rows={3}
              />
            </FieldLabel>
            <FieldLabel label="Description">
              <textarea
                className={inputClass}
                value={playbookForm.description}
                onChange={(event) => setPlaybookForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </FieldLabel>
            <Button type="submit" variant="primary" disabled={isSaving}>
              Create Strategy
            </Button>
          </form>
        </GlassCard> : null}

        {activeView === "create" ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-3 sm:p-6"
            data-testid="practice-quick-session-layer"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeQuickSession();
              }
            }}
          >
            <div
              ref={quickSessionDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="practice-quick-session-title"
              data-theme-surface="dark"
              data-testid="practice-quick-session-modal"
              className="my-auto w-full max-w-[46rem] overflow-visible rounded-[8px] border border-[color:var(--line)] bg-black shadow-2xl"
              onKeyDown={trapQuickSessionFocus}
            >
              <div className="flex min-h-16 items-start justify-between gap-4 border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <h2 id="practice-quick-session-title" className="truncate text-base font-semibold text-[color:var(--label)]">
                    Backtesting Session
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--label2)]">Create a simulated session from available historical candles.</p>
                </div>
                <button
                  type="button"
                  className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[color:var(--line)] text-[color:var(--label2)] hover:text-[color:var(--label)]"
                  aria-label="Close quick session"
                  title="Close"
                  disabled={isSaving}
                  onClick={closeQuickSession}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <form className="space-y-5 p-4 sm:p-5" onSubmit={createSession}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Session name">
                    <input
                      ref={quickSessionNameRef}
                      className={inputClass}
                      value={sessionForm.sessionName}
                      maxLength={80}
                      onChange={(event) => {
                        setQuickSessionError(null);
                        setSessionForm((current) => ({ ...current, sessionName: event.target.value }));
                      }}
                      placeholder="BTC trend replay"
                      data-testid="practice-quick-session-name"
                    />
                  </FieldLabel>
                  <FieldLabel label="Starting balance">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={sessionForm.startingBalance}
                      onChange={(event) => {
                        setQuickSessionError(null);
                        setSessionForm((current) => ({
                          ...current,
                          challengeStartingBalance: current.challengeStartingBalance === current.startingBalance ? event.target.value : current.challengeStartingBalance,
                          startingBalance: event.target.value
                        }));
                      }}
                      data-testid="practice-quick-session-balance"
                    />
                  </FieldLabel>
                  <FieldLabel label="Strategy (optional)">
                    <select
                      className={inputClass}
                      value={sessionForm.playbookId}
                      onChange={(event) => setSessionForm((current) => ({ ...current, playbookId: event.target.value }))}
                      data-testid="practice-quick-session-strategy"
                    >
                      <option value="">No strategy</option>
                      {quickSessionStrategies.map((playbook) => (
                        <option key={playbook.playbookId} value={playbook.playbookId}>{playbook.name}</option>
                      ))}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Timeframe">
                    <select
                      className={inputClass}
                      value={sessionForm.timeframeMinutes}
                      onChange={(event) => {
                        setQuickSessionError(null);
                        setSessionForm((current) => ({ ...current, timeframeMinutes: event.target.value }));
                      }}
                      data-testid="practice-quick-session-timeframe"
                    >
                      {practiceTimeframeOptions.map((timeframe) => (
                        <option key={timeframe.value} value={timeframe.value}>{timeframe.label}</option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>

                <fieldset className="relative z-30 min-w-0">
                  <legend className="mb-2 text-sm font-semibold text-[color:var(--label)]">Asset</legend>
                  <div ref={assetPickerRef} className="relative min-w-0" data-testid="practice-selected-asset">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-black">
                      <label className="relative min-w-0">
                        <span className="sr-only">Asset</span>
                        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--label3)]" />
                        <input
                          ref={assetComboboxRef}
                          role="combobox"
                          aria-label="Asset"
                          aria-autocomplete="list"
                          aria-expanded={isAssetPickerOpen}
                          aria-controls="practice-asset-listbox"
                          aria-activedescendant={isAssetPickerOpen && activeAsset ? `practice-asset-option-${activeAsset.symbol}` : undefined}
                          autoComplete="off"
                          className="focus-ring h-11 min-w-0 w-full bg-black py-2 pl-10 pr-3 text-sm font-semibold text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]"
                          value={isAssetPickerOpen ? assetSearch : selectedAsset ? `${selectedAsset.symbol} · ${selectedAsset.displayName}` : assetSearch}
                          placeholder="Search assets"
                          data-testid="practice-asset-search"
                          onFocus={(event) => {
                            if (!isAssetPickerOpen) {
                              event.currentTarget.select();
                            }
                          }}
                          onClick={() => {
                            if (!isAssetPickerOpen) {
                              openAssetPicker();
                            }
                          }}
                          onChange={(event) => {
                            const search = event.target.value;
                            setAssetSearch(search);
                            setActiveAssetIndex(firstAvailableAssetIndex(assetCatalogue.filter((asset) => {
                              const matchesCategory = assetCategoryFilter === "all" || asset.category === assetCategoryFilter;
                              return matchesCategory && `${asset.symbol} ${asset.displayName}`.toLowerCase().includes(search.trim().toLowerCase());
                            })));
                            setIsAssetPickerOpen(true);
                          }}
                          onKeyDown={handleAssetComboboxKeyDown}
                        />
                      </label>
                      <button
                        type="button"
                        className="focus-ring grid h-11 w-11 place-items-center border-l border-[color:var(--line)] bg-black text-[color:var(--label2)] hover:text-[color:var(--label)]"
                        aria-label={isAssetPickerOpen ? "Close asset catalogue" : "Open asset catalogue"}
                        title={isAssetPickerOpen ? "Close asset catalogue" : "Open asset catalogue"}
                        data-testid="practice-asset-toggle"
                        onClick={() => isAssetPickerOpen ? closeAssetPicker({ restoreFocus: true }) : openAssetPicker()}
                      >
                        {isAssetPickerOpen
                          ? <ChevronUp aria-hidden="true" className="h-4 w-4" />
                          : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
                      </button>
                    </div>

                    {isAssetPickerOpen ? (
                      <div
                        className={`absolute left-0 z-[70] w-full min-w-0 max-h-[calc(100dvh-7rem)] overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-black shadow-2xl ${assetPickerOpensUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"}`}
                        data-testid="practice-asset-catalogue"
                      >
                        <div className="flex max-w-full gap-1.5 overflow-x-auto border-b border-[color:var(--line)] bg-black p-2" aria-label="Asset categories">
                          {practiceAssetCategoryOptions.map((category) => (
                            <button
                              key={category.value}
                              type="button"
                              className={`focus-ring min-h-8 shrink-0 rounded-[8px] border px-2.5 text-xs font-semibold ${assetCategoryFilter === category.value ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]" : "border-[color:var(--line)] bg-black text-[color:var(--label2)]"}`}
                              aria-pressed={assetCategoryFilter === category.value}
                              data-testid={`practice-asset-category-${category.value}`}
                              onClick={() => {
                                setAssetCategoryFilter(category.value);
                                const categoryAssets = assetCatalogue.filter((asset) => {
                                  const matchesCategory = category.value === "all" || asset.category === category.value;
                                  const search = assetSearch.trim().toLowerCase();
                                  return matchesCategory && (!search || `${asset.symbol} ${asset.displayName}`.toLowerCase().includes(search));
                                });
                                setActiveAssetIndex(firstAvailableAssetIndex(categoryAssets));
                                assetComboboxRef.current?.focus();
                              }}
                            >
                              <span>{category.label}</span>
                              <span
                                className="ml-1 tabular-nums opacity-75"
                                data-testid={`practice-asset-category-count-${category.value}`}
                              >
                                {availableAssetCountByCategory[category.value]}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div
                          id="practice-asset-listbox"
                          role="listbox"
                          aria-label="Available practice assets"
                          className="max-h-60 overflow-x-hidden overflow-y-auto overscroll-contain bg-black"
                        >
                          {visibleAssets.length ? visibleAssets.map((asset, index) => {
                            const selected = selectedAsset?.symbol === asset.symbol && selectedAsset.assetClass === asset.assetClass;
                            const active = index === boundedActiveAssetIndex;

                            return (
                              <button
                                id={`practice-asset-option-${asset.symbol}`}
                                key={`${asset.assetClass}-${asset.symbol}`}
                                role="option"
                                type="button"
                                disabled={!asset.available}
                                aria-selected={selected}
                                aria-disabled={!asset.available}
                                className={`focus-ring grid min-h-11 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[color:var(--line)] px-3 py-1.5 text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-55 ${selected || active ? "bg-[color:var(--accent-bg)]" : "bg-black hover:bg-[color:var(--glass)]"}`}
                                aria-label={`${asset.symbol}, ${asset.displayName}, ${asset.available ? "available" : "unavailable"}`}
                                data-testid={`practice-asset-${asset.symbol}`}
                                onMouseEnter={() => setActiveAssetIndex(index)}
                                onClick={() => selectQuickSessionAsset(asset)}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-[color:var(--label)]">{asset.symbol}</span>
                                  <span className="block truncate text-xs text-[color:var(--label2)]">{asset.displayName}</span>
                                </span>
                                <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${asset.available ? "text-[color:var(--green)]" : "text-[color:var(--label3)]"}`}>
                                  {selected ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                                  {asset.available ? "Available" : "Unavailable"}
                                </span>
                                {!asset.available ? <span className="col-span-2 break-words text-xs text-[color:var(--label3)]">{asset.safeMessage}</span> : null}
                              </button>
                            );
                          }) : (
                            <p className="px-3 py-5 text-sm text-[color:var(--label2)]">No supported assets match your search.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Initial date">
                    <input
                      className={inputClass}
                      type="date"
                      max={defaultEnd}
                      value={sessionForm.dateStart}
                      onChange={(event) => {
                        setQuickSessionError(null);
                        setSessionForm((current) => ({ ...current, dateStart: event.target.value }));
                      }}
                      data-testid="practice-quick-session-start"
                    />
                  </FieldLabel>
                  <FieldLabel label="End date">
                    <input
                      className={inputClass}
                      type="date"
                      max={defaultEnd}
                      value={sessionForm.dateEnd}
                      onChange={(event) => {
                        setQuickSessionError(null);
                        setSessionForm((current) => ({ ...current, dateEnd: event.target.value }));
                      }}
                      data-testid="practice-quick-session-end"
                    />
                  </FieldLabel>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[color:var(--label3)]">Quick range</span>
                  {[{ label: "+1D", days: 1 }, { label: "+1W", days: 7 }, { label: "+1M", days: 30 }, { label: "+1Y", days: 365 }].map((range) => (
                    <button
                      key={range.label}
                      type="button"
                      className="focus-ring min-h-9 rounded-[8px] border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--label2)] hover:text-[color:var(--label)]"
                      onClick={() => setQuickRange(range.days)}
                      data-testid={`practice-range-${range.days}`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex min-h-11 items-center rounded-[8px] border border-[color:var(--line)]">
                    <label className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm font-semibold text-[color:var(--label)]">
                      <input
                        type="checkbox"
                        checked={sessionForm.randomStartEnabled}
                        onChange={(event) => {
                          if (event.target.checked) {
                            randomizeQuickStart();
                          } else {
                            setSessionForm((current) => ({ ...current, randomStartEnabled: false }));
                          }
                        }}
                      />
                      Random start
                    </label>
                    <button
                      type="button"
                      className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[color:var(--label2)] hover:bg-[color:var(--glass-hi)] hover:text-[color:var(--label)] disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Choose another random start"
                      title="Choose another random start"
                      disabled={!sessionForm.randomStartEnabled || isSaving}
                      onClick={randomizeQuickStart}
                      data-testid="practice-randomize-start"
                    >
                      <Shuffle aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="flex min-h-11 items-center gap-3 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-sm font-semibold text-[color:var(--label)]">
                    <input
                      type="checkbox"
                      checked={sessionForm.openTerminalAfterCreate}
                      onChange={(event) => setSessionForm((current) => ({ ...current, openTerminalAfterCreate: event.target.checked }))}
                    />
                    Open terminal after creation
                  </label>
                </div>

                {(quickSessionError || quickSessionValidation) ? (
                  <p className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--amber)_40%,transparent)] px-3 py-2 text-sm leading-5 text-[color:var(--label2)]" role="status" aria-live="polite" data-testid="practice-quick-session-validation">
                    {quickSessionError ?? quickSessionValidation}
                  </p>
                ) : (
                  <p className="text-xs leading-5 text-[color:var(--label3)]" role="status" aria-live="polite">
                    {selectedAsset?.displayName} is available. Orders created in this session are simulated.
                  </p>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--line)] pt-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={isSaving} onClick={closeQuickSession}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={isSaving || Boolean(quickSessionValidation) || !overview} data-testid="practice-create-session">
                    {isSaving ? "Creating session..." : "Create session"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      {activeView === "sessions" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Strategies" value={String(overview?.playbooks.length ?? 0)} />
        <StatChip label="Visible sessions" value={String((overview?.sessions ?? []).filter((session) => session.status !== "archived").length)} />
        <StatChip label="Archived" value={String((overview?.sessions ?? []).filter((session) => session.status === "archived").length)} />
        <StatChip label="Recent orders" value={String(overview?.orders.length ?? 0)} />
      </div> : null}

      {activeView === "analytics" ? <GlassCard className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Practice analytics</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Built from your completed simulated trades only.
            </p>
          </div>
          <Badge tone={analytics?.hasClosedTrades ? "green" : "amber"}>
            {analytics?.hasClosedTrades ? "Closed trades found" : "No closed trades"}
          </Badge>
        </div>

        {analytics?.hasClosedTrades ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatChip label="Closed trades" value={String(analytics.sessionSummaries.reduce((total, session) => total + session.closedTrades, 0))} />
              <StatChip label="Symbols" value={String(analytics.symbolBreakdown.length)} />
              <StatChip label="Challenge pass" value={String(analytics.challengeSummary.passed)} tone="green" />
              <StatChip label="Challenge fail" value={String(analytics.challengeSummary.failed)} tone="red" />
              <StatChip label="Analytics limit" value={`${analytics.orderLimit} orders`} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Equity curve</p>
                  <span className="text-xs text-[color:var(--label2)]">{analytics.equityCurve.length} closed points</span>
                </div>
                <div className="grid gap-1.5">
                  {analytics.equityCurve.slice(-8).map((point) => {
                    const maxEquity = Math.max(...analytics.equityCurve.map((entry) => Math.abs(entry.equity)), 1);

                    return (
                      <div key={`${point.orderId}-equity`} className="grid grid-cols-[5rem_1fr_5rem] items-center gap-2 text-xs">
                        <span className="truncate text-[color:var(--label2)]">{new Date(point.date).toLocaleDateString("en-NG")}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--line)_70%,transparent)]">
                          <span className="block h-full rounded-full bg-[color:var(--green)]" style={{ width: `${Math.max(4, Math.min(100, Math.abs(point.equity) / maxEquity * 100))}%` }} />
                        </span>
                        <span className="truncate text-right tabular-nums text-[color:var(--label)]">{formatPracticeMoney(point.equity)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Drawdown curve</p>
                  <span className="text-xs text-[color:var(--label2)]">Closed orders only</span>
                </div>
                <div className="grid gap-1.5">
                  {analytics.drawdownCurve.slice(-8).map((point) => {
                    const maxDrawdown = Math.max(...analytics.drawdownCurve.map((entry) => entry.drawdown), 1);

                    return (
                      <div key={`${point.orderId}-drawdown`} className="grid grid-cols-[5rem_1fr_5rem] items-center gap-2 text-xs">
                        <span className="truncate text-[color:var(--label2)]">{new Date(point.date).toLocaleDateString("en-NG")}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--line)_70%,transparent)]">
                          <span className="block h-full rounded-full bg-[color:var(--red)]" style={{ width: `${Math.max(4, Math.min(100, point.drawdown / maxDrawdown * 100))}%` }} />
                        </span>
                        <span className="truncate text-right tabular-nums text-[color:var(--label)]">{formatPracticeMoney(point.drawdown)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Daily P&L</p>
                {analytics.dailyPnl.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[color:var(--label2)]">{day.date}</span>
                    <span className={`tabular-nums ${(day.pnl ?? 0) >= 0 ? "text-[color:var(--green)]" : "text-[color:var(--red)]"}`}>
                      {formatPracticeMoney(day.pnl)} / {day.trades} trades
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Symbol breakdown</p>
                {analytics.symbolBreakdown.slice(0, 6).map((symbol) => (
                  <div key={`${symbol.assetClass}-${symbol.symbol}`} className="grid grid-cols-[1fr_auto] gap-2 text-xs">
                    <span className="truncate text-[color:var(--label)]">{symbol.symbol} · {symbol.assetClass}</span>
                    <span className="tabular-nums text-[color:var(--label2)]">{formatPracticeMoney(symbol.netPnl)} · {formatPercentRatio(symbol.winRate)}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Strategy breakdown</p>
                {analytics.playbookBreakdown.slice(0, 6).map((playbook) => (
                  <div key={playbook.playbookId} className="grid grid-cols-[1fr_auto] gap-2 text-xs">
                    <span className="truncate text-[color:var(--label)]">{playbook.playbookName}</span>
                    <span className="tabular-nums text-[color:var(--label2)]">{formatPracticeMoney(playbook.netPnl)} · {playbook.trades} trades</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Best sessions</p>
                {analytics.bestSessions.map((session) => (
                  <p key={session.sessionId} className="truncate text-xs text-[color:var(--label2)]">
                    {session.sessionName ?? session.symbol} · {formatPracticeMoney(session.netPnl)} · {formatPercentRatio(session.winRate)}
                  </p>
                ))}
              </div>
              <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Worst sessions</p>
                {analytics.worstSessions.map((session) => (
                  <p key={session.sessionId} className="truncate text-xs text-[color:var(--label2)]">
                    {session.sessionName ?? session.symbol} · {formatPracticeMoney(session.netPnl)} · DD {formatPracticeMoney(session.maxDrawdown)}
                  </p>
                ))}
              </div>
              <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Recent completed sessions</p>
                {analytics.recentCompletedSessions.length ? analytics.recentCompletedSessions.map((session) => (
                  <p key={session.sessionId} className="truncate text-xs text-[color:var(--label2)]">
                    {session.sessionName ?? session.symbol} · {session.symbol} · {formatPracticeMoney(session.endingBalance)}
                  </p>
                )) : (
                  <p className="text-xs leading-5 text-[color:var(--label2)]">No completed sessions yet.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 rounded-[8px] border border-[color:var(--line)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Session comparison</p>
                <span className="text-xs text-[color:var(--label2)]">Safe summaries only</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FieldLabel label="Session A">
                  <select className={inputClass} value={compareLeftSessionId} onChange={(event) => setCompareLeftSessionId(event.target.value)}>
                    {comparisonSessions.map((session) => (
                      <option key={session.sessionId} value={session.sessionId}>{session.sessionName ?? session.symbol} / {session.symbol} / {session.timeframeMinutes}m</option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Session B">
                  <select className={inputClass} value={compareRightSessionId} onChange={(event) => setCompareRightSessionId(event.target.value)}>
                    {comparisonSessions.map((session) => (
                      <option key={session.sessionId} value={session.sessionId}>{session.sessionName ?? session.symbol} / {session.symbol} / {session.timeframeMinutes}m</option>
                    ))}
                  </select>
                </FieldLabel>
              </div>
              {compareLeft && compareRight ? (
                <div className="grid gap-2">
                  {[
                    ["Starting", formatPracticeMoney(compareLeft.startingBalance), formatPracticeMoney(compareRight.startingBalance)],
                    ["Ending", formatPracticeMoney(compareLeft.endingBalance), formatPracticeMoney(compareRight.endingBalance)],
                    ["Net P&L", formatPracticeMoney(compareLeft.netPnl), formatPracticeMoney(compareRight.netPnl)],
                    ["Win", formatPercentRatio(compareLeft.winRate), formatPercentRatio(compareRight.winRate)],
                    ["Avg R", compareLeft.averageR.toFixed(2), compareRight.averageR.toFixed(2)],
                    ["Max DD", formatPracticeMoney(compareLeft.maxDrawdown), formatPracticeMoney(compareRight.maxDrawdown)],
                    ["PF", compareLeft.profitFactor.toFixed(2), compareRight.profitFactor.toFixed(2)],
                    ["Expectancy", formatPracticeMoney(compareLeft.expectancy), formatPracticeMoney(compareRight.expectancy)],
                    ["Trades", String(compareLeft.closedTrades), String(compareRight.closedTrades)],
                    ["Strategy", compareLeft.playbookName ?? "No strategy", compareRight.playbookName ?? "No strategy"],
                    ["Symbol", `${compareLeft.symbol} / ${compareLeft.timeframeMinutes}m`, `${compareRight.symbol} / ${compareRight.timeframeMinutes}m`],
                    ["Challenge", compareLeft.challengeStatus ?? "off", compareRight.challengeStatus ?? "off"]
                  ].map(([label, left, right]) => (
                    <div key={label} className="grid grid-cols-[6rem_1fr_1fr] gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs">
                      <span className="truncate font-semibold text-[color:var(--label3)]">{label}</span>
                      <span className="truncate text-[color:var(--label)]">{left}</span>
                      <span className="truncate text-[color:var(--label)]">{right}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--label2)]">Create at least two practice sessions to compare summaries.</p>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-[8px] border border-dashed border-[color:var(--line)] px-4 py-5 text-sm leading-6 text-[color:var(--label2)]">
            No analytics yet. Close at least one simulated order to populate equity, drawdown, daily P&L, symbol, Strategy, and comparison analytics.
          </p>
        )}
      </GlassCard> : null}

      {activeView === "strategies" ? <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Strategy performance</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Compare results from closed simulated trades linked to each Strategy.
            </p>
          </div>
          {overview?.playbookPerformance.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Best Strategy</p>
                <p className="mt-2 break-safe text-sm font-semibold text-[color:var(--label)]">
                  {overview.bestPlaybook?.playbookName ?? "No winner yet"}
                </p>
                <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  Net P&L {(overview.bestPlaybook?.netPnl ?? 0).toFixed(2)} · Win {((overview.bestPlaybook?.winRate ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                <p className="text-xs font-semibold uppercase text-[color:var(--label3)]">Worst Strategy</p>
                <p className="mt-2 break-safe text-sm font-semibold text-[color:var(--label)]">
                  {overview.worstPlaybook?.playbookName ?? "No loser yet"}
                </p>
                <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                  Net P&L {(overview.worstPlaybook?.netPnl ?? 0).toFixed(2)} · DD {(overview.worstPlaybook?.maxDrawdown ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
        ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              No Strategy activity yet. Link a Strategy to a simulated order and close it to see Strategy performance.
          </p>
        )}
        </GlassCard>

        <GlassCard className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Edit Strategies</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Keep rules current without changing historical order snapshots.
            </p>
          </div>
          {overview?.playbooks.length ? (
            <div className="grid gap-3">
              {overview.playbooks.map((playbook) => {
                const form = editingPlaybooks[playbook.playbookId] ?? playbookToForm(playbook);

                return (
                  <div key={playbook.playbookId} className="grid gap-3 rounded-[8px] border border-[color:var(--line)] p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <FieldLabel label="Name">
                        <input
                          className={inputClass}
                          value={form.name}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, name: event.target.value }
                          }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Market">
                        <select
                          className={inputClass}
                          value={form.market}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, market: event.target.value as PracticeAssetClass }
                          }))}
                        >
                          <option value="crypto">Crypto</option>
                          <option value="forex_cfd">Forex-CFD</option>
                        </select>
                      </FieldLabel>
                      <FieldLabel label="Status">
                        <select
                          className={inputClass}
                          value={form.status}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, status: event.target.value as PlaybookForm["status"] }
                          }))}
                        >
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </FieldLabel>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FieldLabel label="Strategy type">
                        <input
                          className={inputClass}
                          value={form.strategyType}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, strategyType: event.target.value }
                          }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Entry checklist">
                        <textarea
                          className={inputClass}
                          rows={3}
                          value={form.entryChecklist}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, entryChecklist: event.target.value }
                          }))}
                        />
                      </FieldLabel>
                    </div>
                    <FieldLabel label="Setup rules">
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={form.setupRules}
                        onChange={(event) => setEditingPlaybooks((current) => ({
                          ...current,
                          [playbook.playbookId]: { ...form, setupRules: event.target.value }
                        }))}
                      />
                    </FieldLabel>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FieldLabel label="Invalidation rules">
                        <textarea
                          className={inputClass}
                          rows={2}
                          value={form.invalidationRules}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, invalidationRules: event.target.value }
                          }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Risk notes">
                        <textarea
                          className={inputClass}
                          rows={2}
                          value={form.riskNotes}
                          onChange={(event) => setEditingPlaybooks((current) => ({
                            ...current,
                            [playbook.playbookId]: { ...form, riskNotes: event.target.value }
                          }))}
                        />
                      </FieldLabel>
                    </div>
                    <Button size="sm" type="button" disabled={isSaving} onClick={() => updatePlaybook(playbook.playbookId)}>
                      Save Strategy
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
              No Strategies yet. Create one above with setup rules and a checklist, or import Strategies from CSV.
            </p>
          )}
        </GlassCard>
      </div> : null}

      {activeView === "sessions" ? <GlassCard className="space-y-4" data-testid="practice-sessions-view">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Practice session dashboard</p>
            <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
              Find a session, continue it, open its report, or manage its setup and archive state.
            </p>
          </div>
          <Badge tone="accent">{filteredSessions.length} shown</Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <FieldLabel label="Search">
            <input
              className={inputClass}
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder="Name, symbol, market, timeframe, Strategy, status"
            />
          </FieldLabel>
          <FieldLabel label="Status">
            <select
              className={inputClass}
              value={sessionStatusFilter}
              onChange={(event) => setSessionStatusFilter(event.target.value as SessionStatusFilter)}
            >
              <option value="all">Active list</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
              <option value="archived">Archived</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Sort">
            <select
              className={inputClass}
              value={sessionSort}
              onChange={(event) => setSessionSort(event.target.value as SessionSortKey)}
            >
              <option value="recent">Recently updated</option>
              <option value="created">Created date</option>
              <option value="symbol">Symbol</option>
              <option value="performance">Performance</option>
              <option value="status">Status</option>
            </select>
          </FieldLabel>
          <select
            aria-label="Filter sessions by Strategy"
            className={inputClass}
            value={playbookFilter}
            onChange={(event) => setPlaybookFilter(event.target.value)}
          >
            <option value="">All Strategies</option>
            {overview?.playbooks.map((playbook) => (
              <option key={playbook.playbookId} value={playbook.playbookId}>
                {playbook.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FieldLabel label="Asset">
            <select className={inputClass} value={sessionAssetFilter} onChange={(event) => setSessionAssetFilter(event.target.value as "all" | PracticeAssetClass)}>
              <option value="all">All assets</option>
              <option value="crypto">Crypto</option>
              <option value="forex_cfd">Forex-CFD</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Symbol">
            <select className={inputClass} value={sessionSymbolFilter} onChange={(event) => setSessionSymbolFilter(event.target.value)}>
              <option value="all">All symbols</option>
              {sessionSymbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Timeframe">
            <select className={inputClass} value={sessionTimeframeFilter} onChange={(event) => setSessionTimeframeFilter(event.target.value)}>
              <option value="all">All timeframes</option>
              {sessionTimeframes.map((timeframe) => <option key={timeframe} value={timeframe}>{timeframe}m</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Challenge">
            <select className={inputClass} value={sessionChallengeFilter} onChange={(event) => setSessionChallengeFilter(event.target.value as "all" | "enabled" | "disabled")}>
              <option value="all">Any challenge</option>
              <option value="enabled">Challenge on</option>
              <option value="disabled">Challenge off</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Random start">
            <select className={inputClass} value={sessionRandomFilter} onChange={(event) => setSessionRandomFilter(event.target.value as "all" | "enabled" | "disabled")}>
              <option value="all">Any start</option>
              <option value="enabled">Random on</option>
              <option value="disabled">Random off</option>
            </select>
          </FieldLabel>
        </div>

        {visibleSessions.length ? (
          <div className="grid gap-3">
            {visibleSessions.map((session) => {
              const performance = overview?.sessionPerformance[session.sessionId];
              const challengeStatus = overview?.sessionChallengeStatus[session.sessionId];
              const review = overview?.completedSessionReviews[session.sessionId];
              const instrument = session.instrument ?? getPracticeInstrumentSpec(session.assetClass, session.symbol);
              const playbookName = session.playbookId ? playbookNameById.get(session.playbookId) : undefined;
              const totalCandles = estimatedSessionCandleCount(session);
              const revealedCount = totalCandles > 0 ? Math.min(totalCandles, session.currentCandleIndex + 1) : session.currentCandleIndex + 1;
              const equity = performance?.endingBalance ?? session.startingBalance;
              const sessionTitle = `${session.sessionName ? `${session.sessionName} · ` : ""}${session.symbol} / ${session.timeframeMinutes}m / ${session.assetClass}`;

              return (
                <div
                  key={session.sessionId}
                  className={`grid gap-4 rounded-[8px] border bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] p-4 ${highlightedSessionId === session.sessionId ? "border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]" : "border-[color:var(--line)]"}`}
                  data-testid={highlightedSessionId === session.sessionId ? "practice-created-session" : "practice-session-card"}
                >
                  <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(28rem,1fr)_minmax(18rem,24rem)] 2xl:items-start" data-layout="practice-session-row">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 max-w-full text-sm font-semibold text-[color:var(--label)]" title={sessionTitle}>
                          <span className="clip-line inline-block max-w-full align-bottom">
                            {sessionTitle}
                          </span>
                        </p>
                        <Badge tone={statusBadgeTone(session.status)}>
                          {session.status}
                        </Badge>
                        {session.randomStartEnabled ? <Badge tone="accent">Random</Badge> : null}
                        {session.challenge?.enabled ? <Badge tone="amber">Challenge</Badge> : null}
                      </div>
                      <p className="flow-copy mt-1 text-sm leading-6 text-[color:var(--label2)]">
                        {new Date(session.dateStart).toLocaleDateString("en-NG")} to {new Date(session.dateEnd).toLocaleDateString("en-NG")} · Updated {new Date(session.updatedAt).toLocaleString("en-NG")}
                      </p>
                      <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                        Progress {revealedCount}/{totalCandles || "est."} candles · Start {formatPracticeMoney(session.startingBalance)} · Equity {formatPracticeMoney(equity)} · Realized {formatPracticeMoney(performance?.netPnl ?? 0)}
                      </p>
                      <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                        Strategy: {playbookName ?? "No linked strategy"}
                      </p>
                      {session.randomStartEnabled ? (
                        <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                          Random window selected between {session.requestedDateStart ? new Date(session.requestedDateStart).toLocaleDateString("en-NG") : "the requested start"} and {session.requestedDateEnd ? new Date(session.requestedDateEnd).toLocaleDateString("en-NG") : "the requested end"}.
                        </p>
                      ) : null}
                      {challengeStatus ? (
                        <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                          Simulated challenge: {challengeStatus.challengeName} · {challengeStatus.status} · Equity {challengeStatus.currentEquity.toFixed(2)} · Target {challengeStatus.profitTargetAmount.toFixed(2)}
                        </p>
                      ) : null}
                      {instrument ? (
                        <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label3)]">
                          Practice spec: {instrument.displayName} · {instrument.quantityLabel} · {instrument.pipLabel}s · broker estimates may differ.
                        </p>
                      ) : null}
                      {review ? (
                        <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                          Review: final {review.finalBalance.toFixed(2)} · Avg R {review.averageR.toFixed(2)} · PF {review.profitFactor.toFixed(2)}
                        </p>
                      ) : null}
                      {session.reflection ? (
                        <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                          Reflection: confidence {session.reflection.confidenceScore ?? "-"} / 5 · {session.reflection.improveNextTime ?? session.reflection.whatWentWell ?? "Saved"}
                        </p>
                      ) : session.status === "completed" ? (
                        <p className="flow-copy mt-1 text-xs leading-5 text-[color:var(--label2)]">
                          Reflection pending.
                        </p>
                      ) : null}
                    </div>
                    <div className="grid min-w-0 gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,7.5rem),1fr))]">
                      <StatChip label="Progress" value={`${revealedCount}/${totalCandles || "-"}`} />
                      <StatChip label="P&L" value={formatPracticeMoney(performance?.netPnl ?? 0)} tone={(performance?.netPnl ?? 0) >= 0 ? "green" : "red"} />
                      <StatChip label="Win" value={`${((performance?.winRate ?? 0) * 100).toFixed(0)}%`} />
                      <StatChip label="Challenge" value={challengeStatus?.status ?? (session.challenge?.enabled ? "not started" : "off")} />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {session.status !== "archived" ? (
                      <>
                        <Button href={`/app/practice/${encodeURIComponent(session.sessionId)}/terminal`} variant={session.status === "completed" ? "secondary" : "primary"}>
                          <Play aria-hidden="true" className="h-4 w-4" />
                          {session.status === "completed" ? "Open terminal" : "Continue"}
                        </Button>
                        <Button href={`/app/practice/${encodeURIComponent(session.sessionId)}`} variant="secondary">
                          Open review
                        </Button>
                        <Button href={`/app/practice/${encodeURIComponent(session.sessionId)}/report`} variant="secondary">
                          <FileText aria-hidden="true" className="h-4 w-4" /> Report
                        </Button>
                        <Button type="button" variant="secondary" disabled={isSaving} onClick={() => mutatePracticeSession("duplicate", session.sessionId)}>
                          <Copy aria-hidden="true" className="h-4 w-4" /> Duplicate setup
                        </Button>
                        <Button type="button" variant="secondary" disabled={isSaving} onClick={() => mutatePracticeSession("archive", session.sessionId)}>
                          <Archive aria-hidden="true" className="h-4 w-4" /> Archive
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setSettingsSessionId(session.sessionId)}>
                          <Settings aria-hidden="true" className="h-4 w-4" /> Session settings
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button href={`/app/practice/${encodeURIComponent(session.sessionId)}`} variant="secondary">
                          Open review
                        </Button>
                        <Button href={`/app/practice/${encodeURIComponent(session.sessionId)}/report`} variant="secondary">
                          <FileText aria-hidden="true" className="h-4 w-4" /> Report
                        </Button>
                        <Button type="button" variant="primary" disabled={isSaving} onClick={() => mutatePracticeSession("restore", session.sessionId)}>
                          <RotateCcw aria-hidden="true" className="h-4 w-4" /> Restore
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setSettingsSessionId(session.sessionId)}>
                          <Settings aria-hidden="true" className="h-4 w-4" /> Session settings
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSessions.length > visibleSessionCount ? (
              <Button type="button" variant="secondary" disabled={isSaving} onClick={() => setVisibleSessionCount((current) => current + 12)}>
                Load more sessions
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {overview?.sessions.length
              ? sessionStatusFilter === "archived"
                ? "No archived sessions match these filters."
                : "No sessions match these filters."
              : "No sessions yet. Return to Practice home and start a backtesting session."}
          </p>
        )}
      </GlassCard> : null}

      {activeView === "analytics" ? <GlassCard className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[color:var(--label)]">Recent practice orders</p>
          <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Simulated order snapshots stay separate from AutoCopy and live execution.
          </p>
        </div>
        {filteredOrders.length ? (
          <div className="grid gap-3">
            {filteredOrders.slice(0, 6).map((order) => {
              const instrument = order.instrument;

              return (
                <div key={order.orderId} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-4 py-3">
                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                    {order.playbookName ?? "No strategy"} · {order.direction.toUpperCase()} · {order.status}
                  </p>
                  <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                    Entry {formatPracticePrice(order.filledPrice ?? order.requestedPrice, instrument)} · Size {order.size === undefined ? "-" : `${formatPracticeQuantity(order.size, instrument)} ${instrument?.quantityLabel ?? "Qty"}`} · P&L {order.pnl === undefined ? "-" : formatPracticeMoney(order.pnl)} · R {order.rMultiple === undefined ? "-" : `${order.rMultiple.toFixed(2)}R`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {playbookFilter ? "No recent simulated orders match that Strategy." : "No simulated practice orders yet. Open a terminal session, reveal a candle, optionally select a Strategy, and submit a simulated order."}
          </p>
        )}
      </GlassCard> : null}

      {settingsSessionId ? (
        <div className="fixed inset-0 z-40" data-testid="practice-session-settings-layer">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close session settings"
            onClick={() => setSettingsSessionId(null)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-session-settings-title"
            data-theme-surface="dark"
            className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[30rem] flex-col border-l border-[color:var(--line)] bg-black shadow-2xl"
            data-testid="practice-session-settings-drawer"
          >
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-3">
              <div className="min-w-0">
                <p id="practice-session-settings-title" className="truncate text-base font-semibold text-[color:var(--label)]">
                  Session settings
                </p>
                <p className="truncate text-xs text-[color:var(--label2)]">
                  {settingsSession?.sessionName ?? settingsSession?.symbol ?? "Loading session"}
                </p>
              </div>
              <button
                type="button"
                className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[color:var(--line)] text-[color:var(--label2)] hover:text-[color:var(--label)]"
                aria-label="Close session settings"
                title="Close session settings"
                onClick={() => setSettingsSessionId(null)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {settingsSession ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusBadgeTone(settingsSession.status)}>{settingsSession.status}</Badge>
                    {settingsSession.challenge?.enabled ? <Badge tone="amber">Challenge</Badge> : null}
                    {settingsSession.assignmentSnapshot ? <Badge tone="accent">Assigned practice</Badge> : null}
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Session", settingsSession.sessionName ?? settingsSession.symbol],
                      ["Market", settingsSession.assetClass === "forex_cfd" ? "Forex / CFD" : "Crypto"],
                      ["Symbol", settingsSession.symbol],
                      ["Timeframe", `${settingsSession.timeframeMinutes} minutes`],
                      ["Date range", `${new Date(settingsSession.dateStart).toLocaleDateString("en-NG")} to ${new Date(settingsSession.dateEnd).toLocaleDateString("en-NG")}`],
                      ["Starting balance", formatPracticeMoney(settingsSession.startingBalance)],
                      ["Current equity", formatPracticeMoney(overview?.sessionPerformance[settingsSession.sessionId]?.endingBalance ?? settingsSession.startingBalance)],
                      ["Strategy", settingsSession.playbookId ? playbookNameById.get(settingsSession.playbookId) ?? "Linked strategy" : "None"],
                      ["Challenge", overview?.sessionChallengeStatus[settingsSession.sessionId]?.status ?? (settingsSession.challenge?.enabled ? "Not started" : "Off")],
                      ["Origin", settingsSession.assignmentSnapshot?.title ?? "Personal session"],
                      ["Status", settingsSession.status],
                      ["Last updated", new Date(settingsSession.updatedAt).toLocaleString("en-NG")]
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 border-b border-[color:var(--line)] pb-3">
                        <dt className="text-xs font-semibold uppercase text-[color:var(--label3)]">{label}</dt>
                        <dd className="mt-1 break-safe text-sm text-[color:var(--label)]">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <p className="rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                    Session setup is read-only here. Duplicate the setup to change dates, balance, market, timeframe, Strategy, or challenge without changing this session&apos;s candles, orders, or results.
                  </p>

                  {settingsSession.assignmentSnapshot ? (
                    <p className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--amber)_36%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      This session belongs to an assignment and must remain available for review. You can archive it, but you cannot permanently delete it.
                    </p>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {settingsSession.status !== "archived" ? (
                      <Button href={`/app/practice/${encodeURIComponent(settingsSession.sessionId)}/terminal`} variant="primary">
                        <Play aria-hidden="true" className="h-4 w-4" /> Open or continue
                      </Button>
                    ) : null}
                    <Button href={`/app/practice/${encodeURIComponent(settingsSession.sessionId)}/report`} variant="secondary">
                      <FileText aria-hidden="true" className="h-4 w-4" /> Open report
                    </Button>
                    <Button type="button" variant="secondary" disabled={isSaving} onClick={() => mutatePracticeSession("duplicate", settingsSession.sessionId)}>
                      <Copy aria-hidden="true" className="h-4 w-4" /> Duplicate setup
                    </Button>
                    {settingsSession.status === "archived" ? (
                      <Button type="button" variant="secondary" disabled={isSaving} onClick={() => mutatePracticeSession("restore", settingsSession.sessionId)}>
                        <RotateCcw aria-hidden="true" className="h-4 w-4" /> Restore
                      </Button>
                    ) : (
                      <Button type="button" variant="secondary" disabled={isSaving} onClick={() => mutatePracticeSession("archive", settingsSession.sessionId)}>
                        <Archive aria-hidden="true" className="h-4 w-4" /> Archive
                      </Button>
                    )}
                  </div>

                  <div className="border-t border-[color:var(--line)] pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={Boolean(settingsSession.assignmentId || settingsSession.assignmentSnapshot) || isSaving}
                      onClick={() => {
                        setDeleteSessionId(settingsSession.sessionId);
                        setDeleteConfirmationName("");
                      }}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4 text-[color:var(--red)]" /> Delete session
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                <p className="text-sm leading-6 text-[color:var(--label2)]">Loading session settings...</p>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--label2)]">Session settings are unavailable. Close this panel and refresh your sessions.</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {deleteSessionId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" data-testid="practice-delete-session-dialog">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-delete-session-title"
            data-theme-surface="dark"
            className="w-full max-w-md rounded-[8px] border border-[color:var(--line)] bg-black p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="practice-delete-session-title" className="text-base font-semibold text-[color:var(--label)]">Delete session permanently?</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                  Orders, drawings, bookmarks, reflections, and review data for this standalone session will be removed. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[color:var(--line)] text-[color:var(--label2)]"
                aria-label="Cancel session deletion"
                title="Cancel"
                onClick={() => {
                  setDeleteSessionId(null);
                  setDeleteConfirmationName("");
                }}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5">
              <FieldLabel label={`Enter ${deleteSessionName} to confirm`}>
                <input
                  autoFocus
                  className={inputClass}
                  value={deleteConfirmationName}
                  disabled={isDeleting}
                  onChange={(event) => setDeleteConfirmationName(event.target.value)}
                  data-testid="practice-delete-confirmation-name"
                />
              </FieldLabel>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteSessionId(null);
                  setDeleteConfirmationName("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isDeleting || deleteConfirmationName !== deleteSessionName}
                onClick={() => void deletePracticeSession()}
                data-testid="practice-confirm-delete-session"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {isDeleting ? "Deleting session..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading Practice...</p>
        </GlassCard>
      ) : null}
    </StudentShell>
  );
}

export function StudentPracticeClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/practice">
      <StudentPracticeBody />
    </RoleGate>
  );
}
