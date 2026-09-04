import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  createInfluencerCourse,
  listInfluencerCourses,
  parseCourseHubRequest
} from "@/lib/course-hub/course-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const filters = parseCourseHubRequest(request);
    const response = await listInfluencerCourses(actor, filters);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await createInfluencerCourse(actor, payload);

    return apiJson(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
