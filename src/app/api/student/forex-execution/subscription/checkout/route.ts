import { apiError, apiJson } from "@/lib/admin/admin-api";
import { createStudentForexAutoCopyCheckout } from "@/lib/crypto-execution/forex-autocopy-subscription-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await createStudentForexAutoCopyCheckout(actor);

    return apiJson(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
