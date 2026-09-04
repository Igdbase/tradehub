import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { saveStudentLessonProgress } from "@/lib/course-hub/course-repository";

type LessonProgressRouteContext = {
  params: {
    courseId: string;
    lessonId: string;
  };
};

export async function POST(request: Request, context: LessonProgressRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const response = await saveStudentLessonProgress({
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
