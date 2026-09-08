import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { cancelStudentTradeCopierSubscription } from "@/lib/student-copier/student-copier-billing";
import { getStudentCopierOverview } from "@/lib/student-copier/student-copier-dto";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);

    await cancelStudentTradeCopierSubscription(actor);

    return apiJson(await getStudentCopierOverview(actor));
  } catch (error) {
    return apiError(error);
  }
}
