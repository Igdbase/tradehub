import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentManualJournalAnalytics } from "@/lib/journal/manual-trades-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentManualJournalAnalytics(actor));
  } catch (error) {
    return apiError(error);
  }
}
