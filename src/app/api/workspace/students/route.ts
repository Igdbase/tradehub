import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  listWorkspaceStudents,
  parseWorkspaceStudentRequest
} from "@/lib/workspace/dashboard-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const filters = parseWorkspaceStudentRequest(request);
    const response = await listWorkspaceStudents(actor, filters);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
