import { apiError, apiJson } from "@/lib/admin/admin-api";
import { cancelLiveProductionCanaryOrder } from "@/lib/crypto-execution/crypto-live-production";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await cancelLiveProductionCanaryOrder(actor, payload, params.attemptId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
