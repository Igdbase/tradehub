import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { upsertExternalSignalSourceAllowlistRecord } from "@/lib/signals/external-signal-ingestion-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperAdmin(request);
    const payload = await request.json().catch(() => ({}));
    const response = await upsertExternalSignalSourceAllowlistRecord(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
