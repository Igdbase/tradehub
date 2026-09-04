import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  createStudentPracticeAnnotation,
  getStudentPracticeSessionDetail
} from "@/lib/practice/practice-repository";

type StudentPracticeAnnotationsRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeAnnotationsRouteContext) {
  try {
    const actor = await requireStudent(request);
    const detail = await getStudentPracticeSessionDetail(actor, context.params.sessionId);

    return apiJson({
      ...detail,
      ok: true,
      annotations: detail.annotations
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: StudentPracticeAnnotationsRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentPracticeAnnotation(actor, context.params.sessionId, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
