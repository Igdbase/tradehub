import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { buildAdminWorkspaceEnterpriseIntegrationOverview } from "@/lib/workspace/workspace-enterprise-integration-requests";
import { updateWorkspaceEnterpriseIntegrationOps } from "@/lib/workspace/workspace-enterprise-integration-ops";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);
    const result = await buildAdminWorkspaceEnterpriseIntegrationOverview();

    return apiJson({
      ok: true,
      source: "firestore",
      warnings: result.capped
        ? ["Enterprise integration request queue is bounded to the latest workspace/request window and uses masked refs only."]
        : [],
      overview: result.overview
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await updateWorkspaceEnterpriseIntegrationOps({
      actor,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
