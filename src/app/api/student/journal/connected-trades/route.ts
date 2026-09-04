import { apiError, apiJson } from "@/lib/admin/admin-api";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentConnectedJournal, type ConnectedJournalFilters } from "@/lib/journal/connected-journal-repository";
import type {
  ConnectedJournalMarket,
  ConnectedJournalTradeSource,
  ConnectedJournalTradeStatus
} from "@/types/journal-workspace";

function enumValue<T extends string>(value: string | null, allowed: readonly T[], label: string) {
  if (!value) return undefined;
  if (!allowed.includes(value as T)) {
    throw new AdminApiError(400, "journal_filter_invalid", `Choose a supported ${label} filter.`);
  }
  return value as T;
}

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.replace(/[^A-Z0-9._-]/gi, "").toUpperCase().slice(0, 24);
    const account = searchParams.get("account")?.replace(/\s+/g, " ").trim().slice(0, 64);
    const filters: ConnectedJournalFilters = {
      account: account || undefined,
      market: enumValue<ConnectedJournalMarket>(searchParams.get("market"), ["crypto", "forex", "cfd"], "market"),
      symbol: symbol || undefined,
      source: enumValue<ConnectedJournalTradeSource>(searchParams.get("source"), ["copied", "provider_manual"], "source"),
      status: enumValue<ConnectedJournalTradeStatus>(searchParams.get("status"), ["open", "partial", "closed", "execution_only"], "status"),
      dateRange: enumValue(searchParams.get("dateRange"), ["all", "30d", "90d", "year"] as const, "date range") ?? "all"
    };
    return apiJson(await getStudentConnectedJournal(actor, filters));
  } catch (error) {
    return apiError(error);
  }
}
