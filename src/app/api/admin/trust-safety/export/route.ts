import { apiError, getAdminRepositoryForRequest } from "@/lib/admin/admin-api";
import { buildCsvDocument } from "@/lib/export/csv";

const headers = [
  "record_type",
  "workspace_id",
  "title_or_type",
  "status_or_severity",
  "detail_or_resolution",
  "raised_by",
  "related_id",
  "created_at",
  "resolved_at"
] as const;

export async function GET(request: Request) {
  try {
    const { repository } = await getAdminRepositoryForRequest(request);
    const overview = await repository.getOverview();
    const rows = [
      ...overview.disputes.map((dispute) => ({
        record_type: "dispute",
        workspace_id: dispute.workspaceId,
        title_or_type: dispute.type,
        status_or_severity: dispute.status,
        detail_or_resolution: dispute.resolution ?? "",
        raised_by: dispute.raisedBy ?? "",
        related_id: dispute.relatedId ?? "",
        created_at: dispute.createdAt,
        resolved_at: dispute.resolvedAt ?? ""
      })),
      ...overview.riskFlags.map((flag) => ({
        record_type: "risk_flag",
        workspace_id: flag.workspaceId,
        title_or_type: flag.title,
        status_or_severity: flag.severity,
        detail_or_resolution: flag.detail,
        raised_by: "",
        related_id: flag.flagId,
        created_at: flag.createdAt,
        resolved_at: ""
      }))
    ];
    const csv = buildCsvDocument([...headers], rows);
    const fileDate = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tradehub-trust-safety-${fileDate}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
