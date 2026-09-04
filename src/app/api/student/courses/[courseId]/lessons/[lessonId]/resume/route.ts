import { apiError, apiJson } from "@/lib/admin/admin-api";
import { saveStudentCourseResumePoint } from "@/lib/course-hub/course-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

type LessonResumeRouteContext = {
  params: {
    courseId: string;
    lessonId: string;
  };
};

export async function POST(request: Request, context: LessonResumeRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const response = await saveStudentCourseResumePoint({
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
