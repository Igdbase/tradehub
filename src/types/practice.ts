import type { AdminSourceMeta } from "@/types/admin-api";
import type { IsoDateString } from "@/types/workspace";

export type PracticeAssetClass = "crypto" | "forex_cfd";
export type PracticePlatformSource = "binance" | "metaapi_mt5" | "forex_cfd_real";
export type PracticeInstrumentCategory =
  | "crypto_spot"
  | "forex_major"
  | "forex_cross"
  | "metals_cfd"
  | "indices_cfd"
  | "energy_cfd";
export type PracticeAssetCatalogueCategory = "crypto" | "forex" | "metals" | "indices" | "energies";
export type PracticeSessionStatus = "draft" | "active" | "completed" | "abandoned" | "archived";
export type PracticeOrderStatus = "draft" | "pending" | "open" | "closed" | "cancelled" | "rejected";
export type PracticeOrderType = "market" | "limit" | "stop";
export type PracticeOrderDirection = "buy" | "sell";
export type PracticeOrderCloseEventType = "partial_close" | "full_close";
export type PracticePlaybookStatus = "active" | "archived";
export type PracticeAssignmentStatus = "draft" | "active" | "archived";
export type PracticeCohortStatus = "active" | "archived";
export type PracticeAssignmentTaskStatus =
  | "not_started"
  | "not_available"
  | "available"
  | "due_soon"
  | "overdue"
  | "in_progress"
  | "completed"
  | "feedback_available"
  | "resubmission_requested"
  | "closed";
export type PracticeNotificationKind =
  | "assignment_available"
  | "assignment_due_soon"
  | "assignment_overdue"
  | "assignment_closed"
  | "feedback_published"
  | "resubmission_requested"
  | "resubmission_due_soon"
  | "resubmission_overdue";
export type PracticeNotificationUrgency = "low" | "medium" | "high";
export type PracticeNotificationAction = "start_assignment" | "continue_session" | "view_feedback" | "start_resubmission";
export type PracticeInstructorFeedbackStatus = "not_reviewed" | "reviewed";
export type PracticeInstructorFeedbackPublicationStatus = "draft" | "published";
export type PracticeAssignmentReviewQueueFilter =
  | "all"
  | "needs_review"
  | "feedback_draft"
  | "feedback_published"
  | "resubmission_requested"
  | "completed";
export type PracticeAssignmentResubmissionStatus = "none" | "requested" | "started" | "completed";
export type PracticeChallengeStatus = "not_started" | "active" | "passed" | "failed";
export type PracticeEventMarkerCategory = "economic" | "news" | "earnings" | "platform_note" | "custom";
export type PracticeEventMarkerImpact = "low" | "medium" | "high";
export type PracticeEventMarkerScope = "global" | "workspace";
export type PracticeExportDataset =
  | "sessions"
  | "orders"
  | "closed_trades"
  | "playbooks"
  | "annotations"
  | "reflections"
  | "backup_json";
export type PracticeAnnotationKind =
  | "entry_note"
  | "mistake_note"
  | "structure_note"
  | "support_resistance_zone"
  | "chart_marker_note"
  | "trend_line"
  | "horizontal_line"
  | "vertical_marker"
  | "zone"
  | "text_note"
  | "fibonacci_retracement"
  | "measurement_placeholder";
export type PracticeDrawingColorToken = "accent" | "green" | "amber" | "red" | "blue" | "neutral";
export type PracticeDrawingCoordinateVersion = "klinecharts_v1" | "klinecharts_v2";
export type PracticeDrawingAppearanceVersion = "trend_blue_v1" | "user_selected_v1";

export interface PracticeDrawingChartPoint {
  dataIndex: number;
  value?: number;
}
export type PracticeOrderCloseReason =
  | "manual"
  | "stop_loss"
  | "take_profit"
  | "trailing_stop"
  | "auto_breakeven"
  | "session_completed"
  | "cancelled"
  | "rejected";

export interface PracticeInstrumentSpecSummary {
  canonicalSymbol: string;
  assetClass: PracticeAssetClass;
  displayName: string;
  category: PracticeInstrumentCategory;
  pricePrecision: number;
  quantityPrecision: number;
  quantityStep: number;
  quantityLabel: string;
  tickSize?: number;
  pipSize: number;
  pipLabel: string;
  contractMultiplier: number;
  minSimulatedSize: number;
  maxSimulatedSize: number;
  minSimulatedNotional?: number;
  maxSimulatedNotional: number;
  safeMessage: string;
}

export interface PracticeAssetCatalogueItem {
  symbol: string;
  displayName: string;
  assetClass: PracticeAssetClass;
  category: PracticeAssetCatalogueCategory;
  available: boolean;
  safeMessage: string;
  instrument?: PracticeInstrumentSpecSummary;
}

export interface PracticeForexCfdHistoryReadinessSummary {
  configured: boolean;
  provider: "disabled" | "tradehub_static_demo" | "metaapi_utility";
  providerLabel: string;
  realHistoryEnabled: boolean;
  dryRun: boolean;
  vaultReady: boolean;
  supportedSymbols: string[];
  supportedTimeframes: number[];
  failClosedReason?: string;
  safeMessage: string;
}

export interface PracticeOrderCloseEvent {
  eventId: string;
  eventType: PracticeOrderCloseEventType;
  closedSize: number;
  remainingSize: number;
  exitPrice: number;
  notional?: number;
  pnl: number;
  rMultiple?: number;
  instrument?: PracticeInstrumentSpecSummary;
  closeReason: PracticeOrderCloseReason;
  candleIndex: number;
  candleTime: IsoDateString;
  safeMessage: string;
  createdAt: IsoDateString;
}

export interface NormalizedCandle {
  openTime: IsoDateString;
  closeTime: IsoDateString;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provider: PracticePlatformSource;
  assetClass: PracticeAssetClass;
  symbol: string;
  providerSymbol?: string;
  timeframeMinutes: number;
}

export type StudentPracticeCandle = Omit<NormalizedCandle, "provider" | "providerSymbol">;

export interface HistoricalCandleRequest {
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: number;
  rangeStart: IsoDateString;
  rangeEnd: IsoDateString;
}

export interface HistoricalCandleCacheRecord {
  cacheId: string;
  provider: PracticePlatformSource;
  assetClass: PracticeAssetClass;
  symbol: string;
  providerSymbol?: string;
  timeframeMinutes: number;
  rangeStart: IsoDateString;
  rangeEnd: IsoDateString;
  candles: NormalizedCandle[];
  fetchedAt: IsoDateString;
  expiresAt: IsoDateString;
  cacheVersion: 1;
}

export interface PracticePlaybookRecord {
  playbookId: string;
  workspaceId: string;
  studentId: string;
  name: string;
  market: PracticeAssetClass;
  strategyType: string;
  setupRules: string;
  entryChecklist: string[];
  invalidationRules: string;
  riskNotes: string;
  status: PracticePlaybookStatus;
  description?: string;
  archivedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type PracticePlaybookSummary = PracticePlaybookRecord;

export interface PracticeSessionRecord {
  sessionId: string;
  workspaceId: string;
  studentId: string;
  sessionName?: string;
  assetClass: PracticeAssetClass;
  platformSource: PracticePlatformSource;
  symbol: string;
  instrument?: PracticeInstrumentSpecSummary;
  timeframeMinutes: number;
  dateStart: IsoDateString;
  dateEnd: IsoDateString;
  requestedDateStart?: IsoDateString;
  requestedDateEnd?: IsoDateString;
  randomStartEnabled?: boolean;
  randomizedAt?: IsoDateString;
  startingBalance: number;
  riskPct: number;
  feeBps?: number;
  spreadBps?: number;
  slippageBps?: number;
  playbookId?: string;
  assignmentId?: string;
  assignmentSnapshot?: PracticeSessionAssignmentSnapshot;
  assignmentAttemptNumber?: number;
  previousAttemptMaskedSessionRef?: string;
  resubmissionSourceFeedbackId?: string;
  resubmissionStatus?: PracticeAssignmentResubmissionStatus;
  challenge?: PracticeChallengeConfig;
  challengeResult?: PracticeChallengeSummary;
  status: PracticeSessionStatus;
  currentCandleIndex: number;
  reflection?: PracticeSessionReflection;
  archivedAt?: IsoDateString;
  archivedFromStatus?: Exclude<PracticeSessionStatus, "archived">;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  completedAt?: IsoDateString;
}

export type PracticeSessionSummary = PracticeSessionRecord;

export interface PracticePerformanceAssumptions {
  feeBps: number;
  spreadBps: number;
  slippageBps: number;
  safeMessage: string;
}

export interface PracticePerformanceSummary {
  startingBalance: number;
  endingBalance: number;
  netPnl: number;
  grossPnl: number;
  totalCosts: number;
  winRate: number;
  lossRate: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  averageR: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  assumptions: PracticePerformanceAssumptions;
  safeMessage: string;
}

export interface PracticeAnalyticsCurvePoint {
  index: number;
  date: IsoDateString;
  sessionId: string;
  orderId: string;
  equity: number;
  pnl: number;
  drawdown: number;
}

export interface PracticeDailyPnlSummary {
  date: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface PracticeSymbolBreakdownSummary {
  symbol: string;
  assetClass: PracticeAssetClass;
  sessions: number;
  trades: number;
  netPnl: number;
  winRate: number;
  averageR: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
}

export interface PracticeSessionAnalyticsSummary {
  sessionId: string;
  sessionName?: string;
  symbol: string;
  assetClass: PracticeAssetClass;
  timeframeMinutes: number;
  status: PracticeSessionStatus;
  playbookName?: string;
  challengeStatus?: PracticeChallengeStatus;
  startingBalance: number;
  endingBalance: number;
  netPnl: number;
  winRate: number;
  averageR: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  totalTrades: number;
  closedTrades: number;
  updatedAt: IsoDateString;
  completedAt?: IsoDateString;
}

export interface PracticeChallengeAnalyticsSummary {
  enabledSessions: number;
  notStarted: number;
  active: number;
  passed: number;
  failed: number;
}

export interface PracticeChallengeConfig {
  enabled: boolean;
  challengeName: string;
  startingBalance: number;
  profitTargetAmount?: number;
  profitTargetPercent?: number;
  maxDailyLossAmount?: number;
  maxDailyLossPercent?: number;
  maxTotalDrawdownAmount?: number;
  maxTotalDrawdownPercent?: number;
  maxOpenSimulatedTrades: number;
  maxTradesPerSession: number;
  maxTradesPerDay?: number;
  minimumTradingDays?: number;
  notes?: string;
}

export interface PracticeChallengeSummary {
  enabled: boolean;
  status: PracticeChallengeStatus;
  challengeName: string;
  startingBalance: number;
  currentEquity: number;
  netPnl: number;
  profitTargetAmount: number;
  profitTargetProgress: number;
  maxDailyLossAmount: number;
  dailyLossUsage: number;
  maxTotalDrawdownAmount: number;
  drawdownUsage: number;
  openTrades: number;
  maxOpenSimulatedTrades: number;
  tradesUsed: number;
  maxTradesPerSession: number;
  tradesToday: number;
  maxTradesPerDay?: number;
  tradingDays: number;
  minimumTradingDays?: number;
  breachCodes: string[];
  breachMessages: string[];
  safeMessage: string;
  evaluatedAt: IsoDateString;
}

export interface PracticePlaybookPerformanceSummary {
  playbookId: string;
  playbookName: string;
  market?: PracticeAssetClass;
  strategyType?: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  averageR: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  safeMessage: string;
}

export interface PracticeAssignmentSuggestedPlaybook {
  name: string;
  strategyType?: string;
  setupRules?: string;
  entryChecklist?: string[];
  invalidationRules?: string;
  riskNotes?: string;
}

export interface PracticeCohortRecord {
  cohortId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: PracticeCohortStatus;
  studentRefs: string[];
  archivedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  safeMessage: string;
}

export type PracticeCohortSummary = PracticeCohortRecord;

export interface PracticeInstructorFeedbackRubric {
  setupQuality: number;
  riskManagement: number;
  executionDiscipline: number;
  reviewQuality: number;
  overallScore: number;
}

export interface PracticeInstructorFeedbackRecord {
  feedbackId: string;
  workspaceId: string;
  studentId: string;
  assignmentId: string;
  sessionId: string;
  feedbackTargetRef: string;
  maskedStudentId: string;
  maskedSessionRef: string;
  reviewerId: string;
  reviewerDisplayLabel: string;
  status: PracticeInstructorFeedbackStatus;
  publicationStatus: PracticeInstructorFeedbackPublicationStatus;
  rubric: PracticeInstructorFeedbackRubric;
  feedbackNote: string;
  recommendedNextDrill?: string;
  resubmissionRequest?: PracticeAssignmentResubmissionRequest;
  reviewedAt?: IsoDateString;
  publishedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  safeMessage: string;
}

export type PracticeInstructorFeedbackSummary = Omit<PracticeInstructorFeedbackRecord, "workspaceId" | "studentId" | "sessionId" | "reviewerId">;

export interface PracticeAssignmentResubmissionRequest {
  status: PracticeAssignmentResubmissionStatus;
  reason: string;
  dueDate?: IsoDateString;
  rubricArea?: keyof PracticeInstructorFeedbackRubric;
  requestedAt?: IsoDateString;
  requestedByLabel?: string;
  previousAttemptMaskedSessionRef?: string;
}

export interface PracticeAssignmentRecord {
  assignmentId: string;
  workspaceId: string;
  title: string;
  description: string;
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: number;
  dateStart?: IsoDateString;
  dateEnd?: IsoDateString;
  randomStartEnabled?: boolean;
  startingBalance?: number;
  riskPct?: number;
  challenge?: PracticeChallengeConfig;
  suggestedPlaybook?: PracticeAssignmentSuggestedPlaybook;
  availabilityStartDate?: IsoDateString;
  dueDate?: IsoDateString;
  closeDate?: IsoDateString;
  targetCohortIds?: string[];
  status: PracticeAssignmentStatus;
  archivedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type PracticeAssignmentSummary = PracticeAssignmentRecord;

export interface PracticeSessionAssignmentSnapshot {
  assignmentId: string;
  title: string;
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: number;
  dueDate?: IsoDateString;
  availabilityStartDate?: IsoDateString;
  closeDate?: IsoDateString;
  targetCohortIds?: string[];
  startedAt: IsoDateString;
  attemptNumber?: number;
  previousAttemptMaskedSessionRef?: string;
  resubmissionSourceFeedbackId?: string;
  safeMessage: string;
}

export interface WorkspacePracticeAssignmentProgressSummary {
  assignedCount: number;
  startedCount: number;
  completedCount: number;
  overdueCount: number;
  reviewedCount: number;
  resubmissionRequestedCount: number;
  resubmissionCompletedCount: number;
  averageRubricScore: number;
  averagePnl: number;
  averageR: number;
  challengePassed: number;
  challengeFailed: number;
  challengeInProgress: number;
  maskedRecentCompletions: WorkspacePracticeRecentCompletedSessionInsight[];
}

export interface WorkspacePracticeAssignmentNotificationCounts {
  needsReview: number;
  overdue: number;
  resubmissionsRequested: number;
  feedbackDraftsNotPublished: number;
  safeMessage: string;
}

export interface WorkspacePracticeAssignmentFeedbackCompletionSummary {
  feedbackTargetRef: string;
  assignmentId: string;
  assignmentTitle: string;
  maskedStudentId: string;
  maskedSessionRef: string;
  sessionName?: string;
  symbol: string;
  assetClass: PracticeAssetClass;
  timeframeMinutes: number;
  completedAt?: IsoDateString;
  closedTrades: number;
  netPnl: number;
  winRate: number;
  averageR: number;
  challengeStatus?: PracticeChallengeStatus;
  queueStatus: PracticeAssignmentReviewQueueFilter;
  attemptNumber: number;
  previousAttemptMaskedSessionRef?: string;
  resubmissionStatus: PracticeAssignmentResubmissionStatus;
  feedback?: PracticeInstructorFeedbackSummary;
}

export interface WorkspacePracticeAssignmentSummary extends PracticeAssignmentSummary {
  progress: WorkspacePracticeAssignmentProgressSummary;
  targetCohorts: Array<Pick<PracticeCohortSummary, "cohortId" | "name" | "status" | "studentRefs">>;
}

export interface WorkspacePracticeAssignmentsResponse extends AdminSourceMeta {
  ok: true;
  assignments: WorkspacePracticeAssignmentSummary[];
  cohorts: PracticeCohortSummary[];
  notificationCounts: WorkspacePracticeAssignmentNotificationCounts;
  limit: number;
  safeMessage: string;
}

export interface WorkspacePracticeAssignmentMutationResponse extends AdminSourceMeta {
  ok: true;
  assignment: WorkspacePracticeAssignmentSummary;
}

export interface WorkspacePracticeCohortMutationResponse extends AdminSourceMeta {
  ok: true;
  cohort: PracticeCohortSummary;
  safeMessage: string;
}

export interface WorkspacePracticeAssignmentFeedbackResponse extends AdminSourceMeta {
  ok: true;
  completions: WorkspacePracticeAssignmentFeedbackCompletionSummary[];
  filters: {
    queue: PracticeAssignmentReviewQueueFilter;
    assignmentId?: string;
  };
  limit: number;
  safeMessage: string;
}

export interface WorkspacePracticeAssignmentFeedbackMutationResponse extends AdminSourceMeta {
  ok: true;
  completion: WorkspacePracticeAssignmentFeedbackCompletionSummary;
  feedback: PracticeInstructorFeedbackSummary;
  safeMessage: string;
}

export interface StudentPracticeAssignmentState {
  assignmentId: string;
  status: PracticeAssignmentTaskStatus;
  availabilityStatus: "not_available" | "available" | "overdue" | "closed";
  activeSessionId?: string;
  completedSessionId?: string;
  feedback?: PracticeInstructorFeedbackSummary;
  resubmissionRequest?: PracticeAssignmentResubmissionRequest;
  latestAttemptNumber: number;
  dueDate?: IsoDateString;
  availabilityStartDate?: IsoDateString;
  closeDate?: IsoDateString;
  targetCohortIds?: string[];
  safeMessage: string;
}

export interface StudentPracticeAssignmentsResponse extends AdminSourceMeta {
  ok: true;
  assignments: PracticeAssignmentSummary[];
  states: Record<string, StudentPracticeAssignmentState>;
  safeMessage: string;
}

export interface StudentPracticeNotificationSummary {
  notificationId: string;
  kind: PracticeNotificationKind;
  urgency: PracticeNotificationUrgency;
  title: string;
  body: string;
  assignmentId: string;
  assignmentTitle: string;
  action: PracticeNotificationAction;
  actionHref?: string;
  dueDate?: IsoDateString;
  eventAt?: IsoDateString;
  dismissed: boolean;
  read: boolean;
  safeMessage: string;
}

export interface StudentPracticeNotificationsResponse extends AdminSourceMeta {
  ok: true;
  notifications: StudentPracticeNotificationSummary[];
  unreadCount: number;
  dismissedCount: number;
  limit: number;
  safeMessage: string;
}

export interface StudentPracticeNotificationMutationResponse extends AdminSourceMeta {
  ok: true;
  notifications: StudentPracticeNotificationSummary[];
  unreadCount: number;
  safeMessage: string;
}

export interface StudentPracticeAssignmentStartResponse extends AdminSourceMeta {
  ok: true;
  assignment: PracticeAssignmentSummary;
  session: PracticeSessionSummary;
  safeMessage: string;
}

export interface PracticeSessionReflection {
  whatWentWell?: string;
  whatWentWrong?: string;
  improveNextTime?: string;
  confidenceScore?: number;
  updatedAt?: IsoDateString;
}

export interface PracticeAnnotationRecord {
  annotationId: string;
  drawingId?: string;
  workspaceId: string;
  studentId: string;
  sessionId: string;
  eventId?: string;
  orderId?: string;
  candleIndex?: number;
  secondCandleIndex?: number;
  priceLevel?: number;
  secondPriceLevel?: number;
  coordinateVersion?: PracticeDrawingCoordinateVersion;
  chartPoints?: PracticeDrawingChartPoint[];
  kind: PracticeAnnotationKind;
  label?: string;
  text: string;
  colorToken?: PracticeDrawingColorToken;
  appearanceVersion?: PracticeDrawingAppearanceVersion;
  isMainLesson: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type PracticeAnnotationSummary = PracticeAnnotationRecord;

export interface PracticeBookmarkRecord {
  bookmarkId: string;
  workspaceId: string;
  studentId: string;
  sessionId: string;
  candleIndex: number;
  candleTime?: IsoDateString;
  priceLevel?: number;
  label?: string;
  note?: string;
  orderId?: string;
  drawingId?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type PracticeBookmarkSummary = PracticeBookmarkRecord;

export interface PracticeEventMarkerRecord {
  eventId: string;
  workspaceId?: string;
  scope: PracticeEventMarkerScope;
  assetTags: string[];
  symbolTags: string[];
  title: string;
  category: PracticeEventMarkerCategory;
  impact: PracticeEventMarkerImpact;
  eventTime: IsoDateString;
  safeSummary: string;
  sourceLabel?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type PracticeEventMarkerSummary = PracticeEventMarkerRecord;

export interface PracticeCompletedSessionReview {
  finalBalance: number;
  netPnl: number;
  winRate: number;
  averageR: number;
  profitFactor: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  bestPlaybook?: PracticePlaybookPerformanceSummary;
  worstPlaybook?: PracticePlaybookPerformanceSummary;
  recentClosedOrders: PracticeOrderSummary[];
  annotations: PracticeAnnotationSummary[];
  eventMarkers: PracticeEventMarkerSummary[];
  mainLesson?: PracticeAnnotationSummary;
  challengeStatus?: PracticeChallengeSummary;
  reflection?: PracticeSessionReflection;
  safeMessage: string;
}

export interface PracticeOrderRecord {
  orderId: string;
  sessionId: string;
  workspaceId: string;
  studentId: string;
  orderType: PracticeOrderType;
  direction: PracticeOrderDirection;
  status: PracticeOrderStatus;
  requestedPrice: number;
  filledPrice?: number;
  size?: number;
  remainingSize?: number;
  closedSize?: number;
  notional?: number;
  instrument?: PracticeInstrumentSpecSummary;
  stopDistance?: number;
  stopDistanceInPips?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskAmount?: number;
  playbookId?: string;
  playbookName?: string;
  trailingStopDistance?: number;
  autoBreakevenTrigger?: number;
  openedAtCandleTime?: IsoDateString;
  closedAtCandleTime?: IsoDateString;
  closeReason?: PracticeOrderCloseReason;
  pnl?: number;
  fees?: number;
  rMultiple?: number;
  mfeR?: number;
  maeR?: number;
  tags: string[];
  checklistNotes?: string;
  notes?: string;
  screenshotUrls: string[];
  evaluatedThroughCandleIndex?: number;
  safeMessage?: string;
  closeEvents?: PracticeOrderCloseEvent[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type PracticeOrderSummary = PracticeOrderRecord;

export interface StudentPracticeOverviewResponse extends AdminSourceMeta {
  ok: true;
  playbooks: PracticePlaybookSummary[];
  sessions: PracticeSessionSummary[];
  sessionPerformance: Record<string, PracticePerformanceSummary>;
  sessionChallengeStatus: Record<string, PracticeChallengeSummary>;
  completedSessionReviews: Record<string, PracticeCompletedSessionReview>;
  playbookPerformance: PracticePlaybookPerformanceSummary[];
  bestPlaybook?: PracticePlaybookPerformanceSummary;
  worstPlaybook?: PracticePlaybookPerformanceSummary;
  orders: PracticeOrderSummary[];
  instructorFeedback: PracticeInstructorFeedbackSummary[];
  limits: {
    visibleLimit: number;
    maxCandlesPerRequest: number;
    maxRangeDays?: number;
    supportedTimeframes?: number[];
    supportedCryptoSymbols?: string[];
    supportedForexCfdSymbols?: string[];
    assetCatalogue?: PracticeAssetCatalogueItem[];
  };
}

export interface StudentPracticeAnalyticsResponse extends AdminSourceMeta {
  ok: true;
  generatedAt: IsoDateString;
  hasClosedTrades: boolean;
  sessionLimit: number;
  orderLimit: number;
  cohortCoverage: {
    sessionCount: number;
    scannedOrderCount: number;
    eligibleOrderCount: number;
    eligibleClosedOrderCount: number;
    excludedOrderCount: number;
    safeMessage: string;
  };
  sessionSummaries: PracticeSessionAnalyticsSummary[];
  equityCurve: PracticeAnalyticsCurvePoint[];
  drawdownCurve: PracticeAnalyticsCurvePoint[];
  dailyPnl: PracticeDailyPnlSummary[];
  symbolBreakdown: PracticeSymbolBreakdownSummary[];
  playbookBreakdown: PracticePlaybookPerformanceSummary[];
  bestSessions: PracticeSessionAnalyticsSummary[];
  worstSessions: PracticeSessionAnalyticsSummary[];
  recentCompletedSessions: PracticeSessionAnalyticsSummary[];
  challengeSummary: PracticeChallengeAnalyticsSummary;
  safeMessage: string;
}

export interface PracticePlaybookMutationResponse extends AdminSourceMeta {
  ok: true;
  playbook: PracticePlaybookSummary;
}

export interface PracticeSessionMutationResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
}

export interface PracticeSessionDeleteResponse extends AdminSourceMeta {
  ok: true;
  deleted: true;
  safeMessage: string;
}

export interface PracticeSessionFinishMutationResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  performance: PracticePerformanceSummary;
  challengeStatus?: PracticeChallengeSummary;
  completedReview: PracticeCompletedSessionReview;
}

export interface PracticeAnnotationMutationResponse extends AdminSourceMeta {
  ok: true;
  annotation: PracticeAnnotationSummary;
  annotations: PracticeAnnotationSummary[];
  completedReview?: PracticeCompletedSessionReview;
}

export interface PracticeBookmarkMutationResponse extends AdminSourceMeta {
  ok: true;
  bookmark: PracticeBookmarkSummary;
  bookmarks: PracticeBookmarkSummary[];
}

export interface PracticeBookmarkDeleteResponse extends AdminSourceMeta {
  ok: true;
  deletedBookmarkId: string;
  bookmarks: PracticeBookmarkSummary[];
}

export interface PracticeAnnotationDeleteResponse extends AdminSourceMeta {
  ok: true;
  deletedAnnotationId: string;
  annotations: PracticeAnnotationSummary[];
  completedReview?: PracticeCompletedSessionReview;
}

export interface PracticeDrawingBulkDeleteResponse extends AdminSourceMeta {
  ok: true;
  deletedDrawingIds: string[];
  deletedDrawingCount: number;
  annotations: PracticeAnnotationSummary[];
  completedReview?: PracticeCompletedSessionReview;
}

export interface PracticeSessionReflectionMutationResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  reflection: PracticeSessionReflection;
  completedReview: PracticeCompletedSessionReview;
}

export interface PracticeSessionAssumptionsMutationResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  performance: PracticePerformanceSummary;
}

export interface PracticeOrderMutationResponse extends AdminSourceMeta {
  ok: true;
  order: PracticeOrderSummary;
  challengeStatus?: PracticeChallengeSummary;
}

export interface PracticeSessionOrdersResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  performance: PracticePerformanceSummary;
  challengeStatus?: PracticeChallengeSummary;
  visibleLimit: number;
}

export interface PracticeOrderEvaluationResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  performance: PracticePerformanceSummary;
  challengeStatus?: PracticeChallengeSummary;
  playbookPerformance: PracticePlaybookPerformanceSummary[];
  evaluatedThroughCandleIndex: number;
  evaluatedOrderCount: number;
  closedOrderCount: number;
}

export interface HistoricalCandlesResponse extends AdminSourceMeta {
  ok: true;
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: number;
  rangeStart: IsoDateString;
  rangeEnd: IsoDateString;
  candleCount: number;
  candles: StudentPracticeCandle[];
}

export interface PracticeSessionDetailResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  orders: PracticeOrderSummary[];
  performance: PracticePerformanceSummary;
  challengeStatus?: PracticeChallengeSummary;
  playbooks: PracticePlaybookSummary[];
  playbookPerformance: PracticePlaybookPerformanceSummary[];
  annotations: PracticeAnnotationSummary[];
  bookmarks: PracticeBookmarkSummary[];
  eventMarkers: PracticeEventMarkerSummary[];
  completedReview?: PracticeCompletedSessionReview;
  playbook?: PracticePlaybookSummary;
  instructorFeedback?: PracticeInstructorFeedbackSummary;
}

export interface PracticeSessionReportResponse extends AdminSourceMeta {
  ok: true;
  generatedAt: IsoDateString;
  session: PracticeSessionSummary;
  performance: PracticePerformanceSummary;
  challengeStatus?: PracticeChallengeSummary;
  playbook?: PracticePlaybookSummary;
  playbookPerformance: PracticePlaybookPerformanceSummary[];
  closedOrders: PracticeOrderSummary[];
  bestTrade?: PracticeOrderSummary;
  worstTrade?: PracticeOrderSummary;
  annotations: PracticeAnnotationSummary[];
  drawings: PracticeAnnotationSummary[];
  eventLinkedNotes: PracticeAnnotationSummary[];
  mainLesson?: PracticeAnnotationSummary;
  reflection?: PracticeSessionReflection;
  assumptions: PracticePerformanceAssumptions;
  completedReview?: PracticeCompletedSessionReview;
  instructorFeedback?: PracticeInstructorFeedbackSummary;
  reportLimit: {
    orders: number;
    annotations: number;
  };
  safeMessage: string;
}

export type WorkspacePracticeInsightsStatusFilter = "all" | PracticeSessionStatus;

export interface WorkspacePracticeInsightsFilters {
  status: WorkspacePracticeInsightsStatusFilter;
  symbol?: string;
  timeframeMinutes?: number;
  dateStart?: IsoDateString;
  dateEnd?: IsoDateString;
}

export interface WorkspacePracticeSymbolInsight {
  symbol: string;
  assetClass: PracticeAssetClass;
  sessions: number;
  closedTrades: number;
  netPnl: number;
}

export interface WorkspacePracticePlaybookInsight {
  playbookName: string;
  uses: number;
  closedTrades: number;
  netPnl: number;
}

export interface WorkspacePracticeRecentCompletedSessionInsight {
  maskedSessionRef: string;
  maskedStudentId: string;
  symbol: string;
  assetClass: PracticeAssetClass;
  timeframeMinutes: number;
  completedAt?: IsoDateString;
  closedTrades: number;
  netPnl: number;
  winRate: number;
  averageR: number;
  challengeStatus?: PracticeChallengeStatus;
}

export interface WorkspacePracticeInsightsResponse extends AdminSourceMeta {
  ok: true;
  generatedAt: IsoDateString;
  filters: WorkspacePracticeInsightsFilters;
  bounded: boolean;
  limits: {
    sessions: number;
    orders: number;
    playbooks: number;
    recentCompletedSessions: number;
  };
  summary: {
    totalActivePracticeStudents: number;
    totalPracticeSessions: number;
    completedPracticeSessions: number;
    archivedPracticeSessions: number;
    totalSimulatedClosedTrades: number;
    aggregatePracticePnl: number;
    averageWinRate: number;
    averageR: number;
    challengePassed: number;
    challengeFailed: number;
    challengeInProgress: number;
  };
  mostPracticedSymbols: WorkspacePracticeSymbolInsight[];
  mostUsedPlaybooks: WorkspacePracticePlaybookInsight[];
  recentCompletedSessions: WorkspacePracticeRecentCompletedSessionInsight[];
  safeMessage: string;
}

export interface RevealedPracticeCandlesResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  assetClass: PracticeAssetClass;
  symbol: string;
  timeframeMinutes: number;
  rangeStart: IsoDateString;
  rangeEnd: IsoDateString;
  currentCandleIndex: number;
  availableCandleCount: number;
  revealedCandleCount: number;
  candles: StudentPracticeCandle[];
  eventMarkers: PracticeEventMarkerSummary[];
}

export interface PracticeReplayIndexMutationResponse extends AdminSourceMeta {
  ok: true;
  session: PracticeSessionSummary;
  currentCandleIndex: number;
  availableCandleCount: number;
}

export interface PracticeExportResponse extends AdminSourceMeta {
  ok: true;
  dataset: PracticeExportDataset;
  format: "csv" | "json";
  filename: string;
  mimeType: "text/csv" | "application/json";
  rowCount: number;
  exportLimit: number;
  csv?: string;
  backup?: {
    exportedAt: IsoDateString;
    sessions: Array<Record<string, string | number | boolean | null>>;
    orders: Array<Record<string, string | number | boolean | null>>;
    closedTrades: Array<Record<string, string | number | boolean | null>>;
    playbooks: Array<Record<string, string | number | boolean | null>>;
    annotations: Array<Record<string, string | number | boolean | null>>;
    reflections: Array<Record<string, string | number | boolean | null>>;
  };
  safeMessage: string;
}

export interface PracticePlaybookImportResponse extends AdminSourceMeta {
  ok: true;
  importedCount: number;
  skippedCount: number;
  rejectedCount: number;
  playbooks: PracticePlaybookSummary[];
  errors: string[];
  safeMessage: string;
}
