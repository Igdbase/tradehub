import { apiError, apiJson, getAdminRepositoryForRequest, sourceMetaForRepository } from "@/lib/admin/admin-api";
import { parseApplicationFilters } from "@/lib/admin/admin-validation";

export async function GET(request: Request) {
  try {
    const { repository } = await getAdminRepositoryForRequest(request);
    const { searchParams } = new URL(request.url);
    const filters = parseApplicationFilters(searchParams);
    const result = await repository.listApplications(filters);
    const meta = sourceMetaForRepository(repository, result.warnings);

    return apiJson({
      ...meta,
      applications: result.applications,
      pageInfo: {
        limit: result.limit,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalLoaded: result.applications.length
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
