import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCourseLearningStateSummary } from "@/lib/course-hub/course-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentCourseLearningStateSummary(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
