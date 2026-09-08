import "server-only";

import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { WorkspaceSignalMarket, WorkspaceSignalRecord } from "@/types/workspace-dashboard";

export function hasModeratedTelegramSignalProof(signal: WorkspaceSignalRecord) {
  const proof = signal.externalSignalProof;

  return (
    signal.source === "telegram_channel" &&
    proof?.sourceType === "telegram_channel" &&
    proof.proofStatus === "moderated_published" &&
    Boolean(proof.sourceLabel) &&
    Boolean(proof.sourceSafeRef) &&
    Boolean(proof.candidateSafeRef) &&
    Boolean(proof.moderationVersion) &&
    Boolean(proof.approvedAt) &&
    Boolean(proof.publishedAt)
  );
}

export function isRoutableTradeHubSignalSource(signal: WorkspaceSignalRecord) {
  return signal.source === "in_app" || hasModeratedTelegramSignalProof(signal);
}

export function isPublishedRoutableTradeHubSignalForMarket(
  signal: WorkspaceSignalRecord,
  market: WorkspaceSignalMarket
) {
  return signal.status === "published" && signal.market === market && isRoutableTradeHubSignalSource(signal);
}

export async function isSignalSourceStillAllowedForExecution(
  signal: WorkspaceSignalRecord,
  workspaceId: string
) {
  if (signal.source === "in_app") {
    return true;
  }

  if (!hasModeratedTelegramSignalProof(signal)) {
    return false;
  }

  const { db } = getFirebaseAdminClients();
  const attestationRef = signal.externalSignalProof?.bridgeAttestationRef;

  if (!attestationRef) {
    return false;
  }

  const attestationSnapshot = await db.doc(`external_signal_bridge_attestations/${attestationRef}`).get();

  if (!attestationSnapshot.exists) {
    return false;
  }

  const attestation = attestationSnapshot.data() ?? {};
  const sourceRecordId = typeof attestation.sourceRecordId === "string"
    ? attestation.sourceRecordId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96)
    : "";
  const sourceRecordVersion = typeof attestation.sourceRecordVersion === "string"
    ? attestation.sourceRecordVersion.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96)
    : "";

  if (
    attestation.status !== "published" ||
    attestation.signalId !== signal.signalId ||
    attestation.workspaceId !== workspaceId ||
    !sourceRecordId ||
    !sourceRecordVersion ||
    attestation.sourceSafeRef !== signal.externalSignalProof?.sourceSafeRef ||
    attestation.candidateSafeRef !== signal.externalSignalProof?.candidateSafeRef ||
    attestation.moderationVersion !== signal.externalSignalProof?.moderationVersion ||
    attestation.market !== signal.market ||
    attestation.symbol !== signal.pair ||
    attestation.direction !== signal.direction
  ) {
    return false;
  }

  const sourceSnapshot = await db.doc(`external_signal_sources/${sourceRecordId}`).get();
  const source = sourceSnapshot.data() ?? {};

  const sourceEnabled = (
    sourceSnapshot.exists &&
    source.status === "enabled" &&
    source.sourceType === "telegram_channel" &&
    source.workspaceId === workspaceId &&
    source.sourceId === signal.externalSignalProof?.sourceSafeRef &&
    source.sourceRecordVersion === sourceRecordVersion
  );

  if (!sourceEnabled) {
    return false;
  }

  const candidateId = typeof attestation.candidateId === "string" ? attestation.candidateId : "";

  if (!/^extsig_[a-f0-9]{12,32}$/i.test(candidateId)) {
    return false;
  }

  const candidateSnapshot = await db.doc(`external_signal_candidates/${candidateId}`).get();
  const candidate = candidateSnapshot.data() ?? {};

  return (
    candidateSnapshot.exists &&
    candidate.workspaceId === workspaceId &&
    candidate.sourceType === "telegram_channel" &&
    candidate.status === "approved_for_workspace_preview" &&
    candidate.reviewStatus === "approved_for_workspace_preview" &&
    candidate.publishedSignalId === signal.signalId &&
    candidate.immutableModerationProofRef === attestation.immutableModerationProofRef &&
    candidate.sourceRecordId === sourceRecordId &&
    candidate.sourceRecordVersion === sourceRecordVersion
  );
}

export function studentVisibleSignalSourceLabel(signal: WorkspaceSignalRecord) {
  if (hasModeratedTelegramSignalProof(signal)) {
    return signal.externalSignalProof?.sourceLabel || "TradeHub source";
  }

  return "Signal";
}
