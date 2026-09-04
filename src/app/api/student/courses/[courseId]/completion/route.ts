import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCourseCompletionProof } from "@/lib/course-hub/course-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

type StudentCourseCompletionRouteContext = {
  params: {
    courseId: string;
  };
};

export async function GET(request: Request, context: StudentCourseCompletionRouteContext) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentCourseCompletionProof(actor, context.params.courseId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
