import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { createWorkspaceShellForApplication } from "@/lib/workspace/workspace-admin-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await createWorkspaceShellForApplication({
      actor,
      payload
    });

    return apiJson(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
