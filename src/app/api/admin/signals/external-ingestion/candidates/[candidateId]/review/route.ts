import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { reviewExternalSignalCandidate } from "@/lib/signals/external-signal-ingestion-repository";

export async function POST(
  request: Request,
  context: { params: { candidateId: string } }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json().catch(() => ({}));
    const response = await reviewExternalSignalCandidate(actor, context.params.candidateId, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
