import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getWorkspaceBillingOverview } from "@/lib/billing/billing-repository";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const response = await getWorkspaceBillingOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
