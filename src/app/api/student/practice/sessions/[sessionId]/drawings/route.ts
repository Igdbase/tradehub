import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  createStudentPracticeDrawing,
  deleteAllStudentPracticeDrawings,
  getStudentPracticeSessionDetail
} from "@/lib/practice/practice-repository";

type StudentPracticeDrawingsRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeDrawingsRouteContext) {
  try {
    const actor = await requireStudent(request);
    const detail = await getStudentPracticeSessionDetail(actor, context.params.sessionId);

    return apiJson({
      ...detail,
      drawings: detail.annotations
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: StudentPracticeDrawingsRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentPracticeDrawing(actor, context.params.sessionId, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: StudentPracticeDrawingsRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await deleteAllStudentPracticeDrawings(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}
