import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { runTradeCopierPaystackCancellationRetryWorker } from "@/lib/student-copier/student-copier-billing";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json().catch(() => ({}));
    const response = await runTradeCopierPaystackCancellationRetryWorker(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
