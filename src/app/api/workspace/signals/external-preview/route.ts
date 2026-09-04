import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { getWorkspaceExternalSignalPreview } from "@/lib/signals/external-signal-ingestion-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);

    return apiJson(await getWorkspaceExternalSignalPreview(actor));
  } catch (error) {
    return apiError(error);
  }
}
