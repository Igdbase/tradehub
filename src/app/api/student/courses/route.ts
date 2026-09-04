import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  listStudentCourses,
  parseCourseHubRequest
} from "@/lib/course-hub/course-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const filters = parseCourseHubRequest(request);
    const response = await listStudentCourses(actor, filters);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
