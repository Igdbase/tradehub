import type { NormalizedCryptoHistoryRecord } from "@/lib/journal/crypto-journal-provider-adapters";

export interface JournalCryptoExistingLedgerRow {
  id: string;
  providerExecutionIdentity?: string;
  providerExecutionIdentities?: string[];
  journalConnectionRef?: string;
  importGeneration?: string;
  data?: Record<string, unknown>;
}

export type JournalCryptoSnapshotMode = "complete_replacement" | "incremental_delta";

export interface JournalCryptoSnapshotPlan {
  writeImports: NormalizedCryptoHistoryRecord[];
  retainedActiveRows: JournalCryptoExistingLedgerRow[];
  deleteIds: string[];
  dedupeSkippedCount: number;
  activateGeneration: boolean;
  nextLedgerIds: Set<string>;
}

export function chunkJournalCryptoFirestoreWrites<T>(writes: T[], chunkSize = 450) {
  const safeChunkSize = Math.max(1, Math.min(Math.floor(chunkSize), 450));
  const chunks: T[][] = [];
  for (let index = 0; index < writes.length; index += safeChunkSize) {
    chunks.push(writes.slice(index, index + safeChunkSize));
  }
  return chunks;
}

function normalizeImportedExecutionLifecycle(record: NormalizedCryptoHistoryRecord): NormalizedCryptoHistoryRecord {
  if (record.side !== "sell" || record.journalLifecycle === "closed" || record.journalLifecycle === "partial") {
    return record;
  }

  return {
    ...record,
    journalLifecycle: "execution_only",
    performanceEligible: false,
    ineligibilityReason: record.ineligibilityReason || "unknown_starting_inventory"
  };
}

export function planJournalCryptoLedgerSnapshot({
  snapshotComplete,
  snapshotMode,
  imported,
  existingRows,
  connectionRef,
  activeImportGeneration
}: {
  snapshotComplete: boolean;
  snapshotMode: JournalCryptoSnapshotMode;
  imported: NormalizedCryptoHistoryRecord[];
  existingRows: JournalCryptoExistingLedgerRow[];
  connectionRef: string;
  activeImportGeneration?: string;
}): JournalCryptoSnapshotPlan {
  if (!snapshotComplete) {
    return {
      writeImports: [],
      retainedActiveRows: [],
      deleteIds: [],
      dedupeSkippedCount: 0,
      activateGeneration: false,
      nextLedgerIds: new Set<string>()
    };
  }

  const writeImports: NormalizedCryptoHistoryRecord[] = [];
  let dedupeSkippedCount = 0;
  const sameConnectionImportKeys = new Set(
    existingRows
      .filter((row) => row.journalConnectionRef === connectionRef && row.data)
      .map((row) => row.id)
      .filter(Boolean)
  );
  const sameConnectionProviderIdentities = new Set<string>();
  for (const row of existingRows) {
    if (row.journalConnectionRef !== connectionRef || !row.data) continue;
    for (const identity of [
      row.providerExecutionIdentity,
      ...(Array.isArray(row.providerExecutionIdentities) ? row.providerExecutionIdentities : [])
    ]) {
      if (identity) sameConnectionProviderIdentities.add(identity);
    }
  }

  for (const normalized of imported) {
    const normalizedIdentities = new Set([
      normalized.providerExecutionIdentity,
      ...(Array.isArray(normalized.providerExecutionIdentities) ? normalized.providerExecutionIdentities : [])
    ].filter(Boolean));
    if (sameConnectionImportKeys.has(normalized.importKey) ||
      [...normalizedIdentities].some((identity) => sameConnectionProviderIdentities.has(identity))) {
      continue;
    }
    const duplicateIdentities = new Set<string>();
    for (const row of existingRows) {
      if (row.id === normalized.importKey) continue;
      if (row.journalConnectionRef === connectionRef) continue;
      for (const identity of [
        row.providerExecutionIdentity,
        ...(Array.isArray(row.providerExecutionIdentities) ? row.providerExecutionIdentities : [])
      ]) {
        if (identity && normalizedIdentities.has(identity)) duplicateIdentities.add(identity);
      }
    }

    if (duplicateIdentities.size > 0) {
      const residualLegs = (Array.isArray(normalized.executionLegs) ? normalized.executionLegs : [])
        .filter((leg) => leg.providerExecutionIdentity && !duplicateIdentities.has(leg.providerExecutionIdentity));
      if (residualLegs.length === 0) {
        dedupeSkippedCount += 1;
        continue;
      }
      for (const leg of residualLegs) {
        writeImports.push({
          ...normalized,
          importKey: `${normalized.importKey}_${leg.providerExecutionIdentity.slice(-16)}`,
          executionFingerprint: `${normalized.executionFingerprint}_${leg.providerExecutionIdentity.slice(-16)}`,
          providerExecutionIdentity: leg.providerExecutionIdentity,
          providerExecutionIdentities: [leg.providerExecutionIdentity],
          executionLegs: [leg],
          side: leg.side,
          journalLifecycle: leg.side === "sell" ? "execution_only" : "open",
          openedAt: leg.executedAt,
          closedAt: undefined,
          entryPrice: leg.price,
          exitPrice: undefined,
          quantity: leg.quantity,
          fees: leg.fees,
          realizedPnl: undefined,
          performanceEligible: false,
          ineligibilityReason: leg.side === "sell" ? "unknown_starting_inventory" : "open_position"
        });
      }
      dedupeSkippedCount += 1;
      continue;
    }

    writeImports.push(normalizeImportedExecutionLifecycle(normalized));
  }

  const nextLedgerIds = new Set(writeImports.map((record) => record.importKey));
  const retainedActiveRows = snapshotMode === "incremental_delta"
    ? existingRows.filter((row) =>
      row.journalConnectionRef === connectionRef &&
      row.importGeneration === activeImportGeneration &&
      !nextLedgerIds.has(row.id) &&
      row.data
    )
    : [];
  const deleteIds: string[] = [];

  return {
    writeImports,
    retainedActiveRows,
    deleteIds,
    dedupeSkippedCount,
    activateGeneration: snapshotMode === "complete_replacement" || writeImports.length > 0,
    nextLedgerIds
  };
}
