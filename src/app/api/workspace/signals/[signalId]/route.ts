import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { patchWorkspaceSignal } from "@/lib/workspace/dashboard-repository";

type SignalRouteContext = {
  params: {
    signalId: string;
  };
};

export async function PATCH(request: Request, context: SignalRouteContext) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await patchWorkspaceSignal({
      actor,
      signalId: context.params.signalId,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
