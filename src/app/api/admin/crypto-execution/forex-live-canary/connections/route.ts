import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getAdminWorkspaceCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { createOperatorForexLiveCanaryConnection } from "@/lib/crypto-execution/forex-connection-repository";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const target = await createOperatorForexLiveCanaryConnection(actor, payload);

    return apiJson(await getAdminWorkspaceCryptoExecutionOverview(actor, target.workspaceId), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
