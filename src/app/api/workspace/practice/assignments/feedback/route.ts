import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  listWorkspacePracticeAssignmentFeedback,
  parseWorkspacePracticeReviewQueueRequest,
  upsertWorkspacePracticeAssignmentFeedback
} from "@/lib/practice/practice-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);

    return apiJson(await listWorkspacePracticeAssignmentFeedback(actor, parseWorkspacePracticeReviewQueueRequest(request.url)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();

    return apiJson(await upsertWorkspacePracticeAssignmentFeedback(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();

    return apiJson(await upsertWorkspacePracticeAssignmentFeedback(actor, payload));
  } catch (error) {
    return apiError(error);
  }
}
