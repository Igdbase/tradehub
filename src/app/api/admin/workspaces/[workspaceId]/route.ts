import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { patchWorkspaceShell } from "@/lib/workspace/workspace-admin-repository";

type WorkspaceRouteContext = {
  params: {
    workspaceId: string;
  };
};

export async function PATCH(request: Request, context: WorkspaceRouteContext) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await patchWorkspaceShell({
      actor,
      workspaceId: context.params.workspaceId,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
