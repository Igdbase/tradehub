import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { saveWorkspaceOnboardingStep } from "@/lib/workspace/workspace-admin-repository";

export async function PATCH(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const body = await request.json();
    const response = await saveWorkspaceOnboardingStep({
      actor,
      step: typeof body === "object" && body !== null && "step" in body ? body.step : undefined,
      payload: typeof body === "object" && body !== null && "payload" in body ? body.payload : undefined
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
