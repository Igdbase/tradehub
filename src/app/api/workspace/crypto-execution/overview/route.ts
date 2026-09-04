import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getWorkspaceCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const response = await getWorkspaceCryptoExecutionOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
