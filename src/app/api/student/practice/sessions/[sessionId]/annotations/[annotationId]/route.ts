import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  deleteStudentPracticeAnnotation,
  updateStudentPracticeAnnotation
} from "@/lib/practice/practice-repository";

type StudentPracticeAnnotationRouteContext = {
  params: {
    sessionId: string;
    annotationId: string;
  };
};

export async function PATCH(request: Request, context: StudentPracticeAnnotationRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeAnnotation(
      actor,
      context.params.sessionId,
      context.params.annotationId,
      payload
    ));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: StudentPracticeAnnotationRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await deleteStudentPracticeAnnotation(
      actor,
      context.params.sessionId,
      context.params.annotationId
    ));
  } catch (error) {
    return apiError(error);
  }
}
