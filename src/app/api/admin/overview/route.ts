import { apiError, apiJson, getAdminRepositoryForRequest, sourceMetaForRepository } from "@/lib/admin/admin-api";

export async function GET(request: Request) {
  try {
    const { repository } = await getAdminRepositoryForRequest(request);
    const overview = await repository.getOverview();
    const meta = sourceMetaForRepository(repository, overview.warnings);

    return apiJson({
      ...meta,
      summary: overview.summary,
      workspacePackages: overview.workspacePackages,
      workspaceBranding: overview.workspaceBranding,
      workspaceEnterpriseDeployment: overview.workspaceEnterpriseDeployment,
      workspaceEnterpriseIntegrations: overview.workspaceEnterpriseIntegrations,
      paymentRails: overview.paymentRails,
      disputes: overview.disputes,
      riskFlags: overview.riskFlags,
      recentApplications: overview.recentApplications
    });
  } catch (error) {
    return apiError(error);
  }
}
