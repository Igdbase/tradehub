import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { fetchStudentRevealedPracticeCandles } from "@/lib/practice/practice-repository";

type StudentPracticeSessionCandlesRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeSessionCandlesRouteContext) {
  try {
    const actor = await requireStudent(request);
    const index = new URL(request.url).searchParams.get("index") ?? undefined;

    return apiJson(await fetchStudentRevealedPracticeCandles(actor, context.params.sessionId, index));
  } catch (error) {
    return apiError(error);
  }
}
