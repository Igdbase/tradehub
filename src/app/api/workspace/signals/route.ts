import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  createWorkspaceSignal,
  listWorkspaceSignals,
  parseWorkspaceSignalRequest
} from "@/lib/workspace/dashboard-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const filters = parseWorkspaceSignalRequest(request);
    const response = await listWorkspaceSignals(actor, filters);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await createWorkspaceSignal(actor, payload);

    return apiJson(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
