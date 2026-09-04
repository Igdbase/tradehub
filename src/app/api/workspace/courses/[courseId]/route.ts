import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireInfluencer } from "@/lib/firebase/influencer-auth";
import {
  getInfluencerCourse,
  patchInfluencerCourse
} from "@/lib/course-hub/course-repository";

type CourseRouteContext = {
  params: {
    courseId: string;
  };
};

export async function GET(request: Request, context: CourseRouteContext) {
  try {
    const actor = await requireInfluencer(request);
    const response = await getInfluencerCourse(actor, context.params.courseId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: CourseRouteContext) {
  try {
    const actor = await requireInfluencer(request);
    const payload = await request.json();
    const response = await patchInfluencerCourse({
      actor,
      courseId: context.params.courseId,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
