import { apiError, apiJson } from "@/lib/admin/admin-api";
import { runLiveSandboxReconciliation } from "@/lib/crypto-execution/crypto-live-sandbox";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const response = await runLiveSandboxReconciliation(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
