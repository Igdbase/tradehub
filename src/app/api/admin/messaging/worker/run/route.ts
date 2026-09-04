import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { runMessagingDryRunDeliveryWorker } from "@/lib/messaging/messaging-delivery-worker";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json().catch(() => ({}));
    const response = await runMessagingDryRunDeliveryWorker(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
