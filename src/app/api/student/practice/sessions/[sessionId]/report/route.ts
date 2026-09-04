import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentPracticeSessionReport } from "@/lib/practice/practice-repository";

type StudentPracticeSessionReportRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeSessionReportRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentPracticeSessionReport(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}
