import { apiError, apiJson } from "@/lib/admin/admin-api";
import { cancelForexDemoOrder } from "@/lib/crypto-execution/forex-demo-execution";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await cancelForexDemoOrder(actor, params.attemptId, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
