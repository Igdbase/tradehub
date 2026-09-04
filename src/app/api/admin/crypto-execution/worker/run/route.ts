import { apiError, apiJson } from "@/lib/admin/admin-api";
import { runCryptoExecutionWorker } from "@/lib/crypto-execution/crypto-execution-worker";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await runCryptoExecutionWorker(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
