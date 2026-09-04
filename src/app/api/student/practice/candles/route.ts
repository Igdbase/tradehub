import { apiError, apiJson } from "@/lib/admin/admin-api";
import { fetchStudentHistoricalCandles } from "@/lib/practice/practice-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await fetchStudentHistoricalCandles(actor, payload));
  } catch (error) {
    return apiError(error);
  }
}
