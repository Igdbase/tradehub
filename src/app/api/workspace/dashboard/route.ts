import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { getWorkspaceDashboard } from "@/lib/workspace/dashboard-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const response = await getWorkspaceDashboard(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
