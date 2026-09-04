import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { partiallyCloseStudentPracticeOrder } from "@/lib/practice/practice-repository";

type StudentPracticeOrderPartialCloseRouteContext = {
  params: {
    sessionId: string;
    orderId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeOrderPartialCloseRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await partiallyCloseStudentPracticeOrder(actor, context.params.sessionId, context.params.orderId, payload));
  } catch (error) {
    return apiError(error);
  }
}
