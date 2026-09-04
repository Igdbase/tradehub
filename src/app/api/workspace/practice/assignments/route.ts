import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  createWorkspacePracticeAssignment,
  listWorkspacePracticeAssignments,
  updateWorkspacePracticeAssignment
} from "@/lib/practice/practice-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);

    return apiJson(await listWorkspacePracticeAssignments(actor));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();

    return apiJson(await createWorkspacePracticeAssignment(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();

    return apiJson(await updateWorkspacePracticeAssignment(actor, payload));
  } catch (error) {
    return apiError(error);
  }
}
