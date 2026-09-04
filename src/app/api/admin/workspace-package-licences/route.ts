import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { updateWorkspacePackageLicenceOps } from "@/lib/workspace/workspace-package-licence-ops";

export async function PATCH(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await updateWorkspacePackageLicenceOps({
      actor,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
