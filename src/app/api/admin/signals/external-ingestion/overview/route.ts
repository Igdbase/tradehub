import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { getAdminExternalSignalIngestionOverview } from "@/lib/signals/external-signal-ingestion-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const response = await getAdminExternalSignalIngestionOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
