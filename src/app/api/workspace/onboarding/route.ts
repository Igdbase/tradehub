import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { getWorkspaceOnboarding } from "@/lib/workspace/workspace-admin-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const response = await getWorkspaceOnboarding(actor.workspaceId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
