import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { createStudentPracticeTimeframeSession } from "@/lib/practice/practice-repository";

type StudentPracticeTimeframeRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeTimeframeRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentPracticeTimeframeSession(actor, context.params.sessionId, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
