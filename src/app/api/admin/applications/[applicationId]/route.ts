import { apiError, apiJson, getAdminRepositoryForRequest, sourceMetaForRepository } from "@/lib/admin/admin-api";
import { validateApplicationPatchPayload } from "@/lib/admin/admin-validation";
import { AdminApiError } from "@/lib/firebase/admin-errors";

type ApplicationRouteContext = {
  params: {
    applicationId: string;
  };
};

export async function GET(request: Request, context: ApplicationRouteContext) {
  try {
    const { repository } = await getAdminRepositoryForRequest(request);
    const application = await repository.getApplication(context.params.applicationId);

    if (!application) {
      throw new AdminApiError(404, "application_not_found", "That application was not found.");
    }

    return apiJson({
      ...sourceMetaForRepository(repository),
      application
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: ApplicationRouteContext) {
  try {
    const { repository, actor } = await getAdminRepositoryForRequest(request);
    const current = await repository.getApplication(context.params.applicationId);

    if (!current) {
      throw new AdminApiError(404, "application_not_found", "That application was not found.");
    }

    const payload = await request.json();
    const patch = validateApplicationPatchPayload(payload, current);
    const result = await repository.updateApplication(context.params.applicationId, patch, actor);
    const meta = sourceMetaForRepository(repository, result.warnings);

    return apiJson({
      ...meta,
      application: result.application,
      auditEvent: result.auditEvent
    });
  } catch (error) {
    return apiError(error);
  }
}
