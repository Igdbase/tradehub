import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { saveFirstCourseDraft } from "@/lib/workspace/workspace-admin-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await saveFirstCourseDraft({
      actor,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
