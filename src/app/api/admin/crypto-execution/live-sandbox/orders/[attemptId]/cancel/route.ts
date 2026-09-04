import { apiError, apiJson } from "@/lib/admin/admin-api";
import { cancelLiveSandboxOrder } from "@/lib/crypto-execution/crypto-live-sandbox";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json();
    const workspaceId = typeof payload?.workspaceId === "string" ? payload.workspaceId : "";
    const response = await cancelLiveSandboxOrder(actor, workspaceId, params.attemptId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
