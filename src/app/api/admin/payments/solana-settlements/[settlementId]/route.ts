import { apiError, apiJson } from "@/lib/admin/admin-api";
import { updateSolanaSettlementStatus } from "@/lib/billing/billing-repository";
import {
  parseSettlementIdParam,
  parseSolanaSettlementPatchPayload
} from "@/lib/billing/billing-validation";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

type SolanaSettlementRouteContext = {
  params: {
    settlementId: string;
  };
};

export async function PATCH(request: Request, context: SolanaSettlementRouteContext) {
  try {
    const actor = await requireSuperAdmin(request);
    const safeSettlementId = parseSettlementIdParam(context.params.settlementId);
    const payload = parseSolanaSettlementPatchPayload(await request.json().catch(() => null));
    const response = await updateSolanaSettlementStatus(actor, safeSettlementId, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
