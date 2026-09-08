import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { promoteTelegramPreviewToWorkspaceSignal } from "@/lib/signals/telegram-signal-bridge";

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json().catch(() => ({}));
    const response = await promoteTelegramPreviewToWorkspaceSignal(actor, payload);

    return apiJson(response, { status: response.promoted ? 201 : 200 });
  } catch (error) {
    return apiError(error);
  }
}
