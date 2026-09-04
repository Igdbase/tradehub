import { apiError, apiJson, getAdminRepositoryForRequest, sourceMetaForRepository } from "@/lib/admin/admin-api";
import { normalizeLimit } from "@/lib/admin/admin-validation";

export async function GET(request: Request) {
  try {
    const { repository } = await getAdminRepositoryForRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = normalizeLimit(searchParams.get("limit"));
    const cursor = searchParams.get("cursor") ?? undefined;
    const result = await repository.listAuditEvents(limit, cursor);
    const meta = sourceMetaForRepository(repository, result.warnings);

    return apiJson({
      ...meta,
      events: result.events,
      pageInfo: {
        limit: result.limit,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
