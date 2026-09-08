import type { IsoDateString } from "@/types/workspace";
import type { WorkspaceSignalDirection, WorkspaceSignalMarket } from "@/types/workspace-dashboard";

export type ExternalSignalSourceType =
  | "manual_admin_seed"
  | "telegram_channel"
  | "webhook_source"
  | "master_trader_feed";

export type ExternalSignalParserMode =
  | "manual_mock"
  | "telegram_like_mock"
  | "disabled";

export type ExternalSignalIngestionProvider = "disabled" | "contract_only";

export type ExternalSignalSourceStatus = "enabled" | "disabled";

export type ExternalSignalCandidateStatus =
  | "received"
  | "parsed"
  | "rejected"
  | "quarantined"
  | "duplicate"
  | "needs_review"
  | "approved_for_workspace_preview";

export type ExternalSignalAssetClass = WorkspaceSignalMarket | "cfd" | "other";

export type ExternalSignalReviewStatus =
  | "unreviewed"
  | "needs_review"
  | "rejected"
  | "quarantined"
  | "approved_for_workspace_preview";

export type ExternalSignalReviewAction =
  | "mark_needs_review"
  | "reject"
  | "quarantine"
  | "approve_for_workspace_preview";

export type ExternalSignalRiskFlag =
  | "unsupported_symbol"
  | "unsupported_asset_class"
  | "missing_or_invalid_entry"
  | "missing_stop_loss"
  | "missing_take_profit"
  | "too_many_take_profits"
  | "duplicate_fingerprint"
  | "suspicious_text_pattern"
  | "workspace_scope_mismatch";

export interface ExternalSignalRiskLimits {
  maxTakeProfitCount: number;
  requiresStopLoss: boolean;
  maxEntryRangePercent: number;
  maxRiskLabel?: "low" | "medium" | "high";
}

export interface ExternalSignalSourceAllowlistRecord {
  sourceId: string;
  sourceType: ExternalSignalSourceType;
  workspaceId?: string;
  status: ExternalSignalSourceStatus;
  parserMode: ExternalSignalParserMode;
  allowedSymbols: string[];
  allowedAssetClasses: ExternalSignalAssetClass[];
  riskLimits: ExternalSignalRiskLimits;
  maskedSourceRef: string;
  expectedSourceIdentity?: string;
  safeLabel: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ExternalSignalNormalizedCandidate {
  symbol: string;
  assetClass: ExternalSignalAssetClass;
  side: WorkspaceSignalDirection;
  entryRange: {
    min: string;
    max?: string;
  };
  stopLoss?: string;
  takeProfits: string[];
  confidence: "low" | "medium" | "high" | "unknown";
}

export interface ExternalSignalCandidateRecord {
  candidateId: string;
  workspaceId?: string;
  status: ExternalSignalCandidateStatus;
  sourceType: ExternalSignalSourceType;
  parserMode: ExternalSignalParserMode;
  parserVersion: string;
  maskedSourceRef: string;
  sourceSafeRef?: string;
  deliverySafeRef?: string;
  immutableModerationProofRef?: string;
  publishedSignalRef?: string;
  fingerprint: string;
  normalized?: ExternalSignalNormalizedCandidate;
  parseWarnings: string[];
  riskFlags: ExternalSignalRiskFlag[];
  safeReason: string;
  reviewStatus: ExternalSignalReviewStatus;
  reviewReason?: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: IsoDateString;
  promotedAt?: IsoDateString;
  receivedAt: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ExternalSignalIngestionReadiness {
  enabled: boolean;
  dryRun: boolean;
  provider: ExternalSignalIngestionProvider;
  providerLabel: string;
  externalFetchAvailable: boolean;
  webhookIngestionAvailable: boolean;
  failClosedReason: string;
  safeMessage: string;
}

export interface ExternalSignalIngestionOverviewResponse {
  ok: true;
  readiness: ExternalSignalIngestionReadiness;
  summary: {
    sourceCount: number;
    enabledSourceCount: number;
    candidateCount: number;
    receivedCount: number;
    parsedCount: number;
    rejectedCount: number;
    quarantinedCount: number;
    duplicateCount: number;
    needsReviewCount: number;
    workspacePreviewCount: number;
    sampledCandidateCount: number;
    reviewedCount: number;
    riskFlaggedCount: number;
  };
  latestSources: ExternalSignalSourceAllowlistRecord[];
  latestCandidates: ExternalSignalCandidateRecord[];
  warnings: string[];
}

export interface WorkspaceExternalSignalPreviewRecord {
  previewId: string;
  symbol: string;
  assetClass: ExternalSignalAssetClass;
  side: WorkspaceSignalDirection;
  entryRange: {
    min: string;
    max?: string;
  };
  stopLoss?: string;
  takeProfits: string[];
  confidence: ExternalSignalNormalizedCandidate["confidence"];
  sourceType: ExternalSignalSourceType;
  sourceLabel: string;
  maskedSourceRef: string;
  status: "approved_for_workspace_preview";
  reviewStatus: "approved_for_workspace_preview";
  safeReason: string;
  parseWarnings: string[];
  riskFlags: ExternalSignalRiskFlag[];
  receivedAt: IsoDateString;
  reviewedAt?: IsoDateString;
  publishable: boolean;
  publishedSignalRef?: string;
  updatedAt: IsoDateString;
}

export interface WorkspaceExternalSignalPreviewResponse {
  ok: true;
  workspaceId: string;
  summary: {
    previewCount: number;
    sampledCount: number;
    riskFlaggedCount: number;
    symbolCount: number;
    sourceCount: number;
  };
  previews: WorkspaceExternalSignalPreviewRecord[];
  warnings: string[];
}

export interface ExternalSignalManualMockParseInput {
  sourceId: string;
  workspaceId?: string;
  symbol: string;
  assetClass: ExternalSignalAssetClass;
  side: WorkspaceSignalDirection;
  entryMin: string;
  entryMax?: string;
  stopLoss?: string;
  takeProfits?: string[];
  confidence?: ExternalSignalNormalizedCandidate["confidence"];
  sourceRef?: string;
  safeTextHint?: string;
}

export interface ExternalSignalCandidateCreateResponse {
  ok: true;
  candidate: ExternalSignalCandidateRecord;
}

export interface ExternalSignalCandidateReviewPayload {
  action: ExternalSignalReviewAction;
  reviewReason?: string;
  adminNote?: string;
}

export interface ExternalSignalCandidateReviewResponse {
  ok: true;
  candidate: ExternalSignalCandidateRecord;
}

export interface ExternalSignalSourceAllowlistUpsertInput {
  action?: "upsert" | "disable";
  sourceId?: string;
  sourceRef?: string;
  telegramChatIdentity?: string;
  sourceType?: ExternalSignalSourceType;
  workspaceId?: string;
  status?: ExternalSignalSourceStatus;
  parserMode?: ExternalSignalParserMode;
  allowedSymbols?: string[];
  allowedAssetClasses?: ExternalSignalAssetClass[];
  riskLimits?: Partial<ExternalSignalRiskLimits>;
  safeLabel?: string;
}

export interface ExternalSignalSourceAllowlistMutationResponse {
  ok: true;
  source: ExternalSignalSourceAllowlistRecord;
}

export interface TelegramSignalWebhookReceiptResponse {
  ok: true;
  accepted: boolean;
  status:
    | "received"
    | "parsed"
    | "quarantined"
    | "rejected"
    | "duplicate"
    | "needs_review"
    | "ignored";
  safeReason: string;
  candidateRef?: string;
}

export interface WorkspaceExternalSignalPromotionResponse {
  ok: true;
  promoted: boolean;
  dispatchStatus?: "pending" | "completed" | "completed_with_failures" | "retry_scheduled" | "failed";
  signalRef: string;
  sourceLabel: string;
  safeMessage: string;
}
