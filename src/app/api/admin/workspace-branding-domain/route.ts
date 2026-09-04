import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { updateWorkspaceBrandingDomainOps } from "@/lib/workspace/workspace-branding-domain-ops";

export async function PATCH(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await updateWorkspaceBrandingDomainOps({
      actor,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
