import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getAdminCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const response = await getAdminCryptoExecutionOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
