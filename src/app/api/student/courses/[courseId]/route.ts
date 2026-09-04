import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCourse } from "@/lib/course-hub/course-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

type StudentCourseRouteContext = {
  params: {
    courseId: string;
  };
};

export async function GET(request: Request, context: StudentCourseRouteContext) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentCourse(actor, context.params.courseId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
