import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getAdminPaymentsOverview } from "@/lib/billing/billing-repository";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const response = await getAdminPaymentsOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
