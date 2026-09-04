import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { cancelStudentForexAutoCopySubscription } from "@/lib/crypto-execution/forex-autocopy-subscription-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);

    await cancelStudentForexAutoCopySubscription(actor);

    return apiJson(await getStudentCryptoExecutionOverview(actor));
  } catch (error) {
    return apiError(error);
  }
}
