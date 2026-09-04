import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  createStudentPracticeOrder,
  listStudentPracticeSessionOrders
} from "@/lib/practice/practice-repository";

type StudentPracticeSessionOrdersRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeSessionOrdersRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await listStudentPracticeSessionOrders(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: StudentPracticeSessionOrdersRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentPracticeOrder(actor, {
      ...(typeof payload === "object" && payload !== null && !Array.isArray(payload) ? payload : {}),
      sessionId: context.params.sessionId
    }), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
