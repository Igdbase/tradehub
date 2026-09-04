import { apiError, apiJson } from "@/lib/admin/admin-api";
import { runForexPaperExecutionWorker } from "@/lib/crypto-execution/forex-paper-execution";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await runForexPaperExecutionWorker(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
