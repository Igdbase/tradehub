import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { importStudentManualTradesFromCsv } from "@/lib/journal/manual-trades-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await importStudentManualTradesFromCsv(actor, payload?.csvText), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
