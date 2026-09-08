import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";
import { processDueTelegramSignalRoutingOutbox } from "@/lib/signals/telegram-signal-bridge";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin(request);
    const payload = await request.json().catch(() => ({}));
    const limit = Number((payload as { limit?: unknown }).limit ?? 10);

    return apiJson(await processDueTelegramSignalRoutingOutbox(limit));
  } catch (error) {
    return apiError(error);
  }
}
