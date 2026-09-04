import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { getAdminMessagingOverview } from "@/lib/messaging/message-intent-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const response = await getAdminMessagingOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
