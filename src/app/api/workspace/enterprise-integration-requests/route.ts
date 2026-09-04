import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  createWorkspaceEnterpriseIntegrationRequest,
  listWorkspaceEnterpriseIntegrationRequests
} from "@/lib/workspace/workspace-enterprise-integration-requests";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const response = await listWorkspaceEnterpriseIntegrationRequests(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await createWorkspaceEnterpriseIntegrationRequest({
      actor,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
