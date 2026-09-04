import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { manuallyCloseStudentPracticeOrder } from "@/lib/practice/practice-repository";

type StudentPracticeOrderCloseRouteContext = {
  params: {
    sessionId: string;
    orderId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeOrderCloseRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await manuallyCloseStudentPracticeOrder(actor, context.params.sessionId, context.params.orderId));
  } catch (error) {
    return apiError(error);
  }
}
