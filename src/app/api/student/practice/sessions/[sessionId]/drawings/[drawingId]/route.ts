import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  deleteStudentPracticeDrawing,
  updateStudentPracticeDrawing
} from "@/lib/practice/practice-repository";

type StudentPracticeDrawingRouteContext = {
  params: {
    sessionId: string;
    drawingId: string;
  };
};

export async function PATCH(request: Request, context: StudentPracticeDrawingRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeDrawing(
      actor,
      context.params.sessionId,
      context.params.drawingId,
      payload
    ));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: StudentPracticeDrawingRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await deleteStudentPracticeDrawing(
      actor,
      context.params.sessionId,
      context.params.drawingId
    ));
  } catch (error) {
    return apiError(error);
  }
}
