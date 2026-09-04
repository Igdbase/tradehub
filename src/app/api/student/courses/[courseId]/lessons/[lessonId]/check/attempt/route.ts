import { apiError, apiJson } from "@/lib/admin/admin-api";
import { submitStudentLessonCheckAttempt } from "@/lib/course-hub/course-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

type LessonCheckAttemptRouteContext = {
  params: {
    courseId: string;
    lessonId: string;
  };
};

export async function POST(request: Request, context: LessonCheckAttemptRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const response = await submitStudentLessonCheckAttempt({
      actor,
      courseId: context.params.courseId,
      lessonId: context.params.lessonId,
      payload
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
