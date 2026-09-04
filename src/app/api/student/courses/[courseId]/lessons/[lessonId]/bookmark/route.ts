import { apiError, apiJson } from "@/lib/admin/admin-api";
import {
  deleteStudentLessonBookmark,
  saveStudentLessonBookmark
} from "@/lib/course-hub/course-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

type LessonBookmarkRouteContext = {
  params: {
    courseId: string;
    lessonId: string;
  };
};

export async function PUT(request: Request, context: LessonBookmarkRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const response = await saveStudentLessonBookmark({
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

export async function DELETE(request: Request, context: LessonBookmarkRouteContext) {
  try {
    const actor = await requireStudent(request);
    const response = await deleteStudentLessonBookmark({
      actor,
      courseId: context.params.courseId,
      lessonId: context.params.lessonId
    });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
