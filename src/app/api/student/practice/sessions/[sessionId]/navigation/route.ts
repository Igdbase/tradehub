import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { navigateStudentPracticeReplay } from "@/lib/practice/practice-repository";

type StudentPracticeNavigationRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeNavigationRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await navigateStudentPracticeReplay(actor, context.params.sessionId, payload));
  } catch (error) {
    return apiError(error);
  }
}
