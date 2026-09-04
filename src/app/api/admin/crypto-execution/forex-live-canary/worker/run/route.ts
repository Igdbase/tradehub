import { apiError, apiJson } from "@/lib/admin/admin-api";
import { runForexLiveCanaryWorker } from "@/lib/crypto-execution/forex-live-canary-execution";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await runForexLiveCanaryWorker(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
