import { apiError, apiJson } from "@/lib/admin/admin-api";
import { cancelLiveProductionOrder } from "@/lib/crypto-execution/crypto-live-production";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json().catch(() => ({})) as { workspaceId?: string };
    const response = await cancelLiveProductionOrder(actor, payload.workspaceId ?? "", params.attemptId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
