import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getAdminWorkspaceCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function GET(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const response = await getAdminWorkspaceCryptoExecutionOverview(actor, params.workspaceId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
