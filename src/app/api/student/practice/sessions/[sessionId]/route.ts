import { apiError, apiJson } from "@/lib/admin/admin-api";
import {
  deleteStudentPracticeSession,
  getStudentPracticeSessionDetail,
  updateStudentPracticeReplayIndex
} from "@/lib/practice/practice-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

type StudentPracticeSessionRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeSessionRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentPracticeSessionDetail(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: StudentPracticeSessionRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeReplayIndex(actor, context.params.sessionId, payload));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: StudentPracticeSessionRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await deleteStudentPracticeSession(actor, context.params.sessionId, payload));
  } catch (error) {
    return apiError(error);
  }
}
