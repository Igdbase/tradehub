import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  getWorkspacePracticeInsights,
  parseWorkspacePracticeInsightsRequest
} from "@/lib/practice/practice-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const filters = parseWorkspacePracticeInsightsRequest(request);

    return apiJson(await getWorkspacePracticeInsights(actor, filters));
  } catch (error) {
    return apiError(error);
  }
}
