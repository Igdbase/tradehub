import { apiError } from "@/lib/admin/admin-api";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentManualJournalExport } from "@/lib/journal/manual-trades-repository";

function parseExportKind(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("type") ?? "trades";

  if (kind === "trades" || kind === "analytics" || kind === "backup") {
    return kind;
  }

  throw new AdminApiError(400, "manual_trade_export_type_invalid", "Choose trades, analytics, or backup export.");
}

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const exportPayload = await getStudentManualJournalExport(actor, parseExportKind(request));

    return new Response(exportPayload.body, {
      status: 200,
      headers: {
        "Content-Type": exportPayload.contentType,
        "Content-Disposition": `attachment; filename="${exportPayload.filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
