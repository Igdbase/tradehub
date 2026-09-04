import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import { updateWorkspaceStudentSupportState } from "@/lib/workspace/dashboard-repository";

export async function PATCH(
  request: Request,
  context: { params: { studentId: string } }
) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await updateWorkspaceStudentSupportState(actor, context.params.studentId, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
