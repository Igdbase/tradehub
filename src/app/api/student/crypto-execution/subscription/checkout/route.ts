import { apiError, apiJson } from "@/lib/admin/admin-api";
import { createStudentCryptoAutoCopyCheckout } from "@/lib/crypto-execution/crypto-autocopy-subscription-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await createStudentCryptoAutoCopyCheckout(actor);

    return apiJson(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
